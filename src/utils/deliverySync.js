import { ref as dbRef, get, update, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "./logger";
import { isAdminUser } from "./chatParserUtils";

/**
 * Checks if a UID is a temporary/proxy UID.
 * @param {string} uid
 * @returns {boolean}
 */
export function isProxyUid(uid) {
  return (
    !uid ||
    uid.startsWith("proxy-") ||
    uid.startsWith("admin-proxy-") ||
    uid.startsWith("multi-proxy-") ||
    uid.startsWith("manual-") ||
    uid.startsWith("name:")
  );
}

/**
 * Normalizes a customer name for reliable matching across sessions.
 * @param {string} name
 * @returns {string}
 */
export function normalizeCustomerName(name) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

// 🚀 In-Memory Cache for delivery_customers snapshot (TTL: 3 seconds)
let _deliveryCustomersCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 3000;

async function getCachedDeliveryCustomers() {
  const now = Date.now();
  if (_deliveryCustomersCache && now - _cacheTimestamp < CACHE_TTL) {
    return _deliveryCustomersCache;
  }
  const snapshot = await get(dbRef(db, "delivery_customers"));
  _deliveryCustomersCache = snapshot.val() || {};
  _cacheTimestamp = now;
  return _deliveryCustomersCache;
}

/**
 * Resolves or finds the canonical delivery_customers key for a customer.
 * Uses normalized name matching for active (non-done) customers.
 *
 * @param {string} uid - User ID or proxy UID
 * @param {string} name - Customer display name
 * @returns {Promise<string>} The delivery_customers document key
 */
export async function resolveDeliveryUid(uid, name) {
  const normName = normalizeCustomerName(name);

  try {
    const data = await getCachedDeliveryCustomers();

    // If valid non-proxy UID, check if direct active key exists first
    if (!isProxyUid(uid) && data[uid] && data[uid].status !== "done") {
      return uid;
    }

    // Find matching active (non-done) customer by normalized name
    const activeKey = Object.keys(data).find((key) => {
      const cust = data[key];
      return (
        cust &&
        cust.status !== "done" &&
        normalizeCustomerName(cust.name) === normName
      );
    });

    if (activeKey) return activeKey;
  } catch (e) {
    logger.warn("resolveDeliveryUid name search error:", e);
  }

  // If non-proxy UID, use UID as new key
  if (!isProxyUid(uid)) {
    return uid;
  }

  // Otherwise, create a clean unique key for proxy user
  return (
    "customer-" +
    Date.now() +
    "-" +
    Math.random().toString(36).substring(2, 5)
  );
}

/**
 * Recalculates total itemCount and totalPrice across all active (non-done) sessions.
 * @param {string} deliveryUid
 */
export async function recalcItemCount(deliveryUid) {
  if (!deliveryUid) return;
  try {
    const sessionsSnap = await get(
      dbRef(db, `delivery_customers/${deliveryUid}/sessions`),
    );
    const sessions = sessionsSnap.val() || {};

    const totalCount = Object.values(sessions)
      .filter((s) => s && s.status !== "done")
      .reduce((sum, s) => sum + (s.count || 0), 0);

    const totalPrice = Object.values(sessions)
      .filter((s) => s && s.status !== "done")
      .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

    await update(dbRef(db, `delivery_customers/${deliveryUid}`), {
      itemCount: totalCount,
      totalPrice: totalPrice,
      updatedAt: Date.now(),
    });
  } catch (e) {
    logger.error("recalcItemCount error:", e);
  }
}

/**
 * Automatically syncs stock items of a specific owner in a video session to delivery_customers.
 *
 * @param {string} ownerName - Display name of customer
 * @param {string|null} ownerUid - UID or proxy UID
 * @param {string} videoId - Current video session ID
 */
export async function syncDeliveryCustomerForOwner(
  ownerName,
  ownerUid = null,
  videoId = null,
) {
  if (!ownerName || !videoId || videoId === "demo") return;

  const normName = normalizeCustomerName(ownerName);
  if (!normName) return;

  try {
    // 1. Fetch current video stock
    const stockSnap = await get(dbRef(db, `stock/${videoId}`));
    const stockData = stockSnap.val() || {};

    // 2. Count items and calculate total price for this customer in this video
    let count = 0;
    let totalPrice = 0;

    Object.values(stockData).forEach((item) => {
      if (
        item &&
        item.owner &&
        normalizeCustomerName(item.owner) === normName
      ) {
        count += 1;
        const parsedPrice = parseInt(item.price, 10);
        totalPrice += isNaN(parsedPrice) ? 0 : parsedPrice;
      }
    });

    // 3. Resolve canonical deliveryUid
    const deliveryUid = await resolveDeliveryUid(ownerUid, ownerName);
    const customerRef = dbRef(db, `delivery_customers/${deliveryUid}`);
    const customerSnap = await get(customerRef);
    const existing = customerSnap.val();

    if (count > 0) {
      if (!existing) {
        // Create new delivery customer
        await update(customerRef, {
          name: ownerName.trim(),
          deliveryDate: null,
          note: "",
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        const updates = { name: ownerName.trim(), updatedAt: Date.now() };
        if (existing.status === "done") {
          updates.status = "pending";
          updates.deliveryDate = null; // ✅ Clear old delivery date so customer goes to "ฝากสินค้า" tab, not "แจ้งส่ง"
        }
        await update(customerRef, updates);
      }

      // Update session info
      await update(
        dbRef(db, `delivery_customers/${deliveryUid}/sessions/${videoId}`),
        {
          count,
          totalPrice,
          status: "pending",
        },
      );
    } else {
      // Count is 0 for this session: remove session entry if it exists
      await remove(
        dbRef(db, `delivery_customers/${deliveryUid}/sessions/${videoId}`),
      );
    }

    // 4. Recalculate overall totals across all active sessions
    await recalcItemCount(deliveryUid);
  } catch (e) {
    logger.error("syncDeliveryCustomerForOwner error:", e);
  }
}

// 🚀 Track last live finish announcement to prevent double announcements
let _lastAnnouncedVideoId = null;
let _lastAnnounceTimestamp = 0;

/**
 * Retrieves all customers who have requested delivery (active with deliveryDate or marked ready).
 * @param {string|null} videoId - Optional video ID to cross-check current live shipping
 * @returns {Promise<Array<{uid: string, name: string, itemCount: number, deliveryDate: string|null}>>}
 */
export async function getShippingRequestedCustomers(videoId = null) {
  try {
    const promises = [get(dbRef(db, "delivery_customers"))];
    if (videoId && videoId !== "demo") {
      promises.push(get(dbRef(db, `shipping/${videoId}`)));
    }

    const [delCustSnap, shippingSnap] = await Promise.all(promises);
    const delCustData = delCustSnap ? delCustSnap.val() || {} : {};
    const shippingData = shippingSnap ? shippingSnap.val() || {} : {};

    const requestedMap = new Map(); // normName -> customer object

    // 1. From delivery_customers: active (non-done) with deliveryDate set
    Object.entries(delCustData).forEach(([uid, cust]) => {
      if (
        cust &&
        cust.status !== "done" &&
        cust.deliveryDate &&
        cust.deliveryDate.trim() !== ""
      ) {
        const rawName = cust.name ? cust.name.trim() : "";
        // 🚨 Exclude Admin accounts (Admin is the seller/operator, not a customer)
        if (rawName && !isAdminUser(rawName)) {
          const normName = normalizeCustomerName(rawName);
          if (normName && !requestedMap.has(normName)) {
            requestedMap.set(normName, {
              uid,
              name: rawName,
              itemCount: cust.itemCount || 0,
              deliveryDate: cust.deliveryDate,
            });
          }
        }
      }
    });

    // 2. From shipping/${videoId}: marked ready in current video session
    if (shippingData) {
      Object.entries(shippingData).forEach(([uid, shipInfo]) => {
        if (shipInfo && shipInfo.ready) {
          const cust = delCustData[uid];
          const rawName = cust?.name || shipInfo.name;
          // 🚨 Exclude Admin accounts
          if (rawName && !isAdminUser(rawName)) {
            const normName = normalizeCustomerName(rawName);
            if (normName && !requestedMap.has(normName)) {
              requestedMap.set(normName, {
                uid,
                name: rawName.trim(),
                itemCount: cust?.itemCount || 0,
                deliveryDate: cust?.deliveryDate || null,
              });
            }
          }
        }
      });
    }

    return Array.from(requestedMap.values());
  } catch (err) {
    logger.error("getShippingRequestedCustomers error:", err);
    return [];
  }
}

/**
 * Announces the list of customers requesting delivery with clear pauses between names.
 * @param {string|null} videoId - Video ID of current stream
 * @param {Object} options - { force: boolean }
 */
export async function announceShippingCustomers(videoId = null, options = {}) {
  const { force = false } = options;
  const now = Date.now();

  const { useSystemStore } = await import("../stores/system");
  const systemStore = useSystemStore();

  const activeVid = videoId || systemStore.currentVideoId;

  // Deduplication guard: don't repeat within 15s for the same video unless force=true
  if (
    !force &&
    activeVid &&
    _lastAnnouncedVideoId === activeVid &&
    now - _lastAnnounceTimestamp < 15000
  ) {
    logger.tts("Skipping duplicate live finish shipping announcement for:", activeVid);
    return;
  }

  _lastAnnouncedVideoId = activeVid;
  _lastAnnounceTimestamp = now;

  if (!systemStore.isSoundOn) return;

  const { useAudio } = await import("../composables/useAudio");
  const { useNicknameStore } = await import("../stores/nickname");

  const { queueAudio } = useAudio();
  const nicknameStore = useNicknameStore();

  const customers = await getShippingRequestedCustomers(activeVid);

  if (!customers || customers.length === 0) {
    queueAudio(
      null,
      "",
      "ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งค่ะ ขอบคุณค่ะ",
      { delayAfter: 500 },
    );
    return;
  }

  // 1. Initial Opening Announcement
  queueAudio(
    "success",
    "",
    `ไลฟ์จบแล้วค่ะ ขอแจ้งรายชื่อลูกค้าที่ให้จัดส่ง มีทั้งหมด ${customers.length} ท่าน มีดังนี้ค่ะ`,
    { delayAfter: 800 },
  );

  // 2. Read each customer name with clear 800ms spacing
  customers.forEach((cust, index) => {
    const phoneticName = nicknameStore.getPhoneticName(cust.uid, cust.name);
    const msg = `คนที่ ${index + 1} ${phoneticName}`;
    queueAudio(null, "", msg, { delayAfter: 800 });
  });

  // 3. Closing remark
  queueAudio(
    null,
    "",
    `รวมทั้งหมด ${customers.length} ท่าน ขอบคุณลูกค้าทุกท่านค่ะ`,
    { delayAfter: 500 },
  );
}

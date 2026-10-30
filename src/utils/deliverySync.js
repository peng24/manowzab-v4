import { bookingItems, recalculateDelivery, syncDeliverySession } from "./deliveryState";
import { ref as dbRef, get, update, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "./logger";
import {
  isAdminUser,
  formatShippingCycleLabel,
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
} from "./chatParserUtils";
import { useSystemStore } from "../stores/system";
import { useAudio } from "../composables/useAudio";
import { useNicknameStore } from "../stores/nickname";

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

// 🚀 In-Memory Cache for delivery_customers & address_book snapshots
let _liveDeliveryCustomers = null;
let _liveAddressBook = null;
let _deliveryCustomersCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 3000;

export function setLiveDeliveryCustomersCache(data) {
  _liveDeliveryCustomers = data || null;
  if (data) {
    _deliveryCustomersCache = data;
    _cacheTimestamp = Date.now();
  }
}

export function setLiveAddressBookCache(data) {
  _liveAddressBook = data || null;
}

async function getCachedDeliveryCustomers() {
  if (_liveDeliveryCustomers) {
    return _liveDeliveryCustomers;
  }
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
    if (!isProxyUid(uid) && data[uid]) {
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
    const completedKey = Object.keys(data).find(key => data[key] && normalizeCustomerName(data[key].name) === normName);
    if (completedKey) return completedKey;
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
    await runTransaction(dbRef(db, `delivery_customers/${deliveryUid}`), (current) => {
      if (!current) return current;
      return { ...recalculateDelivery(current), updatedAt: Date.now() };
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
 * @param {Object|null} localStockData - Optional already-synced stockData from stockStore
 * @param {Object|null} localBookingItems - Optional owner items grouped from the same stock snapshot
 */
export async function syncDeliveryCustomerForOwner(
  ownerName,
  ownerUid = null,
  videoId = null,
  localStockData = null,
  localBookingItems = null,
) {
  if (!ownerName || !videoId || videoId === "demo") return;

  const normName = normalizeCustomerName(ownerName);
  if (!normName) return;

  try {
    // 1. Use in-memory stockData if provided (including {} when board is cleared), otherwise fetch from Firebase
    let stockData = localStockData;
    if (!stockData || typeof stockData !== "object") {
      const stockSnap = await get(dbRef(db, `stock/${videoId}`));
      stockData = stockSnap.val() || {};
    }

    const items = localBookingItems ?? bookingItems(stockData, ownerName);
    const deliveryUid = await resolveDeliveryUid(ownerUid, ownerName);
    let paymentType = "";
    const normKey = normName.replace(/[.#$[\]/]/g, "_");
    if (_liveAddressBook) {
      paymentType = _liveAddressBook[normKey]?.paymentType || "";
    } else if (Object.keys(items).length) {
      const snapshot = await get(dbRef(db, `address_book/${normKey}`));
      paymentType = snapshot.val()?.paymentType || "";
    }
    const now = Date.now();
    await runTransaction(dbRef(db, `delivery_customers/${deliveryUid}`), current => {
      const next = syncDeliverySession(current, { ownerName, videoId, items, paymentType, now: current?.updatedAt || now });
      if (current && JSON.stringify(next) === JSON.stringify(current)) return;
      if (next) next.updatedAt = now;
      return next;
    });
  } catch (e) {
    logger.error("syncDeliveryCustomerForOwner error:", e);
  }
}

// 🚀 Track last live finish announcement to prevent double announcements
let _lastAnnouncedVideoId = null;
let _lastAnnounceTimestamp = 0;

function getCountdownDays(deliveryDate) {
  if (!deliveryDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate);
  if (isNaN(target.getTime())) return Infinity;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/**
 * Retrieves all customers who have requested delivery for the specified shipping cycle (or active cycle).
 * @param {string|null} targetCycle - Specific cycle (e.g. 'พฤหัส', 'today', '2026-08-27') or 'all'
 * @returns {Promise<Array<{uid: string, name: string, itemCount: number, deliveryDate: string|null, days: number}>>}
 */
export async function getShippingRequestedCustomers(targetCycle = null) {
  try {
    const systemStore = useSystemStore();

    let targetDateStr = null;
    if (targetCycle && targetCycle !== "all") {
      const cycleDate = resolveShippingCycleDate(targetCycle);
      targetDateStr = formatDateToYYYYMMDD(cycleDate);
    } else if (targetCycle !== "all") {
      const cycleSetting = systemStore.shippingCycle || "today";
      const cycleDate = resolveShippingCycleDate(cycleSetting);
      targetDateStr = formatDateToYYYYMMDD(cycleDate);
    }

    const delCustSnap = await get(dbRef(db, "delivery_customers"));
    const delCustData = delCustSnap ? delCustSnap.val() || {} : {};

    const requestedList = [];

    // Strictly read from delivery_customers: active (non-done) with deliveryDate set
    // Filter strictly by targetDateStr for the current shipping cycle
    Object.entries(delCustData).forEach(([uid, cust]) => {
      if (
        cust &&
        cust.status !== "done" &&
        cust.deliveryDate &&
        typeof cust.deliveryDate === "string" &&
        cust.deliveryDate.trim() !== ""
      ) {
        if (targetDateStr && cust.deliveryDate.trim() !== targetDateStr) {
          return;
        }

        const rawName = cust.name ? cust.name.trim() : "";
        // 🚨 Exclude Admin accounts (Admin is the seller/operator, not a customer)
        if (rawName && !isAdminUser(rawName)) {
          requestedList.push({
            uid,
            name: rawName,
            itemCount: cust.itemCount || 0,
            deliveryDate: cust.deliveryDate,
            days: getCountdownDays(cust.deliveryDate),
          });
        }
      }
    });

    // Sort by countdown days ascending (identical to ShippingManager table order)
    requestedList.sort((a, b) => a.days - b.days);

    return requestedList;
  } catch (err) {
    logger.error("getShippingRequestedCustomers error:", err);
    return [];
  }
}

/**
 * Announces the list of customers requesting delivery for this shipping cycle with clear pauses between names.
 * @param {string|null} videoId - Video ID of current stream
 * @param {Object} options - { force: boolean, cycle: string|null }
 */
export async function announceShippingCustomers(videoId = null, options = {}) {
  const { force = false, cycle = null } = options;
  const now = Date.now();

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

  const { queueAudio } = useAudio();
  const nicknameStore = useNicknameStore();

  const cycleSetting = cycle || systemStore.shippingCycle || "today";
  const cycleLabel = formatShippingCycleLabel(cycleSetting);

  const customers = await getShippingRequestedCustomers(cycleSetting);

  if (!customers || customers.length === 0) {
    queueAudio(
      null,
      "",
      `ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งรอบ${cycleLabel}ค่ะ ขอบคุณค่ะ`,
      { delayAfter: 500 },
    );
    return;
  }

  // 1. Initial Opening Announcement
  queueAudio(
    "success",
    "",
    `ไลฟ์จบแล้วค่ะ ขอแจ้งรายชื่อลูกค้าที่ให้จัดส่งรอบ${cycleLabel} มีทั้งหมด ${customers.length} ท่าน มีดังนี้ค่ะ`,
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

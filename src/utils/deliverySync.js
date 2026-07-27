import { ref as dbRef, get, update, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "./logger";

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

    // If valid non-proxy UID, check if direct key exists first
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
        if (existing.status === "done") updates.status = "pending";
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

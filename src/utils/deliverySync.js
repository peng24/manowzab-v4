import { bookingItems, recalculateDelivery, syncDeliverySession } from "./deliveryState";
import { ref as dbRef, get, update, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "./logger";
import { sanitizeDbKey } from "./dbUtils";
import { getLocalDiffDays } from "./thaiDateUtils";
import {
  isAdminUser,
  formatShippingCycleLabel,
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
} from "./chatParserUtils";
import { useSystemStore } from "../stores/system";
import { useAudio } from "../composables/useAudio";
import { useNicknameStore } from "../stores/nickname";
import { numberToThaiWords } from "./thaiNumberWords";

/**
 * Checks if a UID is a temporary/proxy UID.
 * @param {string} uid
 * @returns {boolean}
 */
export function isProxyUid(uid) {
  if (!uid || typeof uid !== "string") return true;
  return (
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
  if (name === null || name === undefined) return "";
  return String(name).trim().toLowerCase().replace(/\s+/g, " ");
}

// 🚀 In-Memory Cache for delivery_customers & address_book snapshots
let _liveDeliveryCustomers = null;
let _liveAddressBook = null;
let _deliveryCustomersCache = null;
let _cacheTimestamp = 0;
const CACHE_TTL = 3000;
// 🛡️ Coalesce concurrent proxy UID creations for the same normalized name
const _pendingProxyUids = new Map();
const PENDING_PROXY_UID_TTL_MS = 15000;

export function setLiveDeliveryCustomersCache(data) {
  _liveDeliveryCustomers = data || null;
  if (data) {
    _deliveryCustomersCache = data;
    _cacheTimestamp = Date.now();
  } else {
    _pendingProxyUids.clear();
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

  const safeNonProxyUid = !isProxyUid(uid) ? sanitizeDbKey(uid) : null;

  try {
    const data = await getCachedDeliveryCustomers();

    // If valid non-proxy UID, check if direct active key exists first (sanitized for Firebase key safety)
    if (safeNonProxyUid && safeNonProxyUid !== "invalid_key") {
      if (data[safeNonProxyUid]) return safeNonProxyUid;
      if (!/[.#$[\]/]/.test(uid) && data[uid]) return uid;
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

    if (activeKey) {
      if (normName) _pendingProxyUids.delete(normName);
      return activeKey;
    }
    const completedKey = Object.keys(data).find(key => data[key] && normalizeCustomerName(data[key].name) === normName);
    if (completedKey) {
      if (normName) _pendingProxyUids.delete(normName);
      return completedKey;
    }
  } catch (e) {
    logger.warn("resolveDeliveryUid name search error:", e);
  }

  // If non-proxy UID, use sanitized UID as new key
  if (safeNonProxyUid && safeNonProxyUid !== "invalid_key") {
    return safeNonProxyUid;
  }

  // Coalesce concurrent bookings/shipping commands for the same new proxy customer
  const now = Date.now();
  if (normName) {
    const existingPending = _pendingProxyUids.get(normName);
    if (existingPending && now - existingPending.ts < PENDING_PROXY_UID_TTL_MS) {
      return existingPending.key;
    }
  }

  // Prune expired pending entries to prevent unbounded Map growth
  if (_pendingProxyUids.size > 50) {
    for (const [k, entry] of _pendingProxyUids.entries()) {
      if (now - entry.ts >= PENDING_PROXY_UID_TTL_MS) {
        _pendingProxyUids.delete(k);
      }
    }
  }

  // Otherwise, create a clean unique key for proxy user
  const newKey =
    "customer-" +
    now +
    "-" +
    Math.random().toString(36).substring(2, 5);
  if (normName) {
    _pendingProxyUids.set(normName, { key: newKey, ts: now });
  }
  return newKey;
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
  const diff = getLocalDiffDays(deliveryDate);
  return diff === null ? Infinity : diff;
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
 * Calculates total sales revenue (฿) and sold item count for a specific live video session.
 * Reads directly from Firebase `stock/{videoId}` (freshest state including AI-synced prices),
 * with fallback to `history/{videoId}` when the stock node is empty.
 * Counts only claimed items (`item.owner` non-empty) and positive numeric prices (`item.price > 0`).
 *
 * @param {string|null} videoId
 * @returns {Promise<{ totalSales: number, soldCount: number, pricedSoldCount: number }>}
 */
export async function getLiveSalesSummary(videoId = null) {
  const empty = { totalSales: 0, soldCount: 0, pricedSoldCount: 0 };
  if (!videoId || typeof videoId !== "string") return empty;
  const cleanVid = videoId.trim();
  if (!cleanVid || /[.#$[\]/]/.test(cleanVid)) return empty;

  try {
    const stockSnap = await get(dbRef(db, `stock/${cleanVid}`));
    const stockVal = stockSnap ? stockSnap.val() : null;

    if (stockVal && typeof stockVal === "object") {
      let totalSales = 0;
      let soldCount = 0;
      let pricedSoldCount = 0;

      Object.values(stockVal).forEach((item) => {
        if (!item || typeof item !== "object") return;
        const owner = typeof item.owner === "string" ? item.owner.trim() : "";
        if (!owner) return;
        soldCount++;
        const price = parseInt(item.price, 10);
        if (!isNaN(price) && price > 0) {
          totalSales += price;
          pricedSoldCount++;
        }
      });

      if (soldCount > 0 || totalSales > 0) {
        return { totalSales, soldCount, pricedSoldCount };
      }
    }

    if (cleanVid !== "demo") {
      const historySnap = await get(dbRef(db, `history/${cleanVid}`));
      const historyVal = historySnap ? historySnap.val() : null;
      if (historyVal && typeof historyVal === "object") {
        const histSales = parseInt(historyVal.totalSales, 10);
        const histItems = parseInt(historyVal.totalItems, 10);
        const safeSales = !isNaN(histSales) && histSales > 0 ? histSales : 0;
        const safeItems = !isNaN(histItems) && histItems > 0 ? histItems : 0;
        return {
          totalSales: safeSales,
          soldCount: safeItems,
          pricedSoldCount: safeSales > 0 ? safeItems : 0,
        };
      }
    }

    return empty;
  } catch (err) {
    logger.error("getLiveSalesSummary error:", err);
    return empty;
  }
}

/**
 * Formats the post-live sales revenue summary phrase in natural Thai spoken words
 * (using Thai cardinal words without Western commas for clean Chirp 3: HD / Native TTS).
 *
 * @param {{ totalSales?: number, soldCount?: number, pricedSoldCount?: number }|null} summary
 * @returns {string}
 */
export function formatLiveSalesSummarySpeech(summary) {
  if (!summary || typeof summary !== "object") return "";
  const totalSales = Math.max(0, parseInt(summary.totalSales, 10) || 0);
  const soldCount = Math.max(0, parseInt(summary.soldCount, 10) || 0);

  if (totalSales > 0 && soldCount > 0) {
    return `สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด ${numberToThaiWords(soldCount)} ชิ้น รวมเป็นเงิน ${numberToThaiWords(totalSales)} บาทค่ะ`;
  }
  if (totalSales > 0) {
    return `สรุปยอดขายไลฟ์นี้ รวมเป็นเงินทั้งหมด ${numberToThaiWords(totalSales)} บาทค่ะ`;
  }
  if (soldCount > 0) {
    return `สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด ${numberToThaiWords(soldCount)} ชิ้น ยังไม่มีข้อมูลราคาที่บันทึกไว้ค่ะ`;
  }
  return "";
}

/**
 * Announces the list of customers requesting delivery for this shipping cycle with clear pauses between names,
 * followed by the post-live total sales revenue summary (in Baht).
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

  const [customers, salesSummary] = await Promise.all([
    getShippingRequestedCustomers(cycleSetting),
    getLiveSalesSummary(activeVid),
  ]);
  const salesSummarySpeech = formatLiveSalesSummarySpeech(salesSummary);

  if (!customers || customers.length === 0) {
    if (salesSummarySpeech) {
      queueAudio(
        null,
        "",
        `ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งรอบ${cycleLabel}ค่ะ`,
        { delayAfter: 800 },
      );
      queueAudio(
        null,
        "",
        `${salesSummarySpeech} ขอบคุณลูกค้าทุกท่านค่ะ`,
        { delayAfter: 500 },
      );
      return;
    }

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

  // 3. Closing shipping count + post-live sales revenue summary
  if (salesSummarySpeech) {
    queueAudio(
      null,
      "",
      `รวมทั้งหมด ${customers.length} ท่านค่ะ`,
      { delayAfter: 800 },
    );
    queueAudio(
      null,
      "",
      `${salesSummarySpeech} ขอบคุณลูกค้าทุกท่านค่ะ`,
      { delayAfter: 500 },
    );
  } else {
    queueAudio(
      null,
      "",
      `รวมทั้งหมด ${customers.length} ท่าน ขอบคุณลูกค้าทุกท่านค่ะ`,
      { delayAfter: 500 },
    );
  }
}

let _restoreInFlight = null;

/**
 * Self-heals customer records in delivery_customers that were accidentally deleted
 * by the legacy trash button while their profile still exists in address_book.
 */
export async function restoreDeletedAddressBookCustomers() {
  if (_restoreInFlight) return _restoreInFlight;
  _restoreInFlight = (async () => {
    try {
      const [delSnap, bookSnap] = await Promise.all([
        get(dbRef(db, "delivery_customers")),
        get(dbRef(db, "address_book")),
      ]);
      const delData = delSnap?.val() || {};
      const bookData = bookSnap?.val() || {};

      const existingNormNames = new Set();
      Object.values(delData).forEach((cust) => {
        if (cust && cust.name) {
          const n = normalizeCustomerName(cust.name);
          if (n) existingNormNames.add(n);
        }
      });

      const now = Date.now();
      let restoredCount = 0;

      for (const [normKey, bookEntry] of Object.entries(bookData)) {
        if (!bookEntry || typeof bookEntry !== "object" || !bookEntry.name) continue;
        const cleanName = String(bookEntry.name).trim();
        if (!cleanName || isAdminUser(cleanName)) continue;

        const normName = normalizeCustomerName(cleanName);
        if (!normName || existingNormNames.has(normName)) continue;

        const safeKey = `cust_${normKey.replace(/[.#$[\]/\s]+/g, "_")}`;
        if (delData[safeKey]) continue;

        existingNormNames.add(normName);
        const txResult = await runTransaction(dbRef(db, `delivery_customers/${safeKey}`), (current) => {
          if (current !== null && current !== undefined) return;
          return {
            name: cleanName,
            status: "pending",
            deliveryDate: null,
            itemCount: 0,
            totalPrice: 0,
            note: "",
            paymentType: bookEntry.paymentType || "",
            contactChannel: bookEntry.contactChannel || "",
            recipientName: bookEntry.recipientName || "",
            phone: bookEntry.phone || "",
            address: bookEntry.address || "",
            postalCode: bookEntry.postalCode || "",
            addresses: bookEntry.addresses || null,
            selectedAddressId: bookEntry.selectedAddressId || null,
            labelPrinted: false,
            labelPrintedAt: null,
            createdAt: bookEntry.updatedAt || now,
            updatedAt: now,
          };
        });
        if (txResult?.committed) {
          restoredCount++;
        }
      }

      return restoredCount;
    } catch (e) {
      logger.warn("restoreDeletedAddressBookCustomers error:", e);
      return 0;
    } finally {
      _restoreInFlight = null;
    }
  })();
  return _restoreInFlight;
}

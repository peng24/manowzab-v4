import { isProxyUid, normalizeCustomerName } from "./deliverySync";
import { sanitizeDbKey } from "./dbUtils";

const YOUTUBE_CHANNEL_ID_REGEX = /^UC[\w-]{6,}$/i;

/**
 * Checks whether a name is a unique YouTube @handle.
 * @param {string} name
 * @returns {boolean}
 */
export function isYouTubeHandle(name) {
  return typeof name === "string" && name.trim().startsWith("@") && name.trim().length >= 2;
}

/**
 * Checks whether a UID is a real YouTube Channel ID (e.g. UCbD8q2Z...).
 * @param {string} uid
 * @returns {boolean}
 */
export function isYouTubeChannelId(uid) {
  if (!uid || typeof uid !== "string") return false;
  return YOUTUBE_CHANNEL_ID_REGEX.test(uid.trim());
}

/**
 * Checks whether a UID represents a temporary proxy, manual, or synthetic group key
 * rather than a permanent account identifier.
 * @param {string|null|undefined} uid
 * @returns {boolean}
 */
export function isTemporaryOrSyntheticUid(uid) {
  if (!uid || typeof uid !== "string") return true;
  const trimmed = uid.trim();
  if (!trimmed || trimmed === "manual" || trimmed === "unknown") return true;
  if (trimmed.startsWith("customer-") || trimmed.startsWith("cust_")) return true;
  return isProxyUid(trimmed);
}

/**
 * Checks whether a key is safe to store a global rename mapping under `nicknames/{key}`.
 * Only globally unique YouTube Channel IDs (`UC...`) or YouTube `@handle`s are safe;
 * plain Thai/display names (e.g. "กุ้ง") must NEVER be mapped to another person's name.
 * @param {string} key
 * @returns {boolean}
 */
export function isSafeGlobalNicknameKey(key) {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (!trimmed || isTemporaryOrSyntheticUid(trimmed)) return false;
  return isYouTubeChannelId(trimmed) || isYouTubeHandle(trimmed);
}

/**
 * Detects whether renaming a customer from `originalName` to `newName` collides with
 * an already-existing different customer in `address_book` or `delivery_customers`.
 * Prevents accidentally overwriting Customer B's shipping address with Customer A's form data.
 *
 * @param {Object} params
 * @param {string} params.originalName
 * @param {string} params.newName
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryByNormKey]
 * @param {string|null} [params.matchedCustId]
 * @returns {{
 *   isNameChanged: boolean,
 *   hasCollision: boolean,
 *   hasExistingAddress: boolean,
 *   existingAddress: string,
 *   existingRecipient: string,
 *   existingPhone: string,
 *   existingDeliveryId: string|null,
 *   existingDeliveryName: string
 * }}
 */
export function detectCrossCustomerCollision({
  originalName = "",
  newName = "",
  addressBook = {},
  deliveryByNormKey = {},
  matchedCustId = null,
}) {
  const normOrig = normalizeCustomerName(originalName);
  const normNew = normalizeCustomerName(newName);
  const isNameChanged = Boolean(normOrig && normNew && normOrig !== normNew);

  if (!isNameChanged) {
    return {
      isNameChanged: false,
      hasCollision: false,
      hasExistingAddress: false,
      existingAddress: "",
      existingRecipient: "",
      existingPhone: "",
      existingDeliveryId: null,
      existingDeliveryName: "",
    };
  }

  const newKey = normNew.replace(/[.#$[\]/]/g, "_");
  const bookEntry = addressBook?.[newKey] || null;
  const delivEntry = deliveryByNormKey?.[newKey] || null;

  const isDifferentDeliveryRecord = Boolean(
    delivEntry && (!matchedCustId || (delivEntry.uid || delivEntry.id) !== matchedCustId)
  );

  const bookAddrs = Array.isArray(bookEntry?.addresses)
    ? bookEntry.addresses
    : bookEntry?.addresses && typeof bookEntry.addresses === "object"
      ? Object.values(bookEntry.addresses)
      : [];

  const existingAddress = String(
    bookEntry?.address ||
      bookAddrs.find((a) => a?.address)?.address ||
      (isDifferentDeliveryRecord ? delivEntry?.address : "") ||
      ""
  ).trim();
  const existingRecipient = String(
    bookEntry?.recipientName || (isDifferentDeliveryRecord ? delivEntry?.recipientName : "") || ""
  ).trim();
  const existingPhone = String(
    bookEntry?.phone || (isDifferentDeliveryRecord ? delivEntry?.phone : "") || ""
  ).trim();
  const existingDeliveryId = isDifferentDeliveryRecord
    ? delivEntry.uid || delivEntry.id || null
    : null;
  const existingDeliveryName = String(
    bookEntry?.name || (isDifferentDeliveryRecord ? delivEntry?.name : "") || ""
  ).trim();

  const hasExistingAddress = Boolean(existingAddress);
  const hasCollision = Boolean(bookEntry || isDifferentDeliveryRecord);

  return {
    isNameChanged: true,
    hasCollision,
    hasExistingAddress,
    existingAddress,
    existingRecipient,
    existingPhone,
    existingDeliveryId,
    existingDeliveryName,
  };
}

/**
 * Checks if a candidate nickname is already owned by a DIFFERENT customer
 * across `nicknames` (real YouTube accounts), `address_book`, or `delivery_customers`.
 *
 * @param {Object} params
 * @param {string} params.candidateName
 * @param {string|null} [params.currentUid]
 * @param {string|null} [params.currentRealName]
 * @param {string|null} [params.currentDisplayName]
 * @param {string|null} [params.matchedCustId]
 * @param {Object} [params.nicknames]
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryByNormKey]
 * @returns {{
 *   isDuplicate: boolean,
 *   source: 'nicknames'|'customer_record'|null,
 *   conflictKey: string|null,
 *   conflictName: string,
 *   conflictRealName: string,
 *   conflictRecipient: string,
 *   conflictPhone: string
 * }}
 */
export function findDuplicateNicknameOwner({
  candidateName = "",
  currentUid = null,
  currentRealName = "",
  currentDisplayName = "",
  matchedCustId = null,
  nicknames = {},
  addressBook = {},
  deliveryByNormKey = {},
} = {}) {
  const normCandidate = normalizeCustomerName(candidateName);
  if (!normCandidate) {
    return {
      isDuplicate: false,
      source: null,
      conflictKey: null,
      conflictName: "",
      conflictRealName: "",
      conflictRecipient: "",
      conflictPhone: "",
    };
  }

  const safeCurrentUid = currentUid ? sanitizeDbKey(currentUid) : null;
  const safeCurrentReal = currentRealName ? sanitizeDbKey(currentRealName) : null;
  const normCurrentReal = normalizeCustomerName(currentRealName);
  const normCurrentDisplay = normalizeCustomerName(currentDisplayName);

  // Build lookup helper for recipient/phone context
  const candidateDbKey = normCandidate.replace(/[.#$[\]/]/g, "_");
  const bookEntry = addressBook?.[candidateDbKey] || null;
  const delivEntry = deliveryByNormKey?.[candidateDbKey] || null;

  // 1. Check `nicknames` for another real account using the exact same normalized nickname
  if (nicknames && typeof nicknames === "object") {
    for (const [key, entry] of Object.entries(nicknames)) {
      if (!entry) continue;
      // Ignore temporary/proxy/sim keys so legacy proxy entries never block real customers
      if (isTemporaryOrSyntheticUid(key) || key.startsWith("sim-")) continue;

      const entryNick = typeof entry === "object" ? entry.nick : entry;
      if (!entryNick || normalizeCustomerName(entryNick) !== normCandidate) continue;

      const entryReal = typeof entry === "object" ? String(entry.realName || "").trim() : "";
      const normEntryReal = normalizeCustomerName(entryReal);

      // Same customer account? Allow keeping/updating own nickname
      const isSameAccount =
        (currentUid && (key === currentUid || key === safeCurrentUid)) ||
        (currentRealName && (key === currentRealName || key === safeCurrentReal)) ||
        (normCurrentReal && normEntryReal && normEntryReal === normCurrentReal) ||
        (currentUid && entryReal && entryReal === currentUid);

      if (isSameAccount) continue;

      return {
        isDuplicate: true,
        source: "nicknames",
        conflictKey: key,
        conflictName: String(entryNick).trim(),
        conflictRealName: entryReal || key,
        conflictRecipient: String(bookEntry?.recipientName || delivEntry?.recipientName || "").trim(),
        conflictPhone: String(bookEntry?.phone || delivEntry?.phone || "").trim(),
      };
    }
  }

  // 2. Check existing `address_book` / `delivery_customers` when assigning a different name to this account
  const isDifferentFromOwnNames =
    normCandidate !== normCurrentDisplay && normCandidate !== normCurrentReal;

  if (isDifferentFromOwnNames) {
    const isDifferentDeliv = Boolean(
      delivEntry &&
        (!currentUid || (delivEntry.uid !== currentUid && delivEntry.id !== currentUid)) &&
        (!matchedCustId || (delivEntry.uid || delivEntry.id) !== matchedCustId)
    );

    if (bookEntry || isDifferentDeliv) {
      return {
        isDuplicate: true,
        source: "customer_record",
        conflictKey: isDifferentDeliv ? delivEntry.uid || delivEntry.id || candidateDbKey : candidateDbKey,
        conflictName: String(bookEntry?.name || delivEntry?.name || candidateName).trim(),
        conflictRealName: String(bookEntry?.recipientName || delivEntry?.recipientName || "").trim(),
        conflictRecipient: String(bookEntry?.recipientName || delivEntry?.recipientName || "").trim(),
        conflictPhone: String(bookEntry?.phone || delivEntry?.phone || "").trim(),
      };
    }
  }

  return {
    isDuplicate: false,
    source: null,
    conflictKey: null,
    conflictName: "",
    conflictRealName: "",
    conflictRecipient: "",
    conflictPhone: "",
  };
}

/**
 * Generates the next available unique nickname (e.g. "พี่นก" -> "พี่นก 2", "พี่นก 3").
 * @param {string} baseName
 * @param {Object} [stores]
 * @param {Object} [stores.nicknames]
 * @param {Object} [stores.addressBook]
 * @param {Object} [stores.deliveryByNormKey]
 * @returns {string}
 */
export function suggestUniqueNickname(
  baseName = "",
  { nicknames = {}, addressBook = {}, deliveryByNormKey = {} } = {}
) {
  const cleanBase = String(baseName || "").trim().replace(/\s+\d+$/, "").trim();
  if (!cleanBase) return "";

  const taken = new Set();
  if (nicknames && typeof nicknames === "object") {
    for (const [key, entry] of Object.entries(nicknames)) {
      if (!entry || isTemporaryOrSyntheticUid(key) || key.startsWith("sim-")) continue;
      const nick = typeof entry === "object" ? entry.nick : entry;
      const n = normalizeCustomerName(nick);
      if (n) taken.add(n);
    }
  }
  if (addressBook && typeof addressBook === "object") {
    for (const [k, v] of Object.entries(addressBook)) {
      const n = normalizeCustomerName(v?.name || k);
      if (n) taken.add(n);
    }
  }
  if (deliveryByNormKey && typeof deliveryByNormKey === "object") {
    for (const entry of Object.values(deliveryByNormKey)) {
      const n = normalizeCustomerName(entry?.name || "");
      if (n) taken.add(n);
    }
  }

  for (let suffix = 2; suffix <= 99; suffix++) {
    const candidate = `${cleanBase} ${suffix}`;
    if (!taken.has(normalizeCustomerName(candidate))) {
      return candidate;
    }
  }
  return `${cleanBase} ${Date.now().toString().slice(-3)}`;
}


import {
  extractPhone,
  extractPostalCode,
  formatPhoneNumber,
  normalizeName,
} from "./addressParser";
import { sanitizeDbKey } from "./dbUtils";
import { recalculateDelivery } from "./deliveryState";
import { normalizeCustomerName } from "./deliverySync";
import {
  isSafeGlobalNicknameKey,
  isTemporaryOrSyntheticUid,
  isYouTubeChannelId,
  isYouTubeHandle,
} from "./customerIdentityGuard";

const NON_DIGIT_REGEX = /\D/g;
const HONORIFIC_PREFIX_REGEX =
  /^(?:คุณ|พี่|น้อง|ป้า|น้า|อา|ลุง|แม่|พ่อ|เจ๊|เฮีย|ซ้อ|เสี่ย|ครู|หมอ|นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|ms\.?|khun|p['.]|k\.)\s*/i;
const HOUSE_NO_REGEX = /\b(\d+(?:\/\d+)?)\b/;
const INVALID_FIREBASE_KEY_REGEX = /[\x00-\x1F\x7F.#$[\]/]/;

function isValidFirebaseKey(key) {
  return (
    typeof key === "string" &&
    key.trim().length > 0 &&
    !INVALID_FIREBASE_KEY_REGEX.test(key)
  );
}

function toSafeDbKey(raw) {
  const norm = normalizeCustomerName(raw);
  if (!norm) return "";
  const safe = sanitizeDbKey(norm);
  return safe && safe !== "invalid_key" ? safe : "";
}

function normalizeRecordList(raw) {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object");
  if (raw && typeof raw === "object") {
    return Object.values(raw).filter((x) => x && typeof x === "object");
  }
  return [];
}

function normalizeItemsMap(items) {
  if (!items || typeof items !== "object") return {};
  return Object.fromEntries(
    Object.entries(items).filter(([, item]) => item && typeof item === "object")
  );
}

/**
 * Normalizes a Thai phone number to 9-10 digits starting with 0.
 * Returns "" if invalid or placeholder (e.g. "0000000000").
 * @param {string} rawPhone
 * @returns {string}
 */
export function normalizePhoneDigits(rawPhone) {
  if (!rawPhone) return "";
  let digits = String(rawPhone).replace(NON_DIGIT_REGEX, "");
  if (digits.startsWith("66") && digits.length >= 11) {
    digits = "0" + digits.slice(2);
  }
  if (digits.length < 9 || digits.length > 10 || !digits.startsWith("0")) {
    return "";
  }
  // Reject trivial placeholder numbers like 0000000000 or 0111111111
  if (/^0(\d)\1{7,8}$/.test(digits)) return "";
  return digits;
}

/**
 * Strips leading Thai/English honorifics to get the core comparison name.
 * @param {string} name
 * @returns {string}
 */
export function stripHonorificPrefix(name) {
  let cleaned = normalizeName(name);
  if (!cleaned) return "";
  // Strip up to 2 stacked honorifics (e.g. "คุณ พี่กุ้ง")
  for (let i = 0; i < 2; i++) {
    const next = cleaned.replace(HONORIFIC_PREFIX_REGEX, "").trim();
    if (!next || next === cleaned) break;
    // Only accept stripped version if at least 2 meaningful chars remain
    if (next.replace(/\s+/g, "").length >= 2) {
      cleaned = next;
    } else {
      break;
    }
  }
  return cleaned;
}

/**
 * Normalizes recipient name for identity comparison.
 * @param {string} recipientName
 * @returns {string}
 */
export function normalizeRecipientForMatch(recipientName) {
  const core = stripHonorificPrefix(recipientName);
  return core.replace(/[^\w\u0E00-\u0E7F\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normalizes an address string for duplicate comparison (strips phone, zip, punctuation, standardizes Thai admin abbreviations).
 * @param {string} rawAddress
 * @returns {string}
 */
export function normalizeAddressForMatch(rawAddress) {
  if (!rawAddress) return "";
  let text = String(rawAddress).toLowerCase().trim();
  if (!text) return "";

  // Remove labels & embedded phone numbers
  const phoneRes = extractPhone(text);
  if (phoneRes.phone) {
    text = phoneRes.cleanedText;
  }
  // Remove 5-digit postal code (compared separately)
  text = text.replace(/(?<![/\d])[1-9]\d{4}\b(?!\/|\d)/g, " ");

  // Standardize common Thai address prefixes
  text = text
    .replace(/บ้านเลขที่/g, " ")
    .replace(/หมู่ที่|หมู่\s*|ม\./g, "ม")
    .replace(/ตำบล|แขวง|ต\./g, "ต")
    .replace(/อำเภอ|เขต|อ\./g, "อ")
    .replace(/จังหวัด|จ\./g, "จ")
    .replace(/ถนน|ถ\./g, "ถ")
    .replace(/ซอย|ซ\./g, "ซ")
    .replace(/กรุงเทพมหานคร|กรุงเทพฯ|กทม\.?/g, "กรุงเทพ")
    .replace(/[^\w\u0E00-\u0E7F/]/g, "");

  return text;
}

/**
 * Computes Sørensen–Dice character bigram similarity in [0, 1].
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function diceSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.slice(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }

  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.slice(i, i + 2);
    const count = bigrams.get(bg) || 0;
    if (count > 0) {
      bigrams.set(bg, count - 1);
      matches++;
    }
  }

  return (2 * matches) / (a.length - 1 + (b.length - 1));
}

function extractAddressSignature(addressStr, explicitPostal = "") {
  const raw = String(addressStr || "").trim();
  const norm = normalizeAddressForMatch(raw);
  const postal =
    String(explicitPostal || "").replace(NON_DIGIT_REGEX, "").slice(0, 5) ||
    extractPostalCode(raw).postalCode ||
    "";
  const houseMatch = raw.match(HOUSE_NO_REGEX);
  const houseNo = houseMatch ? houseMatch[1] : "";
  return { raw, norm, postal, houseNo };
}

function collectAllAddressesFromEntry(entry, fallbackName = "") {
  if (!entry || typeof entry !== "object") return [];
  const results = [];
  const rawList = normalizeRecordList(entry.addresses);

  for (const item of rawList) {
    const addr = String(item.address || "").trim();
    const phone = String(item.phone || "").trim();
    const recipientName = String(item.recipientName || "").trim();
    const postalCode =
      String(item.postalCode || "").trim() || extractPostalCode(addr).postalCode;
    if (!addr && !phone) continue;
    results.push({
      id: item.id || null,
      label: item.label || "",
      recipientName: recipientName || String(entry.recipientName || fallbackName || "").trim(),
      phone: phone || String(entry.phone || "").trim(),
      address: addr,
      postalCode,
      contactChannel: item.contactChannel || entry.contactChannel || "",
      paymentType: item.paymentType || entry.paymentType || "",
    });
  }

  const topAddr = String(entry.address || "").trim();
  const topPhone = String(entry.phone || "").trim();
  if (topAddr || topPhone) {
    const topNorm = normalizeAddressForMatch(topAddr);
    const topPhoneDigits = normalizePhoneDigits(topPhone);
    const alreadyPresent = results.some((r) => {
      const rNorm = normalizeAddressForMatch(r.address);
      const rPhoneDigits = normalizePhoneDigits(r.phone);
      if (topNorm && rNorm && topNorm === rNorm) return true;
      if (!topAddr && topPhoneDigits && rPhoneDigits === topPhoneDigits) return true;
      return false;
    });
    if (!alreadyPresent) {
      results.unshift({
        id: entry.selectedAddressId || null,
        label: "",
        recipientName: String(entry.recipientName || fallbackName || "").trim(),
        phone: topPhone,
        address: topAddr,
        postalCode:
          String(entry.postalCode || "").trim() ||
          extractPostalCode(topAddr).postalCode,
        contactChannel: entry.contactChannel || "",
        paymentType: entry.paymentType || "",
      });
    }
  }

  return results;
}

function collectPhonesFromCandidate(addresses, topPhone = "") {
  const set = new Set();
  const displayList = [];

  const addPhone = (raw) => {
    const digits = normalizePhoneDigits(raw);
    if (!digits || set.has(digits)) return;
    set.add(digits);
    displayList.push(formatPhoneNumber(digits));
  };

  addPhone(topPhone);
  for (const a of addresses) {
    addPhone(a.phone);
    if (a.address) {
      const extracted = extractPhone(a.address).phone;
      if (extracted) addPhone(extracted);
    }
  }
  return { phoneDigits: Array.from(set), phonesDisplay: displayList };
}

function buildNicknameIndex(nicknames = {}) {
  // Map normalized nick -> array of { key, realName, isYouTubeId, isHandle }
  const byNormNick = new Map();
  // Map key -> { key, nick, realName, phonetic }
  const byKey = new Map();

  Object.entries(nicknames || {}).forEach(([key, entry]) => {
    if (!entry) return;
    const isReal = isSafeGlobalNicknameKey(key);
    const nick = String(typeof entry === "object" ? entry.nick || "" : entry).trim();
    const realName = String(typeof entry === "object" ? entry.realName || "" : "").trim();
    const phonetic = String(typeof entry === "object" ? entry.phonetic || "" : "").trim();
    const info = {
      key,
      nick,
      realName,
      phonetic,
      isYouTubeId: isYouTubeChannelId(key),
      isHandle: isYouTubeHandle(key),
      isReal,
    };
    byKey.set(key, info);

    if (isReal && nick) {
      const norm = normalizeName(nick);
      if (norm) {
        if (!byNormNick.has(norm)) byNormNick.set(norm, []);
        byNormNick.get(norm).push(info);
      }
    }
  });

  return { byNormNick, byKey };
}

/**
 * Builds an inspectable list of customer candidate records from `address_book`, `delivery_customers`, and `nicknames`.
 * Importantly, when a customer name has MULTIPLE `delivery_customers` IDs (e.g. a real `UC...` ID + a `manual-...` or `cust_...` ID)
 * or multiple `address_book` keys, each split record is preserved as a separate inspectable candidate so the admin can
 * verify ID / phone / address side-by-side and consolidate them cleanly.
 *
 * @param {Object} params
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryCustomers]
 * @param {Object} [params.nicknames]
 * @returns {Array<Object>}
 */
export function buildInspectableCustomerRecords({
  addressBook = {},
  deliveryCustomers = {},
  nicknames = {},
} = {}) {
  const { byNormNick, byKey } = buildNicknameIndex(nicknames);
  const candidates = [];

  // Group address_book entries by normalized name
  const booksByNorm = new Map();
  Object.entries(addressBook || {}).forEach(([bookKey, book]) => {
    if (!book || typeof book !== "object") return;
    const displayName = String(book.name || bookKey).trim();
    const norm = normalizeName(displayName);
    if (!norm) return;
    if (!booksByNorm.has(norm)) booksByNorm.set(norm, []);
    booksByNorm.get(norm).push({ bookKey, book, displayName });
  });

  // Group delivery_customers entries by normalized name
  const delivsByNorm = new Map();
  Object.entries(deliveryCustomers || {}).forEach(([delivId, cust]) => {
    if (!cust || typeof cust !== "object") return;
    const displayName = String(cust.name || cust.displayName || "").trim();
    const norm = normalizeName(displayName);
    if (!norm) return;
    if (!delivsByNorm.has(norm)) delivsByNorm.set(norm, []);
    delivsByNorm.get(norm).push({ delivId, cust, displayName });
  });

  const allNormNames = new Set([...booksByNorm.keys(), ...delivsByNorm.keys()]);

  const makeCandidate = ({
    candidateId,
    name,
    addressBookKeys = [],
    deliveryIds = [],
    bookEntry = null,
    delivEntry = null,
    linkedNickEntries = [],
  }) => {
    const bookAddresses = bookEntry ? collectAllAddressesFromEntry(bookEntry, name) : [];
    const delivAddresses = delivEntry ? collectAllAddressesFromEntry(delivEntry, name) : [];

    // Merge candidate's own book + delivery addresses for display
    const addresses = [...bookAddresses];
    for (const da of delivAddresses) {
      const daNorm = normalizeAddressForMatch(da.address);
      const daPhone = normalizePhoneDigits(da.phone);
      const exists = addresses.some((a) => {
        const aNorm = normalizeAddressForMatch(a.address);
        if (daNorm && aNorm && daNorm === aNorm) return true;
        if (!da.address && daPhone && normalizePhoneDigits(a.phone) === daPhone) return true;
        return false;
      });
      if (!exists) addresses.push(da);
    }

    const activeAddr =
      (bookEntry?.selectedAddressId &&
        addresses.find((a) => a.id === bookEntry.selectedAddressId)) ||
      addresses.find((a) => a.address) ||
      addresses[0] ||
      null;

    const fullAddr = String(activeAddr?.address || bookEntry?.address || delivEntry?.address || "").trim();
    const phone = String(activeAddr?.phone || bookEntry?.phone || delivEntry?.phone || "").trim();
    const recipientName = String(
      activeAddr?.recipientName || bookEntry?.recipientName || delivEntry?.recipientName || ""
    ).trim();
    const postalCode =
      String(activeAddr?.postalCode || bookEntry?.postalCode || delivEntry?.postalCode || "").trim() ||
      extractPostalCode(fullAddr).postalCode;
    const contactChannel =
      activeAddr?.contactChannel || bookEntry?.contactChannel || delivEntry?.contactChannel || "";
    const paymentType =
      activeAddr?.paymentType || bookEntry?.paymentType || delivEntry?.paymentType || "";

    const { phoneDigits, phonesDisplay } = collectPhonesFromCandidate(addresses, phone);
    const addressSignatures = addresses
      .map((a) => extractAddressSignature(a.address, a.postalCode))
      .filter((s) => s.norm.length >= 12);

    const youtubeIds = new Set();
    const tempIds = new Set();
    const handles = new Set();
    const realNames = new Set();

    for (const id of deliveryIds) {
      if (isYouTubeChannelId(id)) {
        youtubeIds.add(id);
      } else if (isYouTubeHandle(id)) {
        handles.add(id);
      } else {
        tempIds.add(id);
      }
      const nickRec = byKey.get(id);
      if (nickRec?.realName) realNames.add(nickRec.realName);
    }
    if (delivEntry?.uid && delivEntry.uid !== deliveryIds[0]) {
      if (isYouTubeChannelId(delivEntry.uid)) youtubeIds.add(delivEntry.uid);
    }
    for (const nl of linkedNickEntries) {
      if (nl.isYouTubeId) youtubeIds.add(nl.key);
      if (nl.isHandle) handles.add(nl.key);
      if (nl.realName) realNames.add(nl.realName);
    }

    const norm = normalizeName(name);
    const coreName = stripHonorificPrefix(name);
    const normRecipient = normalizeRecipientForMatch(recipientName);
    const isFullRecipient =
      normRecipient.length >= 7 && normRecipient.split(/\s+/).length >= 2;

    const pendingItemCount =
      delivEntry && delivEntry.status !== "done" ? Number(delivEntry.itemCount) || 0 : 0;
    const pendingTotalPrice =
      delivEntry && delivEntry.status !== "done" ? Number(delivEntry.totalPrice) || 0 : 0;
    const totalBookings = Number(delivEntry?.totalBookings) || 0;
    const deliveryDate =
      delivEntry && delivEntry.status !== "done" && delivEntry.deliveryDate
        ? String(delivEntry.deliveryDate).trim()
        : "";
    const status = delivEntry?.status || "";

    return {
      candidateId,
      name,
      normName: norm,
      coreName,
      addressBookKeys,
      deliveryIds,
      youtubeIds: Array.from(youtubeIds),
      tempIds: Array.from(tempIds),
      handles: Array.from(handles),
      realNames: Array.from(realNames),
      recipientName,
      normRecipient,
      isFullRecipient,
      phone: phonesDisplay[0] || phone,
      phoneDigits,
      phonesDisplay,
      address: fullAddr,
      postalCode,
      addresses,
      addressSignatures,
      hasAddress: Boolean(fullAddr),
      addressCount: Math.max(addresses.filter((a) => a.address).length, fullAddr ? 1 : 0),
      contactChannel,
      paymentType,
      pendingItemCount,
      pendingTotalPrice,
      totalBookings,
      deliveryDate,
      status,
      updatedAt: Math.max(Number(bookEntry?.updatedAt) || 0, Number(delivEntry?.updatedAt) || 0),
      hasRealYouTubeId: youtubeIds.size > 0,
    };
  };

  for (const norm of allNormNames) {
    const books = booksByNorm.get(norm) || [];
    const delivs = delivsByNorm.get(norm) || [];
    const nickLinks = byNormNick.get(norm) || [];

    // Simple 1:1 or 1:0 or 0:1 case -> single unified candidate
    if (books.length <= 1 && delivs.length <= 1) {
      const b = books[0] || null;
      const d = delivs[0] || null;
      const name = b?.displayName || d?.displayName || norm;
      const delivId = d ? d.delivId : null;
      // Attach nickname links matching this delivId or (when no real UC id on deliv) all nickLinks for this norm name
      const matchedLinks = delivId && isYouTubeChannelId(delivId)
        ? nickLinks.filter((l) => l.key === delivId)
        : nickLinks;

      candidates.push(
        makeCandidate({
          candidateId: d ? `deliv:${d.delivId}` : `book:${b.bookKey}`,
          name,
          addressBookKeys: b ? [b.bookKey] : [],
          deliveryIds: d ? [d.delivId] : [],
          bookEntry: b?.book || null,
          delivEntry: d?.cust || null,
          linkedNickEntries: matchedLinks,
        })
      );
      continue;
    }

    // Multiple delivery_customers or multiple address_book keys sharing the SAME normalized name!
    // Expose each split record so admin can inspect its ID, phone, and address before merging.
    const usedBookIndices = new Set();

    // Score which delivery record best matches the primary address_book entry (if 1 book & N delivs)
    const matchBookToDelivery = (delivItem) => {
      if (books.length === 0) return null;
      const delivPhones = new Set(
        collectPhonesFromCandidate(
          collectAllAddressesFromEntry(delivItem.cust, delivItem.displayName),
          delivItem.cust.phone
        ).phoneDigits
      );
      const delivAddrNorm = normalizeAddressForMatch(delivItem.cust.address);

      let bestIdx = -1;
      let bestScore = -1;
      books.forEach((b, idx) => {
        if (usedBookIndices.has(idx)) return;
        let score = 0;
        const bPhones = collectPhonesFromCandidate(
          collectAllAddressesFromEntry(b.book, b.displayName),
          b.book.phone
        ).phoneDigits;
        if (bPhones.some((p) => delivPhones.has(p))) score += 10;
        const bAddrNorm = normalizeAddressForMatch(b.book.address);
        if (delivAddrNorm && bAddrNorm && delivAddrNorm === bAddrNorm) score += 10;
        if (isYouTubeChannelId(delivItem.delivId)) score += 3;
        if (delivItem.cust.status !== "done") score += 2;
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      });

      if (bestIdx >= 0 && bestScore > 0) {
        usedBookIndices.add(bestIdx);
        return books[bestIdx];
      }
      return null;
    };

    // Sort deliveries so real YouTube IDs & active records get first pick of matching book
    const sortedDelivs = [...delivs].sort((a, b) => {
      const aScore =
        (isYouTubeChannelId(a.delivId) ? 4 : 0) +
        (a.cust.status !== "done" ? 2 : 0) +
        (a.cust.address ? 1 : 0);
      const bScore =
        (isYouTubeChannelId(b.delivId) ? 4 : 0) +
        (b.cust.status !== "done" ? 2 : 0) +
        (b.cust.address ? 1 : 0);
      return bScore - aScore;
    });

    for (const d of sortedDelivs) {
      const matchedBook = matchBookToDelivery(d);
      const matchedLinks = nickLinks.filter((l) => l.key === d.delivId);
      candidates.push(
        makeCandidate({
          candidateId: `deliv:${d.delivId}`,
          name: matchedBook?.displayName || d.displayName,
          addressBookKeys: matchedBook ? [matchedBook.bookKey] : [],
          deliveryIds: [d.delivId],
          bookEntry: matchedBook?.book || null,
          delivEntry: d.cust,
          linkedNickEntries: matchedLinks,
        })
      );
    }

    // Any remaining unattached address_book entries (e.g. multiple address_book keys, or book didn't match any delivery phone/address)
    books.forEach((b, idx) => {
      if (usedBookIndices.has(idx)) return;
      candidates.push(
        makeCandidate({
          candidateId: `book:${b.bookKey}`,
          name: b.displayName,
          addressBookKeys: [b.bookKey],
          deliveryIds: [],
          bookEntry: b.book,
          delivEntry: null,
          linkedNickEntries: [],
        })
      );
    });
  }

  return candidates;
}

/**
 * Compares two inspectable customer candidates across ID, phone, address, recipient, and name.
 * @param {Object} a
 * @param {Object} b
 * @returns {Object}
 */
export function compareCustomerPair(a, b) {
  const sharedYoutubeIds = a.youtubeIds.filter((id) => b.youtubeIds.includes(id));
  const hasDifferentRealYoutubeIds =
    a.youtubeIds.length > 0 &&
    b.youtubeIds.length > 0 &&
    sharedYoutubeIds.length === 0;

  const sharedPhones = a.phoneDigits.filter((p) => b.phoneDigits.includes(p));
  const hasDifferentPhones =
    a.phoneDigits.length > 0 &&
    b.phoneDigits.length > 0 &&
    sharedPhones.length === 0;

  let addressMatchType = "none"; // 'exact' | 'similar' | 'conflict' | 'none'
  let bestAddrSim = 0;

  if (a.addressSignatures.length > 0 && b.addressSignatures.length > 0) {
    for (const sa of a.addressSignatures) {
      for (const sb of b.addressSignatures) {
        if (sa.norm === sb.norm) {
          addressMatchType = "exact";
          bestAddrSim = 1;
          break;
        }
        const sim = diceSimilarity(sa.norm, sb.norm);
        if (sim > bestAddrSim) bestAddrSim = sim;

        const samePostal = Boolean(sa.postal && sb.postal && sa.postal === sb.postal);
        const sameHouse = Boolean(sa.houseNo && sb.houseNo && sa.houseNo === sb.houseNo);
        const conflictingPostal = Boolean(
          sa.postal && sb.postal && sa.postal !== sb.postal
        );

        if (
          (samePostal && sameHouse && sim >= 0.55) ||
          (!conflictingPostal && sim >= 0.78 && Math.min(sa.norm.length, sb.norm.length) >= 16)
        ) {
          addressMatchType = "similar";
        }
      }
      if (addressMatchType === "exact") break;
    }

    if (addressMatchType === "none" && bestAddrSim < 0.45) {
      addressMatchType = "conflict";
    }
  }

  const sameFullRecipient = Boolean(
    a.isFullRecipient &&
      b.isFullRecipient &&
      a.normRecipient === b.normRecipient
  );

  const sameExactName = a.normName === b.normName;

  // Check similar name:
  // 1) Same core name after stripping honorifics / spaces (e.g. "กุ้ง" vs "พี่กุ้ง", "สมชาย ใจดี" vs "สมชายใจดี")
  // 2) Whole-word prefix/subset (e.g. "กุ้ง" vs "กุ้ง ศิริ", "นก" vs "นก (line)")
  let similarName = false;
  if (!sameExactName && a.coreName && b.coreName) {
    const aCompact = a.coreName.replace(/\s+/g, "");
    const bCompact = b.coreName.replace(/\s+/g, "");
    if (aCompact.length >= 2 && aCompact === bCompact) {
      similarName = true;
    } else {
      const aTokens = a.coreName.split(/\s+/).filter(Boolean);
      const bTokens = b.coreName.split(/\s+/).filter(Boolean);
      const shorter = aTokens.length <= bTokens.length ? aTokens : bTokens;
      const longer = aTokens.length <= bTokens.length ? bTokens : aTokens;
      if (
        shorter.length >= 1 &&
        longer.length > shorter.length &&
        shorter[0].length >= 2 &&
        shorter.every((t, idx) => longer[idx] === t)
      ) {
        similarName = true;
      }
    }
  }

  const reasons = [];
  if (sharedYoutubeIds.length > 0) reasons.push("same_uid");
  if (sharedPhones.length > 0) reasons.push("same_phone");
  if (addressMatchType === "exact") reasons.push("same_address");
  else if (addressMatchType === "similar") reasons.push("similar_address");
  if (sameFullRecipient) reasons.push("same_recipient");
  if (sameExactName) reasons.push("same_name");
  else if (similarName) reasons.push("similar_name");

  const hasStrongEvidence =
    sharedYoutubeIds.length > 0 ||
    sharedPhones.length > 0 ||
    addressMatchType === "exact" ||
    addressMatchType === "similar" ||
    sameFullRecipient;

  const hasConflict =
    hasDifferentRealYoutubeIds ||
    hasDifferentPhones ||
    addressMatchType === "conflict";

  // Decide whether this pair should be linked in automatic duplicate detection
  let shouldLink = false;
  let isStrongLink = false;

  if (hasStrongEvidence) {
    // Only avoid linking purely on recipient name if both phones AND addresses conflict
    if (
      reasons.length === 1 &&
      reasons[0] === "same_recipient" &&
      hasDifferentPhones &&
      addressMatchType === "conflict"
    ) {
      shouldLink = false;
    } else {
      shouldLink = true;
      isStrongLink = true;
    }
  } else if (sameExactName) {
    // Exact same name (e.g. split delivery_customers IDs or address_book keys) — ALWAYS surface!
    shouldLink = true;
    isStrongLink = true;
  } else if (similarName) {
    // Only link similar name variants (e.g. "กุ้ง" vs "พี่กุ้ง" or "กุ้ง" vs "กุ้ง ศิริ")
    // when they do NOT conflict on phone, address, or real YouTube IDs.
    if (!hasConflict) {
      shouldLink = true;
      isStrongLink = false;
    }
  }

  return {
    shouldLink,
    isStrongLink,
    hasStrongEvidence,
    hasConflict,
    hasDifferentRealYoutubeIds,
    hasDifferentPhones,
    addressMatchType,
    bestAddrSim,
    sharedYoutubeIds,
    sharedPhones,
    sameFullRecipient,
    sameExactName,
    similarName,
    reasons,
  };
}

/**
 * Scores a candidate to pick the best default Primary record in a duplicate group.
 * Prefers: Real YouTube Channel ID > has address > active pending orders > address_book entry > totalBookings > updatedAt.
 */
function scorePrimaryCandidate(c) {
  let score = 0;
  if (c.hasRealYouTubeId) score += 1000;
  if (c.hasAddress) score += 300;
  if (c.addressBookKeys.length > 0) score += 150;
  if (c.pendingItemCount > 0) score += 120;
  score += Math.min(c.addressCount, 5) * 20;
  score += Math.min(c.totalBookings, 50) * 2;
  if (c.phoneDigits.length > 0) score += 40;
  if (c.paymentType) score += 15;
  if (c.contactChannel) score += 10;
  // Slightly prefer concise clean nickname (not raw @handle) if tied
  if (c.name && !c.name.startsWith("@")) score += 8;
  return score;
}

/**
 * Finds groups of duplicate or potentially duplicate customers across `address_book`, `delivery_customers`, and `nicknames`.
 *
 * @param {Object} params
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryCustomers]
 * @param {Object} [params.nicknames]
 * @returns {{ candidates: Array<Object>, groups: Array<Object> }}
 */
export function findDuplicateCustomerGroups({
  addressBook = {},
  deliveryCustomers = {},
  nicknames = {},
} = {}) {
  const candidates = buildInspectableCustomerRecords({
    addressBook,
    deliveryCustomers,
    nicknames,
  });

  const n = candidates.length;
  if (n < 2) {
    return { candidates, groups: [] };
  }

  // Union-Find
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (x, y) => {
    const rx = find(x);
    const ry = find(y);
    if (rx !== ry) parent[ry] = rx;
  };

  // Store pairwise comparisons for linked pairs
  const strongEdges = [];
  const weakEdges = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const cmp = compareCustomerPair(candidates[i], candidates[j]);
      if (!cmp.shouldLink) continue;
      if (cmp.isStrongLink) {
        strongEdges.push({ i, j, cmp });
      } else {
        weakEdges.push({ i, j, cmp });
      }
    }
  }

  // 1. Apply strong edges first
  for (const { i, j } of strongEdges) {
    union(i, j);
  }

  // 2. Apply weak edges (similar_name) only if merging the two components creates no phone/address/UC conflict
  for (const { i, j } of weakEdges) {
    const ri = find(i);
    const rj = find(j);
    if (ri === rj) continue;

    // Collect members of both components
    const compA = [];
    const compB = [];
    for (let k = 0; k < n; k++) {
      const rk = find(k);
      if (rk === ri) compA.push(candidates[k]);
      else if (rk === rj) compB.push(candidates[k]);
    }
    // Avoid creating oversized weak-link chains
    if (compA.length + compB.length > 6) continue;

    let conflicts = false;
    for (const ca of compA) {
      for (const cb of compB) {
        const pairCmp = compareCustomerPair(ca, cb);
        if (pairCmp.hasConflict) {
          conflicts = true;
          break;
        }
      }
      if (conflicts) break;
    }
    if (!conflicts) {
      union(i, j);
    }
  }

  // Build connected components of size >= 2
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root).push(candidates[i]);
  }

  const groups = [];
  for (const members of buckets.values()) {
    if (members.length < 2) continue;

    // Sort members so best default primary is first
    members.sort((a, b) => {
      const diff = scorePrimaryCandidate(b) - scorePrimaryCandidate(a);
      if (diff !== 0) return diff;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });

    // Aggregate reasons & conflict flags across all member pairs
    const reasonSet = new Set();
    let hasStrongEvidence = false;
    let hasDifferentRealYoutubeIds = false;
    let hasDifferentPhones = false;
    let hasAddressConflict = false;
    const distinctDeliveryIds = new Set();
    const distinctNormNames = new Set();

    for (const m of members) {
      m.deliveryIds.forEach((id) => distinctDeliveryIds.add(id));
      distinctNormNames.add(m.normName);
    }

    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const cmp = compareCustomerPair(members[i], members[j]);
        cmp.reasons.forEach((r) => reasonSet.add(r));
        if (cmp.hasStrongEvidence) hasStrongEvidence = true;
        if (cmp.hasDifferentRealYoutubeIds) hasDifferentRealYoutubeIds = true;
        if (cmp.hasDifferentPhones) hasDifferentPhones = true;
        if (cmp.addressMatchType === "conflict") hasAddressConflict = true;
      }
    }

    const isSplitIds =
      distinctDeliveryIds.size > 1 && distinctNormNames.size === 1;
    if (distinctDeliveryIds.size > 1) {
      reasonSet.add("split_ids");
    }

    // Confidence level:
    // - 'warning': conflicting phones/addresses or different real YouTube IDs without strong phone/address match
    // - 'high': matched on phone, address, real YouTube ID, or full recipient (and no different real UC IDs)
    // - 'medium': matched on exact/similar name where one side lacks phone/address
    let confidence = "medium";
    const hasHardConflict =
      hasDifferentRealYoutubeIds ||
      (hasDifferentPhones && !reasonSet.has("same_address") && !reasonSet.has("same_uid")) ||
      (hasAddressConflict && !reasonSet.has("same_phone") && !reasonSet.has("same_uid"));

    if (hasHardConflict) {
      confidence = "warning";
    } else if (hasStrongEvidence) {
      confidence = "high";
    }

    const groupId = members
      .map((m) => m.candidateId)
      .sort()
      .join("||");

    groups.push({
      groupId,
      members,
      defaultPrimaryId: members[0].candidateId,
      reasons: Array.from(reasonSet),
      confidence,
      isSplitIds,
      hasStrongEvidence,
      hasDifferentRealYoutubeIds,
      hasDifferentPhones,
      hasAddressConflict,
    });
  }

  // Sort groups: high confidence first, then medium, then warning; within tier, more pending/members first
  const tierOrder = { high: 0, medium: 1, warning: 2 };
  groups.sort((a, b) => {
    const tDiff = (tierOrder[a.confidence] ?? 9) - (tierOrder[b.confidence] ?? 9);
    if (tDiff !== 0) return tDiff;
    const bPending = b.members.reduce((s, m) => s + m.pendingItemCount, 0);
    const aPending = a.members.reduce((s, m) => s + m.pendingItemCount, 0);
    if (bPending !== aPending) return bPending - aPending;
    return b.members.length - a.members.length;
  });

  return { candidates, groups };
}

/**
 * Merges and deduplicates address arrays from primary + secondary entries while preserving every unique address.
 */
function mergeAddressLists(primaryName, primaryAddresses, secondaryAddresses, now) {
  const merged = [];
  const all = [...primaryAddresses, ...secondaryAddresses];

  for (const raw of all) {
    const addr = String(raw.address || "").trim();
    const phone = String(raw.phone || "").trim();
    const recipientName = String(raw.recipientName || "").trim();
    const postalCode =
      String(raw.postalCode || "").trim() || extractPostalCode(addr).postalCode;
    const contactChannel = raw.contactChannel || "";
    const paymentType = raw.paymentType || "";

    if (!addr) continue;

    const normAddr = normalizeAddressForMatch(addr);
    const phoneDigits = normalizePhoneDigits(phone);

    const existing = merged.find((m) => {
      const mNorm = normalizeAddressForMatch(m.address);
      if (normAddr && mNorm && normAddr === mNorm) return true;
      if (
        normAddr.length >= 16 &&
        mNorm.length >= 16 &&
        diceSimilarity(normAddr, mNorm) >= 0.92
      ) {
        return true;
      }
      return false;
    });

    if (existing) {
      // Fill missing metadata into existing entry without losing primary values
      if (!existing.phone && phone) existing.phone = phone;
      if (
        (!existing.recipientName ||
          normalizeName(existing.recipientName) === normalizeName(primaryName)) &&
        recipientName
      ) {
        existing.recipientName = recipientName;
      }
      if (!existing.postalCode && postalCode) existing.postalCode = postalCode;
      if (!existing.contactChannel && contactChannel) {
        existing.contactChannel = contactChannel;
      }
      if (!existing.paymentType && paymentType) existing.paymentType = paymentType;
      // If existing address is shorter/less detailed than incoming (same normalized place), keep the richer formatted string
      if (addr.length > existing.address.length + 5 && (!phoneDigits || !existing.phone || normalizePhoneDigits(existing.phone) === phoneDigits)) {
        existing.address = addr;
      }
    } else {
      merged.push({
        id:
          raw.id ||
          `addr_${now}_${merged.length}_${Math.random().toString(36).slice(2, 6)}`,
        label: raw.label || (merged.length === 0 ? "ที่อยู่หลัก" : `ที่อยู่ ${merged.length + 1}`),
        recipientName: recipientName || primaryName,
        phone,
        address: addr,
        postalCode,
        contactChannel,
        paymentType,
      });
    }
  }

  // Ensure unique IDs across merged addresses
  const seenIds = new Set();
  merged.forEach((item, idx) => {
    if (!item.id || seenIds.has(item.id)) {
      item.id = `addr_${now}_${idx}`;
    }
    seenIds.add(item.id);
  });

  return merged;
}

/**
 * Picks the canonical `delivery_customers` UID when consolidating multiple delivery records.
 * Prefers real YouTube Channel ID (`UC...`) on primary first, then any real YouTube ID,
 * then primary's active record, then any active record, then primary's first valid record.
 */
function pickCanonicalDeliveryUid(primaryDeliveryIds, allDeliveryRecords) {
  const validEntries = allDeliveryRecords.filter(([id]) => isValidFirebaseKey(id));
  if (validEntries.length === 0) return null;

  const primarySet = new Set(primaryDeliveryIds);

  const scored = validEntries.map(([id, rec]) => {
    let score = 0;
    const isUc = isYouTubeChannelId(id);
    const isPrim = primarySet.has(id);
    const isActive = rec && rec.status !== "done";
    const isTemp = isTemporaryOrSyntheticUid(id);

    if (isUc) score += 1000;
    else if (!isTemp) score += 300;
    if (isPrim) score += 200;
    if (isActive) score += 100;
    if ((Number(rec?.itemCount) || 0) > 0) score += 50;
    if ((Number(rec?.totalBookings) || 0) > 0) score += 10;
    return { id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}

/**
 * Merges two session objects for the same `videoId` without losing pending or fulfilled items.
 */
function mergeVideoSession(sessionA, sessionB) {
  if (!sessionA) return JSON.parse(JSON.stringify(sessionB));
  if (!sessionB) return JSON.parse(JSON.stringify(sessionA));

  const fulfilled = {
    ...normalizeItemsMap(sessionA.fulfilledItems),
    ...normalizeItemsMap(sessionB.fulfilledItems),
  };

  const itemsA = sessionA.status !== "done" ? normalizeItemsMap(sessionA.items) : {};
  const itemsB = sessionB.status !== "done" ? normalizeItemsMap(sessionB.items) : {};
  const rawMergedItems = { ...itemsA, ...itemsB };

  // Filter out items already fulfilled with the exact same bookingKey
  const activeItems = Object.fromEntries(
    Object.entries(rawMergedItems).filter(
      ([id, item]) => !fulfilled[id] || fulfilled[id].bookingKey !== item.bookingKey
    )
  );

  const activeItemList = Object.values(activeItems);
  const itemsCount = activeItemList.length;
  const itemsPrice = activeItemList.reduce(
    (sum, item) => sum + (Number.parseInt(item.price, 10) || 0),
    0
  );

  // Preserve legacy counts if an active session had count > 0 without itemized `items` map
  const legacyCountA =
    sessionA.status !== "done" && Object.keys(itemsA).length === 0
      ? Number(sessionA.count) || 0
      : 0;
  const legacyPriceA =
    sessionA.status !== "done" && Object.keys(itemsA).length === 0
      ? Number(sessionA.totalPrice) || 0
      : 0;
  const legacyCountB =
    sessionB.status !== "done" && Object.keys(itemsB).length === 0
      ? Number(sessionB.count) || 0
      : 0;
  const legacyPriceB =
    sessionB.status !== "done" && Object.keys(itemsB).length === 0
      ? Number(sessionB.totalPrice) || 0
      : 0;

  const totalCount = itemsCount + legacyCountA + legacyCountB;
  const totalPrice = itemsPrice + legacyPriceA + legacyPriceB;
  const isPending = totalCount > 0;

  const result = {
    count: isPending ? totalCount : 0,
    totalPrice: isPending ? totalPrice : 0,
    status: isPending ? "pending" : "done",
  };
  if (Object.keys(activeItems).length > 0) {
    result.items = activeItems;
  }
  if (Object.keys(fulfilled).length > 0) {
    result.fulfilledItems = fulfilled;
  }
  return result;
}

/**
 * Builds an atomic Firebase multi-path update plan to merge one or more Secondary customers
 * into a Primary customer while preserving 100% of addresses, pending/completed bookings,
 * shipping dates, notes, and Rule #13 nickname safety.
 *
 * @param {Object} params
 * @param {Object} params.primary - Primary inspectable candidate record (kept name)
 * @param {Array<Object>} params.secondaries - Secondary inspectable candidate records to merge into primary
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryCustomers]
 * @param {Object} [params.nicknames]
 * @param {string|null} [params.activeVideoId]
 * @param {Object|null} [params.activeVideoStock]
 * @param {number} [params.now]
 * @returns {Object}
 */
export function buildCustomerMergePlan({
  primary,
  secondaries = [],
  addressBook = {},
  deliveryCustomers = {},
  nicknames = {},
  activeVideoId = null,
  activeVideoStock = null,
  now = Date.now(),
} = {}) {
  if (!primary || !primary.name || !String(primary.name).trim()) {
    throw new Error("กรุณาเลือกชื่อหลักที่ต้องการเก็บไว้");
  }
  const validSecondaries = (secondaries || []).filter(
    (s) => s && s.candidateId !== primary.candidateId
  );
  if (validSecondaries.length === 0) {
    throw new Error("กรุณาเลือกรายชื่อที่ต้องการรวมอย่างน้อย 1 รายการ");
  }

  const primaryName = String(primary.name).trim();
  const primaryNormKey = toSafeDbKey(primaryName);
  if (!primaryNormKey || !isValidFirebaseKey(primaryNormKey)) {
    throw new Error(`ชื่อหลัก "${primaryName}" ไม่สามารถสร้างคีย์ฐานข้อมูลได้`);
  }

  const multiPathUpdates = {};

  // 1. Collect all address_book keys and merge addresses
  const primaryBookKeys = new Set(primary.addressBookKeys || []);
  if (addressBook?.[primaryNormKey]) primaryBookKeys.add(primaryNormKey);

  const secondaryBookKeys = new Set();
  const secondaryNormNames = new Set();
  for (const sec of validSecondaries) {
    (sec.addressBookKeys || []).forEach((k) => secondaryBookKeys.add(k));
    const secSafeKey = toSafeDbKey(sec.name);
    if (secSafeKey && secSafeKey !== primaryNormKey && addressBook?.[secSafeKey]) {
      secondaryBookKeys.add(secSafeKey);
    }
    const secNorm = normalizeCustomerName(sec.name);
    if (secNorm && secNorm !== normalizeCustomerName(primaryName)) {
      secondaryNormNames.add(secNorm);
    }
  }

  // Gather addresses prioritizing Primary first, then Secondaries
  const primaryAddresses = [...(primary.addresses || [])];
  for (const bk of primaryBookKeys) {
    if (addressBook?.[bk]) {
      primaryAddresses.push(...collectAllAddressesFromEntry(addressBook[bk], primaryName));
    }
  }
  const secondaryAddresses = [];
  for (const sec of validSecondaries) {
    secondaryAddresses.push(...(sec.addresses || []));
    for (const bk of sec.addressBookKeys || []) {
      if (addressBook?.[bk]) {
        secondaryAddresses.push(...collectAllAddressesFromEntry(addressBook[bk], sec.name));
      }
    }
  }

  const mergedAddresses = mergeAddressLists(
    primaryName,
    primaryAddresses,
    secondaryAddresses,
    now
  );

  // Determine top-level merged profile fields (Primary's non-empty fields win, fallback to Secondaries)
  const primaryBookObj = addressBook?.[primaryNormKey] || (primary.addressBookKeys?.[0] ? addressBook?.[primary.addressBookKeys[0]] : null);
  const preferredActiveAddr =
    (primaryBookObj?.selectedAddressId &&
      mergedAddresses.find((a) => a.id === primaryBookObj.selectedAddressId)) ||
    mergedAddresses[0] ||
    null;

  const firstNonEmpty = (getter) => {
    const pVal = String(getter(primary) || "").trim();
    if (pVal) return pVal;
    for (const sec of validSecondaries) {
      const sVal = String(getter(sec) || "").trim();
      if (sVal) return sVal;
    }
    return "";
  };

  const mergedAddressStr = preferredActiveAddr?.address || firstNonEmpty((c) => c.address);
  const mergedPhone =
    preferredActiveAddr?.phone ||
    firstNonEmpty((c) => c.phone) ||
    mergedAddresses.find((a) => a.phone)?.phone ||
    "";
  const mergedRecipient =
    (preferredActiveAddr?.recipientName &&
    normalizeName(preferredActiveAddr.recipientName) !== normalizeName(primaryName)
      ? preferredActiveAddr.recipientName
      : "") ||
    firstNonEmpty((c) =>
      c.recipientName && normalizeName(c.recipientName) !== normalizeName(c.name)
        ? c.recipientName
        : ""
    ) ||
    preferredActiveAddr?.recipientName ||
    firstNonEmpty((c) => c.recipientName) ||
    primaryName;
  const mergedPostal =
    preferredActiveAddr?.postalCode ||
    firstNonEmpty((c) => c.postalCode) ||
    extractPostalCode(mergedAddressStr).postalCode ||
    "";
  const mergedContactChannel = firstNonEmpty((c) => c.contactChannel);
  const mergedPaymentType = firstNonEmpty((c) => c.paymentType);
  const selectedAddressId = preferredActiveAddr?.id || null;

  const mergedAddressBookEntry = {
    name: primaryName,
    recipientName: mergedRecipient,
    phone: mergedPhone,
    address: mergedAddressStr,
    postalCode: mergedPostal,
    contactChannel: mergedContactChannel,
    paymentType: mergedPaymentType,
    addresses: mergedAddresses,
    selectedAddressId,
    updatedAt: now,
  };

  // Write merged address_book entry if there is any address, phone, channel, payment, or existing book entry
  const shouldWriteAddressBook =
    mergedAddresses.length > 0 ||
    Boolean(mergedPhone) ||
    Boolean(mergedContactChannel) ||
    Boolean(mergedPaymentType) ||
    primaryBookKeys.size > 0 ||
    secondaryBookKeys.size > 0;

  const removedAddressBookKeys = [];
  if (shouldWriteAddressBook) {
    multiPathUpdates[`address_book/${primaryNormKey}`] = mergedAddressBookEntry;
    const allBookKeysToPrune = new Set([...primaryBookKeys, ...secondaryBookKeys]);
    for (const k of allBookKeysToPrune) {
      if (k !== primaryNormKey && isValidFirebaseKey(k)) {
        multiPathUpdates[`address_book/${k}`] = null;
        removedAddressBookKeys.push(k);
      }
    }
  }

  // 2. Collect and merge all delivery_customers records
  const deliveryRecordMap = new Map();
  const addDeliveryId = (id) => {
    if (!id || !deliveryCustomers?.[id] || deliveryRecordMap.has(id)) return;
    deliveryRecordMap.set(id, deliveryCustomers[id]);
  };
  (primary.deliveryIds || []).forEach(addDeliveryId);
  for (const sec of validSecondaries) {
    (sec.deliveryIds || []).forEach(addDeliveryId);
  }

  const allDeliveryEntries = Array.from(deliveryRecordMap.entries());
  const canonicalDeliveryUid = pickCanonicalDeliveryUid(
    primary.deliveryIds || [],
    allDeliveryEntries
  );

  let mergedDeliveryEntry = null;
  const removedDeliveryIds = [];

  if (canonicalDeliveryUid) {
    const baseRec = JSON.parse(
      JSON.stringify(deliveryRecordMap.get(canonicalDeliveryUid) || {})
    );

    // Merge sessions across all delivery records
    const mergedSessions = {};
    let totalBookingsSum = 0;
    let earliestPendingDate = "";
    const notes = [];
    const seenNotes = new Set();
    let minCreatedAt = Infinity;
    let legacySessionlessCount = 0;
    let legacySessionlessPrice = 0;
    let allPendingLabelPrinted = true;
    let hasAnyActiveRecord = false;
    let latestLabelPrintedAt = null;

    // Order so canonical record is processed first
    const orderedEntries = [
      [canonicalDeliveryUid, deliveryRecordMap.get(canonicalDeliveryUid)],
      ...allDeliveryEntries.filter(([id]) => id !== canonicalDeliveryUid),
    ];

    for (const [, rec] of orderedEntries) {
      if (!rec || typeof rec !== "object") continue;

      totalBookingsSum += Number(rec.totalBookings) || 0;
      if (rec.createdAt && Number(rec.createdAt) < minCreatedAt) {
        minCreatedAt = Number(rec.createdAt);
      }

      const trimmedNote = String(rec.note || "").trim();
      if (trimmedNote && !seenNotes.has(trimmedNote)) {
        seenNotes.add(trimmedNote);
        notes.push(trimmedNote);
      }

      const recSessions = rec.sessions && typeof rec.sessions === "object" ? rec.sessions : {};
      const recSessionKeys = Object.keys(recSessions);

      if (recSessionKeys.length > 0) {
        for (const [vid, sess] of Object.entries(recSessions)) {
          if (!sess || typeof sess !== "object") continue;
          mergedSessions[vid] = mergeVideoSession(mergedSessions[vid], sess);
        }
      } else if (rec.status !== "done" && (Number(rec.itemCount) || 0) > 0) {
        legacySessionlessCount += Number(rec.itemCount) || 0;
        legacySessionlessPrice += Number(rec.totalPrice) || 0;
      }

      if (rec.status !== "done") {
        hasAnyActiveRecord = true;
        if (rec.deliveryDate && typeof rec.deliveryDate === "string" && rec.deliveryDate.trim()) {
          const dStr = rec.deliveryDate.trim();
          if (!earliestPendingDate || dStr < earliestPendingDate) {
            earliestPendingDate = dStr;
          }
        }
        if ((Number(rec.itemCount) || 0) > 0) {
          if (!rec.labelPrinted) {
            allPendingLabelPrinted = false;
          } else if (rec.labelPrintedAt) {
            latestLabelPrintedAt = Math.max(latestLabelPrintedAt || 0, Number(rec.labelPrintedAt) || 0);
          }
        }
      }
    }

    const nextDelivery = {
      ...baseRec,
      name: primaryName,
      recipientName: mergedRecipient,
      phone: mergedPhone,
      address: mergedAddressStr,
      postalCode: mergedPostal,
      contactChannel: mergedContactChannel,
      paymentType: mergedPaymentType,
      addresses: mergedAddresses,
      selectedAddressId,
      sessions: mergedSessions,
      totalBookings: totalBookingsSum,
      note: notes.join(" / "),
      createdAt: Number.isFinite(minCreatedAt) ? minCreatedAt : now,
      updatedAt: now,
    };

    recalculateDelivery(nextDelivery);
    if (legacySessionlessCount > 0) {
      nextDelivery.itemCount = (Number(nextDelivery.itemCount) || 0) + legacySessionlessCount;
      nextDelivery.totalPrice = (Number(nextDelivery.totalPrice) || 0) + legacySessionlessPrice;
    }

    if (nextDelivery.itemCount > 0 || (hasAnyActiveRecord && earliestPendingDate)) {
      nextDelivery.status = "pending";
      nextDelivery.deliveryDate = earliestPendingDate || baseRec.deliveryDate || null;
      nextDelivery.labelPrinted = nextDelivery.itemCount > 0 ? allPendingLabelPrinted : false;
      nextDelivery.labelPrintedAt = nextDelivery.labelPrinted ? latestLabelPrintedAt : null;
    } else {
      nextDelivery.status = hasAnyActiveRecord ? "pending" : "done";
      nextDelivery.deliveryDate = earliestPendingDate || baseRec.deliveryDate || null;
      nextDelivery.labelPrinted = false;
      nextDelivery.labelPrintedAt = null;
    }

    // Remove stale undo snapshot referencing pre-merge single record if status became pending
    if (nextDelivery.status !== "done") {
      delete nextDelivery.lastDoneSnapshot;
      delete nextDelivery.lastDoneSessions;
      delete nextDelivery.lastDoneCount;
      delete nextDelivery.lastDoneId;
    }

    mergedDeliveryEntry = nextDelivery;
    multiPathUpdates[`delivery_customers/${canonicalDeliveryUid}`] = mergedDeliveryEntry;

    for (const [id] of allDeliveryEntries) {
      if (id !== canonicalDeliveryUid && isValidFirebaseKey(id)) {
        multiPathUpdates[`delivery_customers/${id}`] = null;
        removedDeliveryIds.push(id);
      }
    }
  }

  // 3. Update real YouTube account nicknames ONLY (Rule #13: NEVER write plain-name or proxy/temp keys!)
  const updatedNicknameKeys = [];
  const allMergedRealYoutubeIds = new Set([
    ...(primary.youtubeIds || []),
    ...validSecondaries.flatMap((s) => s.youtubeIds || []),
  ]);

  Object.entries(nicknames || {}).forEach(([key, entry]) => {
    if (!entry || !isSafeGlobalNicknameKey(key) || !isValidFirebaseKey(key)) return;
    const currentNick = String(typeof entry === "object" ? entry.nick || "" : entry).trim();
    const normCurrentNick = normalizeCustomerName(currentNick);
    const shouldRepoint =
      secondaryNormNames.has(normCurrentNick) ||
      (allMergedRealYoutubeIds.has(key) && normCurrentNick !== normalizeCustomerName(primaryName));

    if (!shouldRepoint) return;

    if (typeof entry === "object") {
      multiPathUpdates[`nicknames/${key}`] = {
        ...entry,
        nick: primaryName,
      };
    } else {
      multiPathUpdates[`nicknames/${key}`] = {
        nick: primaryName,
        realName: key,
      };
    }
    updatedNicknameKeys.push(key);
  });

  // Also if a merged secondary had a real YouTube Channel ID not yet in `nicknames` and its name differed from primaryName,
  // bind that real YouTube Channel ID to primaryName so future live chats resolve to the merged canonical customer!
  for (const sec of validSecondaries) {
    const secNorm = normalizeCustomerName(sec.name);
    if (!secNorm || secNorm === normalizeCustomerName(primaryName)) continue;
    for (const ucId of sec.youtubeIds || []) {
      if (
        isSafeGlobalNicknameKey(ucId) &&
        isValidFirebaseKey(ucId) &&
        !nicknames?.[ucId] &&
        !multiPathUpdates[`nicknames/${ucId}`]
      ) {
        multiPathUpdates[`nicknames/${ucId}`] = {
          nick: primaryName,
          realName: sec.realNames?.[0] || sec.name,
        };
        updatedNicknameKeys.push(ucId);
      }
    }
  }

  // 4. Sync active live stock board items whose owner matches a merged secondary name
  const updatedStockItemIds = [];
  if (
    activeVideoId &&
    activeVideoId !== "demo" &&
    isValidFirebaseKey(activeVideoId) &&
    activeVideoStock &&
    typeof activeVideoStock === "object" &&
    secondaryNormNames.size > 0
  ) {
    Object.entries(activeVideoStock).forEach(([itemId, item]) => {
      if (!item || typeof item !== "object" || !item.owner) return;
      if (!isValidFirebaseKey(itemId)) return;
      const ownerNorm = normalizeCustomerName(item.owner);
      if (secondaryNormNames.has(ownerNorm)) {
        multiPathUpdates[`stock/${activeVideoId}/${itemId}/owner`] = primaryName;
        if (
          canonicalDeliveryUid &&
          isYouTubeChannelId(canonicalDeliveryUid) &&
          (!item.uid || isTemporaryOrSyntheticUid(item.uid))
        ) {
          multiPathUpdates[`stock/${activeVideoId}/${itemId}/uid`] = canonicalDeliveryUid;
        }
        updatedStockItemIds.push(itemId);
      }
    });
  }

  return {
    primaryName,
    primaryNormKey,
    canonicalDeliveryUid,
    mergedAddressBookEntry: shouldWriteAddressBook ? mergedAddressBookEntry : null,
    mergedDeliveryEntry,
    removedAddressBookKeys,
    removedDeliveryIds,
    updatedNicknameKeys,
    updatedStockItemIds,
    summary: {
      keptName: primaryName,
      mergedNames: validSecondaries.map((s) => s.name),
      addressCount: mergedAddresses.length,
      totalBookings: mergedDeliveryEntry ? Number(mergedDeliveryEntry.totalBookings) || 0 : 0,
      pendingItemCount: mergedDeliveryEntry ? Number(mergedDeliveryEntry.itemCount) || 0 : 0,
      pendingTotalPrice: mergedDeliveryEntry ? Number(mergedDeliveryEntry.totalPrice) || 0 : 0,
      deliveryDate: mergedDeliveryEntry?.deliveryDate || null,
      canonicalDeliveryUid,
    },
    multiPathUpdates,
  };
}

/**
 * Inspects a customer row from AddressPage to determine all matching `address_book` keys,
 * all matching `delivery_customers` IDs, and whether the customer has active pending orders
 * or scheduled deliveries that must be protected from deletion.
 *
 * @param {Object} cust - Customer row object from AddressPage
 * @param {Object} [stores]
 * @param {Object} [stores.addressBook]
 * @param {Object} [stores.deliveryCustomers]
 * @returns {{
 *   addressBookKeys: string[],
 *   deliveryIds: string[],
 *   pendingItemCount: number,
 *   activeDeliveryDates: string[],
 *   totalBookings: number,
 *   hasPendingOrders: boolean
 * }}
 */
export function inspectCustomerDeleteState(
  cust,
  { addressBook = {}, deliveryCustomers = {} } = {}
) {
  const norm = normalizeName(cust?.name || "");
  const safeNorm = toSafeDbKey(cust?.name || "");

  const bookKeySet = new Set();
  const addBookKey = (k) => {
    if (isValidFirebaseKey(k)) bookKeySet.add(k);
  };

  if (Array.isArray(cust?.addressBookKeys)) {
    cust.addressBookKeys.forEach(addBookKey);
  }
  if (cust?.normKey && addressBook?.[cust.normKey]) {
    addBookKey(cust.normKey);
  }
  if (safeNorm && addressBook?.[safeNorm]) {
    addBookKey(safeNorm);
  }
  if (norm) {
    Object.entries(addressBook || {}).forEach(([k, b]) => {
      if (!b || typeof b !== "object") return;
      if (normalizeName(b.name || "") === norm || normalizeName(k) === norm) {
        addBookKey(k);
      }
    });
  }

  const delivIdSet = new Set();
  const addDelivId = (id) => {
    if (isValidFirebaseKey(id) && deliveryCustomers?.[id]) {
      delivIdSet.add(id);
    }
  };

  if (Array.isArray(cust?.deliveryIds)) {
    cust.deliveryIds.forEach(addDelivId);
  }
  if (norm) {
    Object.entries(deliveryCustomers || {}).forEach(([id, c]) => {
      if (!c || typeof c !== "object") return;
      const cName = c.name || c.displayName || "";
      if (normalizeName(cName) === norm || normalizeName(id) === norm) {
        addDelivId(id);
      }
    });
  }

  let pendingItemCount = 0;
  let totalBookings = 0;
  const activeDeliveryDates = [];

  for (const id of delivIdSet) {
    const rec = deliveryCustomers[id];
    if (!rec || typeof rec !== "object") continue;

    totalBookings += Number(rec.totalBookings) || 0;

    if (rec.status !== "done") {
      const activeSessionsCount = Object.values(rec.sessions || {})
        .filter((s) => s && s.status !== "done")
        .reduce((sum, s) => sum + (Number(s.count) || 0), 0);
      const recPending = Math.max(Number(rec.itemCount) || 0, activeSessionsCount);
      pendingItemCount += recPending;

      if (rec.deliveryDate && typeof rec.deliveryDate === "string" && rec.deliveryDate.trim()) {
        activeDeliveryDates.push(rec.deliveryDate.trim());
      }
    }
  }

  return {
    addressBookKeys: Array.from(bookKeySet),
    deliveryIds: Array.from(delivIdSet),
    pendingItemCount,
    activeDeliveryDates,
    totalBookings,
    hasPendingOrders: pendingItemCount > 0 || activeDeliveryDates.length > 0,
  };
}

/**
 * Builds an atomic Firebase multi-path update for deleting a customer in AddressPage.
 * - `mode: "full"`: Removes both `address_book` and `delivery_customers` entries so the customer
 *   disappears cleanly from the Address Book. Refuses if the customer still has pending orders or
 *   an active scheduled delivery date!
 * - `mode: "address_only"`: Removes `address_book` entries and clears address fields on
 *   `delivery_customers` while preserving bookings/history (without bumping `updatedAt` to row #1).
 *
 * @param {Object} params
 * @param {Object} params.cust
 * @param {'full'|'address_only'} [params.mode]
 * @param {Object} [params.addressBook]
 * @param {Object} [params.deliveryCustomers]
 * @returns {{ state: Object, multiPathUpdates: Object }}
 */
export function buildCustomerDeletePlan({
  cust,
  mode = "full",
  addressBook = {},
  deliveryCustomers = {},
} = {}) {
  const state = inspectCustomerDeleteState(cust, { addressBook, deliveryCustomers });

  if (mode === "full" && state.hasPendingOrders) {
    throw new Error(
      `ไม่สามารถลบรายชื่อ "${cust?.name || ""}" ได้ เนื่องจากยังมีสินค้าค้างจัดส่ง (${state.pendingItemCount} ชิ้น)`
    );
  }

  const multiPathUpdates = {};

  for (const key of state.addressBookKeys) {
    multiPathUpdates[`address_book/${key}`] = null;
  }

  if (mode === "full") {
    for (const id of state.deliveryIds) {
      multiPathUpdates[`delivery_customers/${id}`] = null;
    }
  } else {
    for (const id of state.deliveryIds) {
      multiPathUpdates[`delivery_customers/${id}/address`] = "";
      multiPathUpdates[`delivery_customers/${id}/phone`] = "";
      multiPathUpdates[`delivery_customers/${id}/postalCode`] = "";
      multiPathUpdates[`delivery_customers/${id}/recipientName`] = "";
      multiPathUpdates[`delivery_customers/${id}/addresses`] = null;
      multiPathUpdates[`delivery_customers/${id}/selectedAddressId`] = null;
    }
  }

  return { state, multiPathUpdates };
}

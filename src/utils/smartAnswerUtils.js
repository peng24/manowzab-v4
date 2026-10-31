/**
 * 💡 Smart Seller Answer Assistant Utilities
 * Pure, O(1)/single-pass lookup engine that detects customer/admin questions
 * about stored data (Stock Grid, Delivery Customers, Address Book) and returns
 * structured visual answers for the seller in real time.
 */

import {
  MAX_ITEM_ID,
  thaiToArabic,
  normalizeChatText,
  extractAdminCustomerName,
  nonNameNounsRegex,
  nonNameWordsRegex,
  conversationalFragmentRegex,
  backdatedNoteRegex,
} from "./chatParserUtils";
import { normalizeCustomerName, isProxyUid } from "./deliverySync";
import { isOutstandingBooking } from "./deliveryState";

// ── Pre-compiled Module-Scope Regexes (Zero Catastrophic Backtracking) ──

// 1. Yesterday / Backdated Inquiry ("ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร", "มะระ 39 เมื่อวาน")
const YESTERDAY_INQUIRY_REGEX = /(?:เมื่อวาน|เมือวาน|เมี่อวาน|วันก่อน|รอบก่อน|รอบที่แล้ว|ไลฟ์ก่อน|ไลฟ์ที่แล้ว|ยอดเก่า)/i;
const YESTERDAY_ITEM_NUM_REGEX = /(?:ตัวที่|รหัส|เบอร์|รายการที่|ชิ้นที่|ใบที่|ตัว)?\s*(\d{1,3})/i;

// 2. Specific Item Number Inquiry ("ตัว51พี่ได้ไหม", "51ใครได้", "12ว่างไหม", "14อกเท่าไรคะ", "48ราคา", "21 อกเท่าไหร่ สมฤทธิ์")
const SIZE_PREFIX_GUARD_REGEX = /(?:รอบอก|วัดอก|ติดอก|เสื้ออก|อก|เอว|พุง|สะโพก|ยาว|ความยาว|ไซส์|ไซร์|ไชส์|ไซด์|ขนาด|size)\s*$/i;
const ITEM_OWNERSHIP_QUERY_REGEX = /(?:(?:ตัวที่|ตัว|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ใบที่|ชิ้นที่|คู่ที่)?\s*(\d{1,3})\s*(?:พี่|หนู|เค้า|เรา|แม่|ป้า|น้า|คุณ)?\s*(?:ได้ไหม|ได้มั้ย|ได้มัย|ได้ไม๊|ได้ป่าว|ได้เปล่า|ทันไหม|ทันมั้ย|ทันป่าว|ใครได้|ของใคร|ว่างไหม|ว่างมั้ย|ว่างป่าว|ยังว่างไหม|ยังอยู่ไหม|ยังอยู่มั้ย|เหลือไหม|เหลือมั้ย))|(?:(?:ใครได้|ของใคร|ว่างไหม|ว่างมั้ย|ยังอยู่ไหม|ได้|ทัน)\s*(?:ตัวที่|ตัว|รหัส|ระหัส|เบอร์|รายการที่|ใบที่|ชิ้นที่)?\s*(\d{1,3})\s*(?:ไหม|มั้ย|มัย|ไม๊|ป่าว|เปล่า|คะ|ค่ะ|จ๊ะ|จ๋า|นาว|แม่ค้า|\?|$))/i;
const ITEM_SPEC_QUERY_REGEX = /^(?:(?:ของ\s*[ก-๙a-zA-Z0-9_.\-]+\s+)?(?:ตัวที่|ตัว|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ใบที่|ชิ้นที่|คู่ที่)?\s*)?(\d{1,3})\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(?:รอบอก|วัดอก|อก|เอว|พุง|สะโพก|ความยาว|ยาว|ราคา|กี่บาท|เท่าไหร่|เท่าไร|เท่าไหร|ทไหร|ไซส์|ไซร์|ไชส์|ไซด์|ขนาด|สีอะไร|ผ้าอะไร|เนื้อผ้าอะไร|มีตำหนิไหม|ตำหนิ|ขอดู|ดูหน่อย)/i;
const ITEM_SPEC_PREFIX_QUERY_REGEX = /(?:รอบอก|วัดอก|อก|เอว|พุง|สะโพก|ความยาว|ยาว|ราคา|กี่บาท|ไซส์|ไซร์|ไชส์|ไซด์|สีอะไร|ผ้าอะไร|ขอดู)\s*(?:ตัวที่|ตัว|รหัส|ระหัส|เบอร์|รายการที่|ใบที่|ชิ้นที่)\s*(\d{1,3})/i;

// 3. My Orders / Count / Bill Summary ("นาวพี่ได้กี่ตัววันนี้", "พี่ได้กี่ตัวเอฟ2วัน", "ของพี่ได้2ตัวใช่ไหม", "พี่นับได่8", "ใช่14ตัว", "ได้ตัวไหนบ้าง", "รวมยอด", "ยอดเท่าไหร่")
const MY_ORDERS_QUERY_REGEX = /(?:ได้กี่(?:ตัว|ชิ้น|ใบ|ชุด|คู่|รายการ)|กี่(?:ตัว|ชิ้น|ใบ|ชุด)แล้?ว|(?:เอฟ|จอง|รับ|ได้)\s*(?:ไป)?\s*กี่(?:ตัว|ชิ้น|ใบ|ชุด)|ของ(?:พี่|หนู|เรา|เค้า|แม่|ป้า)\s*กี่(?:ตัว|ชิ้น|ใบ)|ได้(?:ตัว|รหัส|เบอร์|ใบ|ชิ้น|อะไร)\s*ไหน(?:บ้าง)?|มี(?:ตัว|รหัส|เบอร์)\s*ไหนบ้าง|ทัน(?:ตัว|รหัส|เบอร์)\s*ไหน(?:บ้าง)?|สรุปยอด|รวมยอด|เช็คยอด|ดูยอด|แจ้งยอด|คิดยอด|ยอด(?:รวม|ทั้งหมด)?\s*(?:เท่าไหร่|เท่าไร|กี่บาท)|(?:ทั้งหมด|รวม)\s*(?:กี่บาท|เท่าไหร่|เท่าไร)|ค่าของ(?:เท่าไหร่|เท่าไร|กี่บาท)|(?:นับได้|นับได่)\s*\d+|(?:ใช่|ไช่|ใข่|ครบ)\s*\d+\s*(?:ตัว|ชิ้น|ใบ|ชุด)|ได้\s*\d+\s*(?:ตัว|ชิ้น|ใบ|ชุด)\s*(?:ใช่ไหม|ใช่มั้ย|ป่าว|เปล่า|ไหม|มั้ย|คะ|ค่ะ|นะ)|(?:วันนี้|รอบนี้)?\s*(?:พี่|หนู|เรา|เค้า)\s*ได้ไหม(?:คะ|ค่ะ|จ๊ะ|นาว)?$)/i;
const CLAIMED_COUNT_REGEX = /(?:(?:นับได้|นับได่)\s*(\d{1,3})|(?:ใช่|ไช่|ใข่|ครบ)\s*(\d{1,3})\s*(?:ตัว|ชิ้น|ใบ|ชุด)|ได้\s*(\d{1,3})\s*(?:ตัว|ชิ้น|ใบ|ชุด)\s*(?:ใช่ไหม|ใช่มั้ย|ใช่ป่าว|ไหม|มั้ย|ป่าว|เปล่า|คะ|ค่ะ|นะ))/i;

// 4. Hold / Consignment / Shipping Schedule ("มีฝากไหมนาว", "ฝากไว้กี่ตัว", "ส่งวันไหน", "ส่งหรือยัง")
const HOLD_SHIPPING_QUERY_REGEX = /(?:มี(?:ของ)?ฝาก(?:ไว้)?(?:ไหม|มั้ย|มัย|ไม๊|ป่าว|เปล่า|บ้าง)|ฝาก(?:ไว้)?(?:กี่ตัว|กี่ชิ้น|กี่ใบ|ไหม|มั้ย|หรือยัง|รึยัง)|(?:ของฝาก|ยอดฝาก|ของค้าง|ยอดค้าง).*(?:ไหม|มั้ย|กี่ตัว|กี่ชิ้น|เท่าไหร่|เท่าไร)|มี(?:ของ|ยอด)?ค้าง(?:ไหม|มั้ย|กี่ตัว)|(?:จัดส่ง|ส่งของ|ของพี่ส่ง|ส่งให้|ส่งแล้ว)\s*(?:วันไหน|เมื่อไหร่|เมื่อไร|รอบไหน|หรือยัง|รึยัง|ยังคะ|ยังค่ะ|ยังจ๊ะ)|ส่ง(?:วันไหน|เมื่อไหร่|เมื่อไร|รอบไหน|หรือยัง|รึยัง)(?:คะ|ค่ะ|จ๊ะ|จ๋า|นาว|แม่ค้า|\?|$))/i;

// 5. Profile / Address / COD ("มีที่อยู่พี่ไหม", "ที่อยู่เดิมมีไหม", "มีเบอร์ไหม", "เก็บปลายทางไหม")
const PROFILE_ADDRESS_QUERY_REGEX = /(?:มีที่อยู่(?:ของ)?(?:พี่|หนู|เรา|เค้า|แม่|ป้า)?\s*(?:ไหม|มั้ย|มัย|ไม๊|หรือยัง|รึยัง|ยัง|ป่าว|เปล่า|รึเปล่า|หรือเปล่า|ได้รึเปล่า)|ที่อยู่เดิม\s*(?:ไหม|มั้ย|มีไหม|มีมั้ย|อยู่ไหม|นะ|ค่ะ|คะ|จ้า|เลย)|ต้อง(?:แจ้ง|ส่ง|พิมพ์)?ที่อยู่ใหม่(?:ไหม|มั้ย)|มีเบอร์(?:โทร)?(?:พี่|หนู|เรา|เค้า)?\s*(?:ไหม|มั้ย|หรือยัง|รึยัง|ยัง)|(?:มี|ส่ง|รับ)?\s*(?:เก็บ(?:เงิน)?ปลายทาง|ปลายทาง|cod)\s*(?:ไหม|มั้ย|มัย|ได้ไหม|ได้มั้ย|ป่าว|เปล่า|รึเปล่า|หรือเปล่า|ได้รึเปล่า))/i;

// Helper regexes for extracting target customer name in inquiries
const INQUIRY_POSSESSIVE_NAME_REGEX = /ของ\s*(?!พี่|หนู|เรา|เค้า|ตัวเอง|ฉัน|ผม|แม่|ป้า|น้า|อา|ยาย|ลูกค้า|แม่ค้า)([ก-๙a-zA-Z]{2,18})(?=\s+(?:ตัว|รหัส|เบอร์|ได้|มี|ฝาก|ส่ง|ยอด|เมื่อวาน|เมือวาน|\d))/i;
const BACKDATED_NAME_EXTRACT_REGEX = /^(?:([ก-๙a-zA-Z]{2,20})\s+\d{1,3}\s*(?:เมื่อวาน|เมือวาน|เมี่อวาน|ย้อนหลัง)|\d{1,3}\s*(?:เมื่อวาน|เมือวาน|เมี่อวาน|ย้อนหลัง)\s+([ก-๙a-zA-Z]{2,20}))/i;
const ADMIN_TRAILING_NAME_REGEX = /(?:เท่าไหร่|เท่าไร|เท่าไหร|ทไหร|กี่บาท|สีอะไร|ไซส์อะไร|ได้ไหม|ได้มั้ย|ว่างไหม|ว่างมั้ย|กี่ตัว|เมื่อวาน|เมือวาน)\s*(?:คะ|ค่ะ|จ๊ะ|จ้า|นะ|นะคะ)?\s+([ก-๙a-zA-Z]{2,20})\s*$/i;
const SELF_PRONOUN_STOPWORDS_REGEX = /^(?:พี่|หนู|เรา|เค้า|ตัวเอง|ฉัน|ผม|แม่|ป้า|น้า|อา|ยาย|ลูกค้า|แม่ค้า|นาว|น้องนาว|พี่นาว|คุณนาว|แอดมิน|ร้าน|ใคร)$/i;
const INQUIRY_NON_NAME_FRAGMENT_REGEX = /(?:ได้|ไหม|มั้ย|ใช่|กี่|ตัว|ชิ้น|ใบ|ฝาก|ส่ง|ที่อยู่|เมื่อวาน|เมือวาน|\d)/i;

const THAI_SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/**
 * Formats YYYY-MM-DD into a concise Thai date + relative countdown label.
 * @param {string} dateStr
 * @returns {string}
 */
export function formatSmartDeliveryDate(dateStr) {
  if (!dateStr) return "";
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return dateStr;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((targetDay - today) / 86400000);
  const shortDate = `${targetDay.getDate()} ${THAI_SHORT_MONTHS[targetDay.getMonth()]}`;

  if (diffDays === 0) return `วันนี้`;
  if (diffDays === 1) return `พรุ่งนี้`;
  if (diffDays === -1) return `เมื่อวาน (${shortDate})`;
  if (diffDays < -1) return `${shortDate} (เลย ${Math.abs(diffDays)} วัน)`;
  return `${shortDate} (อีก ${diffDays} วัน)`;
}

/**
 * Checks if a candidate string is a valid customer name (not a pronoun, noun, or conversational fragment).
 * @param {string} candidate
 * @returns {boolean}
 */
function isValidTargetCustomerName(candidate) {
  if (!candidate || typeof candidate !== "string") return false;
  const trimmed = candidate.trim();
  if (trimmed.length < 2 || trimmed.length > 25) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (SELF_PRONOUN_STOPWORDS_REGEX.test(trimmed)) return false;
  if (INQUIRY_NON_NAME_FRAGMENT_REGEX.test(trimmed)) return false;
  if (nonNameNounsRegex.test(trimmed) || nonNameWordsRegex.test(trimmed)) return false;
  if (conversationalFragmentRegex.test(trimmed)) return false;
  return true;
}

/**
 * Extracts target customer name from a chat message when asked by Admin or about a named customer.
 * @param {Object} chat
 * @returns {{ customerName: string, customerUid: string|null, realName: string|null, isProxyTarget: boolean }}
 */
export function resolveInquiryCustomer(chat) {
  if (!chat) {
    return { customerName: "ลูกค้า", customerUid: null, realName: null, isProxyTarget: false };
  }

  const rawText = normalizeChatText(chat.text);

  // 1. Explicit proxyCustomerName on chat object
  if (chat.proxyCustomerName && isValidTargetCustomerName(chat.proxyCustomerName)) {
    return {
      customerName: chat.proxyCustomerName.trim(),
      customerUid: chat.proxyUid || null,
      realName: null,
      isProxyTarget: true,
    };
  }

  // 2. Possessive pattern "ของมะระ ตัวที่13เมื่อวาน..."
  const possMatch = rawText.match(INQUIRY_POSSESSIVE_NAME_REGEX);
  if (possMatch && isValidTargetCustomerName(possMatch[1])) {
    return {
      customerName: possMatch[1].trim(),
      customerUid: null,
      realName: null,
      isProxyTarget: true,
    };
  }

  // 2b. Backdated customer order pattern ("มะระ 39 เมื่อวาน", "39 เมื่อวาน มะระ")
  const backdatedNameMatch = rawText.match(BACKDATED_NAME_EXTRACT_REGEX);
  const backdatedCandidate = backdatedNameMatch ? (backdatedNameMatch[1] || backdatedNameMatch[2]) : null;
  if (backdatedCandidate && isValidTargetCustomerName(backdatedCandidate)) {
    return {
      customerName: backdatedCandidate.trim(),
      customerUid: null,
      realName: null,
      isProxyTarget: true,
    };
  }

  // 3. Admin trailing customer name ("21 อกเท่าไหร่ สมฤทธิ์") or Admin standard extraction
  if (chat.isAdmin) {
    const trailingMatch = rawText.match(ADMIN_TRAILING_NAME_REGEX);
    if (trailingMatch && isValidTargetCustomerName(trailingMatch[1])) {
      return {
        customerName: trailingMatch[1].trim(),
        customerUid: null,
        realName: null,
        isProxyTarget: true,
      };
    }

    const adminExtracted = extractAdminCustomerName(rawText);
    if (adminExtracted && isValidTargetCustomerName(adminExtracted)) {
      return {
        customerName: adminExtracted.trim(),
        customerUid: null,
        realName: null,
        isProxyTarget: true,
      };
    }
  }

  // 4. Default to the chat author
  const cleanDisplayName = (chat.displayName || chat.authorName || chat.realName || "ลูกค้า")
    .replace(/\s*\((?:โดย|ยกเลิกโดย)\s+.*\)\s*$/, "")
    .trim();

  return {
    customerName: cleanDisplayName,
    customerUid: chat.uid || null,
    realName: chat.realName || chat.authorName || null,
    isProxyTarget: false,
  };
}

/**
 * Fast pre-check: returns true if a message text matches any of the 5 Smart Answer question categories.
 * Used in both useChatProcessor.js (to tag type="question") and ChatPanel.vue (to short-circuit).
 *
 * @param {string} rawText
 * @returns {boolean}
 */
export function isSmartQuestionText(rawText) {
  if (!rawText || typeof rawText !== "string") return false;
  const text = normalizeChatText(rawText);
  if (!text) return false;

  if (MY_ORDERS_QUERY_REGEX.test(text)) return true;
  if (HOLD_SHIPPING_QUERY_REGEX.test(text)) return true;
  if (PROFILE_ADDRESS_QUERY_REGEX.test(text)) return true;
  if (extractQueriedItemId(text) !== null) return true;
  if (YESTERDAY_INQUIRY_REGEX.test(text) && (/\?|ไหม|มั้ย|อะไร|กี่|เท่าไหร่|เท่าไร|\d+/.test(text))) {
    return true;
  }
  return false;
}

/**
 * Extracts a specific queried item number (1..MAX_ITEM_ID) if the message is asking about an item's
 * ownership, availability, price, or chest/size spec.
 * Avoids false-matching garment size requests like "อก 44 มีไหมคะ".
 *
 * @param {string} normalizedText - Text after thaiToArabic()
 * @returns {number|null}
 */
export function extractQueriedItemId(normalizedText) {
  if (!normalizedText) return null;

  // 1. Ownership / Availability query ("ตัว51พี่ได้ไหม", "51ใครได้", "12ว่างไหม", "ได้51ไหม")
  const ownMatch = normalizedText.match(ITEM_OWNERSHIP_QUERY_REGEX);
  if (ownMatch) {
    const numStr = ownMatch[1] || ownMatch[2];
    const num = parseInt(numStr, 10);
    // Ensure it's not preceded by "อก " (e.g., "อก 44 ว่างไหม")
    const matchIndex = ownMatch.index || 0;
    const prefix = normalizedText.slice(0, matchIndex + ownMatch[0].indexOf(numStr));
    if (num >= 1 && num <= MAX_ITEM_ID && !SIZE_PREFIX_GUARD_REGEX.test(prefix)) {
      return num;
    }
  }

  // 2. Item spec query with number first ("14อกเท่าไรคะ", "48ราคา", "21 อกเท่าไหร่ สมฤทธิ์")
  const specMatch = normalizedText.match(ITEM_SPEC_QUERY_REGEX);
  if (specMatch && specMatch[1]) {
    const num = parseInt(specMatch[1], 10);
    if (num >= 1 && num <= MAX_ITEM_ID) {
      return num;
    }
  }

  // 3. Item spec query with explicit item noun after spec keyword ("ราคาตัวที่ 48", "ขอดูรหัส 25")
  const prefixSpecMatch = normalizedText.match(ITEM_SPEC_PREFIX_QUERY_REGEX);
  if (prefixSpecMatch && prefixSpecMatch[1]) {
    const num = parseInt(prefixSpecMatch[1], 10);
    if (num >= 1 && num <= MAX_ITEM_ID) {
      return num;
    }
  }

  return null;
}

/**
 * Checks if two customer names or UIDs refer to the same customer (supports space-agnostic matching).
 */
function isMatchingCustomer(itemOwner, itemUid, targetName, targetUid, targetRealName) {
  if (targetUid && itemUid && !isProxyUid(targetUid) && !isProxyUid(itemUid) && targetUid === itemUid) {
    return true;
  }
  const normItem = normalizeCustomerName(itemOwner);
  if (!normItem) return false;
  const normItemNoSpace = normItem.replace(/\s+/g, "");

  const normTarget = normalizeCustomerName(targetName);
  if (normTarget) {
    if (normItem === normTarget || normItemNoSpace === normTarget.replace(/\s+/g, "")) {
      return true;
    }
  }

  const normReal = normalizeCustomerName(targetRealName);
  if (normReal) {
    if (normItem === normReal || normItemNoSpace === normReal.replace(/\s+/g, "")) {
      return true;
    }
  }

  return false;
}

/**
 * Aggregates all stored data for a customer from stockData, deliveryByNormKey, and addressBook.
 */
export function getCustomerStoredPortfolio(
  customerName,
  customerUid,
  realName,
  { stockData = {}, deliveryByNormKey = {}, addressBook = {}, currentVideoId = null } = {}
) {
  const normName = normalizeCustomerName(customerName);
  const normReal = normalizeCustomerName(realName);
  const normNoSpace = normName.replace(/\s+/g, "");

  // 1. Today's live stock items & backup queues
  const todayOwned = [];
  const todayQueued = [];
  let todayPrice = 0;

  const entries = Object.entries(stockData || {});
  for (let i = 0; i < entries.length; i++) {
    const [idKey, item] = entries[i];
    if (!item) continue;
    const itemId = parseInt(idKey, 10);
    if (isNaN(itemId)) continue;

    if (item.owner && isMatchingCustomer(item.owner, item.uid, customerName, customerUid, realName)) {
      const priceNum = parseInt(item.price, 10) || 0;
      todayPrice += priceNum;
      todayOwned.push({
        id: itemId,
        price: priceNum,
        size: item.size || null,
        backdated: Boolean(item.backdated),
      });
    } else if (Array.isArray(item.queue) && item.queue.length > 0) {
      const qIdx = item.queue.findIndex((q) =>
        isMatchingCustomer(q?.owner || q?.name, q?.uid, customerName, customerUid, realName)
      );
      if (qIdx !== -1) {
        todayQueued.push({
          id: itemId,
          rank: qIdx + 1,
          owner: item.owner || "ไม่ระบุ",
        });
      }
    }
  }

  todayOwned.sort((a, b) => a.id - b.id);
  todayQueued.sort((a, b) => a.id - b.id);

  // 2. Delivery / Accumulated Sessions lookup
  let deliveryRecord = null;
  if (customerUid && deliveryByNormKey[customerUid]) {
    deliveryRecord = deliveryByNormKey[customerUid];
  } else if (normName && deliveryByNormKey[normName]) {
    deliveryRecord = deliveryByNormKey[normName];
  } else if (customerName && deliveryByNormKey[customerName]) {
    deliveryRecord = deliveryByNormKey[customerName];
  } else if (normReal && deliveryByNormKey[normReal]) {
    deliveryRecord = deliveryByNormKey[normReal];
  } else if (normNoSpace) {
    // Fallback space-agnostic scan on deliveryByNormKey
    const keys = Object.keys(deliveryByNormKey);
    for (let i = 0; i < keys.length; i++) {
      const cand = deliveryByNormKey[keys[i]];
      if (cand?.name && normalizeCustomerName(cand.name).replace(/\s+/g, "") === normNoSpace) {
        deliveryRecord = cand;
        break;
      }
    }
  }

  const isActiveDelivery = Boolean(deliveryRecord && deliveryRecord.status !== "done");
  const pastSessions = [];
  let pastCount = 0;
  let pastPrice = 0;

  if (isActiveDelivery && deliveryRecord.sessions) {
    const sessionEntries = Object.entries(deliveryRecord.sessions);
    for (let i = 0; i < sessionEntries.length; i++) {
      const [vid, s] = sessionEntries[i];
      if (!s || s.status === "done") continue;
      if (currentVideoId && vid === currentVideoId) continue;
      const cnt = parseInt(s.count, 10) || 0;
      const prc = parseInt(s.totalPrice, 10) || 0;
      if (cnt > 0) {
        pastCount += cnt;
        pastPrice += prc;
        pastSessions.push({
          videoId: vid,
          count: cnt,
          totalPrice: prc,
          title: s.title || vid,
        });
      }
    }
  } else if (isActiveDelivery && !deliveryRecord.sessions && (deliveryRecord.itemCount || 0) > todayOwned.length) {
    pastCount = Math.max(0, (deliveryRecord.itemCount || 0) - todayOwned.length);
    pastPrice = Math.max(0, (deliveryRecord.totalPrice || 0) - todayPrice);
  }

  // Today's sales remain visible, while accumulated goods exclude shipped bookings.
  const pendingToday = todayOwned.filter(item =>
    isOutstandingBooking(deliveryRecord?.sessions?.[currentVideoId], String(item.id), stockData[item.id]));
  const totalAccumulatedCount = pendingToday.length + pastCount;
  const totalAccumulatedPrice = pendingToday.reduce((sum, item) => sum + item.price, 0) + pastPrice;
  const deliveryDate = isActiveDelivery ? deliveryRecord.deliveryDate || null : null;
  const totalBookings = deliveryRecord?.totalBookings || 0;

  // 3. Address Book & Contact Metadata
  const dbKey = normName ? normName.replace(/[.#$[\]/]/g, "_") : "";
  const dbRealKey = normReal ? normReal.replace(/[.#$[\]/]/g, "_") : "";
  const addrEntry =
    (dbKey && addressBook?.[dbKey]) ||
    (dbRealKey && addressBook?.[dbRealKey]) ||
    null;

  const addressText = String(addrEntry?.address || deliveryRecord?.address || "").trim();
  const phoneText = String(addrEntry?.phone || deliveryRecord?.phone || "").trim();
  const hasAddress = Boolean(addressText || phoneText);
  const contactChannel = addrEntry?.contactChannel || deliveryRecord?.contactChannel || null;
  const paymentType = addrEntry?.paymentType || deliveryRecord?.paymentType || null;

  return {
    todayOwned,
    todayQueued,
    todayPrice,
    pastSessions,
    pastCount,
    pastPrice,
    totalAccumulatedCount,
    totalAccumulatedPrice,
    deliveryDate,
    totalBookings,
    hasAddress,
    addressText,
    phoneText,
    contactChannel,
    paymentType,
  };
}

/**
 * Formats a short, privacy-safe preview of a stored address & phone for the seller's screen.
 */
function formatAddressShortPreview(addressText, phoneText) {
  const parts = [];
  if (addressText) {
    const cleanAddr = addressText.replace(/\s+/g, " ").trim();
    parts.push(cleanAddr.length > 42 ? cleanAddr.slice(0, 42) + "…" : cleanAddr);
  }
  if (phoneText) {
    parts.push(`📞 ${phoneText}`);
  }
  return parts.join(" • ");
}

/**
 * Resolves a Smart Answer object for a chat message if it asks about stored data.
 * Returns null if the message is not a stored-data question or is a normal buy/cancel/banned row.
 *
 * @param {Object} chat - Chat message object from chatStore.messages
 * @param {Object} context - { stockData, deliveryByNormKey, addressBook, currentVideoId }
 * @returns {Object|null}
 */
export function resolveSmartAnswer(chat, context = {}) {
  if (!chat || !chat.text) return null;
  if (chat.isBanned || chat.type === "banned") return null;
  // Do not attach Smart Answer cards to executed buy/cancel rows
  if (chat.type === "buy" || chat.type === "cancel") return null;

  const normalizedText = normalizeChatText(chat.text);
  if (!normalizedText) return null;

  // Quick exit if text doesn't match any smart question pattern
  if (!isSmartQuestionText(normalizedText)) {
    return null;
  }

  const { stockData = {}, deliveryByNormKey = {}, addressBook = {}, currentVideoId = null } = context;
  const { customerName, customerUid, realName, isProxyTarget } = resolveInquiryCustomer(chat);
  const namePrefix = isProxyTarget ? `${customerName}: ` : "";
  const portfolio = getCustomerStoredPortfolio(customerName, customerUid, realName, {
    stockData,
    deliveryByNormKey,
    addressBook,
    currentVideoId,
  });

  // ── Category 3: Yesterday / Backdated Inquiry (checked before generic item query when "เมื่อวาน" is present) ──
  if (YESTERDAY_INQUIRY_REGEX.test(normalizedText)) {
    const itemMatch = normalizedText.match(YESTERDAY_ITEM_NUM_REGEX);
    const yesterdayItemId = itemMatch ? parseInt(itemMatch[1], 10) : null;
    const validItemId = yesterdayItemId && yesterdayItemId >= 1 && yesterdayItemId <= MAX_ITEM_ID ? yesterdayItemId : null;

    let headline = "";
    if (portfolio.pastCount > 0) {
      headline = `⏪ ${namePrefix}มียอดค้างรอบก่อน ${portfolio.pastCount} ตัว`;
      if (portfolio.pastPrice > 0) {
        headline += ` (${portfolio.pastPrice.toLocaleString()}฿)`;
      }
    } else {
      headline = `⏪ ${namePrefix}ไม่พบยอดค้างรอบก่อน`;
    }

    const subParts = [];
    if (validItemId) {
      subParts.push(`ถามรหัส #${validItemId}`);
    }
    if (portfolio.todayOwned.length > 0) {
      subParts.push(`วันนี้ ${portfolio.todayOwned.length} ตัว • รวม ${portfolio.totalAccumulatedCount} ตัว`);
    }

    const actionPills = [
      {
        text: `📋 ดูรายการย้อนหลัง (${portfolio.totalAccumulatedCount || portfolio.pastCount})`,
        tone: "sky",
        action: "show-owner-items",
        ownerName: customerName,
      },
    ];

    return {
      category: "yesterday",
      categoryLabel: validItemId ? `ยอดย้อนหลัง #${validItemId}` : "ยอดย้อนหลัง",
      icon: "⏪",
      tone: "violet",
      customerName,
      customerUid,
      itemId: validItemId,
      headline,
      subline: subParts.join(" • "),
      pills: actionPills,
      fingerprint: `yesterday:${customerName}:${portfolio.pastCount}:${portfolio.todayOwned.length}:${portfolio.hasAddress ? 1 : 0}`,
    };
  }

  // ── Category 1: Specific Item Query (#N) ──
  const queriedItemId = extractQueriedItemId(normalizedText);
  if (queriedItemId !== null) {
    const item = stockData?.[queriedItemId] || null;
    const itemOwner = item?.owner || null;
    const queue = Array.isArray(item?.queue) ? item.queue : [];
    const price = parseInt(item?.price, 10) || 0;
    const size = item?.size || null;

    let headline = "";
    let tone = "sky";

    if (!itemOwner) {
      headline = `🟢 รหัส #${queriedItemId} ยังว่าง`;
      tone = "emerald";
    } else if (isMatchingCustomer(itemOwner, item?.uid, customerName, customerUid, realName)) {
      headline = `✅ ได้ของ! รหัส #${queriedItemId} เป็นของ ${itemOwner}`;
      tone = "emerald";
    } else {
      const qIdx = queue.findIndex((q) =>
        isMatchingCustomer(q?.owner || q?.name, q?.uid, customerName, customerUid, realName)
      );
      if (qIdx !== -1) {
        headline = `⏳ คิวสำรอง #${qIdx + 1} (เจ้าของ #${queriedItemId}: ${itemOwner})`;
        tone = "amber";
      } else {
        headline = `👤 รหัส #${queriedItemId} เจ้าของคือ ${itemOwner}`;
        tone = "sky";
      }
    }

    const subParts = [];
    if (price > 0) subParts.push(`${price.toLocaleString()}฿`);
    if (size) subParts.push(`ไซส์ ${size}`);
    if (queue.length > 0 && !headline.includes("คิวสำรอง")) {
      subParts.push(`สำรอง ${queue.length} คิว`);
    }
    if (portfolio.todayOwned.length > 0) {
      const idsStr = portfolio.todayOwned.slice(0, 6).map((x) => `#${x.id}`).join(", ");
      subParts.push(`วันนี้ได้ ${portfolio.todayOwned.length} ตัว (${idsStr})`);
    }

    const itemPills = [
      {
        text: `ดูสินค้า #${queriedItemId} →`,
        tone: "sky",
        action: "jump-to-item",
        itemId: queriedItemId,
      },
    ];

    return {
      category: "item",
      categoryLabel: `รหัส #${queriedItemId}`,
      icon: "🏷️",
      tone,
      customerName,
      customerUid,
      itemId: queriedItemId,
      headline,
      subline: subParts.join(" • "),
      pills: itemPills,
      fingerprint: `item:${queriedItemId}:${itemOwner || ""}:${price}:${size || ""}:${queue.length}:${portfolio.todayOwned.length}:${portfolio.hasAddress ? 1 : 0}`,
    };
  }

  // ── Category 2: Customer Order Count / Items / Total Summary ──
  if (MY_ORDERS_QUERY_REGEX.test(normalizedText)) {
    const claimedMatch = normalizedText.match(CLAIMED_COUNT_REGEX);
    const claimedCount = claimedMatch
      ? parseInt(claimedMatch[1] || claimedMatch[2] || claimedMatch[3], 10)
      : null;

    const todayCount = portfolio.todayOwned.length;
    const totalCount = portfolio.totalAccumulatedCount;

    let headline = "";
    let tone = "emerald";

    if (todayCount > 0 && portfolio.pastCount > 0) {
      headline = `🛒 ${namePrefix}วันนี้ ${todayCount} ตัว • 📦 สะสมรวม ${totalCount} ตัว (เก่า ${portfolio.pastCount})`;
    } else if (todayCount > 0) {
      const priceSuffix = portfolio.todayPrice > 0 ? ` (${portfolio.todayPrice.toLocaleString()}฿)` : "";
      headline = `🛒 ${namePrefix}วันนี้ได้ ${todayCount} ตัว${priceSuffix}`;
    } else if (portfolio.pastCount > 0) {
      headline = `📦 ${namePrefix}วันนี้ 0 • มียอดเก่าสะสม ${portfolio.pastCount} ตัว`;
      tone = "sky";
    } else {
      headline = `⚪ ${namePrefix}ยังไม่มีรายการจอง (0 ตัว)`;
      tone = "amber";
    }

    const subParts = [];
    if (portfolio.todayQueued.length > 0) {
      const qStr = portfolio.todayQueued.map((q) => `#${q.id}(สำรอง${q.rank})`).join(", ");
      subParts.push(`⏳ ${qStr}`);
    }
    if (portfolio.deliveryDate) {
      subParts.push(`🚚 ส่ง${formatSmartDeliveryDate(portfolio.deliveryDate)}`);
    }

    const orderPills = [];
    if (claimedCount !== null && !isNaN(claimedCount)) {
      if (claimedCount === todayCount || claimedCount === totalCount) {
        orderPills.push({
          text: `✅ ยอดตรง (${claimedCount} ตัว)`,
          tone: "emerald",
        });
      } else {
        tone = "amber";
        orderPills.push({
          text: `⚠️ แจ้ง ${claimedCount} (ในระบบ ${totalCount} ตัว)`,
          tone: "rose",
        });
      }
    }

    for (let i = 0; i < Math.min(portfolio.todayOwned.length, 8); i++) {
      const owned = portfolio.todayOwned[i];
      orderPills.push({
        text: owned.price > 0 ? `#${owned.id}(${owned.price}฿)` : `#${owned.id}`,
        tone: "emerald",
        action: "jump-to-item",
        itemId: owned.id,
      });
    }

    if (totalCount > 0) {
      orderPills.push({
        text: `📋 ดูทั้งหมด (${totalCount})`,
        tone: "sky",
        action: "show-owner-items",
        ownerName: customerName,
      });
    }

    return {
      category: "orders",
      categoryLabel: `สรุปยอด ${customerName}`,
      icon: "🛒",
      tone,
      customerName,
      customerUid,
      itemId: portfolio.todayOwned[0]?.id || null,
      headline,
      subline: subParts.join(" • "),
      pills: orderPills,
      fingerprint: `orders:${customerName}:${ portfolio.todayOwned.map((x) => `${x.id}-${x.price}`).join(",") }:${portfolio.pastCount}:${portfolio.todayQueued.length}:${portfolio.hasAddress ? 1 : 0}`,
    };
  }

  // ── Category 4: Hold / Consignment / Shipping Schedule ──
  if (HOLD_SHIPPING_QUERY_REGEX.test(normalizedText)) {
    const todayCount = portfolio.todayOwned.length;
    const totalCount = portfolio.totalAccumulatedCount;
    let headline = "";
    let tone = "violet";

    if (totalCount > 0) {
      const breakdown = portfolio.pastCount > 0 ? ` (เก่า ${portfolio.pastCount} + วันนี้ ${todayCount})` : "";
      headline = `📦 ${namePrefix}มีของสะสมรวม ${totalCount} ตัว${breakdown}`;
      tone = "emerald";
    } else {
      headline = `⚪ ${namePrefix}ไม่มีรายการฝากค้างส่ง (0 ตัว)`;
      tone = "amber";
    }

    const subParts = [];
    if (portfolio.deliveryDate) {
      subParts.push(`🚚 กำหนดส่ง: ${formatSmartDeliveryDate(portfolio.deliveryDate)}`);
    } else if (totalCount > 0) {
      subParts.push(`⏳ ฝากไว้ (ยังไม่ระบุวันส่ง)`);
    }

    const holdPills = [];
    if (totalCount > 0) {
      holdPills.push({
        text: `📋 ดูทั้งหมด (${totalCount})`,
        tone: "sky",
        action: "show-owner-items",
        ownerName: customerName,
      });
    }

    return {
      category: "hold",
      categoryLabel: `สถานะฝาก & รอบส่ง`,
      icon: "📦",
      tone,
      customerName,
      customerUid,
      itemId: null,
      headline,
      subline: subParts.join(" • "),
      pills: holdPills,
      fingerprint: `hold:${customerName}:${totalCount}:${portfolio.deliveryDate || ""}:${portfolio.hasAddress ? 1 : 0}`,
    };
  }

  // ── Category 5: Profile / Address / COD Inquiry ──
  if (PROFILE_ADDRESS_QUERY_REGEX.test(normalizedText)) {
    const paySuffix =
      portfolio.paymentType === "cod"
        ? " • 📦 COD ปลายทาง"
        : portfolio.paymentType === "transfer"
        ? " • 💳 โอนเงิน"
        : "";
    let headline = "";
    let tone = portfolio.hasAddress ? "emerald" : "amber";

    if (portfolio.hasAddress) {
      headline = `📍 ${namePrefix}มีที่อยู่จัดส่งในระบบแล้ว${paySuffix}`;
    } else {
      headline = `⚠️ ${namePrefix}ยังไม่มีที่อยู่ในระบบ`;
    }

    const preview = formatAddressShortPreview(portfolio.addressText, portfolio.phoneText);
    const profilePills = [
      {
        text: "✏️ ดู/แก้ที่อยู่",
        tone: "sky",
        action: "edit-customer",
      },
    ];
    if (portfolio.paymentType === "cod") {
      profilePills.push({ text: "📦 COD ปลายทาง", tone: "amber" });
    }

    return {
      category: "profile",
      categoryLabel: `ข้อมูลที่อยู่`,
      icon: "📍",
      tone,
      customerName,
      customerUid,
      itemId: null,
      headline,
      subline: preview,
      pills: profilePills,
      fingerprint: `profile:${customerName}:${portfolio.hasAddress ? 1 : 0}:${portfolio.paymentType || ""}:${portfolio.contactChannel || ""}:${portfolio.totalAccumulatedCount}`,
    };
  }

  return null;
}

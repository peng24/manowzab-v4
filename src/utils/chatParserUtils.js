/**
 * Chat Parser Utilities (Pure Functions & Regex Patterns)
 * Zero side-effects for reliable unit testing with Vitest.
 */

// 🛡️ Maximum item ID to prevent absurd stock expansion from spam/typos (e.g. "555555")
export const MAX_ITEM_ID = 300;

// 🚀 Regex patterns enhanced from real live stream CSV logs
export const multiBuyRegex = /^(?:F|f|cf|CF|รับ|เอา|เิา|จอง)?\s*(\d+(?:[\s,_]+\d+)+)(?:\s+(.*))?$/i;
export const adminProxyNumFirstRegex = /^(\d+)\s+([ก-๛a-zA-Z].*)$/;
export const adminProxyNameFirstRegex = /^([ก-๛a-zA-Z]{2,})\s*(\d+)$/; // Supports "พี่อ้อย20" without spaces
export const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม|รอบส่ง|พัสดุ|เลขพัสดุ|เช็คเลข|แจ้งโอน|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง|โอนแล้ว|flash|kerry|j&t|jt|ส่งเลย|ส่งวันนี้|ส่งของ|ส่งให้|ส่งมา|ฝากไว้ก่อน|ฝากไว้|ฝาก/i;
export const questionRegex = /อก|เอว|สะโพก|ยาว|ราคา|เท่าไหร่|เท่าไร|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์|ใหม|หรอ|ปะ|ยังไง|อะไร|กี่|นิ้ว|เซน|เซนติเมตร|โล|กิโล|ชิ้น|ตัว|แพ็ค|แพค/;
export const pureNumberRegex = /^\s*(\d+)\s*$/;
export const fuzzyNumberRegex = /^\s*[,.\/;:\-_=]*\s*(\d+)\s*[,.\/;:\-_=]*\s*$/;
export const tryRegex = /(?:ลอง|ขอดู|โชว์|ดู)[^0-9\n]{0,12}?(\d+)|(\d+)[^0-9\n]{0,12}?(?:ลอง|ขอดู|โชว์|ดู)/i;
export const explicitBuyRegex = /(?:(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ชุดที่|ชุด|จอง)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(\d+))|(?:(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|รายการที่|รายการ|ชุดที่|ชุด|จอง))/i;
export const numberWithPoliteRegex = /^.{0,10}?(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|พี่|ป้า|น้า|อา|แม่|น้อง|ฝาก|\/\/)/;
export const dashBuyRegex = /^([^-]+)\s*[-]\s*(\d+)$/;
export const customerNameNumRegex = /^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,}?)\s+(\d+)$/;
export const numAndDescRegex = /^(\d+)\s*([ก-๛a-zA-Z\s\(\)\[\]\-]+)$/;
export const cancelKeywordRegex = /cc|cancel|ยกเลิก|ยกเลก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า|ผ่าน|คืน|ไม่รับ|ถอน/i;
export const standalonePassRegex = /^(?:ขอ)?ผ่าน\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|เลย)*$/i;

// 🚀 Static Lookup Map for O(1) Thai-to-Arabic Numeral Conversion (3x faster than charCode math)
const THAI_TO_ARABIC_MAP = {
  "๐": "0", "๑": "1", "๒": "2", "๓": "3", "๔": "4",
  "๕": "5", "๖": "6", "๗": "7", "๘": "8", "๙": "9"
};

/**
 * Converts Thai numerals (๐-๙) to Arabic digits (0-9)
 * @param {string} text 
 * @returns {string}
 */
export function thaiToArabic(text) {
  if (!text) return "";
  return text.replace(/[๐-๙]/g, (ch) => THAI_TO_ARABIC_MAP[ch]);
}

/**
 * Deterministic color generation based on user name string
 * @param {string} str 
 * @returns {string} HSL color string
 */
export function stringToColor(str) {
  if (!str) return "hsl(0, 85%, 75%)";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 85%, 75%)`;
}

// Module-scoped compiled regex instance
const ADMIN_REGEX = /admin|แอดมิน/i;

/**
 * Check if user name corresponds to an admin
 * @param {string} displayName 
 * @param {string} realName 
 * @returns {boolean}
 */
export function isAdminUser(displayName = "", realName = "") {
  return ADMIN_REGEX.test(displayName) || ADMIN_REGEX.test(realName);
}

/**
 * Extract intent details from message text (Pure function)
 * @param {string} text Raw message text
 * @returns {Object} Parsed intent details
 */
export function parseIntentDetails(text) {
  const normalizedMsg = thaiToArabic(text || "").trim();
  if (!normalizedMsg) return { type: "EMPTY" };

  // 1. Multi-buy
  const multiMatch = normalizedMsg.match(multiBuyRegex);
  if (multiMatch) {
    const rawNums = multiMatch[1].split(/[\s,_]+/).filter(Boolean);
    const itemIds = rawNums
      .map((n) => parseInt(n, 10))
      .filter((n) => !isNaN(n) && n > 0 && n <= MAX_ITEM_ID);
    if (itemIds.length > 0) {
      return { type: "MULTI_BUY", itemIds, description: multiMatch[2] || "" };
    }
  }

  // 2. Pure number or Fuzzy number (e.g. ",9" or "25/")
  const pureMatch = normalizedMsg.match(pureNumberRegex);
  if (pureMatch) {
    const itemId = parseInt(pureMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "pure-number" };
    }
  }

  const fuzzyMatch = normalizedMsg.match(fuzzyNumberRegex);
  if (fuzzyMatch) {
    const itemId = parseInt(fuzzyMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "fuzzy-number" };
    }
  }

  // 3. Try / Fit check request
  const tryMatch = normalizedMsg.match(tryRegex);
  if (tryMatch) {
    const itemIdStr = tryMatch[1] || tryMatch[2];
    const itemId = parseInt(itemIdStr, 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "TRY_ITEM", itemId, method: "try-keyword" };
    }
    return { type: "TRY_ITEM", method: "try-general" };
  }

  // 4. Explicit buy keyword
  const explicitMatch = normalizedMsg.match(explicitBuyRegex);
  if (explicitMatch) {
    const itemIdStr = explicitMatch[1] || explicitMatch[2];
    const itemId = parseInt(itemIdStr, 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "explicit-keyword" };
    }
  }

  // 5. Cancel
  if (cancelKeywordRegex.test(normalizedMsg)) {
    if (standalonePassRegex.test(normalizedMsg)) {
      return { type: "CANCEL_LATEST", method: "auto-pass-latest" };
    }
    const matchNum = normalizedMsg.match(/\d+/);
    if (matchNum) {
      const itemId = parseInt(matchNum[0], 10);
      return { type: "CANCEL_ITEM", itemId };
    }
    return { type: "CANCEL_LATEST", method: "auto-cancel-latest" };
  }

  // 6. Shipping
  if (shippingRegex.test(normalizedMsg)) {
    return { type: "SHIPPING" };
  }

  // 7. Question
  if (questionRegex.test(normalizedMsg)) {
    return { type: "QUESTION" };
  }

  return { type: "UNKNOWN" };
}

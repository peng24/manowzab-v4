/**
 * Chat Parser Utilities (Pure Functions & Regex Patterns)
 * Zero side-effects for reliable unit testing with Vitest.
 */

// 🛡️ Maximum item ID to prevent absurd stock expansion from spam/typos (e.g. "555555")
export const MAX_ITEM_ID = 300;

// 🚀 Regex patterns
export const multiBuyRegex = /^(?:F|f|cf|CF|รับ|เอา|เิา|จอง)?\s*(\d+(?:[\s,_]+\d+)+)(?:\s+(.*))?$/i;
export const adminProxyNumFirstRegex = /^(\d+)\s+([ก-๛a-zA-Z].*)$/;
export const adminProxyNameFirstRegex = /^([ก-๛a-zA-Z][^]*?)\s+(\d+)$/;
export const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม|รอบส่ง|พัสดุ|เลขพัสดุ|เช็คเลข|แจ้งโอน|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง|โอนแล้ว|flash|kerry|j&t|jt/;
export const questionRegex = /อก|เอว|สะโพก|ยาว|ราคา|เท่าไหร่|เท่าไร|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์|ใหม|หรอ|ปะ|ยังไง|อะไร|กี่|นิ้ว|เซน|เซนติเมตร|โล|กิโล|ชิ้น|ตัว|แพ็ค|แพค/;
export const pureNumberRegex = /^\s*(\d+)\s*$/;
export const fuzzyNumberRegex = /^\s*[,.\/;:]*\s*(\d+)\s*[,.\/;:]*\s*$/;
export const explicitBuyRegex = /(?:(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|ลอง|รายการที่|รายการ|ชุดที่|ชุด|จอง)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(\d+))|(?:(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|ลอง|รายการที่|รายการ|ชุดที่|ชุด|จอง))/i;
export const numberWithPoliteRegex = /^.{0,10}?(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|พี่|ป้า|น้า|อา|แม่|น้อง|ฝาก|\/\/)/;
export const dashBuyRegex = /^([^-]+)\s*[-]\s*(\d+)$/;
export const customerNameNumRegex = /^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,}?)\s+(\d+)$/;
export const numAndDescRegex = /^(\d+)\s*([ก-๛a-zA-Z\s\(\)\[\]\-]+)$/;
export const cancelKeywordRegex = /cc|cancel|ยกเลิก|ยกเลก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า|ผ่าน/i;
export const standalonePassRegex = /^(?:ขอ)?ผ่าน\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|เลย)*$/i;

/**
 * Converts Thai numerals (๐-๙) to Arabic digits (0-9)
 * @param {string} text 
 * @returns {string}
 */
export function thaiToArabic(text) {
  if (!text) return "";
  return text.replace(/[๐-๙]/g, (ch) => String(ch.charCodeAt(0) - 0x0e50));
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

/**
 * Check if user name corresponds to an admin
 * @param {string} displayName 
 * @param {string} realName 
 * @returns {boolean}
 */
export function isAdminUser(displayName = "", realName = "") {
  return /admin|แอดมิน/i.test(displayName) || /admin|แอดมิน/i.test(realName);
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

  // 2. Pure number
  const pureMatch = normalizedMsg.match(pureNumberRegex);
  if (pureMatch) {
    const itemId = parseInt(pureMatch[1], 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "pure-number" };
    }
  }

  // 3. Explicit buy keyword
  const explicitMatch = normalizedMsg.match(explicitBuyRegex);
  if (explicitMatch) {
    const itemIdStr = explicitMatch[1] || explicitMatch[2];
    const itemId = parseInt(itemIdStr, 10);
    if (itemId > 0 && itemId <= MAX_ITEM_ID) {
      return { type: "SINGLE_BUY", itemId, method: "explicit-keyword" };
    }
  }

  // 4. Cancel
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

  // 5. Shipping
  if (shippingRegex.test(normalizedMsg)) {
    return { type: "SHIPPING" };
  }

  // 6. Question
  if (questionRegex.test(normalizedMsg)) {
    return { type: "QUESTION" };
  }

  return { type: "UNKNOWN" };
}

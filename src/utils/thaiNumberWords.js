import { thaiToArabic } from "./chatParserUtils";

const THAI_DIGITS = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

// Module-scoped compiled regexes for performance
const LAUGHTER_REGEX = /5{3,}\+*/g;
const SLASH_NUM_REGEX = /(\d+)\s*\/\s*(\d+)/g;
const CF_PREFIX_REGEX = /(?:^|(?<=\s))(?:cf|CF)\s*(?=\d)/gi;
const PHONE_AND_NUM_REGEX = /(0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4})|(?<![:\d])(\d+)(?![:\d])/g;

/**
 * Convert a non-negative integer into standard Thai cardinal words.
 *
 * Examples:
 * 15 -> 'สิบห้า'
 * 11 -> 'สิบเอ็ด'
 * 12 -> 'สิบสอง'
 * 25 -> 'ยี่สิบห้า'
 * 105 -> 'หนึ่งร้อยห้า'
 * 120 -> 'หนึ่งร้อยยี่สิบ'
 *
 * @param {number|string} num
 * @returns {string}
 */
export function numberToThaiWords(num) {
  const n = parseInt(num, 10);
  if (isNaN(n) || n === 0) return "ศูนย์";
  if (n < 0) return "ลบ" + numberToThaiWords(Math.abs(n));

  const str = String(n);
  const len = str.length;
  let result = "";

  for (let i = 0; i < len; i++) {
    const digit = parseInt(str[i], 10);
    const pos = len - 1 - i;

    if (digit === 0) continue;

    if (pos === 1) {
      // Tens position: 10 -> 'สิบ', 20 -> 'ยี่สิบ', 30 -> 'สามสิบ'
      if (digit === 1) {
        result += "สิบ";
      } else if (digit === 2) {
        result += "ยี่สิบ";
      } else {
        result += THAI_DIGITS[digit] + "สิบ";
      }
    } else if (pos === 0) {
      // Units position: 1 -> 'เอ็ด' when preceded by non-zero higher place value
      if (digit === 1 && len > 1 && parseInt(str.slice(0, -1), 10) > 0) {
        result += "เอ็ด";
      } else {
        result += THAI_DIGITS[digit];
      }
    } else {
      result += THAI_DIGITS[digit] + (THAI_POSITIONS[pos] || "");
    }
  }

  return result;
}

/**
 * Replace Arabic & Thai digits inside chat text with spoken Thai words for natural TTS pronunciation.
 * Specifically converts booking item numbers (e.g. 15 -> สิบห้า, cf 15 -> ซีเอฟ สิบห้า)
 * while safely preserving phone numbers (e.g. 0812345678, 091-234-5678), codes with leading zeros (01, 02),
 * and time expressions (13:11).
 *
 * Examples:
 * "15" -> "สิบห้า"
 * "15ค่ะ" -> "สิบห้าค่ะ"
 * "จอง 15" -> "จอง สิบห้า"
 * "cf 15" -> "ซีเอฟ สิบห้า"
 * "CF15" -> "ซีเอฟ สิบห้า"
 * "12 15" -> "สิบสอง สิบห้า"
 * "15/1" -> "สิบห้า ทับ หนึ่ง"
 * "39 เมื่อวาน" -> "สามสิบเก้า เมื่อวาน"
 * "091-234-5678" -> "091-234-5678"
 *
 * @param {string} text
 * @returns {string}
 */
export function replaceNumbersWithThaiWords(text) {
  if (!text) return "";

  // 1. Normalize Thai digits (๑, ๒, ...) to Arabic digits (1, 2, ...)
  let result = thaiToArabic(String(text));

  // 2. Handle Thai chat laughter 555+ -> ฮ่าๆๆ
  result = result.replace(LAUGHTER_REGEX, "ฮ่าๆๆ");

  // 3. Handle slash numbers: "15/1" -> "15 ทับ 1"
  result = result.replace(SLASH_NUM_REGEX, (m, a, b) => `${a} ทับ ${b}`);

  // 4. Handle CF prefix before numbers: "cf 15" / "CF15" -> "ซีเอฟ 15"
  result = result.replace(CF_PREFIX_REGEX, "ซีเอฟ ");

  // 5. Replace standalone numbers with Thai words while preserving phone numbers & time
  result = result.replace(PHONE_AND_NUM_REGEX, (match, phone, digits) => {
    // If phone number pattern matched, preserve as-is
    if (phone) return phone;
    if (!digits) return match;

    // Preserve codes with leading zero (e.g. "01", "02")
    if (digits.length > 1 && digits.startsWith("0")) {
      return match;
    }

    // Preserve large digit sequences (> 6 digits, e.g. bank accounts, tracking IDs)
    if (digits.length > 6) {
      return match;
    }

    const num = parseInt(digits, 10);
    if (isNaN(num)) return match;

    return numberToThaiWords(num);
  });

  return result;
}

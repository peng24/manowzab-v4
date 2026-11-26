/**
 * Helpers for formatting and searching garment size / spec strings
 * synced to Firebase RTDB at `stock/{videoId}/{item}/details` (e.g. "อก 52-54 ยาว 32 ไซส์ 2XL").
 */

const BUST_REGEX = /อก\s*(\d{2}(?:\.\d+)?(?:\s*(?:-|\/|ถึง)\s*\d{2}(?:\.\d+)?)?)/i;
const TAG_SIZE_REGEX = /(?:ไซส์|size)\s*([0-9]*x{1,3}l|[sml]|free\s*size|ฟรีไซส์)/i;
const BARE_TAG_SIZE_REGEX = /(ฟรีไซส์|\b(?:[2-5]xl|xxl|xl|[sml]|free\s*size)\b)/i;
const LENGTH_REGEX = /ยาว\s*(\d{2}(?:\.\d+)?)/i;
const PURE_NUM_QUERY_REGEX = /^#?\d+$/;

/**
 * Returns full trimmed details/size string for tooltips and modal editors.
 * @param {Object|string|null|undefined} itemOrDetails
 * @returns {string}
 */
export function formatFullStockDetails(itemOrDetails) {
  if (!itemOrDetails) return "";
  if (typeof itemOrDetails === "string") {
    return itemOrDetails.trim();
  }
  const raw = itemOrDetails.details || itemOrDetails.size || "";
  return typeof raw === "string" ? raw.trim() : String(raw).trim();
}

/**
 * Extracts a compact, clutter-free size label for stock cards (Style 1: Smart Compact).
 * Priority: bust ("อก52" / "อก52-54") > tag size ("2XL" / "XL") > length ("ยาว29") > short fallback.
 * @param {Object|string|null|undefined} itemOrDetails
 * @returns {string}
 */
export function formatCompactStockSize(itemOrDetails) {
  const full = formatFullStockDetails(itemOrDetails);
  if (!full) return "";

  const bustMatch = full.match(BUST_REGEX);
  if (bustMatch) {
    const cleanNum = bustMatch[1].replace(/\s*(?:\/|ถึง)\s*/g, "-").replace(/\s+/g, "");
    return `อก${cleanNum}`;
  }

  const tagMatch = full.match(TAG_SIZE_REGEX) || full.match(BARE_TAG_SIZE_REGEX);
  if (tagMatch) {
    const rawTag = tagMatch[1].replace(/\s+/g, "");
    return rawTag === "ฟรีไซส์" ? "ฟรีไซส์" : rawTag.toUpperCase();
  }

  const lenMatch = full.match(LENGTH_REGEX);
  if (lenMatch) {
    return `ยาว${lenMatch[1]}`;
  }

  return full.length <= 10 ? full : `${full.slice(0, 9)}…`;
}

/**
 * Checks whether a search query matches an item's garment details/size.
 * Ignores pure-number queries (e.g. "12", "#12") so item-number searches stay exact.
 * @param {Object|string|null|undefined} itemOrDetails
 * @param {string} rawQuery
 * @returns {boolean}
 */
export function matchesStockDetailsQuery(itemOrDetails, rawQuery) {
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  if (!query || PURE_NUM_QUERY_REGEX.test(query)) return false;

  const full = formatFullStockDetails(itemOrDetails);
  if (!full) return false;

  const normFull = full.toLowerCase().replace(/\s+/g, "");
  const normQuery = query.toLowerCase().replace(/\s+/g, "");
  return normFull.includes(normQuery);
}

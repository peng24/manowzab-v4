/**
 * Shared Thai Buddhist Era (พ.ศ.) & local-calendar date utilities.
 * Prevents:
 * - 2-digit Thai BE years ("26/11/69") being misparsed as 1969 instead of 2026
 * - Day-31 rollover bugs when setDate(31) is called before setMonth() on 30-day months
 * - UTC midnight off-by-one shifts from `new Date("YYYY-MM-DD")`
 * - Malformed partial dates producing NaN in calendars or countdown badges
 */

const THAI_MONTHS_SHORT = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/**
 * Parse "YYYY-MM-DD" into a local midnight Date, or null if invalid.
 */
export function parseISODateLocal(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Parse Thai DD/MM/YYYY or DD/MM/YY (BE or CE) into validated "YYYY-MM-DD" (CE), or null.
 * - 2-digit year >= 40 is interpreted as Thai Buddhist Era (e.g. 69 -> 2569 -> 2026).
 * - 2-digit year < 40 is interpreted as Christian Era (e.g. 26 -> 2026).
 * - 4-digit year > 2400 is converted from BE to CE (-543).
 */
export function parseDDMMYYYYToISO(str) {
  if (!str || typeof str !== "string") return null;
  const parts = str.trim().split("/");
  if (parts.length !== 3) return null;

  const [dRaw, mRaw, yRaw] = parts.map((p) => p.trim());
  if (!/^\d{1,2}$/.test(dRaw) || !/^\d{1,2}$/.test(mRaw) || !/^(?:\d{2}|\d{4})$/.test(yRaw)) {
    return null;
  }

  const day = Number(dRaw);
  const month = Number(mRaw);
  let year = Number(yRaw);

  if (yRaw.length === 2) {
    year = year >= 40 ? 2500 + year - 543 : 2000 + year;
  } else if (year > 2400) {
    year -= 543;
  }

  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Format "YYYY-MM-DD" as Thai Buddhist Era "DD/MM/YYYY" (e.g. "26/11/2569").
 */
export function formatISOToDDMMYYYYBE(dateStr) {
  const d = parseISODateLocal(dateStr);
  if (!d) return dateStr || "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const beYear = d.getFullYear() + 543;
  return `${dd}/${mm}/${beYear}`;
}

/**
 * Resolve a spoken/typed day (+ optional Thai month string) relative to `now` without month-rollover bugs.
 * Returns a valid local Date or null if day is out of bounds.
 */
export function resolveDayMonthShippingDate(dayNum, monthStr = "", now = new Date()) {
  const day = Number(dayNum);
  if (!Number.isInteger(day) || day < 1 || day > 31) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let year = today.getFullYear();
  let month = today.getMonth();
  let explicitMonth = false;

  if (monthStr && typeof monthStr === "string") {
    const cleanMonth = monthStr.replace(/\./g, "").trim();
    let mIndex = THAI_MONTHS_SHORT.indexOf(cleanMonth);
    if (mIndex === -1) mIndex = THAI_MONTHS_FULL.indexOf(cleanMonth);
    if (mIndex !== -1) {
      month = mIndex;
      explicitMonth = true;
    }
  }

  // Clamp day to target month's max days when month has fewer days (e.g. Feb 30 -> Feb 28/29)
  const buildClampedDate = (y, m, d) => {
    const maxDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, maxDay));
  };

  let target = buildClampedDate(year, month, day);

  if (explicitMonth) {
    // Explicit month in the past (e.g. "ส่ง 5 ม.ค." typed in Nov/Dec) rolls to next year.
    if (target < today) {
      target = buildClampedDate(year + 1, month, day);
    }
  } else if (target < today && today.getDate() - day > 15) {
    // Day without month far behind today rolls to next month (e.g. "ส่ง 2" typed on 28th).
    const nextMonthDate = new Date(year, month + 1, 1);
    target = buildClampedDate(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), day);
  }

  return target;
}

/**
 * Compute whole-day difference (target - today) in local time, or null if invalid.
 */
export function getLocalDiffDays(dateStr, now = new Date()) {
  const target = parseISODateLocal(dateStr);
  if (!target) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

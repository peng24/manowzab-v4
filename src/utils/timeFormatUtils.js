/**
 * timeFormatUtils.js
 * 
 * ยูทิลิตี้สำหรับจัดรูปแบบเวลาการจองและเวลาจองย้อนหลัง (Backdated Booking)
 * รองรับทั้งการแสดงผลแบบย่อบนการ์ดสต็อก (StockItemCard)
 * และการแสดงผลแบบละเอียดในหน้าต่างจัดการคิว / Modal (StockGrid, HistoryModal)
 */

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

/**
 * แปลง timestamp เป็น Date object อย่างปลอดภัย
 * @param {number|string|Date} ts 
 * @returns {Date|null}
 */
export function parseDate(ts) {
  if (!ts) return null;
  const d = ts instanceof Date ? ts : (typeof ts === 'number' ? new Date(ts) : new Date(Number(ts) || ts));
  return isNaN(d.getTime()) ? null : d;
}

/**
 * ตรวจสอบความสัมพันธ์ของวัน (วันนี้ / เมื่อวาน / วันอื่น) เทียบกับ refDate
 * @param {Date} targetDate 
 * @param {Date} [refDate=new Date()]
 * @returns {'today'|'yesterday'|'other'}
 */
export function getDayRelation(targetDate, refDate = new Date()) {
  if (!targetDate) return 'other';
  
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  if (targetYear === refYear && targetMonth === refMonth && targetDay === refDay) {
    return 'today';
  }

  // คำนวณเมื่อวาน
  const yesterday = new Date(refYear, refMonth, refDay - 1);
  if (targetYear === yesterday.getFullYear() && targetMonth === yesterday.getMonth() && targetDay === yesterday.getDate()) {
    return 'yesterday';
  }

  return 'other';
}

/**
 * คืนค่าเวลาในรูปแบบ HH:mm (เช่น "13:11")
 * @param {Date} date 
 * @returns {string}
 */
export function formatHHMM(date) {
  if (!date) return '';
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * คืนค่าวันที่ย่อ เช่น "21 ต.ค."
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateShort(date) {
  if (!date) return '';
  const day = date.getDate();
  const month = THAI_MONTHS_SHORT[date.getMonth()];
  return `${day} ${month}`;
}

/**
 * 🌟 สำหรับการ์ดสต็อกขนาดกะทัดรัด (StockItemCard / HistoryModal Card)
 * - วันนี้: "ย้อนหลัง 13:11"
 * - เมื่อวาน: "เมื่อวาน 13:11"
 * - วันอื่น: "21 ต.ค. 13:11"
 * - ไม่มีเวลา: "ย้อนหลัง"
 * 
 * @param {number|string|Date} ts 
 * @param {Date} [refDate=new Date()]
 * @returns {string}
 */
export function formatBackdatedCard(ts, refDate = new Date()) {
  const d = parseDate(ts);
  if (!d) return 'ย้อนหลัง';

  const relation = getDayRelation(d, refDate);
  const timeStr = formatHHMM(d);

  if (relation === 'today') {
    return `ย้อนหลัง ${timeStr}`;
  } else if (relation === 'yesterday') {
    return `เมื่อวาน ${timeStr}`;
  } else {
    return `${formatDateShort(d)} ${timeStr}`;
  }
}

/**
 * 🌟 สำหรับหน้าต่างจัดการคิว / Modal (StockGrid / HistoryModal Queue Item)
 * คืนค่าเฉพาะส่วนวันและเวลาสำหรับแสดงคู่กับ Badge "ย้อนหลัง":
 * - วันนี้: "วันนี้ 13:11"
 * - เมื่อวาน: "เมื่อวาน 13:11"
 * - วันอื่น: "21 ต.ค. 13:11"
 * 
 * @param {number|string|Date} ts 
 * @param {Date} [refDate=new Date()]
 * @returns {string}
 */
export function formatBackdatedDetail(ts, refDate = new Date()) {
  const d = parseDate(ts);
  if (!d) return '';

  const relation = getDayRelation(d, refDate);
  const timeStr = formatHHMM(d);

  if (relation === 'today') {
    return `วันนี้ ${timeStr}`;
  } else if (relation === 'yesterday') {
    return `เมื่อวาน ${timeStr}`;
  } else {
    return `${formatDateShort(d)} ${timeStr}`;
  }
}

/**
 * สำหรับการจองปกติในรอบไลฟ์ปัจจุบัน (Normal Booking) ในหน้า Modal:
 * - วันนี้: "13:11"
 * - เมื่อวาน: "เมื่อวาน 13:11"
 * - วันอื่น: "21 ต.ค. 13:11"
 * 
 * @param {number|string|Date} ts 
 * @param {Date} [refDate=new Date()]
 * @returns {string}
 */
export function formatNormalBookingTime(ts, refDate = new Date()) {
  const d = parseDate(ts);
  if (!d) return '';

  const relation = getDayRelation(d, refDate);
  const timeStr = formatHHMM(d);

  if (relation === 'today') {
    return timeStr;
  } else if (relation === 'yesterday') {
    return `เมื่อวาน ${timeStr}`;
  } else {
    return `${formatDateShort(d)} ${timeStr}`;
  }
}

/**
 * สร้างข้อความ Tooltip (title attribute) ให้สุภาพและชัดเจน
 * @param {number|string|Date} ts 
 * @param {boolean} isBackdated 
 * @param {Date} [refDate=new Date()]
 * @returns {string}
 */
export function getBookingTooltip(ts, isBackdated, refDate = new Date()) {
  const d = parseDate(ts);
  if (!d) return isBackdated ? 'จองย้อนหลัง' : '';

  const relation = getDayRelation(d, refDate);
  const timeStr = formatHHMM(d);

  if (isBackdated) {
    if (relation === 'today') {
      return `จองย้อนหลัง: วันนี้ เวลา ${timeStr} น.`;
    } else if (relation === 'yesterday') {
      return `จองย้อนหลัง: เมื่อวาน เวลา ${timeStr} น.`;
    } else {
      return `จองย้อนหลัง: วันที่ ${formatDateShort(d)} เวลา ${timeStr} น.`;
    }
  } else {
    if (relation === 'today') {
      return `จองเมื่อเวลา ${timeStr} น.`;
    } else if (relation === 'yesterday') {
      return `จองเมื่อวาน เวลา ${timeStr} น.`;
    } else {
      return `จองเมื่อวันที่ ${formatDateShort(d)} เวลา ${timeStr} น.`;
    }
  }
}

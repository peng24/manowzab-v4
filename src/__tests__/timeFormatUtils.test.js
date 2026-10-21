import { describe, it, expect } from 'vitest';
import {
  parseDate,
  getDayRelation,
  formatHHMM,
  formatDateShort,
  formatBackdatedCard,
  formatBackdatedDetail,
  formatNormalBookingTime,
  getBookingTooltip
} from '../utils/timeFormatUtils.js';

describe('🕒 timeFormatUtils - Date and Time Formatting Suite', () => {
  // วันอ้างอิง: 21 ตุลาคม 2026 เวลา 13:15:00
  const refDate = new Date(2026, 9, 21, 13, 15, 0); // Month is 0-indexed: 9 = October

  describe('parseDate', () => {
    it('handles numeric timestamps', () => {
      const ts = refDate.getTime();
      const d = parseDate(ts);
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(ts);
    });

    it('handles Date instances', () => {
      const d = parseDate(refDate);
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(refDate.getTime());
    });

    it('handles numeric string timestamps', () => {
      const tsStr = String(refDate.getTime());
      const d = parseDate(tsStr);
      expect(d).toBeInstanceOf(Date);
      expect(d.getTime()).toBe(refDate.getTime());
    });

    it('returns null for falsy or invalid values', () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate(0)).toBeNull();
      expect(parseDate('invalid-date')).toBeNull();
    });
  });

  describe('getDayRelation', () => {
    it('identifies today correctly', () => {
      const todayEarlier = new Date(2026, 9, 21, 10, 30, 0);
      expect(getDayRelation(todayEarlier, refDate)).toBe('today');
    });

    it('identifies yesterday correctly across midnight', () => {
      const yesterday = new Date(2026, 9, 20, 23, 59, 0);
      expect(getDayRelation(yesterday, refDate)).toBe('yesterday');
    });

    it('identifies older dates as other', () => {
      const pastDay = new Date(2026, 9, 19, 14, 0, 0);
      expect(getDayRelation(pastDay, refDate)).toBe('other');
    });

    it('identifies future dates as other', () => {
      const futureDay = new Date(2026, 9, 22, 10, 0, 0);
      expect(getDayRelation(futureDay, refDate)).toBe('other');
    });
  });

  describe('formatHHMM & formatDateShort', () => {
    it('formats HH:mm with leading zeros', () => {
      const d = new Date(2026, 9, 21, 8, 5, 0);
      expect(formatHHMM(d)).toBe('08:05');
    });

    it('formats date short in Thai', () => {
      const d = new Date(2026, 9, 21, 13, 11, 0);
      expect(formatDateShort(d)).toBe('21 ต.ค.');
    });
  });

  describe('formatBackdatedCard (Compact Card View)', () => {
    it('returns "ย้อนหลัง HH:mm" for today', () => {
      const todayBooking = new Date(2026, 9, 21, 13, 11, 50);
      expect(formatBackdatedCard(todayBooking, refDate)).toBe('ย้อนหลัง 13:11');
    });

    it('returns "เมื่อวาน HH:mm" for yesterday', () => {
      const yesterdayBooking = new Date(2026, 9, 20, 18, 45, 0);
      expect(formatBackdatedCard(yesterdayBooking, refDate)).toBe('เมื่อวาน 18:45');
    });

    it('returns "D MMM HH:mm" for older dates', () => {
      const olderBooking = new Date(2026, 9, 15, 9, 20, 0);
      expect(formatBackdatedCard(olderBooking, refDate)).toBe('15 ต.ค. 09:20');
    });

    it('returns fallback "ย้อนหลัง" when timestamp is missing', () => {
      expect(formatBackdatedCard(null, refDate)).toBe('ย้อนหลัง');
      expect(formatBackdatedCard(undefined, refDate)).toBe('ย้อนหลัง');
    });
  });

  describe('formatBackdatedDetail (Modal / Detail Queue Row)', () => {
    it('returns "วันนี้ HH:mm" for today', () => {
      const todayBooking = new Date(2026, 9, 21, 13, 11, 0);
      expect(formatBackdatedDetail(todayBooking, refDate)).toBe('วันนี้ 13:11');
    });

    it('returns "เมื่อวาน HH:mm" for yesterday', () => {
      const yesterdayBooking = new Date(2026, 9, 20, 13, 11, 0);
      expect(formatBackdatedDetail(yesterdayBooking, refDate)).toBe('เมื่อวาน 13:11');
    });

    it('returns "D MMM HH:mm" for older dates', () => {
      const olderBooking = new Date(2026, 9, 18, 14, 30, 0);
      expect(formatBackdatedDetail(olderBooking, refDate)).toBe('18 ต.ค. 14:30');
    });

    it('returns empty string when timestamp is missing', () => {
      expect(formatBackdatedDetail(null, refDate)).toBe('');
    });
  });

  describe('formatNormalBookingTime (In-Live Normal Booking in Modal)', () => {
    it('returns clean "HH:mm" without date clutter for today', () => {
      const todayLiveBooking = new Date(2026, 9, 21, 13, 11, 0);
      expect(formatNormalBookingTime(todayLiveBooking, refDate)).toBe('13:11');
    });

    it('returns "เมื่อวาน HH:mm" for yesterday', () => {
      const yesterdayLiveBooking = new Date(2026, 9, 20, 20, 0, 0);
      expect(formatNormalBookingTime(yesterdayLiveBooking, refDate)).toBe('เมื่อวาน 20:00');
    });

    it('returns "D MMM HH:mm" for older dates', () => {
      const pastBooking = new Date(2026, 9, 10, 11, 0, 0);
      expect(formatNormalBookingTime(pastBooking, refDate)).toBe('10 ต.ค. 11:00');
    });
  });

  describe('getBookingTooltip (Hover title attribute)', () => {
    it('creates polite Thai tooltip for backdated booking today', () => {
      const d = new Date(2026, 9, 21, 13, 11, 0);
      expect(getBookingTooltip(d, true, refDate)).toBe('จองย้อนหลัง: วันนี้ เวลา 13:11 น.');
    });

    it('creates polite Thai tooltip for backdated booking yesterday', () => {
      const d = new Date(2026, 9, 20, 13, 11, 0);
      expect(getBookingTooltip(d, true, refDate)).toBe('จองย้อนหลัง: เมื่อวาน เวลา 13:11 น.');
    });

    it('creates polite Thai tooltip for backdated booking on older date', () => {
      const d = new Date(2026, 9, 15, 13, 11, 0);
      expect(getBookingTooltip(d, true, refDate)).toBe('จองย้อนหลัง: วันที่ 15 ต.ค. เวลา 13:11 น.');
    });

    it('creates tooltip for regular today booking', () => {
      const d = new Date(2026, 9, 21, 13, 11, 0);
      expect(getBookingTooltip(d, false, refDate)).toBe('จองเมื่อเวลา 13:11 น.');
    });

    it('handles falsy timestamp gracefully', () => {
      expect(getBookingTooltip(null, true, refDate)).toBe('จองย้อนหลัง');
      expect(getBookingTooltip(null, false, refDate)).toBe('');
    });
  });
});

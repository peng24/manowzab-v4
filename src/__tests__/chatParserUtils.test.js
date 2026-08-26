import { describe, it, expect } from "vitest";
import {
  thaiToArabic,
  stringToColor,
  isAdminUser,
  parseIntentDetails,
  isDateMismatch,
  adminProxyNameFirstRegex,
  shippingRegex,
  holdRegex,
  numberWithQuestionRegex,
  negationGuardRegex,
  tryRegex,
  cancelKeywordRegex,
  standalonePassRegex,
  explicitBuyRegex,
  shipDayOfWeekRegex,
  calcNextDayOfWeekDate,
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
  formatShippingCycleLabel,
} from "../utils/chatParserUtils";

describe("chatParserUtils", () => {
  describe("thaiToArabic()", () => {
    it("converts Thai numerals to Arabic digits correctly", () => {
      expect(thaiToArabic("จอง ๕๖")).toBe("จอง 56");
      expect(thaiToArabic("๑ ๒ ๓")).toBe("1 2 3");
      expect(thaiToArabic("CF ๑๐๐")).toBe("CF 100");
      expect(thaiToArabic("hello world 123")).toBe("hello world 123");
    });

    it("handles empty or null string gracefully", () => {
      expect(thaiToArabic("")).toBe("");
      expect(thaiToArabic(null)).toBe("");
    });
  });

  describe("stringToColor()", () => {
    it("returns consistent HSL color string for same input", () => {
      const col1 = stringToColor("คุณมะนาว");
      const col2 = stringToColor("คุณมะนาว");
      expect(col1).toBe(col2);
      expect(col1).toMatch(/^hsl\(\d+, 85%, 75%\)$/);
    });
  });

  describe("isAdminUser()", () => {
    it("identifies admin users correctly", () => {
      expect(isAdminUser("Admin1", "Normal User")).toBe(true);
      expect(isAdminUser("User", "แอดมินบอย")).toBe(true);
      expect(isAdminUser("CustomerA", "CustomerA")).toBe(false);
    });
  });

  describe("parseIntentDetails() — CSV Log Real Comments", () => {
    it("parses pure numbers as single item buy", () => {
      expect(parseIntentDetails("25")).toEqual({ type: "SINGLE_BUY", itemId: 25, method: "pure-number" });
      expect(parseIntentDetails("๔๒")).toEqual({ type: "SINGLE_BUY", itemId: 42, method: "pure-number" });
    });

    it("parses leading and trailing symbols from CSV (,9, 25/)", () => {
      expect(parseIntentDetails(",9").type).toBe("SINGLE_BUY");
      expect(parseIntentDetails("25/").type).toBe("SINGLE_BUY");
    });

    it("parses explicit try requests from CSV (ลอง10, 24ลอง, ลอง34ให้แม่ดูหน่อยจ้า, ไส่29ให้ดูหน่อยนาว)", () => {
      expect(parseIntentDetails("ลอง10")).toEqual({ type: "TRY_ITEM", itemId: 10, method: "try-keyword" });
      expect(parseIntentDetails("24ลอง")).toEqual({ type: "TRY_ITEM", itemId: 24, method: "try-keyword" });
      expect(parseIntentDetails("ลอง34ให้แม่ดูหน่อยจ้า")).toEqual({ type: "TRY_ITEM", itemId: 34, method: "try-keyword" });
      expect(parseIntentDetails("ขอดูหน่อยค่ะ9")).toEqual({ type: "TRY_ITEM", itemId: 9, method: "try-keyword" });
      expect(parseIntentDetails("ไส่29ให้ดูหน่อยนาว")).toEqual({ type: "TRY_ITEM", itemId: 29, method: "try-keyword" });
      expect(parseIntentDetails("มะระ ขอดูตัว13สีแดงเมื่อวานหน่อย")).toEqual({ type: "TRY_ITEM", itemId: 13, method: "try-keyword" });
    });

    it("does not treat 'ไม่ต้องลอง' as a try request", () => {
      const res = parseIntentDetails("ไม่ต้องลองก็ได้");
      expect(res.type).not.toBe("TRY_ITEM");
    });

    it("parses explicit buy keyword statements from CSV (รับ10, รับค่ะ9, 30รับค่ะ)", () => {
      expect(parseIntentDetails("รับ10")).toEqual({ type: "SINGLE_BUY", itemId: 10, method: "explicit-keyword" });
      expect(parseIntentDetails("รับค่ะ9")).toEqual({ type: "SINGLE_BUY", itemId: 9, method: "explicit-keyword" });
      expect(parseIntentDetails("30รับค่ะ")).toEqual({ type: "SINGLE_BUY", itemId: 30, method: "explicit-keyword" });
    });

    it("parses multi-buy statements", () => {
      const liveAug3 = new Date("2026-08-03T20:00:00").getTime();
      const res = parseIntentDetails("จอง 1 3 5", liveAug3);
      expect(res.type).toBe("MULTI_BUY");
      expect(res.itemIds).toEqual([1, 3, 5]);

      const resSameDate = parseIntentDetails("มะระ เอา 19 13 10 วันที่ 3 ส.ค. 69", liveAug3);
      expect(resSameDate.type).toBe("MULTI_BUY");
      expect(resSameDate.itemIds).toEqual([19, 13, 10]);

      const resDiffDate = parseIntentDetails("มะระ เอา 19 13 10 วันที่ 1 ส.ค. 69", liveAug3);
      expect(resDiffDate.type).toBe("DATE_MISMATCH");
    });

    it("identifies date mismatches correctly with isDateMismatch()", () => {
      const liveAug3 = new Date("2026-08-03T20:00:00").getTime();
      expect(isDateMismatch("มะระ เอา 19 13 10 วันที่ 1 ส.ค. 69", liveAug3)).toBe(true);
      expect(isDateMismatch("มะระ เอา 19 13 10 วันที่ 3 ส.ค. 69", liveAug3)).toBe(false);
      expect(isDateMismatch("มะระ เอา 19 13 10", liveAug3)).toBe(false);
      expect(isDateMismatch("26 38 74 วันที่ 5/8/69", liveAug3)).toBe(true);
      expect(isDateMismatch("26 38 74 วันที่ 3/8/69", liveAug3)).toBe(false);
    });

    it("parses cancel requests from CSV", () => {
      expect(parseIntentDetails("ยกเลิก 5")).toEqual({ type: "CANCEL_ITEM", itemId: 5 });
      expect(parseIntentDetails("ขอผ่านค่ะ")).toEqual({ type: "CANCEL_LATEST", method: "auto-pass-latest" });
      expect(parseIntentDetails("cc")).toEqual({ type: "CANCEL_LATEST", method: "auto-cancel-latest" });
      expect(parseIntentDetails("ยกให้พี่เค้า")).toEqual({ type: "CANCEL_LATEST", method: "auto-cancel-latest" });
    });

    it("parses shipping and hold requests from CSV (ส่งเลย, ของพี่อ้อยส่งเลยค่ะ, ฝากไว้ก่อนนะคับ)", () => {
      expect(parseIntentDetails("แจ้งโอนเรียบร้อยค่ะ").type).toBe("SHIPPING");
      expect(parseIntentDetails("กนกวรรณ ส่งเลย").type).toBe("SHIPPING");
      expect(parseIntentDetails("ของพี่อ้อยส่งเลยค่ะ").type).toBe("SHIPPING");
      expect(parseIntentDetails("ฝากไว้ก่อนนะคับ").type).toBe("SHIPPING");
    });

    it("matches hold keywords using holdRegex (ฝากไว้ก่อน, ฝากไว้, ฝาก, ฝากของ, ยังไม่ส่ง)", () => {
      expect(holdRegex.test("ฝากไว้ก่อนนะคับ")).toBe(true);
      expect(holdRegex.test("ฝากไว้ค่ะ")).toBe(true);
      expect(holdRegex.test("ฝากค่ะ")).toBe(true);
      expect(holdRegex.test("ฝากของค่ะ")).toBe(true);
      expect(holdRegex.test("ยังไม่ส่งนะคะ")).toBe(true);
      expect(holdRegex.test("ส่งเลย")).toBe(false);
    });

    it("parses product questions", () => {
      expect(parseIntentDetails("อกเท่าไหร่คะ").type).toBe("QUESTION");
      expect(parseIntentDetails("มีไซส์ L ไหม").type).toBe("QUESTION");
    });
  });

  describe("Admin Proxy Regex Tests from CSV", () => {
    it("matches admin proxy name-first without spaces (พี่อ้อย20)", () => {
      const match = "พี่อ้อย20".match(adminProxyNameFirstRegex);
      expect(match).not.toBeNull();
      expect(match[1]).toBe("พี่อ้อย");
      expect(match[2]).toBe("20");
    });
  });

  // ==========================================
  // 🆕 v4.66.0 Regex Improvements from CSV Log Analysis
  // ==========================================

  describe("🛡️ numberWithQuestionRegex Guard (v4.66.0)", () => {
    it("catches number+question patterns that should NOT be booked", () => {
      expect(numberWithQuestionRegex.test("32อกเท่าไร")).toBe(true);
      expect(numberWithQuestionRegex.test("48ราคา")).toBe(true);
      expect(numberWithQuestionRegex.test("29 อกเท่าไหร่คะ")).toBe(true);
      expect(numberWithQuestionRegex.test("40 อกเท่าไรน้องนาว")).toBe(true);
      expect(numberWithQuestionRegex.test("21อยู่มั๊ยนาว")).toBe(true);
      expect(numberWithQuestionRegex.test("43เสื้ออะไรคะ")).toBe(true);
    });

    it("does NOT catch normal buy patterns", () => {
      expect(numberWithQuestionRegex.test("32")).toBe(false);
      expect(numberWithQuestionRegex.test("รับ32")).toBe(false);
      expect(numberWithQuestionRegex.test("32รับค่ะ")).toBe(false);
    });

    it("parseIntentDetails returns QUESTION for number+question messages", () => {
      expect(parseIntentDetails("32อกเท่าไร").type).toBe("QUESTION");
      expect(parseIntentDetails("48ราคา").type).toBe("QUESTION");
      expect(parseIntentDetails("21อยู่มั๊ยนาว").type).toBe("QUESTION");
      expect(parseIntentDetails("43เสื้ออะไรคะ").type).toBe("QUESTION");
    });
  });

  describe("🛡️ negationGuardRegex Guard (v4.66.0)", () => {
    it("catches negation+number patterns that should NOT be booked", () => {
      expect(negationGuardRegex.test("ไม่ใช่19")).toBe(true);
      expect(negationGuardRegex.test("ไม่ใช่ 5")).toBe(true);
    });

    it("does NOT match non-negation patterns", () => {
      expect(negationGuardRegex.test("ใช่19")).toBe(false);
      expect(negationGuardRegex.test("19")).toBe(false);
    });

    it("parseIntentDetails returns NEGATION for ไม่ใช่+number", () => {
      expect(parseIntentDetails("ไม่ใช่19").type).toBe("NEGATION");
    });
  });

  describe("🔄 tryRegex Improvements (v4.66.0)", () => {
    it("catches ลองโลด pattern from CSV", () => {
      expect(tryRegex.test("ลองโลด15")).toBe(true);
    });

    it("catches ลอง...ให้...ดู pattern from CSV", () => {
      expect(tryRegex.test("ลองให้พี่ดูหน่อย")).toBe(true);
    });

    it("parseIntentDetails recognizes ลองโลด as TRY", () => {
      expect(parseIntentDetails("ลองโลด15").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ลองโลด15").itemId).toBe(15);
    });

    it("still catches standard ลอง patterns", () => {
      expect(tryRegex.test("5ลอง")).toBe(true);
      expect(tryRegex.test("ลอง12")).toBe(true);
      expect(tryRegex.test("ขอดูชัดๆ33")).toBe(true);
    });
  });

  describe("❌ cancelKeywordRegex Improvements (v4.66.0)", () => {
    it("catches ยกเลิกก่อบ (typo of ก่อน) from CSV", () => {
      expect(cancelKeywordRegex.test("นาวยกเลิกก่อบ40")).toBe(true);
    });

    it("still catches standard cancel keywords", () => {
      expect(cancelKeywordRegex.test("ยกเลิกก่อน")).toBe(true);
      expect(cancelKeywordRegex.test("cc")).toBe(true);
      expect(cancelKeywordRegex.test("ผ่าน")).toBe(true);
    });
  });

  describe("🔄 standalonePassRegex + ผ่านโลด (v4.66.0)", () => {
    it("matches ผ่านโลด as standalone pass (no item number)", () => {
      expect(standalonePassRegex.test("ผ่านโลด")).toBe(true);
    });

    it("does NOT match ผ่านโลด37 as standalone pass (has item number)", () => {
      expect(standalonePassRegex.test("ผ่านโลด37")).toBe(false);
    });

    it("still matches standard standalone pass patterns", () => {
      expect(standalonePassRegex.test("ผ่าน")).toBe(true);
      expect(standalonePassRegex.test("ขอผ่าน")).toBe(true);
      expect(standalonePassRegex.test("ผ่านค่ะ")).toBe(true);
    });
  });

  describe("🛒 explicitBuyRegex Improvements (v4.66.0)", () => {
    it("catches โอเค+number pattern from CSV", () => {
      expect(explicitBuyRegex.test("โอเค41ค่ะ")).toBe(true);
    });

    it("catches ok+number pattern", () => {
      expect(explicitBuyRegex.test("ok41")).toBe(true);
    });

    it("catches ตกลง+number pattern", () => {
      expect(explicitBuyRegex.test("ตกลง41")).toBe(true);
    });

    it("parseIntentDetails recognizes โอเค41ค่ะ as BUY", () => {
      const res = parseIntentDetails("โอเค41ค่ะ");
      expect(res.type).toBe("SINGLE_BUY");
      expect(res.itemId).toBe(41);
    });
  });

  describe("📋 Full CSV Real-World Regression Tests (v4.66.0)", () => {
    it("correctly categorizes all critical real messages from 5 live streams", () => {
      // Should be BUY
      expect(parseIntentDetails("12").type).toBe("SINGLE_BUY");
      expect(parseIntentDetails("รับค่ะ5").type).toBe("SINGLE_BUY");
      expect(parseIntentDetails("48รับค่ะ").type).toBe("SINGLE_BUY");
      expect(parseIntentDetails("รับ 4").type).toBe("SINGLE_BUY");

      // Should be TRY (NOT buy)
      expect(parseIntentDetails("5ลอง").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ลอง12").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("30ลอง").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ลอง47").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ขอดู51").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ลองโลด15").type).toBe("TRY_ITEM");

      // Should be QUESTION (NOT buy) — critical false-positive prevention
      expect(parseIntentDetails("32อกเท่าไร").type).toBe("QUESTION");
      expect(parseIntentDetails("48ราคา").type).toBe("QUESTION");
      expect(parseIntentDetails("43เสื้ออะไรคะ").type).toBe("QUESTION");
      expect(parseIntentDetails("21อยู่มั๊ยนาว").type).toBe("QUESTION");

      // Should be NEGATION (NOT buy)
      expect(parseIntentDetails("ไม่ใช่19").type).toBe("NEGATION");

      // Should be CANCEL
      expect(parseIntentDetails("ยกเลิกก่อน").type).toBe("CANCEL_LATEST");
      expect(parseIntentDetails("ผ่านโลด").type).toBe("CANCEL_LATEST");
      expect(parseIntentDetails("ยกเลย 12").type).toBe("CANCEL_ITEM");
      expect(parseIntentDetails("ยกเลย 12").itemId).toBe(12);
      expect(parseIntentDetails("ยกเลย").type).toBe("CANCEL_LATEST");
      expect(parseIntentDetails("ยกเลิกเลย 45").type).toBe("CANCEL_ITEM");
    });
  });

  describe("📅 shipDayOfWeekRegex & calcNextDayOfWeekDate", () => {
    it("matches shipping day of week keywords correctly", () => {
      expect(shipDayOfWeekRegex.test("ส่งวันอาทิตย์")).toBe(true);
      expect(shipDayOfWeekRegex.test("ส่งวันจันทร์ค่ะ")).toBe(true);
      expect(shipDayOfWeekRegex.test("ส่งวันพฤหัสบดี")).toBe(true);
      expect(shipDayOfWeekRegex.test("ส่ง อาทิตย์")).toBe(true);
    });

    it("calculates correct target date for coming day of week", () => {
      // Mock reference date: Thursday, Aug 6, 2026 (Day 4)
      const refDate = new Date(2026, 7, 6); // Note: month 7 is August (0-indexed)
      expect(refDate.getDay()).toBe(4); // Thursday

      // Sunday (Day 0) -> +3 days -> Aug 9
      const sunDate = calcNextDayOfWeekDate("อาทิตย์", refDate);
      expect(sunDate.getDate()).toBe(9);
      expect(sunDate.getDay()).toBe(0);

      // Monday (Day 1) -> +4 days -> Aug 10
      const monDate = calcNextDayOfWeekDate("จันทร์", refDate);
      expect(monDate.getDate()).toBe(10);
      expect(monDate.getDay()).toBe(1);

      // Thursday (Day 4) -> +0 days -> Aug 6 (today)
      const thuDate = calcNextDayOfWeekDate("พฤหัส", refDate);
      expect(thuDate.getDate()).toBe(6);
      expect(thuDate.getDay()).toBe(4);
    });
  });

  describe("🚚 Shipping Cycle (รอบจัดส่ง) Utilities", () => {
    // Reference Date: Wednesday, Aug 5, 2026 (Day 3)
    const refWed = new Date(2026, 7, 5); // Wed Aug 5, 2026

    it("resolves 'today', 'วันนี้', and empty cycle setting to reference date", () => {
      const d1 = resolveShippingCycleDate("today", refWed);
      expect(formatDateToYYYYMMDD(d1)).toBe("2026-08-05");

      const d2 = resolveShippingCycleDate("", refWed);
      expect(formatDateToYYYYMMDD(d2)).toBe("2026-08-05");

      const d3 = resolveShippingCycleDate("วันนี้", refWed);
      expect(formatDateToYYYYMMDD(d3)).toBe("2026-08-05");
    });

    it("resolves 'tomorrow' / 'พรุ่งนี้' correctly", () => {
      const d = resolveShippingCycleDate("tomorrow", refWed);
      expect(formatDateToYYYYMMDD(d)).toBe("2026-08-06");

      const dTh = resolveShippingCycleDate("พรุ่งนี้", refWed);
      expect(formatDateToYYYYMMDD(dTh)).toBe("2026-08-06");
    });

    it("resolves specific day of week (e.g. Thursday / พฤหัส) to next occurrence", () => {
      // From Wed Aug 5 -> Thursday is Aug 6
      const dThu = resolveShippingCycleDate("พฤหัส", refWed);
      expect(formatDateToYYYYMMDD(dThu)).toBe("2026-08-06");

      const dThuPrefix = resolveShippingCycleDate("วันพฤหัสบดี", refWed);
      expect(formatDateToYYYYMMDD(dThuPrefix)).toBe("2026-08-06");

      // From Wed Aug 5 -> Saturday is Aug 8
      const dSat = resolveShippingCycleDate("เสาร์", refWed);
      expect(formatDateToYYYYMMDD(dSat)).toBe("2026-08-08");

      // From Wed Aug 5 -> Tuesday is Aug 11 (+6 days)
      const dTue = resolveShippingCycleDate("อังคาร", refWed);
      expect(formatDateToYYYYMMDD(dTue)).toBe("2026-08-11");
    });

    it("resolves specific YYYY-MM-DD date directly", () => {
      const d = resolveShippingCycleDate("2026-09-15", refWed);
      expect(formatDateToYYYYMMDD(d)).toBe("2026-09-15");
    });

    it("formats shipping cycle label correctly in Thai", () => {
      expect(formatShippingCycleLabel("today", refWed)).toBe("ส่งวันนี้ (5 ส.ค.)");
      expect(formatShippingCycleLabel("tomorrow", refWed)).toBe("ส่งพรุ่งนี้ (6 ส.ค.)");
      expect(formatShippingCycleLabel("พฤหัส", refWed)).toBe("วันพฤหัสบดี (6 ส.ค.)");
      expect(formatShippingCycleLabel("เสาร์", refWed)).toBe("วันเสาร์ (8 ส.ค.)");
    });
  });

  describe("sanitizeDbKey()", () => {
    it("sanitizes invalid Firebase path characters like dots, slashes, hashes, brackets", () => {
      const { sanitizeDbKey } = require("../utils/dbUtils");
      expect(sanitizeDbKey("@Pang.g2556")).toBe("@Pang_g2556");
      expect(sanitizeDbKey("user/name#123")).toBe("user_name_123");
      expect(sanitizeDbKey("test[key]$val")).toBe("test_key__val");
      expect(sanitizeDbKey(null)).toBe("invalid_key");
    });
  });
});





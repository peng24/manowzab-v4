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
  multiBuyRegex,
  shipDayOfWeekRegex,
  calcNextDayOfWeekDate,
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
  formatShippingCycleLabel,
  extractAdminCustomerName,
  getCustomerColorTheme,
  adminStopwordsRegex,
  backdatedNoteRegex,
  adminSizeSelectionNoteRegex,
  sizeRangeRegex,
  quantityUnitRegex,
  pricePatternRegex,
  extractCustomerSelfName,
  isHandleOrNonThaiName,
  isAdminSizeSelectionNote,
  isMultiBuyBlocked,
  parseCancelIds,
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

  describe("getCustomerColorTheme()", () => {
    it("returns consistent theme index 0-11 for same customer name", () => {
      const idx1 = getCustomerColorTheme("กุญสิญา");
      const idx2 = getCustomerColorTheme("กุญสิญา");
      expect(idx1).toBe(idx2);
      expect(idx1).toBeGreaterThanOrEqual(0);
      expect(idx1).toBeLessThan(12);
    });

    it("ignores leading @ and whitespace differences", () => {
      expect(getCustomerColorTheme("@กุญสิญา")).toBe(getCustomerColorTheme("กุญสิญา"));
      expect(getCustomerColorTheme(" กุญสิญา ")).toBe(getCustomerColorTheme("กุญสิญา"));
    });

    it("assigns different themes for different customers", () => {
      const theme1 = getCustomerColorTheme("กุญสิญา");
      const theme2 = getCustomerColorTheme("วาศินา");
      const theme3 = getCustomerColorTheme("ตุ๊ก บำรุงรัตน์");
      expect(theme1).not.toBe(theme2);
      expect(theme2).not.toBe(theme3);
    });

    it("handles empty or invalid values safely", () => {
      expect(getCustomerColorTheme("")).toBe(0);
      expect(getCustomerColorTheme(null)).toBe(0);
      expect(getCustomerColorTheme(undefined)).toBe(0);
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

  describe("🛒 explicitBuyRegex v4.67.0 — เค/เค่ะ keyword", () => {
    it("catches เคค่ะ 14 (เค confirmation before number)", () => {
      expect(explicitBuyRegex.test("เคค่ะ 14")).toBe(true);
    });

    it("catches เค14 (เค directly before number)", () => {
      expect(explicitBuyRegex.test("เค14")).toBe(true);
    });

    it("catches เค 14 (เค with space before number)", () => {
      expect(explicitBuyRegex.test("เค 14")).toBe(true);
    });

    it("parseIntentDetails recognizes เคค่ะ 14 as SINGLE_BUY", () => {
      const res = parseIntentDetails("เคค่ะ 14");
      expect(res.type).toBe("SINGLE_BUY");
      expect(res.itemId).toBe(14);
    });

    it("parseIntentDetails recognizes เค14 as SINGLE_BUY", () => {
      const res = parseIntentDetails("เค14");
      expect(res.type).toBe("SINGLE_BUY");
      expect(res.itemId).toBe(14);
    });

    it("still matches existing buy keywords (regression: โอเค, ok, ตกลง, รับ)", () => {
      expect(explicitBuyRegex.test("โอเค41ค่ะ")).toBe(true);
      expect(explicitBuyRegex.test("ok41")).toBe(true);
      expect(explicitBuyRegex.test("ตกลง41")).toBe(true);
      expect(explicitBuyRegex.test("รับ43ค่ะ")).toBe(true);
    });
  });

  describe("📦 multiBuyRegex v4.67.0 — Admin multi-buy + ชื่อตามหลัง", () => {
    it("matches '3 4 วาศินา' — two items + customer name suffix", () => {
      const m = "3 4 วาศินา".match(multiBuyRegex);
      expect(m).not.toBeNull();
      expect(m[2]).toBe("3 4");
      expect(m[3]).toBe("วาศินา");
    });

    it("matches '15 25 วาศินา' — two items + customer name suffix", () => {
      const m = "15 25 วาศินา".match(multiBuyRegex);
      expect(m).not.toBeNull();
      expect(m[2]).toBe("15 25");
      expect(m[3]).toBe("วาศินา");
    });

    it("matches 'หนิง เมื่อวาน 41 43' — customer name + backdated keyword + multi items", () => {
      const m = "หนิง เมื่อวาน 41 43".match(multiBuyRegex);
      expect(m).not.toBeNull();
      expect(m[1]).toBe("หนิง");
      expect(m[2]).toBe("41 43");
    });

    it("still matches legacy multi-buy patterns", () => {
      expect(multiBuyRegex.test("26 38 74")).toBe(true);
      expect(multiBuyRegex.test("มะระ เอา 19 13 10")).toBe(true);
    });
  });

  describe("👑 adminProxyNameFirstRegex — Name-First Admin Proxy Orders", () => {
    it("matches 'ตุ๊ก บำรุงรัตน์ 18' (standard name first)", () => {
      const m = "ตุ๊ก บำรุงรัตน์ 18".match(adminProxyNameFirstRegex);
      expect(m).not.toBeNull();
      expect(m[1].trim()).toBe("ตุ๊ก บำรุงรัตน์");
      expect(m[2]).toBe("18");
    });

    it("matches 'อิ๋ว เอา 22' (name + action verb + item ID)", () => {
      const m = "อิ๋ว เอา 22".match(adminProxyNameFirstRegex);
      expect(m).not.toBeNull();
      expect(m[1].trim()).toBe("อิ๋ว");
      expect(m[2]).toBe("22");
    });

    it("matches 'ตุ๊ก บำรุงรัตน์ เมือวาน 32' (name + backdated keyword + item ID)", () => {
      const m = "ตุ๊ก บำรุงรัตน์ เมือวาน 32".match(adminProxyNameFirstRegex);
      expect(m).not.toBeNull();
      expect(m[1].trim()).toBe("ตุ๊ก บำรุงรัตน์");
      expect(m[2]).toBe("32");
    });
  });

  describe("👤 extractAdminCustomerName — Extract Customer Name from Admin Messages", () => {
    it("extracts customer name from single-buy number-first pattern", () => {
      expect(extractAdminCustomerName("18 ตุ๊ก บำรุงรัตน์")).toBe("ตุ๊ก บำรุงรัตน์");
      expect(extractAdminCustomerName("28 วาศินา")).toBe("วาศินา");
      expect(extractAdminCustomerName("32 กุญสิญา")).toBe("กุญสิญา");
      expect(extractAdminCustomerName("52 กุญสิญา")).toBe("กุญสิญา");
      expect(extractAdminCustomerName("58 กุญสิญา")).toBe("กุญสิญา");
      expect(extractAdminCustomerName("50 ,tit")).toBe("tit");
      expect(extractAdminCustomerName("12 มะระ")).toBe("มะระ");
      expect(extractAdminCustomerName("13 มะระ")).toBe("มะระ");
      expect(extractAdminCustomerName("22 เอาให้อิ๋ว")).toBe("อิ๋ว");
    });

    it("extracts customer name from name-first pattern", () => {
      expect(extractAdminCustomerName("ตุ๊ก บำรุงรัตน์ 18")).toBe("ตุ๊ก บำรุงรัตน์");
      expect(extractAdminCustomerName("วาศินา 28")).toBe("วาศินา");
      expect(extractAdminCustomerName("พี่อ้อย 20")).toBe("พี่อ้อย");
      expect(extractAdminCustomerName("อิ๋ว เอา 22")).toBe("อิ๋ว");
      expect(extractAdminCustomerName("ตุ๊ก บำรุงรัตน์ เมือวาน 32")).toBe("ตุ๊ก บำรุงรัตน์");
    });

    it("extracts customer name from multi-buy pattern", () => {
      expect(extractAdminCustomerName("3 4 วาศินา")).toBe("วาศินา");
      expect(extractAdminCustomerName("15 25 วาศินา")).toBe("วาศินา");
      expect(extractAdminCustomerName("26 38 74 มะระ")).toBe("มะระ");
      expect(extractAdminCustomerName("หนิง เมื่อวาน 41 43")).toBe("หนิง");
    });

    it("extracts customer name from admin shipping commands", () => {
      expect(extractAdminCustomerName("กุญสิญา ส่งเลย")).toBe("กุญสิญา");
      expect(extractAdminCustomerName("ตุ๊ก บำรุงรัตน์ ส่งวันนี้")).toBe("ตุ๊ก บำรุงรัตน์");
      expect(extractAdminCustomerName("ตุ๊ก บำรุงรัตน์ ส่งเลย")).toBe("ตุ๊ก บำรุงรัตน์");
      expect(extractAdminCustomerName("พัชราวัน ส่งเลย")).toBe("พัชราวัน");
      expect(extractAdminCustomerName("วาศินา ส่งเลย")).toBe("วาศินา");
      expect(extractAdminCustomerName("พี่อ้อย ส่งเลย")).toBe("พี่อ้อย");
      expect(extractAdminCustomerName("ของพี่อ้อย ส่งเลย")).toBe("พี่อ้อย");
      expect(extractAdminCustomerName("บุญญาภา ส่งเลย")).toBe("บุญญาภา");
      expect(extractAdminCustomerName("เจเจ ส่งเลย")).toBe("เจเจ");
      expect(extractAdminCustomerName("พรจันทร์ ส่งเลย")).toBe("พรจันทร์");
    });

    it("extracts customer name from admin hold and consign commands (เอาไปฝากคนอื่นด้วย, ฝากไว้ก่อน, ฝากของ)", () => {
      expect(extractAdminCustomerName("วาศินา เอาไปฝากคนอื่นด้วย")).toBe("วาศินา");
      expect(extractAdminCustomerName("เอาไปฝากคนอื่นด้วย วาศินา")).toBe("วาศินา");
      expect(extractAdminCustomerName("วาศินา ฝากไว้ก่อน")).toBe("วาศินา");
      expect(extractAdminCustomerName("วาศินา ฝากของ")).toBe("วาศินา");
      expect(extractAdminCustomerName("วาศินา ฝาก")).toBe("วาศินา");
      expect(extractAdminCustomerName("วาศินา ฝากคนอื่นด้วย")).toBe("วาศินา");
    });

    it("extracts customer name from admin action notes (พรจันทร์ รับ, พรจันทร์ เอา, พรจันทร์ สีฟ้า)", () => {
      expect(extractAdminCustomerName("พรจันทร์ รับ")).toBe("พรจันทร์");
      expect(extractAdminCustomerName("พรจันทร์ เอา")).toBe("พรจันทร์");
      expect(extractAdminCustomerName("พรจันทร์ สีฟ้า")).toBe("พรจันทร์");
      expect(extractAdminCustomerName("หนิง เมื่อวาน")).toBe("หนิง");
    });

    it("returns null for admin stopwords and general admin chat", () => {
      expect(extractAdminCustomerName("กำลัง รอแแแ")).toBeNull();
      expect(extractAdminCustomerName("รอแปป")).toBeNull();
      expect(extractAdminCustomerName("รอแป๊บ")).toBeNull();
      expect(extractAdminCustomerName("เทส")).toBeNull();
      expect(extractAdminCustomerName("ทดสอบ")).toBeNull();
      expect(extractAdminCustomerName("สวัสดีค่ะ")).toBeNull();
      expect(extractAdminCustomerName("มีสีอะไรบ้าง")).toBeNull();
      expect(extractAdminCustomerName("")).toBeNull();
      expect(extractAdminCustomerName("พร้อมส่งนะคะ")).toBeNull();
      expect(extractAdminCustomerName("แอดมินพาลูกนอนแล้ว ฝากดูแลแชทด้วยนะคะ")).toBeNull();
      expect(extractAdminCustomerName("ฝากดูแลแชทด้วยนะคะ")).toBeNull();
    });
  });

  describe("🛑 Admin Stopwords & Regex Guards", () => {
    it("identifies admin stopwords correctly with adminStopwordsRegex", () => {
      expect(adminStopwordsRegex.test("กำลัง รอแแแ")).toBe(true);
      expect(adminStopwordsRegex.test("รอแปป")).toBe(true);
      expect(adminStopwordsRegex.test("รอแป๊บ")).toBe(true);
      expect(adminStopwordsRegex.test("เทส")).toBe(true);
      expect(adminStopwordsRegex.test("ทดสอบ")).toBe(true);
      expect(adminStopwordsRegex.test("สวัสดีรอบห้อง")).toBe(true);
      expect(adminStopwordsRegex.test("ปิดไลฟ์แล้วจ้า")).toBe(true);
    });

    it("parses admin stopwords in parseIntentDetails()", () => {
      expect(parseIntentDetails("กำลัง รอแแแ")).toEqual({
        type: "ADMIN_STOPWORD",
        method: "admin-stopword",
      });
      expect(parseIntentDetails("รอแปป")).toEqual({
        type: "ADMIN_STOPWORD",
        method: "admin-stopword",
      });
      expect(parseIntentDetails("เทส")).toEqual({
        type: "ADMIN_STOPWORD",
        method: "admin-stopword",
      });
    });
  });

  describe("🗓️ Admin Yesterday / Backdated Debt Notes", () => {
    it("identifies backdated keywords including typos with backdatedNoteRegex", () => {
      expect(backdatedNoteRegex.test("หนิง เมื่อวาน")).toBe(true);
      expect(backdatedNoteRegex.test("ตุ๊ก บำรุงรัตน์ เมือวาน 32")).toBe(true);
      expect(backdatedNoteRegex.test("รอบก่อน")).toBe(true);
      expect(backdatedNoteRegex.test("ของเก่า 14")).toBe(true);
    });

    it("parses yesterday debt notes in parseIntentDetails() without cutting stock", () => {
      expect(parseIntentDetails("หนิง เมื่อวาน 41 43")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "yesterday",
        customerName: "หนิง",
        method: "admin-yesterday-note",
      });

      expect(parseIntentDetails("ตุ๊ก บำรุงรัตน์ เมือวาน 32")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "yesterday",
        customerName: "ตุ๊ก บำรุงรัตน์",
        method: "admin-yesterday-note",
      });

      expect(parseIntentDetails("หนิง เมื่อวาน")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "yesterday",
        customerName: "หนิง",
        method: "admin-yesterday-note",
      });
    });
  });

  describe("📝 Admin Size Selection & Custom Request Notes", () => {
    it("parses size selection requests as ADMIN_NOTE in parseIntentDetails()", () => {
      expect(parseIntentDetails("พรจันทร์ อยสกได้ไซส์52 สัก3ตัว เล")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "size-selection",
        customerName: "พรจันทร์",
        method: "admin-note",
      });

      expect(parseIntentDetails("พรจันทร์ เพิ่มเป็น 4 ตัว ไซส์ 50-52 เลือกให้เลย")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "size-selection",
        customerName: "พรจันทร์",
        method: "admin-note",
      });

      expect(parseIntentDetails("พรจันทร์ รับ")).toEqual({
        type: "ADMIN_NOTE",
        noteCategory: "size-selection",
        customerName: "พรจันทร์",
        method: "admin-note",
      });
    });
  });

  describe("🛡️ Customer False-Positive Guards & Self-Name Extraction", () => {
    it("parses customer CF with self-name (40 บุญญาภา) and extracts selfName", () => {
      const res = parseIntentDetails("40 บุญญาภา");
      expect(res.type).toBe("SINGLE_BUY");
      expect(res.itemId).toBe(40);
      expect(res.customerName).toBe("บุญญาภา");
      expect(res.extractedSelfName).toBe("บุญญาภา");
      expect(res.method).toBe("num-and-name");
    });

    it("parses try item requests correctly (ลอง50ให้ดูด้วยค่ะ, ลองเสี้อกล้าม30บาทให้ดูหน่อยนาว)", () => {
      expect(parseIntentDetails("ลอง50ให้ดูด้วยค่ะ")).toEqual({
        type: "TRY_ITEM",
        itemId: 50,
        method: "try-keyword",
      });

      // 30 is followed by บาท (price), so it shouldn't extract 30 as an itemId
      const tryRes = parseIntentDetails("ลองเสี้อกล้าม30บาทให้ดูหน่อยนาว");
      expect(tryRes.type).toBe("TRY_ITEM");
      expect(tryRes.itemId).toBeUndefined();
    });

    it("parses shipping and hold requests prioritizing over number extraction (เอฟใหม่3ตัวฝากไว้ก่อน, นาวของพี่ส่งเลยของพี่ได้2ตัวใช่ไหม)", () => {
      const holdRes = parseIntentDetails("เอฟใหม่3ตัวฝากไว้ก่อน");
      expect(holdRes.type).toBe("SHIPPING");
      expect(holdRes.method).toBe("hold-keyword");

      const shipRes = parseIntentDetails("นาวของพี่ส่งเลยของพี่ได้2ตัวใช่ไหม");
      expect(shipRes.type).toBe("SHIPPING");
      expect(shipRes.method).toBe("shipping-keyword");
    });

    it("guards chest size ranges like '52-54' from being misidentified as item orders", () => {
      expect(parseIntentDetails("52-54")).toEqual({
        type: "QUESTION",
        method: "size-range-guard",
      });
      expect(parseIntentDetails("อก 42-44")).toEqual({
        type: "QUESTION",
        method: "size-range-guard",
      });
      expect(parseIntentDetails("50-52")).toEqual({
        type: "QUESTION",
        method: "size-range-guard",
      });
    });
  });

  describe("💡 Auto-Learn Nickname & Self-Name Extraction (v5.2.0 Hardening)", () => {
    it("extracts selfName for '40 บุญญาภา' and 'บุญญาภาค่ะ'", () => {
      expect(parseIntentDetails("40 บุญญาภา").extractedSelfName).toBe("บุญญาภา");
      expect(parseIntentDetails("บุญญาภาค่ะ").extractedSelfName).toBe("บุญญาภา");

      expect(extractCustomerSelfName("40 บุญญาภา")).toBe("บุญญาภา");
      expect(extractCustomerSelfName("บุญญาภาค่ะ")).toBe("บุญญาภา");
      expect(extractCustomerSelfName("บุญญาภาครับ")).toBe("บุญญาภา");
    });

    it("returns null extractedSelfName for non-name and conversational patterns", () => {
      // Prompt required test cases:
      expect(parseIntentDetails("24 ค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("50จองค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("ตัวเมื่อกี้ค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("ทักไลน์เรียบร้อยค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("ฝากไว้ก่อนนะคะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("เคยสักจ้า").extractedSelfName).toBeNull();

      // Additional live chat edge cases:
      expect(parseIntentDetails("15รับ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("4รับคะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("41คะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("40 สีฟ้า").extractedSelfName).toBeNull();
      expect(parseIntentDetails("40 ตัวนี้").extractedSelfName).toBeNull();
      expect(parseIntentDetails("40 ส่งเลย").extractedSelfName).toBeNull();
      expect(parseIntentDetails("เอาค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("รับค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("เห็นเนื้อผ้าแล้วชอบค่ะ").extractedSelfName).toBeNull();
      expect(parseIntentDetails("ส่งเลยนะนาว").extractedSelfName).toBeNull();
    });

    it("extractCustomerSelfName directly filters non-names strictly", () => {
      expect(extractCustomerSelfName("24 ค่ะ")).toBeNull();
      expect(extractCustomerSelfName("50จองค่ะ")).toBeNull();
      expect(extractCustomerSelfName("ตัวเมื่อกี้ค่ะ")).toBeNull();
      expect(extractCustomerSelfName("ทักไลน์เรียบร้อยค่ะ")).toBeNull();
      expect(extractCustomerSelfName("ฝากไว้ก่อนนะคะ")).toBeNull();
      expect(extractCustomerSelfName("เคยสักจ้า")).toBeNull();
      expect(extractCustomerSelfName("เอาค่ะ")).toBeNull();
      expect(extractCustomerSelfName("รับค่ะ")).toBeNull();
      expect(extractCustomerSelfName("40 สีฟ้า")).toBeNull();
      expect(extractCustomerSelfName("40 ตัวนี้")).toBeNull();
      expect(extractCustomerSelfName("40 ส่งเลย")).toBeNull();
      expect(extractCustomerSelfName("เห็นเนื้อผ้าแล้วชอบค่ะ")).toBeNull();
      expect(extractCustomerSelfName("ส่งเลยนะนาว")).toBeNull();
    });

    it("isHandleOrNonThaiName identifies YouTube handles and English/numeric accounts", () => {
      expect(isHandleOrNonThaiName("@bunyabaaubonwirattana6307")).toBe(true);
      expect(isHandleOrNonThaiName("bunyabaaubonwirattana6307")).toBe(true);
      expect(isHandleOrNonThaiName("@user-xyz123")).toBe(true);
      expect(isHandleOrNonThaiName("john123")).toBe(true);
      expect(isHandleOrNonThaiName("@ลักษิกาศิลารัตน์-ญ9ญ")).toBe(true);

      expect(isHandleOrNonThaiName("ศิรประภาหาญพันธ์พงษ์")).toBe(false);
      expect(isHandleOrNonThaiName("วิภาวดีแก้วประจักษ์-ค6จ")).toBe(false);
      expect(isHandleOrNonThaiName("บุญญาภา")).toBe(false);
    });
  });

  // ==========================================
  // 🎯 5-Pillar Real CSV Chat Log Accuracy Suite (v5.4.0)
  // ==========================================

  describe("🎯 Pillar 1: Cancel & Admin Proxy Cancel (CSV Logs)", () => {
    it("parses Admin Proxy Number-First Cancel ('12 มะระ ยกเลิก', '19 กนกวรรณ ยกเลิก')", () => {
      expect(parseIntentDetails("12 มะระ ยกเลิก")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        customerName: "มะระ",
      });
      expect(parseIntentDetails("19 กนกวรรณ ยกเลิก")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 19,
        customerName: "กนกวรรณ",
      });
    });

    it("parses Admin Proxy Keyword-First & Name-Keyword-Num Cancel ('ยกเลิก 12 มะระ', 'มะระ ยกเลิก 12')", () => {
      expect(parseIntentDetails("ยกเลิก 12 มะระ")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        customerName: "มะระ",
      });
      expect(parseIntentDetails("มะระ ยกเลิก 12")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        customerName: "มะระ",
      });
    });

    it("guards conditional cancel notes and conversational words ('อำไพ ถ้าใส่ไม่ได้ก็ไม่เอา', 'ผ่านใหญ่ๆ', 'เมื่อคืน')", () => {
      const condNote = parseIntentDetails("อำไพ ถ้าใส่ไม่ได้ก็ไม่เอา");
      expect(condNote.type).toBe("ADMIN_NOTE");
      expect(condNote.customerName).toBe("อำไพ");

      expect(parseIntentDetails("ผ่านใหญ่ๆ").type).toBe("UNKNOWN");
      expect(parseIntentDetails("เมื่อคืน").type).toBe("UNKNOWN");
    });
  });

  describe("🎯 Pillar 2: Buy vs. Question / Try / Complaint Disambiguation (CSV Logs)", () => {
    it("unblocks valid buys with color attributes or praise ('สีขาว34ค่ะพี่นัน', 'ไม่ต้องลองก็ได้12', 'ถูกใจมาก13ลายถูกใจ')", () => {
      const buyColor = parseIntentDetails("สีขาว34ค่ะพี่นัน");
      expect(buyColor.type).toBe("SINGLE_BUY");
      expect(buyColor.itemId).toBe(34);

      const buyNoTry = parseIntentDetails("ไม่ต้องลองก็ได้12");
      expect(buyNoTry.type).toBe("SINGLE_BUY");
      expect(buyNoTry.itemId).toBe(12);

      const buyPraise = parseIntentDetails("ถูกใจมาก13ลายถูกใจ");
      expect(buyPraise.type).toBe("SINGLE_BUY");
      expect(buyPraise.itemId).toBe(13);
    });

    it("blocks size complaints ('40 ใส่ไม่ได้', '42 คับไปค่ะ') as NEGATION", () => {
      expect(parseIntentDetails("40 ใส่ไม่ได้").type).toBe("NEGATION");
      expect(parseIntentDetails("42 คับไปค่ะ").type).toBe("NEGATION");
    });

    it("blocks price/classifier queries ('ตัว 100') from falsely matching as customer name 'ตัว'", () => {
      const priceQuery = parseIntentDetails("ตัว 100");
      expect(priceQuery.type).toBe("UNKNOWN");
    });

    it("blocks quantity unit phrases ('ได้4ชิ้นจ้า', 'เสื้อยืด3สีออะ') from falsely booking items", () => {
      expect(parseIntentDetails("ได้4ชิ้นจ้า").type).toBe("UNKNOWN");
      expect(parseIntentDetails("เสื้อยืด3สีออะ").type).toBe("UNKNOWN");
    });

    it("catches keyboard typo '7บอง' as TRY_ITEM and sleeve/shoulder/code questions as QUESTION", () => {
      expect(parseIntentDetails("7บอง")).toEqual({
        type: "TRY_ITEM",
        itemId: 7,
        method: "try-keyword",
      });
      expect(parseIntentDetails("วงแขนกว้างไหมคะ").type).toBe("QUESTION");
      expect(parseIntentDetails("ไซร์อะไรคะ").type).toBe("QUESTION");
      expect(parseIntentDetails("ระหัสอะไรคะ").type).toBe("QUESTION");
    });
  });

  describe("🎯 Pillar 3: Admin Shipping, Proxy Order & Admin Notes (CSV Logs)", () => {
    it("extracts clean customer name from 'วิระวัลย์ รวมยอด' and marks as SHIPPING", () => {
      expect(parseIntentDetails("วิระวัลย์ รวมยอด")).toEqual({
        type: "SHIPPING",
        method: "shipping-keyword",
        customerName: "วิระวัลย์",
      });
      expect(extractAdminCustomerName("วิระวัลย์ รวมยอด")).toBe("วิระวัลย์");
    });

    it("parses Admin Notes from CSV ('อำไพ เอาตัวอก56', '3xl อำไพ', 'เสื้อเชิ้ต อก56 สมฤทธิ์', 'ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร')", () => {
      const note1 = parseIntentDetails("อำไพ เอาตัวอก56");
      expect(note1.type).toBe("ADMIN_NOTE");
      expect(note1.customerName).toBe("อำไพ");

      const note2 = parseIntentDetails("3xl อำไพ");
      expect(note2.type).toBe("ADMIN_NOTE");
      expect(note2.customerName).toBe("อำไพ");

      const note3 = parseIntentDetails("เสื้อเชิ้ต อก56 สมฤทธิ์");
      expect(note3.type).toBe("ADMIN_NOTE");
      expect(note3.customerName).toBe("สมฤทธิ์");

      const note4 = parseIntentDetails("ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร");
      expect(note4.type).toBe("ADMIN_NOTE");
      expect(note4.customerName).toBe("มะระ");
    });
  });

  describe("🎯 Pillar 4: Strict Self-Name Auto-Learn Hardening (CSV Logs)", () => {
    it("blocks all 15 false-positive self-names discovered in CSV logs", () => {
      const falsePositives = [
        "สวัดดีค่ะ",
        "ใข่ค่ะ",
        "เก่าค่ะ",
        "สบายดีค่ะ",
        "ลายดอก",
        "ดำลายดอก",
        "คลุม",
        "แขนกุด",
        "ส้มแปร้ด",
        "ลินิลรับ",
        "ตัวเล็กๆ",
        "ฝนตกๆ",
        "ชื้อไห้หล่น",
        "ได้",
        "บ่",
      ];
      for (const msg of falsePositives) {
        expect(extractCustomerSelfName(msg)).toBeNull();
      }
    });

    it("preserves all genuine self-introductions from CSV logs", () => {
      expect(extractCustomerSelfName("บุญญาภาค่ะ")).toBe("บุญญาภา");
      expect(extractCustomerSelfName("แอนนันทนาค่ะ")).toBe("แอนนันทนา");
      expect(extractCustomerSelfName("พี่มอเเละดอ")).toBe("พี่มอเเละดอ");
      expect(extractCustomerSelfName("ต่าย")).toBe("ต่าย");
      expect(extractCustomerSelfName("40 บุญญาภา")).toBe("บุญญาภา");
    });
  });

  describe("🛡️ Multi-Buy Guard, Multi-Item Cancel & Admin Note Parity (/scrutinize v5.4.1)", () => {
    it("prevents multiBuyRegex from hijacking multi-item cancellations ('ยกเลิก 12 15', '12 15 ยกเลิก', '12 15 มะระ ยกเลิก')", () => {
      expect(isMultiBuyBlocked("ยกเลิก 12 15")).toBe(true);
      expect(isMultiBuyBlocked("12 15 ยกเลิก")).toBe(true);

      expect(parseIntentDetails("ยกเลิก 12 15")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        itemIds: [12, 15],
      });
      expect(parseIntentDetails("12 15 ยกเลิก")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        itemIds: [12, 15],
      });
      expect(parseIntentDetails("12 15 มะระ ยกเลิก")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        itemIds: [12, 15],
        customerName: "มะระ",
      });
      expect(parseIntentDetails("มะระ ยกเลิก 12 15")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        itemIds: [12, 15],
        customerName: "มะระ",
      });
      expect(parseIntentDetails("ยกเลิก 12, 15 มะระ")).toEqual({
        type: "CANCEL_ITEM",
        itemId: 12,
        itemIds: [12, 15],
        customerName: "มะระ",
      });
    });

    it("prevents multiBuyRegex from hijacking multi-number try requests, size questions, and fit complaints", () => {
      expect(isMultiBuyBlocked("ขอดู 12 15 หน่อยค่ะ")).toBe(true);
      expect(isMultiBuyBlocked("ลอง 12 15")).toBe(true);
      expect(isMultiBuyBlocked("อก 42 44 มีไหมคะ")).toBe(true);
      expect(isMultiBuyBlocked("ไซส์ 50 52")).toBe(true);
      expect(isMultiBuyBlocked("12 15 ใส่ไม่ได้")).toBe(true);

      expect(parseIntentDetails("ขอดู 12 15 หน่อยค่ะ").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("ลอง 12 15").type).toBe("TRY_ITEM");
      expect(parseIntentDetails("อก 42 44 มีไหมคะ").type).toBe("QUESTION");
      expect(parseIntentDetails("ไซส์ 50 52").type).toBe("QUESTION");
      expect(parseIntentDetails("12 15 ใส่ไม่ได้").type).toBe("NEGATION");
    });

    it("shares identical Admin Size Selection Note detection via isAdminSizeSelectionNote()", () => {
      expect(isAdminSizeSelectionNote("3xl อำไพ")).toBe(true);
      expect(isAdminSizeSelectionNote("เสื้อเชิ้ต อก56 สมฤทธิ์")).toBe(true);
      expect(isAdminSizeSelectionNote("พรจันทร์ รับ")).toBe(true);
      expect(isAdminSizeSelectionNote("อำไพ เอาตัวอก56")).toBe(true);
      expect(isAdminSizeSelectionNote("พรจันทร์ อยสกได้ไซส์52 สัก3ตัว เล")).toBe(true);
      expect(isAdminSizeSelectionNote("25")).toBe(false);
    });

    it("parses valid cancel IDs with parseCancelIds()", () => {
      expect(parseCancelIds("12 15")).toEqual([12, 15]);
      expect(parseCancelIds("5, 10, 999")).toEqual([5, 10]);
      expect(parseCancelIds("")).toEqual([]);
    });
  });
});

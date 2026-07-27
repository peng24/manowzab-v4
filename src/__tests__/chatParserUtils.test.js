import { describe, it, expect } from "vitest";
import {
  thaiToArabic,
  stringToColor,
  isAdminUser,
  parseIntentDetails,
  adminProxyNameFirstRegex,
  shippingRegex,
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

    it("parses explicit try requests from CSV (ลอง10, 24ลอง, ลอง34ให้แม่ดูหน่อยจ้า)", () => {
      expect(parseIntentDetails("ลอง10")).toEqual({ type: "TRY_ITEM", itemId: 10, method: "try-keyword" });
      expect(parseIntentDetails("24ลอง")).toEqual({ type: "TRY_ITEM", itemId: 24, method: "try-keyword" });
      expect(parseIntentDetails("ลอง34ให้แม่ดูหน่อยจ้า")).toEqual({ type: "TRY_ITEM", itemId: 34, method: "try-keyword" });
      expect(parseIntentDetails("ขอดูหน่อยค่ะ9")).toEqual({ type: "TRY_ITEM", itemId: 9, method: "try-keyword" });
    });

    it("parses explicit buy keyword statements from CSV (รับ10, รับค่ะ9, 30รับค่ะ)", () => {
      expect(parseIntentDetails("รับ10")).toEqual({ type: "SINGLE_BUY", itemId: 10, method: "explicit-keyword" });
      expect(parseIntentDetails("รับค่ะ9")).toEqual({ type: "SINGLE_BUY", itemId: 9, method: "explicit-keyword" });
      expect(parseIntentDetails("30รับค่ะ")).toEqual({ type: "SINGLE_BUY", itemId: 30, method: "explicit-keyword" });
    });

    it("parses multi-buy statements", () => {
      const res = parseIntentDetails("จอง 1 3 5");
      expect(res.type).toBe("MULTI_BUY");
      expect(res.itemIds).toEqual([1, 3, 5]);
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
});

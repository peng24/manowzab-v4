import { describe, it, expect } from "vitest";
import {
  thaiToArabic,
  stringToColor,
  isAdminUser,
  parseIntentDetails
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

  describe("parseIntentDetails()", () => {
    it("parses pure numbers as single item buy", () => {
      const res = parseIntentDetails("25");
      expect(res).toEqual({ type: "SINGLE_BUY", itemId: 25, method: "pure-number" });
    });

    it("parses Thai pure numbers as single item buy", () => {
      const res = parseIntentDetails("๔๒");
      expect(res).toEqual({ type: "SINGLE_BUY", itemId: 42, method: "pure-number" });
    });

    it("parses multi-buy statements", () => {
      const res = parseIntentDetails("จอง 1 3 5");
      expect(res.type).toBe("MULTI_BUY");
      expect(res.itemIds).toEqual([1, 3, 5]);
    });

    it("parses explicit buy keyword statements", () => {
      const res = parseIntentDetails("CF 12 ค่ะ");
      expect(res).toEqual({ type: "SINGLE_BUY", itemId: 12, method: "explicit-keyword" });
    });

    it("parses cancel requests", () => {
      expect(parseIntentDetails("ยกเลิก 5")).toEqual({ type: "CANCEL_ITEM", itemId: 5 });
      expect(parseIntentDetails("ขอผ่านค่ะ")).toEqual({ type: "CANCEL_LATEST", method: "auto-pass-latest" });
      expect(parseIntentDetails("cc")).toEqual({ type: "CANCEL_LATEST", method: "auto-cancel-latest" });
    });

    it("parses shipping inquiries", () => {
      expect(parseIntentDetails("แจ้งโอนเรียบร้อยค่ะ").type).toBe("SHIPPING");
      expect(parseIntentDetails("ขอเลขพัสดุหน่อยค่ะ").type).toBe("SHIPPING");
    });

    it("parses product questions", () => {
      expect(parseIntentDetails("อกเท่าไหร่คะ").type).toBe("QUESTION");
      expect(parseIntentDetails("มีไซส์ L ไหม").type).toBe("QUESTION");
    });
  });
});

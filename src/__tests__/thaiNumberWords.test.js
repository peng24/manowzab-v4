import { describe, it, expect } from "vitest";
import { numberToThaiWords, replaceNumbersWithThaiWords } from "../utils/thaiNumberWords";

describe("thaiNumberWords (Thai Number Pronunciation for TTS)", () => {
  describe("numberToThaiWords()", () => {
    it("converts single-digit numbers correctly", () => {
      expect(numberToThaiWords(0)).toBe("ศูนย์");
      expect(numberToThaiWords(1)).toBe("หนึ่ง");
      expect(numberToThaiWords(2)).toBe("สอง");
      expect(numberToThaiWords(3)).toBe("สาม");
      expect(numberToThaiWords(4)).toBe("สี่");
      expect(numberToThaiWords(5)).toBe("ห้า");
      expect(numberToThaiWords(6)).toBe("หก");
      expect(numberToThaiWords(7)).toBe("เจ็ด");
      expect(numberToThaiWords(8)).toBe("แปด");
      expect(numberToThaiWords(9)).toBe("เก้า");
    });

    it("converts teens (10-19) correctly, especially 15 -> สิบห้า", () => {
      expect(numberToThaiWords(10)).toBe("สิบ");
      expect(numberToThaiWords(11)).toBe("สิบเอ็ด");
      expect(numberToThaiWords(12)).toBe("สิบสอง");
      expect(numberToThaiWords(13)).toBe("สิบสาม");
      expect(numberToThaiWords(14)).toBe("สิบสี่");
      expect(numberToThaiWords(15)).toBe("สิบห้า");
      expect(numberToThaiWords(16)).toBe("สิบหก");
      expect(numberToThaiWords(17)).toBe("สิบเจ็ด");
      expect(numberToThaiWords(18)).toBe("สิบแปด");
      expect(numberToThaiWords(19)).toBe("สิบเก้า");
    });

    it("converts twenties (20-29) correctly with 'ยี่สิบ'", () => {
      expect(numberToThaiWords(20)).toBe("ยี่สิบ");
      expect(numberToThaiWords(21)).toBe("ยี่สิบเอ็ด");
      expect(numberToThaiWords(22)).toBe("ยี่สิบสอง");
      expect(numberToThaiWords(25)).toBe("ยี่สิบห้า");
      expect(numberToThaiWords(29)).toBe("ยี่สิบเก้า");
    });

    it("converts larger two-digit and three-digit numbers correctly", () => {
      expect(numberToThaiWords(30)).toBe("สามสิบ");
      expect(numberToThaiWords(39)).toBe("สามสิบเก้า");
      expect(numberToThaiWords(99)).toBe("เก้าสิบเก้า");
      expect(numberToThaiWords(100)).toBe("หนึ่งร้อย");
      expect(numberToThaiWords(101)).toBe("หนึ่งร้อยเอ็ด");
      expect(numberToThaiWords(105)).toBe("หนึ่งร้อยห้า");
      expect(numberToThaiWords(111)).toBe("หนึ่งร้อยสิบเอ็ด");
      expect(numberToThaiWords(115)).toBe("หนึ่งร้อยสิบห้า");
      expect(numberToThaiWords(120)).toBe("หนึ่งร้อยยี่สิบ");
      expect(numberToThaiWords(125)).toBe("หนึ่งร้อยยี่สิบห้า");
      expect(numberToThaiWords(200)).toBe("สองร้อย");
      expect(numberToThaiWords(215)).toBe("สองร้อยสิบห้า");
      expect(numberToThaiWords(999)).toBe("เก้าร้อยเก้าสิบเก้า");
      expect(numberToThaiWords(1000)).toBe("หนึ่งพัน");
      expect(numberToThaiWords(1500)).toBe("หนึ่งพันห้าร้อย");
    });

    it("handles string numbers and edge cases gracefully", () => {
      expect(numberToThaiWords("15")).toBe("สิบห้า");
      expect(numberToThaiWords("")).toBe("ศูนย์");
      expect(numberToThaiWords(null)).toBe("ศูนย์");
      expect(numberToThaiWords(undefined)).toBe("ศูนย์");
    });
  });

  describe("replaceNumbersWithThaiWords()", () => {
    it("converts isolated booking numbers: 15 -> สิบห้า", () => {
      expect(replaceNumbersWithThaiWords("15")).toBe("สิบห้า");
      expect(replaceNumbersWithThaiWords("12")).toBe("สิบสอง");
      expect(replaceNumbersWithThaiWords("25")).toBe("ยี่สิบห้า");
      expect(replaceNumbersWithThaiWords("120")).toBe("หนึ่งร้อยยี่สิบ");
    });

    it("converts Thai numerals correctly: ๑๕ -> สิบห้า", () => {
      expect(replaceNumbersWithThaiWords("๑๕")).toBe("สิบห้า");
      expect(replaceNumbersWithThaiWords("จอง ๑๕ ค่ะ")).toBe("จอง สิบห้า ค่ะ");
    });

    it("converts booking chats with polite particles and prefixes", () => {
      expect(replaceNumbersWithThaiWords("15ค่ะ")).toBe("สิบห้าค่ะ");
      expect(replaceNumbersWithThaiWords("15 คะ")).toBe("สิบห้า คะ");
      expect(replaceNumbersWithThaiWords("15ครับ")).toBe("สิบห้าครับ");
      expect(replaceNumbersWithThaiWords("15 จ้า")).toBe("สิบห้า จ้า");
      expect(replaceNumbersWithThaiWords("จอง 15")).toBe("จอง สิบห้า");
      expect(replaceNumbersWithThaiWords("เอา 15")).toBe("เอา สิบห้า");
      expect(replaceNumbersWithThaiWords("ขอ 15")).toBe("ขอ สิบห้า");
      expect(replaceNumbersWithThaiWords("รับ 15")).toBe("รับ สิบห้า");
    });

    it("converts CF booking formats cleanly: cf 15 / CF15 -> ซีเอฟ สิบห้า", () => {
      expect(replaceNumbersWithThaiWords("cf 15")).toBe("ซีเอฟ สิบห้า");
      expect(replaceNumbersWithThaiWords("CF 15")).toBe("ซีเอฟ สิบห้า");
      expect(replaceNumbersWithThaiWords("cf15")).toBe("ซีเอฟ สิบห้า");
      expect(replaceNumbersWithThaiWords("CF15")).toBe("ซีเอฟ สิบห้า");
    });

    it("converts multi-buy and compound bookings: 12 15 -> สิบสอง สิบห้า", () => {
      expect(replaceNumbersWithThaiWords("12 15")).toBe("สิบสอง สิบห้า");
      expect(replaceNumbersWithThaiWords("15 16 ... ทั้งหมด 2 รายการ")).toBe("สิบห้า สิบหก ... ทั้งหมด สอง รายการ");
    });

    it("converts slash piece designations: 15/1 -> สิบห้า ทับ หนึ่ง", () => {
      expect(replaceNumbersWithThaiWords("15/1")).toBe("สิบห้า ทับ หนึ่ง");
      expect(replaceNumbersWithThaiWords("15/2")).toBe("สิบห้า ทับ สอง");
    });

    it("converts backdated and proxy bookings", () => {
      expect(replaceNumbersWithThaiWords("39 เมื่อวาน")).toBe("สามสิบเก้า เมื่อวาน");
      expect(replaceNumbersWithThaiWords("มะระ 39 เมื่อวาน")).toBe("มะระ สามสิบเก้า เมื่อวาน");
      expect(replaceNumbersWithThaiWords("15 มะระ")).toBe("สิบห้า มะระ");
      expect(replaceNumbersWithThaiWords("มะระ 15")).toBe("มะระ สิบห้า");
      expect(replaceNumbersWithThaiWords("3xl 15 อำไพ")).toBe("สามxl สิบห้า อำไพ");
    });

    it("preserves phone numbers without converting them to cardinal words", () => {
      expect(replaceNumbersWithThaiWords("0812345678")).toBe("0812345678");
      expect(replaceNumbersWithThaiWords("091-234-5678")).toBe("091-234-5678");
      expect(replaceNumbersWithThaiWords("081-2345678")).toBe("081-2345678");
      expect(replaceNumbersWithThaiWords("เบอร์ 091-234-5678 ส่ง 15 ค่ะ")).toBe("เบอร์ 091-234-5678 ส่ง สิบห้า ค่ะ");
    });

    it("preserves time expressions and numbers with leading zero", () => {
      expect(replaceNumbersWithThaiWords("13:11")).toBe("13:11");
      expect(replaceNumbersWithThaiWords("01")).toBe("01");
      expect(replaceNumbersWithThaiWords("02")).toBe("02");
    });

    it("converts chat laughter 555+ to ฮ่าๆๆ", () => {
      expect(replaceNumbersWithThaiWords("555")).toBe("ฮ่าๆๆ");
      expect(replaceNumbersWithThaiWords("555+")).toBe("ฮ่าๆๆ");
      expect(replaceNumbersWithThaiWords("55555")).toBe("ฮ่าๆๆ");
    });

    it("handles empty or null inputs safely", () => {
      expect(replaceNumbersWithThaiWords("")).toBe("");
      expect(replaceNumbersWithThaiWords(null)).toBe("");
      expect(replaceNumbersWithThaiWords(undefined)).toBe("");
    });
  });
});

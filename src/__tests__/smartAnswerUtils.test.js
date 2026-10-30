import { describe, it, expect } from "vitest";
import {
  isSmartQuestionText,
  extractQueriedItemId,
  resolveInquiryCustomer,
  resolveSmartAnswer,
  getCustomerStoredPortfolio,
} from "../utils/smartAnswerUtils";

describe("smartAnswerUtils — Smart Seller Answer Assistant", () => {
  const mockContext = {
    currentVideoId: "live-today-101",
    stockData: {
      11: { owner: "วิภาวดี", uid: "uid-vip", price: 120 },
      20: { owner: "วิภาวดี", uid: "uid-vip", price: 150 },
      51: {
        owner: "สมหญิง",
        uid: "uid-somying",
        price: 100,
        size: '44"',
        queue: [{ owner: "วิภาวดี", uid: "uid-vip" }],
      },
      66: { owner: null, uid: null, price: 80, size: '42"' },
    },
    deliveryByNormKey: {
      วิภาวดี: {
        name: "วิภาวดี",
        uid: "uid-vip",
        status: "pending",
        deliveryDate: "2026-10-28",
        totalBookings: 25,
        sessions: {
          "live-yesterday-100": {
            count: 3,
            totalPrice: 350,
            status: "pending",
            title: "ไลฟ์ 24 ต.ค.",
          },
          "live-today-101": {
            count: 2,
            totalPrice: 270,
            status: "pending",
            title: "ไลฟ์ 25 ต.ค.",
          },
        },
      },
      มะระ: {
        name: "มะระ",
        uid: "uid-mara",
        status: "pending",
        deliveryDate: null,
        totalBookings: 12,
        sessions: {
          "live-yesterday-100": {
            count: 4,
            totalPrice: 480,
            status: "pending",
            title: "ไลฟ์ 24 ต.ค.",
          },
        },
      },
    },
    addressBook: {
      วิภาวดี: {
        address: "99/1 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กทม.",
        phone: "081-234-5678",
        contactChannel: "line",
        paymentType: "cod",
      },
    },
  };

  describe("1. extractQueriedItemId & Category 1 (ITEM_QUERY)", () => {
    it("detects ownership & spec inquiries for specific item IDs", () => {
      expect(extractQueriedItemId("ตัว51พี่ได้ไหม")).toBe(51);
      expect(extractQueriedItemId("51ใครได้")).toBe(51);
      expect(extractQueriedItemId("66ว่างไหมคะ")).toBe(66);
      expect(extractQueriedItemId("14อกเท่าไรคะ")).toBe(14);
      expect(extractQueriedItemId("48ราคา")).toBe(48);
      expect(extractQueriedItemId("21 อกเท่าไหร่ สมฤทธิ์")).toBe(21);
    });

    it("does NOT confuse chest size requests ('อก 44 มีไหมคะ') with item IDs", () => {
      expect(extractQueriedItemId("อก 44 มีไหมคะ")).toBeNull();
      expect(extractQueriedItemId("รอบอก 42 ว่างไหม")).toBeNull();
    });

    it("resolves ITEM_QUERY showing backup queue position and owned items today", () => {
      const ans = resolveSmartAnswer(
        {
          id: "m1",
          text: "ตัว51พี่ได้ไหม",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "question",
        },
        mockContext
      );
      expect(ans).not.toBeNull();
      expect(ans.category).toBe("item");
      expect(ans.itemId).toBe(51);
      expect(ans.headline).toContain("คิวสำรอง #1");
      expect(ans.headline).toContain("สมหญิง");
      expect(ans.subline).toContain("100฿");
      expect(ans.subline).toContain("#11, #20");
    });

    it("resolves ITEM_QUERY when item is vacant", () => {
      const ans = resolveSmartAnswer(
        {
          id: "m2",
          text: "66 อกเท่าไหร่",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "question",
        },
        mockContext
      );
      expect(ans).not.toBeNull();
      expect(ans.category).toBe("item");
      expect(ans.itemId).toBe(66);
      expect(ans.headline).toContain("รหัส #66 ยังว่าง");
      expect(ans.subline).toContain('ไซส์ 42"');
    });
  });

  describe("2. Category 2 (MY_ORDERS_QUERY) & Claimed Count Verification", () => {
    it("resolves today's items + accumulated multi-day total for 'นาวพี่ได้กี่ตัววันนี้' / 'พี่ได้กี่ตัวเอฟ2วัน'", () => {
      const ans = resolveSmartAnswer(
        {
          id: "m3",
          text: "พี่ได้กี่ตัวเอฟ2วัน",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "question",
        },
        mockContext
      );
      expect(ans).not.toBeNull();
      expect(ans.category).toBe("orders");
      expect(ans.headline).toContain("วันนี้ 2 ตัว");
      expect(ans.headline).toContain("สะสมรวม 5 ตัว (เก่า 3)");
      expect(ans.pills.some((p) => p.text.includes("#11(120฿)"))).toBe(true);
      expect(ans.pills.some((p) => p.text.includes("#20(150฿)"))).toBe(true);
    });

    it("verifies claimed count match ('ของพี่ได้2ตัวใช่ไหม' / 'ใช่5ตัว')", () => {
      const matchAns = resolveSmartAnswer(
        {
          id: "m4",
          text: "ของพี่ได้2ตัวใช่ไหม",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "question",
        },
        mockContext
      );
      expect(matchAns.category).toBe("orders");
      expect(matchAns.pills.some((p) => p.text.includes("ยอดตรง (2 ตัว)"))).toBe(true);

      const mismatchAns = resolveSmartAnswer(
        {
          id: "m5",
          text: "พี่นับได่8",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "question",
        },
        mockContext
      );
      expect(mismatchAns.category).toBe("orders");
      expect(
        mismatchAns.pills.some((p) => p.text.includes("แจ้ง 8 (ในระบบ 5 ตัว)"))
      ).toBe(true);
    });
  });

  describe("3. Category 3 (YESTERDAY_QUERY)", () => {
    it("extracts target customer name and past session count for 'ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร' and 'มะระ 39 เมื่อวาน'", () => {
      const ans1 = resolveSmartAnswer(
        {
          id: "m6",
          text: "ของมะระ ตัวที่13เมื่อวาน ได้สีอะไร",
          displayName: "@user-123",
          uid: "uid-other",
          type: "question",
        },
        mockContext
      );
      expect(ans1).not.toBeNull();
      expect(ans1.category).toBe("yesterday");
      expect(ans1.customerName).toBe("มะระ");
      expect(ans1.itemId).toBe(13);
      expect(ans1.headline).toContain("มียอดค้างรอบก่อน 4 ตัว");

      const ans2 = resolveSmartAnswer(
        {
          id: "m7",
          text: "39 เมื่อวาน มะระ",
          displayName: "@user-123",
          uid: "uid-other",
          type: "note",
        },
        mockContext
      );
      expect(ans2).not.toBeNull();
      expect(ans2.category).toBe("yesterday");
      expect(ans2.customerName).toBe("มะระ");
      expect(ans2.itemId).toBe(39);
    });
  });

  describe("4. Category 4 (HOLD_SHIPPING_QUERY)", () => {
    it("resolves hold items and delivery schedule for 'มีฝากไหมนาว' and 'ส่งวันไหนคะ'", () => {
      const ans = resolveSmartAnswer(
        {
          id: "m8",
          text: "มีฝากไหมนาว",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "shipping",
        },
        mockContext
      );
      expect(ans).not.toBeNull();
      expect(ans.category).toBe("hold");
      expect(ans.headline).toContain("มีของสะสมรวม 5 ตัว (เก่า 3 + วันนี้ 2)");
      expect(ans.subline).toContain("กำหนดส่ง:");
    });
  });

  describe("5. Category 5 (PROFILE_ADDRESS_QUERY)", () => {
    it("resolves stored address and COD status for 'มีที่อยู่พี่ไหมคะ' / 'ที่อยู่เดิมมีไหม'", () => {
      const ans = resolveSmartAnswer(
        {
          id: "m9",
          text: "มีที่อยู่พี่ไหมคะ",
          displayName: "วิภาวดี",
          uid: "uid-vip",
          type: "shipping",
        },
        mockContext
      );
      expect(ans).not.toBeNull();
      expect(ans.category).toBe("profile");
      expect(ans.headline).toContain("มีที่อยู่จัดส่งในระบบแล้ว");
      expect(ans.headline).toContain("COD ปลายทาง");
      expect(ans.subline).toContain("081-234-5678");
    });
  });

  describe("6. Guards (Banned, Buy/Cancel, Non-Stored General Chat)", () => {
    it("returns null for banned users or buy/cancel messages", () => {
      expect(
        resolveSmartAnswer(
          { id: "b1", text: "พี่ได้กี่ตัววันนี้", displayName: "วิภาวดี", isBanned: true },
          mockContext
        )
      ).toBeNull();
      expect(
        resolveSmartAnswer(
          { id: "b2", text: "51", displayName: "วิภาวดี", type: "buy" },
          mockContext
        )
      ).toBeNull();
      expect(
        resolveSmartAnswer(
          { id: "b3", text: "สวัสดีค่ะแม่ค้า วันนี้เสื้อสวยมาก", displayName: "วิภาวดี", type: "general" },
          mockContext
        )
      ).toBeNull();
      expect(isSmartQuestionText("ฝากไว้ก่อนค่ะ")).toBe(false);
    });

    it("resolves Admin trailing customer name in '21 อกเท่าไหร่ สมฤทธิ์'", () => {
      const resolved = resolveInquiryCustomer({
        text: "21 อกเท่าไหร่ สมฤทธิ์",
        displayName: "Admin",
        isAdmin: true,
      });
      expect(resolved.customerName).toBe("สมฤทธิ์");
      expect(resolved.isProxyTarget).toBe(true);
    });
  });
});


describe("shipped bookings in smart answers", () => {
  it("keeps today's sales visible but excludes shipped items from accumulated goods", () => {
    const portfolio = getCustomerStoredPortfolio('Buyer', 'u', 'Buyer', {
      currentVideoId: 'live',
      stockData: { 1: { owner: 'Buyer', uid: 'u', time: 100, price: 100 }, 2: { owner: 'Buyer', uid: 'u', time: 200, price: 200 } },
      deliveryByNormKey: { buyer: { name: 'Buyer', status: 'pending', sessions: {
        live: { count: 1, totalPrice: 200, status: 'pending', fulfilledItems: { 1: { bookingKey: '1:100' } } },
        old: { count: 3, totalPrice: 300, status: 'done' },
      } } },
    });
    expect(portfolio.todayOwned).toHaveLength(2);
    expect(portfolio.totalAccumulatedCount).toBe(1);
    expect(portfolio.totalAccumulatedPrice).toBe(200);
  });
});

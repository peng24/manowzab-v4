import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getShippingRequestedCustomers,
  getLiveSalesSummary,
  formatLiveSalesSummarySpeech,
  announceShippingCustomers,
} from "../utils/deliverySync";

// Mock Firebase Realtime Database methods
vi.mock("firebase/database", () => ({
  ref: vi.fn((db, path) => path || "mock-ref"),
  get: vi.fn(),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

// Mock useAudio
const mockQueueAudio = vi.fn();
vi.mock("../composables/useAudio", () => ({
  useAudio: () => ({
    queueAudio: mockQueueAudio,
    playSfx: vi.fn(),
    resetVoice: vi.fn(),
  }),
}));

// Mock system store
const mockSystemStore = {
  currentVideoId: "test-video-123",
  isSoundOn: true,
  shippingCycle: "2026-08-19",
};
vi.mock("../stores/system", () => ({
  useSystemStore: () => mockSystemStore,
}));

// Mock nickname store
const mockNicknameStore = {
  getPhoneticName: vi.fn((uid, name) => `คุณ${name}`),
};
vi.mock("../stores/nickname", () => ({
  useNicknameStore: () => mockNicknameStore,
}));

describe("Shipping Announcer (Live Finished Shipping Voice Announcements)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSystemStore.isSoundOn = true;
    mockSystemStore.shippingCycle = "2026-08-19";
  });

  describe("getShippingRequestedCustomers", () => {
    it("returns active customers filtered strictly by the specified shipping cycle date", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "cust-1": {
                name: "ปิ๊กกี้",
                deliveryDate: "2026-08-19",
                status: "pending",
                itemCount: 2,
              },
              "cust-2": {
                name: "สมศรี",
                deliveryDate: "2026-08-20", // Different date -> should NOT be included in 2026-08-19 cycle
                status: "pending",
                itemCount: 1,
              },
              "cust-3": {
                name: "รุ่งนภา",
                deliveryDate: null, // ฝากสินค้า (ยังไม่ระบุวัน) -> ไม่ควรอ่าน
                status: "pending",
                itemCount: 3,
              },
              "cust-4": {
                name: "สายใจ",
                deliveryDate: "2026-08-19",
                status: "done", // ส่งเสร็จแล้ว -> ไม่ควรอ่าน
                itemCount: 0,
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      // Target cycle: 2026-08-19
      const list = await getShippingRequestedCustomers("2026-08-19");

      expect(list.length).toBe(1);
      expect(list.map((c) => c.name)).toEqual(["ปิ๊กกี้"]);
    });

    it("returns all active customers when cycle is 'all'", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "cust-1": {
                name: "วันเพ็ญ ก้อนแก้ว",
                deliveryDate: "2026-08-22",
                status: "pending",
              },
              "cust-2": {
                name: "ธิดารัตน์",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "cust-3": {
                name: "เกษมศรี",
                deliveryDate: "2026-08-20",
                status: "pending",
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      const list = await getShippingRequestedCustomers("all");

      expect(list.length).toBe(3);
      expect(list.map((c) => c.name)).toEqual(["ธิดารัตน์", "เกษมศรี", "วันเพ็ญ ก้อนแก้ว"]);
    });

    it("excludes Admin accounts and only returns real customers", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "admin-uid": {
                name: "แอดมินมะนาว",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "admin-uid-2": {
                name: "Manowzab Admin",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "cust-real": {
                name: "พี่อ้อย",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      const list = await getShippingRequestedCustomers("2026-08-19");

      expect(list.length).toBe(1);
      expect(list[0].name).toBe("พี่อ้อย");
    });
  });

  describe("announceShippingCustomers", () => {
    it("announces opening with cycle label, each customer name with delayAfter: 800, and closing remark", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "cust-1": {
                name: "ปิ๊กกี้",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "cust-2": {
                name: "สมศรี",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "cust-3": {
                name: "สายใจ",
                deliveryDate: "2026-08-25", // Other date
                status: "pending",
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      mockSystemStore.shippingCycle = "2026-08-19";

      await announceShippingCustomers("new-video-999", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(4);

      // 1. Opening announcement with success chime, cycle label, and 800ms pause
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        1,
        "success",
        "",
        "ไลฟ์จบแล้วค่ะ ขอแจ้งรายชื่อลูกค้าที่ให้จัดส่งรอบวันพุธ (19 ส.ค.) มีทั้งหมด 2 ท่าน มีดังนี้ค่ะ",
        { delayAfter: 800 }
      );

      // 2. First customer with 800ms spacing
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        2,
        null,
        "",
        "คนที่ 1 คุณปิ๊กกี้",
        { delayAfter: 800 }
      );

      // 3. Second customer with 800ms spacing
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        3,
        null,
        "",
        "คนที่ 2 คุณสมศรี",
        { delayAfter: 800 }
      );

      // 4. Closing remark with 500ms pause
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        4,
        null,
        "",
        "รวมทั้งหมด 2 ท่าน ขอบคุณลูกค้าทุกท่านค่ะ",
        { delayAfter: 500 }
      );
    });

    it("announces fallback message when no customers requested shipping in current cycle", async () => {
      const { get } = await import("firebase/database");

      get.mockResolvedValue({ val: () => ({}) });

      await announceShippingCustomers("empty-video-000", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(1);
      expect(mockQueueAudio).toHaveBeenCalledWith(
        null,
        "",
        "ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งรอบวันพุธ (19 ส.ค.)ค่ะ ขอบคุณค่ะ",
        { delayAfter: 500 }
      );
    });

    it("respects sound toggle (isSoundOn: false)", async () => {
      mockSystemStore.isSoundOn = false;

      await announceShippingCustomers("sound-off-video", { force: true });

      expect(mockQueueAudio).not.toHaveBeenCalled();
    });

    it("announces total sales in Baht right after the shipping customer list", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "cust-1": {
                name: "ปิ๊กกี้",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
              "cust-2": {
                name: "สมศรี",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
            }),
          });
        }
        if (path === "stock/live-with-sales") {
          // Sparse array as returned by Firebase RTDB for numeric keys
          return Promise.resolve({
            val: () => [
              null,
              { owner: "ปิ๊กกี้", price: 80 },
              { owner: "สมศรี", price: "120" },
              { owner: null, price: 200 }, // Vacant item with price -> must NOT count
              { owner: "พี่นก", price: 1250 },
            ],
          });
        }
        return Promise.resolve({ val: () => null });
      });

      mockSystemStore.shippingCycle = "2026-08-19";

      await announceShippingCustomers("live-with-sales", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(5);
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        1,
        "success",
        "",
        "ไลฟ์จบแล้วค่ะ ขอแจ้งรายชื่อลูกค้าที่ให้จัดส่งรอบวันพุธ (19 ส.ค.) มีทั้งหมด 2 ท่าน มีดังนี้ค่ะ",
        { delayAfter: 800 }
      );
      expect(mockQueueAudio).toHaveBeenNthCalledWith(2, null, "", "คนที่ 1 คุณปิ๊กกี้", { delayAfter: 800 });
      expect(mockQueueAudio).toHaveBeenNthCalledWith(3, null, "", "คนที่ 2 คุณสมศรี", { delayAfter: 800 });
      expect(mockQueueAudio).toHaveBeenNthCalledWith(4, null, "", "รวมทั้งหมด 2 ท่านค่ะ", { delayAfter: 800 });
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        5,
        null,
        "",
        "สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด สาม ชิ้น รวมเป็นเงิน หนึ่งพันสี่ร้อยห้าสิบ บาทค่ะ ขอบคุณลูกค้าทุกท่านค่ะ",
        { delayAfter: 500 }
      );
    });

    it("still announces total sales in Baht when no customers requested shipping in current cycle", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({ val: () => ({}) });
        }
        if (path === "stock/hold-only-live") {
          return Promise.resolve({
            val: () => ({
              1: { owner: "พี่อ้อย", price: 100 },
              2: { owner: "พี่แดง", price: 150 },
            }),
          });
        }
        return Promise.resolve({ val: () => null });
      });

      await announceShippingCustomers("hold-only-live", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(2);
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        1,
        null,
        "",
        "ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งรอบวันพุธ (19 ส.ค.)ค่ะ",
        { delayAfter: 800 }
      );
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        2,
        null,
        "",
        "สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด สอง ชิ้น รวมเป็นเงิน สองร้อยห้าสิบ บาทค่ะ ขอบคุณลูกค้าทุกท่านค่ะ",
        { delayAfter: 500 }
      );
    });

    it("falls back to history/{videoId} when stock node is empty", async () => {
      const { get } = await import("firebase/database");

      get.mockImplementation((path) => {
        if (path === "delivery_customers") {
          return Promise.resolve({
            val: () => ({
              "cust-1": {
                name: "ปิ๊กกี้",
                deliveryDate: "2026-08-19",
                status: "pending",
              },
            }),
          });
        }
        if (path === "stock/archived-vid") {
          return Promise.resolve({ val: () => null });
        }
        if (path === "history/archived-vid") {
          return Promise.resolve({
            val: () => ({ totalSales: 3460, totalItems: 42 }),
          });
        }
        return Promise.resolve({ val: () => null });
      });

      await announceShippingCustomers("archived-vid", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(4);
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        4,
        null,
        "",
        "สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด สี่สิบสอง ชิ้น รวมเป็นเงิน สามพันสี่ร้อยหกสิบ บาทค่ะ ขอบคุณลูกค้าทุกท่านค่ะ",
        { delayAfter: 500 }
      );
    });
  });

  describe("getLiveSalesSummary & formatLiveSalesSummarySpeech", () => {
    it("guards against empty or unsafe videoId keys", async () => {
      const { get } = await import("firebase/database");
      expect(await getLiveSalesSummary("")).toEqual({ totalSales: 0, soldCount: 0, pricedSoldCount: 0 });
      expect(await getLiveSalesSummary("../bad")).toEqual({ totalSales: 0, soldCount: 0, pricedSoldCount: 0 });
      expect(await getLiveSalesSummary("bad.key")).toEqual({ totalSales: 0, soldCount: 0, pricedSoldCount: 0 });
      expect(get).not.toHaveBeenCalled();
    });

    it("formats Thai cardinal sales speech without Western commas", () => {
      expect(formatLiveSalesSummarySpeech({ totalSales: 12500, soldCount: 55 })).toBe(
        "สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด ห้าสิบห้า ชิ้น รวมเป็นเงิน หนึ่งหมื่นสองพันห้าร้อย บาทค่ะ"
      );
      expect(formatLiveSalesSummarySpeech({ totalSales: 800, soldCount: 0 })).toBe(
        "สรุปยอดขายไลฟ์นี้ รวมเป็นเงินทั้งหมด แปดร้อย บาทค่ะ"
      );
      expect(formatLiveSalesSummarySpeech({ totalSales: 0, soldCount: 10 })).toBe(
        "สรุปยอดขายไลฟ์นี้ ขายได้ทั้งหมด สิบ ชิ้น ยังไม่มีข้อมูลราคาที่บันทึกไว้ค่ะ"
      );
      expect(formatLiveSalesSummarySpeech({ totalSales: 0, soldCount: 0 })).toBe("");
    });
  });
});

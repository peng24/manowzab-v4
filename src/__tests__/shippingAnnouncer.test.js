import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getShippingRequestedCustomers,
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
  });

  describe("getShippingRequestedCustomers", () => {
    it("returns active customers who have deliveryDate set", async () => {
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
                deliveryDate: "2026-08-20",
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
                deliveryDate: "2026-08-15",
                status: "done", // ส่งเสร็จแล้ว -> ไม่ควรอ่าน
                itemCount: 0,
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      const list = await getShippingRequestedCustomers("test-video-123");

      expect(list.length).toBe(2);
      expect(list.map((c) => c.name)).toEqual(["ปิ๊กกี้", "สมศรี"]);
    });

    it("merges customers marked ready in shipping/${videoId}", async () => {
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
        if (path === "shipping/test-video-123") {
          return Promise.resolve({
            val: () => ({
              "cust-extra": {
                ready: true,
                name: "ก้อย",
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      const list = await getShippingRequestedCustomers("test-video-123");

      expect(list.length).toBe(2);
      expect(list.map((c) => c.name)).toContain("ปิ๊กกี้");
      expect(list.map((c) => c.name)).toContain("ก้อย");
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

      const list = await getShippingRequestedCustomers("test-video-123");

      expect(list.length).toBe(1);
      expect(list[0].name).toBe("พี่อ้อย");
    });
  });

  describe("announceShippingCustomers", () => {
    it("announces opening, each customer name with delayAfter: 800, and closing remark", async () => {
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
                deliveryDate: "2026-08-20",
                status: "pending",
              },
            }),
          });
        }
        return Promise.resolve({ val: () => ({}) });
      });

      await announceShippingCustomers("new-video-999", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(4);

      // 1. Opening announcement with success chime and 800ms pause
      expect(mockQueueAudio).toHaveBeenNthCalledWith(
        1,
        "success",
        "",
        "ไลฟ์จบแล้วค่ะ ขอแจ้งรายชื่อลูกค้าที่ให้จัดส่ง มีทั้งหมด 2 ท่าน มีดังนี้ค่ะ",
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

    it("announces fallback message when no customers requested shipping", async () => {
      const { get } = await import("firebase/database");

      get.mockResolvedValue({ val: () => ({}) });

      await announceShippingCustomers("empty-video-000", { force: true });

      expect(mockQueueAudio).toHaveBeenCalledTimes(1);
      expect(mockQueueAudio).toHaveBeenCalledWith(
        null,
        "",
        "ไลฟ์จบแล้วค่ะ ยังไม่มีรายชื่อลูกค้าที่แจ้งจัดส่งค่ะ ขอบคุณค่ะ",
        { delayAfter: 500 }
      );
    });

    it("respects sound toggle (isSoundOn: false)", async () => {
      mockSystemStore.isSoundOn = false;

      await announceShippingCustomers("sound-off-video", { force: true });

      expect(mockQueueAudio).not.toHaveBeenCalled();
    });
  });
});

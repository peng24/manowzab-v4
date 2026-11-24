import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { ref as vueRef, nextTick } from "vue";

if (typeof window === "undefined") {
  global.window = global;
}
if (typeof localStorage === "undefined" || !localStorage.getItem) {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
}

vi.mock("firebase/database", () => ({
  ref: vi.fn((_db, path) => ({ path })),
  onValue: vi.fn((_ref, cb) => {
    cb({ val: () => ({}) });
    return vi.fn();
  }),
  onChildAdded: vi.fn(() => vi.fn()),
  set: vi.fn().mockResolvedValue(true),
  get: vi.fn().mockResolvedValue({ val: () => null, exists: () => false }),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  push: vi.fn().mockResolvedValue({ key: "mock-key" }),
  query: vi.fn((r) => r),
  limitToLast: vi.fn((n) => n),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useBlacklistStore } from "../stores/blacklist";
import { useChatStore } from "../stores/chat";
import { useNicknameStore } from "../stores/nickname";
import {
  resolveDeliveryUid,
  setLiveDeliveryCustomersCache,
} from "../utils/deliverySync";
import { useDeliveryReconciliation } from "../composables/useDeliveryReconciliation";
import {
  multiBuyRegex,
  extractAdminCustomerName,
  isDateMismatch,
} from "../utils/chatParserUtils";
import { replaceNumbersWithThaiWords } from "../utils/thaiNumberWords";
import { parseSingleAddress, parseMultipleAddresses } from "../utils/addressParser";
import {
  formatSmartDeliveryDate,
  getCustomerStoredPortfolio,
} from "../utils/smartAnswerUtils";
import { YouTubeLiveChat } from "../services/YouTubeLiveChat";
import { useOfflineQueue } from "../composables/useOfflineQueue";

describe("Bug Audit Regression Suite (manowzab-v4)", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
    setLiveDeliveryCustomersCache(null);
    const fb = await import("firebase/database");
    vi.clearAllMocks();
    fb.get.mockResolvedValue({ val: () => null, exists: () => false });
    fb.set.mockResolvedValue(true);
    fb.update.mockResolvedValue(true);
    fb.remove.mockResolvedValue(true);
    fb.runTransaction.mockResolvedValue({ committed: true });
    fb.onValue.mockImplementation((_ref, cb) => {
      cb({ val: () => ({}) });
      return vi.fn();
    });
  });

  describe("Stock Store safety guards", () => {
    it("aborts clearAllStock() when currentVideoId is empty and never calls remove()", async () => {
      const fb = await import("firebase/database");
      const systemStore = useSystemStore();
      const stockStore = useStockStore();
      systemStore.currentVideoId = "";
      stockStore.stockData = { 1: { owner: "มะระ", uid: "u1", price: 80 } };

      await stockStore.clearAllStock();
      expect(fb.remove).not.toHaveBeenCalled();
    });

    it("aborts processOrder, processCancel, and updateItemData when currentVideoId is empty", async () => {
      const fb = await import("firebase/database");
      const systemStore = useSystemStore();
      const stockStore = useStockStore();
      systemStore.currentVideoId = null;

      const orderRes = await stockStore.processOrder(1, "มะระ", "u1");
      expect(orderRes.success).toBe(false);
      const cancelRes = await stockStore.processCancel(1, "u1", "มะระ");
      expect(cancelRes.success).toBe(false);
      await stockStore.updateItemData(1, { owner: "มะระ" });

      expect(fb.runTransaction).not.toHaveBeenCalled();
      expect(fb.set).not.toHaveBeenCalled();
    });

    it("handles Firebase sparse array stockData with null holes safely", () => {
      const stockStore = useStockStore();
      const now = 1000000;
      stockStore.stockData = [
        null,
        { owner: "สมชาย", uid: "u1", time: now - 5000, price: 80 },
        undefined,
        { owner: "สมหญิง", uid: "u2", time: now - 2000, price: 60 },
      ];

      expect(stockStore.totalSales).toBe(140);
      expect(stockStore.findMostRecentItemForUser("u1", "สมชาย", 60000, now)).toBe(1);
    });

    it("clears stale backdated flag when claiming a vacant item normally", async () => {
      const fb = await import("firebase/database");
      const systemStore = useSystemStore();
      const stockStore = useStockStore();
      systemStore.currentVideoId = "vid_live_1";

      let txOut;
      fb.runTransaction.mockImplementationOnce(async (_ref, fn) => {
        txOut = fn({ price: 80, backdated: true });
        return { committed: true };
      });

      const res = await stockStore.processOrder(5, "มะระ", "u1", { backdated: false });
      expect(res.success).toBe(true);
      expect(txOut.owner).toBe("มะระ");
      expect(txOut.backdated).toBeFalsy();
    });

    it("tracks loadedVideoId on connectToStock and resets stockData immediately", async () => {
      const fb = await import("firebase/database");
      const stockStore = useStockStore();
      stockStore.stockData = { 1: { owner: "Old", price: 50 } };

      let capturedCb = null;
      fb.onValue.mockImplementationOnce((_ref, cb) => {
        capturedCb = cb;
        return vi.fn();
      });

      stockStore.connectToStock("vid_new_2");
      expect(stockStore.stockData).toEqual({});
      expect(stockStore.loadedVideoId).not.toBe("vid_new_2");

      capturedCb({ val: () => ({ 2: { owner: "New", price: 60 } }) });
      expect(stockStore.loadedVideoId).toBe("vid_new_2");
      expect(stockStore.stockData[2].owner).toBe("New");
    });
  });

  describe("Delivery sync & reconciliation", () => {
    it("coalesces concurrent resolveDeliveryUid calls for the same proxy name", async () => {
      setLiveDeliveryCustomersCache({});
      const [uid1, uid2] = await Promise.all([
        resolveDeliveryUid("proxy-1", "พี่นิด"),
        resolveDeliveryUid("proxy-2", "พี่นิด"),
      ]);
      expect(uid1).toMatch(/^customer-/);
      expect(uid1).toBe(uid2);
    });

    it("waits for stockLoaded before reconciling delivery customers", async () => {
      const syncFn = vi.fn().mockResolvedValue(true);
      const stockData = vueRef({});
      const deliveryCustomers = vueRef({ u1: { name: "มะระ", sessions: { vid1: 2 } } });
      const videoId = vueRef("vid1");
      const authorized = vueRef(true);
      const stockLoaded = vueRef(false);

      const stop = useDeliveryReconciliation({
        stock: () => stockData.value,
        customers: () => deliveryCustomers.value,
        videoId: () => videoId.value,
        authorized: () => authorized.value,
        stockLoaded: () => stockLoaded.value,
        sync: syncFn,
        delay: 10,
      });

      await nextTick();
      await new Promise((r) => setTimeout(r, 40));
      expect(syncFn).not.toHaveBeenCalled();

      stockLoaded.value = true;
      await nextTick();
      await new Promise((r) => setTimeout(r, 40));
      expect(syncFn).toHaveBeenCalledTimes(1);
      stop();
    });
  });

  describe("Blacklist & Chat stores", () => {
    it("matches Channel ID ban even when name is empty and sanitizes keys with Firebase illegal chars", async () => {
      const fb = await import("firebase/database");
      const blacklistStore = useBlacklistStore();

      await expect(
        blacklistStore.banUser({ channelId: "", displayName: "   ", reason: "bad" }),
      ).rejects.toThrow();
      expect(fb.set).not.toHaveBeenCalled();

      await blacklistStore.banUser({
        channelId: "",
        displayName: "a.b#c",
        reason: "spam",
      });
      expect(fb.set).toHaveBeenCalledTimes(1);
      const [refArg] = fb.set.mock.calls[0];
      expect(refArg.path).not.toContain(".");
      expect(refArg.path).not.toContain("#");

      blacklistStore.blacklistMap = {
        a_b_c: {
          displayName: "a.b#c",
          normName: "a.b#c",
          channelId: "UC_CHANNEL_123",
          reason: "spam",
        },
      };

      expect(blacklistStore.isBanned("UC_CHANNEL_123", "")).toBe(true);
      expect(blacklistStore.isBanned(null, "a.b#c")).toBe(true);
    });

    it("preserves proxyCustomerName in chatStore.addMessage without overriding with admin nickname", () => {
      const chatStore = useChatStore();
      const nicknameStore = useNicknameStore();
      nicknameStore.nicknames = { admin_uid: "แอดมินชื่อจริง" };

      chatStore.addMessage({
        id: "m1",
        uid: "admin_uid",
        authorName: "มะระ",
        proxyCustomerName: "มะระ",
        text: "15 มะระ",
      });

      expect(chatStore.messages[0].authorName).toBe("มะระ");
    });
  });

  describe("Chat parser, TTS, address parser, smart answers", () => {
    it("parses multi-buy with leading verb + trailing customer name ('เอา 12 15 มะระ')", () => {
      const m = "เอา 12 15 มะระ".match(multiBuyRegex);
      expect(m).toBeTruthy();
      expect(extractAdminCustomerName("เอา 12 15 มะระ")).toBe("มะระ");
    });

    it("detects past Thai dates with 'วันที่' prefix without false positives on 'รอบ 2 เอา 15'", () => {
      const now = new Date(2026, 10, 24); // 24 พ.ย. 2026
      expect(isDateMismatch("วันที่ 3 ส.ค. 15", now)).toBe(true);
      expect(isDateMismatch("รอบ 2 เอา 15", now)).toBe(false);
    });

    it("preserves phone numbers containing 555 without turning them into laughter or leaking placeholders", () => {
      expect(replaceNumbersWithThaiWords("081-555-1234")).toBe("081-555-1234");
      expect(replaceNumbersWithThaiWords("โทร 081-555-1234 เบอร์ 15")).toBe(
        "โทร 081-555-1234 เบอร์ สิบห้า",
      );
    });

    it("does not mistake 5-digit house number after '/' as postal code and splits Name/Addr/Phone batches", () => {
      const parsed = parseSingleAddress(
        "สมศรี ใจดี 12/34567 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000 0812345678",
      );
      expect(parsed.postalCode).toBe("34000");

      const batch = parseMultipleAddresses(
        "สมชาย มั่งมี\n123 ม.1 ต.ในเมือง อ.เมือง จ.อุบลราชธานี 34000\n0811112222\nสมหญิง สวยงาม\n456 ม.2 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000\n0899998888",
      );
      expect(batch.length).toBe(2);
      expect(batch[0].recipientName).toContain("สมชาย");
      expect(batch[1].recipientName).toContain("สมหญิง");
    });

    it("formats ISO delivery date safely and finds dotted customer & addresses array in portfolio", () => {
      expect(formatSmartDeliveryDate("2026-12-15")).toContain("15");
      const portfolio = getCustomerStoredPortfolio("a.b", null, null, {
        deliveryByNormKey: {
          a_b: { name: "a.b", status: "pending", itemCount: 2, sessions: { v1: { count: 2, totalPrice: 160 } } },
        },
        addressBook: {
          a_b: {
            addresses: [{ address: "123 ถ.ชยางกูร อุบลราชธานี 34000" }],
          },
        },
      });
      expect(portfolio.hasAddress).toBe(true);
      expect(portfolio.totalAccumulatedCount).toBe(2);
    });
  });

  describe("YouTubeLiveChat & OfflineQueue lifecycle", () => {
    it("resets liveChatId/nextPageToken and increments pollGeneration on stopPolling()", () => {
      const yt = new YouTubeLiveChat(["KEY_1"], vi.fn(), vi.fn());
      yt.liveChatId = "OLD_CHAT";
      yt.nextPageToken = "OLD_TOKEN";
      yt.isPolling = true;
      const genBefore = yt.pollGeneration;

      yt.stopPolling();
      expect(yt.isPolling).toBe(false);
      expect(yt.liveChatId).toBeNull();
      expect(yt.nextPageToken).toBeNull();
      expect(yt.pollGeneration).toBe(genBefore + 1);
    });

    it("does not lose queued items when flushQueue runs without a processor, and drains items enqueued mid-flush", async () => {
      const oq = useOfflineQueue();
      oq.pendingQueue.value = [];
      oq.setProcessor(null);
      oq.isOnline.value = true;
      oq.enqueueAction("TEST_ACTION", { id: 1 });

      await oq.flushQueue();
      expect(oq.pendingQueue.value.length).toBe(1);

      const processed = [];
      oq.setProcessor(async (item) => {
        processed.push(item.payload.id);
        if (item.payload.id === 1) {
          oq.enqueueAction("TEST_ACTION", { id: 2 });
        }
      });

      await oq.flushQueue();
      expect(processed).toEqual([1, 2]);
      expect(oq.pendingQueue.value.length).toBe(0);
    });
  });
});

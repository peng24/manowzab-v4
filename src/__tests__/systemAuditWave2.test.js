import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

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

import { configureSwal } from "../utils/swalConfig";
import {
  parseISODateLocal,
  parseDDMMYYYYToISO,
  formatISOToDDMMYYYYBE,
  resolveDayMonthShippingDate,
  getLocalDiffDays,
} from "../utils/thaiDateUtils";
import { escapeHtml, sanitizeDbKey } from "../utils/dbUtils";
import { multiBuyRegex } from "../utils/chatParserUtils";
import { numberToThaiWords, replaceNumbersWithThaiWords } from "../utils/thaiNumberWords";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useBlacklistStore } from "../stores/blacklist";
import { useHistory } from "../composables/useHistory";
import { completeDelivery, restoreDelivery } from "../utils/deliveryActions";

describe("Full-System Bug & Animation Audit Regression Suite (Wave 1-3)", () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    localStorage.clear();
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

  describe("configureSwal (SweetAlert2 v11 toast mixin protection)", () => {
    it("detects Swal.mixin({ toast: true }) and strips popup-only options without mutating caller opts", () => {
      const receivedCalls = [];
      const MockSwal = {
        fire: vi.fn(function (...args) {
          receivedCalls.push(args[0]);
          return Promise.resolve({ isConfirmed: true });
        }),
        mixin(params) {
          const parent = this;
          const Mixed = {
            mixin: parent.mixin,
            fire(...args) {
              return parent.fire.apply(this, args);
            },
          };
          // Simulate SweetAlert2 v11 NOT exposing defaultParams natively
          void params;
          return Mixed;
        },
      };

      configureSwal(MockSwal);

      const Toast = MockSwal.mixin({ toast: true, position: "top-end" });
      const callerOpts = { title: "บันทึกแล้ว", allowOutsideClick: true };
      Toast.fire(callerOpts);

      expect(callerOpts.allowOutsideClick).toBe(true); // caller object untouched
      expect(receivedCalls[0]).toMatchObject({ title: "บันทึกแล้ว" });
      expect(receivedCalls[0].allowOutsideClick).toBeUndefined();
      expect(receivedCalls[0].showCloseButton).toBeUndefined();
      expect(receivedCalls[0].heightAuto).toBeUndefined();

      // Normal modal still gets defaults
      MockSwal.fire({ title: "ยืนยัน" });
      expect(receivedCalls[1]).toMatchObject({
        title: "ยืนยัน",
        heightAuto: false,
        returnFocus: false,
        showCloseButton: true,
        allowOutsideClick: true,
      });
    });
  });

  describe("thaiDateUtils (Buddhist Era & local-calendar safety)", () => {
    it("converts 2-digit Thai BE years (69 -> 2026) and rejects invalid calendar dates", () => {
      expect(parseDDMMYYYYToISO("26/11/69")).toBe("2026-11-26");
      expect(parseDDMMYYYYToISO("26/11/2569")).toBe("2026-11-26");
      expect(parseDDMMYYYYToISO("26/11/26")).toBe("2026-11-26");
      expect(parseDDMMYYYYToISO("26/11/2026")).toBe("2026-11-26");
      expect(parseDDMMYYYYToISO("31/02/2569")).toBeNull();
      expect(parseDDMMYYYYToISO("32/11/2569")).toBeNull();
      expect(parseDDMMYYYYToISO("26/13/69")).toBeNull();
      expect(formatISOToDDMMYYYYBE("2026-11-26")).toBe("26/11/2569");
    });

    it("resolves day 31 in a 31-day target month without 30-day rollover bug", () => {
      // Called on Nov 26 (30-day month) requesting Dec 31
      const nov26 = new Date(2026, 10, 26);
      const dec31 = resolveDayMonthShippingDate(31, "ธ.ค.", nov26);
      expect(dec31).not.toBeNull();
      expect(dec31.getFullYear()).toBe(2026);
      expect(dec31.getMonth()).toBe(11);
      expect(dec31.getDate()).toBe(31);
    });

    it("rolls explicit past month to next year (e.g. '5 ม.ค.' spoken in Nov)", () => {
      const nov26 = new Date(2026, 10, 26);
      const jan5 = resolveDayMonthShippingDate(5, "ม.ค.", nov26);
      expect(jan5).not.toBeNull();
      expect(jan5.getFullYear()).toBe(2027);
      expect(jan5.getMonth()).toBe(0);
      expect(jan5.getDate()).toBe(5);
    });

    it("computes local diff days accurately without UTC midnight drift", () => {
      const nov26 = new Date(2026, 10, 26, 23, 55, 0);
      expect(getLocalDiffDays("2026-11-26", nov26)).toBe(0);
      expect(getLocalDiffDays("2026-11-27", nov26)).toBe(1);
      expect(getLocalDiffDays("2026-11-25", nov26)).toBe(-1);
      expect(parseISODateLocal("2026-02-30")).toBeNull();
    });
  });

  describe("Parser, ReDoS & Thai number speech integrity", () => {
    it("evaluates multiBuyRegex in linear time on adversarial whitespace input (no ReDoS)", () => {
      const evil = "1" + " ".repeat(35) + "2!";
      const t0 = performance.now();
      const matched = multiBuyRegex.test(evil);
      const elapsed = performance.now() - t0;
      expect(matched).toBe(false);
      expect(elapsed).toBeLessThan(50);
    });

    it("does not corrupt spaced prices like 'ราคา 100 120 150' as a phone number", () => {
      const out = replaceNumbersWithThaiWords("ราคา 100 120 150");
      expect(out).toContain("หนึ่งร้อย");
      expect(out).toContain("หนึ่งร้อยยี่สิบ");
      expect(out).toContain("หนึ่งร้อยห้าสิบ");
    });

    it("converts numbers >= 10,000,000 recursively into Thai words", () => {
      expect(numberToThaiWords(10000000)).toBe("สิบล้าน");
      expect(numberToThaiWords(25000000)).toBe("ยี่สิบห้าล้าน");
    });
  });

  describe("dbUtils & Firebase root-safety guards", () => {
    it("escapeHtml(0) returns '0' and sanitizeDbKey strips control characters", () => {
      expect(escapeHtml(0)).toBe("0");
      expect(escapeHtml("<b>&\"'</b>")).toBe("&lt;b&gt;&amp;&quot;&#039;&lt;/b&gt;");
      expect(sanitizeDbKey("abc\x00\x1F.#$[]/def")).toBe("abc________def");
    });

    it("stockStore.connectToStock('') never subscribes to root stock/ node", async () => {
      const fb = await import("firebase/database");
      const stockStore = useStockStore();
      stockStore.connectToStock("");
      stockStore.connectToStock("   ");
      expect(fb.onValue).not.toHaveBeenCalled();
    });

    it("deliveryActions reject missing/empty customer.id without writing to root delivery_customers/", async () => {
      const fb = await import("firebase/database");
      await expect(completeDelivery({ id: "" }, {})).rejects.toThrow();
      await expect(restoreDelivery({ id: "   " }, {})).rejects.toThrow();
      expect(fb.update).not.toHaveBeenCalled();
    });

    it("useHistory.deleteMultipleHistory ignores empty/invalid videoIds and protects root nodes", async () => {
      const fb = await import("firebase/database");
      const { deleteMultipleHistory } = useHistory();
      await deleteMultipleHistory(["", "   ", null, "bad/id"]);
      expect(fb.remove).not.toHaveBeenCalled();
      expect(fb.update).not.toHaveBeenCalled();
    });

    it("useHistory.getCleanupPreview skips timestamp=0 entries and active live video", async () => {
      const fb = await import("firebase/database");
      const systemStore = useSystemStore();
      systemStore.currentVideoId = "ACTIVE_LIVE_1";
      const oldTs = Date.now() - 120 * 86400000;
      fb.get.mockImplementation(async (refObj) => {
        if (refObj?.path === "history") {
          return {
            exists: () => true,
            val: () => ({
              ACTIVE_LIVE_1: { timestamp: oldTs },
              MISSING_TS: { timestamp: 0 },
              OLD_EXPIRED: { timestamp: oldTs },
            }),
          };
        }
        return { exists: () => false, val: () => null };
      });
      const { getCleanupPreview } = useHistory();
      const preview = await getCleanupPreview();
      expect(preview.olderLives.map((h) => h.videoId)).toEqual(["OLD_EXPIRED"]);
    });

    it("blacklistStore.getBanInfo and unbanUser ignore blank/invalid keys safely", async () => {
      const fb = await import("firebase/database");
      const blacklistStore = useBlacklistStore();
      blacklistStore.blacklist = { invalid_key: { displayName: "bad" } };
      expect(blacklistStore.getBanInfo("", "")).toBeNull();
      await blacklistStore.unbanUser("");
      expect(fb.remove).not.toHaveBeenCalled();
    });
  });
});

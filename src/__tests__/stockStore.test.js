import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useStockStore } from "../stores/stock";

// Mock window and Audio Context for celebration audio
if (typeof window === "undefined") {
  global.window = global;
}

// Mock localStorage if running in Node environment
if (typeof localStorage === "undefined" || !localStorage.getItem) {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); }
  };
}

// Mock Firebase Realtime Database methods
vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn((ref, callback) => {
    // Execute callback with empty snapshot to simulate Firebase initial load
    callback({ val: () => ({}) });
    return vi.fn();
  }),
  set: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {}
}));

describe("Stock Store", () => {
  beforeEach(() => {
    // ✅ Always reset Pinia environment before each test case
    setActivePinia(createPinia());
  });

  it("initializes with default stock size", () => {
    const stockStore = useStockStore();
    expect(stockStore.stockSize).toBeGreaterThan(0);
    expect(stockStore.stockData).toEqual({});
  });

  it("allows setting stock size and updating state", () => {
    const stockStore = useStockStore();
    stockStore.stockSize = 100;
    expect(stockStore.stockSize).toBe(100);
  });

  it("resets milestones upon new connection", () => {
    const stockStore = useStockStore();
    stockStore.milestones = { fifty: true, eighty: true, hundred: true };
    stockStore.connectToStock("test_video_123");
    expect(stockStore.milestones).toEqual({ fifty: false, eighty: false, hundred: false });
  });

  describe("findMostRecentItemForUser with 1-minute time limit", () => {
    it("returns latest item if booked within 1 minute (60,000 ms)", () => {
      const stockStore = useStockStore();
      const now = 1000000;
      stockStore.stockData = {
        5: { owner: "Somchai", uid: "user-1", time: now - 30000 } // booked 30s ago
      };

      const result = stockStore.findMostRecentItemForUser("user-1", "Somchai", 60000, now);
      expect(result).toBe(5);
    });

    it("returns null if latest booking was made more than 1 minute ago", () => {
      const stockStore = useStockStore();
      const now = 1000000;
      stockStore.stockData = {
        5: { owner: "Somchai", uid: "user-1", time: now - 70000 } // booked 70s ago (> 1 min)
      };

      const result = stockStore.findMostRecentItemForUser("user-1", "Somchai", 60000, now);
      expect(result).toBeNull();
    });

    it("returns the recent item when user has older and newer bookings", () => {
      const stockStore = useStockStore();
      const now = 1000000;
      stockStore.stockData = {
        10: { owner: "Somchai", uid: "user-1", time: now - 120000 }, // 2 mins ago
        15: { owner: "Somchai", uid: "user-1", time: now - 20000 }    // 20s ago
      };

      const result = stockStore.findMostRecentItemForUser("user-1", "Somchai", 60000, now);
      expect(result).toBe(15);
    });

    it("returns recent item when user is in queue within 1 minute", () => {
      const stockStore = useStockStore();
      const now = 1000000;
      stockStore.stockData = {
        20: { owner: "OtherUser", uid: "user-2", queue: [{ owner: "Somchai", uid: "user-1", time: now - 45000 }] }
      };

      const result = stockStore.findMostRecentItemForUser("user-1", "Somchai", 60000, now);
      expect(result).toBe(20);
    });
  });
});

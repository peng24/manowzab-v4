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
});

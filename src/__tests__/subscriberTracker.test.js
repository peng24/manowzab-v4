import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSystemStore } from "../stores/system";

// Mock window and localStorage if running in Node environment
if (typeof window === "undefined") {
  global.window = global;
}

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
  onValue: vi.fn(() => vi.fn()),
  set: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {}
}));

describe("System Store - Subscriber Tracking", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("initializes subscriberCount state as 0", () => {
    const systemStore = useSystemStore();
    expect(systemStore.subscriberCount).toBe(0);
  });

  it("allows setting subscriber count state", () => {
    const systemStore = useSystemStore();
    systemStore.subscriberCount = 1250;
    expect(systemStore.subscriberCount).toBe(1250);
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useBlacklistStore } from "../stores/blacklist";

// Mock Firebase Realtime Database
const mockDbData = {};

vi.mock("firebase/database", () => {
  return {
    ref: vi.fn((db, path) => ({ path })),
    onValue: vi.fn((r, callback) => {
      // Mock initial snapshot
      callback({
        val: () => mockDbData[r.path] || null,
      });
      return vi.fn();
    }),
    set: vi.fn(async (r, val) => {
      mockDbData[r.path] = val;
    }),
    remove: vi.fn(async (r) => {
      delete mockDbData[r.path];
    }),
    serverTimestamp: vi.fn(() => Date.now()),
  };
});

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

describe("🛡️ Blacklist Store (useBlacklistStore)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Clear mock data
    for (const key in mockDbData) {
      delete mockDbData[key];
    }
  });

  it("identifies unbanned user as not banned", () => {
    const store = useBlacklistStore();
    expect(store.isBanned("user-123", "สมชาย")).toBe(false);
  });

  it("bans a user by channelId and displayName, and verifies isBanned()", async () => {
    const store = useBlacklistStore();
    
    // Simulate setting initial map
    store.blacklistMap = {
      "channel_abc": {
        channelId: "channel_abc",
        uid: "channel_abc",
        displayName: "สมชาย ใจดี",
        normName: "สมชายใจดี",
        reason: "CF แล้วไม่โอน",
        bannedAt: Date.now(),
        bannedBy: "แอดมิน",
      },
    };

    // Check by uid
    expect(store.isBanned("channel_abc", null)).toBe(true);
    // Check by name
    expect(store.isBanned(null, "สมชาย ใจดี")).toBe(true);
    // Check by normName match
    expect(store.isBanned(null, "สมชายใจดี")).toBe(true);
    // Unrelated user
    expect(store.isBanned("other_user", "สมหญิง")).toBe(false);
  });

  it("retrieves ban details with getBanInfo()", () => {
    const store = useBlacklistStore();
    const mockEntry = {
      channelId: "channel_xyz",
      uid: "channel_xyz",
      displayName: "นายกวน",
      normName: "นายกวน",
      reason: "ก่อกวนในไลฟ์",
      bannedAt: 1700000000000,
      bannedBy: "Admin",
    };
    store.blacklistMap = {
      "channel_xyz": mockEntry,
    };

    const info = store.getBanInfo("channel_xyz", "นายกวน");
    expect(info).toBeDefined();
    expect(info.reason).toBe("ก่อกวนในไลฟ์");
    expect(info.bannedBy).toBe("Admin");
  });

  it("adds a ban record using banUser()", async () => {
    const store = useBlacklistStore();
    const payload = await store.banUser({
      channelId: "channel_999",
      displayName: "คุณสมหมาย",
      reason: "ไม่โอนเงิน",
      bannedBy: "แอดมินมิว",
    });

    expect(payload.displayName).toBe("คุณสมหมาย");
    expect(payload.reason).toBe("ไม่โอนเงิน");
    expect(payload.bannedBy).toBe("แอดมินมิว");
    expect(mockDbData["settings/blacklist/channel_999"]).toBeDefined();
  });

  it("removes a ban record using unbanUser()", async () => {
    const store = useBlacklistStore();
    store.blacklistMap = {
      "channel_999": {
        channelId: "channel_999",
        displayName: "คุณสมหมาย",
        normName: "คุณสมหมาย",
      },
    };
    mockDbData["settings/blacklist/channel_999"] = store.blacklistMap["channel_999"];

    await store.unbanUser("channel_999");
    expect(mockDbData["settings/blacklist/channel_999"]).toBeUndefined();
  });

  it("computes blacklistArray sorted by bannedAt descending", () => {
    const store = useBlacklistStore();
    store.blacklistMap = {
      "u1": { displayName: "User 1", bannedAt: 1000 },
      "u2": { displayName: "User 2", bannedAt: 3000 },
      "u3": { displayName: "User 3", bannedAt: 2000 },
    };

    const arr = store.blacklistArray;
    expect(arr.length).toBe(3);
    expect(arr[0].displayName).toBe("User 2"); // newest
    expect(arr[1].displayName).toBe("User 3");
    expect(arr[2].displayName).toBe("User 1"); // oldest
    expect(store.blacklistCount).toBe(3);
  });

  it("handles space-agnostic Thai name matching reliably", () => {
    const store = useBlacklistStore();
    store.blacklistMap = {
      "สมชาย ใจดี": {
        displayName: "สมชาย ใจดี",
        normName: "สมชาย ใจดี",
        reason: "CF แล้วไม่โอน",
      },
    };

    // User types without space
    expect(store.isBanned(null, "สมชายใจดี")).toBe(true);
    // User types with space
    expect(store.isBanned(null, "สมชาย ใจดี")).toBe(true);
    // User types with multiple spaces
    expect(store.isBanned(null, "สมชาย   ใจดี")).toBe(true);
  });
});

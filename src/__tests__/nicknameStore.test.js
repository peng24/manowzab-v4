import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

import { useNicknameStore } from "../stores/nickname";

describe("useNicknameStore proxy & manual booking isolation", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("never lets stale nicknames/<plainName> override manual or admin-proxy bookings", () => {
    const store = useNicknameStore();
    store.nicknames = {
      "กุ้ง": { nick: "พี่กวาง", realName: "กุ้ง", updatedAt: 1794320275275 },
      "manual": { nick: "พี่กวาง", realName: "manual" },
      "multi-proxy-1794320083374-tcwfa": { nick: "พี่กวาง", realName: "กุ้ง" },
      "UCbD8q2Z_m2QHARJK7Xv0f7w": { nick: "กุ้ง", realName: "@DsHd-x2h" },
      "@DsHd-x2h": { nick: "กุ้ง", realName: "@DsHd-x2h" },
    };

    // New manual or admin-proxy booking for "กุ้ง" MUST stay "กุ้ง"
    expect(store.getNickname("manual-1795787999999", "กุ้ง")).toBe("กุ้ง");
    expect(store.getNickname("proxy-1795787999999-abc12", "กุ้ง")).toBe("กุ้ง");
    expect(store.getNickname("multi-proxy-1795787999999-xyz99", "กุ้ง")).toBe("กุ้ง");
    expect(store.getNickname("admin-proxy-1795787999999-zz1", "กุ้ง")).toBe("กุ้ง");
    expect(store.getNickname("manual", "กุ้ง")).toBe("กุ้ง");
    expect(store.hasNickname("manual-1795787999999", "กุ้ง")).toBe(false);
    expect(store.hasNickname("proxy-1795787999999-abc12", "กุ้ง")).toBe(false);
    expect(store.hasNickname("manual", "กุ้ง")).toBe(false);

    // Specific legacy proxy UID mapping still resolves for that historical booking only
    expect(store.getNickname("multi-proxy-1794320083374-tcwfa", "กุ้ง")).toBe("พี่กวาง");
    expect(store.hasNickname("multi-proxy-1794320083374-tcwfa", "กุ้ง")).toBe(true);

    // Real YouTube UIDs and @handles continue to resolve normally
    expect(store.getNickname("UCbD8q2Z_m2QHARJK7Xv0f7w", "@DsHd-x2h")).toBe("กุ้ง");
    expect(store.getNickname("manual-1795787999999", "@DsHd-x2h")).toBe("กุ้ง");
    expect(store.hasNickname("UCbD8q2Z_m2QHARJK7Xv0f7w", "@DsHd-x2h")).toBe(true);
    expect(store.hasNickname("manual-1795787999999", "@DsHd-x2h")).toBe(true);
  });
});

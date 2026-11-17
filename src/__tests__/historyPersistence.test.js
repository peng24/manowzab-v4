import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const mockUpdate = vi.fn().mockResolvedValue(true);
const mockGet = vi.fn();

vi.mock("firebase/database", () => ({
  ref: vi.fn((_db, path) => ({ path })),
  get: (...args) => mockGet(...args),
  update: (...args) => mockUpdate(...args),
  remove: vi.fn().mockResolvedValue(true),
  child: vi.fn(),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

import { useHistory } from "../composables/useHistory";

describe("useHistory title persistence & historical chat retrieval", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockUpdate.mockClear();
    mockGet.mockReset();
    vi.stubEnv("VITE_YOUTUBE_API_KEYS", "test-yt-key");
  });

  it("updates and stores history/{videoId}/title cleanly in memory and Firebase", async () => {
    const history = useHistory();
    history.historyList.value = [{ videoId: "vid123", title: "ไม่มีชื่อ", timestamp: 1700000000000 }];

    const saved = await history.updateHistoryTitle("vid123", "  🔴 ไลฟ์สด เสื้อสาวอวบ วันที่ 17  ");
    expect(saved).toBe("🔴 ไลฟ์สด เสื้อสาวอวบ วันที่ 17");
    expect(mockUpdate).toHaveBeenCalledWith(
      { path: "history/vid123" },
      expect.objectContaining({ title: "🔴 ไลฟ์สด เสื้อสาวอวบ วันที่ 17" }),
    );
    expect(history.historyList.value[0].title).toBe("🔴 ไลฟ์สด เสื้อสาวอวบ วันที่ 17");
  });

  it("syncMissingHistoryTitle fetches YouTube title without overwriting existing timestamp", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            snippet: {
              title: "🔴 ไลฟ์สด 15 พฤศจิกายน 69 มะนาวแซ่บ | เสื้อสาวอวบมือสอง",
              publishedAt: "2026-11-15T12:00:00Z",
            },
            liveStreamingDetails: {
              actualStartTime: "2026-11-15T13:00:00Z",
            },
          },
        ],
      }),
    });

    mockGet.mockResolvedValue({
      exists: () => true,
      val: () => ({ timestamp: 1794747600000, totalSales: 830 }),
    });

    try {
      const history = useHistory();
      history.historyList.value = [{ videoId: "vid456", title: "", timestamp: 1794747600000 }];

      const res = await history.syncMissingHistoryTitle("vid456");
      expect(res.title).toBe("🔴 ไลฟ์สด 15 พฤศจิกายน 69 มะนาวแซ่บ | เสื้อสาวอวบมือสอง");
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdate.mock.calls[0][1];
      expect(updatePayload.title).toBe("🔴 ไลฟ์สด 15 พฤศจิกายน 69 มะนาวแซ่บ | เสื้อสาวอวบมือสอง");
      expect(updatePayload.timestamp).toBeUndefined();
      expect(history.historyList.value[0].title).toBe("🔴 ไลฟ์สด 15 พฤศจิกายน 69 มะนาวแซ่บ | เสื้อสาวอวบมือสอง");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("fetchHistoryChats filters out price announcement messages and sorts ascending", async () => {
    mockGet.mockResolvedValue({
      exists: () => true,
      val: () => ({
        m2: { id: "m2", displayName: "พรพรรณ", text: "29", type: "buy", timestamp: 2000 },
        m_price: { id: "ai-price-29", displayName: "ตรวจจับราคา 🎙️", text: "[AI ตั้งราคา] สินค้า 29 ราคา 50 บาท", type: "price_update", timestamp: 1500 },
        m1: { id: "m1", displayName: "นิชา", text: "สวัสดีค่ะ", type: "general", timestamp: 1000 },
      }),
    });

    const history = useHistory();
    const chats = await history.fetchHistoryChats("vid123");
    expect(chats.map((c) => c.id)).toEqual(["m1", "m2"]);
  });
});

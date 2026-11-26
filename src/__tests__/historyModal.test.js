import { describe, it, expect, beforeEach, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia } from "pinia";

if (typeof window === "undefined") {
  global.window = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}
if (typeof document === "undefined") {
  global.document = {
    body: { offsetWidth: 1024 },
  };
}
if (typeof localStorage === "undefined" || !localStorage.getItem) {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}
if (typeof requestAnimationFrame === "undefined") {
  global.requestAnimationFrame = vi.fn(() => 1);
  global.cancelAnimationFrame = vi.fn();
}

vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
  get: vi.fn().mockResolvedValue({ exists: () => false, val: () => ({}) }),
  set: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

vi.mock("../composables/useHistory", () => ({
  useHistory: () => ({
    historyList: { value: [] },
    isLoading: { value: false },
    fetchHistoryList: vi.fn(),
    fetchHistoryDetails: vi.fn().mockResolvedValue({ orders: {}, stockSize: 70 }),
    fetchHistoryChats: vi.fn().mockResolvedValue([]),
    updateHistoryTitle: vi.fn().mockResolvedValue("Test Title"),
    syncMissingHistoryTitle: vi.fn().mockResolvedValue(null),
    deleteHistory: vi.fn(),
    recalculateAllHistory: vi.fn(),
  }),
}));

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
    isVisible: vi.fn(() => false),
    close: vi.fn(),
  },
}));

import HistoryModal from "../components/HistoryModal.vue";
import {
  formatChatClockTime,
  getCustomerRowColor,
  getChatRowStyle,
  renderAdminProxyHtml,
} from "../utils/chatDisplayUtils";

describe("HistoryModal mount & setup regression", () => {
  let pinia;

  beforeEach(() => {
    pinia = createPinia();
  });

  it("renders cleanly without ReferenceError (e.g. allOrders is not defined) when opened", async () => {
    const app = createSSRApp(HistoryModal);
    app.use(pinia);

    let html = "";
    let caughtError = null;
    app.config.errorHandler = (err) => {
      caughtError = err;
    };

    html = await renderToString(app);
    expect(caughtError).toBeNull();
    expect(html).toContain("ประวัติการขาย (History)");
    expect(html).toContain("รายการย้อนหลัง");
    expect(html).toContain("ค้นหาชื่อไลฟ์");
    expect(html).toContain("เลือกไลฟ์ย้อนหลังที่ต้องการดู");
    expect(html).toContain("เลือกไลฟ์");
  });
});

describe("chatDisplayUtils shared Hybrid chat helpers", () => {
  it("generates deterministic personal HSL gradients for different customers", () => {
    const c1 = getCustomerRowColor({ realName: "พรพรรณ" });
    const c2 = getCustomerRowColor({ realName: "พรพรรณ" });
    const c3 = getCustomerRowColor({ realName: "อาทิตย์ยา" });
    expect(c1).toBe(c2);
    expect(c1).not.toBe(c3);
    expect(c1).toMatch(/^hsl\(\d+, 76%, 64%\)$/);
  });

  it("builds Hybrid row styles with semantic left borders", () => {
    const buyStyle = getChatRowStyle({ type: "buy", realName: "พรพรรณ" });
    expect(buyStyle.borderLeft).toBe("4.5px solid #10b981");
    expect(buyStyle.background).toContain("linear-gradient(");

    const cancelStyle = getChatRowStyle({ type: "cancel", realName: "พรพรรณ" });
    expect(cancelStyle.borderLeft).toBe("4.5px solid #f43f5e");

    const adminStyle = getChatRowStyle({ type: "buy", isAdmin: true, realName: "มะนาว" });
    expect(adminStyle.borderLeft).toBe("4.5px solid #10b981");
  });

  it("highlights admin proxy customer name safely and formats clock time", () => {
    const html = renderAdminProxyHtml({ text: "พี่กุ้ง 15", type: "buy" }, "พี่กุ้ง");
    expect(html).toContain("chat-highlight-name");
    expect(html).toContain("พี่กุ้ง");
    expect(formatChatClockTime(0)).toBe("");
    expect(formatChatClockTime(Date.UTC(2026, 10, 16, 12, 5, 0))).toMatch(/^\d{2}:\d{2}$/);
  });
});

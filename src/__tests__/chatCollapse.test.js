import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock localStorage
if (typeof localStorage === "undefined" || !localStorage.getItem) {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

// Mock Firebase Realtime Database methods
vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
  get: vi.fn().mockResolvedValue({ exists: () => false, val: () => ({}) }),
  update: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
  push: vi.fn().mockResolvedValue(true),
  query: vi.fn(),
  limitToLast: vi.fn(),
  onChildAdded: vi.fn(() => vi.fn()),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {}
}));

// Mock audio
vi.mock("../composables/useAudio", () => ({
  useAudio: () => ({
    queueAudio: vi.fn(),
    playSfx: vi.fn(),
    resetVoice: vi.fn(),
  })
}));

describe("Live Chat Collapsible Feature", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("defaults to chat visible (isChatCollapsed = false) when no preference is saved", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.isChatCollapsed).toBe(false);
  });

  it("toggles chat collapse state and persists to localStorage", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.isChatCollapsed).toBe(false);

    // 1. Collapse
    systemStore.toggleChatCollapse();
    expect(systemStore.isChatCollapsed).toBe(true);
    expect(localStorage.getItem("manowzab_chat_collapsed")).toBe("true");

    // 2. Expand
    systemStore.toggleChatCollapse();
    expect(systemStore.isChatCollapsed).toBe(false);
    expect(localStorage.getItem("manowzab_chat_collapsed")).toBe("false");
  });

  it("sets chat collapsed explicitly with setChatCollapsed", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    systemStore.setChatCollapsed(true);
    expect(systemStore.isChatCollapsed).toBe(true);
    expect(localStorage.getItem("manowzab_chat_collapsed")).toBe("true");

    systemStore.setChatCollapsed(false);
    expect(systemStore.isChatCollapsed).toBe(false);
    expect(localStorage.getItem("manowzab_chat_collapsed")).toBe("false");
  });

  it("tracks unread messages when collapsed and resets when expanded", async () => {
    const { useSystemStore } = await import("../stores/system");
    const { useChatStore } = await import("../stores/chat");

    const systemStore = useSystemStore();
    const chatStore = useChatStore();

    expect(chatStore.unreadCollapsedCount).toBe(0);

    // When chat is open, new messages don't increment unreadCollapsedCount
    systemStore.setChatCollapsed(false);
    chatStore.addMessage({
      id: "msg-1",
      authorName: "Alice",
      text: "สวัสดีค่ะ",
      timestamp: Date.now(),
    });
    expect(chatStore.unreadCollapsedCount).toBe(0);

    // When chat is collapsed, new messages increment unreadCollapsedCount
    systemStore.setChatCollapsed(true);
    chatStore.addMessage({
      id: "msg-2",
      authorName: "Bob",
      text: "01",
      timestamp: Date.now(),
    });
    expect(chatStore.unreadCollapsedCount).toBe(1);

    chatStore.addMessage({
      id: "msg-3",
      authorName: "Charlie",
      text: "02",
      timestamp: Date.now(),
    });
    expect(chatStore.unreadCollapsedCount).toBe(2);

    // Resetting unread count
    chatStore.resetUnreadCollapsed();
    expect(chatStore.unreadCollapsedCount).toBe(0);
  });
});

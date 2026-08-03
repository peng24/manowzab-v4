import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useStockStore } from "../stores/stock";
import { useAiWebSocket } from "../composables/useAiWebSocket";

// Mock window and localStorage for Node test environment
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

// Mock Firebase Realtime Database
vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
  set: vi.fn().mockResolvedValue(true),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

// Mock WebSocket class
class MockWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
    MockWebSocket.instances.push(this);
  }

  // Helper method for tests to simulate open connection
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) this.onopen();
  }

  // Helper method for tests to simulate receiving message
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: typeof data === "string" ? data : JSON.stringify(data) });
    }
  }

  // Helper method for tests to simulate error
  simulateError(err = new Error("WebSocket error")) {
    if (this.onerror) this.onerror(err);
  }

  // Helper method for tests to simulate close
  simulateClose(code = 1000, reason = "") {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code, reason });
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose({ code: 1000, reason: "Normal closure" });
  }
}

MockWebSocket.CONNECTING = 0;
MockWebSocket.OPEN = 1;
MockWebSocket.CLOSING = 2;
MockWebSocket.CLOSED = 3;

describe("useAiWebSocket Composable", () => {
  let originalWebSocket;

  beforeEach(() => {
    setActivePinia(createPinia());
    MockWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket;
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.useRealTimers();
  });

  it("connects to ws://localhost:8765 by default and updates status", () => {
    const { isConnected, status } = useAiWebSocket({ autoStart: true });

    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toBe("ws://localhost:8765");
    expect(status.value).toBe("connecting");
    expect(isConnected.value).toBe(false);

    // Simulate socket opening
    MockWebSocket.instances[0].simulateOpen();

    expect(status.value).toBe("connected");
    expect(isConnected.value).toBe(true);
  });

  it("updates stock price in stockStore upon receiving valid JSON message", () => {
    const stockStore = useStockStore();
    const updateSpy = vi.spyOn(stockStore, "updateStockPrice");

    useAiWebSocket({ autoStart: true });
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    // Send valid JSON message: { item: 3, price: 150 }
    ws.simulateMessage({ item: 3, price: 150 });

    expect(updateSpy).toHaveBeenCalledWith(3, 150, true);
    expect(stockStore.stockData[3]?.price).toBe(150);
  });

  it("ignores malformed JSON or invalid item/price payloads without throwing errors", () => {
    const stockStore = useStockStore();
    const updateSpy = vi.spyOn(stockStore, "updateStockPrice");

    useAiWebSocket({ autoStart: true });
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    // 1. Non-JSON string
    expect(() => ws.simulateMessage("Hello AI")).not.toThrow();

    // 2. Missing fields or invalid values
    ws.simulateMessage({ item: -1, price: 100 });
    ws.simulateMessage({ item: "abc", price: 100 });
    ws.simulateMessage({ price: 100 });

    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("attempts automatic reconnection after connection closes", () => {
    const { isConnected, status } = useAiWebSocket({ reconnectInterval: 3000 });
    const initialWs = MockWebSocket.instances[0];
    initialWs.simulateOpen();

    expect(isConnected.value).toBe(true);

    // Simulate unexpected drop
    initialWs.simulateClose(1006, "Abnormal Closure");

    expect(isConnected.value).toBe(false);
    expect(status.value).toBe("disconnected");

    // Fast forward timer by 3000ms
    vi.advanceTimersByTime(3000);

    // Reconnection should spawn a second MockWebSocket instance
    expect(MockWebSocket.instances.length).toBe(2);
  });

  it("stops reconnecting when disconnect() is called explicitly", () => {
    const { disconnect } = useAiWebSocket({ reconnectInterval: 3000 });
    const ws = MockWebSocket.instances[0];
    ws.simulateOpen();

    disconnect();

    expect(ws.readyState).toBe(MockWebSocket.CLOSED);

    // Fast forward time
    vi.advanceTimersByTime(5000);

    // No new connection should be established
    expect(MockWebSocket.instances.length).toBe(1);
  });
});

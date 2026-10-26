import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";
import fs from "fs";
import path from "path";

// Mock minimal DOM for Node test runner
function createMockElement(tag = "div") {
  return {
    tagName: tag.toUpperCase(),
    className: "",
    parentNode: null,
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    scrollTo: vi.fn(),
    scrollIntoView: vi.fn(),
    hasAttribute: vi.fn().mockReturnValue(false),
    getAttribute: vi.fn().mockReturnValue(null),
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    clientHeight: 600,
    scrollHeight: 1200,
    clientWidth: 800,
    scrollWidth: 800
  };
}

global.window = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  matchMedia: vi.fn().mockReturnValue({ matches: false }),
  innerWidth: 1024,
  innerHeight: 768
};

global.document = {
  createElement: vi.fn(createMockElement),
  documentElement: createMockElement("html"),
  body: createMockElement("body")
};

global.HTMLElement = class {};
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};
global.MutationObserver = class {
  observe = vi.fn();
  disconnect = vi.fn();
};

// Mock Lenis class
const mockLenisInstance = {
  resize: vi.fn(),
  scrollTo: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
};

vi.mock("lenis", () => {
  return {
    default: vi.fn().mockImplementation(function (options) {
      this.options = options;
      this.resize = mockLenisInstance.resize;
      this.scrollTo = mockLenisInstance.scrollTo;
      this.start = mockLenisInstance.start;
      this.stop = mockLenisInstance.stop;
      this.destroy = mockLenisInstance.destroy;
      this.on = mockLenisInstance.on;
      this.off = mockLenisInstance.off;
    })
  };
});

// Import composable after DOM mocks
import { useSmoothScroll, vSmoothScroll } from "../composables/useSmoothScroll";

describe("useSmoothScroll Composable", () => {
  let mockEl;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEl = createMockElement("div");
    mockEl.className = "test-scroll-container";
  });

  it("initializes Lenis with wrapper, content, and default options", () => {
    const elRef = ref(mockEl);
    const { lenis } = useSmoothScroll(elRef, { duration: 0.8 });

    expect(lenis.value).toBeDefined();
    expect(lenis.value.options.wrapper).toStrictEqual(mockEl);
    expect(lenis.value.options.content).toStrictEqual(mockEl);
    expect(lenis.value.options.duration).toBe(0.8);
    expect(lenis.value.options.autoRaf).toBe(true);
    expect(lenis.value.options.smoothWheel).toBe(true);
  });

  it("delegates scrollTo to Lenis instance", () => {
    const elRef = ref(mockEl);
    const { scrollTo } = useSmoothScroll(elRef);

    const targetEl = createMockElement("div");
    scrollTo(targetEl, { offset: -50, duration: 1 });

    expect(mockLenisInstance.scrollTo).toHaveBeenCalledWith(targetEl, { offset: -50, duration: 1 });
  });

  it("delegates resize, start, stop, and destroy methods", () => {
    const elRef = ref(mockEl);
    const scroll = useSmoothScroll(elRef);

    scroll.resize();
    expect(mockLenisInstance.resize).toHaveBeenCalled();

    scroll.start();
    expect(mockLenisInstance.start).toHaveBeenCalled();

    scroll.stop();
    expect(mockLenisInstance.stop).toHaveBeenCalled();

    scroll.destroy();
    expect(mockLenisInstance.destroy).toHaveBeenCalled();
    expect(scroll.lenis.value).toBeNull();
  });

  it("falls back gracefully when Lenis is not available", () => {
    const elRef = ref(null);
    const { scrollTo } = useSmoothScroll(elRef);

    const fallbackEl = createMockElement("div");
    expect(() => scrollTo(fallbackEl)).not.toThrow();
  });
});

describe("vSmoothScroll Directive", () => {
  let el;

  beforeEach(() => {
    vi.clearAllMocks();
    el = createMockElement("div");
  });

  it("attaches Lenis on mounted and cleans up on unmounted", () => {
    vSmoothScroll.mounted(el, { value: { duration: 1.2 } });
    expect(el.__lenis__).toBeDefined();

    vSmoothScroll.unmounted(el);
    expect(mockLenisInstance.destroy).toHaveBeenCalled();
    expect(el.__lenis__).toBeUndefined();
  });
});

describe("Lenis Integration & Guard Invariants", () => {
  it("ensures ChatPanel.vue protects #chat-viewport with data-lenis-prevent", () => {
    const chatPanelPath = path.resolve(__dirname, "../components/ChatPanel.vue");
    const content = fs.readFileSync(chatPanelPath, "utf-8");

    expect(content).toContain('id="chat-viewport"');
    expect(content).toContain("data-lenis-prevent");
  });

  it("ensures ShippingManager.vue protects .sm-table-wrap with data-lenis-prevent", () => {
    const smPath = path.resolve(__dirname, "../components/ShippingManager.vue");
    const content = fs.readFileSync(smPath, "utf-8");

    expect(content).toContain('class="sm-table-wrap" data-lenis-prevent');
  });

  it("ensures src/assets/style.css protects 100dvh layout against html.lenis height:auto", () => {
    const stylePath = path.resolve(__dirname, "../assets/style.css");
    const content = fs.readFileSync(stylePath, "utf-8");

    expect(content).toContain("html.lenis");
    expect(content).toContain("html.lenis body");
    expect(content).toContain("height: 100dvh;");
  });

  it("ensures StockGrid.vue connects useSmoothScroll to gridContainer", () => {
    const stockGridPath = path.resolve(__dirname, "../components/StockGrid.vue");
    const content = fs.readFileSync(stockGridPath, "utf-8");

    expect(content).toContain("useSmoothScroll");
    expect(content).toContain("useSmoothScroll(gridContainer)");
  });
});

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { evaluateChatScrollState } from "../utils/chatParserUtils";

describe("ChatPanel Initial Load & Auto-Scroll State Machine", () => {
  it("keeps auto-scroll active and hides 'ข้อความใหม่ ⬇' when scrollHeight expands on initial page load", () => {
    // จำลองการเปิดหน้าเว็บใหม่:
    // 1. scrollToBottom() เลื่อนไปยังล่างสุด (scrollTop = 9400, scrollHeight = 10000, clientHeight = 600)
    // 2. ข้อมูลลูกค้า (ที่อยู่, ช่องทางติดต่อ, COD/โอน) และป้ายชื่อแอดมินโหลดเสร็จ ทำให้ความสูงขยายเป็น 10120
    const state = evaluateChatScrollState({
      scrollTop: 9400,
      scrollHeight: 10120,
      clientHeight: 600,
      lastScrollTop: 9400,
      lastScrollHeight: 10000,
      isUserScrolling: false,
      isProgrammaticScroll: false,
    });

    expect(state.isUserScrolling).toBe(false);
    expect(state.showScrollButton).toBe(false);
    expect(state.shouldAutoScroll).toBe(true);
  });

  it("keeps auto-scroll active when programmatic scroll event fires after content expansion", () => {
    const state = evaluateChatScrollState({
      scrollTop: 9400,
      scrollHeight: 10150,
      clientHeight: 600,
      lastScrollTop: 0,
      lastScrollHeight: 10000,
      isUserScrolling: false,
      isProgrammaticScroll: true,
    });

    expect(state.isUserScrolling).toBe(false);
    expect(state.showScrollButton).toBe(false);
    expect(state.shouldAutoScroll).toBe(true);
  });

  it("detects genuine user upward scroll and shows 'ข้อความใหม่ ⬇' button", () => {
    const state = evaluateChatScrollState({
      scrollTop: 9200,
      scrollHeight: 10000,
      clientHeight: 600,
      lastScrollTop: 9400,
      lastScrollHeight: 10000,
      isUserScrolling: false,
      isProgrammaticScroll: false,
    });

    expect(state.isUserScrolling).toBe(true);
    expect(state.showScrollButton).toBe(true);
    expect(state.shouldAutoScroll).toBe(false);
  });

  it("does not mistake content shrinking (e.g. filter tab switch) for user upward scroll", () => {
    // เมื่อกรองแชทแล้วรายการสั้นลง Browser จะลด scrollTop ลงตาม scrollHeight อัตโนมัติ
    const state = evaluateChatScrollState({
      scrollTop: 1200,
      scrollHeight: 2000,
      clientHeight: 600,
      lastScrollTop: 9400,
      lastScrollHeight: 10000,
      isUserScrolling: false,
      isProgrammaticScroll: false,
    });

    expect(state.isUserScrolling).toBe(false);
    expect(state.showScrollButton).toBe(false);
    expect(state.shouldAutoScroll).toBe(true);
  });

  it("resets isUserScrolling and hides button when user scrolls back to bottom (<= 30px)", () => {
    const state = evaluateChatScrollState({
      scrollTop: 9380,
      scrollHeight: 10000,
      clientHeight: 600,
      lastScrollTop: 9100,
      lastScrollHeight: 10000,
      isUserScrolling: true,
      isProgrammaticScroll: false,
    });

    expect(state.isUserScrolling).toBe(false);
    expect(state.showScrollButton).toBe(false);
    expect(state.shouldAutoScroll).toBe(false);
  });

  it("verifies ChatPanel.vue invariants for accurate initial scroll", () => {
    const chatPanelPath = path.resolve(process.cwd(), "src/components/ChatPanel.vue");
    const content = fs.readFileSync(chatPanelPath, "utf-8");

    // 1. .chat-row ต้องไม่ใช้ contain-intrinsic-size: 55px ที่ทำให้ความสูงแถวล่างเพี้ยนตอนเปิดหน้าเว็บ
    expect(content).not.toMatch(/contain-intrinsic-size:\s*55px/);

    // 2. ต้องมี ResizeObserver คอยดึง scroll ลงล่างสุดเมื่อความสูงของ #chat-list เปลี่ยนแปลง
    expect(content).toContain("ResizeObserver");
    expect(content).toContain("evaluateChatScrollState");
  });
});

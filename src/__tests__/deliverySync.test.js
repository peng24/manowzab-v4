import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeCustomerName, isProxyUid, recalcItemCount } from "../utils/deliverySync";

// Mock Firebase Realtime Database methods
vi.mock("firebase/database", () => ({
  ref: vi.fn((db, path) => path || "mock-ref"),
  get: vi.fn(),
  update: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {}
}));

describe("Delivery Sync & Customer Item Count Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes customer names correctly", () => {
    expect(normalizeCustomerName("  สมชาย  ใจดี  ")).toBe("สมชาย ใจดี");
    expect(normalizeCustomerName("SOMCHAI")).toBe("somchai");
    expect(normalizeCustomerName("")).toBe("");
    expect(normalizeCustomerName(null)).toBe("");
  });

  it("identifies proxy UIDs correctly", () => {
    expect(isProxyUid("proxy-12345")).toBe(true);
    expect(isProxyUid("admin-proxy-6789")).toBe(true);
    expect(isProxyUid("multi-proxy-abc")).toBe(true);
    expect(isProxyUid("manual-user")).toBe(true);
    expect(isProxyUid("name:สมชาย")).toBe(true);
    expect(isProxyUid(null)).toBe(true);

    expect(isProxyUid("UC1234567890abcdef")).toBe(false);
  });

  describe("recalcItemCount done status handling", () => {
    it("excludes done sessions when recalculating active itemCount", async () => {
      const { get, update } = await import("firebase/database");
      
      get.mockResolvedValueOnce({
        val: () => ({
          session_1: { count: 3, totalPrice: 300, status: "done" },
          session_2: { count: 2, totalPrice: 200, status: "pending" },
        })
      });

      await recalcItemCount("customer-123");

      expect(update).toHaveBeenCalledWith(
        "delivery_customers/customer-123",
        expect.objectContaining({
          itemCount: 2,
          totalPrice: 200,
        })
      );
    });

    it("resets itemCount to 0 when all sessions are done", async () => {
      const { get, update } = await import("firebase/database");
      
      get.mockResolvedValueOnce({
        val: () => ({
          session_1: { count: 3, totalPrice: 300, status: "done" },
          session_2: { count: 5, totalPrice: 500, status: "done" },
        })
      });

      await recalcItemCount("customer-456");

      expect(update).toHaveBeenCalledWith(
        "delivery_customers/customer-456",
        expect.objectContaining({
          itemCount: 0,
          totalPrice: 0,
        })
      );
    });
  });
});

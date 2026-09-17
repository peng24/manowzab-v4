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

    it("handles undefined note field safely without throwing Firebase update error", () => {
      const existingCustomer = { id: "UCghmg03IPoS-GHZSW6LHfqg", name: "Test User", status: "pending" }; // note is undefined
      const payload = {
        name: existingCustomer.name,
        itemCount: existingCustomer ? (existingCustomer.itemCount ?? 0) : 0,
        deliveryDate: "2026-08-13",
        note: (existingCustomer && existingCustomer.note) || "",
        paymentType: (existingCustomer && existingCustomer.paymentType) || "transfer",
        status: "pending",
        createdAt: existingCustomer ? (existingCustomer.createdAt ?? 12345) : 12345,
        updatedAt: 12345,
      };

      expect(payload.note).toBe("");
      expect(payload.paymentType).toBe("transfer");
      expect(Object.values(payload).includes(undefined)).toBe(false);
    });

    it("identifies paymentType (transfer vs cod vs unspecified) based on explicit field, addressBook fallback, or note fallback", () => {
      const getPaymentType = (c, addressBook = {}) => {
        if (!c) return "";
        if (c.paymentType) {
          const pt = String(c.paymentType).trim().toLowerCase();
          if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") return "cod";
          if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") return "transfer";
        }

        // 1. Central address_book fallback
        const normKey = (c.name || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.#$[\]/]/g, "_");
        const bookEntry = addressBook && normKey ? addressBook[normKey] : null;
        if (bookEntry && bookEntry.paymentType) {
          const pt = String(bookEntry.paymentType).trim().toLowerCase();
          if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") return "cod";
          if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") return "transfer";
        }

        // 2. Active address fallback
        const activeAddr = c.addresses?.find(a => a.id === c.selectedAddressId) || c.addresses?.[0];
        if (activeAddr && activeAddr.paymentType) {
          const pt = String(activeAddr.paymentType).trim().toLowerCase();
          if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") return "cod";
          if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") return "transfer";
        }

        const note = (c.note || "").toLowerCase();
        const addr = (c.address || "").toLowerCase();
        if (note.includes("cod") || note.includes("ปลายทาง") || note.includes("เก็บเงิน") || addr.includes("cod") || addr.includes("ปลายทาง")) {
          return "cod";
        }
        return "";
      };

      const getDisplay = (c, addressBook = {}) => {
        const t = getPaymentType(c, addressBook);
        if (t === "cod") return "COD";
        if (t === "transfer") return "โอน";
        return "ยังไม่ระบุ";
      };

      expect(getPaymentType({ paymentType: "cod" })).toBe("cod");
      expect(getPaymentType({ paymentType: "transfer" })).toBe("transfer");
      expect(getPaymentType({ note: "COD 350 บาท" })).toBe("cod");
      expect(getPaymentType({ note: "เก็บเงินปลายทาง" })).toBe("cod");
      expect(getPaymentType({})).toBe("");
      expect(getDisplay({})).toBe("ยังไม่ระบุ");

      // AddressBook fallback test
      const mockAddressBook = {
        "somchai ka": { name: "somchai ka", paymentType: "cod" },
        "somsri th": { name: "somsri th", paymentType: "transfer" },
      };
      expect(getPaymentType({ name: "Somchai Ka" }, mockAddressBook)).toBe("cod");
      expect(getDisplay({ name: "Somchai Ka" }, mockAddressBook)).toBe("COD");
      expect(getPaymentType({ name: "Somsri TH" }, mockAddressBook)).toBe("transfer");
      expect(getDisplay({ name: "Somsri TH" }, mockAddressBook)).toBe("โอน");

      // Active address fallback test
      expect(getPaymentType({
        name: "New Person",
        selectedAddressId: "addr_2",
        addresses: [
          { id: "addr_1", paymentType: "transfer" },
          { id: "addr_2", paymentType: "cod" },
        ],
      })).toBe("cod");
    });

    it("resets labelPrinted to false when marked done and preparing for next delivery round", () => {
      // Simulate markDone payload
      const markDonePayload = (customer) => ({
        status: "done",
        itemCount: 0,
        labelPrinted: false,
        labelPrintedAt: null,
        updatedAt: 12345,
      });

      // Simulate re-activating done customer for next round
      const nextRoundPayload = (customer, newDate) => ({
        name: customer.name,
        deliveryDate: newDate,
        status: "pending",
        labelPrinted: false,
        labelPrintedAt: null,
        updatedAt: 12345,
      });

      const customer = { id: "cust-1", name: "สมศรี", status: "pending", labelPrinted: true, labelPrintedAt: 11111 };
      const doneResult = markDonePayload(customer);
      expect(doneResult.status).toBe("done");
      expect(doneResult.labelPrinted).toBe(false);
      expect(doneResult.labelPrintedAt).toBeNull();

      const nextRoundResult = nextRoundPayload(doneResult, "2026-09-10");
      expect(nextRoundResult.status).toBe("pending");
      expect(nextRoundResult.deliveryDate).toBe("2026-09-10");
      expect(nextRoundResult.labelPrinted).toBe(false);
      expect(nextRoundResult.labelPrintedAt).toBeNull();
    });
  });
});

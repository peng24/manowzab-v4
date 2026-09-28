import { describe, it, expect } from "vitest";
import { normalizeName } from "../utils/addressParser";

/**
 * Reusable contact channel resolution helper mirroring ShippingManager and ShippingLabelModal
 */
function resolveContactChannel(customer, addressBook = {}) {
  if (!customer) return "";

  // 1. Explicit property on customer
  if (customer.contactChannel) {
    const cc = String(customer.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  // 2. Check address_book (persists across sessions / lives for this customer)
  const norm = normalizeName(customer.name || "").replace(/[.#$[\]/]/g, "_");
  const bookEntry = addressBook && norm ? addressBook[norm] : null;
  if (bookEntry && bookEntry.contactChannel) {
    const cc = String(bookEntry.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  // 3. Check active or saved address
  const savedAddrs = Array.isArray(customer.addresses) ? customer.addresses : [];
  const activeAddr = customer.selectedAddressId
    ? savedAddrs.find((a) => a.id === customer.selectedAddressId)
    : savedAddrs[0];
  if (activeAddr && activeAddr.contactChannel) {
    const cc = String(activeAddr.contactChannel).trim().toLowerCase();
    if (cc === "lineoa" || cc === "line_oa" || cc === "line-oa") return "lineoa";
    if (cc === "phone" || cc === "tel" || cc === "โทร" || cc === "โทรศัพท์") return "phone";
    if (cc === "line") return "line";
  }

  return "";
}

function getContactChannelShort(customer, addressBook = {}) {
  const ch = resolveContactChannel(customer, addressBook);
  if (ch === "lineoa") return "LineOA";
  if (ch === "phone") return "โทร";
  if (ch === "line") return "Line";
  return "-";
}

function getContactChannelDisplay(customer, addressBook = {}) {
  const ch = resolveContactChannel(customer, addressBook);
  if (ch === "lineoa") return "💚 LineOA";
  if (ch === "phone") return "📞 โทร";
  if (ch === "line") return "💬 Line";
  return "-";
}

function getNextContactChannel(current) {
  return current === "line" ? "lineoa" : (current === "lineoa" ? "phone" : "line");
}

describe("Shipping Contact Channel Logic", () => {
  it("defaults to empty channel and '-' display when no contact channel is set", () => {
    const customer = { name: "คุณแจ๋ว" };
    expect(resolveContactChannel(customer)).toBe("");
    expect(getContactChannelShort(customer)).toBe("-");
    expect(getContactChannelDisplay(customer)).toBe("-");
  });

  it("reads contactChannel from customer object when present", () => {
    expect(resolveContactChannel({ name: "แจ๋ว", contactChannel: "lineoa" })).toBe("lineoa");
    expect(resolveContactChannel({ name: "แจ๋ว", contactChannel: "phone" })).toBe("phone");
    expect(resolveContactChannel({ name: "แจ๋ว", contactChannel: "line" })).toBe("line");
  });

  it("persists and falls back to address_book when customer has no channel ('ถ้ายังไม่แก้ไขให้ใช้ช่องทางติดต่อเดิมตลอด')", () => {
    const customer = { name: "พี่ไหม" };
    const addressBook = {
      "พี่ไหม": {
        name: "พี่ไหม",
        contactChannel: "lineoa",
      }
    };
    expect(resolveContactChannel(customer, addressBook)).toBe("lineoa");
    expect(getContactChannelShort(customer, addressBook)).toBe("LineOA");
    expect(getContactChannelDisplay(customer, addressBook)).toBe("💚 LineOA");
  });

  it("reads from active address when customer and addressBook have no top-level channel", () => {
    const customer = {
      name: "สมศรี",
      selectedAddressId: "addr_2",
      addresses: [
        { id: "addr_1", contactChannel: "line" },
        { id: "addr_2", contactChannel: "phone" }
      ]
    };
    expect(resolveContactChannel(customer)).toBe("phone");
    expect(getContactChannelShort(customer)).toBe("โทร");
    expect(getContactChannelDisplay(customer)).toBe("📞 โทร");
  });

  it("cycles correctly: '' -> line -> lineoa -> phone -> line", () => {
    expect(getNextContactChannel("")).toBe("line");
    expect(getNextContactChannel("-")).toBe("line");
    expect(getNextContactChannel("line")).toBe("lineoa");
    expect(getNextContactChannel("lineoa")).toBe("phone");
    expect(getNextContactChannel("phone")).toBe("line");
  });

  it("formats label for bottom-left of thermal shipping label right after the name", () => {
    const initialCustomer = { name: "แจ๋ว" };
    const systemName = "แจ๋ว";
    expect(`${systemName} (${getContactChannelShort(initialCustomer)})`).toBe("แจ๋ว (-)");

    const lineCustomer = { name: "แจ๋ว", contactChannel: "line" };
    expect(`${systemName} (${getContactChannelShort(lineCustomer)})`).toBe("แจ๋ว (Line)");

    const phoneCustomer = { name: "แจ๋ว", contactChannel: "phone" };
    expect(`${systemName} (${getContactChannelShort(phoneCustomer)})`).toBe("แจ๋ว (โทร)");

    const lineOaCustomer = { name: "แจ๋ว", contactChannel: "lineoa" };
    expect(`${systemName} (${getContactChannelShort(lineOaCustomer)})`).toBe("แจ๋ว (LineOA)");
  });
});

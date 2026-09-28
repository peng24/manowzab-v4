import { describe, it, expect } from "vitest";
import { normalizeName, parseSingleAddress, extractPhone, extractPostalCode } from "../utils/addressParser";
import { sanitizeDbKey } from "../utils/dbUtils";
import { normalizeCustomerName } from "../utils/deliverySync";

/**
 * Helper to simulate multiPathUpdates for CustomerQuickEditModal
 */
function buildQuickEditUpdates({
  chat,
  nickname,
  contactChannel,
  address,
  recipientName,
  phone,
  postalCode,
  matchedCustId = null,
  existingAddressList = [],
  existingActiveAddrId = null,
  targetVideoId = "vid_123",
  stockData = null,
  timestamp = 1700000000000,
}) {
  const trimmedNick = (nickname || "").trim();
  const rawReal = chat.realName || chat.authorName || chat.displayName || "";
  const targetUid = chat.uid || rawReal || trimmedNick;
  const safeTargetUid = sanitizeDbKey(targetUid);

  const updates = {};

  // 1. Nickname
  if (trimmedNick) {
    updates[`nicknames/${safeTargetUid}`] = {
      nick: trimmedNick,
      realName: rawReal,
      updatedAt: timestamp,
    };

    if (chat.uid && rawReal && chat.uid !== rawReal) {
      const safeReal = sanitizeDbKey(rawReal);
      if (safeReal !== safeTargetUid) {
        updates[`nicknames/${safeReal}`] = {
          nick: trimmedNick,
          realName: rawReal,
          updatedAt: timestamp,
        };
      }
    }
  }

  // 2. Address & Contact Channel
  const primaryName = trimmedNick || chat.displayName || rawReal;
  const normKey = normalizeName(primaryName).replace(/[.#$[\]/]/g, "_");
  const cleanAddress = (address || "").trim();
  let phoneVal = (phone || "").trim();
  let recipientVal = (recipientName || "").trim();
  let zipVal = (postalCode || "").trim();

  if (cleanAddress) {
    if (!zipVal) {
      const zipMatch = cleanAddress.match(/\b[1-9]\d{4}\b/);
      if (zipMatch) zipVal = zipMatch[0];
    }
    if (!phoneVal) {
      const phoneMatch = cleanAddress.match(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/);
      if (phoneMatch) phoneVal = phoneMatch[0];
    }
  }

  if (normKey) {
    updates[`address_book/${normKey}/name`] = primaryName;
    updates[`address_book/${normKey}/contactChannel`] = contactChannel || "";
    if (cleanAddress) {
      updates[`address_book/${normKey}/address`] = cleanAddress;
      updates[`address_book/${normKey}/recipientName`] = recipientVal || primaryName;
      updates[`address_book/${normKey}/phone`] = phoneVal || "";
      updates[`address_book/${normKey}/postalCode`] = zipVal || "";

      const addrs = [...existingAddressList];
      const activeId = existingActiveAddrId || "addr_" + timestamp;
      const addrObj = {
        id: activeId,
        label: "ที่อยู่หลัก",
        recipientName: recipientVal || primaryName,
        phone: phoneVal || "",
        address: cleanAddress,
        postalCode: zipVal || "",
        contactChannel: contactChannel || "",
      };
      if (addrs.length > 0) {
        const foundIdx = addrs.findIndex((a) => a.id === activeId);
        if (foundIdx >= 0) addrs[foundIdx] = { ...addrs[foundIdx], ...addrObj };
        else addrs[0] = { ...addrs[0], ...addrObj };
      } else {
        addrs.push(addrObj);
      }
      updates[`address_book/${normKey}/addresses`] = addrs;
      updates[`address_book/${normKey}/selectedAddressId`] = activeId;
    }
    updates[`address_book/${normKey}/updatedAt`] = timestamp;
  }

  if (matchedCustId) {
    if (trimmedNick) {
      updates[`delivery_customers/${matchedCustId}/name`] = trimmedNick;
    }
    updates[`delivery_customers/${matchedCustId}/contactChannel`] = contactChannel || "";
    if (cleanAddress) {
      updates[`delivery_customers/${matchedCustId}/address`] = cleanAddress;
      updates[`delivery_customers/${matchedCustId}/recipientName`] = recipientVal || primaryName;
      updates[`delivery_customers/${matchedCustId}/phone`] = phoneVal || "";
      updates[`delivery_customers/${matchedCustId}/postalCode`] = zipVal || "";
    }
    updates[`delivery_customers/${matchedCustId}/updatedAt`] = timestamp;
  }

  // 3. Stock Items
  if (trimmedNick && targetVideoId && stockData) {
    const oldDisplayName = chat.displayName;
    const chatAuthor = chat.authorName;
    const chatReal = chat.realName;
    const chatUid = chat.uid;

    const matchCandidates = [oldDisplayName, chatAuthor, chatReal, rawReal].filter(Boolean);

    const isCustomerMatch = (itemOwner, itemUid) => {
      if (chatUid && itemUid && itemUid === chatUid) return true;
      const normItemOwner = normalizeCustomerName(itemOwner);
      if (normItemOwner) {
        for (const cand of matchCandidates) {
          if (normItemOwner === normalizeCustomerName(cand)) return true;
        }
      }
      if (itemUid) {
        const normItemUid = normalizeCustomerName(itemUid);
        for (const cand of matchCandidates) {
          if (normItemUid === normalizeCustomerName(cand)) return true;
        }
      }
      return false;
    };

    Object.entries(stockData).forEach(([numStr, item]) => {
      if (!item) return;
      const num = parseInt(numStr, 10);
      if (item.owner && item.owner !== trimmedNick && isCustomerMatch(item.owner, item.uid)) {
        updates[`stock/${targetVideoId}/${num}/owner`] = trimmedNick;
      }
      if (Array.isArray(item.queue) && item.queue.length > 0) {
        let qChanged = false;
        const newQ = item.queue.map((q) => {
          if (q && q.owner && q.owner !== trimmedNick && isCustomerMatch(q.owner, q.uid)) {
            qChanged = true;
            return { ...q, owner: trimmedNick };
          }
          return q;
        });
        if (qChanged) {
          updates[`stock/${targetVideoId}/${num}/queue`] = newQ;
        }
      }
    });
  }

  return updates;
}

describe("CustomerQuickEditModal Logic", () => {
  it("builds multi-path updates for nickname, address, and contact channel", () => {
    const chat = {
      uid: "UC_12345",
      displayName: "เมธินี",
      realName: "@methineeputhametha4273",
    };

    const updates = buildQuickEditUpdates({
      chat,
      nickname: "คุณเมธินี",
      contactChannel: "lineoa",
      address: "36 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000",
      recipientName: "คุณเมธินี",
      phone: "081-234-5678",
      postalCode: "83000",
      matchedCustId: "cust_999",
      timestamp: 1700000000000,
    });

    // Nickname updates
    expect(updates["nicknames/UC_12345"]).toEqual({
      nick: "คุณเมธินี",
      realName: "@methineeputhametha4273",
      updatedAt: 1700000000000,
    });
    expect(updates["nicknames/@methineeputhametha4273"]).toEqual({
      nick: "คุณเมธินี",
      realName: "@methineeputhametha4273",
      updatedAt: 1700000000000,
    });

    // Address book updates
    const norm = normalizeName("คุณเมธินี");
    expect(updates[`address_book/${norm}/name`]).toBe("คุณเมธินี");
    expect(updates[`address_book/${norm}/contactChannel`]).toBe("lineoa");
    expect(updates[`address_book/${norm}/address`]).toBe("36 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000");
    expect(updates[`address_book/${norm}/phone`]).toBe("081-234-5678");
    expect(updates[`address_book/${norm}/postalCode`]).toBe("83000");

    // Delivery customers updates
    expect(updates["delivery_customers/cust_999/name"]).toBe("คุณเมธินี");
    expect(updates["delivery_customers/cust_999/contactChannel"]).toBe("lineoa");
    expect(updates["delivery_customers/cust_999/address"]).toBe("36 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000");
  });

  it("handles empty contact channel defaulting to '' and auto-extracts zip/phone from address", () => {
    const chat = {
      uid: "UC_99999",
      displayName: "วนัสนันท์",
      realName: "@vanasanant",
    };

    const updates = buildQuickEditUpdates({
      chat,
      nickname: "วนัสนันท์",
      contactChannel: "",
      address: "123 หมู่ 4 ต.บางเขน อ.เมือง จ.นนทบุรี 11000 โทร 0891234567",
      recipientName: "",
      phone: "",
      postalCode: "",
      timestamp: 1700000000000,
    });

    const norm = normalizeName("วนัสนันท์");
    expect(updates[`address_book/${norm}/contactChannel`]).toBe("");
    expect(updates[`address_book/${norm}/postalCode`]).toBe("11000");
    expect(updates[`address_book/${norm}/phone`]).toBe("0891234567");
  });

  it("parses single address cleanly using addressParser", () => {
    const raw = "คุณรุ้งนภา 089-999-8888 99/9 ถ.พหลโยธิน แขวงลาดยาว เขตจตุจักร กทม. 10900";
    const parsed = parseSingleAddress(raw);

    expect(parsed).not.toBeNull();
    expect(parsed.phone).toBe("089-999-8888");
    expect(parsed.postalCode).toBe("10900");
    expect(parsed.name).toBe("คุณรุ้งนภา");
  });

  it("automatically updates customer name in stock items and queues when nickname changes", () => {
    const chat = {
      uid: "UC_12345",
      displayName: "เมธินี",
      realName: "@methineeputhametha4273",
    };

    const stockData = {
      "3": { owner: "เมธินี", uid: "UC_12345", price: 100 },
      "7": { owner: "เมธินี", uid: "manual" },
      "12": {
        owner: "สมชาย",
        uid: "UC_99999",
        queue: [
          { owner: "เมธินี", uid: "UC_12345" },
          { owner: "สมหญิง", uid: "UC_88888" },
        ],
      },
      "15": { owner: "สมชาย", uid: "UC_99999" },
    };

    const updates = buildQuickEditUpdates({
      chat,
      nickname: "คุณเมธินี",
      targetVideoId: "live_2026_09_28",
      stockData,
    });

    // Item 3 (primary owner matched by UID & name)
    expect(updates["stock/live_2026_09_28/3/owner"]).toBe("คุณเมธินี");

    // Item 7 (primary owner matched by name even with manual UID)
    expect(updates["stock/live_2026_09_28/7/owner"]).toBe("คุณเมธินี");

    // Item 12 (queue item updated, other queue items unchanged)
    expect(updates["stock/live_2026_09_28/12/queue"]).toEqual([
      { owner: "คุณเมธินี", uid: "UC_12345" },
      { owner: "สมหญิง", uid: "UC_88888" },
    ]);
    expect(updates["stock/live_2026_09_28/12/owner"]).toBeUndefined();

    // Item 15 (other customer - untouched)
    expect(updates["stock/live_2026_09_28/15/owner"]).toBeUndefined();
  });
});


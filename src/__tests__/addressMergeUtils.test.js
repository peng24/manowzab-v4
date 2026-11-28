import { describe, it, expect } from "vitest";
import {
  normalizePhoneDigits,
  stripHonorificPrefix,
  normalizeAddressForMatch,
  diceSimilarity,
  buildInspectableCustomerRecords,
  compareCustomerPair,
  findDuplicateCustomerGroups,
  buildCustomerMergePlan,
} from "../utils/addressMergeUtils";

describe("addressMergeUtils — normalization helpers", () => {
  it("normalizes Thai phone numbers across dashed, raw, and +66 formats while rejecting placeholders", () => {
    expect(normalizePhoneDigits("081-234-5678")).toBe("0812345678");
    expect(normalizePhoneDigits("+66 81 234 5678")).toBe("0812345678");
    expect(normalizePhoneDigits("02-123-4567")).toBe("021234567");
    expect(normalizePhoneDigits("0000000000")).toBe("");
    expect(normalizePhoneDigits("12345")).toBe("");
    expect(normalizePhoneDigits("")).toBe("");
  });

  it("strips Thai/English honorific prefixes safely without erasing short names", () => {
    expect(stripHonorificPrefix("พี่กุ้ง")).toBe("กุ้ง");
    expect(stripHonorificPrefix("คุณพี่สมชาย")).toBe("สมชาย");
    expect(stripHonorificPrefix("คุณ ลัดดา จิตต์ทอง")).toBe("ลัดดา จิตต์ทอง");
    // Short name after prefix stays intact when stripping would leave < 2 chars
    expect(stripHonorificPrefix("พี่อ")).toBe("พี่อ");
  });

  it("normalizes Thai address abbreviations consistently", () => {
    const a = normalizeAddressForMatch("123/4 หมู่ 5 ตำบลช้างเผือก อำเภอเมือง จังหวัดเชียงใหม่ 50300");
    const b = normalizeAddressForMatch("123/4 ม.5 ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300");
    expect(a).toBe(b);
    expect(diceSimilarity(a, b)).toBe(1);
  });
});

describe("addressMergeUtils — duplicate detection", () => {
  it("detects real-world duplicate group ('กุ้ง' + 'กุ้ง ศิริ' + split delivery IDs) with high confidence", () => {
    const addressBook = {
      "กุ้ง": {
        name: "กุ้ง",
        recipientName: "คุณลัดดา จิตต์ทอง",
        phone: "089-123-5298",
        address: "99/1 ม.2 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        postalCode: "40000",
        contactChannel: "line",
        paymentType: "transfer",
        updatedAt: 1700000000000,
      },
      "กุ้ง ศิริ": {
        name: "กุ้ง ศิริ",
        recipientName: "ลัดดา จิตต์ทอง",
        phone: "0891235298",
        address: "99/1 หมู่ 2 ตำบลในเมือง อำเภอเมือง จังหวัดขอนแก่น 40000",
        postalCode: "40000",
        updatedAt: 1700000005000,
      },
    };

    const deliveryCustomers = {
      UCbD8q2Z_m2QHARJK7Xv0f7w: {
        name: "กุ้ง",
        phone: "089-123-5298",
        status: "done",
        totalBookings: 5,
        updatedAt: 1700000001000,
      },
      "cust_กุ้ง": {
        name: "กุ้ง",
        phone: "089-123-5298",
        status: "pending",
        itemCount: 2,
        totalPrice: 160,
        deliveryDate: "2026-11-30",
        sessions: {
          vidA: {
            count: 2,
            totalPrice: 160,
            status: "pending",
            items: {
              "10": { bookingKey: "10:100", bookedAt: 100, price: 80 },
              "11": { bookingKey: "11:101", bookedAt: 101, price: 80 },
            },
          },
        },
        totalBookings: 1,
        updatedAt: 1700000002000,
      },
      "cust_กุ้ง_ศิริ": {
        name: "กุ้ง ศิริ",
        phone: "089-123-5298",
        status: "pending",
        itemCount: 0,
        totalBookings: 0,
        updatedAt: 1700000003000,
      },
    };

    const nicknames = {
      UCbD8q2Z_m2QHARJK7Xv0f7w: { nick: "กุ้ง", realName: "@kung_channel" },
    };

    const { groups } = findDuplicateCustomerGroups({
      addressBook,
      deliveryCustomers,
      nicknames,
    });

    expect(groups).toHaveLength(1);
    const g = groups[0];
    expect(g.confidence).toBe("high");
    expect(g.members).toHaveLength(3);
    expect(g.reasons).toContain("same_phone");
    expect(g.reasons).toContain("same_address");
    expect(g.reasons).toContain("split_ids");
    // Default primary should be the real YouTube Channel ID record
    expect(g.defaultPrimaryId).toBe("deliv:UCbD8q2Z_m2QHARJK7Xv0f7w");
  });

  it("detects split delivery_customers IDs for the same customer name ('พี่กวาง' UC... + manual-...)", () => {
    const addressBook = {
      "พี่กวาง": {
        name: "พี่กวาง",
        phone: "086-555-8663",
        address: "12/3 ถ.สุขุมวิท กทม 10110",
        postalCode: "10110",
        updatedAt: 1700000000000,
      },
    };
    const deliveryCustomers = {
      UCaGVyaBd7qQoiaIIuQqEHSg: {
        name: "พี่กวาง",
        status: "done",
        totalBookings: 4,
        updatedAt: 1700000000000,
      },
      "manual-1781096493365": {
        name: "พี่กวาง",
        phone: "086-555-8663",
        address: "12/3 ถ.สุขุมวิท กทม 10110",
        status: "pending",
        itemCount: 8,
        totalPrice: 640,
        deliveryDate: "2026-12-01",
        sessions: {
          vidB: { count: 8, totalPrice: 640, status: "pending" },
        },
        updatedAt: 1700000009000,
      },
    };

    const { groups } = findDuplicateCustomerGroups({
      addressBook,
      deliveryCustomers,
    });

    expect(groups).toHaveLength(1);
    expect(groups[0].isSplitIds).toBe(true);
    expect(groups[0].members).toHaveLength(2);
    expect(groups[0].defaultPrimaryId).toBe("deliv:UCaGVyaBd7qQoiaIIuQqEHSg");
  });

  it("does NOT falsely group two different customers with similar names when phone and address differ", () => {
    const addressBook = {
      "กุ้ง": {
        name: "กุ้ง",
        recipientName: "ลัดดา จิตต์ทอง",
        phone: "081-111-1111",
        address: "11 ม.1 ต.ช้างเผือก อ.เมือง จ.เชียงใหม่ 50300",
        postalCode: "50300",
      },
      "กุ้ง ศิริ": {
        name: "กุ้ง ศิริ",
        recipientName: "ศิริพร ทองดี",
        phone: "089-999-9999",
        address: "88/9 ถ.ลาดพร้าว เขตจตุจักร กรุงเทพ 10900",
        postalCode: "10900",
      },
    };

    const { groups } = findDuplicateCustomerGroups({ addressBook });
    expect(groups).toHaveLength(0);
  });

  it("flags exact same name on two DIFFERENT real YouTube IDs with different phones/addresses as a warning", () => {
    const deliveryCustomers = {
      UC_ACCOUNT_AAA111: {
        name: "พี่นก",
        phone: "081-222-3333",
        address: "10/1 ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200",
        status: "done",
      },
      UC_ACCOUNT_BBB222: {
        name: "พี่นก",
        phone: "089-777-8888",
        address: "55/2 ถ.พระราม 9 เขตห้วยขวาง กทม 10310",
        status: "pending",
        itemCount: 1,
      },
    };

    const { groups } = findDuplicateCustomerGroups({ deliveryCustomers });
    expect(groups).toHaveLength(1);
    expect(groups[0].confidence).toBe("warning");
    expect(groups[0].hasDifferentRealYoutubeIds).toBe(true);
    expect(groups[0].hasDifferentPhones).toBe(true);
    expect(groups[0].hasAddressConflict).toBe(true);
  });

  it("detects completely different customer names sharing the exact same phone number", () => {
    const addressBook = {
      "@user_old": {
        name: "@user_old",
        phone: "092-456-7890",
        address: "45 ม.3 ต.บ้านเป็ด อ.เมือง จ.ขอนแก่น 40000",
      },
      "พี่สมหญิง": {
        name: "พี่สมหญิง",
        phone: "0924567890",
        address: "",
      },
    };

    const { groups } = findDuplicateCustomerGroups({ addressBook });
    expect(groups).toHaveLength(1);
    expect(groups[0].confidence).toBe("high");
    expect(groups[0].reasons).toContain("same_phone");
  });
});

describe("addressMergeUtils — buildCustomerMergePlan", () => {
  it("atomically merges split IDs, addresses, bookings, nicknames (Rule #13), and active stock items", () => {
    const addressBook = {
      "กุ้ง": {
        name: "กุ้ง",
        recipientName: "คุณลัดดา จิตต์ทอง",
        phone: "089-123-5298",
        address: "99/1 ม.2 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
        postalCode: "40000",
        contactChannel: "line",
        paymentType: "transfer",
        addresses: [
          {
            id: "addr_home",
            label: "บ้าน",
            recipientName: "คุณลัดดา จิตต์ทอง",
            phone: "089-123-5298",
            address: "99/1 ม.2 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
            postalCode: "40000",
          },
        ],
        selectedAddressId: "addr_home",
      },
      "กุ้ง ศิริ": {
        name: "กุ้ง ศิริ",
        recipientName: "คุณลัดดา จิตต์ทอง",
        phone: "089-123-5298",
        address: "88/5 ถ.มิตรภาพ อ.เมือง จ.ขอนแก่น 40000", // alternate office address!
        postalCode: "40000",
      },
    };

    const deliveryCustomers = {
      UCbD8q2Z_m2QHARJK7Xv0f7w: {
        name: "กุ้ง",
        status: "done",
        totalBookings: 5,
        note: "ลูกค้าประจำ",
        createdAt: 1690000000000,
        sessions: {
          vidOld: { count: 0, totalPrice: 0, status: "done" },
        },
      },
      "cust_กุ้ง": {
        name: "กุ้ง",
        status: "pending",
        deliveryDate: "2026-11-30",
        note: "แพ็คแยกถุง",
        totalBookings: 1,
        createdAt: 1695000000000,
        sessions: {
          vidLive: {
            count: 2,
            totalPrice: 160,
            status: "pending",
            items: {
              "10": { bookingKey: "10:100", bookedAt: 100, price: 80 },
              "11": { bookingKey: "11:101", bookedAt: 101, price: 80 },
            },
          },
        },
      },
      "cust_กุ้ง_ศิริ": {
        name: "กุ้ง ศิริ",
        status: "pending",
        deliveryDate: "2026-11-29", // earlier delivery date must be kept!
        totalBookings: 2,
        sessions: {
          vidLive: {
            count: 1,
            totalPrice: 100,
            status: "pending",
            items: {
              "15": { bookingKey: "15:105", bookedAt: 105, price: 100 },
            },
          },
        },
      },
    };

    const nicknames = {
      UCbD8q2Z_m2QHARJK7Xv0f7w: { nick: "กุ้ง", realName: "@kung_yt", phonetic: "คุณกุ้ง" },
      UC_SECONDARY_999: { nick: "กุ้ง ศิริ", realName: "@kung_siri" },
      "กุ้ง ศิริ": { nick: "กุ้ง ศิริ" }, // unsafe plain-name key must NOT be written
      "cust_กุ้ง_ศิริ": { nick: "กุ้ง ศิริ" }, // unsafe synthetic key must NOT be written
    };

    const activeVideoStock = {
      "10": { owner: "กุ้ง", uid: "cust_กุ้ง", price: 80 },
      "15": { owner: "กุ้ง ศิริ", uid: "cust_กุ้ง_ศิริ", price: 100 },
      "20": { owner: "คนอื่น", uid: "UC_OTHER_1234", price: 60 },
    };

    const candidates = buildInspectableCustomerRecords({
      addressBook,
      deliveryCustomers,
      nicknames,
    });
    const primary = candidates.find((c) => c.candidateId === "deliv:UCbD8q2Z_m2QHARJK7Xv0f7w");
    const secondaries = candidates.filter((c) => c.candidateId !== primary.candidateId);

    const plan = buildCustomerMergePlan({
      primary,
      secondaries,
      addressBook,
      deliveryCustomers,
      nicknames,
      activeVideoId: "vidLive",
      activeVideoStock,
      now: 1700000100000,
    });

    // 1. Canonical ID & address book
    expect(plan.canonicalDeliveryUid).toBe("UCbD8q2Z_m2QHARJK7Xv0f7w");
    expect(plan.primaryNormKey).toBe("กุ้ง");
    expect(plan.mergedAddressBookEntry.addresses).toHaveLength(2);
    expect(plan.mergedAddressBookEntry.selectedAddressId).toBe("addr_home");
    expect(plan.multiPathUpdates["address_book/กุ้ง ศิริ"]).toBeNull();

    // 2. Delivery consolidation preserves ALL pending items (2 + 1 = 3) and totalPrice (160 + 100 = 260)
    expect(plan.mergedDeliveryEntry.status).toBe("pending");
    expect(plan.mergedDeliveryEntry.itemCount).toBe(3);
    expect(plan.mergedDeliveryEntry.totalPrice).toBe(260);
    expect(plan.mergedDeliveryEntry.totalBookings).toBe(8); // 5 + 1 + 2
    expect(plan.mergedDeliveryEntry.deliveryDate).toBe("2026-11-29"); // earliest pending date
    expect(plan.mergedDeliveryEntry.note).toContain("ลูกค้าประจำ");
    expect(plan.mergedDeliveryEntry.note).toContain("แพ็คแยกถุง");
    expect(plan.mergedDeliveryEntry.createdAt).toBe(1690000000000);
    expect(plan.multiPathUpdates["delivery_customers/cust_กุ้ง"]).toBeNull();
    expect(plan.multiPathUpdates["delivery_customers/cust_กุ้ง_ศิริ"]).toBeNull();

    // 3. Rule #13 nickname safety: ONLY real YouTube UC... key repointed, NEVER plain name or cust_ key
    expect(plan.updatedNicknameKeys).toEqual(["UC_SECONDARY_999"]);
    expect(plan.multiPathUpdates["nicknames/UC_SECONDARY_999"]).toEqual({
      nick: "กุ้ง",
      realName: "@kung_siri",
    });
    expect(plan.multiPathUpdates["nicknames/กุ้ง ศิริ"]).toBeUndefined();
    expect(plan.multiPathUpdates["nicknames/cust_กุ้ง_ศิริ"]).toBeUndefined();

    // 4. Active live stock owner updated for merged secondary only
    expect(plan.updatedStockItemIds).toEqual(["15"]);
    expect(plan.multiPathUpdates["stock/vidLive/15/owner"]).toBe("กุ้ง");
    expect(plan.multiPathUpdates["stock/vidLive/15/uid"]).toBe("UCbD8q2Z_m2QHARJK7Xv0f7w");
    expect(plan.multiPathUpdates["stock/vidLive/20/owner"]).toBeUndefined();
  });

  it("transfers address, phone, and legacy sessionless itemCount when primary has UC ID without address", () => {
    const deliveryCustomers = {
      UCaGVyaBd7qQoiaIIuQqEHSg: {
        name: "พี่กวาง",
        status: "done",
        totalBookings: 3,
      },
      "manual-1781096493365": {
        name: "พี่กวาง",
        phone: "086-555-8663",
        address: "12/3 ถ.สุขุมวิท กทม 10110",
        status: "pending",
        itemCount: 8,
        totalPrice: 640,
        deliveryDate: "2026-12-02",
      },
    };

    const { groups } = findDuplicateCustomerGroups({ deliveryCustomers });
    const g = groups[0];
    const primary = g.members[0]; // UCaGV...
    const secondary = g.members[1]; // manual-...

    const plan = buildCustomerMergePlan({
      primary,
      secondaries: [secondary],
      deliveryCustomers,
      now: 1700000200000,
    });

    expect(plan.canonicalDeliveryUid).toBe("UCaGVyaBd7qQoiaIIuQqEHSg");
    expect(plan.mergedAddressBookEntry.phone).toBe("086-555-8663");
    expect(plan.mergedAddressBookEntry.address).toContain("สุขุมวิท");
    expect(plan.mergedDeliveryEntry.status).toBe("pending");
    expect(plan.mergedDeliveryEntry.itemCount).toBe(8);
    expect(plan.mergedDeliveryEntry.totalPrice).toBe(640);
    expect(plan.mergedDeliveryEntry.deliveryDate).toBe("2026-12-02");
    expect(plan.multiPathUpdates["delivery_customers/manual-1781096493365"]).toBeNull();
  });

  it("throws clean validation errors when primary or secondaries are missing", () => {
    expect(() => buildCustomerMergePlan({ primary: null, secondaries: [] })).toThrow();
    expect(() =>
      buildCustomerMergePlan({
        primary: { candidateId: "book:a", name: "ก" },
        secondaries: [],
      })
    ).toThrow();
  });
});

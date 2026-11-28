import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  isYouTubeHandle,
  isYouTubeChannelId,
  isTemporaryOrSyntheticUid,
  isSafeGlobalNicknameKey,
  detectCrossCustomerCollision,
  findDuplicateNicknameOwner,
  suggestUniqueNickname,
} from "../utils/customerIdentityGuard";

describe("Customer Identity & Cross-Customer Address Safety Guards", () => {
  it("distinguishes real YouTube account keys from temporary/proxy/plain-name keys", () => {
    expect(isYouTubeChannelId("UCbD8q2Z_m2QHARJK7Xv0f7w")).toBe(true);
    expect(isYouTubeChannelId("proxy-123")).toBe(false);
    expect(isYouTubeChannelId("กุ้ง")).toBe(false);

    expect(isYouTubeHandle("@DsHd-x2h")).toBe(true);
    expect(isYouTubeHandle("กุ้ง")).toBe(false);
    expect(isYouTubeHandle("@")).toBe(false);

    expect(isTemporaryOrSyntheticUid("proxy-1794320083374-abc")).toBe(true);
    expect(isTemporaryOrSyntheticUid("multi-proxy-1794320083374-tcwfa")).toBe(true);
    expect(isTemporaryOrSyntheticUid("admin-proxy-1794320083374-xyz")).toBe(true);
    expect(isTemporaryOrSyntheticUid("manual-1794320083374")).toBe(true);
    expect(isTemporaryOrSyntheticUid("manual")).toBe(true);
    expect(isTemporaryOrSyntheticUid("name:กุ้ง")).toBe(true);
    expect(isTemporaryOrSyntheticUid("cust_กุ้ง")).toBe(true);
    expect(isTemporaryOrSyntheticUid("customer-123-abc")).toBe(true);
    expect(isTemporaryOrSyntheticUid(null)).toBe(true);
    expect(isTemporaryOrSyntheticUid("UCbD8q2Z_m2QHARJK7Xv0f7w")).toBe(false);

    // Only real YouTube Channel IDs and @handles are safe global nickname keys
    expect(isSafeGlobalNicknameKey("UCbD8q2Z_m2QHARJK7Xv0f7w")).toBe(true);
    expect(isSafeGlobalNicknameKey("@DsHd-x2h")).toBe(true);
    expect(isSafeGlobalNicknameKey("กุ้ง")).toBe(false);
    expect(isSafeGlobalNicknameKey("พี่กวาง")).toBe(false);
    expect(isSafeGlobalNicknameKey("multi-proxy-1794320083374-tcwfa")).toBe(false);
    expect(isSafeGlobalNicknameKey("manual")).toBe(false);
  });

  it("detects cross-customer name collision to prevent overwriting target customer's address", () => {
    const addressBook = {
      กุ้ง: { name: "กุ้ง", recipientName: "คุณลัดดา", phone: "081-000-5298", address: "บ้านกุ้ง 111" },
      พี่กวาง: { name: "พี่กวาง", recipientName: "พี่กวาง", phone: "089-000-8663", address: "บ้านพี่กวาง 999" },
    };
    const deliveryByNormKey = {
      กุ้ง: { uid: "cust_กุ้ง", name: "กุ้ง", address: "บ้านกุ้ง 111" },
      พี่กวาง: { uid: "manual-kwang", name: "พี่กวาง", address: "บ้านพี่กวาง 999" },
    };

    // Editing "กุ้ง" -> "พี่กวาง" MUST detect collision with พี่กวาง's existing address & delivery record
    const res = detectCrossCustomerCollision({
      originalName: "กุ้ง",
      newName: "พี่กวาง",
      addressBook,
      deliveryByNormKey,
      matchedCustId: "cust_กุ้ง",
    });
    expect(res.isNameChanged).toBe(true);
    expect(res.hasCollision).toBe(true);
    expect(res.hasExistingAddress).toBe(true);
    expect(res.existingRecipient).toBe("พี่กวาง");
    expect(res.existingAddress).toBe("บ้านพี่กวาง 999");
    expect(res.existingDeliveryId).toBe("manual-kwang");

    // Editing "กุ้ง" without changing name is NOT a collision
    const sameRes = detectCrossCustomerCollision({
      originalName: "กุ้ง",
      newName: "กุ้ง",
      addressBook,
      deliveryByNormKey,
      matchedCustId: "cust_กุ้ง",
    });
    expect(sameRes.isNameChanged).toBe(false);
    expect(sameRes.hasCollision).toBe(false);

    // Renaming to a brand new unused name is NOT a collision
    const brandNewRes = detectCrossCustomerCollision({
      originalName: "กุ้ง",
      newName: "กุ้ง กทม",
      addressBook,
      deliveryByNormKey,
      matchedCustId: "cust_กุ้ง",
    });
    expect(brandNewRes.isNameChanged).toBe(true);
    expect(brandNewRes.hasCollision).toBe(false);
  });

  it("enforces all 5 safety layers in source files", () => {
    const modalSrc = readFileSync(resolve(process.cwd(), "src/components/CustomerQuickEditModal.vue"), "utf8");
    const dashSrc = readFileSync(resolve(process.cwd(), "src/components/Dashboard.vue"), "utf8");
    const phoneticSrc = readFileSync(resolve(process.cwd(), "src/components/PhoneticManager.vue"), "utf8");

    // Layer 1: CustomerQuickEditModal only writes nicknames for non-proxy real UIDs + @handles
    expect(modalSrc).toContain("isYouTubeHandle(rawReal)");
    expect(modalSrc).toContain("!isProxyContext && originalUid && !isTemporaryOrSyntheticUid(originalUid)");

    // Layer 2: Cross-customer collision blocks address_book and delivery_customers overwrite
    expect(modalSrc).toContain("if (normKey && !collision.hasCollision)");
    expect(modalSrc).toContain("if (matchedCustId.value && !collision.hasCollision && !(isProxyContext && collision.isNameChanged))");
    expect(modalSrc).toContain("const strictProxyUidOnly = Boolean(isProxyContext && chatUid && chatUid !== \"manual\")");

    // Layer 3: Dashboard.vue blocks proxy/group/manual nickname writes
    expect(dashSrc).toContain("!isProxyGroupKey(k) && !isProxyUid(k) && k !== \"manual\"");

    // Layer 4: PhoneticManager blocks mapping plain name UID to a different display name & duplicate nicknames
    expect(phoneticSrc).toContain("ป้องกันชื่อลูกค้าสลับคน");
    expect(phoneticSrc).toContain("findDuplicateNicknameOwner");

    // Layer 5: Duplicate nickname hard block across QuickEdit, Dashboard, and ChatProcessor auto-learn
    const chatProcSrc = readFileSync(resolve(process.cwd(), "src/composables/useChatProcessor.js"), "utf8");
    expect(modalSrc).toContain("findDuplicateNicknameOwner");
    expect(modalSrc).toContain("suggestUniqueNickname");
    expect(dashSrc).toContain("findDuplicateNicknameOwner");
    expect(chatProcSrc).toContain("findDuplicateNicknameOwner");
  });

  it("detects duplicate nicknames across different accounts while allowing self-updates and ignoring legacy proxy keys", () => {
    const nicknames = {
      UC_nok_1: { nick: "พี่นก", realName: "@nok_bkk" },
      "@nok_bkk": { nick: "พี่นก", realName: "@nok_bkk" },
      "proxy-179123456-abc": { nick: "พี่แอน", realName: "พี่แอน" },
    };
    const addressBook = {
      พี่นก: { name: "พี่นก", recipientName: "คุณสมศรี", phone: "081-111-1111" },
      พี่ฟ้า: { name: "พี่ฟ้า", recipientName: "คุณฟ้าใส", phone: "082-222-2222" },
    };

    // Different YouTube account trying to use "พี่นก" (even with extra spaces) -> BLOCKED
    const dup = findDuplicateNicknameOwner({
      candidateName: "  พี่นก  ",
      currentUid: "UC_nok_2",
      currentRealName: "@nok_cm",
      currentDisplayName: "@nok_cm",
      nicknames,
      addressBook,
    });
    expect(dup.isDuplicate).toBe(true);
    expect(dup.source).toBe("nicknames");
    expect(dup.conflictRealName).toBe("@nok_bkk");
    expect(dup.conflictRecipient).toBe("คุณสมศรี");

    // Same YouTube account updating its own record (same UID or same @handle) -> ALLOWED
    const selfUpdate = findDuplicateNicknameOwner({
      candidateName: "พี่นก",
      currentUid: "UC_nok_1",
      currentRealName: "@nok_bkk",
      currentDisplayName: "พี่นก",
      nicknames,
      addressBook,
    });
    expect(selfUpdate.isDuplicate).toBe(false);

    // Different YouTube account colliding with an existing address_book customer "พี่ฟ้า" -> BLOCKED
    const addrDup = findDuplicateNicknameOwner({
      candidateName: "พี่ฟ้า",
      currentUid: "UC_fah_new",
      currentRealName: "@fah_new",
      currentDisplayName: "@fah_new",
      nicknames,
      addressBook,
    });
    expect(addrDup.isDuplicate).toBe(true);
    expect(addrDup.source).toBe("customer_record");
    expect(addrDup.conflictRecipient).toBe("คุณฟ้าใส");

    // Legacy proxy key ("proxy-...") does NOT block a real customer from using "พี่แอน"
    const proxyIgnored = findDuplicateNicknameOwner({
      candidateName: "พี่แอน",
      currentUid: "UC_ann_real",
      currentRealName: "@ann_real",
      currentDisplayName: "@ann_real",
      nicknames,
      addressBook,
    });
    expect(proxyIgnored.isDuplicate).toBe(false);
  });

  it("suggests the next available unique nickname suffix", () => {
    const stores = {
      nicknames: {
        UC_1: { nick: "พี่นก" },
        UC_2: { nick: "พี่นก 2" },
      },
      addressBook: {
        "พี่นก 3": { name: "พี่นก 3" },
      },
      deliveryByNormKey: {},
    };
    expect(suggestUniqueNickname("พี่นก", stores)).toBe("พี่นก 4");
    expect(suggestUniqueNickname("พี่นก 2", stores)).toBe("พี่นก 4");
    expect(suggestUniqueNickname("พี่มด", stores)).toBe("พี่มด 2");
  });
});

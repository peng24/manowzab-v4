<template>
  <Teleport to="body">
    <Transition name="cqe-fade">
      <div v-if="isOpen" class="cqe-overlay" @click.self="close" @keydown.esc="close">
        <div class="cqe-modal" role="dialog" aria-modal="true">
          <!-- Header -->
          <div class="cqe-header">
            <div class="cqe-header-title">
              <i class="fa-solid fa-user-pen cqe-title-icon"></i>
              <span>แก้ไขข้อมูลลูกค้า</span>
            </div>
            <button class="cqe-close-btn" @click="close" type="button" title="ปิด (Esc)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Real name subtitle banner -->
          <div class="cqe-sub-banner" v-if="realNameStr">
            <i class="fa-brands fa-youtube cqe-yt-icon"></i>
            <span class="cqe-sub-text">ชื่อจริง: <b>{{ realNameStr }}</b></span>
          </div>

          <!-- Loading state -->
          <div v-if="isLoading" class="cqe-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i>
            <span>กำลังโหลดข้อมูลลูกค้า...</span>
          </div>

          <!-- Form Body -->
          <div v-else class="cqe-body">
            <!-- 1. ชื่อเล่น -->
            <div class="cqe-form-group">
              <label class="cqe-label">
                <i class="fa-solid fa-id-badge text-info"></i>
                <span>ชื่อเล่น (ใช้แสดงในระบบและเสียงอ่าน):</span>
              </label>
              <input
                ref="nicknameInputRef"
                type="text"
                v-model="formData.nickname"
                class="cqe-input"
                placeholder="เช่น เมธินี"
                @keydown.enter.prevent="handleNicknameEnter"
              />
            </div>

            <!-- 2. ช่องทางการติดต่อ -->
            <div class="cqe-form-group">
              <label class="cqe-label">
                <i class="fa-solid fa-comments text-success"></i>
                <span>ช่องทางการติดต่อ:</span>
              </label>
              <div class="cqe-channel-options">
                <button
                  type="button"
                  class="cqe-channel-btn none"
                  :class="{ active: !formData.contactChannel }"
                  @click="formData.contactChannel = ''"
                >
                  - (ยังไม่ระบุ)
                </button>
                <button
                  type="button"
                  class="cqe-channel-btn line"
                  :class="{ active: formData.contactChannel === 'line' }"
                  @click="formData.contactChannel = 'line'"
                >
                  💬 Line
                </button>
                <button
                  type="button"
                  class="cqe-channel-btn lineoa"
                  :class="{ active: formData.contactChannel === 'lineoa' }"
                  @click="formData.contactChannel = 'lineoa'"
                >
                  💚 LineOA
                </button>
                <button
                  type="button"
                  class="cqe-channel-btn phone"
                  :class="{ active: formData.contactChannel === 'phone' }"
                  @click="formData.contactChannel = 'phone'"
                >
                  📞 โทรศัพท์
                </button>
              </div>
            </div>

            <!-- 3. ที่อยู่จัดส่ง -->
            <div class="cqe-form-group">
              <div class="cqe-label-row">
                <label class="cqe-label">
                  <i class="fa-solid fa-map-location-dot text-warning"></i>
                  <span>ที่อยู่จัดส่ง:</span>
                </label>
                <span class="cqe-parse-badge" v-if="parseNotice">{{ parseNotice }}</span>
              </div>
              <textarea
                v-model="formData.address"
                rows="3"
                class="cqe-input cqe-textarea"
                placeholder="(วางที่อยู่ทั้งหมดได้ ระบบจะแยกเบอร์โทรให้อัตโนมัติ)"
                @input="handleAddressInput"
              ></textarea>
            </div>

            <!-- 4. ข้อมูลเสริม: ชื่อผู้รับจริง & เบอร์โทรศัพท์ -->
            <div class="cqe-row-2col">
              <div class="cqe-form-group">
                <label class="cqe-label-sub">ชื่อผู้รับบนกล่อง (ถ้ามี):</label>
                <input
                  type="text"
                  v-model="formData.recipientName"
                  class="cqe-input cqe-input-sm"
                  placeholder="ถ้าไม่ใส่จะใช้ชื่อเล่น"
                />
              </div>
              <div class="cqe-form-group">
                <label class="cqe-label-sub">เบอร์โทรศัพท์ (ถ้ามี):</label>
                <input
                  type="text"
                  v-model="formData.phone"
                  class="cqe-input cqe-input-sm"
                  placeholder="08x-xxx-xxxx"
                />
              </div>
            </div>
          </div>

          <!-- Footer Buttons -->
          <div class="cqe-footer">
            <button type="button" class="cqe-btn cqe-btn-cancel" @click="close" :disabled="isSaving">
              ยกเลิก
            </button>
            <button type="button" class="cqe-btn cqe-btn-save" @click="save" :disabled="isSaving">
              <i v-if="isSaving" class="fa-solid fa-circle-notch fa-spin"></i>
              <i v-else class="fa-solid fa-floppy-disk"></i>
              <span>{{ isSaving ? 'กำลังบันทึก...' : 'บันทึก' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, nextTick } from "vue";
import { ref as dbRef, get, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { normalizeName, parseSingleAddress } from "../utils/addressParser";
import { sanitizeDbKey } from "../utils/dbUtils";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { normalizeCustomerName, syncDeliveryCustomerForOwner } from "../utils/deliverySync";
import Swal from "sweetalert2";

const chatStore = useChatStore();
const stockStore = useStockStore();
const systemStore = useSystemStore();

const isOpen = ref(false);
const isLoading = ref(false);
const isSaving = ref(false);
const currentChat = ref(null);
const nicknameInputRef = ref(null);

const formData = ref({
  nickname: "",
  contactChannel: "",
  address: "",
  recipientName: "",
  phone: "",
  postalCode: "",
});

const parseNotice = ref("");
const matchedCustId = ref(null);
const existingAddressList = ref([]);
const existingActiveAddrId = ref(null);

const realNameStr = computed(() => {
  if (!currentChat.value) return "";
  return (
    currentChat.value.realName ||
    currentChat.value.authorName ||
    currentChat.value.displayName ||
    ""
  );
});

// ✅ Quick Address Parser on input
function handleAddressInput() {
  const raw = formData.value.address;
  if (!raw || !raw.trim()) {
    parseNotice.value = "";
    return;
  }

  const parsed = parseSingleAddress(raw);
  if (parsed) {
    const hits = [];
    if (parsed.phone && !formData.value.phone) {
      formData.value.phone = parsed.phone;
      hits.push("เบอร์โทร");
    }
    if (parsed.postalCode && !formData.value.postalCode) {
      formData.value.postalCode = parsed.postalCode;
    }
    if (parsed.name && !formData.value.recipientName) {
      formData.value.recipientName = parsed.name;
      hits.push("ชื่อผู้รับ");
    }
    if (hits.length > 0) {
      parseNotice.value = `✨ ตรวจพบ: ${hits.join(", ")}`;
    } else {
      parseNotice.value = "";
    }
  }
}

function handleNicknameEnter() {
  save();
}

/**
 * Open Modal with chat item
 */
async function open(chat) {
  if (!chat) return;
  currentChat.value = chat;
  isOpen.value = true;
  isLoading.value = true;
  isSaving.value = false;
  parseNotice.value = "";
  matchedCustId.value = null;
  existingAddressList.value = [];
  existingActiveAddrId.value = null;

  const currentDisplayName = chat.displayName || "";
  const currentRealName = chat.realName || chat.authorName || currentDisplayName;

  formData.value = {
    nickname: currentDisplayName,
    contactChannel: "",
    address: "",
    recipientName: "",
    phone: "",
    postalCode: "",
  };

  try {
    // 1. Search in address_book
    const normName = normalizeName(currentDisplayName).replace(/[.#$[\]/]/g, "_");
    const normReal = currentRealName ? normalizeName(currentRealName).replace(/[.#$[\]/]/g, "_") : "";

    let bookData = null;
    if (normName) {
      const snap = await get(dbRef(db, `address_book/${normName}`));
      if (snap.exists()) bookData = snap.val();
    }
    if (!bookData && normReal && normReal !== normName) {
      const snapReal = await get(dbRef(db, `address_book/${normReal}`));
      if (snapReal.exists()) bookData = snapReal.val();
    }

    if (bookData) {
      if (bookData.contactChannel) formData.value.contactChannel = bookData.contactChannel;
      if (bookData.address) formData.value.address = bookData.address;
      if (bookData.phone) formData.value.phone = bookData.phone;
      if (bookData.recipientName) formData.value.recipientName = bookData.recipientName;
      if (bookData.postalCode) formData.value.postalCode = bookData.postalCode;
      if (Array.isArray(bookData.addresses)) existingAddressList.value = bookData.addresses;
      if (bookData.selectedAddressId) existingActiveAddrId.value = bookData.selectedAddressId;
    }

    // 2. Search in delivery_customers
    const custSnap = await get(dbRef(db, "delivery_customers"));
    if (custSnap.exists()) {
      const allCusts = custSnap.val();
      const matched = Object.entries(allCusts).find(([id, c]) => {
        if (!c) return false;
        if (chat.uid && id === chat.uid) return true;
        const cNorm = normalizeName(c.name || "");
        return (
          (normName && cNorm === normalizeName(currentDisplayName)) ||
          (normReal && cNorm === normalizeName(currentRealName))
        );
      });

      if (matched) {
        matchedCustId.value = matched[0];
        const custData = matched[1];
        if (!formData.value.contactChannel && custData.contactChannel) {
          formData.value.contactChannel = custData.contactChannel;
        }
        if (!formData.value.address && custData.address) {
          formData.value.address = custData.address;
        }
        if (!formData.value.phone && custData.phone) {
          formData.value.phone = custData.phone;
        }
        if (!formData.value.recipientName && custData.recipientName) {
          formData.value.recipientName = custData.recipientName;
        }
        if (!formData.value.postalCode && custData.postalCode) {
          formData.value.postalCode = custData.postalCode;
        }
        if (Array.isArray(custData.addresses) && custData.addresses.length > 0) {
          existingAddressList.value = custData.addresses;
        }
        if (custData.selectedAddressId) {
          existingActiveAddrId.value = custData.selectedAddressId;
        }
      }
    }
  } catch (err) {
    console.warn("CustomerQuickEditModal load error:", err);
  } finally {
    isLoading.value = false;
    nextTick(() => {
      if (nicknameInputRef.value) {
        nicknameInputRef.value.focus();
        nicknameInputRef.value.select();
      }
    });
  }
}

function close() {
  if (isSaving.value) return;
  isOpen.value = false;
  currentChat.value = null;
}

/**
 * Save nickname, address, and contact channel to Firebase
 */
async function save() {
  if (!currentChat.value || isSaving.value) return;

  const trimmedNick = formData.value.nickname.trim();
  const rawReal = realNameStr.value;
  const targetUid = currentChat.value.uid || rawReal || trimmedNick;
  if (!targetUid && !trimmedNick) {
    close();
    return;
  }

  isSaving.value = true;
  const timestamp = Date.now();
  const multiPathUpdates = {};

  // 1. Save Nickname
  const safeTargetUid = sanitizeDbKey(targetUid);
  if (trimmedNick) {
    multiPathUpdates[`nicknames/${safeTargetUid}`] = {
      nick: trimmedNick,
      realName: rawReal,
      updatedAt: timestamp,
    };

    if (currentChat.value.uid && rawReal && currentChat.value.uid !== rawReal) {
      const safeReal = sanitizeDbKey(rawReal);
      if (safeReal !== safeTargetUid) {
        multiPathUpdates[`nicknames/${safeReal}`] = {
          nick: trimmedNick,
          realName: rawReal,
          updatedAt: timestamp,
        };
      }
    }

    // Instant local memory update for all chat rows
    if (chatStore.messages) {
      chatStore.messages.forEach((m) => {
        if (
          m.uid === currentChat.value.uid ||
          m.realName === rawReal ||
          m.authorName === rawReal ||
          m.displayName === currentChat.value.displayName
        ) {
          m.displayName = trimmedNick;
        }
      });
    }
  }

  // 2. Prepare Address & Contact Channel
  const primaryName = trimmedNick || currentChat.value.displayName || rawReal;
  const normKey = normalizeName(primaryName).replace(/[.#$[\]/]/g, "_");
  const cleanAddress = formData.value.address.trim();
  let phoneVal = formData.value.phone.trim();
  let recipientVal = formData.value.recipientName.trim();
  let zipVal = formData.value.postalCode.trim();

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

  // 3. Save to address_book
  if (normKey) {
    multiPathUpdates[`address_book/${normKey}/name`] = primaryName;
    multiPathUpdates[`address_book/${normKey}/contactChannel`] = formData.value.contactChannel || "";
    if (cleanAddress) {
      multiPathUpdates[`address_book/${normKey}/address`] = cleanAddress;
      multiPathUpdates[`address_book/${normKey}/recipientName`] = recipientVal || primaryName;
      multiPathUpdates[`address_book/${normKey}/phone`] = phoneVal || "";
      multiPathUpdates[`address_book/${normKey}/postalCode`] = zipVal || "";

      // Maintain addresses list
      const addrs = [...existingAddressList.value];
      const activeId = existingActiveAddrId.value || "addr_" + timestamp;
      const addrObj = {
        id: activeId,
        label: "ที่อยู่หลัก",
        recipientName: recipientVal || primaryName,
        phone: phoneVal || "",
        address: cleanAddress,
        postalCode: zipVal || "",
        contactChannel: formData.value.contactChannel || "",
      };
      if (addrs.length > 0) {
        const foundIdx = addrs.findIndex((a) => a.id === activeId);
        if (foundIdx >= 0) addrs[foundIdx] = { ...addrs[foundIdx], ...addrObj };
        else addrs[0] = { ...addrs[0], ...addrObj };
      } else {
        addrs.push(addrObj);
      }
      multiPathUpdates[`address_book/${normKey}/addresses`] = addrs;
      multiPathUpdates[`address_book/${normKey}/selectedAddressId`] = activeId;
    }
    multiPathUpdates[`address_book/${normKey}/updatedAt`] = timestamp;
  }

  // 4. Save to delivery_customers (if customer exists in shipping manager)
  if (matchedCustId.value) {
    if (trimmedNick) {
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/name`] = trimmedNick;
    }
    multiPathUpdates[`delivery_customers/${matchedCustId.value}/contactChannel`] = formData.value.contactChannel || "";
    if (cleanAddress) {
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/address`] = cleanAddress;
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/recipientName`] = recipientVal || primaryName;
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/phone`] = phoneVal || "";
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/postalCode`] = zipVal || "";

      const addrs = [...existingAddressList.value];
      const activeId = existingActiveAddrId.value || "addr_" + timestamp;
      const addrObj = {
        id: activeId,
        label: "ที่อยู่หลัก",
        recipientName: recipientVal || primaryName,
        phone: phoneVal || "",
        address: cleanAddress,
        postalCode: zipVal || "",
        contactChannel: formData.value.contactChannel || "",
      };
      if (addrs.length > 0) {
        const foundIdx = addrs.findIndex((a) => a.id === activeId);
        if (foundIdx >= 0) addrs[foundIdx] = { ...addrs[foundIdx], ...addrObj };
        else addrs[0] = { ...addrs[0], ...addrObj };
      } else {
        addrs.push(addrObj);
      }
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/addresses`] = addrs;
      multiPathUpdates[`delivery_customers/${matchedCustId.value}/selectedAddressId`] = activeId;
    }
    multiPathUpdates[`delivery_customers/${matchedCustId.value}/updatedAt`] = timestamp;
  }

  // 5. Update Customer Name in Stock Items (รายการสินค้า)
  const targetVideoId = currentChat.value.videoId || systemStore.currentVideoId;
  let updatedStockCount = 0;
  const affectedStockItems = [];

  if (trimmedNick && targetVideoId) {
    let currentStockData = stockStore.stockData || {};
    try {
      const stockSnap = await get(dbRef(db, `stock/${targetVideoId}`));
      if (stockSnap.exists()) {
        currentStockData = stockSnap.val();
      }
    } catch (e) {
      console.warn("CustomerQuickEditModal: Failed to fetch stock snapshot, falling back to local:", e);
    }

    const oldDisplayName = currentChat.value.displayName;
    const chatAuthor = currentChat.value.authorName;
    const chatReal = currentChat.value.realName;
    const chatUid = currentChat.value.uid;

    const matchCandidates = [
      oldDisplayName,
      chatAuthor,
      chatReal,
      rawReal,
    ].filter(Boolean);

    const isCustomerMatch = (itemOwner, itemUid) => {
      // 1. Direct UID match
      if (chatUid && itemUid && itemUid === chatUid) {
        return true;
      }
      // 2. Owner name match
      const normItemOwner = normalizeCustomerName(itemOwner);
      if (normItemOwner) {
        for (const cand of matchCandidates) {
          if (normItemOwner === normalizeCustomerName(cand)) {
            return true;
          }
        }
      }
      // 3. Fallback: match if itemUid holds previous name
      if (itemUid) {
        const normItemUid = normalizeCustomerName(itemUid);
        for (const cand of matchCandidates) {
          if (normItemUid === normalizeCustomerName(cand)) {
            return true;
          }
        }
      }
      return false;
    };

    Object.entries(currentStockData).forEach(([numStr, item]) => {
      if (!item) return;
      const num = parseInt(numStr, 10);
      let itemChanged = false;
      let newQueue = null;

      // Check main owner
      if (item.owner && item.owner !== trimmedNick && isCustomerMatch(item.owner, item.uid)) {
        multiPathUpdates[`stock/${targetVideoId}/${num}/owner`] = trimmedNick;
        itemChanged = true;
      }

      // Check reservation queue
      if (Array.isArray(item.queue) && item.queue.length > 0) {
        let queueChanged = false;
        newQueue = item.queue.map((q) => {
          if (q && q.owner && q.owner !== trimmedNick && isCustomerMatch(q.owner, q.uid)) {
            queueChanged = true;
            return { ...q, owner: trimmedNick };
          }
          return q;
        });

        if (queueChanged) {
          multiPathUpdates[`stock/${targetVideoId}/${num}/queue`] = newQueue;
          itemChanged = true;
        } else {
          newQueue = null;
        }
      }

      if (itemChanged) {
        updatedStockCount++;
        affectedStockItems.push({ num, newQueue });
      }
    });
  }

  try {
    await update(dbRef(db), multiPathUpdates);

    // Local memory update for stock items
    if (trimmedNick && affectedStockItems.length > 0 && stockStore.stockData) {
      affectedStockItems.forEach(({ num, newQueue }) => {
        const item = stockStore.stockData[num];
        if (item) {
          if (item.owner && item.owner !== trimmedNick) {
            item.owner = trimmedNick;
          }
          if (newQueue) {
            item.queue = newQueue;
          }
        }
      });
    }

    // Auto-sync delivery customers count for this video
    if (updatedStockCount > 0 && targetVideoId) {
      syncDeliveryCustomerForOwner(trimmedNick, targetUid, targetVideoId).catch((e) =>
        console.warn("Delivery sync error for new name:", e)
      );
      const oldName = currentChat.value.displayName;
      if (oldName && oldName !== trimmedNick) {
        syncDeliveryCustomerForOwner(oldName, targetUid, targetVideoId).catch((e) =>
          console.warn("Delivery sync error for old name:", e)
        );
      }
    }

    const stockMsg = updatedStockCount > 0 ? ` (อัปเดตในสินค้า ${updatedStockCount} รายการ)` : "";
    Swal.fire({
      icon: "success",
      title: `บันทึกข้อมูล "${primaryName}" สำเร็จ${stockMsg}`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1800,
    });
    close();
  } catch (err) {
    console.error("CustomerQuickEditModal save error:", err);
    Swal.fire({
      icon: "error",
      title: "บันทึกไม่สำเร็จ",
      text: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล",
      timer: 2500,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  } finally {
    isSaving.value = false;
  }
}

defineExpose({
  open,
  close,
});
</script>

<style scoped>
/* Overlay Backdrop */
.cqe-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: cqeFadeIn 0.15s ease-out;
}

/* Modal Card */
.cqe-modal {
  background: #1e1e24;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
  animation: cqeSlideUp 0.18s ease-out;
}

/* Header */
.cqe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 10px;
}

.cqe-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.25em;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.2px;
}

.cqe-title-icon {
  color: #818cf8;
  font-size: 1.1em;
}

.cqe-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.cqe-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* Sub-banner (ชื่อจริง) */
.cqe-sub-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 20px 12px;
  font-size: 0.9em;
  color: #94a3b8;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.cqe-yt-icon {
  color: #ef4444;
  font-size: 1em;
}

.cqe-sub-text b {
  color: #e2e8f0;
  font-weight: 600;
}

/* Loading */
.cqe-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 1em;
}

.cqe-loading i {
  color: #818cf8;
  font-size: 1.4em;
}

/* Body */
.cqe-body {
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 70vh;
  overflow-y: auto;
}

.cqe-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cqe-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.92em;
  font-weight: 700;
  color: #cbd5e1;
}

.cqe-label-sub {
  font-size: 0.85em;
  font-weight: 600;
  color: #94a3b8;
}

.cqe-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px;
}

.cqe-parse-badge {
  font-size: 0.82em;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 2px 8px;
  border-radius: 10px;
}

/* Inputs */
.cqe-input {
  background: #111827;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 0.96em;
  padding: 10px 12px;
  transition: all 0.15s ease;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;
}

.cqe-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.22);
  outline: none;
}

.cqe-input::placeholder {
  color: #64748b;
  font-size: 0.9em;
}

.cqe-input-sm {
  padding: 8px 10px;
  font-size: 0.9em;
}

.cqe-textarea {
  resize: vertical;
  min-height: 75px;
  line-height: 1.45;
}

/* 2-column row */
.cqe-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

/* Contact Channel Pill Options */
.cqe-channel-options {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cqe-channel-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 18px;
  border: 1px solid #334155;
  background: #0f172a;
  color: #94a3b8;
  font-size: 0.88em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.cqe-channel-btn:hover {
  border-color: #64748b;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}

.cqe-channel-btn.active.none {
  background: rgba(148, 163, 184, 0.18);
  color: #f1f5f9;
  border: 1px dashed #94a3b8;
}

.cqe-channel-btn.active.line {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
  border: 1px solid #22c55e;
}

.cqe-channel-btn.active.lineoa {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
  border: 1px solid #10b981;
}

.cqe-channel-btn.active.phone {
  background: rgba(59, 130, 246, 0.18);
  color: #60a5fa;
  border: 1px solid #3b82f6;
}

/* Footer */
.cqe-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
}

.cqe-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95em;
  font-weight: 700;
  padding: 8px 22px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.cqe-btn-cancel {
  background: #475569;
  color: #f1f5f9;
}

.cqe-btn-cancel:hover:not(:disabled) {
  background: #334155;
  color: #ffffff;
}

.cqe-btn-save {
  background: #6366f1;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
}

.cqe-btn-save:hover:not(:disabled) {
  background: #4f46e5;
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
  transform: translateY(-1px);
}

.cqe-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Animations */
@keyframes cqeFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes cqeSlideUp {
  from { transform: translateY(12px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.cqe-fade-enter-active,
.cqe-fade-leave-active {
  transition: opacity 0.15s ease;
}

.cqe-fade-enter-from,
.cqe-fade-leave-to {
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .cqe-modal {
    max-width: 95vw;
  }
  .cqe-row-2col {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>

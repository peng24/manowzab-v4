<template>
  <div class="cam-overlay" @click.self="$emit('close')">
    <div class="cam-modal">
      <!-- Modal Header -->
      <div class="cam-header">
        <div class="cam-title">
          <span>📍 ที่อยู่จัดส่งของ <b>{{ customer?.name }}</b></span>
          <span class="cam-count-badge">{{ addressList.length }} ที่อยู่</span>
        </div>
        <button class="cam-close-btn" @click="$emit('close')" title="ปิด">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="cam-body">
        <!-- Address Cards List -->
        <div class="cam-list-section" v-if="!isEditingForm">
          <div class="cam-list-header">
            <span class="cam-list-title">เลือกที่อยู่ที่ต้องการส่งสำหรับรอบนี้:</span>
            <button class="btn btn-sm btn-primary cam-add-btn" @click="openAddForm">
              <i class="fa-solid fa-plus"></i> เพิ่มที่อยู่ใหม่
            </button>
          </div>

          <div v-if="addressList.length === 0" class="cam-empty">
            <i class="fa-solid fa-location-dot cam-empty-icon"></i>
            <div>ยังไม่มีที่อยู่บันทึกไว้สำหรับลูกค้ารายนี้</div>
            <button class="btn btn-sm btn-success" style="margin-top: 10px;" @click="openAddForm">
              <i class="fa-solid fa-plus"></i> เพิ่มที่อยู่แรก
            </button>
          </div>

          <div class="cam-cards" v-else>
            <div
              v-for="(addr, idx) in addressList"
              :key="addr.id || idx"
              class="cam-card"
              :class="{ active: isSelected(addr) }"
              @click="selectActiveAddress(addr)"
            >
              <div class="cam-card-top">
                <div class="cam-card-radio">
                  <i class="fa-solid" :class="isSelected(addr) ? 'fa-circle-dot active-radio' : 'fa-circle-notch text-muted'"></i>
                  <span class="cam-label-tag" v-if="addr.label">{{ addr.label }}</span>
                  <span class="cam-label-tag default" v-else>ที่อยู่ {{ idx + 1 }}</span>
                  <span class="cam-active-badge" v-if="isSelected(addr)">✨ เลือกส่งที่อยู่นี้</span>
                </div>

                <div class="cam-card-actions" @click.stop>
                  <button class="cam-act-btn edit" @click.stop="openEditForm(addr, idx)" title="แก้ไขที่อยู่นี้">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="cam-act-btn del" @click.stop="deleteAddress(idx)" title="ลบที่อยู่นี้">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>

              <!-- Address Details -->
              <div class="cam-card-content">
                <div class="cam-recipient-line">
                  <i class="fa-solid fa-user-tag"></i>
                  <span><b>ผู้รับ:</b> {{ addr.recipientName || customer?.name }}</span>
                </div>
                <div class="cam-phone-line" v-if="addr.phone">
                  <i class="fa-solid fa-phone"></i>
                  <span>{{ addr.phone }}</span>
                </div>
                <div class="cam-addr-line">
                  <i class="fa-solid fa-map-location-dot"></i>
                  <span>{{ addr.address }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add / Edit Form -->
        <div class="cam-form-section" v-else>
          <div class="cam-form-title">
            <span>{{ editingIndex !== null ? '✏️ แก้ไขที่อยู่' : '➕ เพิ่มที่อยู่ใหม่' }}</span>
            <button class="btn btn-sm btn-dark" @click="cancelForm">
              <i class="fa-solid fa-arrow-left"></i> กลับหน้ารายการ
            </button>
          </div>

          <!-- ⚡ Quick Paste / Auto-fill Box -->
          <div class="cam-quick-paste-box">
            <div class="cam-quick-header">
              <div class="cam-quick-title">
                <i class="fa-solid fa-wand-magic-sparkles text-warning"></i>
                <span>วางข้อความที่อยู่ด่วน (แยกข้อมูลให้อัตโนมัติ):</span>
              </div>
              <span class="cam-quick-badge" v-if="pasteNotice">{{ pasteNotice }}</span>
            </div>
            <div class="cam-quick-input-wrap">
              <textarea
                v-model="quickPasteText"
                @input="handleQuickPasteInput"
                class="cam-input cam-quick-textarea"
                rows="2"
                placeholder="📋 วางที่อยู่ทั้งหมดที่นี่ (เช่น ก๊อปมาจากแชท / Note) ระบบจะแยก ชื่อผู้รับ, เบอร์โทร, ที่อยู่ ให้อัตโนมัติ..."
              ></textarea>
              <button
                v-if="quickPasteText"
                class="cam-quick-clear-btn"
                @click="clearQuickPaste"
                type="button"
                title="ล้างข้อความ"
              >
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="cam-form-grid">
            <div class="cam-form-group">
              <label>ป้ายกำกับที่อยู่ (เช่น บ้าน, ที่ทำงาน, สาขา 2):</label>
              <input
                type="text"
                v-model="formData.label"
                class="cam-input"
                placeholder="เช่น บ้าน, คอนโด, ที่ทำงาน..."
              />
            </div>

            <div class="cam-form-group">
              <label>ชื่อผู้รับจริง (พิมพ์บนกล่อง):</label>
              <input
                type="text"
                v-model="formData.recipientName"
                class="cam-input"
                placeholder="เช่น คุณรุ้งนภา (ถ้าไม่ใส่จะใช้ชื่อ CF)"
              />
            </div>

            <div class="cam-form-group">
              <label>เบอร์โทรศัพท์:</label>
              <input
                type="text"
                v-model="formData.phone"
                class="cam-input"
                placeholder="08x-xxx-xxxx"
              />
            </div>

            <div class="cam-form-group col-span">
              <label>ที่อยู่จัดส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์):</label>
              <textarea
                v-model="formData.address"
                class="cam-input cam-textarea"
                rows="3"
                placeholder="36 ถ.พังงา ต.ตลาดใหญ่ อ.เมือง จ.ภูเก็ต 83000..."
              ></textarea>
            </div>

            <div class="cam-form-group col-span">
              <label>รูปแบบการจัดส่งและการชำระเงิน:</label>
              <select v-model="formData.paymentType" class="cam-input">
                <option value="">❓ ยังไม่ระบุ</option>
                <option value="transfer">💳 โอนเงิน</option>
                <option value="cod">💵 COD (เก็บเงินปลายทาง)</option>
              </select>
            </div>

            <div class="cam-form-group col-span">
              <label class="cam-checkbox-wrap">
                <input type="checkbox" v-model="formData.setAsActive" />
                <span>ใช้ที่อยู่นี้เป็นที่อยู่จัดส่งสำหรับรอบปัจจุบันทันที</span>
              </label>
            </div>
          </div>

          <div class="cam-form-footer">
            <button class="btn btn-dark" @click="cancelForm">ยกเลิก</button>
            <button class="btn btn-success" @click="saveForm" :disabled="!formData.address.trim()">
              <i class="fa-solid fa-floppy-disk"></i> บันทึกที่อยู่
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { ref as dbRef, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { normalizeName, parseSingleAddress } from "../utils/addressParser";
import Swal from "sweetalert2";

const props = defineProps({
  customer: {
    type: Object,
    required: true,
  },
  addressBook: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["close", "updated"]);

const isEditingForm = ref(false);
const editingIndex = ref(null);
const quickPasteText = ref("");
const pasteNotice = ref("");

const formData = ref({
  id: "",
  label: "",
  recipientName: "",
  phone: "",
  address: "",
  postalCode: "",
  paymentType: "",
  setAsActive: true,
});

function handleQuickPasteInput() {
  if (!quickPasteText.value.trim()) {
    pasteNotice.value = "";
    return;
  }

  const parsed = parseSingleAddress(quickPasteText.value);
  if (parsed) {
    const filledFields = [];
    if (parsed.recipientName) {
      formData.value.recipientName = parsed.recipientName;
      filledFields.push("ชื่อผู้รับ");
    }
    if (parsed.phone) {
      formData.value.phone = parsed.phone;
      filledFields.push("เบอร์โทร");
    }
    if (parsed.address) {
      formData.value.address = parsed.address;
      filledFields.push("ที่อยู่");
    }
    if (parsed.postalCode) {
      formData.value.postalCode = parsed.postalCode;
    }

    if (filledFields.length > 0) {
      pasteNotice.value = `✨ แยกสำเร็จ: ${filledFields.join(", ")}`;
    } else {
      pasteNotice.value = "";
    }
  }
}

function clearQuickPaste() {
  quickPasteText.value = "";
  pasteNotice.value = "";
}

const normKey = computed(() => {
  if (!props.customer?.name) return "";
  return normalizeName(props.customer.name).replace(/[.#$[\]/]/g, "_");
});

// Build raw address list
const addressList = computed(() => {
  const list = [];
  const existingInCust = props.customer?.addresses;
  const existingInBook = props.addressBook && props.addressBook[normKey.value]?.addresses;

  const rawList = existingInCust || existingInBook;

  if (Array.isArray(rawList) && rawList.length > 0) {
    return rawList;
  }

  // Fallback: Check single address on customer or address book
  const custAddr = props.customer?.address;
  const bookAddr = props.addressBook && props.addressBook[normKey.value]?.address;
  const singleAddr = custAddr || bookAddr;

  if (singleAddr && singleAddr.trim()) {
    const singleRecipient = props.customer?.recipientName || props.addressBook?.[normKey.value]?.recipientName || props.customer?.name;
    const singlePhone = props.customer?.phone || props.addressBook?.[normKey.value]?.phone || "";
    const singleZip = props.customer?.postalCode || props.addressBook?.[normKey.value]?.postalCode || "";
    list.push({
      id: props.customer?.selectedAddressId || "addr_default",
      label: "ที่อยู่หลัก",
      recipientName: singleRecipient,
      phone: singlePhone,
      address: singleAddr,
      postalCode: singleZip,
    });
  }

  return list;
});

const currentSelectedAddrId = ref(props.customer?.selectedAddressId || "");
const currentSelectedAddressText = ref(props.customer?.address || "");

watch(
  () => [props.customer?.selectedAddressId, props.customer?.address],
  ([newId, newAddr]) => {
    if (newId) currentSelectedAddrId.value = newId;
    if (newAddr) currentSelectedAddressText.value = newAddr;
  },
  { immediate: true }
);

function isSelected(addr) {
  if (!addr) return false;

  // 1. Local selection state (Instant Optimistic UI)
  if (currentSelectedAddrId.value && addr.id) {
    if (currentSelectedAddrId.value === addr.id) return true;
  }
  if (currentSelectedAddressText.value && addr.address) {
    if (currentSelectedAddressText.value.trim() === addr.address.trim()) return true;
  }

  // 2. Customer props fallback
  if (props.customer?.selectedAddressId && addr.id) {
    if (props.customer.selectedAddressId === addr.id) return true;
  }
  if (props.customer?.address && addr.address) {
    if (props.customer.address.trim() === addr.address.trim()) return true;
  }

  // 3. Address book fallback
  const bookEntry = props.addressBook && props.addressBook[normKey.value];
  if (bookEntry?.selectedAddressId && addr.id) {
    if (bookEntry.selectedAddressId === addr.id) return true;
  }
  if (bookEntry?.address && addr.address) {
    if (bookEntry.address.trim() === addr.address.trim()) return true;
  }

  return false;
}

function openAddForm() {
  quickPasteText.value = "";
  pasteNotice.value = "";
  formData.value = {
    id: "addr_" + Date.now(),
    label: `ที่อยู่ ${addressList.value.length + 1}`,
    recipientName: props.customer?.recipientName || "",
    phone: props.customer?.phone || "",
    address: "",
    postalCode: "",
    paymentType: props.customer?.paymentType || "",
    setAsActive: true,
  };
  editingIndex.value = null;
  isEditingForm.value = true;
}

function openEditForm(addr, index) {
  quickPasteText.value = "";
  pasteNotice.value = "";
  formData.value = {
    id: addr.id || "addr_" + Date.now(),
    label: addr.label || `ที่อยู่ ${index + 1}`,
    recipientName: addr.recipientName || "",
    phone: addr.phone || "",
    address: addr.address || "",
    postalCode: addr.postalCode || "",
    paymentType: addr.paymentType || props.customer?.paymentType || "",
    setAsActive: isSelected(addr),
  };
  editingIndex.value = index;
  isEditingForm.value = true;
}

function cancelForm() {
  quickPasteText.value = "";
  pasteNotice.value = "";
  isEditingForm.value = false;
  editingIndex.value = null;
}

async function selectActiveAddress(addr) {
  // ⚡ Optimistic UI: Update green highlight instantly!
  currentSelectedAddrId.value = addr.id || "";
  currentSelectedAddressText.value = (addr.address || "").trim();

  const timestamp = Date.now();
  const cleanName = (props.customer?.name || "").trim();
  const recName = (addr.recipientName || "").trim();

  const updates = {};
  if (props.customer?.id) {
    updates[`delivery_customers/${props.customer.id}/selectedAddressId`] = addr.id || "";
    updates[`delivery_customers/${props.customer.id}/recipientName`] = recName;
    updates[`delivery_customers/${props.customer.id}/phone`] = addr.phone || "";
    updates[`delivery_customers/${props.customer.id}/address`] = addr.address || "";
    updates[`delivery_customers/${props.customer.id}/postalCode`] = addr.postalCode || "";
    updates[`delivery_customers/${props.customer.id}/updatedAt`] = timestamp;
  }

  // Also update address book
  if (normKey.value) {
    updates[`address_book/${normKey.value}/selectedAddressId`] = addr.id || "";
    updates[`address_book/${normKey.value}/recipientName`] = recName;
    updates[`address_book/${normKey.value}/phone`] = addr.phone || "";
    updates[`address_book/${normKey.value}/address`] = addr.address || "";
    updates[`address_book/${normKey.value}/postalCode`] = addr.postalCode || "";
    updates[`address_book/${normKey.value}/updatedAt`] = timestamp;
  }

  try {
    await update(dbRef(db), updates);
  } catch (err) {
    console.error("Error updating active address:", err);
  }

  emit("updated", addr);

  Swal.fire({
    icon: "success",
    title: `เลือกส่งที่: ${addr.label || 'ที่อยู่นี้'} เรียบร้อย`,
    toast: true,
    position: "top-end",
    timer: 1500,
    showConfirmButton: false,
  });
}

async function saveForm() {
  if (!formData.value.address.trim()) return;

  const currentList = [...addressList.value];
  const newAddrObj = {
    id: formData.value.id || "addr_" + Date.now(),
    label: formData.value.label.trim() || `ที่อยู่ ${currentList.length + 1}`,
    recipientName: formData.value.recipientName.trim(),
    phone: formData.value.phone.trim(),
    address: formData.value.address.trim(),
    postalCode: formData.value.postalCode.trim(),
    paymentType: formData.value.paymentType || "",
  };

  // Extract postal code if missing
  if (!newAddrObj.postalCode) {
    const match = newAddrObj.address.match(/\b[1-9]\d{4}\b/);
    if (match) newAddrObj.postalCode = match[0];
  }

  if (editingIndex.value !== null) {
    currentList[editingIndex.value] = newAddrObj;
  } else {
    currentList.push(newAddrObj);
  }

  const timestamp = Date.now();
  const cleanName = props.customer.name.trim();
  const shouldBeActive = formData.value.setAsActive || currentList.length === 1;

  const updates = {};
  updates[`delivery_customers/${props.customer.id}/addresses`] = currentList;
  updates[`delivery_customers/${props.customer.id}/paymentType`] = formData.value.paymentType || "";
  updates[`address_book/${normKey.value}/addresses`] = currentList;
  updates[`address_book/${normKey.value}/name`] = cleanName;
  updates[`address_book/${normKey.value}/updatedAt`] = timestamp;

  if (shouldBeActive) {
    currentSelectedAddrId.value = newAddrObj.id;
    currentSelectedAddressText.value = newAddrObj.address;

    if (props.customer?.id) {
      updates[`delivery_customers/${props.customer.id}/selectedAddressId`] = newAddrObj.id;
      updates[`delivery_customers/${props.customer.id}/recipientName`] = newAddrObj.recipientName;
      updates[`delivery_customers/${props.customer.id}/phone`] = newAddrObj.phone;
      updates[`delivery_customers/${props.customer.id}/address`] = newAddrObj.address;
      updates[`delivery_customers/${props.customer.id}/postalCode`] = newAddrObj.postalCode;
    }

    if (normKey.value) {
      updates[`address_book/${normKey.value}/selectedAddressId`] = newAddrObj.id;
      updates[`address_book/${normKey.value}/recipientName`] = newAddrObj.recipientName;
      updates[`address_book/${normKey.value}/phone`] = newAddrObj.phone;
      updates[`address_book/${normKey.value}/address`] = newAddrObj.address;
      updates[`address_book/${normKey.value}/postalCode`] = newAddrObj.postalCode;
    }
  }

  await update(dbRef(db), updates);

  Swal.fire({
    icon: "success",
    title: "บันทึกที่อยู่สำเร็จ",
    toast: true,
    position: "top-end",
    timer: 1500,
    showConfirmButton: false,
  });

  isEditingForm.value = false;
  editingIndex.value = null;
}

async function deleteAddress(index) {
  const item = addressList.value[index];
  const result = await Swal.fire({
    title: `ลบที่อยู่ "${item.label || index + 1}"?`,
    text: item.address,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบที่อยู่",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#ef4444",
  });

  if (result.isConfirmed) {
    const currentList = [...addressList.value];
    currentList.splice(index, 1);

    const timestamp = Date.now();
    const updates = {};
    if (props.customer?.id) {
      updates[`delivery_customers/${props.customer.id}/addresses`] = currentList;
    }
    if (normKey.value) {
      updates[`address_book/${normKey.value}/addresses`] = currentList;
      updates[`address_book/${normKey.value}/updatedAt`] = timestamp;
    }

    // If deleted active address, fallback to first available
    if (isSelected(item)) {
      if (currentList.length > 0) {
        const nextActive = currentList[0];
        currentSelectedAddrId.value = nextActive.id || "";
        currentSelectedAddressText.value = nextActive.address || "";

        if (props.customer?.id) {
          updates[`delivery_customers/${props.customer.id}/selectedAddressId`] = nextActive.id;
          updates[`delivery_customers/${props.customer.id}/recipientName`] = nextActive.recipientName || "";
          updates[`delivery_customers/${props.customer.id}/phone`] = nextActive.phone || "";
          updates[`delivery_customers/${props.customer.id}/address`] = nextActive.address || "";
          updates[`delivery_customers/${props.customer.id}/postalCode`] = nextActive.postalCode || "";
        }

        if (normKey.value) {
          updates[`address_book/${normKey.value}/selectedAddressId`] = nextActive.id;
          updates[`address_book/${normKey.value}/recipientName`] = nextActive.recipientName || "";
          updates[`address_book/${normKey.value}/phone`] = nextActive.phone || "";
          updates[`address_book/${normKey.value}/address`] = nextActive.address || "";
          updates[`address_book/${normKey.value}/postalCode`] = nextActive.postalCode || "";
        }
      } else {
        currentSelectedAddrId.value = "";
        currentSelectedAddressText.value = "";

        if (props.customer?.id) {
          updates[`delivery_customers/${props.customer.id}/selectedAddressId`] = "";
          updates[`delivery_customers/${props.customer.id}/recipientName`] = "";
          updates[`delivery_customers/${props.customer.id}/phone`] = "";
          updates[`delivery_customers/${props.customer.id}/address`] = "";
          updates[`delivery_customers/${props.customer.id}/postalCode`] = "";
        }

        if (normKey.value) {
          updates[`address_book/${normKey.value}/selectedAddressId`] = "";
          updates[`address_book/${normKey.value}/recipientName`] = "";
          updates[`address_book/${normKey.value}/phone`] = "";
          updates[`address_book/${normKey.value}/address`] = "";
          updates[`address_book/${normKey.value}/postalCode`] = "";
        }
      }
    }

    await update(dbRef(db), updates);
    Swal.fire({
      icon: "success",
      title: "ลบที่อยู่เรียบร้อย",
      toast: true,
      position: "top-end",
      timer: 1200,
      showConfirmButton: false,
    });
  }
}

onMounted(() => {
  if (addressList.value.length === 0) {
    openAddForm();
  }
});
</script>

<style scoped>
.cam-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 16px;
  box-sizing: border-box;
}

.cam-modal {
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  font-family: "Kanit", sans-serif;
}

.cam-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #27272a;
}

.cam-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05em;
  color: #fff;
}

.cam-count-badge {
  font-size: 0.75em;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 1px 8px;
  border-radius: 10px;
}

.cam-close-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.cam-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.cam-body {
  padding: 16px 20px;
  overflow-y: auto;
  flex: 1;
}

/* List section */
.cam-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.cam-list-title {
  font-size: 0.88em;
  color: #a1a1aa;
  font-weight: 500;
}

.cam-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cam-card {
  background: #202024;
  border: 1px solid #333338;
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cam-card:hover {
  border-color: #52525b;
  background: #242429;
}

.cam-card.active {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.08);
}

.cam-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cam-card-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.active-radio {
  color: #10b981;
  font-size: 1.1em;
}

.text-muted {
  color: #52525b;
  font-size: 1.1em;
}

.cam-label-tag {
  font-size: 0.8em;
  font-weight: 600;
  background: #27272a;
  color: #e4e4e7;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid #3f3f46;
}

.cam-active-badge {
  font-size: 0.75em;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

.cam-card-actions {
  display: flex;
  gap: 4px;
}

.cam-act-btn {
  background: transparent;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  transition: all 0.2s;
}

.cam-act-btn.edit {
  color: #93c5fd;
}

.cam-act-btn.edit:hover {
  background: rgba(59, 130, 246, 0.15);
}

.cam-act-btn.del {
  color: #f87171;
}

.cam-act-btn.del:hover {
  background: rgba(239, 68, 68, 0.15);
}

.cam-card-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.88em;
  color: #d4d4d8;
  padding-left: 26px;
}

.cam-card-content i {
  color: #71717a;
  width: 16px;
  margin-right: 4px;
}

.cam-empty {
  text-align: center;
  color: #a1a1aa;
  padding: 30px 10px;
}

.cam-empty-icon {
  font-size: 2.5em;
  color: #3f3f46;
  margin-bottom: 8px;
}

/* Form section */
.cam-form-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1em;
  font-weight: 700;
  color: #fff;
  margin-bottom: 14px;
}

/* ⚡ Quick Paste Box */
.cam-quick-paste-box {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.45), rgba(15, 23, 42, 0.55));
  border: 1px dashed rgba(96, 165, 250, 0.45);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.25s ease;
}

.cam-quick-paste-box:focus-within {
  border-color: #3b82f6;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.65), rgba(15, 23, 42, 0.75));
  box-shadow: 0 0 16px rgba(59, 130, 246, 0.18);
}

.cam-quick-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.cam-quick-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  font-weight: 600;
  color: #93c5fd;
}

.cam-quick-badge {
  font-size: 0.75em;
  font-weight: 700;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 8px;
  border-radius: 8px;
  animation: fadeIn 0.3s ease;
}

.cam-quick-input-wrap {
  position: relative;
  width: 100%;
}

.cam-quick-textarea {
  width: 100%;
  box-sizing: border-box;
  padding-right: 32px;
  background: rgba(18, 18, 20, 0.85);
  border: 1px solid #3f3f46;
  font-size: 0.85em;
  line-height: 1.4;
  border-radius: 8px;
  resize: vertical;
}

.cam-quick-textarea:focus {
  border-color: #60a5fa;
}

.cam-quick-clear-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(63, 63, 70, 0.6);
  border: none;
  color: #a1a1aa;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75em;
  transition: all 0.2s;
}

.cam-quick-clear-btn:hover {
  background: #ef4444;
  color: #fff;
}

.cam-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.col-span {
  grid-column: 1 / -1;
}

.cam-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cam-form-group label {
  font-size: 0.82em;
  color: #a1a1aa;
}

.cam-input {
  background: #141417;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #fff;
  padding: 8px 12px;
  font-family: inherit;
  font-size: 0.9em;
  outline: none;
}

.cam-input:focus {
  border-color: #3b82f6;
}

.cam-textarea {
  resize: vertical;
}

.cam-checkbox-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88em;
  color: #60a5fa;
  cursor: pointer;
  margin-top: 4px;
}

.cam-checkbox-wrap input {
  accent-color: #3b82f6;
  width: 16px;
  height: 16px;
}

.cam-form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid #27272a;
}
</style>

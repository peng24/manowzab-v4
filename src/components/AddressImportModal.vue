<template>
  <div class="aim-overlay" @click.self="$emit('close')">
    <div class="aim-modal">
      <!-- Header -->
      <div class="aim-header">
        <div class="aim-title">
          <span>📥 นำเข้าที่อยู่จาก Apple Note / แชท</span>
          <span class="aim-badge">Smart Parser</span>
        </div>
        <button class="aim-close-btn" @click="$emit('close')" title="ปิด">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="aim-body">
        <!-- Step 1: Input Box -->
        <div class="aim-step" v-if="parsedEntries.length === 0">
          <div class="aim-tips">
            <i class="fa-solid fa-lightbulb aim-tip-icon"></i>
            <div>
              <strong>วิธีใช้งาน:</strong> เปิดแอป <b>Note</b> บน iPhone กด <b>เลือกทั้งหมด (Select All)</b> & <b>คัดลอก (Copy)</b> แล้วนำมาวางในช่องด้านล่างได้เลย ระบบจะแยก <b>ชื่อ • เบอร์โทร • ที่อยู่ • รหัสไปรษณีย์</b> ให้ทุกคนอัตโนมัติ!
            </div>
          </div>

          <textarea
            v-model="rawInput"
            class="aim-textarea"
            rows="10"
            placeholder="วางข้อความที่ก๊อปปี้มาจาก Note ที่นี่... ตัวอย่าง:&#10;&#10;พี่ไหม&#10;081-234-5678&#10;123/45 หมู่ 6 ต.บ้านใหม่ อ.เมือง จ.เชียงใหม่ 50000&#10;&#10;คุณนก&#10;089-999-9999&#10;99/9 ถ.สุขุมวิท กทม 10110"
          ></textarea>

          <div class="aim-actions-bar">
            <button
              class="btn btn-primary aim-parse-btn"
              :disabled="!rawInput.trim()"
              @click="handleParse"
            >
              <i class="fa-solid fa-wand-magic-sparkles"></i> ตรวจสอบและแยกที่อยู่อัจฉริยะ
            </button>
            <button
              v-if="rawInput"
              class="btn btn-dark"
              @click="rawInput = ''"
            >
              ล้างข้อความ
            </button>
          </div>
        </div>

        <!-- Step 2: Parsed Result Preview & Edit -->
        <div class="aim-step" v-else>
          <div class="aim-result-header">
            <div>
              <span class="aim-result-count">พบ {{ parsedEntries.length }} รายชื่อ</span>
              <span class="aim-result-sub">ตรวจสอบความถูกต้องก่อนบันทึก</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-dark btn-sm" @click="parsedEntries = []">
                <i class="fa-solid fa-arrow-left"></i> วางใหม่
              </button>
              <button class="btn btn-success btn-sm" @click="saveAllAddresses" :disabled="isSaving">
                <i class="fa-solid fa-floppy-disk"></i> {{ isSaving ? 'กำลังบันทึก...' : `บันทึกทั้งหมด (${selectedCount})` }}
              </button>
            </div>
          </div>

          <!-- Entries List -->
          <div class="aim-entries-list">
            <div
              v-for="(entry, index) in parsedEntries"
              :key="index"
              class="aim-entry-card"
              :class="{ 'aim-entry-unselected': !entry.selected }"
            >
              <div class="aim-card-top">
                <label class="aim-checkbox-label">
                  <input type="checkbox" v-model="entry.selected" />
                  <span class="aim-entry-num">#{{ index + 1 }}</span>
                </label>

                <div class="aim-match-status" v-if="getMatchedCustomer(entry.name)">
                  <i class="fa-solid fa-circle-check" style="color: #10b981;"></i>
                  <span>ตรงกับรายการส่ง: <b>{{ getMatchedCustomer(entry.name).name }}</b> ({{ getMatchedCustomer(entry.name).itemCount || 0 }} ชิ้น)</span>
                </div>
                <div class="aim-match-status new" v-else>
                  <i class="fa-solid fa-user-plus" style="color: #60a5fa;"></i>
                  <span>บันทึกลงสมุดที่อยู่ลูกค้าใหม่</span>
                </div>

                <button class="aim-del-btn" @click="removeEntry(index)" title="ลบรายการนี้">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>

              <div class="aim-card-grid">
                <div class="aim-field">
                  <label>ชื่อลูกค้า (CF ในไลฟ์)</label>
                  <input type="text" v-model="entry.name" class="aim-input" placeholder="ชื่อที่ใช้ CF..." />
                </div>
                <div class="aim-field">
                  <label>ชื่อผู้รับจริง (พิมพ์บนกล่อง)</label>
                  <input type="text" v-model="entry.recipientName" class="aim-input" placeholder="เช่น คุณรุ้งนภา (ถ้าต่างจากชื่อ CF)" />
                </div>
                <div class="aim-field">
                  <label>เบอร์โทรศัพท์</label>
                  <input type="text" v-model="entry.phone" class="aim-input" placeholder="08x-xxx-xxxx" />
                </div>
              </div>

              <div class="aim-field" style="margin-top: 6px;">
                <label>ที่อยู่จัดส่ง</label>
                <textarea v-model="entry.address" class="aim-input aim-addr-text" rows="2" placeholder="บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์..."></textarea>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="aim-footer" v-if="parsedEntries.length > 0">
        <button class="btn btn-dark" @click="$emit('close')">ยกเลิก</button>
        <button class="btn btn-success" @click="saveAllAddresses" :disabled="isSaving || selectedCount === 0">
          <i class="fa-solid fa-check-double"></i> {{ isSaving ? 'กำลังบันทึก...' : `ยืนยันและบันทึก (${selectedCount} รายการ)` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { ref as dbRef, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { parseMultipleAddresses, normalizeName } from "../utils/addressParser";
import Swal from "sweetalert2";

const props = defineProps({
  customers: {
    type: Array,
    default: () => [],
  },
  addressBook: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["close", "imported"]);

const rawInput = ref("");
const parsedEntries = ref([]);
const isSaving = ref(false);

const selectedCount = computed(() => {
  return parsedEntries.value.filter((e) => e.selected).length;
});

function handleParse() {
  if (!rawInput.value.trim()) return;
  const list = parseMultipleAddresses(rawInput.value);
  if (list.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่พบรูปแบบที่อยู่",
      text: "กรุณาตรวจสอบข้อความ หรือจัดเรียงรูปแบบ ชื่อ เบอร์โทร ที่อยู่",
      confirmButtonColor: "#3b82f6",
    });
    return;
  }

  parsedEntries.value = list.map((item) => ({
    ...item,
    recipientName: item.recipientName || item.name || "",
    selected: true,
  }));
}

function removeEntry(index) {
  parsedEntries.value.splice(index, 1);
}

function getMatchedCustomer(name) {
  if (!name) return null;
  const norm = normalizeName(name);
  return props.customers.find((c) => normalizeName(c.name) === norm);
}

async function saveAllAddresses() {
  const toSave = parsedEntries.value.filter((e) => e.selected && e.name.trim());
  if (toSave.length === 0) return;

  isSaving.value = true;
  try {
    const multiPathUpdates = {};
    const timestamp = Date.now();

    toSave.forEach((entry) => {
      const cleanName = entry.name.trim();
      const normKey = normalizeName(cleanName).replace(/[.#$[\]/]/g, "_");
      const recName = (entry.recipientName || "").trim();
      const newAddrId = "addr_" + timestamp + "_" + Math.random().toString(36).substring(2, 6);

      // Check existing addresses in customer or address book
      const matched = getMatchedCustomer(cleanName);
      const existingInCust = matched?.addresses;
      const existingInBook = props.addressBook && props.addressBook[normKey]?.addresses;
      const rawExisting = existingInCust || existingInBook;
      let existingList = [];

      if (Array.isArray(rawExisting)) {
        existingList = [...rawExisting].filter(Boolean);
      } else if (rawExisting && typeof rawExisting === "object") {
        existingList = Object.values(rawExisting).filter(Boolean);
      } else {
        // Fallback: check if single address existed before
        const singleOldAddr = matched?.address || (props.addressBook && props.addressBook[normKey]?.address);
        if (singleOldAddr && singleOldAddr.trim()) {
          existingList.push({
            id: matched?.selectedAddressId || "addr_prev_" + timestamp,
            label: "ที่อยู่ 1",
            recipientName: matched?.recipientName || props.addressBook?.[normKey]?.recipientName || cleanName,
            phone: matched?.phone || props.addressBook?.[normKey]?.phone || "",
            address: singleOldAddr.trim(),
            postalCode: matched?.postalCode || props.addressBook?.[normKey]?.postalCode || "",
          });
        }
      }

      // Check if this new address already exists in list
      const newAddrClean = (entry.address || "").trim();
      const alreadyIndex = existingList.findIndex(
        (a) => a.address && a.address.trim() === newAddrClean
      );

      const newAddrObj = {
        id: newAddrId,
        label: `ที่อยู่ ${existingList.length + 1}`,
        recipientName: recName || cleanName,
        phone: entry.phone || "",
        address: entry.address || "",
        postalCode: entry.postalCode || "",
      };

      if (alreadyIndex >= 0) {
        existingList[alreadyIndex] = {
          ...existingList[alreadyIndex],
          recipientName: recName || existingList[alreadyIndex].recipientName,
          phone: entry.phone || existingList[alreadyIndex].phone,
          postalCode: entry.postalCode || existingList[alreadyIndex].postalCode,
        };
        newAddrObj.id = existingList[alreadyIndex].id || newAddrId;
      } else {
        existingList.push(newAddrObj);
      }

      // 1. Save to Central address_book
      multiPathUpdates[`address_book/${normKey}/name`] = cleanName;
      multiPathUpdates[`address_book/${normKey}/recipientName`] = recName;
      multiPathUpdates[`address_book/${normKey}/phone`] = entry.phone || "";
      multiPathUpdates[`address_book/${normKey}/address`] = entry.address || "";
      multiPathUpdates[`address_book/${normKey}/postalCode`] = entry.postalCode || "";
      multiPathUpdates[`address_book/${normKey}/selectedAddressId`] = newAddrObj.id;
      multiPathUpdates[`address_book/${normKey}/addresses`] = existingList;
      multiPathUpdates[`address_book/${normKey}/updatedAt`] = timestamp;

      // 2. Also update delivery_customers if matched
      if (matched) {
        if (recName) {
          multiPathUpdates[`delivery_customers/${matched.id}/recipientName`] = recName;
        }
        multiPathUpdates[`delivery_customers/${matched.id}/phone`] = entry.phone || "";
        multiPathUpdates[`delivery_customers/${matched.id}/address`] = entry.address || "";
        multiPathUpdates[`delivery_customers/${matched.id}/postalCode`] = entry.postalCode || "";
        multiPathUpdates[`delivery_customers/${matched.id}/selectedAddressId`] = newAddrObj.id;
        multiPathUpdates[`delivery_customers/${matched.id}/addresses`] = existingList;
        multiPathUpdates[`delivery_customers/${matched.id}/updatedAt`] = timestamp;
      }
    });

    await update(dbRef(db), multiPathUpdates);

    Swal.fire({
      icon: "success",
      title: `บันทึกที่อยู่สำเร็จ ${toSave.length} รายการ`,
      toast: true,
      position: "top-end",
      timer: 2000,
      showConfirmButton: false,
    });

    emit("imported", toSave);
    emit("close");
  } catch (error) {
    console.error("Error saving addresses:", error);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาดในการบันทึก",
      text: error.message,
    });
  } finally {
    isSaving.value = false;
  }
}
</script>

<style scoped>
.aim-overlay {
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

.aim-modal {
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  font-family: "Kanit", sans-serif;
}

.aim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #27272a;
}

.aim-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15em;
  font-weight: 700;
  color: #f4f4f5;
}

.aim-badge {
  font-size: 0.7em;
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
}

.aim-close-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.aim-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.aim-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.aim-tips {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 0.9em;
  color: #93c5fd;
  line-height: 1.5;
}

.aim-tip-icon {
  font-size: 1.3em;
  color: #fbbf24;
  margin-top: 2px;
}

.aim-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #121214;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  color: #fff;
  padding: 14px;
  font-family: inherit;
  font-size: 0.95em;
  line-height: 1.6;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.aim-textarea:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.aim-actions-bar {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.aim-parse-btn {
  flex: 1;
  padding: 10px 16px;
  font-size: 1em;
  font-weight: 600;
}

/* Step 2 styles */
.aim-result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #27272a;
}

.aim-result-count {
  font-size: 1.1em;
  font-weight: 700;
  color: #10b981;
  margin-right: 8px;
}

.aim-result-sub {
  font-size: 0.85em;
  color: #71717a;
}

.aim-entries-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aim-entry-card {
  background: #202024;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  padding: 14px;
  transition: all 0.2s;
}

.aim-entry-card:hover {
  border-color: #52525b;
}

.aim-entry-unselected {
  opacity: 0.5;
  background: #141417;
}

.aim-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.aim-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.aim-checkbox-label input {
  accent-color: #3b82f6;
  width: 16px;
  height: 16px;
}

.aim-entry-num {
  font-weight: 700;
  color: #a1a1aa;
  font-size: 0.9em;
}

.aim-match-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85em;
  color: #d1fae5;
  background: rgba(16, 185, 129, 0.12);
  padding: 3px 10px;
  border-radius: 6px;
  flex: 1;
}

.aim-match-status.new {
  background: rgba(59, 130, 246, 0.12);
  color: #bfdbfe;
}

.aim-del-btn {
  background: transparent;
  border: none;
  color: #71717a;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;
}

.aim-del-btn:hover {
  color: #ef4444;
}

.aim-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.aim-field label {
  display: block;
  font-size: 0.75em;
  color: #a1a1aa;
  margin-bottom: 4px;
  font-weight: 500;
}

.aim-input {
  width: 100%;
  box-sizing: border-box;
  background: #121214;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  color: #fff;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 0.9em;
  outline: none;
}

.aim-input:focus {
  border-color: #3b82f6;
}

.aim-addr-text {
  resize: vertical;
  line-height: 1.4;
}

.aim-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid #27272a;
  background: #18181b;
}

@media (max-width: 600px) {
  .aim-card-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="phonetic-modal">
      <!-- Header -->
      <div class="phonetic-header">
        <div class="phonetic-title">
          <i class="fa-solid fa-volume-high"></i>
          จัดการคำอ่าน (Phonetic)
        </div>
        <button class="btn btn-dark" @click="$emit('close')">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>

      <!-- Add/Edit Form -->
      <div class="phonetic-form">
        <div class="form-title">
          <i class="fa-solid fa-user-pen"></i>
          {{ editingUid ? 'แก้ไขคำอ่าน' : 'เพิ่มคำอ่านใหม่' }}
        </div>

        <div class="form-grid">
          <!-- UID Field with Autocomplete -->
          <div class="form-group">
            <label class="form-label">
              <i class="fa-solid fa-fingerprint"></i> UID ลูกค้า
            </label>
            <div class="autocomplete-wrapper">
              <input
                type="text"
                class="form-input"
                v-model="formUid"
                placeholder="พิมพ์ UID หรือเลือกจากรายชื่อ..."
                @input="onUidInput"
                @focus="showSuggestions = true"
                @keydown.down.prevent="navigateSuggestion(1)"
                @keydown.up.prevent="navigateSuggestion(-1)"
                @keydown.enter.prevent="selectActiveSuggestion"
                @keydown.escape="showSuggestions = false"
                :disabled="!!editingUid"
                id="phonetic-uid-input"
              />
              <!-- Autocomplete Dropdown -->
              <div
                v-if="showSuggestions && filteredCustomers.length > 0 && !editingUid"
                class="phonetic-autocomplete"
              >
                <div
                  v-for="(customer, index) in filteredCustomers"
                  :key="customer.uid"
                  class="phonetic-autocomplete-item"
                  :class="{ active: activeSuggestionIndex === index }"
                  @mousedown.prevent="selectCustomer(customer)"
                >
                  <div class="suggestion-name">{{ customer.name }}</div>
                  <div class="suggestion-uid">{{ customer.uid.substring(0, 16) }}...</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Nick Field -->
          <div class="form-group">
            <label class="form-label">
              <i class="fa-solid fa-tag"></i> ชื่อที่แสดงบนหน้าจอ (nick)
            </label>
            <input
              type="text"
              class="form-input"
              v-model="formNick"
              placeholder="เช่น ปอ, คุณนิด..."
              id="phonetic-nick-input"
            />
          </div>

          <!-- Phonetic Field -->
          <div class="form-group">
            <label class="form-label">
              <i class="fa-solid fa-microphone"></i> คำอ่านสำหรับ TTS (phonetic)
            </label>
            <input
              type="text"
              class="form-input phonetic-input"
              v-model="formPhonetic"
              placeholder="เช่น คุณปอร์, คุณนิดดี้..."
              id="phonetic-phonetic-input"
            />
            <div class="form-hint">
              <i class="fa-solid fa-lightbulb"></i>
              <b>เคล็ดลับ:</b> เติมตัวการันต์ (เช่น ปอร์) เพื่อบังคับไม่ให้ AI สะกดคำ
            </div>
            <div class="form-hint">
              <i class="fa-solid fa-circle-info"></i>
              ถ้าไม่กรอก ระบบจะเติม "คุณ" นำหน้าชื่อเล่นให้อัตโนมัติ
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button
            class="btn-phonetic-save"
            @click="savePhonetic"
            :disabled="!formUid || !formNick"
            id="phonetic-save-btn"
          >
            <i :class="editingUid ? 'fa-solid fa-check' : 'fa-solid fa-plus'"></i>
            {{ editingUid ? 'อัปเดต' : 'บันทึก' }}
          </button>
          <button
            class="btn-phonetic-preview"
            @click="previewVoice"
            :disabled="!formNick"
            title="ฟังเสียงตัวอย่าง (เล่นแค่เครื่องนี้)"
            id="phonetic-preview-btn"
          >
            <i class="fa-solid fa-headphones"></i>
            ฟังเสียง
          </button>
          <button
            v-if="editingUid"
            class="btn-phonetic-cancel"
            @click="resetForm"
          >
            <i class="fa-solid fa-rotate-left"></i> ยกเลิก
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="phonetic-search">
        <div class="search-wrapper">
          <i class="fa-solid fa-search search-icon"></i>
          <input
            type="text"
            class="search-input"
            v-model="searchQuery"
            placeholder="ค้นหาชื่อ, UID..."
            id="phonetic-search-input"
          />
          <span v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <i class="fa-solid fa-times-circle"></i>
          </span>
        </div>
        <div class="phonetic-count">
          <i class="fa-solid fa-users"></i>
          {{ filteredNicknames.length }} รายการ
        </div>
      </div>

      <!-- Nickname List -->
      <div class="phonetic-list">
        <div v-if="filteredNicknames.length === 0" class="phonetic-empty">
          <i class="fa-solid fa-ghost"></i>
          <div>ยังไม่มีรายการคำอ่าน</div>
          <div class="phonetic-empty-sub">เพิ่มคำอ่านใหม่ด้านบนได้เลย!</div>
        </div>

        <div
          v-for="item in filteredNicknames"
          :key="item.uid"
          class="phonetic-item"
          :class="{ 'phonetic-item--editing': editingUid === item.uid }"
        >
          <div class="phonetic-item-main">
            <div class="phonetic-item-nick">
              <span class="nick-label">{{ item.nick || '—' }}</span>
              <span v-if="item.phonetic" class="phonetic-badge">
                <i class="fa-solid fa-volume-low"></i>
                {{ item.phonetic }}
              </span>
            </div>
            <div class="phonetic-item-uid">
              <i class="fa-solid fa-fingerprint"></i>
              {{ item.uid.length > 24 ? item.uid.substring(0, 24) + '...' : item.uid }}
            </div>
          </div>
          <div class="phonetic-item-actions">
            <button
              class="btn-action btn-listen"
              @click="previewItemVoice(item)"
              title="ฟังเสียง"
            >
              <i class="fa-solid fa-play"></i>
            </button>
            <button
              class="btn-action btn-edit"
              @click="editItem(item)"
              title="แก้ไข"
            >
              <i class="fa-solid fa-pen"></i>
            </button>
            <button
              class="btn-action btn-delete"
              @click="deleteItem(item.uid, item.nick)"
              title="ลบ"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useNicknameStore } from "../stores/nickname";
import { ref as dbRef, onValue, update, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { ttsService } from "../services/TextToSpeech";
import Swal from "sweetalert2";

// ✅ รายการคำนำหน้า (เหมือนใน nickname store)
const TITLE_PREFIXES = ["คุณ", "พี่", "น้อง", "เฮีย", "เจ๊", "ป้า", "น้า", "อา", "ลุง", "ตา", "ยาย", "แม่", "พ่อ", "ดร.", "หมอ", "ครู", "ซ้อ", "เสี่ย"];

const emit = defineEmits(["close"]);

const stockStore = useStockStore();
const nicknameStore = useNicknameStore();

// Form State
const formUid = ref("");
const formNick = ref("");
const formPhonetic = ref("");
const editingUid = ref(null);

// Search & Autocomplete
const searchQuery = ref("");
const showSuggestions = ref(false);
const activeSuggestionIndex = ref(-1);

// Nicknames data (listen directly)
const nicknamesData = ref({});
const cleanupFns = [];

// Get unique customers from stock data for autocomplete
const allCustomers = computed(() => {
  const customers = {};

  Object.keys(stockStore.stockData).forEach((num) => {
    const item = stockStore.stockData[num];
    if (item?.uid && item?.owner) {
      if (!customers[item.uid]) {
        customers[item.uid] = {
          uid: item.uid,
          name: item.owner,
        };
      }
    }
  });

  return Object.values(customers);
});

// Filter autocomplete suggestions
const filteredCustomers = computed(() => {
  if (!formUid.value) return allCustomers.value.slice(0, 10);

  const query = formUid.value.toLowerCase();
  return allCustomers.value
    .filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.uid.toLowerCase().includes(query)
    )
    .slice(0, 10);
});

// Parse nicknames into list for display
const nicknamesList = computed(() => {
  return Object.entries(nicknamesData.value).map(([uid, data]) => {
    if (typeof data === "object") {
      return { uid, nick: data.nick || "", phonetic: data.phonetic || "" };
    }
    return { uid, nick: data, phonetic: "" };
  });
});

// Filter nicknames by search query
const filteredNicknames = computed(() => {
  if (!searchQuery.value) return nicknamesList.value;

  const query = searchQuery.value.toLowerCase();
  return nicknamesList.value.filter(
    (item) =>
      item.nick.toLowerCase().includes(query) ||
      item.uid.toLowerCase().includes(query) ||
      (item.phonetic && item.phonetic.toLowerCase().includes(query))
  );
});

// Autocomplete navigation
function onUidInput() {
  showSuggestions.value = true;
  activeSuggestionIndex.value = -1;
}

function navigateSuggestion(direction) {
  const max = filteredCustomers.value.length - 1;
  if (max < 0) return;

  activeSuggestionIndex.value += direction;
  if (activeSuggestionIndex.value < 0) activeSuggestionIndex.value = max;
  if (activeSuggestionIndex.value > max) activeSuggestionIndex.value = 0;
}

function selectActiveSuggestion() {
  if (activeSuggestionIndex.value >= 0 && filteredCustomers.value[activeSuggestionIndex.value]) {
    selectCustomer(filteredCustomers.value[activeSuggestionIndex.value]);
  }
}

function selectCustomer(customer) {
  formUid.value = customer.uid;
  formNick.value = customer.name;
  showSuggestions.value = false;
  activeSuggestionIndex.value = -1;

  // Check if phonetic already exists
  if (nicknamesData.value[customer.uid]?.phonetic) {
    formPhonetic.value = nicknamesData.value[customer.uid].phonetic;
  }
}

// ✅ จำลอง Logic เดียวกับใน Store — เติมคำนำหน้าถ้าไม่มี
function applyTitlePrefix(name) {
  if (!name) return "";
  const hasTitle = TITLE_PREFIXES.some((t) => name.startsWith(t));
  return hasTitle ? name : "คุณ" + name;
}

// 🔊 ฟังเสียงตัวอย่าง (Local Preview — ไม่ส่งขึ้น Firebase)
function previewVoice() {
  const textToRead = formPhonetic.value.trim() || formNick.value.trim();
  if (!textToRead) return;

  const finalText = applyTitlePrefix(textToRead);
  console.log("🔊 Preview TTS:", finalText);

  // ✅ เรียก ttsService.speak() ตรงๆ — ดังแค่เครื่องที่กด ไม่ผ่าน Firebase
  ttsService.speak("ทดสอบเสียง", finalText);
}

// 🔊 ฟังเสียงจากรายการที่มีอยู่แล้ว
function previewItemVoice(item) {
  const textToRead = item.phonetic || item.nick;
  if (!textToRead) return;

  const finalText = applyTitlePrefix(textToRead);
  console.log("🔊 Preview item TTS:", finalText);
  ttsService.speak("ทดสอบเสียง", finalText);
}

// 💾 Save phonetic to Firebase (ใช้ update แทน set)
async function savePhonetic() {
  if (!formUid.value || !formNick.value) {
    Swal.fire({
      icon: "warning",
      title: "กรุณากรอกข้อมูล",
      text: "ต้องระบุ UID และชื่อที่แสดง",
      timer: 2000,
      showConfirmButton: false,
    });
    return;
  }

  const uid = formUid.value.trim();
  const nick = formNick.value.trim();
  const phonetic = formPhonetic.value.trim() || null; // ✅ ถ้าไม่กรอก ให้เป็น null

  try {
    // ✅ ใช้ update เพื่อไม่ลบ key อื่นๆ ที่อาจมีอยู่ใน nicknames/${uid}
    await update(dbRef(db, `nicknames/${uid}`), { nick, phonetic });

    Swal.fire({
      icon: "success",
      title: editingUid.value ? "อัปเดตสำเร็จ!" : "บันทึกสำเร็จ!",
      html: `<div style="text-align:left; font-size: 0.9em;">
        <div><b>ชื่อ:</b> ${nick}</div>
        ${phonetic ? `<div><b>คำอ่าน:</b> ${phonetic}</div>` : `<div style="color:#888">ไม่มีคำอ่าน (ใช้คำนำหน้า "คุณ" อัตโนมัติ)</div>`}
      </div>`,
      timer: 2000,
      showConfirmButton: false,
      background: "#1e1e1e",
      color: "#fff",
    });

    resetForm();
  } catch (error) {
    console.error("Error saving phonetic:", error);
    Swal.fire({
      icon: "error",
      title: "บันทึกไม่สำเร็จ",
      text: error.message,
      background: "#1e1e1e",
      color: "#fff",
    });
  }
}

// Edit item
function editItem(item) {
  editingUid.value = item.uid;
  formUid.value = item.uid;
  formNick.value = item.nick;
  formPhonetic.value = item.phonetic || "";
  showSuggestions.value = false;
}

// Delete item
function deleteItem(uid, name) {
  Swal.fire({
    title: "ลบคำอ่าน?",
    text: `ลบคำอ่านของ "${name || uid}" ออกจากระบบ`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
    background: "#1e1e1e",
    color: "#fff",
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await remove(dbRef(db, `nicknames/${uid}`));
        Swal.fire({
          icon: "success",
          title: "ลบแล้ว!",
          timer: 1500,
          showConfirmButton: false,
          background: "#1e1e1e",
          color: "#fff",
        });

        // Reset form if editing the deleted item
        if (editingUid.value === uid) {
          resetForm();
        }
      } catch (error) {
        console.error("Error deleting phonetic:", error);
        Swal.fire({
          icon: "error",
          title: "ลบไม่สำเร็จ",
          text: error.message,
          background: "#1e1e1e",
          color: "#fff",
        });
      }
    }
  });
}

// Reset form
function resetForm() {
  editingUid.value = null;
  formUid.value = "";
  formNick.value = "";
  formPhonetic.value = "";
  showSuggestions.value = false;
  activeSuggestionIndex.value = -1;
}

// Close suggestions on click outside
function handleClickOutside(e) {
  if (!e.target.closest('.autocomplete-wrapper')) {
    showSuggestions.value = false;
  }
}

onMounted(() => {
  // Listen to nicknames from Firebase
  const unsubNicknames = onValue(dbRef(db, "nicknames"), (snapshot) => {
    nicknamesData.value = snapshot.val() || {};
  });
  cleanupFns.push(unsubNicknames);

  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  cleanupFns.forEach((fn) => {
    if (typeof fn === "function") fn();
  });
  cleanupFns.length = 0;
  document.removeEventListener("click", handleClickOutside);
  console.log("🧹 PhoneticManager cleaned up!");
});
</script>

<style scoped>
.phonetic-modal {
  background: rgba(18, 18, 22, 0.98);
  border-radius: 16px;
  width: 680px;
  max-width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.7),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
  animation: modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
}

@keyframes modalPop {
  from {
    transform: scale(0.92) translateY(12px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* Header */
.phonetic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  background: linear-gradient(135deg, rgba(0, 198, 255, 0.08), rgba(0, 114, 255, 0.08));
  border-bottom: 1px solid rgba(0, 198, 255, 0.15);
}

.phonetic-title {
  font-size: 1.3em;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.phonetic-title i {
  color: #00C6FF;
  font-size: 1.1em;
}

/* Form Section */
.phonetic-form {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(26, 26, 32, 0.6);
}

.form-title {
  font-size: 1em;
  font-weight: 600;
  color: #aaa;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-title i {
  color: #00C6FF;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.85em;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.form-label i {
  color: #666;
  font-size: 0.9em;
}

.form-input {
  background: rgba(0, 0, 0, 0.35);
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  font-family: "Kanit", sans-serif;
  font-size: 1em;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.form-input:focus {
  outline: none;
  border-color: #00C6FF;
  box-shadow: 0 0 16px rgba(0, 198, 255, 0.2);
}

.form-input::placeholder {
  color: #555;
}

.form-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.phonetic-input {
  border-color: rgba(0, 198, 255, 0.2);
  background: rgba(0, 198, 255, 0.04);
}

.phonetic-input:focus {
  border-color: #00C6FF;
  box-shadow: 0 0 20px rgba(0, 198, 255, 0.25);
}

.form-hint {
  font-size: 0.8em;
  color: #666;
  display: flex;
  align-items: center;
  gap: 5px;
}

.form-hint i {
  color: #00C6FF;
  opacity: 0.6;
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.btn-phonetic-save {
  background: linear-gradient(135deg, #00C6FF 0%, #0072FF 100%);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 10px;
  font-weight: 700;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s;
  box-shadow: 0 4px 15px rgba(0, 114, 255, 0.3);
}

.btn-phonetic-save:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 114, 255, 0.45);
}

.btn-phonetic-save:active:not(:disabled) {
  transform: translateY(0);
}

.btn-phonetic-save:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Preview Voice Button (Orange/Amber) */
.btn-phonetic-preview {
  background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 700;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.3);
}

.btn-phonetic-preview:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 152, 0, 0.45);
}

.btn-phonetic-preview:active:not(:disabled) {
  transform: translateY(0);
}

.btn-phonetic-preview:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-phonetic-cancel {
  background: rgba(255, 255, 255, 0.06);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-phonetic-cancel:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Autocomplete */
.autocomplete-wrapper {
  position: relative;
}

.phonetic-autocomplete {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10010;
  background: #1e1e24;
  border: 1px solid rgba(0, 198, 255, 0.2);
  border-top: none;
  border-radius: 0 0 10px 10px;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  animation: dropdownSlide 0.15s ease-out;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.phonetic-autocomplete-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.phonetic-autocomplete-item:last-child {
  border-bottom: none;
}

.phonetic-autocomplete-item:hover,
.phonetic-autocomplete-item.active {
  background: rgba(0, 198, 255, 0.1);
}

.phonetic-autocomplete-item.active {
  border-left: 3px solid #00C6FF;
  padding-left: 11px;
}

.suggestion-name {
  color: #fff;
  font-weight: 600;
  font-size: 0.95em;
}

.suggestion-uid {
  color: #666;
  font-size: 0.75em;
  font-family: monospace;
}

/* Search Section */
.phonetic-search {
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.search-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: #555;
  font-size: 0.9em;
  pointer-events: none;
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 9px 14px 9px 36px;
  border-radius: 8px;
  font-family: "Kanit", sans-serif;
  font-size: 0.9em;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: rgba(0, 198, 255, 0.4);
}

.search-input::placeholder {
  color: #555;
}

.search-clear {
  position: absolute;
  right: 10px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.search-clear:hover {
  color: #fff;
}

.phonetic-count {
  color: #666;
  font-size: 0.85em;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Nickname List */
.phonetic-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px 20px;
}

.phonetic-empty {
  text-align: center;
  padding: 40px 20px;
  color: #555;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.phonetic-empty i {
  font-size: 2.5em;
  opacity: 0.3;
}

.phonetic-empty-sub {
  font-size: 0.85em;
  color: #444;
}

/* Phonetic Item */
.phonetic-item {
  background: rgba(30, 30, 38, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s;
}

.phonetic-item:hover {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(40, 40, 50, 0.8);
}

.phonetic-item--editing {
  border-color: rgba(0, 198, 255, 0.4) !important;
  background: rgba(0, 198, 255, 0.05) !important;
  box-shadow: 0 0 20px rgba(0, 198, 255, 0.08);
}

.phonetic-item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.phonetic-item-nick {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.nick-label {
  font-size: 1.05em;
  font-weight: 700;
  color: #fff;
}

.phonetic-badge {
  background: linear-gradient(135deg, rgba(0, 198, 255, 0.12), rgba(0, 114, 255, 0.12));
  color: #7dd3fc;
  font-size: 0.8em;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid rgba(0, 198, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.phonetic-badge i {
  font-size: 0.85em;
  opacity: 0.8;
}

.phonetic-item-uid {
  font-size: 0.75em;
  color: #555;
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 5px;
}

.phonetic-item-uid i {
  font-size: 0.9em;
}

/* Action Buttons */
.phonetic-item-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.btn-action {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  transition: all 0.2s;
}

.btn-edit {
  background: rgba(0, 198, 255, 0.1);
  color: #00C6FF;
  border: 1px solid rgba(0, 198, 255, 0.2);
}

.btn-edit:hover {
  background: rgba(0, 198, 255, 0.2);
  transform: scale(1.08);
}

.btn-listen {
  background: rgba(255, 152, 0, 0.1);
  color: #FF9800;
  border: 1px solid rgba(255, 152, 0, 0.2);
}

.btn-listen:hover {
  background: rgba(255, 152, 0, 0.25);
  transform: scale(1.08);
}

.btn-delete {
  background: rgba(211, 47, 47, 0.1);
  color: #ef5350;
  border: 1px solid rgba(211, 47, 47, 0.2);
}

.btn-delete:hover {
  background: rgba(211, 47, 47, 0.25);
  transform: scale(1.08);
}

/* Responsive */
@media (max-width: 600px) {
  .phonetic-modal {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .phonetic-header {
    padding: 14px 16px;
  }

  .phonetic-title {
    font-size: 1.1em;
  }

  .phonetic-form {
    padding: 16px;
  }

  .phonetic-search {
    padding: 12px 16px;
  }

  .phonetic-list {
    padding: 10px 16px 20px;
  }

  .phonetic-item-nick {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>

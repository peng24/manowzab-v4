<template>
  <div v-if="showEditor" class="note-editor-overlay" @click.self="closeEditor">
    <div class="note-editor-modal">
      <div class="note-editor-header">
        <h3><i class="fa-solid fa-note-sticky"></i> จัดการ Note</h3>
        <button class="btn-close-editor" @click="closeEditor">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Create Note Form -->
      <div class="note-form">
        <textarea
          v-model="newNoteText"
          class="note-textarea"
          placeholder="พิมพ์ข้อความ Note..."
          rows="3"
          maxlength="200"
        ></textarea>
        <div class="note-form-row">
          <div class="color-picker-row">
            <span class="color-label">สี:</span>
            <div class="color-palette">
              <button
                v-for="color in colorPalette"
                :key="color"
                class="color-swatch"
                :class="{ active: selectedColor === color }"
                :style="{ background: color }"
                @click="selectedColor = color"
                :title="color"
              ></button>
            </div>
          </div>
          <button
            class="btn btn-create-note"
            @click="createNote"
            :disabled="!newNoteText.trim()"
          >
            <i class="fa-solid fa-plus"></i> สร้าง Note
          </button>
        </div>
      </div>

      <!-- Active Notes List -->
      <div class="note-list-section">
        <h4 class="note-list-title">📋 Note ที่แสดงอยู่</h4>
        <div v-if="activeNotes.length === 0" class="note-empty">
          ยังไม่มี Note
        </div>
        <div v-for="note in activeNotes" :key="note.id" class="note-list-item">
          <span
            class="note-list-dot"
            :style="{ background: note.color || '#3b82f6' }"
          ></span>
          <span class="note-list-text">{{ note.text }}</span>
          <div class="note-list-actions">
            <button
              class="note-list-btn note-list-deactivate"
              @click="deactivateNote(note.id)"
              title="ปิด Note"
            >
              <i class="fa-solid fa-eye-slash"></i>
            </button>
            <button
              class="note-list-btn note-list-delete"
              @click="deleteNote(note.id)"
              title="ลบ Note"
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
import {
  ref as dbRef,
  onValue,
  push,
  update,
  remove,
} from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "../stores/system";
import Swal from "sweetalert2";

const systemStore = useSystemStore();

const showEditor = ref(false);
const newNoteText = ref("");
const selectedColor = ref("#3b82f6");
const allNotes = ref({});
let unsubNotes = null;

// Color palette — clickable swatches
const colorPalette = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#ffffff", // white
];

const activeNotes = computed(() => {
  return Object.entries(allNotes.value)
    .filter(([, note]) => note.active)
    .map(([id, note]) => ({ id, ...note }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
});

function openEditor() {
  showEditor.value = true;
}

function closeEditor() {
  showEditor.value = false;
}

async function createNote() {
  const text = newNoteText.value.trim();
  if (!text) return;

  const noteRef = dbRef(db, "notes");
  await push(noteRef, {
    text,
    color: selectedColor.value,
    active: true,
    createdAt: Date.now(),
    createdBy: systemStore.myDeviceId,
  });

  newNoteText.value = "";

  Swal.fire({
    icon: "success",
    title: "สร้าง Note แล้ว",
    text: `"${text.substring(0, 30)}${text.length > 30 ? "..." : ""}"`,
    timer: 1500,
    showConfirmButton: false,
    toast: true,
    position: "top-end",
  });
}

async function deactivateNote(id) {
  await update(dbRef(db, `notes/${id}`), { active: false });
}

async function deleteNote(id) {
  const result = await Swal.fire({
    title: "ลบ Note?",
    text: "ลบถาวร ไม่สามารถกู้คืนได้",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
  });

  if (result.isConfirmed) {
    await remove(dbRef(db, `notes/${id}`));
    Swal.fire({
      icon: "success",
      title: "ลบ Note แล้ว",
      timer: 1200,
      showConfirmButton: false,
    });
  }
}

onMounted(() => {
  unsubNotes = onValue(dbRef(db, "notes"), (snapshot) => {
    allNotes.value = snapshot.val() || {};
  });
});

onUnmounted(() => {
  if (unsubNotes) unsubNotes();
});

// Expose open for parent
defineExpose({ openEditor });
</script>

<style scoped>
.note-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(6px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.note-editor-modal {
  background: #1a1a1a;
  border-radius: 16px;
  width: 480px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  animation: modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalSlideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.note-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid #333;
}

.note-editor-header h3 {
  margin: 0;
  font-size: 1.15em;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-close-editor {
  background: transparent;
  border: none;
  color: #888;
  font-size: 1.2em;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close-editor:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* Form */
.note-form {
  padding: 20px;
  border-bottom: 1px solid #2a2a2a;
}

.note-textarea {
  width: 100%;
  background: #252525;
  border: 1px solid #444;
  border-radius: 10px;
  color: #fff;
  padding: 12px 14px;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  resize: vertical;
  min-height: 70px;
  transition: border-color 0.2s;
  line-height: 1.6;
}

.note-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.note-textarea::placeholder {
  color: #666;
}

.note-form-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  gap: 12px;
  flex-wrap: wrap;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-label {
  color: #999;
  font-size: 0.9em;
  font-weight: 500;
  flex-shrink: 0;
}

.color-palette {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  max-width: 280px;
}

.color-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.color-swatch:hover {
  transform: scale(1.2);
  box-shadow: 0 0 10px currentColor;
}

.color-swatch.active {
  border-color: #fff;
  transform: scale(1.25);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.3);
}

.btn-create-note {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: "Kanit", sans-serif;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.btn-create-note:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
}

.btn-create-note:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Note List */
.note-list-section {
  padding: 16px 20px 20px;
}

.note-list-title {
  margin: 0 0 12px;
  font-size: 0.95em;
  color: #aaa;
  font-weight: 500;
}

.note-empty {
  text-align: center;
  color: #666;
  padding: 20px;
  font-size: 0.9em;
}

.note-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #222;
  border-radius: 8px;
  margin-bottom: 6px;
  transition: background 0.2s;
}

.note-list-item:hover {
  background: #2a2a2a;
}

.note-list-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.note-list-text {
  flex: 1;
  font-size: 0.9em;
  color: #ddd;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-list-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.note-list-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 5px 7px;
  border-radius: 5px;
  font-size: 0.85em;
  transition: all 0.2s;
}

.note-list-deactivate:hover {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.note-list-delete:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

/* Mobile */
@media (max-width: 500px) {
  .note-editor-modal {
    width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 90vh;
  }

  .note-form-row {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-create-note {
    justify-content: center;
  }
}
</style>

<template>
  <div class="note-banner-container" v-if="visibleNotes.length > 0">
    <TransitionGroup name="note-slide">
      <div
        v-for="note in visibleNotes"
        :key="note.id"
        class="note-banner"
        :class="{ collapsed: collapsedNotes[note.id] }"
        :style="{ '--note-color': note.color || '#3b82f6' }"
      >
        <!-- Collapsed View -->
        <div class="note-bar" @click="toggleCollapse(note.id)">

          <span class="note-preview" v-if="collapsedNotes[note.id]">
            {{ truncate(note.text, 40) }}
          </span>
          <span class="note-preview note-full" v-else>
            {{ note.text }}
          </span>
          <div class="note-actions">
            <button
              class="note-action-btn"
              @click.stop="toggleCollapse(note.id)"
              :title="collapsedNotes[note.id] ? 'ขยาย' : 'ย่อ'"
            >
              <i
                :class="
                  collapsedNotes[note.id]
                    ? 'fa-solid fa-chevron-up'
                    : 'fa-solid fa-chevron-down'
                "
              ></i>
            </button>
            <button
              class="note-action-btn note-dismiss"
              @click.stop="dismissNote(note.id)"
              title="ปิดถาวร"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";

const allNotes = ref({});
const collapsedNotes = ref({});
let unsubNotes = null;

// Dismissed notes stored in localStorage
const DISMISSED_KEY = "manowzab_dismissed_notes";

function getDismissedIds() {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveDismissedIds(ids) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids));
}

const visibleNotes = computed(() => {
  const dismissed = getDismissedIds();
  return Object.entries(allNotes.value)
    .filter(([id, note]) => note.active && !dismissed.includes(id))
    .map(([id, note]) => ({ id, ...note }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5); // Max 5 notes visible
});

function toggleCollapse(id) {
  collapsedNotes.value[id] = !collapsedNotes.value[id];
}

function dismissNote(id) {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    saveDismissedIds(dismissed);
  }
  // Force reactivity
  allNotes.value = { ...allNotes.value };
}

function truncate(text, len) {
  if (!text) return "";
  return text.length > len ? text.substring(0, len) + "..." : text;
}

onMounted(() => {
  unsubNotes = onValue(dbRef(db, "notes"), (snapshot) => {
    allNotes.value = snapshot.val() || {};
  });
});

onUnmounted(() => {
  if (unsubNotes) unsubNotes();
});
</script>

<style scoped>
.note-banner-container {
  position: fixed;
  bottom: 20px;
  right: 420px;
  z-index: 800;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  max-width: 450px;
  pointer-events: none;
}

.note-banner {
  pointer-events: auto;
  background: rgba(30, 30, 30, 0.25);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: 10px;
  border-left: 4px solid var(--note-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.08);
  animation: noteAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition: all 0.3s ease;
  overflow: hidden;
}

.note-banner:hover {
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255,255,255,0.1);
  transform: translateX(2px);
}

@keyframes noteAppear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.note-bar {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  min-height: 44px;
}



.note-preview {
  flex: 1;
  font-size: 0.95em;
  color: #e0e0e0;
  line-height: 1.5;
  font-weight: 500;
}

.note-preview.note-full {
  white-space: pre-wrap;
  word-break: break-word;
}

.note-banner.collapsed .note-preview {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-top: 1px;
}

.note-action-btn {
  background: transparent;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 0.85em;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.note-action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.note-dismiss:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

/* Transition */
.note-slide-enter-active {
  animation: noteAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.note-slide-leave-active {
  transition: all 0.25s ease-in;
}

.note-slide-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.9);
}

/* Mobile */
@media (max-width: 768px) {
  .note-banner-container {
    bottom: 10px;
    left: 10px;
    right: 10px;
    max-width: unset;
  }
}
</style>

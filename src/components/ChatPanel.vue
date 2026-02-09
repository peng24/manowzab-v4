<template>
  <div class="chat-panel">
    <div class="tools-bar">
      <h3 style="color: #fff; margin: 0; font-size: 1.1em">
        <i class="fa-solid fa-comments"></i> Live Chat
      </h3>
      <div class="chat-controls">
        <button
          class="btn-tool"
          :class="{ muted: !systemStore.isSoundOn }"
          @click="toggleSound"
        >
          <i
            :class="
              systemStore.isSoundOn
                ? 'fa-solid fa-volume-high'
                : 'fa-solid fa-volume-xmark'
            "
          ></i>
          {{ systemStore.isSoundOn ? "เสียง: เปิด" : "เสียง: ปิด" }}
        </button>

        <button class="btn-tool" @click="stopVoice">
          <i class="fa-solid fa-stop"></i> หยุดเสียง
        </button>

        <button class="btn-tool btn-csv" @click="exportCSV">
          <i class="fa-solid fa-file-csv"></i> CSV
        </button>
      </div>
    </div>

    <!-- ✅ Pull-to-Refresh Indicator -->
    <div
      class="pull-indicator"
      :class="{ pulling: isPulling, refreshing: isRefreshing }"
      :style="{ height: pullDistance + 'px' }"
    >
      <i class="fa-solid fa-sync" :class="{ spinning: isRefreshing }"></i>
      <span v-if="pullDistance > pullThreshold">ปล่อยเพื่อรีเฟรช</span>
      <span v-else-if="isPulling">ดึงลงเพื่อรีเฟรช</span>
    </div>

    <div
      id="chat-viewport"
      ref="chatViewport"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- ✅ Load Previous Messages Button -->
      <button
        v-if="hasMoreMessages"
        class="load-more-btn"
        @click="loadMoreMessages"
      >
        ⬆️ โหลดข้อความเก่าเพิ่ม ({{ chatStore.messages.length - displayLimit }}
        ข้อความ)
      </button>

      <TransitionGroup name="chat-list" tag="div" id="chat-list">
        <div
          v-for="chat in visibleMessages"
          :key="chat.id"
          :class="['chat-row', chat.isAdmin ? 'admin' : '', chat.type]"
        >
          <!-- Avatar Left -->
          <div class="avatar-container">
            <img :src="chat.avatar" class="avatar" loading="lazy" />
          </div>

          <!-- Message Bubble Right -->
          <div class="chat-bubble-container">
            <div class="chat-meta">
              <span class="chat-time">{{ formatTime(chat.timestamp) }}</span>
              <span
                class="chat-name"
                :style="{ backgroundColor: chat.color }"
                @click="editNickname(chat)"
                title="คลิกเพื่อแก้ไขชื่อเล่น"
              >
                {{ chat.displayName }}
              </span>
              <span v-if="chat.isAdmin" class="admin-badge">ADMIN</span>
              <span v-if="chat.realName !== chat.displayName" class="real-name">
                ({{ chat.realName }})
              </span>
            </div>

            <div class="chat-bubble">
              <div class="chat-text">{{ chat.text }}</div>

              <!-- Force Process Button -->
              <div
                v-if="chat.isAdmin || systemStore.isAiCommander"
                class="force-process-btn"
              >
                <button @click="forceProcess(chat)" class="btn-mini">
                  <i class="fa-solid fa-bolt"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <button v-if="showScrollButton" class="new-msg-btn" @click="scrollToBottom">
      ข้อความใหม่ ⬇
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const chatStore = useChatStore();
const stockStore = useStockStore();
const systemStore = useSystemStore();
const { resetVoice } = useAudio();

const chatViewport = ref(null);
const showScrollButton = ref(false);
const displayLimit = ref(200); // ✅ Pagination: Start with last 200 messages
let isUserScrolling = false;

// ✅ Pull-to-Refresh State
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const pullThreshold = 80; // Minimum pull distance to trigger refresh
let touchStartY = 0;
let canPull = false;

// 🚀 Performance: Render based on displayLimit for pagination
const visibleMessages = computed(() => {
  const total = chatStore.messages.length;
  const start = Math.max(0, total - displayLimit.value);
  return chatStore.messages.slice(start);
});

// ✅ Check if there are more messages to load
const hasMoreMessages = computed(() => {
  return chatStore.messages.length > displayLimit.value;
});

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ✅ Edit Nickname Logic
async function editNickname(chat) {
  const { value: newNick } = await Swal.fire({
    title: "แก้ไขชื่อเล่น",
    input: "text",
    inputLabel: `ชื่อจริง: ${chat.realName}`,
    inputValue: chat.displayName,
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
  });

  if (newNick && newNick.trim() !== "") {
    const updates = {};
    updates[`nicknames/${chat.uid}`] = {
      nick: newNick.trim(),
      realName: chat.realName,
      updatedAt: Date.now(),
    };

    update(dbRef(db), updates)
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "บันทึกแล้ว",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1500,
        });
      })
      .catch((err) => {
        console.error(err);
        Swal.fire("Error", "บันทึกไม่สำเร็จ", "error");
      });
  }
}

// ตรวจจับการ Scroll
function handleScroll() {
  const el = chatViewport.value;
  if (!el) return;

  // ถ้า Scroll ขึ้นไปเกิน 100px จากด้านล่าง ถือว่า user กำลังดูประวัติ
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isUserScrolling = distanceToBottom > 100;
  showScrollButton.value = isUserScrolling;
}

// เลื่อนลงล่างสุด
function scrollToBottom() {
  const el = chatViewport.value;
  if (el) {
    // ✅ Add small timeout to ensure DOM is ready
    setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight + 1000, behavior: "smooth" }); // Add extra offset
    }, 100);

    showScrollButton.value = false;
    isUserScrolling = false;
  }
}

// ✅ Load more messages (pagination)
function loadMoreMessages() {
  const el = chatViewport.value;
  if (!el) return;

  // Save current scroll height to preserve position
  const oldScrollHeight = el.scrollHeight;

  // Increase display limit by 200 messages
  displayLimit.value += 200;

  // Wait for DOM update, then adjust scroll to preserve position
  nextTick(() => {
    const newScrollHeight = el.scrollHeight;
    const scrollDiff = newScrollHeight - oldScrollHeight;
    el.scrollTop += scrollDiff;
  });
}

// เมื่อมีข้อความใหม่
watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick();
    // ถ้า User ไม่ได้เลื่อนดูประวัติอยู่ ให้เลื่อนลงอัตโนมัติ
    if (!isUserScrolling) {
      scrollToBottom();
    } else {
      // ถ้าดูประวัติอยู่ ให้โชว์ปุ่มแจ้งเตือน
      showScrollButton.value = true;
    }
  },
);

onMounted(() => {
  scrollToBottom();

  // ✅ Initialize Firebase Chat Sync
  if (systemStore.currentVideoId) {
    const cleanup = chatStore.syncFromFirebase(systemStore.currentVideoId);
    console.log("✅ Chat sync initialized for:", systemStore.currentVideoId);

    // Store cleanup function for unmount (if needed)
    // Note: The watcher below handles video ID changes
  }
});

// ✅ Watch for Video ID changes to re-sync
watch(
  () => systemStore.currentVideoId,
  (newVideoId, oldVideoId) => {
    if (newVideoId && newVideoId !== oldVideoId) {
      console.log(
        `🔄 Video ID changed from ${oldVideoId} to ${newVideoId}, re-syncing chat...`,
      );
      chatStore.syncFromFirebase(newVideoId);
    }
  },
);

// ✅ Force Process Logic
async function forceProcess(chat) {
  const { value: formValues } = await Swal.fire({
    title: "บังคับตัดสต็อก",
    html:
      `<input id="swal-input1" class="swal2-input" placeholder="รหัสสินค้า (เช่น 1)" value="">` +
      `<input id="swal-input2" class="swal2-input" placeholder="ราคา (ไม่ใส่ก็ได้)" value="">`,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      return [
        document.getElementById("swal-input1").value,
        document.getElementById("swal-input2").value,
      ];
    },
  });

  if (formValues) {
    const [num, price] = formValues;
    if (!num) return;

    await stockStore.processOrder(
      parseInt(num),
      chat.displayName, // ใช้ชื่อจากแชท
      chat.uid, // ใช้ UID จากแชท
      "manual-force",
      price ? parseInt(price) : null,
      "manual",
    );

    Swal.fire(
      "เรียบร้อย",
      `ตัดสต็อกเบอร์ ${num} ให้ ${chat.displayName} แล้ว`,
      "success",
    );
  }
}

// ✅ Button Logic
function toggleSound() {
  systemStore.isSoundOn = !systemStore.isSoundOn;
}

function stopVoice() {
  resetVoice();
  Swal.fire({
    icon: "success",
    title: "หยุดเสียงแล้ว",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1000,
  });
}

function exportCSV() {
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความให้บันทึก",
      timer: 1500,
    });
    return;
  }
  chatStore.downloadChatCSV(systemStore.currentVideoId || "chat-log");
  Swal.fire({
    icon: "success",
    title: "บันทึก CSV แล้ว",
    timer: 1500,
    showConfirmButton: false,
  });
}

// ✅ Pull-to-Refresh Touch Handlers
function handleTouchStart(e) {
  const el = chatViewport.value;
  if (!el) return;

  // Only allow pull when at the top of the scroll
  canPull = el.scrollTop === 0;
  if (canPull) {
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchMove(e) {
  if (!canPull || isRefreshing.value) return;

  const touchY = e.touches[0].clientY;
  const delta = touchY - touchStartY;

  // Only trigger pull when dragging down
  if (delta > 0) {
    isPulling.value = true;
    pullDistance.value = Math.min(delta * 0.5, 120); // Add resistance

    // Prevent native pull-to-refresh on iOS
    if (pullDistance.value > 10) {
      e.preventDefault();
    }
  }
}

async function handleTouchEnd() {
  if (!isPulling.value || isRefreshing.value) return;

  isPulling.value = false;

  // Trigger refresh if pulled beyond threshold
  if (pullDistance.value >= pullThreshold) {
    isRefreshing.value = true;

    // Perform refresh
    await refreshChat();

    // Reset after delay
    setTimeout(() => {
      isRefreshing.value = false;
      pullDistance.value = 0;
    }, 500);
  } else {
    // Spring back
    pullDistance.value = 0;
  }

  canPull = false;
}

async function refreshChat() {
  try {
    // Re-sync from Firebase
    if (systemStore.currentVideoId) {
      await chatStore.syncFromFirebase(systemStore.currentVideoId);
    }

    // Scroll to bottom after refresh
    await nextTick();
    scrollToBottom();

    // Show success feedback
    playSfx();
  } catch (error) {
    console.error("Error refreshing chat:", error);
  }
}
</script>

<style scoped>
/* Dark Blue Theme */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #0f172a; /* Deep Blue Background */
  border-left: 1px solid #1e293b;
  position: relative;
}

/* ✅ Pull-to-Refresh Indicator */
.pull-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  transition: height 0.3s ease-out;
  color: #64748b;
  font-size: 0.9em;
  gap: 8px;
}

.pull-indicator i {
  font-size: 1.5em;
  transition: transform 0.2s ease;
}

.pull-indicator.pulling i {
  transform: rotate(180deg);
  color: #3b82f6;
}

.pull-indicator.refreshing i {
  animation: spin 1s linear infinite;
  color: #10b981;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tools-bar {
  padding: 10px 15px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.chat-controls {
  display: flex;
  gap: 8px;
}

.btn-tool {
  background: #334155;
  color: #e2e8f0;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-family: "Kanit", sans-serif;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.btn-tool:hover {
  background: #475569;
  transform: translateY(-1px);
}

.btn-tool:active {
  transform: translateY(0);
}

.btn-tool.muted {
  background: #475569;
  opacity: 0.7;
}

.btn-tool.btn-csv {
  background: #10b981; /* Green */
  color: white;
  font-weight: 500;
}

.btn-tool.btn-csv:hover {
  background: #059669;
}

#chat-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 15px 5px; /* ✅ Reduced side padding */
  padding-bottom: calc(
    20px + env(safe-area-inset-bottom)
  ); /* ✅ Safe Area for Mobile */
  scroll-behavior: smooth;
  scroll-behavior: smooth;
}

#chat-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chat-row {
  display: flex;
  align-items: flex-start;
  gap: 5px; /* ✅ Reduced gap */
}

/* ✅ TransitionGroup Animations */
.chat-list-enter-active {
  transition: all 0.4s ease-out;
}

.chat-list-leave-active {
  transition: all 0.3s ease-in;
}

.chat-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.chat-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.avatar-container {
  flex-shrink: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #334155;
  object-fit: cover;
}

.chat-bubble-container {
  display: flex;
  flex-direction: column;
  /* max-width removed to fill space */
  flex: 1; /* ✅ Force full width */
  min-width: 0;
}

.chat-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.85em;
}

.chat-time {
  color: #64748b;
  font-size: 0.9em;
}

.chat-name {
  font-weight: bold;
  color: #000; /* ✅ Black text for badge */
  padding: 2px 8px; /* ✅ Badge padding */
  border-radius: 12px; /* ✅ Rounded badge */
  cursor: pointer; /* ✅ Clickable */
  transition: transform 0.1s;
}

.chat-name:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.real-name {
  color: #94a3b8;
  font-size: 0.9em;
}

.admin-badge {
  background-color: #f59e0b; /* Gold background */
  color: #000; /* Black text */
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-bubble {
  background-color: #1e293b; /* Bubble Color */
  color: #f1f5f9;
  padding: 10px 14px;
  border-radius: 0 12px 12px 12px; /* Rounded corners, flat top-left */
  font-size: 0.95em;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Special Types */
.chat-row.buy .chat-bubble {
  background-color: rgba(6, 78, 59, 0.4); /* Semi-transparent green */
  border: 2px solid #10b981; /* Brighter green border */
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); /* Subtle green glow */
  color: #f1f5f9; /* Ensure white text */
}

.chat-row.cancel .chat-bubble {
  background-color: rgba(127, 29, 29, 0.4); /* Semi-transparent red */
  border: 2px solid #ef4444; /* Brighter red border */
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); /* Subtle red glow */
  color: #f1f5f9; /* Ensure white text */
}

.chat-row.shipping .chat-bubble {
  background-color: #581c87 !important; /* Solid purple background */
  border: 2px solid #a855f7; /* Brighter purple border */
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.3); /* Subtle purple glow */
  color: #f1f5f9; /* Ensure white text */
}

.chat-row.admin .chat-bubble {
  border: 1px solid #f59e0b; /* Gold border for Admin */
}

.force-process-btn {
  position: absolute;
  right: -35px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.chat-bubble:hover .force-process-btn {
  opacity: 1;
}

.btn-mini {
  background: #334155;
  border: none;
  color: #94a3b8;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
}

.btn-mini:hover {
  background: #f59e0b;
  color: white;
}

.new-msg-btn {
  position: absolute;
  bottom: 20px; /* ✅ Adjusted position */
  left: 0; /* ✅ Center alignment start */
  right: 0; /* ✅ Center alignment end */
  margin: 0 auto; /* ✅ Center alignment magic */
  width: fit-content; /* ✅ Prevent full width */

  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  z-index: 20;
  animation: bounce 2s infinite;
  transition: all 0.3s ease;
}

.new-msg-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.6);
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

/* ✅ Load Previous Messages Button */
.load-more-btn {
  display: block;
  margin: 10px auto 15px;
  padding: 8px 16px;
  background: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: "Kanit", sans-serif;
}

.load-more-btn:hover {
  background: #475569;
  color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.load-more-btn:active {
  transform: translateY(0);
}

/* ✅ Mobile Responsive */
@media (max-width: 768px) {
  .avatar {
    width: 32px;
    height: 32px;
  }

  .new-msg-btn {
    bottom: 20px;
    /* right removed - using centered positioning */
    padding: 8px 14px;
    font-size: 0.9em;
  }
}

/* Scrollbar */
#chat-viewport::-webkit-scrollbar {
  width: 6px;
}
#chat-viewport::-webkit-scrollbar-track {
  background: #0f172a;
}
#chat-viewport::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
#chat-viewport::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>

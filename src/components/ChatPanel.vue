<template>
  <div class="chat-panel">
    <div class="tools-bar">
      <h3 style="color: #fff; margin: 0; font-size: 1.1em;">
        <i class="fa-solid fa-comments"></i> Live Chat
      </h3>
      <div class="chat-controls">
        <button 
          class="btn-tool" 
          :class="{ 'muted': !systemStore.isSoundOn }"
          @click="toggleSound"
        >
          <i :class="systemStore.isSoundOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
          {{ systemStore.isSoundOn ? 'เสียง: เปิด' : 'เสียง: ปิด' }}
        </button>
        
        <button class="btn-tool" @click="stopVoice">
          <i class="fa-solid fa-stop"></i> หยุดเสียง
        </button>
        
        <button class="btn-tool btn-csv" @click="exportCSV">
          <i class="fa-solid fa-file-csv"></i> CSV
        </button>
      </div>
    </div>

    <div id="chat-viewport" ref="chatViewport" @scroll="handleScroll">
      <div id="chat-list">
        <div
          v-for="chat in chatStore.messages"
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
              <span v-if="chat.realName !== chat.displayName" class="real-name">
                ({{ chat.realName }})
              </span>
            </div>

            <div class="chat-bubble">
              <div class="chat-text">{{ chat.text }}</div>
              
              <!-- Force Process Button -->
              <div v-if="chat.isAdmin || systemStore.isAiCommander" class="force-process-btn">
                 <button @click="forceProcess(chat)" class="btn-mini">
                   <i class="fa-solid fa-bolt"></i>
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button v-if="showScrollButton" class="new-msg-btn" @click="scrollToBottom">
      ข้อความใหม่ ⬇
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from "vue";
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
let isUserScrolling = false;

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
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
      updatedAt: Date.now()
    };
    
    update(dbRef(db), updates)
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "บันทึกแล้ว",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1500
        });
      })
      .catch(err => {
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
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    showScrollButton.value = false;
    isUserScrolling = false;
  }
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
  }
);

onMounted(() => {
  scrollToBottom();
});

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
      chat.uid,         // ใช้ UID จากแชท
      "manual-force",
      price ? parseInt(price) : null,
      "manual"
    );

    Swal.fire("เรียบร้อย", `ตัดสต็อกเบอร์ ${num} ให้ ${chat.displayName} แล้ว`, "success");
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
    timer: 1000
  });
}

function exportCSV() {
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความให้บันทึก",
      timer: 1500
    });
    return;
  }
  chatStore.downloadChatCSV(systemStore.currentVideoId || "chat-log");
  Swal.fire({
    icon: "success",
    title: "บันทึก CSV แล้ว",
    timer: 1500,
    showConfirmButton: false
  });
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

.tools-bar {
  padding: 10px 15px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
  font-family: 'Kanit', sans-serif;
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
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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

.chat-bubble {
  background-color: #1e293b; /* Bubble Color */
  color: #f1f5f9;
  padding: 10px 14px;
  border-radius: 0 12px 12px 12px; /* Rounded corners, flat top-left */
  font-size: 0.95em;
  line-height: 1.5;
  position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* Special Types */
.chat-row.buy .chat-bubble {
  background-color: #064e3b; /* Green for Buy */
  border: 1px solid #059669;
}

.chat-row.cancel .chat-bubble {
  background-color: #7f1d1d; /* Red for Cancel */
  border: 1px solid #dc2626;
}

/* Shipping removed - uses default blue */

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
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  z-index: 20;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {transform: translateX(-50%) translateY(0);}
  40% {transform: translateX(-50%) translateY(-5px);}
  60% {transform: translateX(-50%) translateY(-3px);}
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

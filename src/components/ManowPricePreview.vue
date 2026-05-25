<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="preview-modal-container">
      
      <!-- HEADER -->
      <div class="modal-header">
        <h2>
          <i class="fa-solid fa-microphone-lines animate-pulse"></i> ระบบจับเสียงและพรีวิวสตรีมสด (Live Voice & Video Panel)
        </h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- BODY -->
      <div class="modal-body">
        <!-- URL Input & Configuration Row -->
        <div class="config-section">
          <div class="input-group">
            <label for="live-url">ลิงก์ YouTube Live Stream</label>
            <div class="input-wrapper">
              <input 
                id="live-url"
                v-model="liveUrl" 
                type="text" 
                placeholder="วางลิงก์ เช่น https://www.youtube.com/watch?v=..."
                class="url-input"
                @keyup.enter="updateVideoId"
              />
              <button class="btn btn-primary" @click="updateVideoId" :disabled="isLoading">
                <i class="fa-solid fa-rotate"></i> อัปเดตสตรีม
              </button>
            </div>
          </div>

          <div class="control-row">
            <span v-if="systemStore.currentVideoId" class="current-id-badge">
              ID ไลฟ์สดปัจจุบัน: <code>{{ systemStore.currentVideoId }}</code>
            </span>
            <label class="mute-toggle">
              <input type="checkbox" v-model="isMuted" />
              <span><i class="fa-solid" :class="isMuted ? 'fa-volume-xmark' : 'fa-volume-high'"></i> ปิดเสียงเริ่มต้น</span>
            </label>
          </div>
        </div>

        <!-- Side-by-side Grid Layout -->
        <div class="preview-content-grid">
          
          <!-- LEFT PANEL: Video Player -->
          <div class="video-panel">
            <div class="panel-header">
              <h3><i class="fa-brands fa-youtube"></i> วิดีโอสตรีมสด</h3>
            </div>
            <div class="video-container">
              <iframe 
                v-if="systemStore.currentVideoId"
                :src="iframeSrc" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen
                class="video-iframe"
              ></iframe>
              <div v-else class="empty-video">
                <i class="fa-solid fa-play"></i>
                <p>วางลิงก์สตรีมสดด้านบน เพื่อแสดงผลเครื่องเล่นวิดีโอ</p>
              </div>
            </div>
          </div>

          <!-- RIGHT PANEL: Live Transcripts -->
          <div class="transcripts-panel">
            <div class="panel-header">
              <h3><i class="fa-solid fa-waveform-lines"></i> รายการเสียงพูดสดที่จับได้</h3>
              <span class="live-dot"><span class="dot"></span> Live Transcribing</span>
            </div>
            <div class="transcripts-container">
              <div class="transcripts-list">
                <div 
                  v-for="t in transcripts" 
                  :key="t.id" 
                  class="transcript-item"
                  :class="{ 'is-order': isOrderKeyword(t.text) }"
                >
                  <div class="transcript-meta">
                    <span class="sender-name">
                      <i class="fa-solid fa-microphone"></i> {{ t.displayName }}
                    </span>
                    <span class="timestamp">{{ formatTime(t.timestamp) }}</span>
                  </div>
                  <p class="transcript-text">{{ t.text }}</p>
                </div>

                <div v-if="transcripts.length === 0" class="empty-transcripts">
                  <i class="fa-solid fa-waveform"></i>
                  <p>กำลังเปิดตัวรับสัญญาณเสียงสตรีม...</p>
                  <p class="sub-text">เมื่อบอทถอดเสียงพูดภาษาไทยสำเร็จ จะแสดงข้อความที่นี่แบบเรียลไทม์</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from "vue";
import { useSystemStore } from "../stores/system";
import { useStockStore } from "../stores/stock";
import { ref as dbRef, set, onChildAdded, query, limitToLast } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);
const systemStore = useSystemStore();
const stockStore = useStockStore();

const liveUrl = ref("");
const isLoading = ref(false);
const isMuted = ref(true); // Default to muted
const transcripts = ref([]);

let voiceUnsubscribe = null;

// Extract YouTube Video ID from various URL formats
function extractVideoId(input) {
  if (!input) return "";
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/|shorts\/)([^#&?]*).*/;
  const match = input.match(regExp);
  return match && match[2].length === 11 ? match[2] : input;
}

const iframeSrc = computed(() => {
  if (!systemStore.currentVideoId) return "";
  return `https://www.youtube.com/embed/${systemStore.currentVideoId}?autoplay=1&mute=${isMuted.value ? 1 : 0}`;
});

function formatTime(ts) {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch (e) {
    return "";
  }
}

// Check if message is a potential order cut code (e.g. contains numbers)
function isOrderKeyword(text) {
  if (!text) return false;
  return /\b\d+\b/.test(text) || /F|cf|รับ|เอา/i.test(text);
}

// Setup real-time voice chat listener from Firebase
function setupVoiceListener(videoId) {
  if (voiceUnsubscribe) {
    voiceUnsubscribe();
    voiceUnsubscribe = null;
  }
  transcripts.value = [];

  if (!videoId || videoId === "demo") return;

  const voiceChatRef = query(dbRef(db, `voice_chats/${videoId}`), limitToLast(40));

  voiceUnsubscribe = onChildAdded(voiceChatRef, (snapshot) => {
    const val = snapshot.val();
    if (!val) return;

    transcripts.value.unshift({
      id: snapshot.key,
      text: val.text || val.snippet?.displayMessage || "",
      timestamp: val.timestamp || Date.now(),
      displayName: val.authorDetails?.displayName || "เสียงพูดไลฟ์สด"
    });

    // Cap at 40 entries to save browser memory
    if (transcripts.value.length > 40) {
      transcripts.value.pop();
    }
  });
}

// Watch Video ID updates to adjust listener
watch(
  () => systemStore.currentVideoId,
  (newId) => {
    setupVoiceListener(newId);
  },
  { immediate: true }
);

async function updateVideoId() {
  const urlVal = liveUrl.value.trim();
  if (!urlVal) {
    Swal.fire({
      icon: "warning",
      title: "คำเตือน",
      text: "กรุณากรอกลิงก์ YouTube Live ก่อน",
      timer: 2000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
    return;
  }

  const extractedId = extractVideoId(urlVal);
  if (!extractedId || extractedId.length !== 11) {
    Swal.fire({
      icon: "error",
      title: "รูปแบบลิงก์ไม่ถูกต้อง",
      text: "ไม่สามารถถอดรหัส Video ID จากลิงก์นี้ได้ กรุณาตรวจสอบลิงก์อีกครั้ง",
      timer: 3000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
    return;
  }

  isLoading.value = true;

  try {
    // 1. Sync value to Firebase system/currentVideoId and system/activeVideo
    await set(dbRef(db, "system/currentVideoId"), extractedId);
    await set(dbRef(db, "system/activeVideo"), extractedId);

    // 2. Update local state
    systemStore.currentVideoId = extractedId;
    stockStore.connectToStock(extractedId);

    Swal.fire({
      icon: "success",
      title: "อัปเดตสำเร็จ",
      text: `อัปเดต Video ID: ${extractedId} บนระบบเรียบร้อยแล้ว`,
      timer: 2000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  } catch (error) {
    console.error("Firebase update error:", error);
    Swal.fire({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: error.message,
      timer: 3000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  } finally {
    isLoading.value = false;
  }
}

onUnmounted(() => {
  if (voiceUnsubscribe) {
    voiceUnsubscribe();
  }
});
</script>

<style scoped>
.dashboard-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1050;
  backdrop-filter: blur(8px);
}

.preview-modal-container {
  background: var(--bg-panel, #0f172a);
  width: 95%;
  max-width: 1050px;
  height: 85vh;
  border-radius: 16px;
  border: 1px solid var(--border-color, #334155);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

.modal-header {
  padding: 15px 24px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "Kanit", sans-serif;
  font-weight: 500;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .5; }
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.4rem;
  cursor: pointer;
  transition: color 0.2s;
}
.btn-close:hover { color: #f43f5e; }

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #1e293b;
  padding: 16px;
  border-radius: 10px;
  border: 1px solid #334155;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-group label {
  color: #94a3b8;
  font-size: 0.85em;
  font-weight: 600;
  font-family: "Kanit", sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.input-wrapper {
  display: flex;
  gap: 12px;
}

.url-input {
  flex: 1;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 10px 16px;
  color: #fff;
  font-size: 0.95em;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: "Kanit", sans-serif;
}

.url-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
}

.btn {
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: "Kanit", sans-serif;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
}

.control-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-id-badge {
  font-size: 0.85em;
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
}

.current-id-badge code {
  background: #0f172a;
  padding: 3px 8px;
  border-radius: 6px;
  color: #60a5fa;
  font-family: monospace;
  border: 1px solid #334155;
  font-size: 1em;
}

.mute-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-size: 0.9em;
  font-family: "Kanit", sans-serif;
  cursor: pointer;
  user-select: none;
}

.mute-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.preview-content-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 20px;
  flex: 1;
  min-height: 0; /* Important for scroll containers inside grids */
}

.video-panel, .transcripts-panel {
  background: #1e293b;
  border-radius: 12px;
  border: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 18px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: "Kanit", sans-serif;
  font-weight: 500;
}

.live-dot {
  font-size: 0.8em;
  color: #4ade80;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: "Kanit", sans-serif;
  font-weight: 500;
}

.dot {
  width: 8px;
  height: 8px;
  background-color: #4ade80;
  border-radius: 50%;
  display: inline-block;
  box-shadow: 0 0 8px #4ade80;
  animation: beacon 1.5s infinite;
}

@keyframes beacon {
  0% { transform: scale(0.9); opacity: 0.9; }
  50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 12px #22c55e; }
  100% { transform: scale(0.9); opacity: 0.9; }
}

.video-container {
  flex: 1;
  position: relative;
  background: #090d16;
  overflow: hidden;
}

.video-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.empty-video {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #475569;
  gap: 12px;
}
.empty-video i { font-size: 2.8rem; }
.empty-video p { font-size: 0.9em; font-family: "Kanit", sans-serif; }

.transcripts-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #0f172a;
}

.transcripts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transcript-item {
  background: #1e293b;
  border-left: 4px solid #3b82f6;
  border-radius: 0 8px 8px 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: transform 0.2s, background-color 0.2s;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from { transform: translateY(-10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.transcript-item:hover {
  background: #334155;
  transform: translateX(2px);
}

.transcript-item.is-order {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.08);
}
.transcript-item.is-order:hover {
  background: rgba(34, 197, 94, 0.12);
}

.transcript-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sender-name {
  font-size: 0.8em;
  font-weight: 600;
  color: #94a3b8;
  font-family: "Kanit", sans-serif;
  display: flex;
  align-items: center;
  gap: 6px;
}

.transcript-item.is-order .sender-name {
  color: #4ade80;
}

.timestamp {
  font-size: 0.75em;
  color: #64748b;
  font-family: monospace;
}

.transcript-text {
  margin: 0;
  font-size: 0.95em;
  color: #f1f5f9;
  line-height: 1.4;
  font-family: "Kanit", sans-serif;
}

.empty-transcripts {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #475569;
  text-align: center;
  gap: 12px;
}

.empty-transcripts i {
  font-size: 2.5rem;
  color: #334155;
  animation: pulse 1.8s infinite;
}

.empty-transcripts p {
  margin: 0;
  font-size: 0.9em;
  font-weight: 500;
  font-family: "Kanit", sans-serif;
}

.empty-transcripts .sub-text {
  font-size: 0.8em;
  color: #475569;
  max-width: 250px;
}

/* Custom Scrollbar for transcripts */
.transcripts-container::-webkit-scrollbar {
  width: 6px;
}
.transcripts-container::-webkit-scrollbar-track {
  background: #0f172a;
}
.transcripts-container::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
.transcripts-container::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

@media (max-width: 850px) {
  .preview-content-grid {
    grid-template-columns: 1fr;
    grid-template-rows: 1.1fr 0.9fr;
  }
  .preview-modal-container {
    height: 92vh;
  }
}
</style>

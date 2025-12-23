<template>
  <div class="voice-price-page">
    <header class="header-bar">
      <div class="left-info">
        <h1 class="page-title">🎙️ ตรวจเสียงราคา (Voice Price Detector)</h1>
        <div class="live-status">
            <span class="badge" :class="{ connected: isDbConnected }">
               {{ isDbConnected ? "ONLINE" : "OFFLINE" }}
            </span>
            <span class="video-id" v-if="systemStore.currentVideoId">
                ID: {{ systemStore.currentVideoId }}
            </span>
            <span class="live-title" v-if="systemStore.liveTitle">
                {{ systemStore.liveTitle }}
            </span>
        </div>
      </div>
      <div class="right-info">
        <div class="clock">{{ currentTime }}</div>
      </div>
    </header>

    <main class="main-content">
       
       <!-- Log Display -->
       <div class="log-container glass-panel">
          <div class="log-label">RESULT</div>
          <div class="log-result" :class="{ error: lastAction.startsWith('⚠️' || '🗑️') }">
             {{ lastAction || "รอคำสั่ง..." }}
          </div>
          
          <div class="divider"></div>

          <div class="log-label">HEARING</div>
          <div class="log-transcript">
             "{{ transcript || "..." }}"
          </div>
       </div>

       <!-- Mic Button -->
       <div class="mic-wrapper">
          <button 
            class="mic-btn" 
            :class="{ active: isListening }"
            @click="toggleMic"
          >
            <i class="fa-solid fa-microphone"></i>
          </button>
          <div class="mic-label">{{ isListening ? "กำลังฟัง..." : "แตะเพื่อเริ่ม" }}</div>
       </div>

    </main>

    <footer class="cheat-sheet glass-panel">
       <div class="cheat-item">
          <i class="fa-solid fa-tag"></i> 
          <span>ตั้งราคา: "รหัส 10 150 บาท"</span>
       </div>
       <div class="cheat-item">
          <i class="fa-solid fa-hand-holding-dollar"></i> 
          <span>จองเอง: "จอง 5"</span>
       </div>
       <div class="cheat-item">
          <i class="fa-solid fa-trash"></i> 
          <span>ยกเลิก: "ยกเลิก 8"</span>
       </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useSystemStore } from '../stores/system';
import { useVoiceDetector } from '../composables/useVoiceDetector';
import { useFirebase } from '../composables/useFirebase';
import { ref as dbRef, onValue } from "firebase/database";

const systemStore = useSystemStore();
const { isListening, transcript, lastAction, toggleMic } = useVoiceDetector();
const isDbConnected = ref(false); // ✅ Local DB Connection State

const currentTime = ref("");
let timer;
let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('✅ Screen Wake Lock acquired');
        } else {
            console.warn('⚠️ Wake Lock API not supported');
        }
    } catch (err) {
        console.error(`❌ Wake Lock failed: ${err.name}, ${err.message}`);
    }
}

async function handleVisibilityChange() {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
}

function updateTime() {
    currentTime.value = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
    updateTime();
    timer = setInterval(updateTime, 1000);
    
    // Request Wake Lock
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // ✅ Firebase Connection Check
    const connectedRef = dbRef(useFirebase().db, ".info/connected");
    onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            isDbConnected.value = true;
        } else {
            isDbConnected.value = false;
        }
    });
});

onUnmounted(() => {
    clearInterval(timer);
    
    // Release Wake Lock
    if (wakeLock !== null) {
        wakeLock.release()
            .then(() => {
                wakeLock = null;
            });
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap');

.voice-price-page {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: radial-gradient(circle at center, #1e3a8a 0%, #000000 100%);
  color: #fff;
  font-family: 'Outfit', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 99999;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}

/* Header */
.header-bar {
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.page-title {
  font-size: 1.25rem;
  font-weight: 500;
  opacity: 0.8;
  margin: 0;
}
.live-status {
  margin-top: 8px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.badge {
  font-size: 0.75rem;
  padding: 4px 12px;
  background: #333;
  color: #888;
  border-radius: 99px;
  font-weight: 700;
  letter-spacing: 1px;
}
.badge.connected {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid #10b981;
}
.video-id {
  font-size: 0.9rem;
  font-family: monospace;
  color: #aaa;
}
.live-title {
  font-size: 0.9rem;
  color: #fff;
  opacity: 0.8;
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 10px;
  border-left: 1px solid rgba(255,255,255,0.2);
}
.clock {
  font-size: 2.5rem;
  font-weight: 300;
  opacity: 0.9;
}

/* Main */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 40px;
  padding: 20px;
}

.log-container {
  width: 100%;
  max-width: 700px;
  padding: 30px;
  text-align: center;
}
.log-label {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: rgba(255,255,255,0.3);
  margin-bottom: 10px;
}
.log-result {
  font-size: 2rem;
  font-weight: 700;
  color: #10b981;
  text-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
  min-height: 1.2em;
}
.log-result.error {
   color: #ef4444;
   text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
}
.divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 20px 0;
}
.log-transcript {
  font-size: 1.5rem;
  font-weight: 300;
  font-style: italic;
  color: rgba(255,255,255,0.7);
  min-height: 1.2em;
}

/* Mic */
.mic-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.mic-btn {
  width: 140px; height: 140px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 2px solid rgba(255,255,255,0.2);
  color: #fff;
  font-size: 3.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  justify-content: center;
  align-items: center;
}
.mic-btn:hover {
  transform: scale(1.05);
  background: rgba(255,255,255,0.2);
}
.mic-btn.active {
   background: rgba(239, 68, 68, 0.2);
   border-color: #ef4444;
   color: #ef4444;
   box-shadow: 0 0 60px rgba(239, 68, 68, 0.5);
   animation: pulse 1.6s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 40px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.mic-label {
  font-size: 1.1rem;
  letter-spacing: 1px;
  opacity: 0.6;
}

/* Footer */
.cheat-sheet {
  margin: 30px;
  padding: 20px;
  display: flex;
  justify-content: center;
  gap: 40px;
}
.cheat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 1rem;
  opacity: 0.8;
}
.cheat-item i { color: #60a5fa; }

/* Responsive Mobile */
@media (max-width: 768px) {
  .cheat-sheet { flex-direction: column; gap: 15px; margin: 15px; }
  .log-result { font-size: 1.5rem; }
  .mic-btn { width: 100px; height: 100px; font-size: 2.5rem; }
}
</style>

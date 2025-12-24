<template>
  <div
    class="app-container"
    @click="handleFirstInteraction"
    @touchstart="handleFirstInteraction"
  >
    <!-- ✅ Voice Price Mode -->
    <VoicePricePage v-if="isVoiceMode" />

    <!-- ✅ Live Overlay Mode -->
    <LiveOverlay v-else-if="isOverlayMode" />

    <!-- ✅ Normal Mode -->
    <template v-else>
       <Header />

    <div v-if="systemStore.isAway" class="away-banner">
      <div class="away-content">
        <div class="away-icon">🌙</div>
        <div class="away-text">
          <div class="away-title">แอดมินพาลูกนอน</div>
          <div class="away-subtitle">
            กรุณารอสักครู่ หรือส่งข้อความทักทายไว้ค่ะ
          </div>
        </div>
        <span class="away-timer">{{ awayTimer }}</span>
        <button class="away-btn" @click="closeAwayMode">
          <i class="fa-solid fa-check"></i> ลูกหลับแล้ว
        </button>
      </div>
    </div>

    <div class="main-container">
      <StockGrid />
      <ChatPanel />

      <Dashboard v-if="showDashboard" @close="showDashboard = false" />
      <HistoryModal v-if="showHistory" @close="showHistory = false" />
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, provide } from "vue";
import { useSystemStore } from "./stores/system";
import { useStockStore } from "./stores/stock";
import { useChatStore } from "./stores/chat";
import { useNicknameStore } from "./stores/nickname";
import { ref as dbRef, onValue, onDisconnect, set } from "firebase/database";
import { db } from "./composables/useFirebase";
import { useAudio } from "./composables/useAudio";
import { useAwayMode } from "./composables/useAwayMode";
import { useAutoCleanup } from "./composables/useAutoCleanup"; // ✅ Import Auto Cleanup
import Header from "./components/Header.vue";
import StockGrid from "./components/StockGrid.vue";
import ChatPanel from "./components/ChatPanel.vue";
import Dashboard from "./components/Dashboard.vue";
import HistoryModal from "./components/HistoryModal.vue";
import VoicePricePage from "./components/VoicePricePage.vue"; // ✅ Import Voice Page
import LiveOverlay from "./components/LiveOverlay.vue"; // ✅ Import Overlay

const systemStore = useSystemStore();
const stockStore = useStockStore();
const chatStore = useChatStore();
const nicknameStore = useNicknameStore();

const urlParams = new URLSearchParams(window.location.search);
const isVoiceMode = urlParams.get("mode") === "voice"; 
const isOverlayMode = urlParams.get("mode") === "overlay"; // ✅ Check Overlay Mode

// ✅ ดึง unlockAudio มาใช้แทน playDing
const { unlockAudio } = useAudio();

// ✅ Use Away Mode Composable
const { awayTimer, closeAwayMode, initAwayListener } = useAwayMode();

// ✅ Use Auto Cleanup Composable
const { initAutoCleanup } = useAutoCleanup();

const showDashboard = ref(false);
const showHistory = ref(false);

// Provide functions for child components
provide("openDashboard", () => (showDashboard.value = true));
provide("openHistory", () => (showHistory.value = true));

// ✅ Unlock Audio Function (Silent)
function handleFirstInteraction() {
  unlockAudio(); // ใช้ฟังก์ชันนี้แทน playDing เพื่อไม่ให้มีเสียงรบกวน

  // ลบ Listener ออกเพื่อไม่ให้ทำงานซ้ำ
  document.removeEventListener("click", handleFirstInteraction);
  document.removeEventListener("touchstart", handleFirstInteraction);
  console.log("🔊 Audio unlocked silently by user interaction");
}

onMounted(() => {
  console.log("🚀 App mounted");

  // ✅ Initialize Listeners
  nicknameStore.initNicknameListener();
  stockStore.connectToStock("demo");
  initAwayListener(); // ✅ Init Away Mode Listener
  initAutoCleanup(); // ✅ Init Auto Cleanup (Admin Only)
  systemStore.initHostListener(); // ✅ Init Host Listener (Take Over Logic)

  // ✅ Reset Connection State (Ensure YouTube starts disconnected)
  systemStore.isConnected = false;
  systemStore.statusApi = "idle";
  systemStore.statusChat = "idle";

  // ✅ Firebase Connection Status
  const connectedRef = dbRef(db, ".info/connected");
  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      systemStore.statusDb = "ok";
      console.log("✅ Firebase Connected");

      const myConnectionRef = dbRef(db, `presence/${systemStore.myDeviceId}`);
      set(myConnectionRef, {
        online: true,
        lastSeen: Date.now(),
      }).catch((err) => console.error("Presence error:", err));

      onDisconnect(myConnectionRef).remove();
    } else {
      systemStore.statusDb = "err";
      console.log("❌ Firebase Disconnected");
    }
  });

  // System Listeners
  onValue(dbRef(db, "system/activeVideo"), (snap) => {
    const vid = snap.val();
    if (vid && vid !== "demo") {
      systemStore.currentVideoId = vid;
      stockStore.connectToStock(vid);
    }
  });

  onValue(
    dbRef(db, "settings/" + systemStore.currentVideoId + "/stockSize"),
    (snap) => {
      const val = snap.val();
      if (val) stockStore.stockSize = val;
    }
  );

  onValue(dbRef(db, "system/aiCommander"), (snap) => {
    const data = snap.val();
    if (data && typeof data === "object" && data.enabled) {
      systemStore.isAiCommander = data.enabled === systemStore.myDeviceId;
    } else if (data === systemStore.myDeviceId) {
      systemStore.isAiCommander = true;
    } else {
      systemStore.isAiCommander = false;
    }
  });
});
</script>

<style>
@import "./assets/style.css";

.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.away-banner {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 30px;
  border-radius: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  animation: pulseAway 3s infinite;
  max-width: 90%;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.away-content {
  display: flex;
  align-items: center;
  gap: 15px;
  white-space: nowrap;
}

.away-icon {
  font-size: 2em;
  animation: moonSway 4s ease-in-out infinite;
}

@keyframes moonSway {
  0%,
  100% {
    transform: rotate(-10deg);
  }
  50% {
    transform: rotate(10deg);
  }
}

.away-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.away-title {
  font-size: 1.3em;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.away-subtitle {
  font-size: 0.85em;
  opacity: 0.9;
}

.away-timer {
  font-family: "Courier New", monospace;
  font-size: 1.4em;
  font-weight: bold;
  background: rgba(0, 0, 0, 0.25);
  padding: 6px 14px;
  border-radius: 10px;
  min-width: 90px;
  text-align: center;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.away-btn {
  background: white;
  color: #667eea;
  border: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  font-family: "Kanit", sans-serif;
  transition: all 0.3s;
  font-size: 0.95em;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.away-btn:hover {
  background: #f0f0f0;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.away-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@keyframes pulseAway {
  0%,
  100% {
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 8px 40px rgba(118, 75, 162, 0.6);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .away-banner {
    top: 60px;
    padding: 12px 20px;
  }

  .away-content {
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .away-text {
    align-items: center;
    text-align: center;
  }

  .away-icon {
    font-size: 1.5em;
  }

  .away-title {
    font-size: 1.1em;
  }

  .away-subtitle {
    display: none;
  }

  .away-timer {
    font-size: 1.1em;
    min-width: 70px;
    padding: 4px 10px;
  }

  .away-btn {
    padding: 6px 16px;
    font-size: 0.85em;
    width: 100%;
    justify-content: center;
  }
}
</style>

<template>
  <div class="app-container">
    <!-- ✅ Live Overlay Mode -->
    <LiveOverlay v-if="isOverlayMode" />

    <!-- ✅ Shipping Mobile Mode -->
    <ShippingMobileView v-else-if="isShippingMode" />

    <!-- ✅ Normal Mode -->
    <template v-else>
      <UpdatePrompt />
      <div class="app-layout">
        <div class="left-column">
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
            <Dashboard v-if="showDashboard" @close="showDashboard = false" />
            <HistoryModal v-if="showHistory" @close="showHistory = false" />
            <ShippingManager v-if="showShippingManager" @close="showShippingManager = false" />
          </div>
          <NoteBanner />
        </div>
        <ChatPanel />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from "vue";
import { useSystemStore } from "./stores/system";
import { useStockStore } from "./stores/stock";
import { useChatStore } from "./stores/chat";
import { useNicknameStore } from "./stores/nickname";
import { ref as dbRef, onValue, onDisconnect, set } from "firebase/database";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./composables/useFirebase";
import { logger } from "./utils/logger"; // ✅ Import Logger
import { useAudio } from "./composables/useAudio";
import { useAwayMode } from "./composables/useAwayMode";
import { useAutoCleanup } from "./composables/useAutoCleanup"; // ✅ Import Auto Cleanup

import { usePullToRefresh } from "./composables/usePullToRefresh"; // ✅ Import Pull to Refresh
import { ttsService } from "./services/TextToSpeech"; // ✅ Import TTS Service
import Header from "./components/Header.vue";
import StockGrid from "./components/StockGrid.vue";
import ChatPanel from "./components/ChatPanel.vue";
import Dashboard from "./components/Dashboard.vue";
import HistoryModal from "./components/HistoryModal.vue";
import ShippingManager from "./components/ShippingManager.vue";
import ShippingMobileView from "./components/ShippingMobileView.vue"; // ✅ Import new component

import LiveOverlay from "./components/LiveOverlay.vue"; // ✅ Import Overlay
import UpdatePrompt from "./components/UpdatePrompt.vue"; // ✅ Import PWA Update Prompt
import NoteBanner from "./components/NoteBanner.vue"; // ✅ Import Note Banner

const systemStore = useSystemStore();
const stockStore = useStockStore();
const chatStore = useChatStore();
const nicknameStore = useNicknameStore();

// ✅ Global Watcher: Silence immediately when Sound is toggled OFF
watch(
  () => systemStore.isSoundOn,
  (isOn) => {
    if (!isOn) {
      console.log(
        "🔇 Sound turned OFF - Silencing immediately (App Singleton).",
      );
      ttsService.reset();
    }
  },
);

const urlParams = new URLSearchParams(window.location.search);
const isOverlayMode = urlParams.get("mode") === "overlay"; // ✅ Check Overlay Mode
const isShippingMode = urlParams.get("mode") === "shipping"; // ✅ Check Shipping Mode

// ✅ ดึง unlockAudio มาใช้แทน playDing
const { unlockAudio } = useAudio();

// ✅ Use Away Mode Composable
const { awayTimer, closeAwayMode, initAwayListener } = useAwayMode();

// ✅ Use Auto Cleanup Composable
const { initAutoCleanup } = useAutoCleanup();



const showDashboard = ref(false);
const showHistory = ref(false);
const showShippingManager = ref(false);

// Provide functions for child components
provide("openDashboard", () => (showDashboard.value = true));
provide("openHistory", () => (showHistory.value = true));
provide("openShippingManager", () => (showShippingManager.value = true));

// ✅ Unlock Audio Function (All audio types: SFX, Native TTS, Google TTS)
async function handleFirstInteraction() {
  const unlocked = await unlockAudio(); // Unlocks all audio systems

  if (unlocked) {
    // Remove ALL listeners to prevent duplicate calls
    document.removeEventListener("click", handleFirstInteraction);
    document.removeEventListener("touchstart", handleFirstInteraction);
    document.removeEventListener("keydown", handleFirstInteraction);
    logger.log("✅ Audio unlocked on first interaction");
  }
}

onMounted(async () => {
  console.log("🚀 App mounted");

  // 🤖 Test Mode: Auto-Login
  const testEmail = import.meta.env.VITE_TEST_EMAIL;
  const testPass = import.meta.env.VITE_TEST_PASSWORD;

  if (testEmail && testPass && !auth.currentUser) {
    console.log("🤖 Test Mode Detected: Attempting Auto-Login...");
    try {
      await signInWithEmailAndPassword(auth, testEmail, testPass);
      console.log("✅ Auto-Login Success:", testEmail);
    } catch (e) {
      console.error("❌ Auto-Login Failed:", e.message);
    }
  }

  // ✅ Enable Pull to Refresh for PWA
  usePullToRefresh();

  // Add global listeners for audio unlock
  document.addEventListener("click", handleFirstInteraction);
  document.addEventListener("touchstart", handleFirstInteraction);
  document.addEventListener("keydown", handleFirstInteraction);

  const cleanupFns = [];

  // Clean up these specific listeners on unmount (if not yet removed)
  cleanupFns.push(() => {
    document.removeEventListener("click", handleFirstInteraction);
    document.removeEventListener("touchstart", handleFirstInteraction);
    document.removeEventListener("keydown", handleFirstInteraction);
  });

  // ✅ Initialize Listeners (Capture cleanup functions)
  const unsubNick = nicknameStore.initNicknameListener();
  if (unsubNick) cleanupFns.push(unsubNick);

  const unsubStock = stockStore.connectToStock("demo");
  if (unsubStock) cleanupFns.push(unsubStock);

  const unsubAway = initAwayListener(); // ✅ Init Away Mode Listener
  if (unsubAway) cleanupFns.push(unsubAway);

  // ✅ Auto Cleanup (Async initialization)
  initAutoCleanup().then((cleanup) => {
    if (cleanup) cleanupFns.push(cleanup);
  });

  const unsubHost = systemStore.initHostListener(); // ✅ Init Host Listener
  if (unsubHost) cleanupFns.push(unsubHost);

  // ✅ Reset Connection State (Ensure YouTube starts disconnected)
  systemStore.isConnected = false;
  systemStore.statusApi = "idle";
  systemStore.statusChat = "idle";

  // ✅ Track connection and auth state separately
  const isDbConnected = ref(false);
  const isUserAuthenticated = ref(false);

  // ✅ Setup presence only when BOTH conditions are met
  function setupPresence() {
    if (isDbConnected.value && isUserAuthenticated.value) {
      const myConnectionRef = dbRef(db, `presence/${systemStore.myDeviceId}`);
      set(myConnectionRef, {
        online: true,
        lastSeen: Date.now(),
        ttsKey: systemStore.activeKeyIndex, // ✅ Set initial TTS key status
      }).then(() => {
        // ✅ After presence is registered, balance the TTS keys among active devices
        systemStore.assignOptimalTtsKey();
      }).catch((err) => console.error("Presence error:", err));

      onDisconnect(myConnectionRef).remove();
      console.log("✅ Presence setup complete");
    }
  }

  // ✅ Firebase Connection Status
  let hasConnectedOnce = false;
  const connectedRef = dbRef(db, ".info/connected");
  const unsubConnected = onValue(connectedRef, (snap) => {
    const isOnline = snap.val() === true;

    if (isOnline) {
      hasConnectedOnce = true;
      systemStore.statusDb = "ok";
      logger.log("✅ Firebase Connected");
      isDbConnected.value = true;
      setupPresence();
    } else {
      systemStore.statusDb = "err";
      isDbConnected.value = false;

      // Only log warning if we were previously connected
      if (hasConnectedOnce) {
        logger.warn("❌ Firebase Disconnected");
      } else {
        // Silent debug log for initial connecting state
        console.debug("⏳ Connecting to Firebase...");
      }
    }
  });
  cleanupFns.push(unsubConnected);

  // ✅ Auth State Listener
  const unsubAuth = onAuthStateChanged(auth, (user) => {
    isUserAuthenticated.value = !!user;
    console.log(
      `✅ Auth state changed: ${user ? "authenticated" : "not authenticated"}`,
    );
    setupPresence();
  });
  cleanupFns.push(unsubAuth);

  // System Listeners
  const unsubActiveVideo = onValue(dbRef(db, "system/activeVideo"), (snap) => {
    const vid = snap.val();
    if (vid && vid !== "demo") {
      systemStore.currentVideoId = vid;
      stockStore.connectToStock(vid);
    }
  });
  cleanupFns.push(unsubActiveVideo);

  // ✅ stockSize listener is already handled inside connectToStock()

  // ✅ Register Cleanup
  onUnmounted(() => {
    console.log("♻️ Cleaning up App.vue listeners...");
    cleanupFns.forEach((fn) => fn && fn());
  });
});
</script>

<style>
/* style.css loaded via main.js */

.app-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

  /* iOS Safe Area Support */
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top);
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

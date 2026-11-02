<template>
  <div class="app-container">
    <!-- 🔒 High-Security Authentication Gate -->
    <AuthGate v-if="!authStore.isAuthenticated" />

    <!-- Protected Application Views -->
    <template v-else>
      <UpdatePrompt />
      <div class="app-layout" :class="{ 'chat-collapsed': systemStore.isChatCollapsed }">
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
            <PhoneticManager v-if="showPhoneticManager" @close="showPhoneticManager = false" />
          </div>
          <NoteBanner />
        </div>
        <ChatPanel />

        <!-- 🚀 Floating Modern Expand Tab (Visible when Chat is Collapsed) -->
        <button
          v-if="systemStore.isChatCollapsed"
          type="button"
          class="chat-expand-floating-tab"
          @click="systemStore.toggleChatCollapse"
          title="คลิกเพื่อเปิดช่องแชทสด (Live Chat) หรือกด Alt + C"
        >
          <div class="floating-tab-glow"></div>
          <div class="floating-tab-inner">
            <i class="fa-solid fa-angles-left arrow-icon"></i>
            <i class="fa-solid fa-comments chat-bubble-icon"></i>
            <span class="floating-tab-text">แชทสด</span>
            <span
              v-if="chatStore.unreadCollapsedCount > 0"
              class="floating-tab-badge"
              :title="`มี ${chatStore.unreadCollapsedCount} ข้อความใหม่ขณะซ่อนแชท`"
            >
              {{ chatStore.unreadCollapsedCount > 99 ? '99+' : chatStore.unreadCollapsedCount }}
            </span>
          </div>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch, defineAsyncComponent } from "vue";
import { useAuthStore } from "./stores/auth";
import Swal from "sweetalert2";
import { useSystemStore } from "./stores/system";
import { useStockStore } from "./stores/stock";
import { useChatStore } from "./stores/chat";
import { useNicknameStore } from "./stores/nickname";
import { ref as dbRef, onValue, onDisconnect, set, remove } from "firebase/database";
import { db } from "./composables/useFirebase";
import { logger } from "./utils/logger"; // ✅ Import Logger
import { useAwayMode } from "./composables/useAwayMode";
import { useAutoCleanup } from "./composables/useAutoCleanup"; // ✅ Import Auto Cleanup

import { usePullToRefresh } from "./composables/usePullToRefresh"; // ✅ Import Pull to Refresh
import { ttsService } from "./services/TextToSpeech"; // ✅ Import TTS Service
import { useAudio } from "./composables/useAudio"; // ✅ Import useAudio
import Header from "./components/Header.vue";
import StockGrid from "./components/StockGrid.vue";
import ChatPanel from "./components/ChatPanel.vue";
import UpdatePrompt from "./components/UpdatePrompt.vue"; // ✅ Import PWA Update Prompt
import NoteBanner from "./components/NoteBanner.vue"; // ✅ Import Note Banner
import { useVoiceLearningStore } from "./stores/voiceLearning";
import { useCustomerStore } from "./stores/customer";
import { syncDeliveryCustomerForOwner } from "./utils/deliverySync";
import { useDeliveryReconciliation } from "./composables/useDeliveryReconciliation";
import { useBlacklistStore } from "./stores/blacklist";
import { useChatProcessor } from "./composables/useChatProcessor";

// 🚀 Performance: Lazy load AuthGate & heavy modals on demand via defineAsyncComponent
const AuthGate = defineAsyncComponent(() => import("./components/AuthGate.vue"));
const Dashboard = defineAsyncComponent(() => import("./components/Dashboard.vue"));
const HistoryModal = defineAsyncComponent(() => import("./components/HistoryModal.vue"));
const ShippingManager = defineAsyncComponent(() => import("./components/ShippingManager.vue"));
const PhoneticManager = defineAsyncComponent(() => import("./components/PhoneticManager.vue"));

const authStore = useAuthStore();
const systemStore = useSystemStore();
const stockStore = useStockStore();
const chatStore = useChatStore();
const nicknameStore = useNicknameStore();
const voiceLearningStore = useVoiceLearningStore();
const customerStore = useCustomerStore();
const blacklistStore = useBlacklistStore();

// ✅ Global Watcher: Silence immediately when Sound is toggled OFF
watch(
  () => systemStore.isSoundOn,
  (isOn) => {
    if (!isOn) {
      logger.info(
        "🔇 Sound turned OFF - Silencing immediately (App Singleton).",
      );
      const { resetVoice } = useAudio();
      resetVoice();
    }
  },
);

// ✅ Use Away Mode Composable
const { awayTimer, closeAwayMode, initAwayListener } = useAwayMode();

// ✅ Use Auto Cleanup Composable
const { initAutoCleanup } = useAutoCleanup();

// ✅ Enable Pull to Refresh for PWA (must be at setup scope for lifecycle hooks)
usePullToRefresh();

const showDashboard = ref(false);
const showHistory = ref(false);
const showShippingManager = ref(false);
const showPhoneticManager = ref(false);

// ✅ Top-level cleanup array for reliable lifecycle management (Vue 3 safe)
const cleanupFns = [];

// Provide functions for child components
provide("openDashboard", () => (showDashboard.value = true));
provide("openHistory", () => (showHistory.value = true));
provide("openShippingManager", () => (showShippingManager.value = true));
provide("openPhoneticManager", () => (showPhoneticManager.value = true));

// ✅ Active Price Detector Voice Listener Watcher
const { initManowPriceVoiceListener } = useChatProcessor();
let voiceListenerUnsub = null;

watch(
  () => [systemStore.currentVideoId, systemStore.isPriceDetector, authStore.isAuthenticated],
  ([vid, isDetector, isAuth]) => {
    if (voiceListenerUnsub) {
      voiceListenerUnsub();
      voiceListenerUnsub = null;
    }
    if (isAuth && isDetector && vid && vid !== "demo") {
      logger.info(`🎙️ [Active Price Detector] Starting voice listener for video: ${vid}`);
      voiceListenerUnsub = initManowPriceVoiceListener(vid);
    }
  },
  { immediate: true }
);

let listenerGeneration = 0;
function stopAppListeners() {
  ++listenerGeneration;
  cleanupFns.splice(0).forEach(fn => fn?.());
  stockStore.stopStockSync();
}

function startAppListeners() {
  stopAppListeners();
  const version = listenerGeneration;
  // ✅ Initialize Listeners (Capture cleanup functions)
  const unsubNick = nicknameStore.initNicknameListener();
  if (unsubNick) cleanupFns.push(unsubNick);

  const unsubStock = stockStore.connectToStock("demo");
  if (unsubStock) cleanupFns.push(unsubStock);

  const unsubAway = initAwayListener(); // ✅ Init Away Mode Listener
  if (unsubAway) cleanupFns.push(unsubAway);

  // ✅ Auto Cleanup (Async initialization)
  initAutoCleanup().then((cleanup) => {
    if (version !== listenerGeneration) cleanup?.();
    else if (cleanup) cleanupFns.push(cleanup);
  });

  const unsubHost = systemStore.initHostListener(); // ✅ Init Host Listener
  if (unsubHost) cleanupFns.push(unsubHost);

  const unsubDetector = systemStore.initPriceDetectorListener(); // ✅ Init Price Detector Listener
  if (unsubDetector) cleanupFns.push(unsubDetector);

  const unsubShippingCycle = systemStore.initShippingCycleListener(); // ✅ Init Shipping Cycle Listener
  if (unsubShippingCycle) cleanupFns.push(unsubShippingCycle);

  const unsubVoiceLearning = voiceLearningStore.initVoicePatterns(); // ✅ Init Voice Patterns Self-Learning
  if (unsubVoiceLearning) cleanupFns.push(unsubVoiceLearning);

  const unsubCustomers = customerStore.initCustomerListeners(); // ✅ Init Shared Customer & Address Book Store
  if (unsubCustomers) cleanupFns.push(unsubCustomers);

  const unsubBlacklist = blacklistStore.initBlacklistListener(); // ✅ Init Shared Blacklist Store
  if (unsubBlacklist) cleanupFns.push(unsubBlacklist);


  // ✅ Reset Connection State (Ensure YouTube starts disconnected)
  systemStore.isConnected = false;
  systemStore.statusApi = "idle";
  systemStore.statusChat = "idle";

  // ✅ Track connection and auth state separately
  const isDbConnected = ref(false);

  // ✅ Setup presence only when BOTH conditions are met
  function setupPresence() {
    if (isDbConnected.value && authStore.isAuthenticated) {
      const myConnectionRef = dbRef(db, `presence/${systemStore.myDeviceId}`);
      set(myConnectionRef, {
        online: true,
        lastSeen: Date.now(),
        ttsKey: systemStore.activeKeyIndex, // ✅ Set initial TTS key status
      }).then(() => {
        // ✅ After presence is registered, balance the TTS keys among active devices
        systemStore.assignOptimalTtsKey();
      }).catch((err) => console.error("Presence error:", err));

      const disconnect = onDisconnect(myConnectionRef);
      disconnect.remove().catch(err => logger.warn('Presence disconnect setup failed:', err));
      cleanupFns.push(() => {
        disconnect.cancel().catch(() => {});
        remove(myConnectionRef).catch(() => {});
      });
      logger.info("✅ Presence setup complete");
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

  // System Listeners
  const unsubActiveVideo = onValue(dbRef(db, "system/activeVideo"), (snap) => {
    const vid = snap.val();
    if (vid && vid !== "demo") {
      systemStore.currentVideoId = vid;
      stockStore.connectToStock(vid);
    } else {
      systemStore.currentVideoId = "";
      systemStore.liveTitle = "รอกระแสข้อมูล...";
      systemStore.isLiveFinished = false;
    }
  });
  cleanupFns.push(unsubActiveVideo);

  const unsubActiveVideoTitle = onValue(dbRef(db, "system/activeVideoTitle"), (snap) => {
    const title = snap.val();
    if (title && systemStore.currentVideoId && systemStore.currentVideoId !== "demo") {
      systemStore.liveTitle = title;
    } else if (!systemStore.currentVideoId || systemStore.currentVideoId === "demo") {
      systemStore.liveTitle = "รอกระแสข้อมูล...";
    }
  });
  cleanupFns.push(unsubActiveVideoTitle);

  const unsubIsLiveFinished = onValue(dbRef(db, "system/isLiveFinished"), (snap) => {
    if (systemStore.currentVideoId && systemStore.currentVideoId !== "demo") {
      systemStore.isLiveFinished = snap.val() === true;
    } else {
      systemStore.isLiveFinished = false;
    }
  });
  cleanupFns.push(unsubIsLiveFinished);

  // ✅ stockSize listener is already handled inside connectToStock()

}

onMounted(() => {
  window.addEventListener("keydown", handleGlobalHotkeys);
  const stopAuthWatch = watch(() => authStore.isAuthenticated, allowed => {
    if (allowed) startAppListeners();
    else stopAppListeners();
  }, { immediate: true });
  // Keep the auth watcher outside the protected-listener cleanup list.
  stopAuthWatchOnUnmount = stopAuthWatch;
});
let stopAuthWatchOnUnmount = null;

function handleGlobalHotkeys(e) {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl.tagName === "INPUT" ||
    activeEl.tagName === "TEXTAREA" ||
    activeEl.isContentEditable
  );

  // 1. ESC: Close Modals
  if (e.key === "Escape") {
    if (showDashboard.value || showHistory.value || showShippingManager.value || showPhoneticManager.value) {
      showDashboard.value = false;
      showHistory.value = false;
      showShippingManager.value = false;
      showPhoneticManager.value = false;
      e.preventDefault();
      return;
    }
  }

  if (isTyping) return;

  // 2. Shift + M: Toggle Sound (Mute/Unmute)
  if (e.shiftKey && (e.key === "M" || e.key === "m")) {
    systemStore.isSoundOn = !systemStore.isSoundOn;
    e.preventDefault();
    return;
  }

  // 3. Shift + F: Focus YouTube Video ID Input
  if (e.shiftKey && (e.key === "F" || e.key === "f")) {
    const ytInput = document.getElementById("yt-video-id-input");
    if (ytInput) {
      ytInput.focus();
      ytInput.select();
    }
    e.preventDefault();
    return;
  }

  // 4. ? or F1: Open Keyboard Shortcuts Cheat Sheet
  if (e.key === "?" || (e.shiftKey && e.key === "/") || e.key === "F1") {
    window.dispatchEvent(new CustomEvent("open-shortcuts-modal"));
    e.preventDefault();
    return;
  }

  // 4. Alt + C (or Alt + ฉ): Toggle Live Chat Panel (Show / Hide)
  if ((e.altKey && (e.key === "c" || e.key === "C" || e.key === "ฉ")) || (e.shiftKey && !e.ctrlKey && (e.key === "C" || e.key === "c"))) {
    systemStore.toggleChatCollapse();
    e.preventDefault();
    return;
  }
}

// ✅ Register Cleanup at top level (Vue 3 safe)
onUnmounted(() => {
  logger.info("♻️ Cleaning up App.vue listeners...");
  window.removeEventListener("keydown", handleGlobalHotkeys);
  if (voiceListenerUnsub) {
    voiceListenerUnsub();
    voiceListenerUnsub = null;
  }
  stopAuthWatchOnUnmount?.();
  stopAppListeners();
  if (typeof Swal !== "undefined" && Swal.isVisible()) {
    Swal.close();
  }
});

// ✅ Watcher: เมื่อผู้ใช้ Logout ให้ล้าง presence, modals, audio queue, และสถานะการเชื่อมต่อทันที
watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (!isAuth) {
      logger.info("🚪 User logged out: Cleaning up presence, modals, audio, and live state...");
      // 1. ปลด Presence ออกจาก Firebase
      try {
        const myConnectionRef = dbRef(db, `presence/${systemStore.myDeviceId}`);
        set(myConnectionRef, { online: false, lastSeen: Date.now() }).catch(() => {});
      } catch (e) {}

      // 2. ปิด Modal ทั้งหมด และปิด SweetAlert2 ทันที
      showDashboard.value = false;
      showHistory.value = false;
      showShippingManager.value = false;
      showPhoneticManager.value = false;
      if (typeof Swal !== "undefined" && Swal.isVisible()) {
        Swal.close();
      }

      // 3. รีเซ็ตเสียงพูดที่ค้างอยู่
      try {
        const { resetVoice } = useAudio();
        resetVoice();
      } catch (e) {}

      // 4. รีเซ็ตสถานะ YouTube Live
      systemStore.isConnected = false;
      systemStore.statusApi = "idle";
      systemStore.statusChat = "idle";
    }
  }
);

// Reconcile only changed owners, with booking items grouped in one stock pass.
useDeliveryReconciliation({
  stock: () => stockStore.stockData,
  customers: () => customerStore.deliveryCustomersRaw,
  videoId: () => systemStore.currentVideoId,
  authorized: () => authStore.isAuthenticated,
  sync: syncDeliveryCustomerForOwner,
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

<template>
  <div class="app-container">
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
            <PhoneticManager v-if="showPhoneticManager" @close="showPhoneticManager = false" />
            <ManowPricePreview v-if="showManowPricePreview" @close="showManowPricePreview = false" />
          </div>
          <NoteBanner />
        </div>
        <ChatPanel />
      </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, provide, watch } from "vue";
import { useSystemStore } from "./stores/system";
import { useStockStore } from "./stores/stock";
import { useChatStore } from "./stores/chat";
import { useNicknameStore } from "./stores/nickname";
import { ref as dbRef, onValue, onDisconnect, set, runTransaction } from "firebase/database";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "./composables/useFirebase";
import { logger } from "./utils/logger"; // ✅ Import Logger
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
import UpdatePrompt from "./components/UpdatePrompt.vue"; // ✅ Import PWA Update Prompt
import NoteBanner from "./components/NoteBanner.vue"; // ✅ Import Note Banner
import PhoneticManager from "./components/PhoneticManager.vue"; // ✅ Import Phonetic Manager
import ManowPricePreview from "./components/ManowPricePreview.vue";

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
const showManowPricePreview = ref(false);

// Provide functions for child components
provide("openDashboard", () => (showDashboard.value = true));
provide("openHistory", () => (showHistory.value = true));
provide("openShippingManager", () => (showShippingManager.value = true));
provide("openPhoneticManager", () => (showPhoneticManager.value = true));
provide("openManowPricePreview", () => (showManowPricePreview.value = true));

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

  const cleanupFns = [];

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

  // ✅ Register Cleanup
  onUnmounted(() => {
    console.log("♻️ Cleaning up App.vue listeners...");
    cleanupFns.forEach((fn) => fn && fn());
  });
});

// ✅ Centralized Delivery Customer Sync Watcher (Debounced for performance)
let lastSessionCounts = {};
let _deliverySyncVersion = 0;
watch(
  [() => stockStore.stockData, () => systemStore.currentVideoId],
  async () => {
    const myVersion = ++_deliverySyncVersion;

    // ✅ Debounce: wait 1s after last change to batch rapid stock updates
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // ✅ Skip if superseded by a newer invocation
    if (myVersion !== _deliverySyncVersion) return;

    // ✅ Read latest values after debounce
    const newStockData = stockStore.stockData;
    const videoId = systemStore.currentVideoId;

    if (!videoId || videoId === "demo") {
      lastSessionCounts = {};
      return;
    }

    // 1. Calculate today's session counts per uid
    const currentSessionCounts = {};
    Object.keys(newStockData || {}).forEach((num) => {
      const item = newStockData[num];
      if (item?.uid) {
        if (!currentSessionCounts[item.uid]) {
          currentSessionCounts[item.uid] = { count: 0, totalPrice: 0 };
        }
        currentSessionCounts[item.uid].count++;
        currentSessionCounts[item.uid].totalPrice += item.price ? parseInt(item.price) : 0;
      }
    });

    // 2. Identify whose counts/prices changed
    const allUids = new Set([
      ...Object.keys(currentSessionCounts),
      ...Object.keys(lastSessionCounts),
    ]);

    const changedUids = [];
    allUids.forEach((uid) => {
      const prev = lastSessionCounts[uid] || { count: 0, totalPrice: 0 };
      const curr = currentSessionCounts[uid] || { count: 0, totalPrice: 0 };
      if (prev.count !== curr.count || prev.totalPrice !== curr.totalPrice) {
        changedUids.push(uid);
      }
    });

    // Cache current counts immediately to avoid concurrent runs re-processing
    lastSessionCounts = currentSessionCounts;

    if (changedUids.length === 0) return;

    // 3. Atomically update changed customers via transactions
    for (const uid of changedUids) {
      const newSession = currentSessionCounts[uid] || { count: 0, totalPrice: 0 };
      const customerRef = dbRef(db, `delivery_customers/${uid}`);

      runTransaction(customerRef, (currentVal) => {
        if (!currentVal) return currentVal; // Only sync customers already in delivery_customers

        if (!currentVal.sessions) currentVal.sessions = {};

        const prevSession = currentVal.sessions[videoId] || { count: 0, totalPrice: 0, status: "pending" };
        const prevCount = prevSession.count || 0;
        const prevStatus = prevSession.status || "pending";

        // Revert status to pending if the customer has booked a NEW item in this session (new count is greater than prev)
        const isNewOrder = (prevStatus === "done" && newSession.count > prevCount) ||
                           (prevStatus !== "done" && newSession.count > prevCount);

        if (newSession.count === 0) {
          delete currentVal.sessions[videoId];
        } else {
          currentVal.sessions[videoId] = {
            count: newSession.count,
            totalPrice: newSession.totalPrice,
            status: isNewOrder ? "pending" : prevStatus
          };
        }

        // Revert status to pending if they placed a new order (Disabled to prevent booking customers from showing up in shipping list)
        // if (isNewOrder) {
        //   currentVal.status = "pending";
        // }

        // Recalculate totals (excluding sessions that are already marked done)
        const allSessions = currentVal.sessions || {};
        currentVal.itemCount = Object.values(allSessions)
          .filter(s => s.status !== "done")
          .reduce((sum, s) => sum + (s.count || 0), 0);
        currentVal.totalPrice = Object.values(allSessions)
          .filter(s => s.status !== "done")
          .reduce((sum, s) => sum + (s.totalPrice || 0), 0);
        currentVal.updatedAt = Date.now();

        return currentVal;
      }).catch((err) => console.error(`Error updating delivery customer ${uid} via transaction:`, err));
    }
  },
  { deep: true }
);
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

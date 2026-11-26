import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ref as dbRef, onValue, get, update, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import pkg from "../../package.json";
import { logger } from "../utils/logger";
import { isGoogleCloudTtsEnabled } from "../utils/ttsConfig";
import {
  getCurrentTtsQuotaMonth,
  getVoiceQuotaTier,
  normalizeUsageCounts,
  getTierStatus,
} from "../utils/ttsQuota";

export const useSystemStore = defineStore("system", () => {
  // State
  const isConnected = ref(false);
  const currentVideoId = ref("");
  const viewerCount = ref(0);
  const subscriberCount = ref(0); // ✅ ยอดผู้ติดตามช่อง YouTube
  const liveTitle = ref("รอกระแสข้อมูล...");
  const isLiveFinished = ref(false);
  const isAway = ref(false); // สถานะโหมดพาลูกนอน
  const isSoundOn = ref(true); // ✅ เปิด/ปิดเสียง
  const isHost = ref(false); // ✅ สถานะเครื่องแม่ข่าย (Host)
  const activePriceDetectorId = ref(""); // ✅ เครื่องที่ตรวจจับราคาปัจจุบัน
  const isPriceDetector = ref(false); // ✅ เครื่องเราจับราคาอยู่หรือไม่

  const googleCloudTtsEnabled = isGoogleCloudTtsEnabled();
  // Free builds neither load Cloud keys nor allow saved preferences to enable them.
  const googleApiKey = ref(googleCloudTtsEnabled ? (import.meta.env.VITE_GOOGLE_API_KEYS || "") : "");

  // Free builds use native speech; approved Cloud builds default to Chirp 3: HD Achernar once.
  const savedMode = localStorage.getItem("manowzab_tts_voice_mode");
  const validModes = googleCloudTtsEnabled ? ["achernar", "chirp3", "standard", "native"] : ["native"];
  const cloudPolicy = "cloud-achernar-2026-11-16";
  const restoreCloud = googleCloudTtsEnabled && localStorage.getItem("manowzab_tts_cloud_policy") !== cloudPolicy;
  const defaultMode = googleCloudTtsEnabled ? "achernar" : "native";
  const ttsVoiceMode = ref(restoreCloud ? "achernar" : validModes.includes(savedMode) ? savedMode : defaultMode);
  if (restoreCloud) localStorage.setItem("manowzab_tts_cloud_policy", cloudPolicy);
  if (savedMode !== ttsVoiceMode.value) {
    localStorage.setItem("manowzab_tts_voice_mode", ttsVoiceMode.value);
  }

  const useOnlineTts = computed({
    get: () => googleCloudTtsEnabled && ttsVoiceMode.value !== "native",
    set: (val) => {
      ttsVoiceMode.value = val && googleCloudTtsEnabled
        ? (ttsVoiceMode.value !== "native" ? ttsVoiceMode.value : "achernar")
        : "native";
      localStorage.setItem("manowzab_tts_voice_mode", ttsVoiceMode.value);
      try { localStorage.removeItem("manowzab_tts_auto_switched_from"); } catch { /* ignore */ }
    },
  });
  const CLOUD_VOICE_MAP = {
    achernar: "th-TH-Chirp3-HD-Achernar",
    chirp3: "th-TH-Chirp3-HD-Aoede",
    standard: "th-TH-Standard-A",
  };
  const googleVoiceName = computed(() => {
    return CLOUD_VOICE_MAP[ttsVoiceMode.value] || "th-TH-Chirp3-HD-Achernar";
  });

  function cycleTtsMode() {
    if (!googleCloudTtsEnabled) {
      ttsVoiceMode.value = "native";
    } else {
      const idx = validModes.indexOf(ttsVoiceMode.value);
      ttsVoiceMode.value = validModes[(idx + 1) % validModes.length];
    }
    localStorage.setItem("manowzab_tts_voice_mode", ttsVoiceMode.value);
    try { localStorage.removeItem("manowzab_tts_auto_switched_from"); } catch { /* ignore */ }
    return ttsVoiceMode.value;
  }

  const activeKeyIndex = ref(1); // ✅ Track which Google Cloud API key is currently active
  const shippingCycle = ref("today"); // ✅ รอบจัดส่งเริ่มต้น ('today' | 'tomorrow' | 'พฤหัส' etc. | 'YYYY-MM-DD')

  // ✅ Live Chat Panel Collapsible State (Saved to localStorage)
  const isChatCollapsed = ref(localStorage.getItem("manowzab_chat_collapsed") === "true");

  function toggleChatCollapse() {
    isChatCollapsed.value = !isChatCollapsed.value;
    localStorage.setItem("manowzab_chat_collapsed", isChatCollapsed.value ? "true" : "false");
    logger.log(`💬 Chat panel ${isChatCollapsed.value ? "collapsed" : "expanded"}`);
    return isChatCollapsed.value;
  }

  function setChatCollapsed(val) {
    isChatCollapsed.value = Boolean(val);
    localStorage.setItem("manowzab_chat_collapsed", isChatCollapsed.value ? "true" : "false");
  }

  // Status Indicators (ok, warn, err, working)
  const statusDb = ref("err");
  const statusApi = ref("ok");
  const statusChat = ref("ok");


  // API Key Management
  const currentKeyIndex = ref(0);

  // Device Identity
  const myDeviceId = ref(
    localStorage.getItem("device_id") || `device-${Date.now()}`,
  );
  if (!localStorage.getItem("device_id")) {
    localStorage.setItem("device_id", myDeviceId.value);
  }

  const version = ref("v" + pkg.version);

  // Actions
  function setStatus(type, status) {
    if (type === "db") statusDb.value = status;
    if (type === "api") statusApi.value = status;
    if (type === "chat") statusChat.value = status;

  }

  // ✅ Host Listener (Take Over Logic)
  function initHostListener() {
    const hostRef = dbRef(db, "system/hostId");
    return onValue(hostRef, (snapshot) => {
      const currentHostId = snapshot.val();

      // ถ้ามีคนอื่นยึด Host ไปแล้ว -> เราต้องหลุด
      if (currentHostId && currentHostId !== myDeviceId.value && isHost.value) {
        isHost.value = false;
        // แจ้งเตือน (Optional)
        logger.warn("Host role taken by another device:", currentHostId);
      }

      // ถ้าเราเป็น Host อยู่แล้ว และค่าใน DB ตรงกัน -> ก็ OK (Keep Alive)
      // ถ้าเราเพิ่งกดปุ่ม -> Logic ใน Header จะจัดการ set isHost = true เอง
    });
  }

  // ✅ Price Detector Listener (Take Over Logic)
  function initPriceDetectorListener() {
    const detectorRef = dbRef(db, "system/activePriceDetectorId");
    return onValue(detectorRef, (snapshot) => {
      const activeId = snapshot.val();
      activePriceDetectorId.value = activeId || "";

      // ถ้ามีเครื่องอื่นแย่งสิทธิ์จับราคาไปแล้ว -> เครื่องเราต้องปิด
      if (activeId && activeId !== myDeviceId.value && isPriceDetector.value) {
        isPriceDetector.value = false;
        logger.warn("Price detector role taken by another device:", activeId);
      }
    });
  }

  // ✅ Take over or release price detector role (atomic)
  async function setPriceDetectorState(enabled) {
    isPriceDetector.value = enabled;
    const detectorRef = dbRef(db, "system/activePriceDetectorId");
    if (enabled) {
      await update(dbRef(db), { "system/activePriceDetectorId": myDeviceId.value });
    } else {
      // ✅ Use runTransaction to atomically check-and-clear
      await runTransaction(detectorRef, (currentValue) => {
        if (currentValue === myDeviceId.value) {
          return ""; // Clear only if we own it
        }
        return; // Abort — someone else took over
      });
    }
  }

  // ✅ Auto distribute TTS Keys across machines to balance quota
  async function assignOptimalTtsKey() {
    if (!googleCloudTtsEnabled) return;
    try {
      const keysCount = googleApiKey.value.split(",").filter(k => k.trim()).length;
      if (keysCount <= 1) return; // Nothing to distribute

      const presenceRef = dbRef(db, "presence");
      const snapshot = await get(presenceRef);
      if (!snapshot.exists()) return;

      const presenceData = snapshot.val();
      const keyUsage = {};
      for (let i = 1; i <= keysCount; i++) keyUsage[i] = 0;

      // Count key usage from OTHER online devices
      Object.entries(presenceData).forEach(([deviceId, device]) => {
        if (device.online && device.ttsKey && deviceId !== myDeviceId.value) {
           if (keyUsage[device.ttsKey] !== undefined) {
              keyUsage[device.ttsKey]++;
           }
        }
      });

      // Find the key with minimum usage
      let minUsage = Infinity;
      let selectedKey = activeKeyIndex.value;
      for (let i = 1; i <= keysCount; i++) {
         if (keyUsage[i] < minUsage) {
            minUsage = keyUsage[i];
            selectedKey = i;
         }
      }

      activeKeyIndex.value = selectedKey;
      logger.tts(`Optimal TTS Key Assigned: Key #${selectedKey} (Usage: ${JSON.stringify(keyUsage)})`);
      updatePresenceTtsKey(); // ✅ Always sync key to Firebase presence (fixes initial boot)
    } catch(e) {
      logger.warn("Failed to assign optimal TTS key", e);
    }
  }

  // ✅ Sync current TTS Key so other devices can see our usage
  function updatePresenceTtsKey() {
      if (!googleCloudTtsEnabled) return;
      const myConnectionRef = dbRef(db, `presence/${myDeviceId.value}`);
      update(myConnectionRef, { ttsKey: activeKeyIndex.value }).catch(()=> {});
  }

  // ✅ Shipping Cycle Listener (Real-Time Sync)
  function initShippingCycleListener() {
    const cycleRef = dbRef(db, "settings/shippingCycle");
    return onValue(cycleRef, (snapshot) => {
      const val = snapshot.val();
      shippingCycle.value = val || "today";
      logger.log(`🚚 Shipping Cycle updated: ${shippingCycle.value}`);
    });
  }

  // ✅ Set and Sync Shipping Cycle to Firebase
  async function setShippingCycle(cycle) {
    const val = cycle || "today";
    shippingCycle.value = val;
    await update(dbRef(db), { "settings/shippingCycle": val });
    logger.success(`🚚 Shipping Cycle saved to Firebase: ${val}`);
  }

  // ✅ Monthly TTS Character Quota Counter & Auto-Switch (Cloud-enabled builds only)
  const TTS_USAGE_STORAGE_KEY = "manowzab_tts_usage";
  const TTS_AUTO_SWITCH_KEY = "manowzab_tts_auto_switch";
  const TTS_AUTO_SWITCHED_FROM_KEY = "manowzab_tts_auto_switched_from";

  function loadStoredTtsUsage() {
    if (!googleCloudTtsEnabled) return normalizeUsageCounts(null);
    try {
      const raw = localStorage.getItem(TTS_USAGE_STORAGE_KEY);
      return normalizeUsageCounts(raw ? JSON.parse(raw) : null);
    } catch {
      return normalizeUsageCounts(null);
    }
  }

  function saveStoredTtsUsage(usage) {
    if (!googleCloudTtsEnabled) return;
    try {
      localStorage.setItem(TTS_USAGE_STORAGE_KEY, JSON.stringify(usage));
    } catch {
      /* ignore storage quota errors */
    }
  }

  const ttsUsage = ref(loadStoredTtsUsage());
  const ttsAutoSwitchEnabled = ref(
    googleCloudTtsEnabled ? localStorage.getItem(TTS_AUTO_SWITCH_KEY) !== "false" : false
  );
  const ttsAutoSwitchEvent = ref(null);
  const pendingUsageDelta = { month: getCurrentTtsQuotaMonth(), chirp3: 0, standard: 0 };
  let usageFlushTimer = null;
  let activeUsageUnsub = null;
  let activeUsageBoundMonth = null;

  const chirp3QuotaStatus = computed(() => getTierStatus("chirp3", ttsUsage.value.chirp3));
  const standardQuotaStatus = computed(() => getTierStatus("standard", ttsUsage.value.standard));
  const activeQuotaStatus = computed(() => {
    if (!googleCloudTtsEnabled || ttsVoiceMode.value === "native") return null;
    return ttsVoiceMode.value === "standard" ? standardQuotaStatus.value : chirp3QuotaStatus.value;
  });

  function bindUsageMonthListener(month) {
    if (activeUsageUnsub) {
      activeUsageUnsub();
      activeUsageUnsub = null;
    }
    activeUsageBoundMonth = month;
    const usageRef = dbRef(db, `settings/ttsUsage/${month}`);
    activeUsageUnsub = onValue(usageRef, (snapshot) => {
      const remote = normalizeUsageCounts(snapshot.val(), month);
      const pendingC = pendingUsageDelta.month === month ? pendingUsageDelta.chirp3 : 0;
      const pendingS = pendingUsageDelta.month === month ? pendingUsageDelta.standard : 0;
      const merged = {
        month,
        chirp3: Math.max(remote.chirp3 + pendingC, ttsUsage.value.month === month ? ttsUsage.value.chirp3 : 0),
        standard: Math.max(remote.standard + pendingS, ttsUsage.value.month === month ? ttsUsage.value.standard : 0),
        updatedAt: Math.max(remote.updatedAt, ttsUsage.value.updatedAt || 0),
      };
      // Honor explicit reset/calibration when remote timestamp is newer than local
      if (snapshot.exists() && remote.updatedAt >= (ttsUsage.value.updatedAt || 0) && pendingC === 0 && pendingS === 0) {
        merged.chirp3 = remote.chirp3;
        merged.standard = remote.standard;
      }
      ttsUsage.value = merged;
      saveStoredTtsUsage(merged);
      evaluateTtsQuotaAutoSwitch();
    });
  }

  function ensureCurrentQuotaMonth(date = new Date()) {
    if (!googleCloudTtsEnabled) return false;
    const currentMonth = getCurrentTtsQuotaMonth(date);
    if (ttsUsage.value.month === currentMonth) {
      if (activeUsageUnsub && activeUsageBoundMonth !== currentMonth) {
        bindUsageMonthListener(currentMonth);
      }
      return false;
    }

    const prevMonth = ttsUsage.value.month;
    ttsUsage.value = normalizeUsageCounts(null, currentMonth);
    saveStoredTtsUsage(ttsUsage.value);
    pendingUsageDelta.month = currentMonth;
    pendingUsageDelta.chirp3 = 0;
    pendingUsageDelta.standard = 0;
    if (usageFlushTimer) {
      clearTimeout(usageFlushTimer);
      usageFlushTimer = null;
    }

    // Restore original voice mode automatically if last month auto-switched due to quota
    try {
      const switchedFrom = localStorage.getItem(TTS_AUTO_SWITCHED_FROM_KEY);
      if (switchedFrom && validModes.includes(switchedFrom) && switchedFrom !== "native") {
        const fromMode = ttsVoiceMode.value;
        ttsVoiceMode.value = switchedFrom;
        localStorage.setItem("manowzab_tts_voice_mode", switchedFrom);
        localStorage.removeItem(TTS_AUTO_SWITCHED_FROM_KEY);
        if (fromMode !== switchedFrom) {
          ttsAutoSwitchEvent.value = {
            fromMode,
            toMode: switchedFrom,
            reason: "monthly_quota_reset",
            timestamp: Date.now(),
          };
        }
      }
    } catch {
      /* ignore */
    }

    if (activeUsageUnsub) {
      bindUsageMonthListener(currentMonth);
    }
    logger.log(`🗓️ TTS Quota Month rolled over: ${prevMonth} -> ${currentMonth} (00:00 PT)`);
    return true;
  }

  function evaluateTtsQuotaAutoSwitch() {
    if (!googleCloudTtsEnabled || !ttsAutoSwitchEnabled.value) return null;
    const current = ttsVoiceMode.value;
    let nextMode = null;
    let reason = "";

    if ((current === "achernar" || current === "chirp3") && chirp3QuotaStatus.value.isNearLimit) {
      if (!standardQuotaStatus.value.isNearLimit) {
        nextMode = "standard";
        reason = "chirp3_near_limit";
      } else {
        nextMode = "native";
        reason = "all_cloud_near_limit";
      }
    } else if (current === "standard" && standardQuotaStatus.value.isNearLimit) {
      nextMode = "native";
      reason = "standard_near_limit";
    }

    if (nextMode && nextMode !== current) {
      try {
        if (!localStorage.getItem(TTS_AUTO_SWITCHED_FROM_KEY)) {
          localStorage.setItem(TTS_AUTO_SWITCHED_FROM_KEY, current);
        }
        localStorage.setItem("manowzab_tts_voice_mode", nextMode);
      } catch {
        /* ignore */
      }
      ttsVoiceMode.value = nextMode;
      const evt = { fromMode: current, toMode: nextMode, reason, timestamp: Date.now() };
      ttsAutoSwitchEvent.value = evt;
      logger.warn(`⚠️ TTS Auto-Switch: ${current} -> ${nextMode} (${reason})`);
      return evt;
    }
    return null;
  }

  async function flushTtsUsage() {
    if (!googleCloudTtsEnabled) return;
    if (usageFlushTimer) {
      clearTimeout(usageFlushTimer);
      usageFlushTimer = null;
    }
    const deltaChirp3 = pendingUsageDelta.chirp3;
    const deltaStandard = pendingUsageDelta.standard;
    const month = pendingUsageDelta.month;
    if (deltaChirp3 <= 0 && deltaStandard <= 0) return;

    pendingUsageDelta.chirp3 = 0;
    pendingUsageDelta.standard = 0;
    try {
      await runTransaction(dbRef(db, `settings/ttsUsage/${month}`), (current) => {
        const base = normalizeUsageCounts(current, month);
        return {
          month,
          chirp3: base.chirp3 + deltaChirp3,
          standard: base.standard + deltaStandard,
          updatedAt: Date.now(),
        };
      });
    } catch (e) {
      // Restore delta if offline/failed so it will retry on next flush
      if (pendingUsageDelta.month === month) {
        pendingUsageDelta.chirp3 += deltaChirp3;
        pendingUsageDelta.standard += deltaStandard;
      }
      logger.warn("Failed to sync TTS usage to Firebase:", e);
    }
  }

  function recordTtsUsage(voiceName, chars) {
    if (!googleCloudTtsEnabled) return;
    const count = Math.max(0, Number(chars) || 0);
    if (count === 0) return;

    ensureCurrentQuotaMonth();
    const currentMonth = getCurrentTtsQuotaMonth();
    const tier = getVoiceQuotaTier(voiceName);
    const current = normalizeUsageCounts(ttsUsage.value, currentMonth);
    current[tier] += count;
    current.updatedAt = Date.now();
    ttsUsage.value = current;
    saveStoredTtsUsage(current);

    if (pendingUsageDelta.month !== currentMonth) {
      pendingUsageDelta.month = currentMonth;
      pendingUsageDelta.chirp3 = 0;
      pendingUsageDelta.standard = 0;
    }
    pendingUsageDelta[tier] += count;

    evaluateTtsQuotaAutoSwitch();

    if (!usageFlushTimer) {
      usageFlushTimer = setTimeout(() => {
        flushTtsUsage();
      }, 5000);
    }
  }

  let activeRolloverTimer = null;

  function initTtsUsageListener() {
    if (!googleCloudTtsEnabled) return null;
    ensureCurrentQuotaMonth();
    const currentMonth = getCurrentTtsQuotaMonth();
    bindUsageMonthListener(currentMonth);
    if (activeRolloverTimer) {
      clearInterval(activeRolloverTimer);
    }
    const timer = setInterval(() => {
      ensureCurrentQuotaMonth();
    }, 60000);
    activeRolloverTimer = timer;
    return () => {
      clearInterval(timer);
      if (activeRolloverTimer === timer) {
        activeRolloverTimer = null;
      }
      if (usageFlushTimer) {
        clearTimeout(usageFlushTimer);
        usageFlushTimer = null;
      }
      if (activeUsageUnsub) {
        activeUsageUnsub();
        activeUsageUnsub = null;
      }
      activeUsageBoundMonth = null;
    };
  }

  async function setTtsUsageCalibration({ chirp3, standard }) {
    if (!googleCloudTtsEnabled) return;
    const currentMonth = getCurrentTtsQuotaMonth();
    pendingUsageDelta.month = currentMonth;
    pendingUsageDelta.chirp3 = 0;
    pendingUsageDelta.standard = 0;
    if (usageFlushTimer) {
      clearTimeout(usageFlushTimer);
      usageFlushTimer = null;
    }
    const next = {
      month: currentMonth,
      chirp3: Math.max(0, Math.round(Number(chirp3) || 0)),
      standard: Math.max(0, Math.round(Number(standard) || 0)),
      updatedAt: Date.now(),
    };
    ttsUsage.value = next;
    saveStoredTtsUsage(next);
    evaluateTtsQuotaAutoSwitch();
    try {
      await update(dbRef(db), { [`settings/ttsUsage/${currentMonth}`]: next });
    } catch (e) {
      logger.warn("Failed to save TTS usage calibration:", e);
    }
  }

  async function resetTtsUsageMonth() {
    await setTtsUsageCalibration({ chirp3: 0, standard: 0 });
  }

  function setTtsAutoSwitchEnabled(enabled) {
    ttsAutoSwitchEnabled.value = Boolean(enabled) && googleCloudTtsEnabled;
    try {
      localStorage.setItem(TTS_AUTO_SWITCH_KEY, ttsAutoSwitchEnabled.value ? "true" : "false");
    } catch {
      /* ignore */
    }
    if (ttsAutoSwitchEnabled.value) {
      evaluateTtsQuotaAutoSwitch();
    }
  }

  return {
    isConnected,
    currentVideoId,
    viewerCount,
    subscriberCount, // ✅ Export
    liveTitle,
    isLiveFinished,
    isAway,
    isSoundOn, // ✅ Export
    isHost, // ✅ Export
    activePriceDetectorId, // ✅ Export
    isPriceDetector, // ✅ Export
    statusDb,
    statusApi,
    statusChat,

    currentKeyIndex,
    myDeviceId,
    version,
    setStatus,
    initHostListener, // ✅ Export
    initPriceDetectorListener, // ✅ Export
    setPriceDetectorState, // ✅ Export
    assignOptimalTtsKey, // ✅ Export
    updatePresenceTtsKey, // ✅ Export
    googleApiKey, // ✅ Export (only in Cloud-enabled builds)
    googleCloudTtsEnabled,
    useOnlineTts, // ✅ Export
    ttsVoiceMode, // ✅ Export
    googleVoiceName, // ✅ Export
    cycleTtsMode, // ✅ Export
    activeKeyIndex, // ✅ Export
    ttsUsage,
    ttsAutoSwitchEnabled,
    ttsAutoSwitchEvent,
    chirp3QuotaStatus,
    standardQuotaStatus,
    activeQuotaStatus,
    recordTtsUsage,
    flushTtsUsage,
    initTtsUsageListener,
    setTtsUsageCalibration,
    resetTtsUsageMonth,
    setTtsAutoSwitchEnabled,
    evaluateTtsQuotaAutoSwitch,
    ensureCurrentQuotaMonth,
    shippingCycle, // ✅ Export
    initShippingCycleListener, // ✅ Export
    setShippingCycle, // ✅ Export
    isChatCollapsed, // ✅ Export
    toggleChatCollapse, // ✅ Export
    setChatCollapsed, // ✅ Export
  };
});


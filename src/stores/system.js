import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ref as dbRef, onValue, get, update, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import pkg from "../../package.json";
import { logger } from "../utils/logger";

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

  // ✅ Google Cloud TTS API Key - Load from .env
  const googleApiKey = ref(import.meta.env.VITE_GOOGLE_API_KEYS || "");

  // ✅ TTS Voice Mode: 'neural2' | 'standard' | 'native'
  const ttsVoiceMode = ref(localStorage.getItem("manowzab_tts_voice_mode") || "neural2");
  const useOnlineTts = computed({
    get: () => ttsVoiceMode.value !== "native",
    set: (val) => {
      if (!val) {
        ttsVoiceMode.value = "native";
      } else if (ttsVoiceMode.value === "native") {
        ttsVoiceMode.value = "neural2";
      }
      localStorage.setItem("manowzab_tts_voice_mode", ttsVoiceMode.value);
    },
  });
  const googleVoiceName = computed(() => {
    return ttsVoiceMode.value === "standard" ? "th-TH-Standard-A" : "th-TH-Neural2-C";
  });

  function cycleTtsMode() {
    if (ttsVoiceMode.value === "neural2") {
      ttsVoiceMode.value = "standard";
    } else if (ttsVoiceMode.value === "standard") {
      ttsVoiceMode.value = "native";
    } else {
      ttsVoiceMode.value = "neural2";
    }
    localStorage.setItem("manowzab_tts_voice_mode", ttsVoiceMode.value);
    return ttsVoiceMode.value;
  }

  const activeKeyIndex = ref(1); // ✅ Track which API key is currently active
  const shippingCycle = ref("today"); // ✅ รอบจัดส่งเริ่มต้น ('today' | 'tomorrow' | 'พฤหัส' etc. | 'YYYY-MM-DD')

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
    googleApiKey, // ✅ Export (from .env)
    useOnlineTts, // ✅ Export
    ttsVoiceMode, // ✅ Export
    googleVoiceName, // ✅ Export
    cycleTtsMode, // ✅ Export
    activeKeyIndex, // ✅ Export
    shippingCycle, // ✅ Export
    initShippingCycleListener, // ✅ Export
    setShippingCycle, // ✅ Export
  };
});


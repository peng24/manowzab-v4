import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import pkg from "../../package.json";

export const useSystemStore = defineStore("system", () => {
  // State
  const isConnected = ref(false);
  const currentVideoId = ref("");
  const viewerCount = ref(0);
  const liveTitle = ref("รอกระแสข้อมูล...");
  const isAiCommander = ref(false);
  const isAway = ref(false); // สถานะโหมดพาลูกนอน
  const isSoundOn = ref(true); // ✅ เปิด/ปิดเสียง
  const isHost = ref(false); // ✅ สถานะเครื่องแม่ข่าย (Host)
  const isAiEnabled = ref(true); // ✅ เปิด/ปิด AI Assist สำหรับ Voice Detection

  // ✅ Google Cloud TTS API Key - Load from .env only
  const googleApiKey = ref("AIzaSyBRHQqNNn8lKXic7KILkHkZRnNQ8oBFqnw,AIzaSyDulTIwtePtm9J9RNSfOuoIGaSOWOZRT3w");

  const useOnlineTts = ref(true); // ✅ เปิด/ปิด Online TTS (Google Cloud) - Default ON
  const activeKeyIndex = ref(1); // ✅ Track which API key is currently active

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

  function toggleAi() {
    isAiEnabled.value = !isAiEnabled.value;
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
        console.log("⚠️ Host role taken by another device:", currentHostId);
      }

      // ถ้าเราเป็น Host อยู่แล้ว และค่าใน DB ตรงกัน -> ก็ OK (Keep Alive)
      // ถ้าเราเพิ่งกดปุ่ม -> Logic ใน Header จะจัดการ set isHost = true เอง
    });
  }

  return {
    isConnected,
    currentVideoId,
    viewerCount,
    liveTitle,
    isAiCommander,
    isAway,
    isSoundOn, // ✅ Export
    isHost, // ✅ Export
    isAiEnabled, // ✅ Export
    statusDb,
    statusApi,
    statusChat,

    currentKeyIndex,
    myDeviceId,
    version,
    setStatus,
    toggleAi,
    initHostListener, // ✅ Export
    googleApiKey, // ✅ Export (from .env)
    useOnlineTts, // ✅ Export
    activeKeyIndex, // ✅ Export
  };
});

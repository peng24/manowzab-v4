import { defineStore } from "pinia";
import { ref } from "vue";

export const useSystemStore = defineStore("system", () => {
  // State
  const isConnected = ref(false);
  const currentVideoId = ref("");
  const viewerCount = ref(0);
  const liveTitle = ref("รอกระแสข้อมูล...");
  const isAiCommander = ref(false);
  const isAway = ref(false); // สถานะโหมดพาลูกนอน

  // Status Indicators (ok, warn, err)
  const statusDb = ref("err");
  const statusApi = ref("ok");
  const statusChat = ref("ok");

  // API Key Management
  const currentKeyIndex = ref(0);

  // Device Identity
  const myDeviceId = ref(
    localStorage.getItem("device_id") || `device-${Date.now()}`
  );
  if (!localStorage.getItem("device_id")) {
    localStorage.setItem("device_id", myDeviceId.value);
  }

  // ✅ Version (อัปเดตเป็น v4.1.0 ตามแผน)
  const version = ref("v4.1.0");

  // Actions
  function setStatus(type, status) {
    if (type === "db") statusDb.value = status;
    if (type === "api") statusApi.value = status;
    if (type === "chat") statusChat.value = status;
  }

  return {
    isConnected,
    currentVideoId,
    viewerCount,
    liveTitle,
    isAiCommander,
    isAway,
    statusDb,
    statusApi,
    statusChat,
    currentKeyIndex,
    myDeviceId,
    version,
    setStatus,
  };
});

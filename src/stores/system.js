import { defineStore } from "pinia";
import { ref } from "vue";

export const useSystemStore = defineStore("system", () => {
  const version = ref("v4.0.0");
  const isConnected = ref(false);
  const currentVideoId = ref("demo");
  const liveTitle = ref("Offline Mode");
  const viewerCount = ref(0);
  const statusDb = ref("ok");
  const statusApi = ref("ok");
  const statusChat = ref("ok");
  const currentKeyIndex = ref(0);
  const isSoundOn = ref(true);
  const isAiCommander = ref(false);
  const isAway = ref(false);
  const myDeviceId = ref("dev-" + Math.random().toString(36).substr(2, 9));

  return {
    version,
    isConnected,
    currentVideoId,
    liveTitle,
    viewerCount,
    statusDb,
    statusApi,
    statusChat,
    currentKeyIndex,
    isSoundOn,
    isAiCommander,
    isAway,
    myDeviceId,
  };
});

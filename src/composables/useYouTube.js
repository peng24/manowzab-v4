import { ref, onUnmounted } from "vue";
import { useSystemStore } from "../stores/system";
import { ref as dbRef, set } from "firebase/database";
import { db } from "./useFirebase";
import { YouTubeLiveChat } from "../services/YouTubeLiveChat";
import { useAudio } from "./useAudio";
import { CONSTANTS } from "../config/constants";

const rawKeys = "AIzaSyAVzYQN51V-kITnyJWGy8IVSktitxrVD8g,AIzaSyBlnw6tpETYu61XSNqd7zXt25Fv_vmbWJU,AIzaSyAX3dwUqBFeCBjjZixVnlcBz56gAfNWzs0,AIzaSyAxjRAs01mpt-NxQiR3yStr6Q-57EiQq64,AIzaSyDDFimNW1OAMm8sOI0xFdKLv2Gk4SzxlFw,AIzaSyCR9yuYfig6jJIhVoWUZGKzY5hkT3DpJmM";
const API_KEYS = rawKeys
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k);

if (API_KEYS.length === 0) {
  throw new Error("Missing YouTube API Keys");
}

// ✅ Round-Robin: โหลด key index ล่าสุดจาก localStorage แล้วเริ่มจาก key ถัดไป
const STORAGE_KEY = "ytApiKeyIndex";
function getNextKeyIndex() {
  const lastIndex = parseInt(localStorage.getItem(STORAGE_KEY) || "0");
  const nextIndex = (lastIndex + 1) % API_KEYS.length;
  localStorage.setItem(STORAGE_KEY, String(nextIndex));
  console.log(
    `🔑 Round-Robin: เริ่มจาก Key #${nextIndex + 1}/${API_KEYS.length} (ครั้งก่อนใช้ #${lastIndex + 1})`,
  );
  return nextIndex;
}

function saveKeyIndex(index) {
  localStorage.setItem(STORAGE_KEY, String(index));
}

/**
 * Composable for managing YouTube Live connection.
 * Handles API connection, chat polling, viewer counts, and disconnect logic.
 */
export function useYouTube() {
  const systemStore = useSystemStore();
  const { queueAudio } = useAudio();

  const activeChatId = ref("");
  const viewerIntervalId = ref(null);

  // ✅ เริ่มจาก key ถัดจากครั้งก่อน (Round-Robin)
  const initialKeyIndex = getNextKeyIndex();
  const chatService = new YouTubeLiveChat(API_KEYS, initialKeyIndex);
  systemStore.currentKeyIndex = initialKeyIndex;

  // ✅ Sync key index: when chat polling rotates keys, update the store + localStorage
  chatService.onKeyRotate = (newIndex) => {
    systemStore.currentKeyIndex = newIndex;
    saveKeyIndex(newIndex);
  };

  // Link Service Status to Store
  chatService.onStatusChange = (status) => {
    systemStore.statusChat = status;
  };

  let processMessageFunc = null;

  /**
   * Helper to fetch YouTube API with key rotation.
   * @param {string} url - The API URL (without key).
   * @returns {Promise<Object>} JSON response from API.
   * @throws Will throw error if all keys are exhausted.
   */
  async function smartFetch(url, _depth = 0) {
    try {
      systemStore.statusApi = "ok";

      // ✅ Sync store key index → chatService before fetching
      chatService.currentKeyIndex = systemStore.currentKeyIndex;

      let res = await fetch(
        url + "&key=" + API_KEYS[systemStore.currentKeyIndex],
      );
      let data = await res.json();

      if (data.error) {
        console.error("❌ API Error:", data.error.message);
        systemStore.statusApi = "warn";

        // ✅ Rotate Key with wrap-around and depth limit
        if (_depth < API_KEYS.length - 1) {
          systemStore.currentKeyIndex =
            (systemStore.currentKeyIndex + 1) % API_KEYS.length;
          chatService.currentKeyIndex = systemStore.currentKeyIndex;
          saveKeyIndex(systemStore.currentKeyIndex);
          console.warn(
            `🔑 smartFetch: Rotated to key #${systemStore.currentKeyIndex + 1} (attempt ${_depth + 2}/${API_KEYS.length})`,
          );
          return smartFetch(url, _depth + 1);
        } else {
          systemStore.statusApi = "err";
          throw new Error("All API keys exhausted");
        }
      }
      return data;
    } catch (e) {
      systemStore.statusApi = "err";
      throw e;
    }
  }

  /**
   * Connects to a YouTube Video.
   * Fetches metadata, initializes chat polling, and starts viewer tracking.
   *
   * @param {string} videoId - The YouTube Video ID.
   * @returns {Promise<boolean>} True if connection successful, false otherwise.
   */
  async function connectVideo(videoId) {
    try {
      console.log("🔌 Connecting to video:", videoId);
      console.log("🚀 Direct Mode: Fetching YouTube API...");

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);

      if (!data.items || data.items.length === 0) {
        throw new Error("Invalid Video ID");
      }

      const item = data.items[0];
      systemStore.liveTitle = item.snippet.title;
      console.log("✅ Video title:", item.snippet.title);

      // Save History to Firebase
      if (videoId && videoId !== "demo") {
        set(dbRef(db, `history/${videoId}`), {
          title: item.snippet.title,
          timestamp: Date.now(),
        }).catch((error) => console.error("Error saving history:", error));
      }

      // Initialize Chat Store
      const chatStore = await import("../stores/chat").then((m) =>
        m.useChatStore(),
      );
      if (item.liveStreamingDetails?.actualStartTime) {
        chatStore.streamStartTime = new Date(
          item.liveStreamingDetails.actualStartTime,
        ).getTime();
      } else {
        chatStore.streamStartTime = Date.now();
      }

      // Check for Live Chat ID
      if (item.liveStreamingDetails?.activeLiveChatId) {
        activeChatId.value = item.liveStreamingDetails.activeLiveChatId;
        console.log("✅ Live Chat ID:", activeChatId.value);

        // Dynamic parameters for Message Processor
        const { useChatProcessor } = await import("./useChatProcessor");
        const { processMessage } = useChatProcessor();
        processMessageFunc = processMessage;

        // Start Chat Service
        chatService.liveChatId = activeChatId.value;
        chatService.startPolling(videoId, async (msg) => {
          // ✅ DEBUG: Log complete message structure from YouTube API
          console.log(
            "🔍🔍🔍 RAW YouTube API Message:",
            JSON.stringify(msg, null, 2),
          );
          if (processMessageFunc) await processMessageFunc(msg);
        });

        // Start Viewer Count Loop
        updateViewerCount(videoId);
        viewerIntervalId.value = setInterval(
          () => updateViewerCount(videoId),
          CONSTANTS.YOUTUBE.VIEWER_POLL_INTERVAL_MS,
        );

        // Voice Announcement
        queueAudio(
          null,
          "",
          `การเชื่อมต่อสำเร็จ กำลังอ่านแชดสดจาก ${item.snippet.title}`,
        );

        return true;
      } else {
        console.warn("⚠️ No active live chat found");
        return false;
      }
    } catch (e) {
      console.error("❌ Connect video error:", e);
      systemStore.statusApi = "err";
      return false;
    }
  }

  /**
   * Updates Concurrent Viewers and Detects Stream End.
   * @param {string} videoId
   */
  async function updateViewerCount(videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);
      const details = data.items?.[0]?.liveStreamingDetails;

      if (details) {
        if (details.concurrentViewers) {
          systemStore.viewerCount = parseInt(details.concurrentViewers);
        }

        // Check if Stream Ended
        if (details.actualEndTime) {
          console.log("🏁 Stream Finished:", details.actualEndTime);

          if (viewerIntervalId.value) {
            clearInterval(viewerIntervalId.value);
            viewerIntervalId.value = null;

            queueAudio(null, "", "ไลฟ์จบแล้ว");

            const delaySec = CONSTANTS.YOUTUBE.DISCONNECT_DELAY_MS / 1000;
            console.log(`⏳ Disconnecting in ${delaySec} seconds...`);
            setTimeout(() => {
              if (systemStore.isConnected) {
                queueAudio(null, "", "กำลังตัดการเชื่อมต่อครับ");
                disconnect();
              }
            }, CONSTANTS.YOUTUBE.DISCONNECT_DELAY_MS);
          }
        }
      }
    } catch (e) {
      console.error("❌ Viewer Count Error:", e);
    }
  }

  /**
   * Disconnects from YouTube, stops polling, and resets state.
   */
  function disconnect() {
    console.log("🔌 Disconnecting...");
    systemStore.isConnected = false;

    chatService.stopPolling();

    if (viewerIntervalId.value) {
      clearInterval(viewerIntervalId.value);
      viewerIntervalId.value = null;
    }

    activeChatId.value = "";
    processMessageFunc = null;
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    activeChatId,
    connectVideo,
    disconnect,
  };
}

import { ref, onUnmounted } from "vue";
import { useSystemStore } from "../stores/system";
import { ref as dbRef, set } from "firebase/database";
import { db } from "./useFirebase";
import { YouTubeLiveChat } from "../services/YouTubeLiveChat";
import { useAudio } from "./useAudio";
import { CONSTANTS } from "../config/constants";
import { logger } from "../utils/logger";
import { announceShippingCustomers } from "../utils/deliverySync";
import Swal from "sweetalert2";

const rawKeys = import.meta.env.VITE_YOUTUBE_API_KEYS || "";
const API_KEYS = rawKeys
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k);

if (API_KEYS.length === 0) {
  logger.error("Missing VITE_YOUTUBE_API_KEYS in .env — YouTube features disabled");
}

// ✅ Round-Robin: โหลด key index ล่าสุดจาก localStorage แล้วเริ่มจาก key ถัดไป
const STORAGE_KEY = "ytApiKeyIndex";
function getNextKeyIndex() {
  const lastIndex = parseInt(localStorage.getItem(STORAGE_KEY) || "0");
  const nextIndex = (lastIndex + 1) % API_KEYS.length;
  localStorage.setItem(STORAGE_KEY, String(nextIndex));
  logger.auth(
    `Round-Robin: เริ่มจาก Key #${nextIndex + 1}/${API_KEYS.length} (ครั้งก่อนใช้ #${lastIndex + 1})`,
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
  const subscriberIntervalId = ref(null);


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
      logger.youtube("Connecting to video:", videoId);
      logger.youtube("Direct Mode: Fetching YouTube API...");

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);

      if (!data.items || data.items.length === 0) {
        throw new Error("Invalid Video ID");
      }

      const item = data.items[0];
      systemStore.liveTitle = item.snippet.title;
      logger.youtube("Video title:", item.snippet.title);

      // Save History to Firebase
      if (videoId && videoId !== "demo") {
        set(dbRef(db, `history/${videoId}`), {
          title: item.snippet.title,
          timestamp: Date.now(),
        }).catch((error) => logger.error("Error saving history:", error));

        // Save active video title and finished status to Firebase system node
        set(dbRef(db, "system/activeVideoTitle"), item.snippet.title).catch(
          (err) => logger.error("Error setting activeVideoTitle:", err),
        );
        const isEnded = !!item.liveStreamingDetails?.actualEndTime;
        set(dbRef(db, "system/isLiveFinished"), isEnded).catch(
          (err) => logger.error("Error setting isLiveFinished:", err),
        );
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
        logger.youtube("Live Chat ID:", activeChatId.value);

        // Dynamic parameters for Message Processor
        const { useChatProcessor } = await import("./useChatProcessor");
        const { processMessage } = useChatProcessor();
        processMessageFunc = processMessage;

        // Start Chat Service
        chatService.liveChatId = activeChatId.value;
        chatService.startPolling(videoId, async (msg) => {
          // ✅ DEBUG: Log complete message structure from YouTube API
          logger.debug("RAW YouTube API Message:", msg);
          if (processMessageFunc) await processMessageFunc(msg);
        });

        // Start Viewer Count Loop
        updateViewerCount(videoId);
        viewerIntervalId.value = setInterval(
          () => updateViewerCount(videoId),
          CONSTANTS.YOUTUBE.VIEWER_POLL_INTERVAL_MS,
        );

        // Start Subscriber Count Tracking Loop
        const channelId = item.snippet?.channelId;
        if (channelId) {
          updateSubscriberCount(channelId);
          subscriberIntervalId.value = setInterval(
            () => updateSubscriberCount(channelId),
            CONSTANTS.YOUTUBE.SUBSCRIBER_POLL_INTERVAL_MS,
          );
        }

        // Voice Announcement
        queueAudio(
          null,
          "",
          `การเชื่อมต่อสำเร็จ กำลังอ่านแชดสดจาก ${item.snippet.title}`,
        );

        return true;
      } else {
        logger.warn("No active live chat found");
        return false;
      }
    } catch (e) {
      logger.error("Connect video error:", e);
      systemStore.statusApi = "err";
      return false;
    }
  }

  /**
   * Polls Channel Subscriber Count and Triggers Voice + Toast Notification when count increases.
   * @param {string} channelId
   */
  async function updateSubscriberCount(channelId) {
    if (!channelId) return;
    try {
      const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}`;
      const data = await smartFetch(url);
      const stats = data.items?.[0]?.statistics;

      if (stats && !stats.hiddenSubscriberCount && stats.subscriberCount) {
        const newCount = parseInt(stats.subscriberCount, 10);
        if (!isNaN(newCount) && newCount > 0) {
          const prevCount = systemStore.subscriberCount;

          // ✅ Trigger voice announcement + popup alert if sub count increases
          if (prevCount > 0 && newCount > prevCount) {
            const diff = newCount - prevCount;
            logger.youtube(`🎉 New subscribers detected: +${diff} (total: ${newCount})`);

            // 🔊 Voice Announcement
            queueAudio("success", "", "ยินดีต้อนรับผู้ติดตามใหม่ค่ะ!");

            // 🔔 Popup Alert (Toast)
            Swal.fire({
              toast: true,
              position: "top-end",
              icon: "success",
              title: "🎉 มีผู้ติดตามใหม่!",
              text: `ยินดีต้อนรับผู้ติดตามใหม่ค่ะ! (ยอดรวม ${newCount.toLocaleString()} คน)`,
              showConfirmButton: false,
              timer: 4000,
              timerProgressBar: true,
            });
          }

          systemStore.subscriberCount = newCount;
        }
      }
    } catch (e) {
      logger.error("Subscriber Count Error:", e);
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
          logger.youtube("Stream Finished:", details.actualEndTime);

          // Update Firebase status
          set(dbRef(db, "system/isLiveFinished"), true).catch(
            (err) => logger.error("Error setting isLiveFinished on stream end:", err),
          );

          if (viewerIntervalId.value) {
            clearInterval(viewerIntervalId.value);
            viewerIntervalId.value = null;

            // 🔊 Read out names of customers who requested delivery with 5s delay after stream ends
            setTimeout(() => {
              announceShippingCustomers(videoId);
            }, CONSTANTS.YOUTUBE.ANNOUNCE_SHIPPING_DELAY_MS);

            const delaySec = CONSTANTS.YOUTUBE.DISCONNECT_DELAY_MS / 1000;
            logger.youtube(`Disconnecting in ${delaySec} seconds...`);
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
      logger.error("Viewer Count Error:", e);
    }
  }

  /**
   * Disconnects from YouTube, stops polling, and resets state.
   */
  function disconnect() {
    logger.youtube("Disconnecting...");
    systemStore.isConnected = false;

    chatService.stopPolling();

    if (viewerIntervalId.value) {
      clearInterval(viewerIntervalId.value);
      viewerIntervalId.value = null;
    }

    if (subscriberIntervalId.value) {
      clearInterval(subscriberIntervalId.value);
      subscriberIntervalId.value = null;
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

import { ref, onUnmounted } from "vue";
import { useSystemStore } from "../stores/system";
import { ref as dbRef, set } from "firebase/database";
import { db } from "./useFirebase";
import { YouTubeLiveChat } from "../services/YouTubeLiveChat";
import { useAudio } from "./useAudio";
import { CONSTANTS } from "../config/constants";

const rawKeys = import.meta.env.VITE_YOUTUBE_API_KEYS || "";
const API_KEYS = rawKeys.split(",").map((k) => k.trim()).filter((k) => k);

if (API_KEYS.length === 0) {
  throw new Error("Missing VITE_YOUTUBE_API_KEYS in environment variables");
}


export function useYouTube() {
  const systemStore = useSystemStore();
  const { speak } = useAudio();

  const activeChatId = ref("");
  const viewerIntervalId = ref(null);
  const chatService = new YouTubeLiveChat(API_KEYS);
  chatService.onStatusChange = (status) => { systemStore.statusChat = status; };

  let processMessageFunc = null;

  async function smartFetch(url) {
    // Helper used only for Viewer Count & Initial Video Details now
    // Chat logic is handled by specific Service
    try {
      systemStore.statusApi = "ok";
      let res = await fetch(
        url + "&key=" + API_KEYS[systemStore.currentKeyIndex]
      );
      let data = await res.json();

      if (data.error) {
        console.error("❌ API Error:", data.error.message);
        systemStore.statusApi = "warn";

        // Simple rotation for manual calls
        if (systemStore.currentKeyIndex < API_KEYS.length - 1) {
          systemStore.currentKeyIndex++;
          return smartFetch(url);
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

      // Save History
      if (videoId && videoId !== "demo") {
        set(dbRef(db, `history/${videoId}`), {
          title: item.snippet.title,
          timestamp: Date.now(),
        }).catch((error) => console.error("Error saving history:", error));
      }

      // Init Chat Store
      const chatStore = await import("../stores/chat").then((m) => m.useChatStore());
      if (item.liveStreamingDetails?.actualStartTime) {
        chatStore.streamStartTime = new Date(item.liveStreamingDetails.actualStartTime).getTime();
      } else {
        chatStore.streamStartTime = Date.now();
      }

      // Check Live Chat
      if (item.liveStreamingDetails?.activeLiveChatId) {
        activeChatId.value = item.liveStreamingDetails.activeLiveChatId;
        console.log("✅ Live Chat ID:", activeChatId.value);

        // Load Processor
        const { useChatProcessor } = await import("./useChatProcessor");
        const { processMessage } = useChatProcessor();
        processMessageFunc = processMessage;

        // ✅ Start Chat Service
        chatService.liveChatId = activeChatId.value; // Pre-set ID
        chatService.startPolling(videoId, async (msg) => {
          if (processMessageFunc) await processMessageFunc(msg);
        });

        // Start Viewer Count Loop
        updateViewerCount(videoId);
        viewerIntervalId.value = setInterval(() => updateViewerCount(videoId), CONSTANTS.YOUTUBE.VIEWER_POLL_INTERVAL_MS);

        // ✅ Voice Announcement
        speak("", `การเชื่อมต่อสำเร็จ กำลังอ่านแชดสดจาก ${item.snippet.title}`);

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

  async function updateViewerCount(videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);
      const details = data.items?.[0]?.liveStreamingDetails;

      if (details) {
        // Update Viewers
        if (details.concurrentViewers) {
          systemStore.viewerCount = parseInt(details.concurrentViewers);
        }

        // ✅ Check if Stream Ended
        if (details.actualEndTime) {
          console.log("🏁 Stream Finished:", details.actualEndTime);

          // Check if we already handled the ending to avoid duplicate triggers
          if (viewerIntervalId.value) {
            clearInterval(viewerIntervalId.value);
            viewerIntervalId.value = null; // Mark as handled

            // 1. Speak "Live finished"
            speak("", "ไลฟ์จบแล้ว");

            // 2. Schedule Auto-Disconnect
            const delaySec = CONSTANTS.YOUTUBE.DISCONNECT_DELAY_MS / 1000;
            console.log(`⏳ Disconnecting in ${delaySec} seconds...`);
            setTimeout(() => {
              if (systemStore.isConnected) {
                speak("", "กำลังตัดการเชื่อมต่อครับ");
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

  function disconnect() {
    console.log("🔌 Disconnecting...");
    systemStore.isConnected = false;

    // Stop Chat Service
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

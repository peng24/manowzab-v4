import { ref, onUnmounted } from "vue";
import { useSystemStore } from "../stores/system";
import { ref as dbRef, set, serverTimestamp } from "firebase/database";
import { db } from "./useFirebase";

const API_KEYS = [
  "REMOVED_YOUTUBE_API_KEY_1",
  "REMOVED_YOUTUBE_API_KEY_2",
  "REMOVED_YOUTUBE_API_KEY_3",
  "REMOVED_YOUTUBE_API_KEY_4",
];

export function useYouTube() {
  const systemStore = useSystemStore();

  const activeChatId = ref("");
  const chatToken = ref("");
  const chatTimeoutId = ref(null);
  const viewerIntervalId = ref(null);
  let processMessageFunc = null;

  async function smartFetch(url) {
    try {
      systemStore.statusApi = "ok";
      let res = await fetch(
        url + "&key=" + API_KEYS[systemStore.currentKeyIndex]
      );
      let data = await res.json();

      if (data.error) {
        console.error("❌ API Error:", data.error.message);
        systemStore.statusApi = "warn"; // ✅ เปลี่ยนเป็น warn

        if (systemStore.currentKeyIndex < API_KEYS.length - 1) {
          systemStore.currentKeyIndex++;
          console.log("🔑 Switching to Key:", systemStore.currentKeyIndex + 1);

          // ✅ รอ 1 วินาทีก่อนลองใหม่
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return smartFetch(url);
        } else {
          systemStore.statusApi = "err";
          throw new Error("All API keys exhausted");
        }
      }

      systemStore.statusApi = "ok";
      return data;
    } catch (e) {
      systemStore.statusApi = "err";
      throw e;
    }
  }

  async function connectVideo(videoId) {
    try {
      console.log("🔌 Connecting to video:", videoId);

      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);

      if (!data.items || data.items.length === 0) {
        throw new Error("Invalid Video ID");
      }

      const item = data.items[0];
      systemStore.liveTitle = item.snippet.title;
      console.log("✅ Video title:", item.snippet.title);

      // ✅ บันทึกประวัติ
      if (videoId && videoId !== "demo") {
        set(dbRef(db, `history/${videoId}`), {
          title: item.snippet.title,
          timestamp: Date.now(),
        }).catch((error) => {
          console.error("Error saving history:", error);
        });
      }

      // Set stream start time
      const chatStore = await import("../stores/chat").then((m) =>
        m.useChatStore()
      );
      if (item.liveStreamingDetails?.actualStartTime) {
        chatStore.streamStartTime = new Date(
          item.liveStreamingDetails.actualStartTime
        ).getTime();
      } else {
        chatStore.streamStartTime = Date.now();
      }

      if (item.liveStreamingDetails?.activeLiveChatId) {
        activeChatId.value = item.liveStreamingDetails.activeLiveChatId;
        chatToken.value = "";

        console.log("✅ Live Chat ID:", activeChatId.value);

        // Import processMessage dynamically
        const { useChatProcessor } = await import("./useChatProcessor");
        const { processMessage } = useChatProcessor();
        processMessageFunc = processMessage;

        // Start polling chat
        loadChatLoop();

        // Start viewer count update
        updateViewerCount(videoId);
        viewerIntervalId.value = setInterval(
          () => updateViewerCount(videoId),
          15000
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

  async function loadChatLoop() {
    // ✅ ตรวจสอบให้แน่ใจว่า isConnected = true
    if (!systemStore.isConnected) {
      console.log("⚠️ Chat loop stopped: not connected");
      return;
    }

    if (!activeChatId.value) {
      console.log("⚠️ Chat loop stopped: no chat ID");
      return;
    }

    console.log(
      "🔄 Loading chat messages... (Token:",
      chatToken.value ? "Yes" : "First load",
      ")"
    );

    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${
      activeChatId.value
    }&part=snippet,authorDetails${
      chatToken.value ? "&pageToken=" + chatToken.value : ""
    }`;

    try {
      const data = await smartFetch(url);
      systemStore.statusChat = "ok";

      console.log("📦 Received", data.items?.length || 0, "messages");

      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          try {
            if (processMessageFunc) {
              await processMessageFunc(item);
            } else {
              console.error("❌ processMessage not initialized");
            }
          } catch (err) {
            console.error("❌ Process message error:", err);
          }
        }
      }

      if (data.nextPageToken) {
        chatToken.value = data.nextPageToken;
      }

      const delay = data.pollingIntervalMillis || 5000;
      console.log("⏱️ Next poll in", delay, "ms");

      // ✅ เช็คอีกครั้งก่อน schedule ต่อ
      if (systemStore.isConnected) {
        chatTimeoutId.value = setTimeout(loadChatLoop, Math.max(delay, 3000));
      }
    } catch (e) {
      console.error("❌ Load Chat Error:", e);
      systemStore.statusChat = "err";

      // Retry after 10s if still connected
      if (systemStore.isConnected) {
        chatTimeoutId.value = setTimeout(loadChatLoop, 10000);
      }
    }
  }

  async function updateViewerCount(videoId) {
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}`;
      const data = await smartFetch(url);

      if (data.items?.[0]?.liveStreamingDetails?.concurrentViewers) {
        systemStore.viewerCount = parseInt(
          data.items[0].liveStreamingDetails.concurrentViewers
        );
      }
    } catch (e) {
      console.error("❌ Viewer Count Error:", e);
    }
  }

  function disconnect() {
    console.log("🔌 Disconnecting...");

    // ✅ ต้อง set isConnected = false ก่อน
    systemStore.isConnected = false;

    if (chatTimeoutId.value) {
      clearTimeout(chatTimeoutId.value);
      chatTimeoutId.value = null;
    }

    if (viewerIntervalId.value) {
      clearInterval(viewerIntervalId.value);
      viewerIntervalId.value = null;
    }

    activeChatId.value = "";
    chatToken.value = "";
    processMessageFunc = null;
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    activeChatId,
    connectVideo,
    disconnect,
  };
}

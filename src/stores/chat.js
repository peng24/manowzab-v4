import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { ref as dbRef, onChildAdded, off, push } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useAudio } from "../composables/useAudio";
import { logger } from "../utils/logger";

export const useChatStore = defineStore("chat", () => {
  const messages = reactive([]); // ✅ เปลี่ยนเป็น reactive
  const seenMessageIds = ref({});
  const fullChatLog = ref([]);
  const streamStartTime = ref(null);

  // ✅ Firebase sync state
  let currentChatListener = null;
  let currentVideoId = null;

  function addMessage(message) {
    if (seenMessageIds.value[message.id]) {
      logger.warn("Duplicate message:", message.id);
      return;
    }

    seenMessageIds.value[message.id] = true;
    messages.push(message); // ✅ Push เข้า reactive array

    const textSnippet = message.text ? (message.text.length > 30 ? message.text.substring(0, 30) + "..." : message.text) : "(empty)";
    logger.chat(`Message added from ${message.authorName || "System"}: "${textSnippet}" (Total: ${messages.length})`);

    // Log for CSV
    fullChatLog.value.push({
      id: message.id,
      author: message.authorName,
      comment: message.text,
      videoTime: calculateVideoTime(message.timestamp),
      messageTime: new Date(message.timestamp).toLocaleString("en-US"),
      // ✅ เพิ่มข้อมูล Raw เพื่อให้ HistoryModal เอาไปใช้ได้
      displayName: message.displayName || message.authorName,
      realName: message.realName || message.displayName || message.authorName,
      text: message.text,
      timestamp: message.timestamp, // Raw timestamp for Date formatting
    });
  }

  function calculateVideoTime(timestamp) {
    if (!streamStartTime.value) return "0:00";
    const diffMs = timestamp - streamStartTime.value;
    if (diffMs < 0) return "0:00";

    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function clearChat() {
    messages.splice(0); // Clear UI messages
    seenMessageIds.value = {}; // Clear deduplication cache
    fullChatLog.value = []; // ✅ Clear CSV Log
    streamStartTime.value = null; // ✅ Reset Timer
    logger.chat("Chat & Logs cleared completely");
  }

  function downloadChatCSV(videoId) {
    if (fullChatLog.value.length === 0) {
      alert("ไม่มีข้อมูลแชท");
      return;
    }

    let csvContent = "\uFEFF\"Id\",\"Author name\",\"Comment\",\"Video time\",\"Message time\"\n";

    fullChatLog.value.forEach((row) => {
      const safeId = row.id ? String(row.id).replace(/"/g, '""') : "";
      const safeComment = row.comment ? String(row.comment).replace(/"/g, '""') : "";
      const safeAuthor = row.author ? String(row.author).replace(/"/g, '""') : "";
      const safeVideoTime = row.videoTime ? String(row.videoTime).replace(/"/g, '""') : "";
      const safeMessageTime = row.messageTime ? String(row.messageTime).replace(/"/g, '""') : "";
      
      csvContent += `"${safeId}","${safeAuthor}","${safeComment}","${safeVideoTime}","${safeMessageTime}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `chat_log_${videoId}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * ✅ Sync chat messages from Firebase in real-time
   * @param {string} videoId - The video ID to sync chats from
   * @returns {Function} Cleanup function to remove listener
   */
  function syncFromFirebase(videoId) {
    if (!videoId) {
      logger.warn("No videoId provided for chat sync");
      return;
    }

    // Clean up previous listener first
    if (currentChatListener) {
      logger.firebase(`Cleaning up old chat listener for ${currentVideoId}`);
      const oldRef = dbRef(db, `chats/${currentVideoId}`);
      off(oldRef, "child_added", currentChatListener);
      currentChatListener = null;
    }

    // ✅ Auto-Clear if switching to a new video
    if (currentVideoId && currentVideoId !== videoId) {
      logger.firebase(
        `Switching video from ${currentVideoId} to ${videoId}. Clearing chat...`,
      );
      clearChat();
    }

    currentVideoId = videoId;
    const chatRef = dbRef(db, `chats/${videoId}`);

    logger.firebase(`Starting Firebase chat sync for: ${videoId}`);

    const syncStartTime = Date.now();

    // Listen for new chat messages
    const listener = onChildAdded(chatRef, (snapshot) => {
      const messageData = snapshot.val();
      if (messageData) {
        const isNew = !seenMessageIds.value[messageData.id];

        // Add message through the existing addMessage function
        // This handles deduplication and logging
        addMessage(messageData);

        // ✅ Play audio for NEW messages in real-time across all connected devices
        if (isNew && messageData.timestamp >= syncStartTime - 5000) {
          const { queueAudio } = useAudio();
          const isVoiceChat = messageData.uid === "voice-chat-uid" || (messageData.uid && messageData.uid.includes("voice-chat"));

          let textToRead = messageData.ttsText !== undefined ? messageData.ttsText : (isVoiceChat ? "" : (messageData.text || ""));

          // Ignore voice chats with no intent
          if (!(isVoiceChat && !messageData.type)) {
            queueAudio(messageData.sfxType, messageData.phoneticName, textToRead);
          }
        }
      }
    });

    // Store listener for cleanup
    currentChatListener = listener;

    // Return cleanup function
    return () => {
      logger.firebase(`Cleaning up chat listener for ${videoId}`);
      off(chatRef, "child_added", listener);
      currentChatListener = null;
    };
  }

  /**
   * ✅ Send a new message to Firebase
   * @param {string} videoId - The video ID to save the chat under
   * @param {Object} messageData - The full message object
   * @returns {Promise} Resolves when the message is successfully pushed
   */
  async function sendMessageToFirebase(videoId, messageData) {
    if (!videoId) {
      logger.warn("Cannot send message: No videoId provided");
      return;
    }

    try {
      const chatRef = dbRef(db, `chats/${videoId}`);
      await push(chatRef, messageData);
    } catch (error) {
      logger.error("Error sending message to Firebase:", error);
      throw error;
    }
  }

  return {
    messages,
    seenMessageIds, // ✅ Export seenMessageIds to check for duplicate processing
    fullChatLog,
    streamStartTime,
    addMessage,
    clearChat,
    downloadChatCSV,
    syncFromFirebase,
    sendMessageToFirebase,
  };
});

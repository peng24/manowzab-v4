import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { ref as dbRef, onChildAdded, off } from "firebase/database";
import { db } from "../composables/useFirebase";

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
      console.log("⚠️ Duplicate message:", message.id);
      return;
    }

    seenMessageIds.value[message.id] = true;
    messages.push(message); // ✅ Push เข้า reactive array

    console.log("✅ Message added, total:", messages.length);

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
    console.log("🗑️ Chat & Logs cleared completely");
  }

  function downloadChatCSV(videoId) {
    if (fullChatLog.value.length === 0) {
      alert("ไม่มีข้อมูลแชท");
      return;
    }

    let csvContent = "\uFEFFId,Author name,Comment,Video time,Message time\n";

    fullChatLog.value.forEach((row) => {
      const safeComment = row.comment ? row.comment.replace(/"/g, '""') : "";
      const safeAuthor = row.author ? row.author.replace(/"/g, '""') : "";
      csvContent += `${row.id},"${safeAuthor}","${safeComment}",${row.videoTime},"${row.messageTime}"\n`;
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
      console.warn("⚠️ No videoId provided for chat sync");
      return;
    }

    // ✅ Auto-Clear if switching to a new video
    if (currentVideoId && currentVideoId !== videoId) {
      console.log(
        `🔄 Switching video from ${currentVideoId} to ${videoId}. Clearing chat...`,
      );
      clearChat();
    }

    // Clean up previous listener if switching videos
    if (currentChatListener && currentVideoId !== videoId) {
      console.log(`🧹 Cleaning up old chat listener for ${currentVideoId}`);
      const oldRef = dbRef(db, `chats/${currentVideoId}`);
      off(oldRef, "child_added", currentChatListener);
      currentChatListener = null;
    }

    currentVideoId = videoId;
    const chatRef = dbRef(db, `chats/${videoId}`);

    console.log(`🔥 Starting Firebase chat sync for: ${videoId}`);

    // Listen for new chat messages
    const listener = onChildAdded(chatRef, (snapshot) => {
      const messageData = snapshot.val();
      if (messageData) {
        // Add message through the existing addMessage function
        // This handles deduplication and logging
        addMessage(messageData);
      }
    });

    // Store listener for cleanup
    currentChatListener = listener;

    // Return cleanup function
    return () => {
      console.log(`🧹 Cleaning up chat listener for ${videoId}`);
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
      console.warn("⚠️ Cannot send message: No videoId provided");
      return;
    }

    try {
      const chatRef = dbRef(db, `chats/${videoId}`);
      await push(chatRef, messageData);
    } catch (error) {
      console.error("❌ Error sending message to Firebase:", error);
      throw error;
    }
  }

  return {
    messages,
    fullChatLog,
    streamStartTime,
    addMessage,
    clearChat,
    downloadChatCSV,
    syncFromFirebase,
    sendMessageToFirebase, // ✅ Export new action
  };
});

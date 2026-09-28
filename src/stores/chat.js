import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import { ref as dbRef, onChildAdded, push, query, limitToLast } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useAudio } from "../composables/useAudio";
import { logger } from "../utils/logger";
import { useNicknameStore } from "./nickname";
import { archiveChatEntries, getAllChatEntries, clearChatEntries } from "../utils/chatIdb";

export const useChatStore = defineStore("chat", () => {
  const MAX_MESSAGES = 500;
  const MAX_SEEN_IDS = 2000;
  const MAX_FULL_LOG = 3000; // ✅ RAM buffer cap: ป้องกัน fullChatLog ล้น Heap

  const messages = reactive([]); // ✅ reactive array สำหรับแสดงผล UI
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

    // ✅ Resolve current nickname dynamically from nicknameStore
    try {
      const nicknameStore = useNicknameStore();
      const resolved = nicknameStore.getNickname(
        message.uid,
        message.realName || message.authorName || message.displayName
      );
      if (resolved) {
        message.displayName = resolved;
      }
    } catch (e) {
      // Store not ready
    }

    seenMessageIds.value[message.id] = true;

    // ✅ Memory safety: trim seen IDs cache periodically
    const seenKeys = Object.keys(seenMessageIds.value);
    if (seenKeys.length > MAX_SEEN_IDS) {
      const keysToRemove = seenKeys.slice(0, seenKeys.length - MAX_SEEN_IDS);
      keysToRemove.forEach(key => delete seenMessageIds.value[key]);
    }

    messages.push(message); // ✅ Push เข้า reactive array

    // ✅ Memory safety: trim old messages to prevent unbounded growth during long streams
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }

    const textSnippet = message.text ? (message.text.length > 30 ? message.text.substring(0, 30) + "..." : message.text) : "(empty)";
    logger.chat(`Message added from ${message.authorName || "System"}: "${textSnippet}" (Total: ${messages.length})`);

    // Log for CSV
    const logEntry = {
      id: message.id,
      author: message.authorName,
      comment: message.text,
      videoTime: calculateVideoTime(message.timestamp),
      messageTime: new Date(message.timestamp).toLocaleString("en-US"),
      // ✅ Raw fields สำหรับ HistoryModal และ IDB export
      displayName: message.displayName || message.authorName,
      realName: message.realName || message.displayName || message.authorName,
      text: message.text,
      timestamp: message.timestamp,
    };
    fullChatLog.value.push(logEntry);

    // ✅ Phase 1.1: Archive-then-trim — persist to IndexedDB BEFORE removing from RAM
    // การ export CSV จะอ่านจากทั้ง RAM + IndexedDB ทำให้ได้ข้อมูลครบ 100%
    if (fullChatLog.value.length > MAX_FULL_LOG) {
      const trimCount = fullChatLog.value.length - MAX_FULL_LOG;
      const entriesToArchive = fullChatLog.value.slice(0, trimCount);

      // Background async — ไม่ block main thread
      if (currentVideoId && entriesToArchive.length > 0) {
        archiveChatEntries(currentVideoId, entriesToArchive).catch(() => {});
      }

      fullChatLog.value.splice(0, trimCount);
    }
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
    fullChatLog.value = []; // ✅ Clear RAM log
    streamStartTime.value = null; // ✅ Reset Timer

    // ✅ Clear IndexedDB archive for current session (prevents stale data on re-connect)
    if (currentVideoId) {
      clearChatEntries(currentVideoId).catch(() => {});
    }

    logger.chat("Chat & Logs cleared completely");
  }

  /**
   * ✅ Download CSV ที่รวมข้อมูลจาก RAM + IndexedDB archive
   * เพื่อให้ได้ข้อมูลครบ 100% แม้ session ยาวจนมีการ trim
   * @param {string} videoId
   */
  async function downloadChatCSV(videoId) {
    const targetVideoId = videoId || currentVideoId;

    // 1. ดึงจาก RAM
    const inMemory = [...fullChatLog.value];

    // 2. ดึงจาก IndexedDB archive (ข้อความที่ถูก trim ออกไปแล้ว)
    const archived = await getAllChatEntries(targetVideoId).catch(() => []);

    // 3. Merge + Deduplicate ด้วย id (archived มาก่อน, inMemory override)
    const seen = new Set();
    const merged = [...archived, ...inMemory].filter((row) => {
      if (!row.id || seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });

    // 4. Sort by timestamp ascending
    merged.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    if (merged.length === 0) {
      alert("ไม่มีข้อมูลแชท");
      return;
    }

    // 5. Generate CSV
    let csvContent = "\uFEFF\"Id\",\"Author name\",\"Comment\",\"Video time\",\"Message time\"\n";

    merged.forEach((row) => {
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
    link.setAttribute("download", `chat_log_${targetVideoId}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * ✅ Sync chat messages from Firebase in real-time
   * Phase 2.4: ใช้ limitToLast(200) เพื่อป้องกัน Reconnect Storm
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
      currentChatListener();
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

    // ✅ Phase 2.4: limitToLast(200) — ป้องกัน Reconnect Storm
    // เมื่อเน็ตหลุดแล้วต่อใหม่ Firebase จะ deliver เฉพาะข้อความล่าสุด 200 รายการ
    // ไม่ทำให้ main thread freeze จากการ replay ข้อมูลหลักพัน
    const chatRef = dbRef(db, `chats/${videoId}`);
    const chatQuery = query(chatRef, limitToLast(200));

    logger.firebase(`Starting Firebase chat sync for: ${videoId} (limitToLast: 200)`);

    const syncStartTime = Date.now();

    // Listen for new chat messages
    const listener = onChildAdded(chatQuery, (snapshot) => {
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
      listener();
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

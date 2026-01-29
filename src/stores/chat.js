import { defineStore } from "pinia";
import { ref, reactive } from "vue";

// 🧹 Memory management: Limit reactive messages to prevent RAM issues in long streams
const MAX_DISPLAY_MESSAGES = 500;

export const useChatStore = defineStore("chat", () => {
  const messages = reactive([]); // ✅ เปลี่ยนเป็น reactive
  const seenMessageIds = ref({});
  const fullChatLog = ref([]);
  const streamStartTime = ref(null);

  function addMessage(message) {
    if (seenMessageIds.value[message.id]) {
      console.log("⚠️ Duplicate message:", message.id);
      return;
    }

    seenMessageIds.value[message.id] = true;
    messages.push(message); // ✅ Push เข้า reactive array

    // 🧹 Auto-trim messages if exceeding limit
    if (messages.length > MAX_DISPLAY_MESSAGES) {
      messages.shift(); // Remove oldest message
      if (import.meta.env.DEV) {
        console.log("🧹 Auto-trimmed chat messages, keeping last", MAX_DISPLAY_MESSAGES);
      }
    }

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
    messages.splice(0); // ✅ Clear reactive array
    seenMessageIds.value = {};
    console.log("🗑️ Chat cleared");
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

  return {
    messages,
    fullChatLog,
    streamStartTime,
    addMessage,
    clearChat,
    downloadChatCSV,
  };
});

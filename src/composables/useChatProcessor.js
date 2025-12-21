import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../firebase"; // ⚠️ ตรวจสอบ path ให้ตรงกับโปรเจคจริง (เช่น "../composables/useFirebase")
import { ref } from "vue";

// Logger Config
const DEBUG_MODE = true;
const logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

// Saved names cache
const savedNamesCache = ref({});
onValue(dbRef(db, "nicknames"), (snapshot) => {
  const data = snapshot.val() || {};
  savedNamesCache.value = data;
  Object.assign(savedNamesCache, data);
});

export function useChatProcessor() {
  const stockStore = useStockStore();
  const chatStore = useChatStore();
  const systemStore = useSystemStore();
  const { analyzeChat } = useGemini();
  const { queueSpeech, playDing } = useAudio();

  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 85%, 75%)`;
  }

  async function processMessage(item) {
    // 1. Validate Message
    if (!item.snippet || !item.authorDetails) return;

    const msg = item.snippet.displayMessage || "";
    if (!msg) return;

    const uid = item.authorDetails.channelId;
    const realName = item.authorDetails.displayName;
    const avatar =
      item.authorDetails.profileImageUrl ||
      "https://www.gstatic.com/youtube/img/creator/avatars/sample_avatar.png";

    // Check Nickname
    let displayName = realName;
    if (savedNamesCache.value[uid]) {
      displayName =
        typeof savedNamesCache.value[uid] === "object"
          ? savedNamesCache.value[uid].nick
          : savedNamesCache.value[uid];
    }

    const isAdmin =
      /admin|แอดมิน/i.test(displayName) || /admin|แอดมิน/i.test(realName);

    // Determine intent
    let intent = null;
    let targetId = null;
    let targetPrice = null;
    let method = null;
    const stockSize = stockStore.stockSize;

    // 2. AI Analysis
    if (systemStore.isAiCommander) {
      try {
        const aiResult = await analyzeChat(msg);
        if (aiResult) {
          if (aiResult.intent === "buy" && aiResult.id) {
            intent = "buy";
            targetId = aiResult.id;
            targetPrice = aiResult.price;
            method = "ai";
          } else if (aiResult.intent === "cancel" && aiResult.id) {
            intent = "cancel";
            targetId = aiResult.id;
            method = "ai";
          } else if (aiResult.intent === "shipping") {
            method = "ai";
            queueSpeech(`${displayName} แจ้งส่งของ`);
          } else if (aiResult.intent === "question") {
            method = "ai-skip";
          }
        }
      } catch (error) {
        logger.error("❌ AI Error (Skipped):", error);
      }
    }

    // 3. Fallback to Regex
    if (!method) {
      const buyRegex =
        /(?:^|[\s])(?:F|f|cf|CF|รับ|เอา)?\s*(\d+)(?:[\s=\/]+(\d+))?(?:$|[\s])/;
      const cancelRegex =
        /(?:^|[\s])(?:cc|CC|cancel|ยกเลิก|ไม่เอา|ปล่อย|หลุด)\s*(\d+)(?:$|[\s])/i;
      const isQuestion =
        /อก|เอว|ยาว|ราคา|เท่าไหร่|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม/i.test(
          msg
        );

      const cMatch = msg.match(cancelRegex);
      const bMatch = msg.match(buyRegex);

      if (cMatch) {
        intent = "cancel";
        targetId = parseInt(cMatch[1]);
        method = "regex";
      } else if (bMatch && !isQuestion) {
        intent = "buy";
        targetId = parseInt(bMatch[1]);
        targetPrice = bMatch[2] ? parseInt(bMatch[2]) : null;
        method = "regex";
      }
    }

    // 4. Add message to chat (ส่ง type ไปทำสีพื้นหลัง)
    chatStore.addMessage({
      id: item.id,
      text: msg,
      authorName: realName,
      displayName,
      realName: realName,
      uid: uid,
      avatar,
      color: stringToColor(uid),
      isAdmin,
      type: intent, // ส่ง intent ไปเป็น type (buy/cancel/null)
      detectionMethod: method,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    // 5. Process Order & Audio Logic

    // เตรียมข้อความสำหรับอ่าน (ตัด Emoji ออก)
    let speakMsg = msg.replace(
      /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    if (intent === "buy" && targetId > 0) {
      // --- กรณีจอง ---
      if (targetId > stockSize) stockStore.stockSize = targetId;

      let ownerName = displayName;
      let ownerUid = uid;

      if (isAdmin) {
        let cleanName = msg
          .replace(targetId.toString(), "")
          .replace(/f|cf|รับ|เอา|=/gi, "");
        if (targetPrice)
          cleanName = cleanName.replace(targetPrice.toString(), "");
        cleanName = cleanName.replace(/^[:=\-\s]+|[:=\-\s]+$/g, "").trim();
        if (cleanName.length > 0) {
          ownerName = cleanName;
          ownerUid = "admin-proxy-" + Date.now();
        } else {
          ownerName = "ลูกค้า (Admin)";
          ownerUid = "admin-proxy-" + Date.now();
        }
      }

      await stockStore.processOrder(
        targetId,
        ownerName,
        ownerUid,
        "chat",
        targetPrice,
        method
      );

      playDing(); // เสียงติ๊ง
      if (speakMsg.trim().length > 0)
        queueSpeech(`${displayName} ... ${speakMsg}`);
    } else if (intent === "cancel" && targetId > 0) {
      // --- กรณียกเลิก ---
      const currentItem = stockStore.stockData[targetId];
      if (isAdmin || (currentItem && currentItem.uid === uid)) {
        // ✅ Action: ยกเลิกทันที
        await stockStore.processCancel(targetId);

        // ✅ Audio: เสียงติ๊ง + อ่านข้อความแชทปกติ (ไม่พูดระบบแจ้งเตือนแล้ว)
        playDing();
        if (speakMsg.trim().length > 0)
          queueSpeech(`${displayName} ... ${speakMsg}`);
      }
    } else {
      // --- กรณีข้อความทั่วไป ---
      if (method !== "ai" || intent !== "shipping") {
        if (speakMsg.trim().length > 0 && speakMsg.length < 100) {
          queueSpeech(`${displayName} ... ${speakMsg}`);
        }
      }
    }
  }

  return { processMessage };
}

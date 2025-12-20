import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../firebase"; // ⚠️ ถ้า Error ตรงนี้ให้เปลี่ยนเป็น "./useFirebase"
import { ref } from "vue";

// ==========================================
// ✅ ส่วนจัดการ Logger (รวมไว้ที่นี่เลย)
// ==========================================
const DEBUG_MODE = true; // ปรับเป็น false ถ้าไม่อยากเห็น Log รกๆ

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
// ==========================================

// Saved names cache
const savedNamesCache = ref({});

// Initialize listener for saved names
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
    if (!item.snippet || !item.authorDetails) {
      return;
    }

    const msg = item.snippet.displayMessage || "";
    if (!msg) return;

    const uid = item.authorDetails.channelId;
    const realName = item.authorDetails.displayName;
    const avatar =
      item.authorDetails.profileImageUrl ||
      "https://www.gstatic.com/youtube/img/creator/avatars/sample_avatar.png";

    // ✅ Log แบบดูง่าย
    logger.log(`📩 [${realName}]: ${msg}`);

    // Check if has nickname
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

    // 2. Try AI Analysis first (if enabled)
    if (systemStore.isAiCommander) {
      try {
        const aiResult = await analyzeChat(msg);

        if (aiResult) {
          logger.log("🤖 AI Result:", aiResult);
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
        logger.log(`✅ Regex Cancel: ${targetId}`);
      } else if (bMatch && !isQuestion) {
        intent = "buy";
        targetId = parseInt(bMatch[1]);
        targetPrice = bMatch[2] ? parseInt(bMatch[2]) : null;
        method = "regex";
        logger.log(`✅ Regex Buy: ${targetId}`);
      }
    }

    // 4. Add message to chat (บันทึกเสมอ)
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
      detectionMethod: method === "ai" || method === "regex" ? method : null,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    // 5. Text-to-Speech
    let speakMsg = msg.replace(
      /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2011-\u26FF])+/g,
      " "
    );
    speakMsg = speakMsg.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    if (speakMsg.trim().length > 0 && speakMsg.length < 100) {
      queueSpeech(`${displayName} ... ${speakMsg}`);
    }

    if (method === "ai-skip") return;

    // 6. Process Order/Cancel
    if (targetId && targetId > 0) {
      if (targetId > stockSize) {
        stockStore.stockSize = targetId;
      }

      if (intent === "buy") {
        let ownerName = displayName;
        let ownerUid = uid;

        if (isAdmin) {
          let cleanName = msg;
          cleanName = cleanName
            .replace(targetId.toString(), "")
            .replace(/f|cf|รับ|เอา|=/gi, "");

          if (targetPrice) {
            cleanName = cleanName.replace(targetPrice.toString(), "");
          }

          cleanName = cleanName.replace(/^[:=\-\s]+|[:=\-\s]+$/g, "").trim();

          if (cleanName.length > 0) {
            ownerName = cleanName;
            ownerUid = "admin-proxy-" + Date.now();
          } else {
            ownerName = "ลูกค้า (Admin)";
            ownerUid = "admin-proxy-" + Date.now();
          }
        }

        logger.log(`🛒 Order: ${ownerName} -> Item ${targetId}`);

        await stockStore.processOrder(
          targetId,
          ownerName,
          ownerUid,
          "chat",
          targetPrice,
          method
        );

        playDing();
      } else if (intent === "cancel") {
        const currentItem = stockStore.stockData[targetId];
        if (isAdmin || (currentItem && currentItem.uid === uid)) {
          logger.log(`❌ Cancel: Item ${targetId}`);
          stockStore.processCancel(targetId);
          queueSpeech(`${displayName} ยกเลิกรายการที่ ${targetId}`);
        }
      }
    }
  }

  return {
    processMessage,
  };
}

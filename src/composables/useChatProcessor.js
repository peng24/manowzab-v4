import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../firebase"; // เช็ค path ให้ถูกต้อง
import { ref } from "vue";

// Logger (Internal)
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

    logger.log(`📩 [${realName}]: ${msg}`);

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

    // 4. Add message to chat
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

    // 5. Text-to-Speech (✅ แก้ไขให้อ่านชื่อ...ข้อความ)
    let speakMsg = msg.replace(
      /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    // ถ้าไม่ใช่คำสั่งซื้อ/ยกเลิก ให้อ่านแชทปกติ
    if (!intent) {
      if (speakMsg.trim().length > 0 && speakMsg.length < 100) {
        queueSpeech(`${displayName} ... ${speakMsg}`);
      }
    }

    if (method === "ai-skip") return;

    // 6. Process Order/Cancel
    if (targetId && targetId > 0) {
      if (targetId > stockSize) stockStore.stockSize = targetId;

      if (intent === "buy") {
        let ownerName = displayName;
        let ownerUid = uid;

        if (isAdmin) {
          // ... Logic Admin Proxy เดิม ...
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

        logger.log(`🛒 Order: ${ownerName} -> Item ${targetId}`);

        // จองของ
        await stockStore.processOrder(
          targetId,
          ownerName,
          ownerUid,
          "chat",
          targetPrice,
          method
        );

        // ✅ มีแค่เสียง ติ๊ง! ไม่ต้องพูดชื่อ
        playDing();
      } else if (intent === "cancel") {
        const currentItem = stockStore.stockData[targetId];
        if (isAdmin || (currentItem && currentItem.uid === uid)) {
          logger.log(`❌ Cancel: Item ${targetId}`);

          // ✅ เรียกใช้แบบรับค่ากลับ
          const result = await stockStore.processCancel(targetId);

          // ✅ มีเสียงเตือน + พูดว่าใครหลุด ใครได้ต่อ
          playDing();
          if (result && result.nextOwner) {
            queueSpeech(
              `${result.previousOwner} ยกเลิก... ${result.nextOwner} ได้สิทธิ์ต่อค่ะ`
            );
          } else {
            queueSpeech(`${displayName} ยกเลิกรายการที่ ${targetId} ค่ะ`);
          }
        }
      }
    }
  }

  return { processMessage };
}

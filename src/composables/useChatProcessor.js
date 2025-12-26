import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue, set, update } from "firebase/database";
import { db } from "../composables/useFirebase";
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

  // ✅ Reactive Update: อัปเดตชื่อในแชทเก่าทันที
  const chatStore = useChatStore();
  if (chatStore.messages && chatStore.messages.length > 0) {
    chatStore.messages.forEach((msg) => {
      if (data[msg.uid]) {
        const newNick = typeof data[msg.uid] === "object" ? data[msg.uid].nick : data[msg.uid];
        if (msg.displayName !== newNick) {
          msg.displayName = newNick;
        }
      }
    });
  }
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

    // 2. Regex-First Strategy (Priority)
    // ✅ 2.1 Shipping / Transfer
    const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม/;
    
    // ✅ 2.2 Questions
    const questionRegex =
      /อก|เอว|ยาว|ราคา|เท่าไหร่|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์/;
      
    // ✅ 2.3 Buy Pattern
    const buyRegex =
      /(?:^|[^0-9])(?:F|f|cf|CF|รับ|เอา)?\s*(\d+)(?:[\s=\/]+(\d+))?(?:$|[^0-9])/;

    // ✅ 2.4 Cancel Pattern
    const cancelRegex =
      /(?:^|[^0-9])(?:cc|CC|cancel|ยกเลิก|ไม่เอา|ปล่อย|หลุด)\s*(\d+)(?:$|[^0-9])/i;

    if (shippingRegex.test(msg)) {
      intent = "shipping";
      method = "regex-ship";
    } else if (questionRegex.test(msg)) {
      method = "question-skip"; 
    } else {
      const cMatch = msg.match(cancelRegex);
      const bMatch = msg.match(buyRegex);

      if (cMatch) {
        intent = "cancel";
        targetId = parseInt(cMatch[1]);
        method = "regex";
      } else if (bMatch) {
        intent = "buy";
        targetId = parseInt(bMatch[1]);
        targetPrice = bMatch[2] ? parseInt(bMatch[2]) : null;
        method = "regex";
      }
    }

    // 3. AI Analysis (Fallback - Run ONLY if Regex failed)
    if (!method && systemStore.isAiCommander) {
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
            // ✅ ถ้า AI ระบุว่าเป็น Shipping ให้ตั้งค่า intent แล้วปล่อยผ่านไป Step 5
            intent = "shipping";
            method = "ai";
          } else if (aiResult.intent === "question") {
            method = "ai-skip";
          }
        }
      } catch (error) {
        logger.error("❌ AI Error (Skipped):", error);
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
      type: intent, // ส่ง intent ไปเป็น type (buy/cancel/shipping/null)
      detectionMethod: method,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    // 5. Process Order & Audio Logic (Updated for TextToSpeech Service)
    const { speak } = useAudio(); // Destructure confirm

    if (intent === "buy" && targetId > 0) {
      // --- กรณีจอง ---
      if (targetId > stockSize) stockStore.stockSize = targetId;

      let ownerName = displayName;
      let ownerUid = uid;

      if (isAdmin) {
        // Clean Name Logic
        let cleanName = msg
          .replace(targetId.toString(), "")
          .replace(/f|cf|รับ|เอา|=/gi, "");
        if (targetPrice)
          cleanName = cleanName.replace(targetPrice.toString(), "");
        cleanName = cleanName
          .replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "")
          .trim();

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

      // ✅ Use New TTS Service (No manual sanitization needed here)
      speak(displayName, msg);

    } else if (intent === "cancel" && targetId > 0) {
      // --- กรณียกเลิก ---
      const currentItem = stockStore.stockData[targetId];
      if (isAdmin || (currentItem && currentItem.uid === uid)) {
        await stockStore.processCancel(targetId);

        playDing();
        // speak(displayName, `ยกเลิก รายการที่ ${targetId}`);
        speak(displayName, msg); // ✅ Read original message
      }
    } else {
      // --- กรณีข้อความทั่วไป ---
      if (intent === "shipping") {
        // ✅ Auto-add to shipping queue (Always)
        const shippingRef = dbRef(
          db,
          `shipping/${systemStore.currentVideoId}/${uid}`
        );
        update(shippingRef, {
          ready: true,
          timestamp: Date.now(),
          lastMessage: msg, // ✅ Store last message
        }).catch((e) => logger.error("Shipping update error:", e));

        speak(displayName, msg); // ✅ Read original message
      } else {
        // Read EVERYTHING else
        speak(displayName, msg);
      }
    }
  }

  return { processMessage };
}

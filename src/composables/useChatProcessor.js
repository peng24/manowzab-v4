import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "./useFirebase";
import { ref } from "vue";

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
    if (!item.snippet || !item.authorDetails) {
      console.log("❌ Invalid message format:", item);
      return;
    }

    const msg = item.snippet.displayMessage || "";
    if (!msg) return;

    const uid = item.authorDetails.channelId;
    const realName = item.authorDetails.displayName; // ✅ ชื่อจริงจาก YouTube
    const avatar =
      item.authorDetails.profileImageUrl ||
      "https://www.gstatic.com/youtube/img/creator/avatars/sample_avatar.png";

    console.log("📩 Processing message:", msg, "from", realName);

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

    // 1. Try AI Analysis first (if enabled)
    if (systemStore.isAiCommander) {
      console.log("🤖 Analyzing with AI...");
      const aiResult = await analyzeChat(msg);
      if (aiResult) {
        console.log("🤖 AI Result:", aiResult);
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
    }

    // 2. Fallback to Regex if AI didn't detect
    if (!method) {
      console.log("🔍 Using Regex detection...");
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
        console.log("✅ Detected CANCEL:", targetId);
      } else if (bMatch && !isQuestion) {
        intent = "buy";
        targetId = parseInt(bMatch[1]);
        targetPrice = bMatch[2] ? parseInt(bMatch[2]) : null;
        method = "regex";
        console.log("✅ Detected BUY:", targetId, "Price:", targetPrice);
      }
    }

    // 3. Add message to chat
    chatStore.addMessage({
      id: item.id,
      text: msg,
      authorName: realName,
      displayName,
      realName: realName,
      uid: uid, // ✅ เพิ่มบรรทัดนี้
      avatar,
      color: stringToColor(uid),
      isAdmin,
      detectionMethod: method === "ai" || method === "regex" ? method : null,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    console.log("✅ Message added:", displayName, "(", realName, ")");

    // 4. Text-to-Speech (แทนที่ Emoji ด้วย "ส่งอีโมจิ")
    let speakMsg = msg.replace(
      /(?:[\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2011-\u26FF])+/g,
      " ส่งอีโมจิ "
    );
    speakMsg = speakMsg.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      ""
    );

    if (speakMsg.trim().length > 0 && speakMsg.length < 100) {
      queueSpeech(`${displayName} ... ${speakMsg}`);
    }

    // 5. Skip if question
    if (method === "ai-skip") return;

    // 6. Process Order/Cancel
    if (targetId && targetId > 0) {
      console.log("🎯 Processing order/cancel for ID:", targetId);

      // Auto-expand stock size
      if (targetId > stockSize) {
        stockStore.stockSize = targetId;
      }

      if (intent === "buy") {
        let ownerName = displayName;
        let ownerUid = uid;

        // Admin proxy logic
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

        console.log("🛒 Processing BUY:", ownerName, targetId, targetPrice);

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
        console.log("❌ Processing CANCEL:", targetId);
        // Check permission
        const currentItem = stockStore.stockData[targetId];
        if (isAdmin || (currentItem && currentItem.uid === uid)) {
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

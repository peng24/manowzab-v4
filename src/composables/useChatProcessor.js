import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useGemini } from "./useGemini";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue, set, update, push } from "firebase/database";
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

  // ✅ Local State for Implicit Buy Logic
  const currentOverlayItem = ref(null);

  // ✅ Watch & Listen for Overlay Changes
  function setupOverlayListener() {
    if (!systemStore.currentVideoId) return;

    const overlayRef = dbRef(
      db,
      `overlay/${systemStore.currentVideoId}/current_item`
    );
    onValue(overlayRef, (snapshot) => {
      const val = snapshot.val();
      if (val && val.id) {
        currentOverlayItem.value = val.id; // Store only ID for simplicity
      } else {
        currentOverlayItem.value = null;
      }
    });
  }

  // Initial Setup & Watch for Video ID change
  setupOverlayListener();
  // Note: If videoID changes dynamically without page reload, we might need a watcher here.
  // Assuming systemStore.currentVideoId is reactive:
  import("vue").then(({ watch }) => {
    watch(
      () => systemStore.currentVideoId,
      (newId) => {
        if (newId) setupOverlayListener();
      }
    );
  });

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

    // --- LOGIC V2: Prioritized Flow ---

    // 1. Shipping / Transfer (Highest Priority for flow control)
    const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม/;
    
    // 2. Questions (Preserve existing logic)
    const questionRegex =
      /อก|เอว|ยาว|ราคา|เท่าไหร่|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์/;

    // 3. Strict "Pure Number" Logic (Pattern: just digits)
    const pureNumberRegex = /^\s*(\d+)\s*$/;

    // 4. Explicit "Buy Pattern" Logic (Prefix + Number)
    // Matches: F 50, cf 50, รับ 50, f50 (case insensitive)
    const explicitBuyRegex = /(?:F|f|cf|CF|รับ|เอา)\s*(\d+)/;

    // 5. Cancel Logic (Refined)
    const cancelRegex = /(?:^|\s)(?:cc|CC|cancel|ยกเลิก|ไม่เอา|หลุด)\s*(\d+)/;

    // 6. Implicit "Current Item" Logic (Keyword ONLY)
    // Matches: "รับ", "เอา", "F", "cf" (standing alone or surrounded by spaces)
    const implicitBuyRegex = /(?:^|\s)(?:รับ|เอา|F|f|cf|CF)(?:\s|$)/;

    // --- Execution ---

    if (shippingRegex.test(msg)) {
      intent = "shipping";
      method = "regex-ship";
    } else if (questionRegex.test(msg)) {
      // It's a question. Check if it accidentally contains a pure number? 
      // Rule 6 says preserve question detection.
      // But Rule 5 says ignore embedded numbers. 
      // If it matches Pure Number, it is NOT a question usually (e.g. "34"). 
      // If it says "อก 34" -> Question regex matches "อก". 
      method = "question-skip"; 
    } else {
      // Regex Matching
      const matchPure = msg.match(pureNumberRegex);
      const matchExplicit = msg.match(explicitBuyRegex);
      const matchCancel = msg.match(cancelRegex);
      const matchImplicit = msg.match(implicitBuyRegex);

      if (matchCancel) {
        // Priority: Cancel
        intent = "cancel";
        targetId = parseInt(matchCancel[1]);
        method = "regex-cancel";
      } else if (matchPure) {
        // Priority: Pure Number
        const num = parseInt(matchPure[1]);
        // Rule: Validate if in range (1 to stockSize or reasonable limit)
        // If number is huge (e.g. 555 for laugh), we might ignore? 
        // For now, assume strict mapping.
        intent = "buy";
        targetId = num;
        method = "regex-pure";
      } else if (matchExplicit) {
        // Priority: Explicit Buy
        intent = "buy";
        targetId = parseInt(matchExplicit[1]);
        method = "regex-explicit";
      } else if (matchImplicit) {
        // Priority: Implicit Buy (Context Aware)
        // Only if we know what the current item is
        if (currentOverlayItem.value) {
           intent = "buy";
           targetId = parseInt(currentOverlayItem.value);
           method = "regex-implicit";
        }
      }
    }

    // Safety Net: If intent is still null, but msg has numbers, 
    // OLD logic would sometimes extract them.
    // NEW LOGIC: Rule 5 -> "Ignore it". 
    // So we do nothing.

    // 3. AI Analysis (Fallback)
    if (!intent && !method && systemStore.isAiCommander) {
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
      type: intent,
      detectionMethod: method,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    // 5. Process Order & Audio Logic (Updated for TextToSpeech Service)
    const { speak } = useAudio(); 

    if (intent === "buy" && targetId > 0 && targetId <= stockStore.stockSize) {
      // --- Buy Logic ---
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

      playDing(); 
      speak(displayName, msg);

    } else if (intent === "cancel" && targetId > 0) {
      // --- Cancel Logic ---
      const currentItem = stockStore.stockData[targetId];
      if (isAdmin || (currentItem && currentItem.uid === uid)) {
        await stockStore.processCancel(targetId);

        playDing();
        speak(displayName, msg);
      }
    } else {
      // --- Other Intents / General Chat ---
      if (intent === "shipping") {
        const shippingRef = dbRef(
          db,
          `shipping/${systemStore.currentVideoId}/${uid}`
        );
        update(shippingRef, {
          ready: true,
          timestamp: Date.now(),
          lastMessage: msg,
        }).catch((e) => logger.error("Shipping update error:", e));

        const historyRef = dbRef(
          db,
          `shipping/${systemStore.currentVideoId}/${uid}/history`
        );
        push(historyRef, {
          text: msg,
          timestamp: Date.now(),
          type: "user",
        });

        speak(displayName, msg);
      } else {
        // Read EVERYTHING else
        speak(displayName, msg);
      }
    }
  }

  return { processMessage };
}

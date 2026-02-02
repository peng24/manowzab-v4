import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useOllama } from "./useOllama";
import { useAudio } from "./useAudio";
import { ref as dbRef, onValue, set, update, push } from "firebase/database";
import { db } from "../composables/useFirebase";
import { ref } from "vue";
import Swal from "sweetalert2";

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

// 🚀 Performance: Regex patterns at module level to prevent recreation on every message
const multiBuyRegex = /^(\d+(?:\s+\d+)+)(?:\s+(.*))?$/; // Multi-Buy: "26 38 74" or "26 38 74 ClientName"
const adminProxyRegex = /^(\d+)\s+(.+)$/;
const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม/;
const questionRegex =
  /อก|เอว|ยาว|ราคา|เท่าไหร่|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์/;
const pureNumberRegex = /^\s*(\d+)\s*$/;
const explicitBuyRegex = /(?:F|f|cf|CF|รับ|เอา)\s*(\d+)/;
const dashBuyRegex = /^(?:.+?)\s*[-]\s*(\d+)$/;
const cancelRegex = /(?:^|\s)(?:(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด)\s*[-]?\s*(\d+)|(\d+)\s*(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด))/i; // Flexible: "cancel 46" or "46 cancel"
const implicitBuyRegex = /(?:^|\s)(?:รับ|เอา|F|f|cf|CF)(?:\s|$)/;

// ✅ Toast Notification Mixin
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export function useChatProcessor() {
  const stockStore = useStockStore();
  const chatStore = useChatStore();
  const systemStore = useSystemStore();
  const { analyzeChat } = useOllama();
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

    // 0. Admin Proxy Logic (Highest Priority for Admin)
    let forcedOwnerName = null;

    // 1. Shipping / Transfer (Highest Priority for flow control)

    // 2. Questions (Preserve existing logic)

    // 3. Strict "Pure Number" Logic (Pattern: just digits)

    // 4. Explicit "Buy Pattern" Logic (Prefix + Number)
    // Matches: F 50, cf 50, รับ 50, f50 (case insensitive)

    // 5. Dash Buy Pattern (Name-Number)

    // 6. Cancel Logic (Refined - supports dash)

    // 7. Implicit "Current Item" Logic (Keyword ONLY)
    // Matches: "รับ", "เอา", "F", "cf" (standing alone or surrounded by spaces)


    // --- Execution ---

    // 🔥 HIGHEST PRIORITY: Multi-Buy Logic (before all other checks)
    // Handles "26 38 74" or "26 38 74 ClientName"
    const matchMultiBuy = msg.match(multiBuyRegex);
    if (matchMultiBuy) {
      const numbersStr = matchMultiBuy[1]; // "26 38 74"
      const proxyName = matchMultiBuy[2] ? matchMultiBuy[2].trim() : null; // Optional client name

      // Parse all IDs
      const itemIds = numbersStr.split(/\s+/).map(n => parseInt(n)).filter(n => n > 0 && n <= stockStore.stockSize);

      if (itemIds.length > 0) {
        // Determine owner name and UID
        let ownerName = displayName;
        let ownerUid = uid;

        if (proxyName && isAdmin) {
          // Admin Proxy Mode
          ownerName = proxyName;
          ownerUid = "multi-proxy-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
        }

        // Process all orders
        for (const itemId of itemIds) {
          await stockStore.processOrder(
            itemId,
            ownerName,
            ownerUid,
            "chat",
            null, // No price for multi-buy
            "multi-buy"
          );
        }

        // ✅ Show Success Toast
        Toast.fire({
          icon: 'success',
          title: `✅ ตัดรหัส ${itemIds.join(', ')} ให้ ${ownerName} แล้ว`
        });

        // ✅ Push message to Firebase (Listener will update UI)
        const chatRef = dbRef(db, `chats/${systemStore.currentVideoId}`);
        push(chatRef, {
          id: item.id,
          text: msg,
          authorName: realName,
          displayName,
          realName: realName,
          uid: uid,
          avatar,
          color: stringToColor(uid),
          isAdmin,
          type: "buy",
          detectionMethod: "multi-buy",
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        });

        // Play audio once
        playDing();
        const { speak } = useAudio();
        speak(displayName, `${msg} ... ทั้งหมด ${itemIds.length} รายการ`);

        // Exit early - don't process further
        return;
      }
    }

    // Special Check for Admin Proxy (Single Item)
    if (isAdmin && adminProxyRegex.test(msg)) {
      const matchProxy = msg.match(adminProxyRegex);
      intent = "buy";
      targetId = parseInt(matchProxy[1]);
      forcedOwnerName = matchProxy[2].trim();
      method = "admin-proxy";
    }
    else if (shippingRegex.test(msg)) {
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
      const matchDash = msg.match(dashBuyRegex);
      const matchCancel = msg.match(cancelRegex);
      const matchImplicit = msg.match(implicitBuyRegex);

      if (matchCancel) {
        // Priority: Cancel (Flexible - supports both "cancel 46" and "46 cancel")
        intent = "cancel";
        // Check both groups: Group 1 for prefix pattern, Group 2 for suffix pattern
        targetId = parseInt(matchCancel[1] || matchCancel[2]);
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
      } else if (matchDash) {
        // Priority: Dash Buy (Name-Number pattern)
        intent = "buy";
        targetId = parseInt(matchDash[1]);
        method = "regex-dash";
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
        const analyzeMsg = msg;
        // Optimization: If Admin Proxy handled it, we don't go here.
        // But if we did enter here, normal flow resumes.
        const aiResult = await analyzeChat(analyzeMsg);
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

    // 4. ✅ Push message to Firebase (Listener will update UI)
    const chatRef = dbRef(db, `chats/${systemStore.currentVideoId}`);
    push(chatRef, {
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

      if (forcedOwnerName) {
        // Admin Proxy Mode 
        ownerName = forcedOwnerName;
        ownerUid = "proxy-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
      } else if (isAdmin) {
        // Regular Admin Mode (buying for self or using F syntax)
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

      // ✅ Show Success Toast (Non-blocking)
      Toast.fire({
        icon: 'success',
        title: `✅ ตัดรหัส ${targetId} ให้ ${ownerName} แล้ว`
      });

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

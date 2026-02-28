import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useNicknameStore } from "../stores/nickname";

import { useAudio } from "./useAudio";
import { ref as dbRef, onValue, set, update, push } from "firebase/database";
import { db } from "../composables/useFirebase";
import { ref } from "vue";
import { extractMessageRuns } from "../services/YouTubeLiveChat";
import Swal from "sweetalert2";
import { watch } from "vue";

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
        const newNick =
          typeof data[msg.uid] === "object"
            ? data[msg.uid].nick
            : data[msg.uid];
        if (msg.displayName !== newNick) {
          msg.displayName = newNick;
        }
      }
    });
  }
});

// 🚀 Performance: Regex patterns at module level
const multiBuyRegex = /^(\d+(?:[\s,]+\d+)+)(?:\s+(.*))?$/;
const adminProxyNumFirstRegex = /^(\d+)\s+(.+)$/;
const adminProxyNameFirstRegex = /^([^\d]+)\s+(\d+)$/;
const shippingRegex = /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม/;
const questionRegex =
  /อก|เอว|สะโพก|ยาว|ราคา|เท่าไหร่|เท่าไร|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์/;
const pureNumberRegex = /^\s*(\d+)\s*$/;
const explicitBuyRegex =
  /(?:(?:F|f|cf|CF|รับ|เอา)\s*(\d+))|(?:(\d+)\s*(?:F|f|cf|CF|รับ|เอา))/i;
const numberWithPoliteRegex =
  /^(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|พี่|ป้า|น้า|อา|แม่|น้อง|ฝาก|\/\/)/;
const dashBuyRegex = /^([^-]+)\s*[-]\s*(\d+)$/;
const cancelRegex =
  /(?:^|\s)(?:(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด)\s*[-]?\s*(\d+)|(\d+)\s*(?:cc|cancel|ยกเลิก|ไม่เอา|หลุด))/i;
const implicitBuyRegex = /(?:^|\s)(?:รับ|เอา|F|f|cf|CF)(?:\s|$)/;

// ✅ Thai Numeral → Arabic Digit Converter
function thaiToArabic(text) {
  return text.replace(/[๐-๙]/g, (ch) => ch.charCodeAt(0) - 0x0e50);
}

// ✅ Toast Notification Mixin
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

// ✅ Concurrency Lock for Chat Processing
const processingLocks = new Set();

export function useChatProcessor() {
  const stockStore = useStockStore();
  const chatStore = useChatStore();
  const systemStore = useSystemStore();
  const nicknameStore = useNicknameStore();

  const { queueSpeech, queueAudio, playSfx, resetVoice, unlockAudio } =
    useAudio();

  // ✅ Local State for Implicit Buy Logic
  const currentOverlayItem = ref(null);

  // ✅ Watch & Listen for Overlay Changes
  function setupOverlayListener() {
    if (!systemStore.currentVideoId) return;

    const overlayRef = dbRef(
      db,
      `overlay/${systemStore.currentVideoId}/current_item`,
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
  watch(
    () => systemStore.currentVideoId,
    (newId) => {
      if (newId) setupOverlayListener();
    },
  );

  // extractMessageRuns is now imported from ../services/YouTubeLiveChat

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

    // ✅ Normalize Thai numerals → Arabic digits for regex matching
    const normalizedMsg = thaiToArabic(msg);

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

    // ✅ Get phonetic name for TTS (separate from display name)
    const phoneticName = nicknameStore.getPhoneticName(uid, displayName);

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
    const matchMultiBuy = normalizedMsg.match(multiBuyRegex);
    if (matchMultiBuy) {
      const numbersStr = matchMultiBuy[1]; // "26 38 74"
      const proxyName = matchMultiBuy[2] ? matchMultiBuy[2].trim() : null; // Optional client name

      // Parse all IDs (Allow IDs > stockSize)
      const itemIds = numbersStr
        .split(/\s+/)
        .map((n) => parseInt(n))
        .filter((n) => n > 0);

      if (itemIds.length > 0) {
        // ✅ Auto-Expand Stock for Multi-Buy
        const maxId = Math.max(...itemIds);
        if (maxId > stockStore.stockSize) {
          const newSize = Math.ceil(maxId / 10) * 10;
          await stockStore.updateStockSize(newSize);
          logger.log(`📦 Auto-expanded stock to ${newSize} for multi-buy`);
        }
        // Determine owner name and UID
        let ownerName = displayName;
        let ownerUid = uid;

        if (proxyName && isAdmin) {
          // Admin Proxy Mode
          ownerName = proxyName;
          ownerUid =
            "multi-proxy-" +
            Date.now() +
            "-" +
            Math.random().toString(36).substr(2, 5);
        }

        // Process all orders
        for (const itemId of itemIds) {
          if (processingLocks.has(itemId)) {
            logger.warn(
              `Item ${itemId} is being processed. Skipping in multi-buy.`,
            );
            continue;
          }

          processingLocks.add(itemId);
          try {
            await stockStore.processOrder(
              itemId,
              ownerName,
              ownerUid,
              "chat",
              null, // No price for multi-buy
              "multi-buy",
            );
          } finally {
            processingLocks.delete(itemId);
          }
        }

        // ✅ Show Success Toast
        Toast.fire({
          icon: "success",
          title: `✅ ตัดรหัส ${itemIds.join(", ")} ให้ ${ownerName} แล้ว`,
        });

        // ✅ Push message to Firebase (Listener will update UI)
        chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
          id: item.id,
          text: msg,
          messageRuns: extractMessageRuns(item),
          authorName: realName,
          displayName,
          phoneticName,
          realName: realName,
          uid: uid,
          avatar,
          color: stringToColor(uid),
          isAdmin,
          type: "buy",
          detectionMethod: "multi-buy",
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        });

        // ✅ Queue SFX + TTS (non-blocking)
        queueAudio(
          "success",
          phoneticName,
          `${msg} ... ทั้งหมด ${itemIds.length} รายการ`,
        );

        // Exit early - don't process further
        return;
      }
    }

    // 🔴 CANCEL CHECK
    const earlyMatchCancel = normalizedMsg.match(cancelRegex);
    if (earlyMatchCancel) {
      intent = "cancel";
      targetId = parseInt(earlyMatchCancel[1] || earlyMatchCancel[2]);
      method = "regex-cancel";
    } else if (shippingRegex.test(normalizedMsg)) {
      intent = "shipping";
      method = "regex-ship";
    } else if (questionRegex.test(normalizedMsg)) {
      method = "question-skip";
    } else {
      // 🟢 Regex Matching
      const matchPure = normalizedMsg.match(pureNumberRegex);
      const matchExplicit = normalizedMsg.match(explicitBuyRegex);
      const matchPolite = normalizedMsg.match(numberWithPoliteRegex);
      const matchDash = normalizedMsg.match(dashBuyRegex);
      const matchImplicit = normalizedMsg.match(implicitBuyRegex);

      // ✅ Check Admin Proxy (Both Name-First and Number-First)
      let matchAdminNumFirst = isAdmin
        ? normalizedMsg.match(adminProxyNumFirstRegex)
        : null;
      let matchAdminNameFirst = isAdmin
        ? normalizedMsg.match(adminProxyNameFirstRegex)
        : null;

      if (matchAdminNameFirst) {
        intent = "buy";
        targetId = parseInt(matchAdminNameFirst[2]);
        forcedOwnerName = matchAdminNameFirst[1].trim();
        method = "admin-proxy-name-first";
      } else if (matchAdminNumFirst) {
        intent = "buy";
        targetId = parseInt(matchAdminNumFirst[1]);
        forcedOwnerName = matchAdminNumFirst[2].trim();
        method = "admin-proxy-num-first";
      } else if (matchPure) {
        intent = "buy";
        targetId = parseInt(matchPure[1]);
        method = "regex-pure";
      } else if (matchExplicit) {
        intent = "buy";
        targetId = parseInt(matchExplicit[1] || matchExplicit[2]);
        method = "regex-explicit";
      } else if (matchPolite) {
        intent = "buy";
        targetId = parseInt(matchPolite[1]);
        method = "regex-polite";
      } else if (matchDash) {
        intent = "buy";
        targetId = parseInt(matchDash[2]);
        method = "regex-dash";
      } else if (matchImplicit) {
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

    // 3. AI Analysis — Ollama removed, Cloud API handles voice detection only.
    //    Chat-level AI fallback is intentionally disabled.
    if (!intent && !method && systemStore.isAiCommander) {
      // No local AI fallback — rely on regex-based detection above.
    }

    // 4. ✅ Push message to Firebase (Listener will update UI)
    chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
      id: item.id,
      text: msg,
      messageRuns: extractMessageRuns(item),
      authorName: realName,
      displayName,
      phoneticName,
      realName: realName,
      uid: uid,
      avatar,
      color: stringToColor(uid),
      isAdmin,
      type: intent,
      detectionMethod: method,
      timestamp: new Date(item.snippet.publishedAt).getTime(),
    });

    // 5. Process Order & Audio Logic (Updated with SFX)
    if (intent === "buy" && targetId > 0) {
      // ✅ Auto-Expand Stock for Single Buy
      if (targetId > stockStore.stockSize) {
        const newSize = Math.ceil(targetId / 10) * 10;
        await stockStore.updateStockSize(newSize);
        logger.log(`📦 Auto-expanded stock to ${newSize} for item ${targetId}`);
      }

      // --- Buy Logic ---
      let ownerName = displayName;
      let ownerUid = uid;

      if (forcedOwnerName) {
        // Admin Proxy Mode
        ownerName = forcedOwnerName;
        ownerUid =
          "proxy-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5);
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
          ownerName = displayName;
          ownerUid = "admin-proxy-" + Date.now();
        }
      }

      try {
        if (processingLocks.has(targetId)) {
          throw new Error("คิวเต็ม/ซ้ำแล้ว");
        }
        processingLocks.add(targetId);

        // ✅ Try to process order
        const result = await stockStore.processOrder(
          targetId,
          ownerName,
          ownerUid,
          "chat",
          targetPrice,
          method,
        );

        if (
          !result.success ||
          (result.action !== "claimed" && result.action !== "queued")
        ) {
          throw new Error(
            result.error ||
              (result.action === "already_owned"
                ? "ซ้ำแล้ว"
                : "เต็มแล้ว/อื่นๆ"),
          );
        }

        // ✅ Success - Show Toast
        Toast.fire({
          icon: "success",
          title: `✅ ตัดรหัส ${targetId} ให้ ${ownerName} แล้ว`,
        });

        // ✅ Queue SUCCESS SFX + TTS (non-blocking)
        queueAudio("success", phoneticName, msg);
      } catch (error) {
        // ✅ Error - Item might be sold out or other issue
        if (error.message && (error.message.includes("เต็มแล้ว") || error.message.includes("ซ้ำแล้ว"))) {
          logger.warn("⚠️ Order skipped:", error.message);
        } else {
          logger.error("❌ Order failed:", error);
        }

        Toast.fire({
          icon: "error",
          title: `❌ ตัดไม่ได้: ${error.message || "เต็มแล้ว"}`,
        });

        // ✅ Queue ERROR SFX + TTS (non-blocking)
        queueAudio("error", phoneticName, msg);
      } finally {
        processingLocks.delete(targetId);
      }
    } else if (intent === "cancel" && targetId > 0) {
      // --- Cancel Logic ---
      const currentItem = stockStore.stockData[targetId];
      if (isAdmin || (currentItem && currentItem.uid === uid)) {
        await stockStore.processCancel(targetId);

        // ✅ Queue CANCEL SFX + TTS (non-blocking)
        queueAudio("cancel", phoneticName, msg);
      }
    } else {
      // --- Other Intents / General Chat ---
      if (intent === "shipping") {
        const shippingRef = dbRef(
          db,
          `shipping/${systemStore.currentVideoId}/${uid}`,
        );
        update(shippingRef, {
          ready: true,
          timestamp: Date.now(),
          lastMessage: msg,
        }).catch((e) => logger.error("Shipping update error:", e));

        const historyRef = dbRef(
          db,
          `shipping/${systemStore.currentVideoId}/${uid}/history`,
        );
        push(historyRef, {
          text: msg,
          timestamp: Date.now(),
          type: "user",
        });

        queueAudio(null, phoneticName, msg);
      } else {
        // Read EVERYTHING else
        queueAudio(null, phoneticName, msg);
      }
    }
  }

  return { processMessage };
}

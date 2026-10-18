import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system";
import { useNicknameStore } from "../stores/nickname";
import { useVoiceLearningStore } from "../stores/voiceLearning";

import { useAudio } from "./useAudio";
import {
  ref as dbRef,
  onValue,
  set,
  update,
  push,
  get,
  onChildAdded,
  query,
  limitToLast,
} from "firebase/database";
import { db } from "../composables/useFirebase";
import { ref, computed } from "vue";
import { extractMessageRuns } from "../services/YouTubeLiveChat";
import Swal from "sweetalert2";
import { watch } from "vue";
import { logger } from "../utils/logger";
import { resolveDeliveryUid } from "../utils/deliverySync";
import { sanitizeDbKey } from "../utils/dbUtils";

import {
  MAX_ITEM_ID,
  multiBuyRegex,
  adminProxyNumFirstRegex,
  adminProxyNameFirstRegex,
  nonNameNounsRegex,
  nonNameWordsRegex,
  adminStopwordsRegex,
  backdatedNoteRegex,
  adminSizeSelectionNoteRegex,
  sizeRangeRegex,
  quantityUnitRegex,
  pricePatternRegex,
  shippingRegex,
  holdRegex,
  questionRegex,
  pureNumberRegex,
  fuzzyNumberRegex,
  tryRegex,
  explicitBuyRegex,
  numberWithPoliteRegex,
  dashBuyRegex,
  customerNameNumRegex,
  numAndDescRegex,
  cancelKeywordRegex,
  cancelWithNumRegex,
  cancelNumFirstRegex,
  cancelNameKeywordNumRegex,
  conditionalCancelGuardRegex,
  standalonePassRegex,
  shipDayOfWeekRegex,
  calcNextDayOfWeekDate,
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
  numberWithQuestionRegex,
  negationGuardRegex,
  thaiToArabic,
  stringToColor,
  isAdminUser,
  isDateMismatch,
  extractAdminCustomerName,
  sanitizeAdminCustomerName,
  extractCustomerSelfName,
  isHandleOrNonThaiName,
  isAdminSizeSelectionNote,
  isMultiBuyBlocked,
  parseCancelIds,
} from "../utils/chatParserUtils";

// 🚀 Pre-compiled Module-Scoped Regexes (Zero allocation per chat message)
const SPLIT_NUMS_REGEX = /[\s,_]+/;
const BACKDATED_ORDER_REGEX = /เมื่อวาน|เมือวาน|ย้อนหลัง|รอบเมื่อวาน/i;
const STRIP_LEADING_NON_LETTER_REGEX = /^[^\u0E00-\u0E7Fa-zA-Z]+/;
const STRIP_EDGE_PUNCT_REGEX = /^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g;
const SHIP_TMR_REGEX = /ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/;
const SHIP_DATE_REGEX = /ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/;
const SHIP_NOW_REGEX = /ส่งเลย|ส่งวันนี้|ส่งครับ|ส่งค่ะ|ส่งด้วย|พร้อมส่ง|ขอส่ง|แจ้งส่ง|รวมส่ง|(?:^|[^\u0E00-\u0E7F])ส่ง(?:$|[^\u0E00-\u0E7F\w])/;
const TRANSFER_SLIP_REGEX = /โอนแล้ว|แจ้งโอน|สลิป/;
const STRIP_PREFIX_OF_REGEX = /^(?:ของพี่|ของ|พี่)\s*/;
const STRIP_BUY_VERB_REGEX = /f|cf|รับ|เอา|=/gi;
const PURE_DIGITS_TEST_REGEX = /^\d+$/;
const DOT_GLOBAL_REGEX = /\./g;

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
let _lastVideoId = null; // ✅ Track current session for auto-clear

// 🚀 Micro-Batching: Queue incoming messages within 80-100ms window
// to reduce Pinia reactivity churn and batch database transactions when chats flood in
const incomingBatchQueue = [];
let isBatchProcessing = false;
let batchFlushTimer = null;
const MICRO_BATCH_DELAY_MS = 80;

export function useChatProcessor() {
  const stockStore = useStockStore();
  const chatStore = useChatStore();
  const systemStore = useSystemStore();
  const nicknameStore = useNicknameStore();

  const { queueAudio, playSfx, resetVoice } = useAudio();

  // 🚀 Phase 1.3: Memoized name→uid reverse lookup (computed — recomputes only when nicknames change)
  // แทนที่ getNameToUidMap() ที่ O(n) ทุกครั้งที่มี shipping message
  const nameToUidMap = computed(() => {
    const map = {};
    const data = nicknameStore.nicknames || {};
    Object.keys(data).forEach((uid) => {
      const entry = data[uid];
      const nick = typeof entry === "object" ? entry.nick : entry;
      if (nick) {
        map[nick.trim().toLowerCase()] = uid;
      }
    });
    return map;
  });

  let batchSeqCounter = 0;

  function processMessage(item) {
    return new Promise((resolve, reject) => {
      batchSeqCounter++;
      const timestamp = item?.snippet?.publishedAt
        ? new Date(item.snippet.publishedAt).getTime()
        : Date.now();

      incomingBatchQueue.push({
        item,
        resolve,
        reject,
        timestamp,
        seq: batchSeqCounter,
      });

      if (!isBatchProcessing && !batchFlushTimer) {
        batchFlushTimer = setTimeout(() => {
          batchFlushTimer = null;
          drainIncomingBatch();
        }, MICRO_BATCH_DELAY_MS);
      }
    });
  }

  async function drainIncomingBatch() {
    if (isBatchProcessing || incomingBatchQueue.length === 0) return;
    isBatchProcessing = true;

    try {
      // ✅ Strict FIFO / Timestamp Ordering: Sort batch by publishedAt timestamp, then arrival sequence
      incomingBatchQueue.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);

      while (incomingBatchQueue.length > 0) {
        const { item, resolve, reject } = incomingBatchQueue.shift();
        try {
          // ✅ Step-by-step Synchronous execution: await each message to completely finish stock booking transactions before next
          const res = await processSingleMessage(item);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      }
    } finally {
      isBatchProcessing = false;
      if (incomingBatchQueue.length > 0 && !batchFlushTimer) {
        batchFlushTimer = setTimeout(() => {
          batchFlushTimer = null;
          drainIncomingBatch();
        }, MICRO_BATCH_DELAY_MS);
      }
    }
  }

  async function processSingleMessage(item) {
    // ✅ Auto-clear session state when video changes
    if (systemStore.currentVideoId !== _lastVideoId) {
      _lastVideoId = systemStore.currentVideoId;
      processingLocks.clear();
      incomingBatchQueue.length = 0;
      logger.log(`🔄 Session state cleared for new video: ${_lastVideoId}`);
    }

    // 1. Validate Message
    if (!item.snippet || !item.authorDetails) return;

    // ✅ Deduplication: Skip messages that have already been processed and synced
    if (item.id && chatStore.seenMessageIds[item.id]) {
      logger.log(`⚠️ Message ${item.id} already processed. Skipping.`);
      return;
    }

    let msg = item.snippet.displayMessage || "";
    if (!msg) {
      if (item.snippet.superStickerDetails) {
        msg = item.snippet.superStickerDetails.superStickerMetadata?.altText || "ส่งสติกเกอร์";
      } else if (item.snippet.superChatDetails?.userComment) {
        msg = item.snippet.superChatDetails.userComment;
      } else if (item.snippet.memberMilestoneChatDetails?.userComment) {
        msg = item.snippet.memberMilestoneChatDetails.userComment;
      }
    }

    let cachedMessageRuns = null;
    const getMessageRuns = () =>
      cachedMessageRuns || (cachedMessageRuns = extractMessageRuns(item));

    if (!msg) {
      // ถ้าไม่มี displayMessage → ลอง fallback จาก messageRuns (emoji-only etc.)
      const runs = getMessageRuns();
      const fallbackText = runs
        .map((r) => r.text || "")
        .join("")
        .trim();
      if (fallbackText) {
        msg = fallbackText;
      } else if (runs.some((r) => r.emoji || r.image)) {
        msg = "ส่งสติกเกอร์";
      } else if (item.snippet?.type === "superStickerEvent") {
        msg = item.snippet?.superStickerDetails?.superStickerMetadata?.altText || "ส่งสติกเกอร์";
      } else {
        return; // ไม่มีข้อความจริงๆ → ข้าม
      }
    }

    // ✅ Normalize Thai numerals → Arabic digits for regex matching
    const normalizedMsg = thaiToArabic(msg);

    const uid = item.authorDetails.channelId;
    const realName = item.authorDetails.displayName;
    const avatar =
      item.authorDetails.profileImageUrl ||
      "https://www.gstatic.com/youtube/img/creator/avatars/sample_avatar.png";

    // 🟢 ตรวจสอบว่าเป็น Voice Chat หรือไม่
    const isVoiceChat =
      uid === "voice-chat-uid" || (uid && uid.includes("voice-chat"));

    if (isVoiceChat) {
      if (!systemStore.isPriceDetector) {
        logger.debug("Skipped processing voice message - this device is not the active price detector.");
        return;
      }

      // Initialize voice learning store and dynamic pattern extraction
      const voiceLearningStore = useVoiceLearningStore();
      voiceLearningStore.initVoicePatterns();

      // 🚀 Phase 2.2: ใช้ cached compiled regex แทนการ new RegExp() ทุก message
      // compiledVoiceRegex เป็น computed ที่ recompile เฉพาะเมื่อ keywords เปลี่ยนเท่านั้น
      const { r1, r2, r3, r4 } = voiceLearningStore.compiledVoiceRegex;

      const match = normalizedMsg.match(r1) ||
                    normalizedMsg.match(r2) ||
                    normalizedMsg.match(r3) ||
                    normalizedMsg.match(r4);

      if (match) {
        const itemId = parseInt(match[1]);
        const priceVal = parseInt(match[2]);

        if (itemId > 0 && itemId <= MAX_ITEM_ID && priceVal >= 0) {
          // Update Stock Price (pass isAuto = true to bypass self-learning loop)
          await stockStore.updateStockPrice(itemId, priceVal, true);
          logger.success(`🎙️ Voice Price Detected: Item ${itemId} set to ฿${priceVal}`);

          // Post a special price_update message to chat
          chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
            id: item.id || `voice-price-${Date.now()}`,
            text: msg,
            authorName: "ระบบเสียงสด (AI)",
            displayName: "ตั้งราคาอัตโนมัติ 💰",
            realName: "เสียงพูดแม่ค้า",
            uid: uid,
            avatar: avatar,
            isAdmin: true,
            type: "price_update",
            sfxType: "success",
            ttsText: `รหัส ${itemId} ตั้งราคา ${priceVal} บาท`,
            detectionMethod: "voice-price-extractor",
            timestamp: new Date(item.snippet.publishedAt).getTime(),
          });
          return;
        }
      }
    }

    // Check Nickname
    let displayName = realName;
    let isNewCustomer = isVoiceChat ? false : true;
    if (!isVoiceChat && nicknameStore.hasNickname(uid, realName)) {
      isNewCustomer = false;
      displayName = nicknameStore.getNickname(uid, realName);
    }

    // ✅ Get phonetic name for TTS (separate from display name)
    const phoneticName = nicknameStore.getPhoneticName(uid, displayName);

    const isAdmin = isVoiceChat || isAdminUser(displayName, realName);

    // ✅ Prepare TTS Message (เอาข้อความแนะนำยาวๆ ออก ไม่อ่านออกเสียงแล้ว)
    let ttsMessage = msg;
    const isNewCustomerChat = isNewCustomer && !isAdmin;

    // Determine intent
    let intent = null;
    let targetId = null;
    let targetPrice = null;
    let method = null;
    const stockSize = stockStore.stockSize;

    // --- LOGIC V2: Prioritized Flow ---

    // 0. Admin Proxy Logic (Highest Priority for Admin)
    let forcedOwnerName = null;

    // 💡 Auto-learn nickname from customer self-introduction (e.g. "บุญญาภาค่ะ", "บุญญาภาครับ")
    if (!isAdmin && uid) {
      const selfName = extractCustomerSelfName(normalizedMsg);
      if (selfName) {
        const hasExistingNick =
          nicknameStore.hasNickname(uid, realName) ||
          nicknameStore.hasNickname(uid, displayName);

        // Rule 1: Never overwrite existing nickname (respect CUSTOM_NICKNAME_OVERRIDE.md)
        if (!hasExistingNick) {
          const safeUid = sanitizeDbKey(uid);
          update(dbRef(db, `nicknames/${safeUid}`), {
            nick: selfName,
            phonetic: selfName,
            realName: realName,
          }).catch((e) => logger.warn("Auto-learn nickname error:", e));
          displayName = selfName;
        }
      }
    }

    // --- Execution ---

    // 🛑 Admin Stopwords Guard: (e.g. "กำลัง รอแแแ", "รอแปป", "เทส")
    if (isAdmin && adminStopwordsRegex.test(normalizedMsg)) {
      chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
        id: item.id,
        text: msg,
        messageRuns: getMessageRuns(),
        authorName: realName,
        displayName,
        phoneticName,
        realName,
        uid,
        avatar,
        color: stringToColor(uid),
        isAdmin: true,
        type: "general",
        sfxType: null,
        ttsText: "",
        detectionMethod: "admin-stopword",
        timestamp: new Date(item.snippet.publishedAt).getTime(),
      });
      return;
    }

    // 🗓️ Admin Yesterday / Backdated Debt Note (e.g. "หนิง เมื่อวาน", "หนิง เมื่อวาน 41 43", "ตุ๊ก บำรุงรัตน์ เมือวาน 32")
    if (isAdmin && backdatedNoteRegex.test(normalizedMsg) && !tryRegex.test(normalizedMsg)) {
      const customerName = extractAdminCustomerName(normalizedMsg);
      chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
        id: item.id,
        text: msg,
        messageRuns: getMessageRuns(),
        authorName: realName,
        displayName: customerName ? `${customerName} (โน้ตเมื่อวานโดย ${displayName})` : displayName,
        proxyCustomerName: customerName,
        phoneticName: customerName ? nicknameStore.getPhoneticName(null, customerName) : phoneticName,
        realName,
        uid,
        avatar,
        color: stringToColor(uid),
        isAdmin: true,
        isAdminNote: true,
        noteCategory: "yesterday",
        type: "note",
        sfxType: null,
        ttsText: "",
        detectionMethod: "admin-yesterday-note",
        timestamp: new Date(item.snippet.publishedAt).getTime(),
      });
      return;
    }

    // 📝 Admin Size Selection / Request Note (e.g. "พรจันทร์ อยสกได้ไซส์52 สัก3ตัว เล", "พรจันทร์ รับ", "พรจันทร์ เอา", "พรจันทร์ สีฟ้า", "อำไพ เอาตัวอก56", "3xl อำไพ", "เสื้อเชิ้ต อก56 สมฤทธิ์")
    if (isAdmin && isAdminSizeSelectionNote(normalizedMsg)) {
      const customerName = extractAdminCustomerName(normalizedMsg);
      if (customerName) {
        chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
          id: item.id,
          text: msg,
          messageRuns: getMessageRuns(),
          authorName: realName,
          displayName: `${customerName} (โน้ตโดย ${displayName})`,
          proxyCustomerName: customerName,
          phoneticName: nicknameStore.getPhoneticName(null, customerName),
          realName,
          uid,
          avatar,
          color: stringToColor(uid),
          isAdmin: true,
          isAdminNote: true,
          noteCategory: "size-selection",
          type: "note",
          sfxType: null,
          ttsText: "",
          detectionMethod: "admin-note",
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        });
        return;
      }
    }

    // 🔥 HIGHEST PRIORITY: Multi-Buy Logic (Guarded against cancel, try, question, negation, shipping, and size/price queries)
    // Handles "26 38 74", "26 38 74 ClientName", or "มะระ เอา 19 13 10"
    const matchMultiBuy = !isMultiBuyBlocked(normalizedMsg)
      ? normalizedMsg.match(multiBuyRegex)
      : null;
    if (matchMultiBuy) {
      const numbersStr = matchMultiBuy[2] || matchMultiBuy[1]; // "26 38 74"
      const proxyName =
        matchMultiBuy[1] && matchMultiBuy[2]
          ? matchMultiBuy[1].trim()
          : matchMultiBuy[3]
          ? matchMultiBuy[3].trim()
          : null; // Optional client name (prefix or suffix)

      // Parse all IDs (Allow IDs > stockSize, but cap at MAX_ITEM_ID)
      const itemIds = numbersStr
        .split(SPLIT_NUMS_REGEX)
        .map((n) => parseInt(n))
        .filter((n) => n > 0 && n <= MAX_ITEM_ID);

      if (itemIds.length > 0) {
        // ✅ Check Date Mismatch (If date specified in message does not match live date -> sync message & skip stock booking)
        const msgTimestamp = item.snippet?.publishedAt
          ? new Date(item.snippet.publishedAt).getTime()
          : Date.now();
        if (isDateMismatch(normalizedMsg, msgTimestamp)) {
          logger.log(`🗓️ Skipping multi-buy: date in "${msg}" does not match live date`);
          Toast.fire({
            icon: "warning",
            title: `🗓️ ข้ามการจอง: วันที่ในแชทไม่ตรงกับวันไลฟ์สด`,
            toast: true,
          });
          await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
            id: item.id,
            text: msg,
            messageRuns: getMessageRuns(),
            authorName: realName,
            displayName,
            phoneticName,
            realName,
            uid,
            avatar,
            color: stringToColor(uid),
            isAdmin,
            type: isAdmin ? "note" : "general",
            sfxType: "error",
            ttsText: isVoiceChat ? "" : ttsMessage,
            detectionMethod: "date-mismatch-skip",
            timestamp: msgTimestamp,
          });
          return;
        }

        // ✅ Auto-Expand Stock for Multi-Buy
        const maxId = Math.max(...itemIds);
        if (maxId > stockStore.stockSize) {
          const newSize = Math.ceil(maxId / 10) * 10;
          await stockStore.updateStockSize(newSize);
          logger.log(`📦 Auto-expanded stock to ${newSize} for multi-buy`);
          Toast.fire({ icon: "info", title: `📦 ขยายรายการเป็น ${newSize} อัตโนมัติ`, toast: true });
        }
        // Determine owner name and UID
        let ownerName = displayName;
        let ownerUid = uid;

        const isBackdatedOrder = BACKDATED_ORDER_REGEX.test(normalizedMsg);

        if (proxyName && isAdmin) {
          // Admin Proxy Mode
          // 🆕 v4.67.0: Sanitize proxy name — strip leading punctuation and action words
          ownerName = sanitizeAdminCustomerName(proxyName) || proxyName.replace(STRIP_LEADING_NON_LETTER_REGEX, "").trim();
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
              isBackdatedOrder,
            );
          } finally {
            processingLocks.delete(itemId);
          }
        }

        Toast.fire({
          icon: "success",
          title: `✅ ตัดรหัส ${itemIds.join(", ")} ให้ ${ownerName} แล้ว`,
          toast: true,
        });

        // ✅ Push message to Firebase (Listener will update UI)
        const isProxyMulti = Boolean(proxyName && isAdmin);
        const effectivePhoneticName =
          isProxyMulti && ownerName
            ? nicknameStore.getPhoneticName(ownerUid, ownerName)
            : phoneticName;

        chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
          id: item.id,
          text: msg,
          messageRuns: getMessageRuns(),
          authorName: realName,
          displayName: isProxyMulti ? `${ownerName} (โดย ${displayName})` : displayName,
          proxyCustomerName: isProxyMulti ? ownerName : null,
          proxyUid: isProxyMulti ? ownerUid : null,
          phoneticName: effectivePhoneticName,
          realName: realName,
          uid: uid,
          avatar,
          color: stringToColor(uid),
          isAdmin,
          type: "buy",
          sfxType: isNewCustomerChat ? "bell" : "success",
          ttsText: isVoiceChat
            ? ""
            : `${ttsMessage} ... ทั้งหมด ${itemIds.length} รายการ`,
          detectionMethod: "multi-buy",
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        });

        // Exit early - don't process further
        return;
      }
    }

    // 🔴 CANCEL CHECK (Supports single or multi-item cancel e.g. "ยกเลิก 12 15", "12 มะระ ยกเลิก")
    let isCancel = false;
    let cancelTargetName = null;
    let cancelIds = [];

    if (!conditionalCancelGuardRegex.test(normalizedMsg)) {
      // 1. Check number first patterns (e.g. "12 ยกเลิก", "12 มะระ ยกเลิก", "12 15 ยกเลิก")
      const matchNumFirst = normalizedMsg.match(cancelNumFirstRegex);
      const parsedNumFirst = matchNumFirst ? parseCancelIds(matchNumFirst[1]) : [];
      if (parsedNumFirst.length > 0) {
        isCancel = true;
        cancelIds = parsedNumFirst;
        targetId = parsedNumFirst[0];
        if (matchNumFirst[2]) {
          cancelTargetName = sanitizeAdminCustomerName(matchNumFirst[2]);
        }
        method = "regex-cancel-num-first";
      }

      // 2. Check name + cancel keyword + number (e.g. "มะระ ยกเลิก 12", "มะระ ยกเลิก 12 15")
      if (!isCancel) {
        const matchNameKeywordNum = normalizedMsg.match(cancelNameKeywordNumRegex);
        const parsedNameFirst = matchNameKeywordNum ? parseCancelIds(matchNameKeywordNum[2]) : [];
        if (parsedNameFirst.length > 0) {
          isCancel = true;
          cancelIds = parsedNameFirst;
          targetId = parsedNameFirst[0];
          cancelTargetName = sanitizeAdminCustomerName(matchNameKeywordNum[1]);
          method = "regex-cancel-name-first";
        }
      }

      // 3. Check cancel with number patterns (keyword first, e.g. "ยกเลิก 12", "ยกเลิก 12 15", "ยกเลิก 12 มะระ")
      if (!isCancel) {
        const matchWithNum = normalizedMsg.match(cancelWithNumRegex);
        const parsedWithNum = matchWithNum ? parseCancelIds(matchWithNum[1]) : [];
        if (parsedWithNum.length > 0) {
          isCancel = true;
          cancelIds = parsedWithNum;
          targetId = parsedWithNum[0];
          if (matchWithNum[2]) {
            cancelTargetName = sanitizeAdminCustomerName(matchWithNum[2]);
          }
          method = "regex-cancel-with-num";
        }
      }

      // 4. Check no-number cancel keywords
      if (!isCancel && cancelKeywordRegex.test(normalizedMsg)) {
        isCancel = true;
        method = "contextual-cancel";
      }
    }

    // ✅ Exclude standalone "ผ่าน" / "ขอผ่าน" (pass/skip) from being treated as cancellation of the latest item
    if (isCancel && standalonePassRegex.test(normalizedMsg)) {
      isCancel = false;
      targetId = null;
      cancelIds = [];
      method = null;
    }

    if (isCancel) {
      intent = "cancel";
      if (!targetId) {
        // ✅ Auto-resolve: ยกเลิกรายการล่าสุดของลูกค้า (ต้องจองไปไม่เกิน 1 นาที / 60,000 ms)
        const msgTimestamp = item.snippet?.publishedAt
          ? new Date(item.snippet.publishedAt).getTime()
          : Date.now();
        const recentId = stockStore.findMostRecentItemForUser(
          uid,
          displayName,
          60000, // 1 นาที
          msgTimestamp
        );
        if (recentId) {
          targetId = recentId;
          method = method ? method + "+auto-latest" : "auto-cancel-latest";
          logger.log(
            `🔄 Auto-resolved cancel → item ${recentId} for ${displayName} (uid: ${uid})`,
          );
        } else {
          logger.log(
            `⚠️ Cancel without number skipped: no booking within 1 minute found for ${displayName} (uid: ${uid})`,
          );
        }
      }
    }

    if (intent === "cancel") {
      // Done cancel detection, bypass shipping and other checks
    } else if (shippingRegex.test(normalizedMsg)) {
      intent = "shipping";
      method = "regex-ship";

      // --- AUTO SHIP LOGIC ---
      let autoShipDate = null;
      let autoShipName = displayName;
      let autoShipUid = uid;
      let isAutoShip = false;

      const shipTmrMatch = normalizedMsg.match(SHIP_TMR_REGEX);
      const shipDateMatch = normalizedMsg.match(SHIP_DATE_REGEX);
      const shipDayOfWeekMatch = normalizedMsg.match(shipDayOfWeekRegex);
      const shipNowMatch = normalizedMsg.match(SHIP_NOW_REGEX);

      let matchedKeyword = null;
      if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
      else if (shipDateMatch) matchedKeyword = shipDateMatch[0];
      else if (shipDayOfWeekMatch) matchedKeyword = shipDayOfWeekMatch[0];
      else if (shipNowMatch) matchedKeyword = shipNowMatch[0];
      else matchedKeyword = "ส่ง";

      if (isAdmin) {
        // ✅ สกัดชื่อลูกค้าเป้าหมายจากข้อความคำสั่งแอดมิน (เช่น "วาศินา เอาไปฝากคนอื่นด้วย", "กุญสิญา ส่งเลย", "วิระวัลย์ รวมยอด")
        const proxyTarget = extractAdminCustomerName(normalizedMsg);
        let cleanName = proxyTarget || "";
        if (!cleanName && matchedKeyword) {
          cleanName = normalizedMsg
            .replace(matchedKeyword, "")
            .replace(STRIP_PREFIX_OF_REGEX, "")
            .replace(STRIP_EDGE_PUNCT_REGEX, "")
            .trim();
        }

        if (cleanName.length > 0 && !isAdminUser(cleanName)) {
          autoShipName = cleanName;

          // 🚀 Phase 1.3: ใช้ computed nameToUidMap แทน getNameToUidMap() — O(1) lookup, recomputed only when nicknames change
          let foundUid = nameToUidMap.value[autoShipName.toLowerCase()];

          if (!foundUid) {
            foundUid =
              "manual-" +
              Date.now() +
              "-" +
              Math.random().toString(36).substring(2, 5);
          }
          autoShipUid = foundUid;
        } else {
          // If Admin typed a shipping keyword without specifying a customer name,
          // Admin is not a customer, so do NOT create autoShip for admin
          autoShipName = "";
        }
      }

      if (shipTmrMatch) {
        isAutoShip = true;
        autoShipDate = new Date();
        autoShipDate.setDate(autoShipDate.getDate() + 1);
      } else if (shipDayOfWeekMatch) {
        isAutoShip = true;
        const dayName = shipDayOfWeekMatch[1];
        autoShipDate = calcNextDayOfWeekDate(dayName);
      } else if (shipDateMatch) {
        isAutoShip = true;
        autoShipDate = new Date();
        const day = parseInt(shipDateMatch[1]);
        autoShipDate.setDate(day);

        const monthStr = shipDateMatch[2];
        if (monthStr) {
          const mNamesShort = [
            "มค",
            "กพ",
            "มีค",
            "เมย",
            "พค",
            "มิย",
            "กค",
            "สค",
            "กย",
            "ตค",
            "พย",
            "ธค",
          ];
          const mNamesFull = [
            "มกราคม",
            "กุมภาพันธ์",
            "มีนาคม",
            "เมษายน",
            "พฤษภาคม",
            "มิถุนายน",
            "กรกฎาคม",
            "สิงหาคม",
            "กันยายน",
            "ตุลาคม",
            "พฤศจิกายน",
            "ธันวาคม",
          ];
          const cleanMonth = monthStr.replace(DOT_GLOBAL_REGEX, "");
          let mIndex = mNamesShort.indexOf(cleanMonth);
          if (mIndex === -1) mIndex = mNamesFull.indexOf(cleanMonth);
          if (mIndex !== -1) {
            autoShipDate.setMonth(mIndex);
          }
        }
        if (autoShipDate < new Date() && new Date().getDate() - day > 15) {
          autoShipDate.setMonth(autoShipDate.getMonth() + 1);
        }
      } else if ((shipNowMatch || TRANSFER_SLIP_REGEX.test(normalizedMsg)) && !holdRegex.test(normalizedMsg)) {
        // Default to active Shipping Cycle (e.g. Thursday, Today, etc.) for explicit ship/transfer keywords AND NOT a hold request
        isAutoShip = true;
        autoShipDate = resolveShippingCycleDate(systemStore.shippingCycle);
      }

      if (isAutoShip && autoShipName && !isAdminUser(autoShipName)) {
        const y = autoShipDate.getFullYear();
        const m = String(autoShipDate.getMonth() + 1).padStart(2, "0");
        const d = String(autoShipDate.getDate()).padStart(2, "0");
        const parsedDate = `${y}-${m}-${d}`;

        // ✅ DEDUP: Check if customer with same name already exists in delivery_customers
        let targetUid = await resolveDeliveryUid(autoShipUid, autoShipName);

        update(dbRef(db, `delivery_customers/${targetUid}`), {
          name: autoShipName,
          deliveryDate: parsedDate,
          status: "pending",
          labelPrinted: false,
          labelPrintedAt: null,
          updatedAt: Date.now(),
        });

        Toast.fire({
          icon: "success",
          title: `📦 เพิ่มรอบส่งให้ ${autoShipName} แล้ว`,
          toast: true,
        });
      }
      // --- END AUTO SHIP LOGIC ---
    } else if (
      questionRegex.test(normalizedMsg) ||
      tryRegex.test(normalizedMsg) ||
      numberWithQuestionRegex.test(normalizedMsg) ||
      negationGuardRegex.test(normalizedMsg) ||
      sizeRangeRegex.test(normalizedMsg) ||
      ((quantityUnitRegex.test(normalizedMsg) || pricePatternRegex.test(normalizedMsg)) && !explicitBuyRegex.test(normalizedMsg))
    ) {
      method =
        questionRegex.test(normalizedMsg) || numberWithQuestionRegex.test(normalizedMsg) || sizeRangeRegex.test(normalizedMsg)
          ? "question-skip"
          : negationGuardRegex.test(normalizedMsg)
          ? "negation-skip"
          : tryRegex.test(normalizedMsg)
          ? "try-skip"
          : "unit-or-price-skip";
    } else {
      // 🟢 Lazy Short-Circuit Regex Matching (evaluates regexes only when prior branches don't match)
      let m;
      if (
        isAdmin &&
        (m = normalizedMsg.match(adminProxyNameFirstRegex)) &&
        parseInt(m[2]) <= MAX_ITEM_ID &&
        sanitizeAdminCustomerName(m[1])
      ) {
        intent = "buy";
        targetId = parseInt(m[2]);
        forcedOwnerName = sanitizeAdminCustomerName(m[1]);
        method = "admin-proxy-name-first";
      } else if (
        isAdmin &&
        (m = normalizedMsg.match(adminProxyNumFirstRegex)) &&
        parseInt(m[1]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[1]);
        forcedOwnerName = sanitizeAdminCustomerName(m[2]) || m[2].replace(STRIP_LEADING_NON_LETTER_REGEX, "").trim();
        method = "admin-proxy-num-first";
      } else if (
        (m = normalizedMsg.match(pureNumberRegex)) &&
        parseInt(m[1]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[1]);
        method = "regex-pure";
      } else if (
        (m = normalizedMsg.match(fuzzyNumberRegex)) &&
        parseInt(m[1]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[1]);
        method = "regex-fuzzy";
      } else if (
        (m = normalizedMsg.match(explicitBuyRegex)) &&
        parseInt(m[1] || m[2]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[1] || m[2]);
        method = "regex-explicit";
      } else if (
        (m = normalizedMsg.match(numberWithPoliteRegex)) &&
        parseInt(m[1]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[1]);
        method = "regex-polite";
      } else if (
        (m = normalizedMsg.match(dashBuyRegex)) &&
        !PURE_DIGITS_TEST_REGEX.test(m[1].trim()) &&
        !sizeRangeRegex.test(normalizedMsg) &&
        parseInt(m[2]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(m[2]);
        method = "regex-dash";
      } else if (
        (m = normalizedMsg.match(customerNameNumRegex)) &&
        parseInt(m[2]) <= MAX_ITEM_ID
      ) {
        // Guard: ต้องเป็นชื่อคนจริงๆ ไม่ใช่คำลักษณนาม (เช่น "ตัว 100") หรือคำถาม/shipping keyword
        const nameOnly = m[1].trim();
        if (
          !nonNameNounsRegex.test(nameOnly) &&
          !nonNameWordsRegex.test(nameOnly) &&
          !questionRegex.test(nameOnly) &&
          !shippingRegex.test(nameOnly)
        ) {
          intent = "buy";
          targetId = parseInt(m[2]);
          forcedOwnerName = nameOnly;
          method = "regex-customer-name";
        }
      } else if (
        (m = normalizedMsg.match(numAndDescRegex)) &&
        parseInt(m[1]) <= MAX_ITEM_ID
      ) {
        const desc = m[2].trim();
        // Guard: ต้องไม่ใช่คำถาม/shipping keyword ในรายละเอียด
        if (!questionRegex.test(desc) && !shippingRegex.test(desc)) {
          intent = "buy";
          targetId = parseInt(m[1]);
          if (isAdmin) {
            forcedOwnerName = desc;
            method = "admin-proxy-num-desc";
          } else {
            method = "regex-num-desc";
            // Auto-learn customer nickname if not admin and desc is customer name (e.g. "40 บุญญาภา")
            const cleanSelfName = extractCustomerSelfName(normalizedMsg);
            if (cleanSelfName) {
              forcedOwnerName = cleanSelfName;
              const hasExistingNick =
                nicknameStore.hasNickname(uid, realName) ||
                nicknameStore.hasNickname(uid, displayName);
              const shouldAutoLearn =
                !hasExistingNick &&
                (isHandleOrNonThaiName(displayName) || isHandleOrNonThaiName(realName));

              if (shouldAutoLearn) {
                const safeUid = sanitizeDbKey(uid);
                update(dbRef(db, `nicknames/${safeUid}`), {
                  nick: cleanSelfName,
                  phonetic: cleanSelfName,
                  realName: realName,
                }).catch((e) => logger.warn("Auto-learn customer name error:", e));
              }
            }
          }
        }
      }
    }

    // ⚠️ Skip voice chat messages with no actionable intent
    if (isVoiceChat && !intent) {
      return;
    }

    // 5. Process Order & Audio Logic (Updated with SFX)
    if (intent === "buy" && targetId > 0) {
      // ✅ Check Date Mismatch (If date specified in message does not match live date -> sync message & skip stock booking)
      const msgTimestamp = item.snippet?.publishedAt
        ? new Date(item.snippet.publishedAt).getTime()
        : Date.now();
      if (isDateMismatch(normalizedMsg, msgTimestamp)) {
        logger.log(`🗓️ Skipping single buy: date in "${msg}" does not match live date`);
        Toast.fire({
          icon: "warning",
          title: `🗓️ ข้ามการจอง: วันที่ในแชทไม่ตรงกับวันไลฟ์สด`,
          toast: true,
        });
        await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
          id: item.id,
          text: msg,
          messageRuns: getMessageRuns(),
          authorName: realName,
          displayName,
          phoneticName,
          realName,
          uid,
          avatar,
          color: stringToColor(uid),
          isAdmin,
          type: isAdmin ? "note" : "general",
          sfxType: "error",
          ttsText: isVoiceChat ? "" : ttsMessage,
          detectionMethod: "date-mismatch-skip",
          timestamp: msgTimestamp,
        });
        return;
      }

      // ✅ Auto-Expand Stock for Single Buy
      if (targetId > stockStore.stockSize) {
        const newSize = Math.ceil(targetId / 10) * 10;
        await stockStore.updateStockSize(newSize);
        logger.log(`📦 Auto-expanded stock to ${newSize} for item ${targetId}`);
        Toast.fire({ icon: "info", title: `📦 ขยายรายการเป็น ${newSize} อัตโนมัติ`, toast: true });
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
          .replace(STRIP_BUY_VERB_REGEX, "");
        if (targetPrice)
          cleanName = cleanName.replace(targetPrice.toString(), "");
        cleanName = cleanName
          .replace(STRIP_EDGE_PUNCT_REGEX, "")
          .trim();

        if (cleanName.length > 0 && !isAdminUser(cleanName)) {
          ownerName = cleanName;
          ownerUid = "admin-proxy-" + Date.now();
        } else {
          ownerName = displayName;
          ownerUid = "admin-proxy-" + Date.now();
        }
      }

      // ✅ For Admin Proxy: resolved phonetic name must be the CUSTOMER's name, not the Admin's name
      const isProxyBooking = forcedOwnerName || (isAdmin && ownerName !== displayName);
      const effectivePhoneticName =
        isProxyBooking && ownerName
          ? nicknameStore.getPhoneticName(ownerUid, ownerName)
          : phoneticName;

      const pushBuyMessage = (finalSfxType) => {
        const resolvedSfx =
          finalSfxType === "success" && isNewCustomerChat ? "bell" : finalSfxType;
        return chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
          id: item.id,
          text: msg,
          messageRuns: getMessageRuns(),
          authorName: realName,
          displayName: isProxyBooking ? `${ownerName} (โดย ${displayName})` : displayName,
          proxyCustomerName: isProxyBooking ? ownerName : null,
          proxyUid: isProxyBooking ? ownerUid : null,
          phoneticName: effectivePhoneticName,
          realName: realName,
          uid: uid,
          avatar,
          color: stringToColor(uid),
          isAdmin,
          type: intent,
          sfxType: resolvedSfx,
          ttsText: isVoiceChat ? "" : ttsMessage,
          detectionMethod: method,
          timestamp: new Date(item.snippet.publishedAt).getTime(),
        });
      };

      let sfxType = "error";
      let lockAcquired = false;
      try {
        if (processingLocks.has(targetId)) {
          sfxType = "error";
          await pushBuyMessage(sfxType);
          return;
        }
        processingLocks.add(targetId);
        lockAcquired = true;

        const isBackdatedOrder = BACKDATED_ORDER_REGEX.test(normalizedMsg);
        // ✅ Try to process order (auto-queues if item is taken)
        const result = await stockStore.processOrder(
          targetId,
          ownerName,
          ownerUid,
          "chat",
          targetPrice,
          method,
          isBackdatedOrder,
        );

        // ✅ ยังอ่านข้อความแม้ซื้อซ้ำ/อยู่ในคิวแล้ว
        if (
          result.action === "already_owned" ||
          result.action === "already_queued"
        ) {
          sfxType = "error";
          await pushBuyMessage(sfxType);
          return;
        }

        if (!result.success) {
          logger.warn("Order failed:", result.error);
          sfxType = "error";
          await pushBuyMessage(sfxType);
          return;
        }

        // ✅ Success - Show Toast
        Toast.fire({
          icon: "success",
          title: `✅ ตัดรหัส ${targetId} ให้ ${ownerName} แล้ว`,
          toast: true,
        });

        sfxType = "success";
        await pushBuyMessage(sfxType);
      } finally {
        if (lockAcquired) {
          processingLocks.delete(targetId);
        }
      }
    } else if (intent === "cancel") {
      // --- Cancel Logic (Single or Multi-Item) ---
      let cancelSuccess = false;
      const idsToCancel =
        cancelIds.length > 0
          ? cancelIds
          : targetId && targetId > 0
          ? [targetId]
          : [];
      const cancelledIds = [];
      let lastCancelledName = cancelTargetName || displayName;

      for (const idToCancel of idsToCancel) {
        const currentItem = stockStore.stockData[idToCancel];
        const isUserInQueue =
          currentItem &&
          currentItem.queue &&
          currentItem.queue.some(
            (q) =>
              (uid && q.uid === uid) ||
              (displayName && q.owner === displayName),
          );
        const isUserOwner =
          currentItem &&
          ((uid && currentItem.uid === uid) ||
            (displayName && currentItem.owner === displayName));

        if (isAdmin || isUserOwner || isUserInQueue) {
          const isAdminProxyCancel = isAdmin && !isUserOwner && !isUserInQueue;
          const cancelUid = isAdminProxyCancel ? null : uid;
          // 🛡️ Safety: When Admin specifies a target customer name (e.g. "12 มะระ ยกเลิก"),
          // NEVER fall back to null (wildcard cancel). Only use null when Admin gave no name (e.g. "ยกเลิก 12").
          const cancelOwnerName = isAdminProxyCancel
            ? cancelTargetName || null
            : displayName;

          const result = await stockStore.processCancel(
            idToCancel,
            cancelUid,
            cancelOwnerName,
          );
          if (
            result &&
            result.success &&
            (result.previousOwner || result.cancelledFromQueue)
          ) {
            cancelSuccess = true;
            cancelledIds.push(idToCancel);
            lastCancelledName =
              result.previousOwner || cancelTargetName || displayName;

            // ✅ Audit Log: Track admin cancel actions
            if (isAdminProxyCancel) {
              logger.log(
                `🛡️ ADMIN CANCEL: ${displayName} (uid: ${uid}) cancelled item #${idToCancel} of ${result.previousOwner || cancelTargetName || "queue member"} via ${method}`,
              );
            }
          } else if (isAdminProxyCancel && cancelTargetName) {
            logger.warn(
              `⚠️ Admin cancel skipped for item #${idToCancel}: target "${cancelTargetName}" does not match current owner/queue`,
            );
            Toast.fire({
              icon: "warning",
              title: `⚠️ ไม่พบชื่อ "${cancelTargetName}" ในรหัส ${idToCancel} (ข้ามการยกเลิก)`,
              toast: true,
            });
          }
        }
      }

      if (cancelledIds.length > 0) {
        const isAutoResolved = method && method.includes("auto-latest");
        Toast.fire({
          icon: "warning",
          title: `❌ ยกเลิกรหัส ${cancelledIds.join(", ")}${isAutoResolved ? " (ล่าสุด)" : ""} ของ ${lastCancelledName} แล้ว`,
          toast: true,
        });
      }

      const sfxType = cancelSuccess ? "cancel" : (isNewCustomerChat ? "bell" : null);
      await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
        id: item.id,
        text: msg,
        messageRuns: getMessageRuns(),
        authorName: realName,
        displayName: cancelTargetName && isAdmin ? `${cancelTargetName} (ยกเลิกโดย ${displayName})` : displayName,
        proxyCustomerName: cancelTargetName && isAdmin ? cancelTargetName : null,
        phoneticName: cancelTargetName && isAdmin ? nicknameStore.getPhoneticName(null, cancelTargetName) : phoneticName,
        realName: realName,
        uid: uid,
        avatar,
        color: stringToColor(uid),
        isAdmin,
        type: intent,
        sfxType,
        ttsText: isVoiceChat ? "" : ttsMessage,
        detectionMethod: method,
        timestamp: new Date(item.snippet.publishedAt).getTime(),
      });
    } else {
      // --- Other Intents / General Chat ---
      if (intent === "shipping") {
        if (!isVoiceChat) {
          const shippingRef = dbRef(
            db,
            `system/shipping/${systemStore.currentVideoId}/${uid}`,
          );
          update(shippingRef, {
            ready: true,
            timestamp: Date.now(),
            lastMessage: msg,
          }).catch((e) => logger.error("Shipping update error:", e));

          const historyRef = dbRef(
            db,
            `system/shipping/${systemStore.currentVideoId}/${uid}/history`,
          );
          push(historyRef, {
            text: msg,
            timestamp: Date.now(),
            type: "user",
          }).catch((e) => logger.warn("Shipping history push warning:", e));
        }
      }

      const proxyCustomerName = isAdmin ? extractAdminCustomerName(msg) : null;
      await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
        id: item.id,
        text: msg,
        messageRuns: getMessageRuns(),
        authorName: realName,
        displayName,
        proxyCustomerName,
        phoneticName,
        realName: realName,
        uid: uid,
        avatar,
        color: stringToColor(uid),
        isAdmin,
        type: intent,
        sfxType: isNewCustomerChat ? "bell" : null,
        ttsText: isVoiceChat ? "" : ttsMessage,
        detectionMethod: method,
        timestamp: new Date(item.snippet.publishedAt).getTime(),
      });
    }
  }

  function initManowPriceVoiceListener(videoId) {
    if (!videoId || videoId === "demo") return null;

    const listenerInitTime = Date.now();
    logger.debug(
      `🎙️ Initializing ManowPriceVoiceListener for video: ${videoId}`,
    );
    const voiceChatRef = query(
      dbRef(db, `voice_chats/${videoId}`),
      limitToLast(10),
    );

    return onChildAdded(
      voiceChatRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) return;

        const msgTime = val.timestamp || Date.now();
        // Skip historical voice messages added before the listener initialized (with 5-second buffer)
        if (msgTime < listenerInitTime - 5000) {
          logger.debug("🎙️ Skipping historical voice chat:", val.text);
          return;
        }

        logger.debug("🎙️ New Voice Chat Message Detected:", val);

        const dataItem = {
          id: snapshot.key,
          snippet: {
            displayMessage: val.text || val.snippet?.displayMessage || "",
            publishedAt: val.timestamp || new Date().toISOString(),
          },
          authorDetails: {
            channelId: val.authorDetails?.channelId || "voice-chat-uid",
            displayName: val.authorDetails?.displayName || "Voice Chat",
            profileImageUrl: val.authorDetails?.profileImageUrl || "",
          },
        };

        processMessage(dataItem);
      },
      (error) => {
        console.error("Voice Listener Error:", error);
      },
    );
  }

  return { processMessage, initManowPriceVoiceListener };
}

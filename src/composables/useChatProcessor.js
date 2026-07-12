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
} from "firebase/database";
import { db } from "../composables/useFirebase";
import { ref } from "vue";
import { extractMessageRuns } from "../services/YouTubeLiveChat";
import Swal from "sweetalert2";
import { watch } from "vue";
import { logger } from "../utils/logger";

// Saved names cache
const savedNamesCache = ref({});
const nameToUidMap = ref({});
let _nicknameListenerUnsub = null;

// ✅ Initialize nickname cache (with HMR cleanup guard)
if (_nicknameListenerUnsub) _nicknameListenerUnsub();
_nicknameListenerUnsub = onValue(dbRef(db, "nicknames"), (snapshot) => {
  const data = snapshot.val() || {};
  savedNamesCache.value = data;

  // Build nameToUidMap reverse lookup map (nickname -> uid)
  const map = {};
  Object.keys(data).forEach((uid) => {
    const entry = data[uid];
    const nick = typeof entry === "object" ? entry.nick : entry;
    if (nick) {
      map[nick.trim().toLowerCase()] = uid;
    }
  });
  nameToUidMap.value = map;

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

// ✅ HMR Cleanup: Prevent duplicate Firebase listeners during development
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (_nicknameListenerUnsub) {
      _nicknameListenerUnsub();
      _nicknameListenerUnsub = null;
    }
  });
}

// 🚀 Performance: Regex patterns at module level
const multiBuyRegex =
  /^(?:F|f|cf|CF|รับ|เอา|เิา)?\s*(\d+(?:[\s,_]+\d+)+)(?:\s+(.*))?$/i;
const adminProxyNumFirstRegex = /^(\d+)\s+([ก-๛a-zA-Z].*)$/;
const adminProxyNameFirstRegex = /^([ก-๛a-zA-Z][^]*?)\s+(\d+)$/;
const shippingRegex =
  /โอน|ส่ง|สลิป|ยอด|ที่อยู่|ปลายทาง|พร้อม|รอบส่ง|พัสดุ|เลขพัสดุ|เช็คเลข|แจ้งโอน|ขนส่ง|เคอรี่|แฟลช|ไปรษณีย์|ค่าส่ง|โอนแล้ว|flash|kerry|j&t|jt/;
const questionRegex =
  /อก|เอว|สะโพก|ยาว|ราคา|เท่าไหร่|เท่าไร|ทไหร|กี่บาท|แบบไหน|ผ้า|สี|ตำหนิ|ไหม|มั้ย|ป่าว|ขอดู|รีวิว|ว่าง|เหลือ|ยังอยู่|ไซส์|ใหม|หรอ|ปะ|ยังไง|อะไร|กี่|นิ้ว|เซน|เซนติเมตร|โล|กิโล|ชิ้น|ตัว|แพ็ค|แพค/;
const pureNumberRegex = /^\s*(\d+)\s*$/;
const fuzzyNumberRegex = /^\s*[,.\/;:]*\s*(\d+)\s*[,.\/;:]*\s*$/;
const explicitBuyRegex =
  /(?:(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|ลอง|รายการที่|รายการ|ชุดที่|ชุด|จอง)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(\d+))|(?:(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ)?\s*(?:F|f|cf|CF|รับ|เอา|เิา|รหัส|ระหัส|เบอร์|ลอง|รายการที่|รายการ|ชุดที่|ชุด|จอง))/i;
const numberWithPoliteRegex =
  /^.{0,10}?(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|พี่|ป้า|น้า|อา|แม่|น้อง|ฝาก|\/\/)/;
const dashBuyRegex = /^([^-]+)\s*[-]\s*(\d+)$/;
const customerNameNumRegex = /^([ก-๛a-zA-Z][ก-๛a-zA-Z\s]{1,}?)\s+(\d+)$/;
const numAndDescRegex = /^(\d+)\s*([ก-๛a-zA-Z\s\(\)\[\]\-]+)$/;
const cancelKeywordRegex =
  /cc|cancel|ยกเลิก|ยกเลก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า/i;
const standalonePassRegex = /^(?:ขอ)?ผ่าน\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|เลย)*$/i;

// 🛡️ Safety: Maximum item ID to prevent absurd stock expansion from spam/typos (e.g. "555555")
const MAX_ITEM_ID = 300;

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
const warnedNewCustomers = new Set(); // Track new customers who have been read instructions
let _lastVideoId = null; // ✅ Track current session for auto-clear

export function useChatProcessor() {
  const stockStore = useStockStore();
  const chatStore = useChatStore();
  const systemStore = useSystemStore();
  const nicknameStore = useNicknameStore();

  const { queueAudio, playSfx, resetVoice } = useAudio();

  // extractMessageRuns is now imported from ../services/YouTubeLiveChat

  function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 85%, 75%)`;
  }

  async function processMessage(item) {
    // ✅ Auto-clear session state when video changes
    if (systemStore.currentVideoId !== _lastVideoId) {
      _lastVideoId = systemStore.currentVideoId;
      warnedNewCustomers.clear();
      processingLocks.clear();
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
      // ถ้าไม่มี displayMessage → ลอง fallback จาก messageRuns (emoji-only etc.)
      const runs = extractMessageRuns(item);
      const fallbackText = runs
        .map((r) => r.text || "")
        .join("")
        .trim();
      if (!fallbackText) return; // ไม่มีข้อความจริงๆ → ข้าม
      msg = fallbackText;
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

      const codePattern = voiceLearningStore.codeKeywords.join("|");
      const pricePattern = voiceLearningStore.priceKeywords.join("|");
      const unitPattern = voiceLearningStore.unitKeywords.join("|");

      // Dynamic regex matching
      const regex1 = new RegExp(`(?:${codePattern})\\s*(\\d+)\\s*(?:${pricePattern})?\\s*(\\d+)\\s*(?:${unitPattern})?`, 'i');
      const regex2 = new RegExp(`(\\d+)\\s*(?:${pricePattern})\\s*(\\d+)\\s*(?:${unitPattern})?`, 'i');
      const regex3 = new RegExp(`(?:${codePattern})?\\s*(\\d+)\\s*[-/]\\s*(\\d+)`, 'i');
      const regex4 = new RegExp(`(?:${codePattern})?\\s*(\\d+)\\.(\\d+)\\s*(?:${unitPattern})?`, 'i');

      const match = normalizedMsg.match(regex1) || 
                    normalizedMsg.match(regex2) || 
                    normalizedMsg.match(regex3) || 
                    normalizedMsg.match(regex4);
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
    if (!isVoiceChat && savedNamesCache.value[uid]) {
      isNewCustomer = false;
      displayName =
        typeof savedNamesCache.value[uid] === "object"
          ? savedNamesCache.value[uid].nick
          : savedNamesCache.value[uid];
    }

    // ✅ Get phonetic name for TTS (separate from display name)
    const phoneticName = nicknameStore.getPhoneticName(uid, displayName);

    const isAdmin =
      isVoiceChat ||
      /admin|แอดมิน/i.test(displayName) ||
      /admin|แอดมิน/i.test(realName);

    // ✅ Prepare TTS Message (Append instructions for new customers once)
    let ttsMessage = msg;
    if (isNewCustomer && !isAdmin && !warnedNewCustomers.has(uid)) {
      warnedNewCustomers.add(uid);
      ttsMessage = `${msg} ... ลูกค้าใหม่ พิมพ์ชื่อ ตามด้วยรหัสเพื่อจอง ... ค่าส่ง โอน 40 ... ปลายทาง 50 ค่ะ`;
    }

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

    // --- Execution ---

    // 🔥 HIGHEST PRIORITY: Multi-Buy Logic (before all other checks)
    // Handles "26 38 74" or "26 38 74 ClientName"
    const matchMultiBuy = normalizedMsg.match(multiBuyRegex);
    if (matchMultiBuy) {
      const numbersStr = matchMultiBuy[1]; // "26 38 74"
      const proxyName = matchMultiBuy[2] ? matchMultiBuy[2].trim() : null; // Optional client name

      // Parse all IDs (Allow IDs > stockSize, but cap at MAX_ITEM_ID)
      const itemIds = numbersStr
        .split(/[\s,_]+/)
        .map((n) => parseInt(n))
        .filter((n) => n > 0 && n <= MAX_ITEM_ID);

      if (itemIds.length > 0) {
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

        Toast.fire({
          icon: "success",
          title: `✅ ตัดรหัส ${itemIds.join(", ")} ให้ ${ownerName} แล้ว`,
          toast: true,
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
          sfxType: "success",
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

    // 🔴 CANCEL CHECK
    let isCancel = false;

    {
      // 1. Check cancel with number patterns (keyword first)
      const matchWithNum = normalizedMsg.match(
        /(?:cc|cancel|ยกเลิก|ยกเลก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|ก่อน|ก็ได้|ให้เค้า|ไปเลย)*\s*[-]?\s*(\d+)/i,
      );
      if (matchWithNum && parseInt(matchWithNum[1]) <= MAX_ITEM_ID) {
        isCancel = true;
        targetId = parseInt(matchWithNum[1]);
        method = "regex-cancel-with-num";
      }

      // 2. Check number first patterns
      if (!isCancel) {
        const matchNumFirst = normalizedMsg.match(
          /(\d+)\s*(?:ค่ะ|ครับ|จ้า|จ้ะ|นะ|คะ|ก่อน|ก็ได้|ให้เค้า|ไปเลย)*\s*(?:cc|cancel|ยกเลิก|ยกเลก|ไม่เอา|หลุด|เปลี่ยนใจ|ยกให้|ให้พี่เค้า|ให้เค้า)/i,
        );
        if (matchNumFirst && parseInt(matchNumFirst[1]) <= MAX_ITEM_ID) {
          isCancel = true;
          targetId = parseInt(matchNumFirst[1]);
          method = "regex-cancel-num-first";
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
      method = null;
    }

    if (isCancel) {
      intent = "cancel";
      if (!targetId) {
        // ✅ Auto-resolve: ยกเลิกรายการล่าสุดของลูกค้า
        const recentId = stockStore.findMostRecentItemForUser(uid, displayName);
        if (recentId) {
          targetId = recentId;
          method = method ? method + "+auto-latest" : "auto-cancel-latest";
          logger.log(
            `🔄 Auto-resolved cancel → item ${recentId} for ${displayName} (uid: ${uid})`,
          );
        } else {
          logger.log(
            `⚠️ Cancel without number: no bookings found for ${displayName} (uid: ${uid})`,
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

      const shipNowMatch = normalizedMsg.match(/ส่งเลย|ส่งวันนี้/);
      const shipTmrMatch = normalizedMsg.match(
        /ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/,
      );
      const shipDateMatch = normalizedMsg.match(
        /ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/,
      );

      let matchedKeyword = null;
      if (shipNowMatch) matchedKeyword = shipNowMatch[0];
      else if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
      else if (shipDateMatch) matchedKeyword = shipDateMatch[0];

      if (isAdmin && matchedKeyword) {
        // Clean Name Logic (same robust fallback used in chat buying)
        let cleanName = normalizedMsg
          .replace(matchedKeyword, "")
          .replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "")
          .trim();

        if (cleanName.length > 0) {
          autoShipName = cleanName;

          let foundUid = nameToUidMap.value[autoShipName.toLowerCase()];

          if (!foundUid) {
            foundUid =
              "manual-" +
              Date.now() +
              "-" +
              Math.random().toString(36).substring(2, 5);
          }
          autoShipUid = foundUid;
        }
      }

      if (shipNowMatch) {
        isAutoShip = true;
        autoShipDate = new Date();
      } else if (shipTmrMatch) {
        isAutoShip = true;
        autoShipDate = new Date();
        autoShipDate.setDate(autoShipDate.getDate() + 1);
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
          const cleanMonth = monthStr.replace(/\./g, "");
          let mIndex = mNamesShort.indexOf(cleanMonth);
          if (mIndex === -1) mIndex = mNamesFull.indexOf(cleanMonth);
          if (mIndex !== -1) {
            autoShipDate.setMonth(mIndex);
          }
        }
        if (autoShipDate < new Date() && new Date().getDate() - day > 15) {
          autoShipDate.setMonth(autoShipDate.getMonth() + 1);
        }
      }

      if (isAutoShip) {
        const y = autoShipDate.getFullYear();
        const m = String(autoShipDate.getMonth() + 1).padStart(2, "0");
        const d = String(autoShipDate.getDate()).padStart(2, "0");
        const parsedDate = `${y}-${m}-${d}`;

        // ✅ DEDUP: Check if customer with same name already exists in delivery_customers
        let targetUid = autoShipUid;
        try {
          const existingSnap = await get(dbRef(db, "delivery_customers"));
          const existingData = existingSnap.val() || {};
          const existingEntry = Object.entries(existingData).find(
            ([, val]) => val.name === autoShipName && val.status !== "done",
          );
          if (existingEntry) {
            targetUid = existingEntry[0]; // Reuse existing key
          }
        } catch (e) {
          logger.warn("Dedup check failed, proceeding with new entry:", e);
        }

        update(dbRef(db, `delivery_customers/${targetUid}`), {
          name: autoShipName,
          deliveryDate: parsedDate,
          status: "pending",
          updatedAt: Date.now(),
        });

        Toast.fire({
          icon: "success",
          title: `📦 เพิ่มรอบส่งให้ ${autoShipName} แล้ว`,
          toast: true,
        });
      }
      // --- END AUTO SHIP LOGIC ---
    } else if (questionRegex.test(normalizedMsg)) {
      method = "question-skip";
    } else {
      // 🟢 Regex Matching
      const matchPure = normalizedMsg.match(pureNumberRegex);
      const matchFuzzy = !matchPure ? normalizedMsg.match(fuzzyNumberRegex) : null;
      const matchExplicit = normalizedMsg.match(explicitBuyRegex);
      const matchPolite = normalizedMsg.match(numberWithPoliteRegex);
      const matchDash = normalizedMsg.match(dashBuyRegex);
      const matchCustomerName = normalizedMsg.match(customerNameNumRegex);
      const matchNumDesc = normalizedMsg.match(numAndDescRegex);

      // ✅ Check Admin Proxy (Both Name-First and Number-First)
      let matchAdminNumFirst = isAdmin
        ? normalizedMsg.match(adminProxyNumFirstRegex)
        : null;
      let matchAdminNameFirst = isAdmin
        ? normalizedMsg.match(adminProxyNameFirstRegex)
        : null;

      if (
        matchAdminNameFirst &&
        parseInt(matchAdminNameFirst[2]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(matchAdminNameFirst[2]);
        forcedOwnerName = matchAdminNameFirst[1].trim();
        method = "admin-proxy-name-first";
      } else if (
        matchAdminNumFirst &&
        parseInt(matchAdminNumFirst[1]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(matchAdminNumFirst[1]);
        forcedOwnerName = matchAdminNumFirst[2].trim();
        method = "admin-proxy-num-first";
      } else if (matchPure && parseInt(matchPure[1]) <= MAX_ITEM_ID) {
        intent = "buy";
        targetId = parseInt(matchPure[1]);
        method = "regex-pure";
      } else if (matchFuzzy && parseInt(matchFuzzy[1]) <= MAX_ITEM_ID) {
        intent = "buy";
        targetId = parseInt(matchFuzzy[1]);
        method = "regex-fuzzy";
      } else if (
        matchExplicit &&
        parseInt(matchExplicit[1] || matchExplicit[2]) <= MAX_ITEM_ID
      ) {
        intent = "buy";
        targetId = parseInt(matchExplicit[1] || matchExplicit[2]);
        method = "regex-explicit";
      } else if (matchPolite && parseInt(matchPolite[1]) <= MAX_ITEM_ID) {
        intent = "buy";
        targetId = parseInt(matchPolite[1]);
        method = "regex-polite";
      } else if (matchDash && parseInt(matchDash[2]) <= MAX_ITEM_ID) {
        intent = "buy";
        targetId = parseInt(matchDash[2]);
        method = "regex-dash";
      } else if (
        matchCustomerName &&
        parseInt(matchCustomerName[2]) <= MAX_ITEM_ID
      ) {
        // Guard: ต้องไม่ใช่คำถาม/shipping keyword
        const nameOnly = matchCustomerName[1].trim();
        if (!questionRegex.test(nameOnly) && !shippingRegex.test(nameOnly)) {
          intent = "buy";
          targetId = parseInt(matchCustomerName[2]);
          forcedOwnerName = nameOnly;
          method = "regex-customer-name";
        }
      } else if (
        matchNumDesc &&
        parseInt(matchNumDesc[1]) <= MAX_ITEM_ID
      ) {
        const desc = matchNumDesc[2].trim();
        // Guard: ต้องไม่ใช่คำถาม/shipping keyword ในรายละเอียด
        if (!questionRegex.test(desc) && !shippingRegex.test(desc)) {
          intent = "buy";
          targetId = parseInt(matchNumDesc[1]);
          if (isAdmin) {
            forcedOwnerName = desc;
            method = "admin-proxy-num-desc";
          } else {
            method = "regex-num-desc";
          }
        }
      }
    }

    // Safety Net: If intent is still null, but msg has numbers,
    // OLD logic would sometimes extract them.
    // NEW LOGIC: Rule 5 -> "Ignore it".
    // So we do nothing.

    // ⚠️ Skip voice chat messages with no actionable intent
    if (isVoiceChat && !intent) {
      return;
    }



    // 5. Process Order & Audio Logic (Updated with SFX)
    if (intent === "buy" && targetId > 0) {
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

      const pushBuyMessage = (finalSfxType) => {
        return chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
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
          sfxType: finalSfxType,
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

        // ✅ Try to process order (auto-queues if item is taken)
        const result = await stockStore.processOrder(
          targetId,
          ownerName,
          ownerUid,
          "chat",
          targetPrice,
          method,
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
      // --- Cancel Logic ---
      let cancelSuccess = false;

      if (targetId && targetId > 0) {
        const currentItem = stockStore.stockData[targetId];
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
          const result = await stockStore.processCancel(
            targetId,
            uid,
            displayName,
          );
          if (
            result &&
            result.success &&
            (result.previousOwner || result.cancelledFromQueue)
          ) {
            cancelSuccess = true;

            // ✅ Audit Log: Track admin cancel actions
            if (isAdmin && !isUserOwner && !isUserInQueue) {
              logger.log(
                `🛡️ ADMIN CANCEL: ${displayName} (uid: ${uid}) cancelled item #${targetId} of ${result.previousOwner || "queue member"} via ${method}`,
              );
            }

            // ✅ Toast: แจ้งยกเลิกสำเร็จ พร้อมระบุรหัส
            const cancelledName = result.previousOwner || displayName;
            const isAutoResolved = method && method.includes("auto-latest");
            Toast.fire({
              icon: "warning",
              title: `❌ ยกเลิกรหัส ${targetId}${isAutoResolved ? " (ล่าสุด)" : ""} ของ ${cancelledName} แล้ว`,
              toast: true,
            });
          }
        }
      }

      const sfxType = cancelSuccess ? "cancel" : null;
      await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
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
        }
      }

      await chatStore.sendMessageToFirebase(systemStore.currentVideoId, {
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
        sfxType: null,
        ttsText: isVoiceChat ? "" : ttsMessage,
        detectionMethod: method,
        timestamp: new Date(item.snippet.publishedAt).getTime(),
      });
    }
  }

  function initManowPriceVoiceListener(videoId) {
    if (!videoId || videoId === "demo") return null;

    const listenerInitTime = Date.now();
    console.log(
      `🎙️ Initializing ManowPriceVoiceListener for video: ${videoId}`,
    );
    const voiceChatRef = dbRef(db, `voice_chats/${videoId}`);

    return onChildAdded(
      voiceChatRef,
      (snapshot) => {
        const val = snapshot.val();
        if (!val) return;

        const msgTime = val.timestamp || Date.now();
        // Skip historical voice messages added before the listener initialized (with 5-second buffer)
        if (msgTime < listenerInitTime - 5000) {
          console.log("🎙️ Skipping historical voice chat:", val.text);
          return;
        }

        console.log("🎙️ New Voice Chat Message Detected:", val);

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

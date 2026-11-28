import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "../utils/logger";
import { sanitizeDbKey } from "../utils/dbUtils";
import { isTemporaryOrSyntheticUid, isYouTubeHandle } from "../utils/customerIdentityGuard";

export const useNicknameStore = defineStore("nickname", () => {
  const nicknames = ref({});

  // ✅ รายชื่อพิเศษสำหรับ "เสียงอ่าน" เท่านั้น (บนจอจะยังโชว์ชื่อเดิม)
  const SPECIAL_NAMES_TTS = {
    "รุ่งนภา ชม.": "คุณรุ่งนภา เชียงใหม่",
    "รุ่งนภา ชม": "คุณรุ่งนภา เชียงใหม่",
    "อัจฉรา จิน": "คุณอัจฉรา จินดาธรรม",
    "จิราพร เต": "คุณจิราพร เตชาทวีวรรณ"
  };

  // Module-scoped constants to prevent garbage creation on every getPhoneticName call
  const TITLES_LIST = ["คุณ", "พี่", "น้อง", "เฮีย", "เจ๊", "ป้า", "น้า", "อา", "ลุง", "ตา", "ยาย", "แม่", "พ่อ", "ดร.", "หมอ", "ครู", "ซ้อ", "เสี่ย"];
  const EMOJI_REGEX = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]|\uD83F[\uDC00-\uDFFF]|[\u2000-\u26FF])/g;

  // 🚀 Performance: Memoization Cache for resolved phonetic customer names
  const phoneticCache = new Map();

  function clearPhoneticCache() {
    phoneticCache.clear();
    logger.debug("🧹 Nickname store: Phonetic cache cleared");
  }

  let activeNicknameUnsub = null;

  function initNicknameListener() {
    if (activeNicknameUnsub) {
      activeNicknameUnsub();
      activeNicknameUnsub = null;
    }
    const unsub = onValue(dbRef(db, "nicknames"), (snapshot) => {
      const data = snapshot.val() || {};
      nicknames.value = data;
      clearPhoneticCache(); // Invalidate memoized cache when nicknames change
      logger.debug("📝 Nicknames updated:", Object.keys(data).length);
    });
    activeNicknameUnsub = unsub;
    return () => {
      if (activeNicknameUnsub === unsub) {
        activeNicknameUnsub = null;
      }
      unsub();
    };
  }

  function hasNickname(uid, realName) {
    const isTempUid = isTemporaryOrSyntheticUid(uid);
    const safeUid = uid && uid !== "manual" ? sanitizeDbKey(uid) : null;
    if ((safeUid && nicknames.value[safeUid]) || (uid && uid !== "manual" && nicknames.value[uid])) {
      return true;
    }
    // 🛡️ Strict Read-Side Isolation:
    // Only allow `nicknames[realName]` fallback for globally unique YouTube `@handles`
    // or real YouTube account UIDs — NEVER let a stale `nicknames/<plainName>` hijack
    // manual bookings, admin proxy bookings, or uid-less lookups.
    if (isTempUid && !isYouTubeHandle(realName)) {
      return false;
    }
    const safeRealName = realName ? sanitizeDbKey(realName) : null;
    return !!(
      (safeRealName && nicknames.value[safeRealName]) ||
      (realName && nicknames.value[realName])
    );
  }

  // 👁️ สำหรับแสดงผลบนจอ (เอาชื่อสั้นๆ เดิมๆ)
  function getNickname(uid, realName) {
    const isTempUid = isTemporaryOrSyntheticUid(uid);
    const safeUid = uid && uid !== "manual" ? sanitizeDbKey(uid) : null;

    if (safeUid && nicknames.value[safeUid]) {
      const entry = nicknames.value[safeUid];
      return typeof entry === "object" ? entry.nick : entry;
    }
    if (uid && uid !== "manual" && nicknames.value[uid]) {
      const entry = nicknames.value[uid];
      return typeof entry === "object" ? entry.nick : entry;
    }
    // 🛡️ Strict Read-Side Isolation:
    // Manual/proxy/uid-less lookups with plain names MUST return the entered name as-is.
    if (isTempUid && !isYouTubeHandle(realName)) {
      return realName;
    }
    const safeRealName = realName ? sanitizeDbKey(realName) : null;
    if (safeRealName && nicknames.value[safeRealName]) {
      const entry = nicknames.value[safeRealName];
      return typeof entry === "object" ? entry.nick : entry;
    }
    if (realName && nicknames.value[realName]) {
      const entry = nicknames.value[realName];
      return typeof entry === "object" ? entry.nick : entry;
    }
    return realName;
  }

  // 🔊 สำหรับเสียงอ่าน (เอาชื่อเต็มยศ) — Memoized
  const MAX_PHONETIC_CACHE_SIZE = 500;

  function setPhoneticCache(key, val) {
    if (phoneticCache.has(key)) {
      phoneticCache.delete(key);
    } else if (phoneticCache.size >= MAX_PHONETIC_CACHE_SIZE) {
      const oldestKey = phoneticCache.keys().next().value;
      phoneticCache.delete(oldestKey);
    }
    phoneticCache.set(key, val);
  }

  function getPhoneticName(uid, displayName) {
    const cacheKey = `${uid || ""}:::${displayName || ""}`;
    if (phoneticCache.has(cacheKey)) {
      const cached = phoneticCache.get(cacheKey);
      phoneticCache.delete(cacheKey);
      phoneticCache.set(cacheKey, cached);
      return cached;
    }

    // 1. เช็คชื่อพิเศษ (ถ้าเจอ ให้เปลี่ยนเป็นชื่อยาวทันที)
    if (SPECIAL_NAMES_TTS[displayName]) {
      const specialResult = SPECIAL_NAMES_TTS[displayName];
      setPhoneticCache(cacheKey, specialResult);
      return specialResult;
    }

    // 2. ถ้าไม่มีในรายการพิเศษ ค่อยไปดูใน Firebase
    let nameToRead = displayName != null ? String(displayName) : "";
    const safeUid = uid ? sanitizeDbKey(uid) : null;
    if (safeUid && nicknames.value[safeUid]?.phonetic) {
      nameToRead = String(nicknames.value[safeUid].phonetic);
    } else if (uid && nicknames.value[uid]?.phonetic) {
      nameToRead = String(nicknames.value[uid].phonetic);
    }
    
    // 3. ป้องกัน Google Cloud TTS อ่านสะกดคำ (เช่น "ปอ" -> "ปอ ออ", "เอ" -> "ออ เอ")
    // โดยการบังคับเติมคำว่า "คุณ" นำหน้าชื่อที่ไม่มีคำนำหน้า เพื่อให้ AI มองว่าเป็นชื่อคน ไม่ใช่อักษรย่อ
    nameToRead = nameToRead ? nameToRead.replace(EMOJI_REGEX, "").trim() : "";

    if (nameToRead) {
      const hasTitle = TITLES_LIST.some((t) => nameToRead.startsWith(t));
      
      if (!hasTitle) {
        nameToRead = "คุณ" + nameToRead;
      }
    }

    setPhoneticCache(cacheKey, nameToRead);

    return nameToRead;
  }

  return {
    nicknames,
    initNicknameListener,
    hasNickname,
    getNickname,
    getPhoneticName,
    clearPhoneticCache,
  };
});

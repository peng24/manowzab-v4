import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "../utils/logger";
import { sanitizeDbKey } from "../utils/dbUtils";

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

  function initNicknameListener() {
    return onValue(dbRef(db, "nicknames"), (snapshot) => {
      const data = snapshot.val() || {};
      nicknames.value = data;
      logger.debug("📝 Nicknames updated:", Object.keys(data).length);
    });
  }

  function hasNickname(uid, realName) {
    const safeUid = uid ? sanitizeDbKey(uid) : null;
    const safeRealName = realName ? sanitizeDbKey(realName) : null;
    return !!(
      (safeUid && nicknames.value[safeUid]) ||
      (uid && nicknames.value[uid]) ||
      (safeRealName && nicknames.value[safeRealName]) ||
      (realName && nicknames.value[realName])
    );
  }

  // 👁️ สำหรับแสดงผลบนจอ (เอาชื่อสั้นๆ เดิมๆ)
  function getNickname(uid, realName) {
    const safeUid = uid ? sanitizeDbKey(uid) : null;
    const safeRealName = realName ? sanitizeDbKey(realName) : null;

    if (safeUid && nicknames.value[safeUid]) {
      const entry = nicknames.value[safeUid];
      return typeof entry === "object" ? entry.nick : entry;
    }
    if (uid && nicknames.value[uid]) {
      const entry = nicknames.value[uid];
      return typeof entry === "object" ? entry.nick : entry;
    }
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

  // 🔊 สำหรับเสียงอ่าน (เอาชื่อเต็มยศ)
  function getPhoneticName(uid, displayName) {
    // 1. เช็คชื่อพิเศษ (ถ้าเจอ ให้เปลี่ยนเป็นชื่อยาวทันที)
    if (SPECIAL_NAMES_TTS[displayName]) {
      return SPECIAL_NAMES_TTS[displayName];
    }

    // 2. ถ้าไม่มีในรายการพิเศษ ค่อยไปดูใน Firebase
    let nameToRead = displayName;
    const safeUid = uid ? sanitizeDbKey(uid) : null;
    if (safeUid && nicknames.value[safeUid]?.phonetic) {
      nameToRead = nicknames.value[safeUid].phonetic;
    } else if (uid && nicknames.value[uid]?.phonetic) {
      nameToRead = nicknames.value[uid].phonetic;
    }
    
    // 3. ป้องกัน Google Cloud TTS อ่านสะกดคำ (เช่น "ปอ" -> "ปอ ออ", "เอ" -> "ออ เอ")
    // โดยการบังคับเติมคำว่า "คุณ" นำหน้าชื่อที่ไม่มีคำนำหน้า เพื่อให้ AI มองว่าเป็นชื่อคน ไม่ใช่อักษรย่อ
    nameToRead = nameToRead.replace(EMOJI_REGEX, "").trim();

    if (nameToRead) {
      const hasTitle = TITLES_LIST.some((t) => nameToRead.startsWith(t));
      
      if (!hasTitle) {
        nameToRead = "คุณ" + nameToRead;
      }
    }

    return nameToRead;
  }

  return {
    nicknames,
    initNicknameListener,
    hasNickname,
    getNickname,
    getPhoneticName,
  };
});

import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "../utils/logger";

export const useNicknameStore = defineStore("nickname", () => {
  const nicknames = ref({});

  // ✅ รายชื่อพิเศษสำหรับ "เสียงอ่าน" เท่านั้น (บนจอจะยังโชว์ชื่อเดิม)
  const SPECIAL_NAMES_TTS = {
    "รุ่งนภา ชม.": "คุณรุ่งนภา เชียงใหม่",
    "รุ่งนภา ชม": "คุณรุ่งนภา เชียงใหม่",
    "อัจฉรา จิน": "คุณอัจฉรา จินดาธรรม",
    "จิราพร เต": "คุณจิราพร เตชาทวีวรรณ"
  };

  function initNicknameListener() {
    return onValue(dbRef(db, "nicknames"), (snapshot) => {
      const data = snapshot.val() || {};
      nicknames.value = data;
      logger.debug("📝 Nicknames updated:", Object.keys(data).length);
    });
  }

  // 👁️ สำหรับแสดงผลบนจอ (เอาชื่อสั้นๆ เดิมๆ)
  function getNickname(uid, realName) {
    // ไม่ต้องมี Hardcode ตรงนี้แล้ว
    if (nicknames.value[uid]) {
      return typeof nicknames.value[uid] === "object"
        ? nicknames.value[uid].nick
        : nicknames.value[uid];
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
    if (nicknames.value[uid]?.phonetic) {
      nameToRead = nicknames.value[uid].phonetic;
    }
    
    // 3. ป้องกัน Google Cloud TTS อ่านสะกดคำ (เช่น "ปอ" -> "ปอ ออ", "เอ" -> "ออ เอ")
    // โดยการบังคับเติมคำว่า "คุณ" นำหน้าชื่อที่ไม่มีคำนำหน้า เพื่อให้ AI มองว่าเป็นชื่อคน ไม่ใช่อักษรย่อ
    const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]|\uD83F[\uDC00-\uDFFF]|[\u2000-\u26FF])/g;
    nameToRead = nameToRead.replace(emojiRegex, "").trim();

    if (nameToRead) {
      const titles = ["คุณ", "พี่", "น้อง", "เฮีย", "เจ๊", "ป้า", "น้า", "อา", "ลุง", "ตา", "ยาย", "แม่", "พ่อ", "ดร.", "หมอ", "ครู", "ซ้อ", "เสี่ย"];
      const hasTitle = titles.some(t => nameToRead.startsWith(t));
      
      if (!hasTitle) {
        nameToRead = "คุณ" + nameToRead;
      }
    }

    return nameToRead;
  }

  return {
    nicknames,
    initNicknameListener,
    getNickname,
    getPhoneticName,
  };
});

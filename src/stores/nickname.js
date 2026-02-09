import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import { logger } from "../utils/logger";

export const useNicknameStore = defineStore("nickname", () => {
  const nicknames = ref({});

  // Listen to nicknames changes
  function initNicknameListener() {
    return onValue(dbRef(db, "nicknames"), (snapshot) => {
      const data = snapshot.val() || {};
      nicknames.value = data;
      logger.debug("📝 Nicknames updated:", Object.keys(data).length);
    });
  }

  function getNickname(uid, realName) {
    // ✅ Hardcoded Nickname Override (for TTS pronunciation)
    // Now covers both full name and short name
    if (realName === "รุ่งนภา ชม." || realName === "รุ่งนภา ชม") {
      return "รุ่งนภา เชียงใหม่";
    }

    // Atchara pronunciation override
    if (realName === "อัจฉรา จิน") {
      return "อัจฉรา จินดาธรรม";
    }

    // Jiraporn pronunciation override
    if (realName === "จิราพร เต") {
      return "จิราพร เตชาทวีวรรณ";
    }

    if (nicknames.value[uid]) {
      return typeof nicknames.value[uid] === "object"
        ? nicknames.value[uid].nick
        : nicknames.value[uid];
    }
    return realName;
  }

  return {
    nicknames,
    initNicknameListener,
    getNickname,
  };
});

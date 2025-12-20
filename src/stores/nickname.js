import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";

export const useNicknameStore = defineStore("nickname", () => {
  const nicknames = ref({});

  // Listen to nicknames changes
  function initNicknameListener() {
    onValue(dbRef(db, "nicknames"), (snapshot) => {
      const data = snapshot.val() || {};
      nicknames.value = data;
      console.log("📝 Nicknames updated:", Object.keys(data).length);
    });
  }

  function getNickname(uid, realName) {
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

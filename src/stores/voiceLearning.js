import { defineStore } from "pinia";
import { ref } from "vue";
import { ref as dbRef, onValue, set, update, get, query, limitToLast } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "./system";
import Swal from "sweetalert2";
import { logger } from "../utils/logger";

const DEFAULT_CODE_KEYWORDS = ["รหัส", "ไอดี", "รหัสที่", "เบอร์"];
const DEFAULT_PRICE_KEYWORDS = ["ราคา", "ขาย", "ตั้งราคา", "คู่ละ", "ตัวละ", "ผืนละ", "ชิ้นละ", "ชุดละ"];
const DEFAULT_UNIT_KEYWORDS = ["บาท"];

export const useVoiceLearningStore = defineStore("voiceLearning", () => {
  const systemStore = useSystemStore();

  const codeKeywords = ref([...DEFAULT_CODE_KEYWORDS]);
  const priceKeywords = ref([...DEFAULT_PRICE_KEYWORDS]);
  const unitKeywords = ref([...DEFAULT_UNIT_KEYWORDS]);
  const candidates = ref({});
  const isInitialized = ref(false);

  // Initialize and sync voice patterns from Firebase
  function initVoicePatterns() {
    if (isInitialized.value) return;
    isInitialized.value = true;

    const patternsRef = dbRef(db, "settings/voice_patterns");
    onValue(patternsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.codeKeywords) codeKeywords.value = data.codeKeywords;
        if (data.priceKeywords) priceKeywords.value = data.priceKeywords;
        if (data.unitKeywords) unitKeywords.value = data.unitKeywords;
        candidates.value = data.candidates || {};
      } else {
        // Initialize defaults in Firebase
        set(patternsRef, {
          codeKeywords: DEFAULT_CODE_KEYWORDS,
          priceKeywords: DEFAULT_PRICE_KEYWORDS,
          unitKeywords: DEFAULT_UNIT_KEYWORDS,
          candidates: {}
        }).catch((err) => logger.error("VoiceLearning: Failed to set defaults:", err));
      }
    });
  }

  /**
   * Auto-learn a new price separator keyword.
   * Compares manual input with recent transcript text.
   */
  async function learnFromManualCorrection(transcript, itemId, price) {
    if (!transcript) return false;
    
    // Normalize both numbers
    const itemStr = String(itemId);
    const priceStr = String(price);

    const idxItem = transcript.indexOf(itemStr);
    const idxPrice = transcript.indexOf(priceStr);

    if (idxItem === -1 || idxPrice === -1) return false;

    // Find the separator text between the itemId and the price
    let separator = "";
    if (idxItem < idxPrice) {
      separator = transcript.slice(idxItem + itemStr.length, idxPrice).trim();
    } else {
      separator = transcript.slice(idxPrice + priceStr.length, idxItem).trim();
    }

    // Clean up separator (remove spaces, symbols, and punctuation)
    separator = separator.replace(/[^\w\u0E00-\u0E7F]/g, "").trim();

    if (!separator || separator.length < 2 || separator.length > 10) return false;

    // Ignore if it's already a known keyword
    if (
      priceKeywords.value.includes(separator) ||
      codeKeywords.value.includes(separator) ||
      unitKeywords.value.includes(separator)
    ) {
      return false;
    }

    // Ignore if it is just a number
    if (/^\d+$/.test(separator)) return false;

    // Increment candidate count in Firebase
    const candidateRef = dbRef(db, `settings/voice_patterns/candidates/${separator}`);
    const snap = await get(candidateRef);
    const currentScore = snap.exists() ? snap.val() : 0;
    const newScore = currentScore + 1;

    logger.system(`🎙️ Voice Learning: Candidate separator found: "${separator}" (Score: ${newScore}/2)`);

    if (newScore >= 2) {
      // Promote to active price keywords!
      const newPriceKeywords = [...priceKeywords.value, separator];
      
      await update(dbRef(db), {
        "settings/voice_patterns/priceKeywords": newPriceKeywords,
        [`settings/voice_patterns/candidates/${separator}`]: null
      });

      logger.success(`🎉 Voice Learning: Auto-learned new price keyword: "${separator}"!`);
      Swal.fire({
        icon: "success",
        title: "เรียนรู้คำใหม่สำเร็จ!",
        text: `ระบบเรียนรู้คำบอกราคาเพิ่มเติม: "${separator}" และนำไปใช้งานจริงเรียบร้อยแล้ว`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000
      });
    } else {
      await set(candidateRef, newScore);
    }
    return true;
  }

  /**
   * Triggers the self-learning mechanism by looking at recent transcripts.
   */
  async function triggerSelfLearning(itemId, price) {
    if (!systemStore.currentVideoId) return;

    try {
      // Query last 5 voice transcripts
      const voiceChatRef = query(
        dbRef(db, `voice_chats/${systemStore.currentVideoId}`),
        limitToLast(5)
      );

      const snapshot = await get(voiceChatRef);
      if (!snapshot.exists()) return;

      const transcriptsData = [];
      snapshot.forEach((child) => {
        const val = child.val();
        if (val && val.text) {
          transcriptsData.push(val);
        }
      });

      // Check newest first
      transcriptsData.sort((a, b) => b.timestamp - a.timestamp);

      const now = Date.now();
      for (const t of transcriptsData) {
        // Only look at transcripts from the last 45 seconds
        if (now - t.timestamp > 45000) continue;

        const success = await learnFromManualCorrection(t.text, itemId, price);
        if (success) {
          break; // Stop once we successfully extract a candidate
        }
      }
    } catch (err) {
      logger.error("VoiceLearning: Error in triggerSelfLearning:", err);
    }
  }

  /**
   * Reset learned patterns back to default.
   */
  async function resetLearnedPatterns() {
    const patternsRef = dbRef(db, "settings/voice_patterns");
    await set(patternsRef, {
      codeKeywords: DEFAULT_CODE_KEYWORDS,
      priceKeywords: DEFAULT_PRICE_KEYWORDS,
      unitKeywords: DEFAULT_UNIT_KEYWORDS,
      candidates: {}
    });
    logger.system("VoiceLearning: Reset all patterns and candidates to default.");
    Swal.fire({
      icon: "success",
      title: "รีเซ็ตคลังคำสำเร็จ",
      text: "ระบบรีเซ็ตคำสั่งเสียงที่เรียนรู้กลับเป็นค่าเริ่มต้นแล้ว",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000
    });
  }

  return {
    codeKeywords,
    priceKeywords,
    unitKeywords,
    candidates,
    initVoicePatterns,
    triggerSelfLearning,
    resetLearnedPatterns
  };
});

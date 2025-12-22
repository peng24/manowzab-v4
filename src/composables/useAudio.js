import { ref } from "vue";
import { useSystemStore } from "../stores/system";

export function useAudio() {
  const systemStore = useSystemStore();
  const audioCtx = ref(null);
  const synth = window.speechSynthesis;
  const speechQueue = ref([]);
  const isSpeaking = ref(false);

  function initAudio() {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // ✅ เพิ่ม: ฟังก์ชันปลดล็อคเสียงแบบเงียบ (ไม่ติ๊ง)
  function unlockAudio() {
    initAudio();
    if (audioCtx.value && audioCtx.value.state === "suspended") {
      audioCtx.value.resume();
    }
    if (!audioCtx.value) return;

    // สร้าง Oscillator เปล่าๆ ขึ้นมาสั้นๆ เพื่อหลอก Browser ว่ามีการใช้เสียงแล้ว
    const oscillator = audioCtx.value.createOscillator();
    const gainNode = audioCtx.value.createGain();

    gainNode.gain.value = 0; // 🔇 ปิดเสียงเงียบกริบ

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.value.destination);

    oscillator.start();
    oscillator.stop(audioCtx.value.currentTime + 0.001);
  }

  function queueSpeech(text) {
    // ถ้าปิดเสียง ไม่ต้องพูด
    if (!systemStore.isSoundOn) return;

    initAudio();

    if (audioCtx.value && audioCtx.value.state === "suspended") {
      audioCtx.value.resume();
    }

    speechQueue.value.push(text);
    if (!isSpeaking.value) processQueue();
  }

  function processQueue() {
    if (speechQueue.value.length === 0) {
      isSpeaking.value = false;
      return;
    }

    if (synth.speaking && !isSpeaking.value) {
      synth.cancel();
    }

    isSpeaking.value = true;
    const utterance = new SpeechSynthesisUtterance(speechQueue.value.shift());
    utterance.lang = "th-TH";
    utterance.rate = 1.0; // ความเร็วปกติ

    const voices = synth.getVoices();
    const thVoice = voices.find((v) => v.lang.includes("th"));
    if (thVoice) utterance.voice = thVoice;

    utterance.onend = () => {
      isSpeaking.value = false;
      processQueue();
    };

    utterance.onerror = () => {
      isSpeaking.value = false;
      processQueue();
    };

    synth.speak(utterance);
  }

  function playDing() {
    if (!systemStore.isSoundOn) return;
    initAudio();

    if (audioCtx.value && audioCtx.value.state === "suspended") {
      audioCtx.value.resume();
    }
    if (!audioCtx.value) return;

    const oscillator = audioCtx.value.createOscillator();
    const gainNode = audioCtx.value.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.value.destination);

    // เสียงติ๊ง (Sine Wave ความถี่สูงแล้วลดลงเร็วๆ)
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, audioCtx.value.currentTime); // เริ่มสูง
    oscillator.frequency.exponentialRampToValueAtTime(
      400,
      audioCtx.value.currentTime + 0.3
    );

    gainNode.gain.setValueAtTime(0.5, audioCtx.value.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.01,
      audioCtx.value.currentTime + 0.3
    );

    oscillator.start();
    oscillator.stop(audioCtx.value.currentTime + 0.3);
  }

  function resetVoice() {
    synth.cancel();
    speechQueue.value = [];
    isSpeaking.value = false;
  }

  return {
    queueSpeech,
    playDing,
    resetVoice,
    unlockAudio, // ✅ Export ฟังก์ชันนี้ไปให้ App.vue ใช้
  };
}

import { ref } from "vue";
import { useSystemStore } from "../stores/system";
import { ttsService } from "../services/TextToSpeech";

export function useAudio() {
  const systemStore = useSystemStore();
  const audioCtx = ref(null);
  const isSpeaking = ref(false); // Reactive wrapper for UI if needed

  function initAudio() {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // ✅ ฟังก์ชันปลดล็อคเสียงแบบเงียบ (ไม่ติ๊ง)
  // ✅ ฟังก์ชันปลดล็อคเสียงแบบเงียบ (ไม่ติ๊ง)
  async function unlockAudio() {
    initAudio();
    if (!audioCtx.value) return false;

    try {
      if (audioCtx.value.state === "suspended") {
        await audioCtx.value.resume();
      }
    } catch (err) {
      console.warn("Audio resume failed:", err);
    }

    if (audioCtx.value.state !== "running") return false;

    try {
        // สร้าง Oscillator เปล่าๆ ขึ้นมาสั้นๆ เพื่อหลอก Browser ว่ามีการใช้เสียงแล้ว
        const oscillator = audioCtx.value.createOscillator();
        const gainNode = audioCtx.value.createGain();

        gainNode.gain.value = 0; // 🔇 ปิดเสียงเงียบกริบ

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.value.destination);

        oscillator.start();
        oscillator.stop(audioCtx.value.currentTime + 0.001);
        return true;
    } catch (e) {
        console.error("Silent unlock failed:", e);
        return false;
    }
  }

  function queueSpeech(text) {
    // NOTE: Overloading legacy function to support simple text calls
    // But ideally should use full (name, msg)
    // For compatibility, if we receive one string, we treat it as message with no name (or parse it?)
    // However, ChatProcessor will be updated to call speak(name, msg) if possible.
    // Let's keep this compatible:

    if (!systemStore.isSoundOn) return;

    // Legacy support: if text is the only arg, pass it as message
    // If it contains " ... ", try to split? No, let's just pass it through.
    ttsService.speak("", text);
  }

  // New API
  function speak(author, message) {
    if (!systemStore.isSoundOn) return;
    ttsService.speak(author, message);
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
    ttsService.reset();
  }

  return {
    queueSpeech, // Kept for backward compatibility
    speak,       // New preferred method
    playDing,
    resetVoice,
    unlockAudio,
  };
}


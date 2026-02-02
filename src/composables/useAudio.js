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

  /**
   * Play sound effect with proper async/await support
   * @param {string} type - 'success', 'error', or 'cancel'
   * @returns {Promise} Resolves when sound finishes playing
   */
  function playSfx(type = 'success') {
    return new Promise((resolve) => {
      if (!systemStore.isSoundOn) {
        resolve();
        return;
      }

      initAudio();

      if (audioCtx.value && audioCtx.value.state === "suspended") {
        audioCtx.value.resume();
      }
      if (!audioCtx.value) {
        resolve();
        return;
      }

      const ctx = audioCtx.value;
      const now = ctx.currentTime;

      if (type === 'success') {
        // 🎵 Ka-Ching! (Coin sound - Two ascending tones)
        const duration = 0.5;

        // First tone (lower)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(800, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.2);

        // Second tone (higher)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1200, now + 0.1);
        gain2.gain.setValueAtTime(0.4, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.4);

        setTimeout(resolve, duration * 1000);

      } else if (type === 'error') {
        // 🔴 Buzzer (Low harsh sound)
        const duration = 0.6;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth"; // Harsh sound
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);

        setTimeout(resolve, duration * 1000);

      } else if (type === 'cancel') {
        // 🔵 Pop (Neutral quick sound)
        const duration = 0.3;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        setTimeout(resolve, duration * 1000);

      } else {
        // Unknown type - resolve immediately
        resolve();
      }
    });
  }

  function resetVoice() {
    ttsService.reset();
  }

  return {
    queueSpeech, // Kept for backward compatibility
    speak,       // New preferred method
    playSfx,     // ✅ New sound effects system
    resetVoice,
    unlockAudio,
  };
}


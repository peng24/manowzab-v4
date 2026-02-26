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

  // ✅ Unlock all audio types on iOS (AudioContext, Native TTS, HTML5 Audio)
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
      // 1. Unlock AudioContext (for SFX)
      const oscillator = audioCtx.value.createOscillator();
      const gainNode = audioCtx.value.createGain();

      gainNode.gain.value = 0; // 🔇 Silent

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.value.destination);

      oscillator.start();
      oscillator.stop(audioCtx.value.currentTime + 0.001);

      // 2. Unlock Native TTS (SpeechSynthesis API)
      ttsService.unlockNative();

      // 3. Unlock Google TTS Audio Element (HTML5 Audio)
      ttsService.unlockAudioElement();

      console.log("🔓 All audio systems unlocked!");
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

  let activeOscillators = [];

  /**
   * Play sound effect without blocking TTS
   * @param {string} type - 'success', 'error', or 'cancel'
   * @returns {Promise} Resolves immediately after starting the sound
   */
  function playSfx(type = "success") {
    return new Promise(async (resolve) => {
      if (!systemStore.isSoundOn) {
        resolve();
        return;
      }

      initAudio();

      if (audioCtx.value && audioCtx.value.state === "suspended") {
        await audioCtx.value.resume();
      }
      if (!audioCtx.value) {
        resolve();
        return;
      }

      const ctx = audioCtx.value;
      const now = ctx.currentTime;

      // Stop any active sounds to prevent overlapping
      activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {
          // ignore
        }
      });
      activeOscillators = [];

      if (type === "success") {
        // 🔔 Bright Bell
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(1200, now);
        gain1.gain.setValueAtTime(0.1, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(1600, now);
        gain2.gain.setValueAtTime(0.05, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.4);

        activeOscillators.push(osc1, osc2);
      } else if (type === "error") {
        // 🔴 Error (Low harsh sound)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(150, now + 0.3);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);

        activeOscillators.push(osc);
      } else if (type === "cancel") {
        // 🚨 Buzzer (อ๊อด)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);

        activeOscillators.push(osc);
      }

      // Resolve immediately to not block TTS
      resolve();
    });
  }

  function resetVoice() {
    ttsService.reset();
  }

  return {
    queueSpeech, // Kept for backward compatibility
    speak, // New preferred method
    playSfx, // ✅ New sound effects system
    resetVoice,
    unlockAudio,
  };
}

import { ref } from "vue";
import { useSystemStore } from "../stores/system";
import { ttsService } from "../services/TextToSpeech";

// ✅ Global Unified Audio Queue (persists across re-renders)
const audioQueue = [];
let isAudioProcessing = false;

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
    if (!systemStore.isSoundOn) return;
    ttsService.speak("", text);
  }

  let activeOscillators = [];

  /**
   * Play sound effect without blocking TTS
   * @param {string} type - 'success', 'error', or 'cancel'
   * @returns {Promise} Resolves immediately after starting the sound
   */
  function playSfx(type = "success") {
    return new Promise(async (resolve) => {
      try {
        if (!systemStore.isSoundOn) {
          return;
        }

        initAudio();

        if (audioCtx.value && audioCtx.value.state === "suspended") {
          await audioCtx.value.resume();
        }
        if (!audioCtx.value) {
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
          // Soft Bright Chime
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sine";
          osc1.frequency.setValueAtTime(1200, now);
          gain1.gain.setValueAtTime(0.03, now); // Very soft
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.4);

          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1600, now);
          gain2.gain.setValueAtTime(0.02, now); // Very soft
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now);
          osc2.stop(now + 0.3);

          activeOscillators.push(osc1, osc2);
        } else if (type === "error") {
          // Soft Low Boop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine"; // Changed from sawtooth
          osc.frequency.setValueAtTime(250, now);
          gain.gain.setValueAtTime(0.04, now); // Very soft
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);

          activeOscillators.push(osc);
        } else if (type === "cancel") {
          // Soft Pop
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine"; // Changed from sawtooth
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.15); // Drop frequency for pop effect
          gain.gain.setValueAtTime(0.04, now); // Very soft
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15); // Short duration
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);

          activeOscillators.push(osc);
        }
      } catch (err) {
        console.warn("⚠️ SFX Playback skipped:", err);
      } finally {
        resolve();
      }
    });
  }

  function resetVoice() {
    // 1. Clear the global unified audio queue
    audioQueue.length = 0;

    // 2. Stop any currently playing SFX
    activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {
        // ignore
      }
    });
    activeOscillators = [];

    // 3. Reset the TTS service (stops current speech and clears TTS queue)
    ttsService.reset();

    // 4. Reset processing state so new incoming sounds can start immediately
    isAudioProcessing = false;
  }

  // ✅ Unified Audio Queue Processor (SFX → TTS, sequential)
  async function processAudioQueue() {
    if (isAudioProcessing || audioQueue.length === 0) return;
    isAudioProcessing = true;

    const task = audioQueue.shift();

    try {
      // 1. Play SFX and wait for it to finish
      if (task.sfxType) {
        await playSfx(task.sfxType);
      }

      // 2. Play TTS and wait for it to finish
      if (task.message) {
        const ttsPromise = ttsService.speak(task.author, task.message);
        if (ttsPromise instanceof Promise) {
          await ttsPromise.catch((e) => console.warn("TTS Error:", e));
        }
      }
    } catch (err) {
      console.error("Audio Queue Error:", err);
    }

    isAudioProcessing = false;
    // Process next item in the queue
    processAudioQueue();
  }

  // ✅ Unified Entry Point: queues SFX + TTS as a single sequential task
  function queueAudio(sfxType, author, message) {
    if (!systemStore.isSoundOn) return;
    audioQueue.push({ sfxType, author, message });
    processAudioQueue();
  }

  return {
    queueSpeech, // Legacy
    queueAudio, // ✅ Unified Queue API
    playSfx,
    resetVoice,
    unlockAudio,
  };
}

import { ref } from "vue";
import { useSystemStore } from "../stores/system";
import { ttsService } from "../services/TextToSpeech";

// ✅ Global Singleton AudioContext (Shared across all components)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ✅ Global Unified Audio Queue (persists across re-renders)
const audioQueue = [];
let isAudioProcessing = false;
let activeOscillators = []; // ✅ Shared globally across all useAudio instances

let sleepAudioBuffer = null;
let activeSleepSources = [];
let activeHtmlAudios = [];

async function preloadSleepAudio() {
  try {
    if (!audioCtx) return;
    const response = await fetch("/PP_SP_sleep.wav");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    sleepAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    console.log("💤 Sleep mode audio preloaded successfully!");
  } catch (err) {
    console.warn("⚠️ Failed to preload sleep mode audio:", err);
  }
}

// Start preloading immediately in the background
preloadSleepAudio();

async function waitForSpeechToFinish() {
  const maxWait = 10000; // 10s max wait
  const start = Date.now();
  while (window.speechSynthesis && window.speechSynthesis.speaking && (Date.now() - start < maxWait)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}



export function useAudio() {
  const systemStore = useSystemStore();
  const isSpeaking = ref(false); // Reactive wrapper for UI if needed

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

        if (audioCtx && audioCtx.state === "suspended") {
          await Promise.race([
            audioCtx.resume(),
            new Promise((resolve) => setTimeout(resolve, 2000))
          ]).catch(() => console.warn("SFX AudioContext resume timeout"));
        }
        if (!audioCtx) {
          return;
        }

        const ctx = audioCtx;
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
        } else if (type === "sleep") {
          await playSleepSound();
        }
      } catch (err) {
        console.warn("⚠️ SFX Playback skipped:", err);
      } finally {
        resolve();
      }
    });
  }

  function playSleepSound() {
    return new Promise(async (resolve) => {
      try {
        // Wait for native speech synthesis to finish before playing the sleep chime
        await waitForSpeechToFinish();

        if (audioCtx && audioCtx.state === "suspended") {
          await Promise.race([
            audioCtx.resume(),
            new Promise((resolve) => setTimeout(resolve, 2000))
          ]).catch(() => console.warn("Sleep AudioContext resume timeout"));
        }

        if (!audioCtx) {
          resolve();
          return;
        }

        if (sleepAudioBuffer) {
          const source = audioCtx.createBufferSource();
          source.buffer = sleepAudioBuffer;
          
          const gainNode = audioCtx.createGain();
          gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
          
          source.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          activeSleepSources.push(source);
          
          source.onended = () => {
            const idx = activeSleepSources.indexOf(source);
            if (idx > -1) activeSleepSources.splice(idx, 1);
            resolve();
          };
          
          source.start(0);
        } else {
          // Fallback using HTMLAudioElement if buffer is not loaded
          const audio = new Audio("/PP_SP_sleep.wav");
          audio.volume = 0.5;
          
          activeHtmlAudios.push(audio);
          
          audio.onended = () => {
            const idx = activeHtmlAudios.indexOf(audio);
            if (idx > -1) activeHtmlAudios.splice(idx, 1);
            resolve();
          };
          
          audio.onerror = () => {
            const idx = activeHtmlAudios.indexOf(audio);
            if (idx > -1) activeHtmlAudios.splice(idx, 1);
            resolve();
          };
          
          await audio.play().catch((e) => {
            console.warn("Sleep audio autoplay blocked:", e);
            resolve();
          });
        }
      } catch (err) {
        console.warn("⚠️ Sleep sound playback failed:", err);
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

    // Stop active sleep sources
    activeSleepSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    activeSleepSources = [];

    // Stop active html audios
    activeHtmlAudios.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {}
    });
    activeHtmlAudios = [];

    // 3. Reset the TTS service (stops current speech and clears TTS queue)
    ttsService.reset();

    // 4. Reset processing state so new incoming sounds can start immediately
    isAudioProcessing = false;
  }

  // ✅ Unified Audio Queue Processor (SFX → TTS, sequential)
  // ✅ Fixed: Safety timeout + finally block to prevent deadlock on iPad
  const QUEUE_SAFETY_TIMEOUT = 35000; // 35s max per item

  async function processAudioQueue() {
    if (isAudioProcessing || audioQueue.length === 0) return;
    isAudioProcessing = true;

    const task = audioQueue.shift();

    try {
      // 1. Play SFX and wait for it to finish
      if (task.sfxType) {
        await playSfx(task.sfxType);
      }

      // 2. Play TTS and wait for it to finish (with safety timeout)
      if (task.message) {
        const ttsPromise = ttsService.speak(task.author, task.message);
        if (ttsPromise instanceof Promise) {
          // ✅ Race against safety timeout to prevent permanent queue stall
          await Promise.race([
            ttsPromise.catch((e) => console.warn("TTS Error:", e)),
            new Promise((resolve) => setTimeout(resolve, QUEUE_SAFETY_TIMEOUT)),
          ]);
        }
      }
    } catch (err) {
      console.error("Audio Queue Error:", err);
    } finally {
      // ✅ ALWAYS reset — prevents permanent deadlock
      isAudioProcessing = false;
      // ✅ Use setTimeout to avoid stack overflow on very large queues
      setTimeout(() => processAudioQueue(), 0);
    }
  }

  // ✅ Unified Entry Point: queues SFX + TTS as a single sequential task
  function queueAudio(sfxType, author, message) {
    if (!systemStore.isSoundOn) return;
    audioQueue.push({ sfxType, author, message });
    processAudioQueue();
  }

  return {
    queueAudio, // ✅ Unified Queue API
    playSfx,
    resetVoice,
  };
}

import confetti from "canvas-confetti";
import { audioCtx } from "../composables/useAudio";
import { logger } from "./logger";

// Preload cache variables
let celebrationAudioBuffer = null;

// ✅ Preload the audio file into memory immediately when the app loads
export async function preloadCelebrationAudio() {
  try {
    if (typeof window === "undefined" || !audioCtx) return;

    // Fetch the MP3 file once
    const response = await fetch(
      "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
    );
    const arrayBuffer = await response.arrayBuffer();

    // Decode into AudioBuffer for instant, zero-latency playback
    celebrationAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    logger.debug("🎉 Celebration audio preloaded successfully!");
  } catch (err) {
    logger.warn("⚠️ Failed to preload celebration audio:", err);
  }
}

// Start preloading in the background
preloadCelebrationAudio();

export function triggerCelebration(percentage) {
  const duration = 5000; // Celebration burst (5 seconds)
  const animationEnd = Date.now() + duration;

  // ✅ Play the preloaded audio buffer directly from memory
  if (audioCtx && celebrationAudioBuffer) {
    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }
      const source = audioCtx.createBufferSource();
      source.buffer = celebrationAudioBuffer;

      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.2; // 20% volume (very soft)

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      source.start(0);
    } catch (err) {
      logger.warn("Audio buffer playback error:", err);
    }
  } else {
    // Fallback just in case the trigger happens before the preload finishes
    try {
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
      );
      audio.volume = 0.2;
      audio
        .play()
        .catch((e) => logger.warn("Fallback audio autoplay blocked", e));
    } catch (e) {}
  }

  // ✅ Trigger Confetti
  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire from left edge
    confetti({
      particleCount,
      startVelocity: 45,
      spread: 60,
      angle: 60,
      zIndex: 9999,
      origin: { x: 0, y: 1 },
    });
    // Fire from right edge
    confetti({
      particleCount,
      startVelocity: 45,
      spread: 60,
      angle: 120,
      zIndex: 9999,
      origin: { x: 1, y: 1 },
    });
  }, 250);
}

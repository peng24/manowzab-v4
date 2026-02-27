import confetti from "canvas-confetti";

export function triggerCelebration(percentage) {
  const duration = 1500; // Very short burst (1.5 seconds)
  const animationEnd = Date.now() + duration;

  // Play a soft, non-disruptive success chime
  try {
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3",
    );
    audio.volume = 0.2; // 20% volume (very soft)
    audio
      .play()
      .catch((e) => console.warn("Audio autoplay blocked by browser"));
  } catch (err) {
    console.warn("Audio playback error:", err);
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Fire from left edge
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      origin: { x: Math.random() * 0.2, y: Math.random() - 0.2 },
    });
    // Fire from right edge
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 360,
      origin: { x: Math.random() * 0.2 + 0.8, y: Math.random() - 0.2 },
    });
  }, 250);
}

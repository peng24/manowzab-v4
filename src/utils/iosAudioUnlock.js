let isUnlocked = false;

export function unlockAudio() {
  if (isUnlocked) return;

  // ปลดล็อก Text-to-Speech (speechSynthesis)
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; // ตั้งเสียงเป็น 0 เพื่อไม่ให้เกิดเสียงรบกวนตอนปลดล็อก
    window.speechSynthesis.speak(utterance);
  }

  // ปลดล็อก Web Audio API (สำหรับเอฟเฟกต์เสียงอื่นๆ)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (AudioContext) {
    const audioCtx = new AudioContext();
    const source = audioCtx.createBufferSource();
    source.buffer = audioCtx.createBuffer(1, 1, 22050);
    source.connect(audioCtx.destination);
    source.start(0);
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  isUnlocked = true;
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('click', unlockAudio);
  console.log('✅ iOS/iPad Audio System Unlocked successfully');
}

// ผูก Event รอการแตะหน้าจอครั้งแรกจากผู้ใช้
document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
document.addEventListener('click', unlockAudio, { once: true, passive: true });

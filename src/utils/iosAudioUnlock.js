let isUnlocked = false;
let sharedAudioCtx = null; // ✅ Reuse single AudioContext instead of creating duplicates

function getOrCreateAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

export function unlockAudio() {
  if (isUnlocked) return;

  // ปลดล็อก Text-to-Speech (speechSynthesis)
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0; // ตั้งเสียงเป็น 0 เพื่อไม่ให้เกิดเสียงรบกวนตอนปลดล็อก
    window.speechSynthesis.speak(utterance);
  }

  // ✅ ปลดล็อก Web Audio API — ใช้ shared AudioContext แทนสร้างใหม่
  const audioCtx = getOrCreateAudioContext();
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    try {
      const source = audioCtx.createBufferSource();
      source.buffer = audioCtx.createBuffer(1, 1, 22050);
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (e) {
      // Ignore — may fail if context is in an invalid state
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

// ✅ Handle iOS Safari Background/Tab-Switch Recovery
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // ✅ Check the shared AudioContext instead of creating a new one
    const audioCtx = getOrCreateAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      isUnlocked = false;
      // Re-register listeners for next user interaction
      document.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
      document.addEventListener('click', unlockAudio, { once: true, passive: true });
      console.warn('⚠️ AudioContext suspended on return. Awaiting user interaction to unlock.');

      // ✅ Also try to resume immediately (may work if page just came back)
      audioCtx.resume().catch(() => {});
    }
  }
});

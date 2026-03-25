let isUnlocked = false;
let sharedAudioCtx = null; // ✅ Reuse single AudioContext instead of creating duplicates

function getOrCreateAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    // Older Safari might require AudioContext to be created inside the event handler
    sharedAudioCtx = new AudioContextClass();
  }
  return sharedAudioCtx;
}

export function unlockAudio() {
  if (isUnlocked) return;

  // 1. ปลดล็อก Text-to-Speech (speechSynthesis)
  if ('speechSynthesis' in window) {
    try {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      window.speechSynthesis.cancel(); // Clear any previous stuck utterances
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('speechSynthesis unlock failed:', e);
    }
  }

  // 2. ปลดล็อก Web Audio API
  const audioCtx = getOrCreateAudioContext();
  if (audioCtx) {
    // Older Safari (iOS < 14) is very strict about resume() inside the same tick
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch((err) => {
        console.warn('audioCtx.resume() failed:', err);
      });
    }

    try {
      // Create and play a silent buffer
      // Use 44100Hz as it is the most compatible sample rate for older iOS hardware
      const source = audioCtx.createBufferSource();
      const buffer = audioCtx.createBuffer(1, 1, 44100);
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);

      // Check state to confirm unlock
      if (audioCtx.state === 'running') {
        isUnlocked = true;
        document.removeEventListener('touchstart', unlockAudio);
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('mousedown', unlockAudio);
        console.log('✅ iOS/iPad Audio System Unlocked successfully');
      }
    } catch (e) {
      console.warn('Web Audio unlock buffer failed:', e);
    }
  }
}

// ผูก Event รอการแตะหน้าจอ - Removed { passive: true } as it can sometimes 
// prevent audio unlocking on older Safari versions that require "active" interaction.
// We use once: false because we only remove them once isUnlocked is truly true.
document.addEventListener('touchstart', unlockAudio, { once: false });
document.addEventListener('click', unlockAudio, { once: false });
document.addEventListener('mousedown', unlockAudio, { once: false });

// ✅ Handle iOS Safari Background/Tab-Switch Recovery
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const audioCtx = getOrCreateAudioContext();
    if (audioCtx && audioCtx.state !== 'running') {
      isUnlocked = false;
      document.addEventListener('touchstart', unlockAudio, { once: false });
      document.addEventListener('click', unlockAudio, { once: false });
      document.addEventListener('mousedown', unlockAudio, { once: false });
      console.warn('⚠️ AudioContext suspended on return. Awaiting user interaction to unlock.');
      
      // Try immediate resume, though it often requires a new gesture on iOS
      audioCtx.resume().catch(() => {});
    }
  }
});

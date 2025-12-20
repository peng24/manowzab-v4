import { ref } from "vue";
import { useSystemStore } from "../stores/system";

export function useAudio() {
  const systemStore = useSystemStore();
  const audioCtx = ref(null);
  const synth = window.speechSynthesis;
  const speechQueue = ref([]);
  const isSpeaking = ref(false);

  function initAudio() {
    if (!audioCtx.value) {
      audioCtx.value = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  function queueSpeech(text) {
    if (!systemStore.isSoundOn) return;
    initAudio();

    if (audioCtx.value && audioCtx.value.state === "suspended") {
      audioCtx.value.resume();
    }

    speechQueue.value.push(text);
    if (!isSpeaking.value) processQueue();
  }

  function processQueue() {
    if (speechQueue.value.length === 0) {
      isSpeaking.value = false;
      return;
    }

    if (synth.speaking && !isSpeaking.value) {
      synth.cancel();
    }

    isSpeaking.value = true;
    const utterance = new SpeechSynthesisUtterance(speechQueue.value.shift());
    utterance.lang = "th-TH";

    const voices = synth.getVoices();
    const thVoice = voices.find((v) => v.lang.includes("th"));
    if (thVoice) utterance.voice = thVoice;

    utterance.onend = () => {
      isSpeaking.value = false;
      processQueue();
    };

    utterance.onerror = () => {
      isSpeaking.value = false;
      processQueue();
    };

    synth.speak(utterance);
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

    oscillator.frequency.setValueAtTime(800, audioCtx.value.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      300,
      audioCtx.value.currentTime + 0.1
    );
    gainNode.gain.setValueAtTime(0.3, audioCtx.value.currentTime);
    gainNode.gain.linearRampToValueAtTime(
      0.01,
      audioCtx.value.currentTime + 0.1
    );

    oscillator.start();
    oscillator.stop(audioCtx.value.currentTime + 0.1);
  }

  function resetVoice() {
    synth.cancel();
    speechQueue.value = [];
    isSpeaking.value = false;
  }

  return {
    queueSpeech,
    playDing,
    resetVoice,
  };
}

import { useSystemStore } from "../stores/system";
import { logger } from "../utils/logger";
import { stripYouTubeEmotes } from "../data/youtubeEmotes";
import { replaceNumbersWithThaiWords } from "../utils/thaiNumberWords";
import { isGoogleCloudTtsEnabled } from "../utils/ttsConfig";
import { selectThaiVoice } from "../utils/nativeVoiceUtils";
import { GoogleTtsAudio } from "./GoogleTtsAudio";
import { audioRuntime, setAudioRuntime } from './audioRuntime';

// Module-scoped compiled regexes to prevent recreation in TTS sanitize loop
const TTS_EMOJI_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE00-\uFE0F\u200D\u20E3]/gu;
const SPECIAL_CHARS_REGEX = /[#*~_]/g;
const JONG_FIX_REGEX = /จอง/g;
const MULTI_SPACE_REGEX = /\s+/g;

// ✅ Global Storage to Prevent Garbage Collection
if (typeof window !== "undefined") {
  window.ttsActiveUtterances = window.ttsActiveUtterances || [];
}

export class TextToSpeech {
  constructor() {
    this.queue = [];
    this.isSpeaking = false;
    this.voices = [];
    this.poller = null;
    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = AudioCtx ? new AudioCtx() : null;
    } else {
      this.audioCtx = null;
    }
    this.currentSource = null; // ✅ Track active AudioBufferSource
    this.stuckTimer = null; // ✅ Safety timer to detect stuck state
    this.STUCK_TIMEOUT = 30000; // ✅ 30 seconds max per utterance
    this.consecutiveGoogleFailures = 0; // ✅ Track consecutive Google TTS failures
    this.playbackGeneration = 0;
    this.speakingCheckRetries = 0; // ✅ Track retries when waiting for native speaking state
    this.cachedBestVoice = null; // 🚀 O(1) Cached Thai Voice reference
    this.audioCache = new Map(); // 🚀 LRU In-Memory Audio Buffer Cache (Max 50 items)
    this.sanitizeCache = new Map(); // 🚀 LRU Memoization Cache for text sanitization (Max 300 items)
    this.phoneticCache = new Map(); // 🚀 LRU Memoization Cache for phonetic customer names (Max 500 items)

    this.googleAudio = new GoogleTtsAudio({
      getConfig: () => {
        const store = useSystemStore();
        return { enabled: isGoogleCloudTtsEnabled() && store.useOnlineTts,
          keys: (store.googleApiKey || "").split(",").map(key => key.trim()).filter(Boolean),
          voice: store.googleVoiceName || "th-TH-Standard-A", activeKey: store.activeKeyIndex || 1 };
      },
      getCached: key => this.getCachedAudio(key),
      setCached: (key, buffer) => this.setCachedAudio(key, buffer),
      onKeySuccess: index => {
        this.consecutiveGoogleFailures = 0;
        const store = useSystemStore();
        if (store.activeKeyIndex !== index) { store.activeKeyIndex = index; store.updatePresenceTtsKey(); }
      },
      warn: message => logger.warn(message),
    });

    // Bind methods
    this.processQueue = this.processQueue.bind(this);
    this.loadVoices = this.loadVoices.bind(this);

    // Set up voice loading
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = this.loadVoices;
      this.loadVoices();
      let pollAttempts = 0;
      this.poller = setInterval(() => {
        this.loadVoices();
        pollAttempts++;
        if (pollAttempts >= 20 && this.poller) {
          clearInterval(this.poller);
          this.poller = null;
        }
      }, 500);
    }
  }

  /**
   * 🚀 Get cached audio ArrayBuffer (returns slice copy for AudioContext decoding safety)
   */
  getCachedAudio(key) {
    if (this.audioCache && this.audioCache.has(key)) {
      const buffer = this.audioCache.get(key);
      // Refresh LRU order
      this.audioCache.delete(key);
      this.audioCache.set(key, buffer);
      return buffer.slice(0);
    }
    return null;
  }

  /**
   * 🚀 Set cached audio ArrayBuffer (bounded to max 50 items)
   */
  setCachedAudio(key, arrayBuffer) {
    if (!this.audioCache) this.audioCache = new Map();
    if (this.audioCache.size >= 50) {
      const oldestKey = this.audioCache.keys().next().value;
      this.audioCache.delete(oldestKey);
    }
    this.audioCache.set(key, arrayBuffer.slice(0));
  }

  /**
   * Load voices
   */
  loadVoices() {
    const vs = typeof window !== "undefined" ? (window.speechSynthesis?.getVoices?.() || []) : [];

    if (vs.length === 0) {
      return;
    }

    this.voices = vs;

    this.cachedBestVoice = selectThaiVoice(this.voices);

    // Clear poller once voices are loaded
    if (this.cachedBestVoice && this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }

    logger.tts("Loaded " + this.voices.length + " voices.");
  }

  /**
   * ✅ Auto-resume AudioContext — recovers from iPad idle suspension
   * Called before every speak attempt to ensure audio is ready
   */
  async ensureAudioContextReady() {
    try {
      if (!this.audioCtx) return false;
      if (this.audioCtx.state === "suspended") {
        if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) {
          logger.tts("AudioContext suspended — awaiting user interaction");
          return false;
        }
        logger.tts("AudioContext suspended — attempting auto-resume...");
        await Promise.race([
          this.audioCtx.resume(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Resume timeout")), 2000))
        ]);
        logger.tts("AudioContext resumed successfully");
      }
      return this.audioCtx.state === "running";
    } catch (e) {
      logger.warn("AudioContext auto-resume failed:", e);
      return false;
    }
  }

  /**
   * Get best Thai voice
   * Priority: installed Thai > browser-provided Google Thai > other Thai
   */
  getBestVoice() {
    if (!this.cachedBestVoice) {
      this.loadVoices();
    }
    return this.cachedBestVoice;
  }

  /**
   * Clear all in-memory TTS caches (sanitize cache, phonetic cache, audio buffer cache)
   */
  clearCache() {
    if (this.sanitizeCache) this.sanitizeCache.clear();
    if (this.phoneticCache) this.phoneticCache.clear();
    if (this.audioCache) this.audioCache.clear();
    logger.debug("🧹 TTS Service: All in-memory caches cleared");
  }

  /**
   * Sanitize text for TTS: Remove Emojis and Symbols (Memoized)
   */
  sanitize(text) {
    if (!text) return "";

    if (this.sanitizeCache && this.sanitizeCache.has(text)) {
      const cached = this.sanitizeCache.get(text);
      this.sanitizeCache.delete(text);
      this.sanitizeCache.set(text, cached);
      return cached;
    }

    // Replace emoji with empty string
    let cleanText = text.replace(TTS_EMOJI_REGEX, "");

    // ✅ Remove YouTube custom emote shortcodes (e.g. :yt:, :face-blue-smiling:)
    cleanText = stripYouTubeEmotes(cleanText);

    // Remove specific special chars that might annoy TTS (optional)
    cleanText = cleanText.replace(SPECIAL_CHARS_REGEX, "");

    // ✅ แก้ไขปัญหาการอ่านออกเสียงเพี้ยน (เช่น คำว่า "จอง" อ่านเป็น "จอ ออ งอ" โดยเปลี่ยนเป็น "จอร์ง" เพื่อให้ออกเสียง "จอง" ได้ถูกต้อง)
    cleanText = cleanText.replace(JONG_FIX_REGEX, "จอร์ง");

    // ✅ แก้ไขปัญหาการอ่านตัวเลข (เช่น 15 ให้อ่านเป็น "สิบห้า" ไม่ใช่ "หนึ่งห้า")
    cleanText = replaceNumbersWithThaiWords(cleanText);

    // Clean up double spaces
    cleanText = cleanText.replace(MULTI_SPACE_REGEX, " ").trim();

    // Limit length (prevent too long speech)
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500);
    }

    if (this.sanitizeCache) {
      if (this.sanitizeCache.size >= 300) {
        const oldestKey = this.sanitizeCache.keys().next().value;
        this.sanitizeCache.delete(oldestKey);
      }
      this.sanitizeCache.set(text, cleanText);
    }

    return cleanText;
  }

  /**
   * Convert Base64 string to Blob object
   */
  base64ToBlob(base64, type = "audio/mp3") {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type });
  }

  /**
   * Speak using Google Cloud TTS API with key rotation
   */
  async speakOnline(text) {
    if (!isGoogleCloudTtsEnabled()) { this.speakNative(text); return; }
    const generation = this.playbackGeneration;
    setAudioRuntime({ engine: 'google', phase: 'loading', fallback: false, voiceName: '' });
    let source;
    try {
      const buffer = await this.googleAudio.prepare(this.sanitize(text).substring(0, 500));
      if (generation !== this.playbackGeneration) return;
      if (!buffer) { this.consecutiveGoogleFailures++; this.speakNative(text, { fallback: useSystemStore().useOnlineTts }); return; }
      if (!await this.ensureAudioContextReady()) throw new Error("AudioContext unavailable");
      if (generation !== this.playbackGeneration) return;
      const decoded = await this.audioCtx.decodeAudioData(buffer);
      if (generation !== this.playbackGeneration) return;
      source = this.audioCtx.createBufferSource();
      this.currentSource = source;
      source.buffer = decoded;
      source.connect(this.audioCtx.destination);
      let ended = false;
      source.onended = () => {
        if (ended) return;
        ended = true;
        try { source.disconnect(); } catch { /* already disconnected */ }
        if (generation !== this.playbackGeneration) return;
        setAudioRuntime({ phase: 'idle' });
        this.clearStuckTimer();
        const complete = this._currentOnComplete;
        this._currentOnComplete = null;
        this.currentSource = null;
        this.isSpeaking = false;
        complete?.();
        this.processQueue();
      };
      source.start(0);
      setAudioRuntime({ engine: 'google', phase: 'speaking', fallback: false, voiceName: 'Google Standard' });
    } catch (error) {
      if (source) {
        source.onended = null;
        try { source.stop(); } catch { /* not started */ }
        try { source.disconnect(); } catch { /* already disconnected */ }
        if (this.currentSource === source) this.currentSource = null;
      }
      if (generation !== this.playbackGeneration) return;
      logger.warn("Google audio playback unavailable; using native speech");
      this.speakNative(text, { fallback: useSystemStore().useOnlineTts });
    }
  }

  prefetchSpeech(author, message) {
    const text = this.formatSpeechText(author, message);
    if (!text) return Promise.resolve(null);
    return this.googleAudio.prepare(this.sanitize(text).substring(0, 500), true);
  }

  retryGoogle() {
    this.googleAudio.retry();
    // A preference change must not mislabel an utterance that is still playing.
    if (this.currentSource || (this.isSpeaking && audioRuntime.phase === 'speaking')) return;
    setAudioRuntime({ engine: 'idle', phase: 'idle', fallback: false, voiceName: '' });
  }

  /**
   * Speak using native browser TTS
   */
  speakNative(text, { fallback = false } = {}) {
    const generation = this.playbackGeneration;
    try {
      const voice = this.getBestVoice();
      setAudioRuntime({ engine: 'native', phase: 'speaking', fallback, voiceName: voice?.name || '' });

      const utterance = new SpeechSynthesisUtterance(this.sanitize(text));
      utterance.lang = "th-TH";
      utterance.volume = 1.0;
      utterance.rate = 1.0;

      if (voice) {
        utterance.voice = voice;
      }

      logger.tts(
        `Native TTS: ${text.substring(0, 50) + (text.length > 50 ? "..." : "")}`,
      );

      // Push to global array to prevent garbage collection
      window.ttsActiveUtterances.push(utterance);

      // ✅ Guard against double-fire
      let hasEnded = false;
      const cleanupAndAdvance = (failed = false) => {
        if (hasEnded) return;
        hasEnded = true;
        const index = window.ttsActiveUtterances.indexOf(utterance);
        if (index > -1) {
          window.ttsActiveUtterances.splice(index, 1);
        }
        if (generation !== this.playbackGeneration) return;
        setAudioRuntime({ phase: failed ? 'error' : 'idle' });
        this.clearStuckTimer();
        if (this._currentOnComplete) {
          this._currentOnComplete();
          this._currentOnComplete = null;
        }
        this.isSpeaking = false;
        this.processQueue();
      };

      // Handle end
      utterance.onend = () => cleanupAndAdvance();

      // Handle error
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          logger.error("Native TTS Error:", e);
        } else {
          logger.warn("Native TTS interrupted");
        }
        cleanupAndAdvance(true);
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // ✅ Catch-all: ensure queue never stalls on unexpected errors
      logger.error("Native TTS setup failed:", e);
      setAudioRuntime({ phase: 'error' });
      this.clearStuckTimer();
      if (this._currentOnComplete) {
        this._currentOnComplete();
        this._currentOnComplete = null;
      }
      this.isSpeaking = false;
      this.processQueue();
    }
  }

  /**
   * ✅ Clear stuck detection timer
   */
  clearStuckTimer() {
    if (this.stuckTimer) {
      clearTimeout(this.stuckTimer);
      this.stuckTimer = null;
    }
  }

  /**
   * ✅ Start stuck detection timer — auto-resets if isSpeaking for too long
   */
  startStuckTimer() {
    this.clearStuckTimer();
    this.stuckTimer = setTimeout(() => {
      if (this.isSpeaking) {
        // Invalidate late fetch/decode/native callbacks before stopping this item.
        this.playbackGeneration++;
        this.googleAudio.cancel();
        setAudioRuntime({ phase: 'idle' });
        logger.warn(
          `TTS stuck for ${this.STUCK_TIMEOUT / 1000}s — auto-resetting queue`,
        );

        // ✅ Actually stop the current playback to prevent overlap!
        if (this.currentSource) {
          try {
            this.currentSource.onended = null;
            this.currentSource.stop();
            this.currentSource.disconnect();
          } catch(e) {}
          this.currentSource = null;
        }
        window.speechSynthesis.cancel();

        // ✅ Resolve pending Promise before moving on (prevents outer queue deadlock)
        if (this._currentOnComplete) {
          this._currentOnComplete();
          this._currentOnComplete = null;
        }
        this.isSpeaking = false;
        this.processQueue();
      }
    }, this.STUCK_TIMEOUT);
  }

  /**
   * Process queue based on system store setting
   */
  async processQueue() {
    // Stop if queue empty or already speaking
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }

    // Guard against native SpeechSynthesis overlapping by checking if it's currently speaking
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      this.speakingCheckRetries = (this.speakingCheckRetries || 0) + 1;
      if (this.speakingCheckRetries > 20) {
        logger.warn("SpeechSynthesis stuck in speaking state for >2s — force cancelling");
        window.speechSynthesis.cancel();
        this.speakingCheckRetries = 0;
      } else {
        setTimeout(() => this.processQueue(), 100);
        return;
      }
    }
    this.speakingCheckRetries = 0;

    this.isSpeaking = true;
    const item = this.queue.shift();
    const text = typeof item === "string" ? item : item.text;
    this._currentOnComplete = typeof item === "object" ? item.onComplete : null;

    const generation = this.playbackGeneration;
    // ✅ Auto-resume AudioContext before speaking (iPad idle recovery)
    await this.ensureAudioContextReady();
    if (generation !== this.playbackGeneration) return;

    // ✅ Start stuck detection timer
    this.startStuckTimer();

    // Check system store setting
    const systemStore = useSystemStore();

    if (
      isGoogleCloudTtsEnabled() && systemStore.useOnlineTts &&
      systemStore.googleApiKey
    ) {
      this.speakOnline(text);
    } else {
      this.speakNative(text);
    }
  }

  /**
   * Add message to queue and return a Promise that resolves when speech finishes.
   * @returns {Promise<void>}
   */
  formatSpeechText(author, message) {
    let sanitized = this.sanitize(message);

    // ✅ If message had content but got sanitized to empty (e.g. emoji-only),
    // read it as "ส่งสติกเกอร์" (sent sticker) so it's not silent.
    if (!sanitized && message && message.trim().length > 0) {
      sanitized = "ส่งสติกเกอร์";
    }

    if (!sanitized) return "";

    // Combine author and message
    let messageBody = sanitized;
    if (author && messageBody) {
      const trimmedAuthor = author.trim();
      if (trimmedAuthor) {
        // If message starts with author name (e.g. "มะระ 39 เมื่อวาน" or "ของมะระ 39 เมื่อวาน" with author "มะระ"),
        // strip author prefix so TTS doesn't repeat "มะระ ... มะระ 39 เมื่อวาน"
        const escaped = trimmedAuthor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const prefixRegex = new RegExp(`^(?:ของ(?:พี่|น้อง|แม่|ป้า)?\\s*)?${escaped}\\s*`, "i");
        if (prefixRegex.test(messageBody)) {
          const stripped = messageBody.replace(prefixRegex, "").trim();
          if (stripped) {
            messageBody = stripped;
          }
        }

        // If message ends with author name (e.g. "เสื้อสีแดง ราคาเท่าไหร่ เดย์" with author "เดย์"),
        // strip author suffix so TTS doesn't repeat "เดย์ ... เสื้อสีแดง ราคาเท่าไหร่ เดย์"
        const suffixRegex = new RegExp(`\\s+(?:ของ(?:พี่|น้อง|แม่|ป้า)?\\s*)?${escaped}$`, "i");
        if (suffixRegex.test(messageBody)) {
          const stripped = messageBody.replace(suffixRegex, "").trim();
          if (stripped) {
            messageBody = stripped;
          }
        }
      }
    }

    return author ? `${author} ... ${messageBody}` : messageBody;
  }

  speak(author, message) {
    const textToSpeak = this.formatSpeechText(author, message);
    if (!textToSpeak) return Promise.resolve();

    return new Promise((resolve) => {
      // Add to queue with a completion callback
      this.queue.push({ text: textToSpeak, onComplete: resolve });

      // Process queue
      this.processQueue();

      // Fallback timeout: ensure the Promise always resolves (max 35s)
      setTimeout(() => resolve(), 35000);
    });
  }

  /**
   * Reset TTS
   */
  reset() {
    this.playbackGeneration++;
    this.googleAudio.cancel();
    setAudioRuntime({ phase: 'idle' });
    // ✅ Clear stuck timer first
    this.clearStuckTimer();

    // ✅ Stop current AudioContext source (replaces audioPlayer cleanup)
    if (this.currentSource) {
      try {
        this.currentSource.onended = null; // Remove listener first
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        // Ignore — source may already be stopped
      }
      this.currentSource = null;
    }

    // Stop native speech synthesis
    window.speechSynthesis.cancel();

    // Clear queue and state — resolve any pending onComplete callbacks
    this.queue.forEach((item) => {
      if (typeof item === "object" && item.onComplete) item.onComplete();
    });
    this.queue = [];
    if (this._currentOnComplete) {
      this._currentOnComplete();
      this._currentOnComplete = null;
    }
    this.isSpeaking = false;
    window.ttsActiveUtterances = []; // Clear native utterances ref

    logger.tts("TTS Reset (Clean)");
  }
}

// Singleton Instance
export const ttsService = new TextToSpeech();

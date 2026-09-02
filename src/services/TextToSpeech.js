import { useSystemStore } from "../stores/system";
import { logger } from "../utils/logger";

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
    this.MAX_CONSECUTIVE_FAILURES = 5; // ✅ Switch to Native permanently after N failures
    this.googleDisabledPermanently = false; // ✅ Flag for permanent Native mode
    this.consecutiveEdgeFailures = 0; // ✅ Track consecutive Edge TTS failures
    this.MAX_EDGE_CONSECUTIVE_FAILURES = 3; // ✅ Cooldown after N failures
    this.edgeCooldownUntil = 0; // ✅ Timestamp for Edge TTS cooldown circuit breaker
    this.speakingCheckRetries = 0; // ✅ Track retries when waiting for native speaking state
    this.cachedBestVoice = null; // 🚀 O(1) Cached Thai Voice reference
    this.audioCache = new Map(); // 🚀 LRU In-Memory Audio Buffer Cache (Max 50 items)

    // Bind methods
    this.processQueue = this.processQueue.bind(this);
    this.loadVoices = this.loadVoices.bind(this);

    // Set up voice loading
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = this.loadVoices;
      this.loadVoices();
      this.poller = setInterval(this.loadVoices, 500);
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
    const vs = window.speechSynthesis.getVoices();

    if (vs.length === 0) {
      return;
    }

    this.voices = vs;

    // 🚀 O(1) Pre-cache best Thai voice on load instead of scanning array 4 times per utterance
    this.cachedBestVoice =
      this.voices.find(
        (v) =>
          v.name.includes("Google") &&
          (v.name.includes("Thai") || v.name.includes("ไทย")),
      ) ||
      this.voices.find(
        (v) => v.name.includes("Premwadee") || v.name.includes("Pattara"),
      ) ||
      this.voices.find((v) => v.name.includes("Narisa")) ||
      this.voices.find((v) => v.lang.startsWith("th")) ||
      null;

    // Clear poller once voices are loaded
    if (this.poller) {
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
      if (this.audioCtx.state === "suspended") {
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
   * Priority: Google Thai > Premwadee/Pattara > Narisa > lang=th
   */
  getBestVoice() {
    if (this.voices.length === 0) {
      this.loadVoices();
      return null;
    }
    return this.cachedBestVoice;
  }

  /**
   * Sanitize text for TTS: Remove Emojis and Symbols
   */
  sanitize(text) {
    if (!text) return "";

    // ✅ Regex to remove ALL Emojis (Surrogates, Dingbats, Transport, etc.)
    // This covers: 🎄, 🥳, 🙏, etc.
    const emojiRegex =
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]|\uD83F[\uDC00-\uDFFF]|[\u2000-\u26FF])/g;

    // Replace emoji with empty string
    let cleanText = text.replace(emojiRegex, "");

    // Remove specific special chars that might annoy TTS (optional)
    cleanText = cleanText.replace(/[#*~_]/g, "");

    // ✅ แก้ไขปัญหาการอ่านออกเสียงเพี้ยน (เช่น คำว่า "จอง" อ่านเป็น "จอ ออ งอ" โดยเปลี่ยนเป็น "จอร์ง" เพื่อให้ออกเสียง "จอง" ได้ถูกต้อง)
    cleanText = cleanText.replace(/จอง/g, "จอร์ง");

    // Clean up double spaces
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    // Limit length (prevent too long speech)
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500);
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

  async _generateSecMsGec() {
    const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    const WIN_EPOCH = 11644473600n;
    const S_TO_NS = 10000000n;
    let ticks = BigInt(Math.floor(Date.now() / 1000)) + WIN_EPOCH;
    ticks -= ticks % 300n;
    ticks *= S_TO_NS;
    const strToHash = `${ticks}${TRUSTED_CLIENT_TOKEN}`;

    const encoder = new TextEncoder();
    const data = encoder.encode(strToHash);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }

  async synthesizeEdgeDirect(text, voice = "th-TH-PremwadeeNeural") {
    const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
    const WSS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
    const secMsGec = await this._generateSecMsGec();
    const connectionId = crypto.randomUUID().replace(/-/g, "");
    const requestId = crypto.randomUUID().replace(/-/g, "");
    const timestamp = new Date().toISOString();

    const url = `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-133.0.3065.82&ConnectionId=${connectionId}`;

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      ws.binaryType = "arraybuffer";

      const audioChunks = [];
      const timeout = setTimeout(() => {
        try { ws.close(); } catch (e) {}
        reject(new Error("Edge TTS Timeout (6s)"));
      }, 6000);

      ws.addEventListener("open", () => {
        const configMessage =
          `X-Timestamp:${timestamp}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataOptions: {
                    bookmarkEnabled: false,
                    sentenceBoundaryEnabled: false,
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          });
        ws.send(configMessage);

        const cleanText = text.replace(/[<>&'"]/g, (c) => {
          switch (c) {
            case "<": return "&lt;";
            case ">": return "&gt;";
            case "&": return "&amp;";
            case "'": return "&apos;";
            case '"': return "&quot;";
          }
        });

        const ssmlMessage =
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${timestamp}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='th-TH'>` +
          `<voice name='${voice}'>` +
          `<prosody pitch='+0Hz' rate='+0%'>${cleanText}</prosody>` +
          `</voice>` +
          `</speak>`;
        ws.send(ssmlMessage);
      });

      ws.addEventListener("message", (event) => {
        if (typeof event.data === "string") {
          if (event.data.includes("Path:turn.end")) {
            clearTimeout(timeout);
            try { ws.close(); } catch (e) {}

            let totalLength = 0;
            for (const chunk of audioChunks) totalLength += chunk.length;
            const completeAudio = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
              completeAudio.set(chunk, offset);
              offset += chunk.length;
            }
            resolve(completeAudio.buffer);
          }
        } else if (event.data instanceof ArrayBuffer) {
          const view = new DataView(event.data);
          if (view.byteLength >= 2) {
            const headerLength = view.getUint16(0);
            if (view.byteLength > 2 + headerLength) {
              const audioData = new Uint8Array(event.data, 2 + headerLength);
              audioChunks.push(audioData);
            }
          }
        }
      });

      ws.addEventListener("error", (err) => {
        clearTimeout(timeout);
        reject(err || new Error("Edge TTS WebSocket error"));
      });

      ws.addEventListener("close", () => {
        clearTimeout(timeout);
        if (audioChunks.length > 0) {
          let totalLength = 0;
          for (const chunk of audioChunks) totalLength += chunk.length;
          const completeAudio = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            completeAudio.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(completeAudio.buffer);
        }
      });
    });
  }

  /**
   * Speak using Microsoft Edge TTS (Premwadee Neural)
   * Cloudflare Worker Proxy (with Google Cloud Fallback)
   */
  async speakEdge(text) {
    const systemStore = useSystemStore();
    const sanitized = this.sanitize(text);
    const safeText = sanitized.substring(0, 500);

    // ✅ Circuit Breaker: If Edge TTS recently failed consecutively, skip to Google TTS until cooldown expires
    if (Date.now() < this.edgeCooldownUntil) {
      this.speakOnline(text);
      return;
    }

    logger.tts(`Edge TTS (Premwadee): ${safeText.substring(0, 50)}...`);

    const cacheKey = `edge:${safeText}`;
    let arrayBuffer = this.getCachedAudio(cacheKey);

    if (arrayBuffer) {
      logger.tts(`Edge TTS Cache Hit (0ms): ${safeText.substring(0, 30)}`);
    } else {
      // 1. Fetch from Cloudflare Worker Proxy (snappy 3.5s timeout)
      if (systemStore.edgeTtsUrl) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const baseUrl = systemStore.edgeTtsUrl.replace(/\/+$/, "");
          const requestUrl = `${baseUrl}?text=${encodeURIComponent(safeText)}&voice=th-TH-PremwadeeNeural`;

          const response = await fetch(requestUrl, {
            method: "GET",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            arrayBuffer = await response.arrayBuffer();
          } else {
            logger.warn(`Edge TTS Worker proxy responded with status ${response.status}`);
          }
        } catch (workerErr) {
          logger.warn(`Edge TTS Worker proxy failed: ${workerErr.message}`);
        }
      }

      // 2. Try Direct WebSocket if proxy was not available
      if (!arrayBuffer) {
        try {
          arrayBuffer = await this.synthesizeEdgeDirect(safeText);
        } catch (directErr) {
          logger.warn(`Edge TTS Direct failed: ${directErr.message || directErr}`);
        }
      }

      // Save to audio cache on success
      if (arrayBuffer) {
        this.setCachedAudio(cacheKey, arrayBuffer);
      }
    }

    // 3. Fallback to Google Cloud TTS if Edge TTS was unavailable
    if (!arrayBuffer) {
      this.consecutiveEdgeFailures++;
      if (this.consecutiveEdgeFailures >= this.MAX_EDGE_CONSECUTIVE_FAILURES) {
        this.edgeCooldownUntil = Date.now() + 60000; // 60s cooldown before retrying Edge
        logger.warn(
          `Edge TTS failed ${this.consecutiveEdgeFailures} times — entering 60s cooldown, switching seamlessly to Google TTS`,
        );
      } else {
        logger.warn("Edge TTS unavailable — falling back seamlessly to Google TTS");
      }
      this.speakOnline(text);
      return;
    }

    // Ensure AudioContext is running
    const isReady = await this.ensureAudioContextReady();
    if (!isReady) {
      logger.warn("AudioContext not running after resume — falling back to Google TTS");
      this.speakOnline(text);
      return;
    }

    try {
      const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
      this.currentSource = this.audioCtx.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioCtx.destination);

      let hasEnded = false;
      const advanceQueue = () => {
        if (hasEnded) return;
        hasEnded = true;
        this.clearStuckTimer();
        if (this._currentOnComplete) {
          this._currentOnComplete();
          this._currentOnComplete = null;
        }
        this.isSpeaking = false;
        this.currentSource = null;
        this.processQueue();
      };

      this.currentSource.onended = advanceQueue;
      this.currentSource.start(0);

      // ✅ Reset Edge failure counter on success
      this.consecutiveEdgeFailures = 0;
      this.edgeCooldownUntil = 0;
      logger.success("Edge TTS (Premwadee) playback started");
      return;
    } catch (decodeErr) {
      logger.error("Edge TTS Audio decode error:", decodeErr);
      this.consecutiveEdgeFailures++;
      this.speakOnline(text);
      return;
    }
  }

  /**
   * Speak using Google Cloud TTS API with key rotation
   */
  async speakOnline(text) {
    const systemStore = useSystemStore();

    // Parse comma-separated keys
    const rawKeys = systemStore.googleApiKey;
    const keys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    // Check if any keys exist
    if (keys.length === 0) {
      logger.warn("No Google API Keys found, falling back to Native TTS");
      this.speakNative(text);
      return;
    }

    // Sanitize and limit text
    const sanitized = this.sanitize(text);
    const safeText = sanitized.substring(0, 500);

    logger.tts(
      `Google Cloud TTS: ${safeText.substring(0, 50)}... (${keys.length} keys available)`,
    );

    const voiceName = systemStore.googleVoiceName || "th-TH-Neural2-C";
    const cacheKey = `google:${voiceName}:${safeText}`;
    const cachedBuffer = this.getCachedAudio(cacheKey);

    if (cachedBuffer) {
      const isReady = await this.ensureAudioContextReady();
      if (isReady) {
        try {
          const audioBuffer = await this.audioCtx.decodeAudioData(cachedBuffer);
          this.currentSource = this.audioCtx.createBufferSource();
          this.currentSource.buffer = audioBuffer;
          this.currentSource.connect(this.audioCtx.destination);

          let hasEnded = false;
          const advanceQueue = () => {
            if (hasEnded) return;
            hasEnded = true;
            this.clearStuckTimer();
            if (this._currentOnComplete) {
              this._currentOnComplete();
              this._currentOnComplete = null;
            }
            this.isSpeaking = false;
            this.currentSource = null;
            this.processQueue();
          };

          this.currentSource.onended = advanceQueue;
          this.currentSource.start(0);

          this.consecutiveGoogleFailures = 0;
          logger.tts(`Google Cloud TTS Cache Hit (0ms): ${safeText.substring(0, 30)}`);
          return;
        } catch (cachedErr) {
          logger.warn("Cached Google TTS playback failed, fetching fresh:", cachedErr);
        }
      }
    }

    // Rotate keys sequentially, starting from the machine's assigned activeKeyIndex
    const startIndex = (systemStore.activeKeyIndex || 1) - 1;

    for (let count = 0; count < keys.length; count++) {
      const i = (startIndex + count) % keys.length;
      const currentKey = keys[i];

      try {
        logger.tts(`Trying key ${i + 1}/${keys.length}...`);

        // Snappy 3.0s timeout per key for rapid failover
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // Call Google Cloud TTS API
        const response = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${currentKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: { text: safeText },
              voice: {
                languageCode: "th-TH",
                name: voiceName,
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0,
                pitch: 0.0,
              },
            }),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Convert Base64 to ArrayBuffer for AudioContext decoding
        const binaryString = atob(data.audioContent);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        // Save raw audio buffer to LRU cache
        this.setCachedAudio(cacheKey, bytes.buffer);

        // Ensure AudioContext is running
        const isReady = await this.ensureAudioContextReady();
        if (!isReady) {
          logger.warn("AudioContext not running after resume — falling back to Native");
          this.consecutiveGoogleFailures++;
          this.speakNative(text);
          return;
        }

        try {
          const audioBuffer = await this.audioCtx.decodeAudioData(bytes.buffer);
          this.currentSource = this.audioCtx.createBufferSource();
          this.currentSource.buffer = audioBuffer;
          this.currentSource.connect(this.audioCtx.destination);

          let hasEnded = false;
          const advanceQueue = () => {
            if (hasEnded) return;
            hasEnded = true;
            this.clearStuckTimer();
            if (this._currentOnComplete) {
              this._currentOnComplete();
              this._currentOnComplete = null;
            }
            this.isSpeaking = false;
            this.currentSource = null;
            this.processQueue();
          };

          this.currentSource.onended = advanceQueue;
          this.currentSource.start(0);

          // Update active key index in store and sync if fallback key succeeded
          const systemStore2 = useSystemStore();
          if (systemStore2.activeKeyIndex !== i + 1) {
            systemStore2.activeKeyIndex = i + 1;
            systemStore2.updatePresenceTtsKey();
          }

          // Reset failure counter on success
          this.consecutiveGoogleFailures = 0;
          logger.success(`Google TTS success with key ${i + 1}`);
          return;
        } catch (decodeErr) {
          logger.error("Audio decode error:", decodeErr);
          this.speakNative(text);
          return;
        }
      } catch (error) {
        // 🚨 CASE 1: Timeout
        if (error.name === "AbortError") {
          logger.warn(`Key ${i + 1} timed out.`);
        } else {
          // 🚨 CASE 2: API Error (403 Quota / 500)
          logger.warn(`Key ${i + 1} failed: ${error.message}`);
        }

        // If this was the last key tried, fallback to Native TTS
        if (count === keys.length - 1) {
          this.consecutiveGoogleFailures++;
          logger.error(
            `All Google Keys failed (${this.consecutiveGoogleFailures}/${this.MAX_CONSECUTIVE_FAILURES} consecutive fails). Seamlessly switching to Native TTS.`,
          );
          this._checkPermanentSwitch();
          this.speakNative(text);
        }
      }
    }
  }

  /**
   * Speak using native browser TTS
   */
  speakNative(text) {
    try {
      const voice = this.getBestVoice();

      const utterance = new SpeechSynthesisUtterance(text);
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
      const cleanupAndAdvance = () => {
        if (hasEnded) return;
        hasEnded = true;
        const index = window.ttsActiveUtterances.indexOf(utterance);
        if (index > -1) {
          window.ttsActiveUtterances.splice(index, 1);
        }
        this.clearStuckTimer();
        if (this._currentOnComplete) {
          this._currentOnComplete();
          this._currentOnComplete = null;
        }
        this.isSpeaking = false;
        this.processQueue();
      };

      // Handle end
      utterance.onend = cleanupAndAdvance;

      // Handle error
      utterance.onerror = (e) => {
        if (e.error !== "interrupted") {
          logger.error("Native TTS Error:", e);
        } else {
          logger.warn("Native TTS interrupted");
        }
        cleanupAndAdvance();
      };

      // Speak
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // ✅ Catch-all: ensure queue never stalls on unexpected errors
      logger.error("Native TTS setup failed:", e);
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
   * ✅ Check if Google TTS should be permanently disabled
   */
  _checkPermanentSwitch() {
    if (
      this.consecutiveGoogleFailures >= this.MAX_CONSECUTIVE_FAILURES &&
      !this.googleDisabledPermanently
    ) {
      this.googleDisabledPermanently = true;
      logger.error(
        `Google TTS failed ${this.consecutiveGoogleFailures} times consecutively — switching to Native TTS permanently for this session.`,
      );
    }
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

    // ✅ Auto-resume AudioContext before speaking (iPad idle recovery)
    await this.ensureAudioContextReady();

    // ✅ Start stuck detection timer
    this.startStuckTimer();

    // Check system store setting
    const systemStore = useSystemStore();

    if (
      systemStore.ttsVoiceMode === "edge" &&
      !this.googleDisabledPermanently
    ) {
      this.speakEdge(text);
    } else if (
      systemStore.useOnlineTts &&
      systemStore.googleApiKey &&
      !this.googleDisabledPermanently
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
  speak(author, message) {
    let sanitized = this.sanitize(message);

    // ✅ If message had content but got sanitized to empty (e.g. emoji-only),
    // read it as "ส่งสติกเกอร์" (sent sticker) so it's not silent.
    if (!sanitized && message && message.trim().length > 0) {
      sanitized = "ส่งสติกเกอร์";
    }

    if (!sanitized) return Promise.resolve();

    // Combine author and message
    const textToSpeak = author ? `${author} ... ${sanitized}` : sanitized;

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

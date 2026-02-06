import { useSystemStore } from "../stores/system";

// ✅ Global Storage to Prevent Garbage Collection
window.ttsActiveUtterances = [];

export class TextToSpeech {
  constructor() {
    this.queue = [];
    this.isSpeaking = false;
    this.voices = [];
    this.poller = null;
    this.audioPlayer = new Audio(); // Single reusable audio player
    this.isNativeUnlocked = false; // Track Native TTS unlock status
    this.isGoogleUnlocked = false; // Track Google TTS Audio Element unlock status

    // Bind methods
    this.processQueue = this.processQueue.bind(this);
    this.loadVoices = this.loadVoices.bind(this);

    // Set up voice loading
    window.speechSynthesis.onvoiceschanged = this.loadVoices;
    this.loadVoices();

    // Aggressive poller: Check every 500ms until voices load
    this.poller = setInterval(this.loadVoices, 500);
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

    // Clear poller once voices are loaded
    if (this.poller) {
      clearInterval(this.poller);
      this.poller = null;
    }

    console.log("🔍 Loaded " + this.voices.length + " voices.");
  }

  /**
   * Unlock Native TTS by speaking a silent utterance
   * This is needed on iOS to prime the TTS engine immediately upon user interaction
   */
  unlockNative() {
    if (this.isNativeUnlocked) return;
    console.log("🔓 Unlocking Native TTS...");
    const utterance = new SpeechSynthesisUtterance("");
    utterance.volume = 0; // Silent
    utterance.onend = () => {
      this.isNativeUnlocked = true;
    };
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Unlock HTML5 Audio Element for Google TTS
   * iOS Safari requires Audio elements to be "blessed" by user interaction
   * This plays a silent WAV to unlock the audio player
   * Uses Blob URL with WAV format for maximum iOS compatibility
   */
  unlockAudioElement() {
    if (this.isGoogleUnlocked) return;

    console.log("🔓 Unlocking Google TTS Audio Element...");

    // ✅ SWITCH TO WAV: A valid 0.1s silent WAV file (Universally supported)
    // RIFF Header + FMT + DATA (PCM 8-bit, Mono, 8000Hz)
    const SILENT_WAV_B64 =
      "UklGRigAAABXQVZFZm10IBIAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==";

    try {
      // 1. Convert WAV Base64 to Blob (Correct MIME type: audio/wav)
      const blob = this.base64ToBlob(SILENT_WAV_B64, "audio/wav");
      // 2. Create Object URL
      const blobUrl = URL.createObjectURL(blob);

      // 3. Set Source & Play
      this.audioPlayer.src = blobUrl;

      this.audioPlayer
        .play()
        .then(() => {
          console.log("✅ Google TTS Audio Element Unlocked (WAV)");
          this.isGoogleUnlocked = true;

          // 4. Cleanup Memory (revoke URL after a short delay)
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        })
        .catch((e) => {
          console.warn("⚠️ Audio unlock failed (User interaction needed):", e);
          // Cleanup even on error
          URL.revokeObjectURL(blobUrl);
        });
    } catch (e) {
      console.error("❌ Audio unlock setup failed:", e);
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

    // Priority 1: Google Thai
    let voice = this.voices.find(
      (v) =>
        v.name.includes("Google") &&
        (v.name.includes("Thai") || v.name.includes("ไทย")),
    );
    if (voice) return voice;

    // Priority 2: Microsoft (Premwadee/Pattara)
    voice = this.voices.find(
      (v) => v.name.includes("Premwadee") || v.name.includes("Pattara"),
    );
    if (voice) return voice;

    // Priority 3: Apple Narisa
    voice = this.voices.find((v) => v.name.includes("Narisa"));
    if (voice) return voice;

    // Priority 4: Any Thai voice
    voice = this.voices.find((v) => v.lang.startsWith("th"));
    if (voice) return voice;

    return null;
  }

  /**
   * Sanitize text for TTS
   */
  sanitize(text) {
    if (!text) return "";

    // Remove emojis
    const emojiRegex =
      /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]/g;
    let cleanText = text.replace(emojiRegex, " ");

    // Limit length
    if (cleanText.length > 500) {
      cleanText = cleanText.substring(0, 500) + "... ตัดจบ";
    }

    return cleanText.trim();
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
    const systemStore = useSystemStore();

    // Parse comma-separated keys
    const rawKeys = systemStore.googleApiKey;
    const keys = rawKeys
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    // Check if any keys exist
    if (keys.length === 0) {
      console.warn("⚠️ No Google API Keys found, falling back to Native TTS");
      this.speakNative(text);
      return;
    }

    // Sanitize and limit text
    const sanitized = this.sanitize(text);
    const safeText = sanitized.substring(0, 200); // Limit for API

    console.log(
      `☁️ Google Cloud TTS: ${safeText.substring(0, 50)}... (${keys.length} keys available)`,
    );

    // Try each key sequentially
    for (let i = 0; i < keys.length; i++) {
      const currentKey = keys[i];

      try {
        console.log(`🔑 Trying key ${i + 1}/${keys.length}...`);

        // Create AbortController with 3-second timeout
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
              // ✅ Config for Bright & Enthusiastic Female Voice
              voice: {
                languageCode: "th-TH",
                name: "th-TH-Standard-A", // Female Voice
              },
              audioConfig: {
                audioEncoding: "MP3",
                speakingRate: 1.0, // ✅ Standard Speed (Factory Default)
                pitch: 0.0, // ✅ Natural Pitch (Factory Default)
              },
            }),
            signal: controller.signal, // Bind abort signal
          },
        );

        // Clear timeout on success
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Convert Base64 to Blob URL for memory efficiency
        const blob = this.base64ToBlob(data.audioContent);
        const blobUrl = URL.createObjectURL(blob);

        // Set up single audio player
        this.audioPlayer.src = blobUrl;

        this.audioPlayer.onended = () => {
          URL.revokeObjectURL(blobUrl); // Free memory immediately
          this.isSpeaking = false;
          this.processQueue();
        };

        this.audioPlayer.onerror = (e) => {
          console.error("❌ Audio playback error:", e);
          URL.revokeObjectURL(blobUrl); // Free memory on error
          this.isSpeaking = false;
          this.processQueue();
        };

        await this.audioPlayer.play();

        // Update active key index in store
        const systemStore = useSystemStore();
        systemStore.activeKeyIndex = i + 1;

        console.log(`✅ Success with key ${i + 1}`);
        return; // Success! Exit the function
      } catch (error) {
        // 🚨 CASE 1: Timeout (Internet Lag)
        if (error.name === "AbortError") {
          console.warn(
            `⏳ Key ${i + 1} timed out. Switching to Native for this message.`,
          );
          this.speakNative(text);
          return; // Stop the loop, play Native, but KEEP useOnlineTts = true for next time.
        }

        // 🚨 CASE 2: API Error (403 Quota / 500)
        console.warn(`⚠️ Key ${i + 1} failed: ${error.message}`);

        // If this was the last key, and all failed
        if (i === keys.length - 1) {
          console.error("❌ All Google Keys failed/exhausted.");
          this.speakNative(text);
          // Optional: If you want to disable Google permanently when keys are full:
          // useSystemStore().useOnlineTts = false;
          // (But for now, leave it true to keep trying as requested)
        }
      }
    }
  }

  /**
   * Speak using native browser TTS
   */
  speakNative(text) {
    const voice = this.getBestVoice();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.volume = 1.0;
    utterance.rate = 1.0;

    if (voice) {
      utterance.voice = voice;
    }

    console.log(
      "🎙️ Native TTS:",
      text.substring(0, 50) + (text.length > 50 ? "..." : ""),
    );

    // Push to global array to prevent garbage collection
    window.ttsActiveUtterances.push(utterance);

    // Handle end
    utterance.onend = () => {
      const index = window.ttsActiveUtterances.indexOf(utterance);
      if (index > -1) {
        window.ttsActiveUtterances.splice(index, 1);
      }
      this.isSpeaking = false;
      this.processQueue();
    };

    // Handle error
    utterance.onerror = (e) => {
      // Ignore "interrupted" error to reduce console noise during mode switching
      if (e.error === "interrupted") return;

      console.error("❌ Native TTS Error:", e);
      const index = window.ttsActiveUtterances.indexOf(utterance);
      if (index > -1) {
        window.ttsActiveUtterances.splice(index, 1);
      }
      this.isSpeaking = false;
      this.processQueue();
    };

    // Speak
    window.speechSynthesis.speak(utterance);
  }

  /**
   * Process queue based on system store setting
   */
  processQueue() {
    // Stop if queue empty or already speaking
    if (this.queue.length === 0 || this.isSpeaking) {
      return;
    }

    this.isSpeaking = true;
    const text = this.queue.shift();

    // Check system store setting
    const systemStore = useSystemStore();

    if (systemStore.useOnlineTts && systemStore.googleApiKey) {
      this.speakOnline(text);
    } else {
      this.speakNative(text);
    }
  }

  /**
   * Add message to queue
   */
  speak(author, message) {
    const sanitized = this.sanitize(message);
    if (!sanitized) return;

    // Combine author and message
    const textToSpeak = author ? `${author} ... ${sanitized}` : sanitized;

    // Add to queue
    this.queue.push(textToSpeak);

    // Process queue
    this.processQueue();
  }

  /**
   * Reset TTS
   */
  reset() {
    if (this.audioPlayer) {
      // 1. Remove listeners FIRST to prevent error logging during cleanup
      this.audioPlayer.onended = null;
      this.audioPlayer.onerror = null;

      // 2. Stop playback
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;

      // 3. Clear source safely
      this.audioPlayer.removeAttribute("src");
    }

    // Stop native speech synthesis
    window.speechSynthesis.cancel();

    // Clear queue and state
    this.queue = [];
    this.isSpeaking = false;
    window.ttsActiveUtterances = []; // Clear native utterances ref

    console.log("🔄 TTS Reset (Clean)");
  }
}

// Singleton Instance
export const ttsService = new TextToSpeech();

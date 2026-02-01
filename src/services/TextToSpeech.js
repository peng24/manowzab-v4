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
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0; // Silent
        utterance.onend = () => { this.isNativeUnlocked = true; };
        window.speechSynthesis.speak(utterance);
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
        let voice = this.voices.find(v =>
            v.name.includes('Google') && (v.name.includes('Thai') || v.name.includes('ไทย'))
        );
        if (voice) return voice;

        // Priority 2: Microsoft (Premwadee/Pattara)
        voice = this.voices.find(v =>
            v.name.includes('Premwadee') || v.name.includes('Pattara')
        );
        if (voice) return voice;

        // Priority 3: Apple Narisa
        voice = this.voices.find(v => v.name.includes('Narisa'));
        if (voice) return voice;

        // Priority 4: Any Thai voice
        voice = this.voices.find(v => v.lang.startsWith('th'));
        if (voice) return voice;

        return null;
    }

    /**
     * Sanitize text for TTS
     */
    sanitize(text) {
        if (!text) return "";

        // Remove emojis
        const emojiRegex = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]/g;
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
    base64ToBlob(base64, type = 'audio/mp3') {
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
        const keys = rawKeys.split(',').map(k => k.trim()).filter(k => k);

        // Check if any keys exist
        if (keys.length === 0) {
            console.warn("⚠️ No Google API Keys found, falling back to Native TTS");
            this.speakNative(text);
            return;
        }

        // Sanitize and limit text
        const sanitized = this.sanitize(text);
        const safeText = sanitized.substring(0, 200); // Limit for API

        console.log(`☁️ Google Cloud TTS: ${safeText.substring(0, 50)}... (${keys.length} keys available)`);

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
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            input: { text: safeText },
                            voice: {
                                languageCode: "th-TH",
                                name: "th-TH-Neural2-C" // High-quality female voice
                            },
                            audioConfig: {
                                audioEncoding: "MP3"
                            }
                        }),
                        signal: controller.signal // Bind abort signal
                    }
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
                // Check if error is timeout
                if (error.name === 'AbortError') {
                    console.warn(`⏳ Key ${i + 1} timed out (3s limit exceeded)`);
                } else {
                    console.warn(`⚠️ Key ${i + 1} failed: ${error.message}`);
                }

                // If this was the last key, we'll fall through to Native
                if (i === keys.length - 1) {
                    console.error("❌ All Google API keys failed");
                    console.warn("☁️ Falling back to Native TTS...");
                    this.speakNative(text);
                }
                // Otherwise, continue to next key
            }
        }
    }

    /**
     * Speak using native browser TTS
     */
    speakNative(text) {
        const voice = this.getBestVoice();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.volume = 1.0;
        utterance.rate = 1.0;

        if (voice) {
            utterance.voice = voice;
        }

        console.log("🎙️ Native TTS:", text.substring(0, 50) + (text.length > 50 ? '...' : ''));

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
            if (e.error === 'interrupted') return;
            
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
        const textToSpeak = author
            ? `${author} ... ${sanitized}`
            : sanitized;

        // Add to queue
        this.queue.push(textToSpeak);

        // Process queue
        this.processQueue();
    }

    /**
     * Reset TTS
     */
    reset() {
        // Pause and reset the single audio player
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
            this.audioPlayer.src = ''; // Clear source to release blob URL
        }

        // Stop native speech synthesis
        window.speechSynthesis.cancel();

        // Clear queue and state
        this.queue = [];
        this.isSpeaking = false;
        window.ttsActiveUtterances = [];

        console.log("🔄 TTS Reset");
    }
}

// Singleton Instance
export const ttsService = new TextToSpeech();

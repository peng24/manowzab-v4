// ✅ Global Storage to Prevent Garbage Collection
window.activeUtterances = [];

export class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.queue = [];
        this.isSpeaking = false;
        this.maxMessageLength = 500;
        this.voices = []; // ✅ Store loaded voices
        this.poller = null; // ✅ Polling interval reference
        this.audioPlayer = new Audio(); // ✅ For online TTS playback

        // ✅ Bind method to maintain 'this' context
        this.loadVoices = this.loadVoices.bind(this);

        // ✅ Set up event listener for async voice loading (Chrome)
        window.speechSynthesis.onvoiceschanged = this.loadVoices;

        // ✅ Attempt initial load
        this.loadVoices();

        // ✅ Aggressive poller: Check every 500ms until voices load
        this.poller = setInterval(this.loadVoices, 500);
    }

    /**
     * Load voices and display comprehensive debug info
     */
    loadVoices() {
        const vs = this.synth.getVoices();

        // Return early if no voices yet
        if (vs.length === 0) {
            return;
        }

        // ✅ Store voices
        this.voices = vs;

        // ✅ Clear poller once voices are loaded
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = null;
        }

        // ✅ Crucial Debug: Log ALL voices in table format
        console.table(this.voices.map(v => ({
            name: v.name,
            lang: v.lang,
            default: v.default
        })));
        console.log("🔍 Loaded " + this.voices.length + " voices.");
    }

    /**
     * Name-based voice matching with fallback to lang check
     * Priority: Google Thai > Premwadee/Pattara > Narisa > lang=th
     */
    getBestVoice() {
        // ✅ Try loading voices again if empty
        if (this.voices.length === 0) {
            this.loadVoices();
            return null;
        }

        // Priority 1: Name includes "Google" AND ("Thai" or "ไทย")
        let voice = this.voices.find(v =>
            v.name.includes('Google') && (v.name.includes('Thai') || v.name.includes('ไทย'))
        );
        if (voice) {
            console.log('🔊 Using voice:', voice.name, '(Google Thai)');
            return voice;
        }

        // Priority 2: Name includes "Premwadee" or "Pattara"
        voice = this.voices.find(v =>
            v.name.includes('Premwadee') || v.name.includes('Pattara')
        );
        if (voice) {
            console.log('🔊 Using voice:', voice.name, '(Microsoft)');
            return voice;
        }

        // Priority 3: Name includes "Narisa"
        voice = this.voices.find(v => v.name.includes('Narisa'));
        if (voice) {
            console.log('🔊 Using voice:', voice.name, '(Apple Narisa)');
            return voice;
        }

        // Priority 4: Lang starts with "th"
        voice = this.voices.find(v => v.lang.startsWith('th'));
        if (voice) {
            console.log('🔊 Using voice:', voice.name, '(Lang match)');
            return voice;
        }

        // Still nothing found
        return null;
    }

    /**
     * Filter and Sanitize Text
     */
    sanitize(text) {
        if (!text) return "";

        // 1. Replace Emoji with "ส่งสติกเกอร์"
        const emojiRegex = /[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDD10-\uDDFF]/g;
        let cleanText = text.replace(emojiRegex, " ส่งสติกเกอร์ ");

        // 2. Truncate long text
        if (cleanText.length > this.maxMessageLength) {
            cleanText = cleanText.substring(0, this.maxMessageLength) + "... ตัดจบ";
        }

        return cleanText.trim();
    }

    /**
     * Add message to queue
     * @param {string} authorName 
     * @param {string} message 
     */
    speak(authorName, message) {
        const cleanMessage = this.sanitize(message);
        if (!cleanMessage) return;

        // Format: "Username ... Message" (Only if name exists)
        const textToSpeak = authorName
            ? `${authorName} ... ${cleanMessage}`
            : cleanMessage;

        this.queue.push(textToSpeak);

        if (!this.isSpeaking) {
            this.processQueue();
        }
    }

    /**
     * Process queue with hybrid TTS (Native + Online Fallback)
     */
    processQueue() {
        // Stop if queue empty
        if (this.queue.length === 0) {
            this.isSpeaking = false;
            return;
        }

        this.isSpeaking = true;
        const text = this.queue.shift();

        // ✅ Step 1: Check for native Thai voice
        const voice = this.getBestVoice();

        // ✅ Step 2: Decide path
        if (voice) {
            // Native voice available
            this.speakNative(text, voice);
        } else {
            // No native voice - use online fallback
            console.warn("⚠️ No native Thai voice found. Falling back to online TTS.");
            this.speakOnline(text);
        }
    }

    /**
     * Speak using native browser TTS
     */
    speakNative(text, voice) {
        // Cancel any previous speech
        this.synth.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.volume = 1.0;
        utterance.rate = 1.0;
        utterance.voice = voice;

        console.log(`🎙️ Speaking (Native): "${text}" with ${voice.name}`);

        // Prevent GC
        window.activeUtterances.push(utterance);

        // Events
        utterance.onstart = () => {
            console.log("🔊 Started speaking (Native)");
        };

        utterance.onend = () => {
            console.log("✅ Finished (Native)");
            window.activeUtterances.shift();
            this.isSpeaking = false;
            this.processQueue();
        };

        utterance.onerror = (e) => {
            console.error("❌ Native TTS Error:", e);
            window.activeUtterances.shift();
            this.isSpeaking = false;
            this.processQueue();
        };

        // Speak
        this.synth.speak(utterance);
    }

    /**
     * Speak using Google Translate TTS API
     */
    speakOnline(text) {
        // Construct Google Translate TTS URL
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=th&client=tw-ob`;

        console.log("☁️ Playing Online TTS for:", text);

        // Configure audio player
        this.audioPlayer.src = url;
        this.audioPlayer.playbackRate = 1.0;

        // Events
        this.audioPlayer.onended = () => {
            console.log("✅ Finished (Online)");
            this.isSpeaking = false;
            this.processQueue();
        };

        this.audioPlayer.onerror = (e) => {
            console.error("❌ Online TTS Error:", e);
            this.isSpeaking = false;
            this.processQueue();
        };

        // Play
        this.audioPlayer.play().catch(e => {
            console.error("❌ Failed to play online TTS:", e);
            this.isSpeaking = false;
            this.processQueue();
        });
    }

    /**
     * Clear Queue, Stop Speech, and Reset State
     */
    reset() {
        // Stop both native and online playback
        this.synth.cancel();
        this.audioPlayer.pause();
        this.audioPlayer.currentTime = 0;

        this.queue = [];
        this.isSpeaking = false;
        window.activeUtterances = []; // ✅ Clear global array

        // Feedback
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance("รีเซ็ตเสียงแล้ว");
            utterance.lang = 'th-TH';
            utterance.volume = 1.0;
            utterance.rate = 0.95;
            utterance.pitch = 1.0;

            // Use best voice if available
            const voice = this.getBestVoice();
            if (voice) {
                utterance.voice = voice;
            }

            this.synth.resume();
            this.synth.speak(utterance);
        }, 300);
    }
}

// Singleton Instance
export const ttsService = new TextToSpeech();

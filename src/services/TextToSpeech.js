export class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.queue = [];
        this.isSpeaking = false;
        this.maxMessageLength = 500; // Limit long messages
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
     * Process the queue
     */
    processQueue() {
        // Stop if queue empty
        if (this.queue.length === 0) {
            this.isSpeaking = false;
            return;
        }

        // Double check if browser is actually speaking
        if (this.synth.speaking) {
            // If it's seemingly stuck, we might want to wait or cancel, 
            // but for now, we rely on onend event. 
            // If `isSpeaking` is false but synth.speaking is true, it might be a previous utterance.
            if (this.isSpeaking) return;
        }

        this.isSpeaking = true;
        const text = this.queue.shift();
        const utterance = new SpeechSynthesisUtterance(text);

        // Config Voice
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;

        // Try to find Thai voice
        const voices = this.synth.getVoices();
        const thVoice = voices.find(v => v.lang.includes('th'));
        if (thVoice) utterance.voice = thVoice;

        // Events
        utterance.onend = () => {
            this.isSpeaking = false;
            this.processQueue();
        };

        utterance.onerror = (e) => {
            console.error("TTS Error:", e);
            this.isSpeaking = false;
            this.processQueue();
        };

        this.synth.speak(utterance);
    }

    /**
     * Clear Queue, Stop Speech, and Reset State
     * Used for "Reset Voice" button
     */
    reset() {
        this.synth.cancel();
        this.queue = [];
        this.isSpeaking = false;

        // Feedback
        setTimeout(() => {
            const utterance = new SpeechSynthesisUtterance("รีเซ็ตเสียงแล้ว");
            utterance.lang = 'th-TH';
            this.synth.speak(utterance);
        }, 300);
    }
}

// Singleton Instance for app-wide usage
export const ttsService = new TextToSpeech();

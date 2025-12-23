import { ref, onUnmounted } from 'vue';
import { useStockStore } from '../stores/stock';
import { useAudio } from './useAudio';

export function useVoiceDetector() {
    const stockStore = useStockStore();
    const { playDing } = useAudio();

    const isListening = ref(false);
    const transcript = ref("");
    const lastAction = ref("");
    const recognition = ref(null);
    const manualStop = ref(false); // Track if user manually stopped it

    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition;
        recognition.value = new SpeechRecognition();
        recognition.value.continuous = true;
        recognition.value.interimResults = false;
        recognition.value.lang = 'th-TH';

        recognition.value.onstart = () => {
            isListening.value = true;
            manualStop.value = false;
        };

        recognition.value.onend = () => {
            isListening.value = false;
            // Auto-Restart logic (Keep-Alive)
            if (!manualStop.value) {
                console.log("🔄 Recognition ended unexpectedly (silence/error). Restarting...");
                setTimeout(() => {
                    try {
                        recognition.value.start();
                    } catch (e) {
                        console.error("Restart failed:", e);
                    }
                }, 500);
            }
        };

        recognition.value.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript.trim();
            transcript.value = text;
            processCommand(text);
        };

        recognition.value.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            isListening.value = false;
            // On error, we rely on onend to trigger restart unless it's a fatal error
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                manualStop.value = true; // Stop permanently if permission denied
            }
        };
    } else {
        lastAction.value = "⚠️ Browser does not support Web Speech API";
    }

    function toggleMic() {
        if (!recognition.value) return;

        if (isListening.value) {
            manualStop.value = true; // Set flag prevent auto-restart
            recognition.value.stop();
        } else {
            manualStop.value = false;
            try {
                recognition.value.start();
            } catch (e) {
                console.error(e);
            }
        }
    }

    function processCommand(rawText) {
        // Step 1: Noise Removal - Remove measurement keywords to prevent false positives
        // Remove patterns like "อก 54", "ยาว 30", "ไซส์ 40"
        let cleanText = rawText.replace(/(?:อก|เอว|ยาว|ไซส์|size)\s*\d+/gi, '').trim();

        // Step 2: Digit Merging (The "Connect Mind" Logic)
        // Detect single digits separated by spaces (e.g., "6 5") and merge them.
        // Loop until no more merges can be made.
        let mergedText = cleanText;
        let prevText = "";
        while (prevText !== mergedText) {
            prevText = mergedText;
            mergedText = mergedText.replace(/\b(\d)\s+(\d)\b/g, '$1$2');
        }

        console.log(`🗣️ Processed: "${rawText}" -> "${cleanText}" -> "${mergedText}"`);
        transcript.value = mergedText; // Update UI with processed text

        // Step 3: Pattern Matching

        // 3.1 Set Price: "รหัส 1 ราคา 100", "50 100", "53 80" (Implicit Price)
        // Regex logic:
        // - Optional prefix (rหัส/no/etc)
        // - Group 1: ID (\d+)
        // - Optional separator (price/baht) OR just whitespace
        // - Group 2: Price (\d+)
        const priceRegex = /(?:รหัส|เบอร์|ตัวที่|ที่|^)\s*(\d+)\s*(?:ราคา|ละ)?\s*(\d+)/;
        const priceMatch = mergedText.match(priceRegex);

        if (priceMatch) {
            const stockId = parseInt(priceMatch[1]);
            const price = parseInt(priceMatch[2]);

            // Allow if valid ID (between 1 and stockSize)
            if (stockId > 0 && stockId <= stockStore.stockSize) {
                stockStore.updateStockPrice(stockId, price);
                lastAction.value = `✅ ตั้งราคา #${stockId} = ${price} บาท`;
                playDing();
                return;
            }
        }

        // 3.2 Cancel/Clear: "ยกเลิก 1", "ลบ 5"
        const cancelRegex = /(?:ยกเลิก|ลบ|เคลียร์|ล้าง|ไม่เอา)\s*(\d+)/;
        const cancelMatch = mergedText.match(cancelRegex);

        if (cancelMatch) {
            const stockId = parseInt(cancelMatch[1]);
            // Only cancel if data exists
            if (stockStore.stockData[stockId]) {
                stockStore.processCancel(stockId);
                lastAction.value = `🗑️ ยกเลิก #${stockId}`;
                playDing();
                return;
            }
        }

        // 3.3 Manual Book: "จอง 1", "เอา 5", "เอฟ 10"
        const bookRegex = /(?:จอง|เอฟ|เอา|รับ)\s*(\d+)/;
        const bookMatch = mergedText.match(bookRegex);

        if (bookMatch) {
            const stockId = parseInt(bookMatch[1]);

            if (stockId > 0 && stockId <= stockStore.stockSize) {
                const item = stockStore.stockData[stockId];

                // Force book for 'Admin Voice' using processOrder
                if (!item || !item.owner) {
                    stockStore.processOrder(stockId, "Admin Voice", "manual-voice", "manual-voice", null, "manual-voice");
                    lastAction.value = `✅ จอง #${stockId} ให้ Admin`;
                    playDing();
                } else {
                    lastAction.value = `⚠️ #${stockId} ไม่ว่าง`;
                }
                return;
            }
        }
    }

    onUnmounted(() => {
        if (recognition.value && isListening.value) {
            recognition.value.stop();
        }
    });

    return {
        isListening,
        transcript,
        lastAction,
        toggleMic
    };
}

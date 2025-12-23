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
        // Step 1: Digit Merging (Fix Split Digits)
        // Input: "6 5 100" -> Output: "65 100"
        let mergedText = rawText;
        let prevText = "";
        while (prevText !== mergedText) {
            prevText = mergedText;
            mergedText = mergedText.replace(/\b(\d)\s+(\d)\b/u, '$1$2');
        }

        // Step 2: Size Extraction
        // Extract patterns starting with: อก, เอว, ยาว, สะโพก, ไซส์, Size
        const sizeKeywords = ["อก", "เอว", "ยาว", "สะโพก", "ไซส์", "Size"];
        const sizeRegex = new RegExp(`(?:${sizeKeywords.join("|")})\\s*\\S+`, "gi");

        let sizeString = "";
        const sizeMatches = mergedText.match(sizeRegex);
        if (sizeMatches) {
            sizeString = sizeMatches.join(" ");
            // Remove from mergedText
            mergedText = mergedText.replace(sizeRegex, "").trim();
            // Clean up extra spaces left behind
            mergedText = mergedText.replace(/\s+/g, " ").trim();
        }

        console.log(`🗣️ Cleaned: "${mergedText}" | Size: "${sizeString}"`);
        transcript.value = `${mergedText} ${sizeString ? `[${sizeString}]` : ""}`;

        // Step 3: Item & Price Extraction
        // Regex: /(?:รายการที่|รหัส|เบอร์|ตัวที่|ที่|^)\s*(\d+)\s*(?:ราคา|ละ)?\s*(\d+)/
        const priceRegex = /(?:รายการที่|รหัส|เบอร์|ตัวที่|ที่|^)\s*(\d+)\s*(?:ราคา|ละ)?\s*(\d+)/;
        const priceMatch = mergedText.match(priceRegex);

        if (priceMatch) {
            const stockId = parseInt(priceMatch[1]);
            const price = parseInt(priceMatch[2]);

            if (stockId > 0 && stockId <= stockStore.stockSize) {
                const updateData = { price: price };
                if (sizeString) updateData.size = sizeString;

                stockStore.updateItemData(stockId, updateData);

                // Use 'รายการที่' in output to align with user preference
                lastAction.value = `✅ รายการที่ ${stockId} | ${price}.- ${sizeString ? `| ${sizeString}` : ""}`;
                playDing();
                return;
            }
        }

        // Keep existing logic for Cancel/Booking as fallback or parallel?
        // User request says "Modify processVoiceCommand to ... strict logic".
        // It doesn't explicitly say "Remove other commands" but usually strictly following the pipeline implies this is the main flow.
        // However, standard admin commands like "cancel" or "book" might still be needed. 
        // The prompt says "Step 1... Step 2... Step 3... Action...".
        // It focuses on the Price Detector feature. 
        // I should probably preserve the other commands (Cancel/Book) as they are useful admin helpers, 
        // OR if the prompt implies this is purely for the "Price Detector" mode.
        // Given the prompt "Logic Upgrade... to support Product Size Detection", I should likely preserve the other admin capabilities (Cancel, Manual Book) if they don't conflict.
        // I will append the Cancel/Book checks AFTER the Price check failure, or verify if I should include them.
        // The original code had Price Check -> Cancel -> Manual Book.
        // I will retain Cancel and Manual Book logic for completeness as "Admin" tools, applied on 'mergedText'.

        // 3.2 Cancel/Clear
        const cancelRegex = /(?:ยกเลิก|ลบ|เคลียร์|ล้าง|ไม่เอา)\s*(\d+)/;
        const cancelMatch = mergedText.match(cancelRegex);
        if (cancelMatch) {
            const stockId = parseInt(cancelMatch[1]);
            if (stockStore.stockData[stockId]) {
                stockStore.processCancel(stockId);
                lastAction.value = `🗑️ ยกเลิก #${stockId}`;
                playDing();
                return;
            }
        }

        // 3.3 Manual Book
        const bookRegex = /(?:จอง|เอฟ|เอา|รับ)\s*(\d+)/;
        const bookMatch = mergedText.match(bookRegex);
        if (bookMatch) {
            const stockId = parseInt(bookMatch[1]);
            if (stockId > 0 && stockId <= stockStore.stockSize) {
                const item = stockStore.stockData[stockId];
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

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
            // Show raw first
            transcript.value = `Raw: ${text}`;
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
        let cleanText = rawText;

        // --- Step 1: Pre-processing (Text Cleaning) ---

        // 1.1 Fix "Chest" (อก) Mishears
        // Replace "6", "โอ", "โอก", "อ" followed by 2 digits with " อก"
        cleanText = cleanText.replace(/(?:^|\s)(?:6|โอ|โอก|อ)(?=\s+\d{2})/g, " อก");

        // 1.2 Fix "Item" (รายการที่)
        // Normalize synonyms to "รายการที่"
        cleanText = cleanText.replace(/(?:ตัวที่|เบอร์|รหัส|ที่)/g, " รายการที่ ");

        // 1.3 Merge Digits (Combine split digits like "5 0" -> "50")
        let prevText = "";
        while (prevText !== cleanText) {
            prevText = cleanText;
            cleanText = cleanText.replace(/\b(\d)\s+(\d)\b/g, '$1$2');
        }

        // Cleanup spaces
        cleanText = cleanText.replace(/\s+/g, " ").trim();
        console.log(`🗣️ Raw: "${rawText}" -> Clean: "${cleanText}"`);

        // Prepare context
        let workingText = cleanText;
        let targetId = null;
        let targetPrice = null;
        let targetSize = "";

        // --- Step 2: Extract & Remove "SIZE" (Priority 1) ---
        // Pattern: Look for (อก|รอ บอก|ตึงหน้าผ้า) + Number + (Optional: ยาว + Number)
        // Note: Using capture groups: 1=Keyword, 2=ChestSize, 3=LengthSize
        const sizeRegex = /(?:อก|รอ บอก|ตึงหน้าผ้า)\s*(\d+)(?:.*ยาว\s*(\d+))?/;
        const sizeMatch = workingText.match(sizeRegex);

        if (sizeMatch) {
            // sizeMatch[1] is chest size
            let constructedSize = `อก ${sizeMatch[1]}`;
            if (sizeMatch[2]) {
                constructedSize += ` ยาว ${sizeMatch[2]}`;
            }
            targetSize = constructedSize;

            // CRITICAL: Remove the *entire* matched substring from workingText
            // match[0] contains the full matched string.
            workingText = workingText.replace(sizeMatch[0], "").trim();
            // Clean up double spaces created by removal
            workingText = workingText.replace(/\s+/g, " ").trim();
        }

        // --- Step 3: Extract "ID" and "PRICE" (Priority 2) ---

        // Strategy A: Explicit Keywords
        const idRegex = /รายการที่\s*(\d+)/;
        const idMatch = workingText.match(idRegex);
        if (idMatch) {
            targetId = parseInt(idMatch[1]);
            // Remove from text to help finding price
            workingText = workingText.replace(idRegex, "").trim();
        }

        const priceRegex = /(?:ราคา|บาท|เอาไป)\s*(\d+)|(\d+)\s*บาท/;
        const priceMatch = workingText.match(priceRegex);
        if (priceMatch) {
            // priceMatch[1] or priceMatch[2] could be the number depending on order
            targetPrice = parseInt(priceMatch[1] || priceMatch[2]);
            // Remove
            workingText = workingText.replace(priceRegex, "").trim();
        }

        // Strategy B: Implicit Shortcode (Fallback if ID or Price missing)
        // If we found NO ID and NO Price, check for "Number1 Number2" pattern remaining
        // Condition: Text is just digits/spaces.
        // Or if we found one but not the other, try to guess the remaining number.
        
        // Let's implement the specific "25 80" -> ID 25, Price 80 logic if Strategy A failed partially or completely.
        
        // Find all remaining distinct numbers
        // We use \b\d+\b to catch standalone numbers
        const remainingNumbers = [...workingText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));
        
        if (targetId === null && remainingNumbers.length >= 1) {
            // First remaining number is ID
            targetId = remainingNumbers[0];
            // Remove it from the "remaining" pool logically for Price
            remainingNumbers.shift(); 
        }
        
        if (targetPrice === null && remainingNumbers.length >= 1) {
            // Next remaining number is Price
            targetPrice = remainingNumbers[0];
        }

        // --- Step 4: Validation & Save ---
        console.log(`🔍 NLP Result -> ID: ${targetId}, Price: ${targetPrice}, Size: "${targetSize}"`);

        // Check Admin Commands (Cancel/Book) - Fallback Priority checking
        // Check "Cancel" on *cleanText* to capture full intent
        const cancelMatch = cleanText.match(/(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*รายการที่?\s*(\d+)/) || cleanText.match(/(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*(\d+)/);
        if (cancelMatch) {
             const cancelId = parseInt(cancelMatch[1]);
             if (stockStore.stockData[cancelId]) {
                 stockStore.processCancel(cancelId);
                 lastAction.value = `🗑️ ยกเลิก #${cancelId}`;
                 playDing();
                 return;
             }
        }
        // Check "Manual Book"
        const bookMatch = cleanText.match(/(?:จอง|เอฟ|เอา|รับ)\s*รายการที่?\s*(\d+)/) || cleanText.match(/(?:จอง|เอฟ|เอา|รับ)\s*(\d+)/);
        if (bookMatch) {
             const bookId = parseInt(bookMatch[1]);
             if (bookId > 0 && bookId <= stockStore.stockSize) {
                 stockStore.processOrder(bookId, "Admin Voice", "manual-voice", "manual-voice", null, "manual-voice");
                 lastAction.value = `✅ จอง #${bookId} ให้ Admin`;
                 playDing();
                 return;
             }
        }

        // Final Update Action
        if (targetId && (targetPrice !== null || targetSize)) {
             if (targetId > 0 && targetId <= stockStore.stockSize) {
                 const updateData = {};
                 if (targetPrice !== null) updateData.price = targetPrice;
                 if (targetSize) updateData.size = targetSize;
                 
                 // Perform Update
                 stockStore.updateItemData(targetId, updateData);
                 
                 // Feedback
                 let msg = `✅ #${targetId}`;
                 if (targetSize) msg += ` | ${targetSize}`;
                 if (targetPrice) msg += ` | ${targetPrice}.-`;
                 
                 lastAction.value = msg;
                 transcript.value = cleanText;
                 playDing(); 
             } else {
                 // Feedback for ID not found
                 lastAction.value = `⚠️ ไม่พบรายการ #${targetId}`;
                 playDing(); // Optional: Maybe a different sound? But simple is fine.
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

import { ref, onUnmounted } from 'vue';
import { useStockStore } from '../stores/stock';
import { useAudio } from './useAudio';

// ============================================
// PATTERN CONFIGURATION
// ============================================
const PATTERNS = {
    // Corrections
    corrections: {
        chestFix: /(?:^|\s)(?:6|หก|โอ|อ)(?=\s*(?:3[0-9]|4[0-9]|5[0-9]|60)(?:\s|$))/g,
        anchorStandardize: /(?:เบอร์|รหัส|ตัวที่|No\.)/gi,
        priceStandardize: /(?:เอาไป|ขาย|เหลือ)/gi,
        digitMerge: /\b(\d)\s+(\d)\b/g
    },
    
    // Noise Removal
    noise: [
        /(?:ค่าส่ง|โอนเงิน|ปลายทาง|เริ่มต้น|ทั้งหมด|ซักรีด)\s*\d+(?:[-ถึง]*\d+)?\s*(?:บาท|ตัว|ครั้ง)?/gi,
        /(?:กระดุม|สำรอง|ตำหนิ|รู)\s*\d+\s*(?:เม็ด|จุด|รู)?/gi
    ],
    
    // Attributes
    attributes: {
        fabric: /\b(ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด)\b/i,
        bust: /(?:อก|รอบอก|ตึงหน้าผ้า)\s*(\d+)/i,
        length: /(?:ยาว|ความยาว)\s*(\d+)/i,
        sizeLetter: /\b(XXL|XL|L|M|S|XS)\b/i
    },
    
    // Core Data
    core: {
        id: /รายการที่\s*(\d+)/i,
        priceExplicit: /(?:ราคา)\s*(\d+)|(\d+)\s*(?:บาท|.-)/i,
        freebie: /(?:ฟรี|แถม)/i
    }
};

// ============================================
// VALIDATORS
// ============================================
const VALIDATORS = {
    bust: (num) => num >= 30 && num <= 70,
    length: (num) => num >= 15 && num <= 60,
    id: (num) => num >= 1 && num <= 1000,
    price: (num) => {
        const allowedPrices = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        return allowedPrices.includes(num);
    }
};

export function useVoiceDetector() {
    const stockStore = useStockStore();
    const { playDing } = useAudio();

    const isListening = ref(false);
    const transcript = ref("");
    const lastAction = ref("");
    const recognition = ref(null);
    const manualStop = ref(false);

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
            if (!manualStop.value) {
                console.log("🔄 Recognition ended unexpectedly. Restarting...");
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
            transcript.value = `Raw: ${text}`;
            processVoiceCommand(text);
        };

        recognition.value.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            isListening.value = false;
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                manualStop.value = true;
            }
        };
    } else {
        lastAction.value = "⚠️ Browser does not support Web Speech API";
    }

    function toggleMic() {
        if (!recognition.value) return;

        if (isListening.value) {
            manualStop.value = true;
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

    // ============================================
    // PROCESS VOICE COMMAND
    // ============================================
    function processVoiceCommand(rawText) {
        // STEP 1: CLEAN & NORMALIZE
        let cleanText = rawText;

        // Apply corrections
        cleanText = cleanText.replace(PATTERNS.corrections.chestFix, " อก ");
        cleanText = cleanText.replace(PATTERNS.corrections.anchorStandardize, " รายการที่ ");
        cleanText = cleanText.replace(PATTERNS.corrections.priceStandardize, " ราคา ");

        // Merge split digits
        let prevText = "";
        while (prevText !== cleanText) {
            prevText = cleanText;
            cleanText = cleanText.replace(PATTERNS.corrections.digitMerge, '$1$2');
        }

        // STEP 2: FILTER NOISE
        PATTERNS.noise.forEach(noisePattern => {
            cleanText = cleanText.replace(noisePattern, "");
        });

        cleanText = cleanText.replace(/\s+/g, " ").trim();
        console.log(`🗣️ Raw: "${rawText}" -> Clean: "${cleanText}"`);

        // STEP 3: EXTRACT ATTRIBUTES (Hunter Mode)
        let workingText = cleanText;
        let fabric = null;
        let bust = null;
        let length = null;
        let sizeLetter = null;

        // Extract Fabric
        const fabricMatch = workingText.match(PATTERNS.attributes.fabric);
        if (fabricMatch) {
            fabric = fabricMatch[1];
            workingText = workingText.replace(fabricMatch[0], "").trim();
        }

        // Extract Bust
        const bustMatch = workingText.match(PATTERNS.attributes.bust);
        if (bustMatch) {
            const bustValue = parseInt(bustMatch[1]);
            if (VALIDATORS.bust(bustValue)) {
                bust = bustValue;
                workingText = workingText.replace(bustMatch[0], "").trim();
            }
        }

        // Extract Length
        const lengthMatch = workingText.match(PATTERNS.attributes.length);
        if (lengthMatch) {
            const lengthValue = parseInt(lengthMatch[1]);
            if (VALIDATORS.length(lengthValue)) {
                length = lengthValue;
                workingText = workingText.replace(lengthMatch[0], "").trim();
            }
        }

        // Extract Size Letter
        const sizeMatch = workingText.match(PATTERNS.attributes.sizeLetter);
        if (sizeMatch) {
            sizeLetter = sizeMatch[1].toUpperCase();
            workingText = workingText.replace(sizeMatch[0], "").trim();
        }

        // STEP 4: EXTRACT ID & PRICE (Plan A - Anchor)
        let targetId = null;
        let targetPrice = null;

        // Extract ID
        const idMatch = workingText.match(PATTERNS.core.id);
        if (idMatch) {
            const idValue = parseInt(idMatch[1]);
            if (VALIDATORS.id(idValue)) {
                targetId = idValue;
                workingText = workingText.replace(idMatch[0], "").trim();
            }
        }

        // Extract Price
        // Check freebie first
        if (PATTERNS.core.freebie.test(workingText)) {
            targetPrice = 0;
            workingText = workingText.replace(PATTERNS.core.freebie, "").trim();
        } else {
            const priceMatch = workingText.match(PATTERNS.core.priceExplicit);
            if (priceMatch) {
                const priceValue = parseInt(priceMatch[1] || priceMatch[2]);
                if (VALIDATORS.price(priceValue)) {
                    targetPrice = priceValue;
                    workingText = workingText.replace(priceMatch[0], "").trim();
                }
            }
        }

        workingText = workingText.replace(/\s+/g, " ").trim();

        // STEP 5: EXTRACT ID & PRICE (Plan B - Implicit Fallback)
        if (targetId === null || targetPrice === null) {
            const remainingNumbers = [...workingText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));

            if (remainingNumbers.length > 0) {
                // Case 1: Pair (e.g., "53 80")
                if (remainingNumbers.length >= 2 && targetId === null && targetPrice === null) {
                    const [num1, num2] = remainingNumbers;
                    if (VALIDATORS.id(num1) && VALIDATORS.price(num2)) {
                        targetId = num1;
                        targetPrice = num2;
                    }
                }
                // Case 2: Merged (e.g., "4350" -> 43, 50)
                else if (remainingNumbers.length === 1 && targetId === null && targetPrice === null) {
                    const num = remainingNumbers[0];
                    if (num >= 1000 && num <= 9999) {
                        const idPart = Math.floor(num / 100);
                        const pricePart = num % 100;
                        if (VALIDATORS.id(idPart) && VALIDATORS.price(pricePart)) {
                            targetId = idPart;
                            targetPrice = pricePart;
                        }
                    } else if (VALIDATORS.id(num)) {
                        // Case 3: Single ID
                        targetId = num;
                    }
                }
                // Fill missing ID or Price
                else if (targetId === null && remainingNumbers.length > 0) {
                    const num = remainingNumbers[0];
                    if (VALIDATORS.id(num)) {
                        targetId = num;
                    }
                } else if (targetPrice === null && remainingNumbers.length > 0) {
                    const num = remainingNumbers[0];
                    if (VALIDATORS.price(num)) {
                        targetPrice = num;
                    }
                }
            }
        }

        console.log(`🔍 Extracted -> ID: ${targetId}, Price: ${targetPrice}, Bust: ${bust}, Length: ${length}, Fabric: ${fabric}, Size: ${sizeLetter}`);

        // ADMIN COMMANDS (Fallback)
        const cancelMatch = cleanText.match(/(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*(?:รายการที่)?\s*(\d+)/i);
        if (cancelMatch) {
            const cancelId = parseInt(cancelMatch[1]);
            if (stockStore.stockData[cancelId]) {
                stockStore.processCancel(cancelId);
                lastAction.value = `🗑️ ยกเลิก #${cancelId}`;
                transcript.value = cleanText;
                playDing();
                return;
            }
        }

        const bookMatch = cleanText.match(/(?:จอง|เอฟ|เอา|รับ)\s*(?:รายการที่)?\s*(\d+)/i);
        if (bookMatch) {
            const bookId = parseInt(bookMatch[1]);
            if (bookId > 0 && bookId <= stockStore.stockSize) {
                const item = stockStore.stockData[bookId];
                if (!item || !item.owner) {
                    stockStore.processOrder(bookId, "Admin Voice", "manual-voice", "manual-voice", null, "manual-voice");
                    lastAction.value = `✅ จอง #${bookId} ให้ Admin`;
                    transcript.value = cleanText;
                    playDing();
                } else {
                    lastAction.value = `⚠️ #${bookId} ไม่ว่าง`;
                    transcript.value = cleanText;
                }
                return;
            }
        }

        // FINAL ACTION
        if (targetId && (targetPrice !== null || bust || length || fabric || sizeLetter)) {
            if (targetId > 0 && targetId <= stockStore.stockSize) {
                const updateData = {};

                if (targetPrice !== null) {
                    updateData.price = targetPrice;
                }

                // Combine size components
                let sizeString = "";
                if (bust) sizeString += `อก ${bust}`;
                if (length) sizeString += (sizeString ? " " : "") + `ยาว ${length}`;
                if (sizeLetter) sizeString += (sizeString ? " " : "") + sizeLetter;
                if (fabric) sizeString += (sizeString ? " " : "") + fabric;

                if (sizeString) {
                    updateData.size = sizeString;
                }

                stockStore.updateItemData(targetId, updateData);

                // Feedback
                let msg = `✅ #${targetId}`;
                if (sizeString) msg += ` | ${sizeString}`;
                if (targetPrice !== null) msg += ` | ${targetPrice}.-`;

                lastAction.value = msg;
                transcript.value = cleanText;
                playDing();
            } else {
                lastAction.value = `⚠️ ไม่พบรายการ #${targetId}`;
                transcript.value = cleanText;
                playDing();
            }
        } else {
            lastAction.value = `⚠️ ไม่เข้าใจคำสั่ง`;
            transcript.value = cleanText;
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

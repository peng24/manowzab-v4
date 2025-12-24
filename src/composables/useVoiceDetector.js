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
            processCommand(text);
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

    function processCommand(rawText) {
        // --- STEP 1: PRE-PROCESSING ---
        let cleanText = rawText;

        // 1.1 Fix "Chest" Mishears (6, หก, โอ, อ followed by 30-60 range)
        cleanText = cleanText.replace(/(?:^|\s)(?:6|หก|โอ|อ)(?=\s*(?:3[0-9]|4[0-9]|5[0-9]|60)(?:\s|$))/g, " อก ");

        // 1.2 Standardize Keywords
        cleanText = cleanText.replace(/(?:เบอร์|รหัส|ตัวที่)/g, " รายการที่ ");
        cleanText = cleanText.replace(/(?:เอาไป|ขาย|เหลือ)/g, " ราคา ");

        // 1.3 Merge Split Digits
        let prevText = "";
        while (prevText !== cleanText) {
            prevText = cleanText;
            cleanText = cleanText.replace(/\b(\d)\s+(\d)\b/g, '$1$2');
        }

        // 1.4 Remove Noise
        // Shipping/Rules
        cleanText = cleanText.replace(/(?:ค่าส่ง|โอนเงิน|ปลายทาง|เริ่มต้น|ทั้งหมด|ซักรีด)\s*\d+(?:[-ถึง]*\d+)?\s*(?:บาท|ตัว|ครั้ง)?/g, "");
        // Defects
        cleanText = cleanText.replace(/(?:กระดุม|สำรอง|ตำหนิ|รู)\s*\d+\s*(?:เม็ด|จุด|รู)?/g, "");

        // Cleanup spaces
        cleanText = cleanText.replace(/\s+/g, " ").trim();
        console.log(`🗣️ Raw: "${rawText}" -> Clean: "${cleanText}"`);

        // --- STEP 2: EXTRACTION PIPELINE ---
        let workingText = cleanText;
        let fabric = null;
        let bust = null;
        let length = null;
        let sizeLetter = null;
        let targetId = null;
        let targetPrice = null;

        // 2.1 Extract Fabric
        const fabricKeywords = ["ผ้าเด้ง", "ชีฟอง", "โพลิเอสเตอร์", "ลินิน", "ซาติน", "ผ้าฝ้าย", "ยืด"];
        const fabricRegex = new RegExp(`(${fabricKeywords.join("|")})`, "i");
        const fabricMatch = workingText.match(fabricRegex);
        if (fabricMatch) {
            fabric = fabricMatch[1];
            workingText = workingText.replace(fabricMatch[0], "").trim();
        }

        // 2.2 Extract Bust (อก)
        const bustRegex = /(?:อก|ตึงหน้าผ้า)\s*(\d+)/i;
        const bustMatch = workingText.match(bustRegex);
        if (bustMatch) {
            const bustValue = parseInt(bustMatch[1]);
            if (bustValue >= 30 && bustValue <= 70) {
                bust = bustValue;
                workingText = workingText.replace(bustMatch[0], "").trim();
            }
        }

        // 2.3 Extract Length (ยาว)
        const lengthRegex = /ยาว\s*(\d+)/i;
        const lengthMatch = workingText.match(lengthRegex);
        if (lengthMatch) {
            const lengthValue = parseInt(lengthMatch[1]);
            if (lengthValue >= 15 && lengthValue <= 60) {
                length = lengthValue;
                workingText = workingText.replace(lengthMatch[0], "").trim();
            }
        }

        // 2.4 Extract Size Letter
        const sizeRegex = /\b(XXL|XL|L|M|S)\b/i;
        const sizeMatch = workingText.match(sizeRegex);
        if (sizeMatch) {
            sizeLetter = sizeMatch[1].toUpperCase();
            workingText = workingText.replace(sizeMatch[0], "").trim();
        }

        // 2.5 Extract Item ID
        const idRegex = /รายการที่\s*(\d+)/i;
        const idMatch = workingText.match(idRegex);
        if (idMatch) {
            const idValue = parseInt(idMatch[1]);
            if (idValue >= 1 && idValue <= 1000) {
                targetId = idValue;
                workingText = workingText.replace(idMatch[0], "").trim();
            }
        }

        // 2.6 Extract Price
        const allowedPrices = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        
        // Check for freebie keywords first
        if (/(?:ฟรี|แถม)/i.test(workingText)) {
            targetPrice = 0;
            workingText = workingText.replace(/(?:ฟรี|แถม)/gi, "").trim();
        } else {
            // Try explicit price patterns
            const priceRegex = /(?:ราคา|บาท)\s*(\d+)|(\d+)\s*(?:บาท|.-)/i;
            const priceMatch = workingText.match(priceRegex);
            if (priceMatch) {
                const priceValue = parseInt(priceMatch[1] || priceMatch[2]);
                if (allowedPrices.includes(priceValue)) {
                    targetPrice = priceValue;
                    workingText = workingText.replace(priceMatch[0], "").trim();
                }
            }
        }

        // Cleanup working text
        workingText = workingText.replace(/\s+/g, " ").trim();

        // --- STEP 3: IMPLICIT FALLBACK LOGIC ---
        const remainingNumbers = [...workingText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));

        if (targetId === null && targetPrice === null && remainingNumbers.length > 0) {
            if (remainingNumbers.length === 2) {
                // Try as ID + Price
                const [num1, num2] = remainingNumbers;
                if (num1 >= 1 && num1 <= 1000 && allowedPrices.includes(num2)) {
                    targetId = num1;
                    targetPrice = num2;
                }
            } else if (remainingNumbers.length === 1) {
                const num = remainingNumbers[0];
                // Try splitting if 4 digits (e.g., 4350 -> 43, 50)
                if (num >= 1000 && num <= 9999) {
                    const idPart = Math.floor(num / 100);
                    const pricePart = num % 100;
                    if (idPart >= 1 && idPart <= 1000 && allowedPrices.includes(pricePart)) {
                        targetId = idPart;
                        targetPrice = pricePart;
                    }
                } else if (num >= 1 && num <= 1000) {
                    // Assume it's an ID
                    targetId = num;
                }
            }
        } else if (targetId === null && remainingNumbers.length > 0) {
            // We have price but no ID, try first remaining number as ID
            const num = remainingNumbers[0];
            if (num >= 1 && num <= 1000) {
                targetId = num;
            }
        } else if (targetPrice === null && remainingNumbers.length > 0) {
            // We have ID but no price, try first remaining number as price
            const num = remainingNumbers[0];
            if (allowedPrices.includes(num)) {
                targetPrice = num;
            }
        }

        console.log(`🔍 Extracted -> ID: ${targetId}, Price: ${targetPrice}, Bust: ${bust}, Length: ${length}, Fabric: ${fabric}, Size: ${sizeLetter}`);

        // --- STEP 4: ADMIN COMMANDS (Fallback) ---
        // Check Cancel
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

        // Check Manual Book
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

        // --- STEP 5: STORE UPDATE ---
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
            // No valid data extracted
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

import { ref, onUnmounted } from 'vue';
import { useStockStore } from '../stores/stock';
import { useAudio } from './useAudio';
import { useVoiceLogger } from './useVoiceLogger';

// ============================================
// CONFIG: SMART HUNTER
// ============================================
const CONFIG = {
    // Standard Validations
    ranges: {
        bust: { min: 30, max: 70 },
        length: { min: 15, max: 60 },
        id: { min: 1, max: 1000 },
        price: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100] // Strict steps + free
    },
    // Regex Patterns
    patterns: {
        corrections: [
            { from: /(?:^|\s)(?:6|หก|โอ|อ)(?=\s*(?:3[0-9]|4[0-9]|5[0-9]|60)(?:\s|$))/g, to: " อก " }, // "6 40" -> "อก 40"
            { from: /(?:เบอร์|รหัส|ตัวที่|No\.)/gi, to: " รายการที่ " },
            { from: /(?:เอาไป|ขาย|เหลือ|ราคา)/gi, to: " ราคา " },
            { from: /\b(\d)\s+(\d)\b/g, to: "$1$2" } // Merge separate digits "5 0" -> "50"
        ],
        noise: [
            /(?:ค่าส่ง|โอนเงิน|ปลายทาง|เริ่มต้น|ทั้งหมด|ซักรีด|รับได้|สนใจ)\s*\d+(?:[-ถึง]*\d+)?\s*(?:บาท|ตัว|ครั้ง)?/gi,
            /(?:กระดุม|สำรอง|ตำหนิ|รู)\s*\d+\s*(?:เม็ด|จุด|รู)?/gi,
            /(?:ลูกค้า|พี่|น้อง|แม่ค้า)/gi
        ],
        attributes: {
            fabric: /\b(ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด|ไหมพรม|ซาติน|กำมะหยี่)\b/i,
            bust: /(?:อก|รอบอก|ตึงหน้าผ้า)\s*(\d+)/i,
            length: /(?:ยาว|ความยาว)\s*(\d+)/i,
            sizeLetter: /\b(XXL|XL|L|M|S|XS)\b/i
        },
        anchors: {
            id: /รายการที่\s*(\d+)/i,
            price: /ราคา\s*(\d+)/i,
            freebie: /(?:ฟรี|แถม)/i
        }
    }
};

export function useVoiceDetector() {
    // Dependencies
    const stockStore = useStockStore();
    const { playDing } = useAudio();
    const { logEvent } = useVoiceLogger();

    // State
    const isListening = ref(false);
    const transcript = ref("");
    const lastAction = ref("");
    const recognition = ref(null);
    const manualStop = ref(false);

    // ============================================
    // INITIALIZATION
    // ============================================
    if ('webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.webkitSpeechRecognition;
        recognition.value = new SpeechRecognition();
        recognition.value.continuous = true;
        recognition.value.interimResults = false;
        recognition.value.lang = 'th-TH';

        recognition.value.onstart = () => { isListening.value = true; manualStop.value = false; };
        recognition.value.onend = () => {
            isListening.value = false;
            if (!manualStop.value) {
                // Auto-restart for continuous listening
                setTimeout(() => {
                    try { recognition.value.start(); } catch (e) { /* ignore */ }
                }, 500);
            }
        };

        recognition.value.onresult = (event) => {
            const text = event.results[event.results.length - 1][0].transcript.trim();
            // transcript.value will be updated in processVoiceCommand with the cleaned version
            processVoiceCommand(text);
        };

        recognition.value.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isListening.value = false;
                manualStop.value = true;
            }
        };
    } else {
        lastAction.value = "⚠️ Browser not supported";
    }

    // ============================================
    // CORE LOGIC: SMART HUNTER
    // ============================================
    function processVoiceCommand(rawText) {
        // --- STEP 1: PRE-PROCESSING ---
        let cleanText = rawText;

        // 1.1 Apply Corrections
        CONFIG.patterns.corrections.forEach(rule => {
            cleanText = cleanText.replace(rule.from, rule.to);
        });

        // 1.2 Remove Noise
        CONFIG.patterns.noise.forEach(pattern => {
            cleanText = cleanText.replace(pattern, "");
        });

        // 1.3 Normalize Whitespace
        cleanText = cleanText.replace(/\s+/g, " ").trim();

        // --- STEP 2: HUNTER PHASE (Attributes) ---
        let workingText = cleanText;
        let detected = {
            id: null,
            price: null,
            fabric: null,
            bust: null,
            length: null,
            sizeLetter: null,
            logic: "Unknown"
        };

        // Extract Fabric
        const fabricMatch = workingText.match(CONFIG.patterns.attributes.fabric);
        if (fabricMatch) {
            detected.fabric = fabricMatch[1];
            workingText = workingText.replace(fabricMatch[0], "").trim(); // Consume
        }

        // Extract Size Letter
        const sizeMatch = workingText.match(CONFIG.patterns.attributes.sizeLetter);
        if (sizeMatch) {
            detected.sizeLetter = sizeMatch[1].toUpperCase();
            workingText = workingText.replace(sizeMatch[0], "").trim(); // Consume
        }

        // Extract Bust
        const bustMatch = workingText.match(CONFIG.patterns.attributes.bust);
        if (bustMatch) {
            const val = parseInt(bustMatch[1]);
            if (val >= CONFIG.ranges.bust.min && val <= CONFIG.ranges.bust.max) {
                detected.bust = val;
                workingText = workingText.replace(bustMatch[0], "").trim(); // Consume
            }
        }

        // Extract Length
        const lengthMatch = workingText.match(CONFIG.patterns.attributes.length);
        if (lengthMatch) {
            const val = parseInt(lengthMatch[1]);
            if (val >= CONFIG.ranges.length.min && val <= CONFIG.ranges.length.max) {
                detected.length = val;
                workingText = workingText.replace(lengthMatch[0], "").trim(); // Consume
            }
        }

        // --- STEP 3: PLAN A (Anchor Logic) ---
        // Look for explicit "Item X" or "Price Y"
        const idAnchorMatch = workingText.match(CONFIG.patterns.anchors.id);
        if (idAnchorMatch) {
            const val = parseInt(idAnchorMatch[1]);
            if (validateId(val)) {
                detected.id = val;
                workingText = workingText.replace(idAnchorMatch[0], "").trim(); // Consume
                detected.logic = "Plan-A-Anchor";
            }
        }

        // Check for Freebie/Giveaway
        if (CONFIG.patterns.anchors.freebie.test(workingText)) {
            detected.price = 0;
            workingText = workingText.replace(CONFIG.patterns.anchors.freebie, "").trim();
        } else {
            // Check for explicit Price
            const priceAnchorMatch = workingText.match(CONFIG.patterns.anchors.price);
            if (priceAnchorMatch) {
                const val = parseInt(priceAnchorMatch[1]);
                if (validatePrice(val)) {
                    detected.price = val;
                    workingText = workingText.replace(priceAnchorMatch[0], "").trim(); // Consume
                    detected.logic = "Plan-A-Price";
                }
            }
        }

        // --- STEP 4: PLAN B (Implicit Fallback) ---
        // If Core Data (ID/Price) is missing, looks at remaining numbers
        if (detected.id === null || detected.price === null) {
            // Find all remaining independent numbers
            const numbers = [...workingText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));

            if (numbers.length > 0) {
                // Strategy: PAIR (Two numbers exist -> ID, Price)
                if (numbers.length >= 2 && detected.id === null && detected.price === null) {
                    const [n1, n2] = numbers;
                    if (validateId(n1) && validatePrice(n2)) {
                        detected.id = n1;
                        detected.price = n2;
                        detected.logic = "Plan-B-Pair";
                    }
                }
                // Strategy: MERGED (One big number -> ID + Price)
                // e.g. "50100" -> Item 50, Price 100
                else if (numbers.length === 1 && detected.id === null && detected.price === null) {
                    const num = numbers[0];
                    if (num >= 10010 && num <= 1000100) { // Plausible range checking
                        // It's ambiguous, but let's try splitting last 2 or 3 digits for price?
                        // Actually, simplified rule: If number > 1000, try split
                        // ex: 5380 -> 53, 80
                        const str = num.toString();
                        if (str.length === 4) {
                             const p1 = parseInt(str.substring(0, 2));
                             const p2 = parseInt(str.substring(2));
                             if (validateId(p1) && validatePrice(p2)) {
                                 detected.id = p1;
                                 detected.price = p2;
                                 detected.logic = "Plan-B-Merged-4";
                             }
                        }
                    } 
                    // Strategy: SINGLE ID
                    else if (validateId(num)) {
                         detected.id = num;
                         detected.logic = "Plan-B-SingleID";
                    }
                }
                // Strategy: FILL (One missing)
                else if (detected.id === null && numbers.length > 0) {
                    if (validateId(numbers[0])) {
                        detected.id = numbers[0];
                        detected.logic = "Plan-B-FillID";
                    }
                } else if (detected.price === null && numbers.length > 0) {
                    if (validatePrice(numbers[0])) {
                        detected.price = numbers[0];
                        detected.logic = "Plan-B-FillPrice";
                    }
                }
            }
        }

        // --- STEP 5: EXECUTION ---
        executeAction(rawText, cleanText, detected);
    }

    // ============================================
    // VALIDATORS
    // ============================================
    function validateId(num) {
        return num >= CONFIG.ranges.id.min && num <= CONFIG.ranges.id.max;
    }

    function validatePrice(num) {
        return CONFIG.ranges.price.includes(num);
    }

    // ============================================
    // ACTION HANDLER
    // ============================================
    function executeAction(rawText, cleanText, detected) {
        // Admin Commands Check (Cancel/Book)
        // Simple regex check on cleanText for these specific actions
        const cancelMatch = cleanText.match(/(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*(?:รายการที่)?\s*(\d+)/i);
        if (cancelMatch) {
            const id = parseInt(cancelMatch[1]);
            if (stockStore.stockData[id]) {
                const item = stockStore.stockData[id];
                // Only if it's reserved manually or by voice? Actually just cancel it.
                 // stockStore.processCancel usually checks if it's cancelable or just resets it.
                 // Let's assume processCancel does the right thing.
                stockStore.processCancel(id);
                lastAction.value = `🗑️ ยกเลิก #${id}`;
                playDing();
                logEvent({ raw: rawText, cleaned: cleanText, output: { action: "CANCEL", id }, logic: "Admin-Cancel", status: "MATCHED" });
                return;
            }
        }

        // Logic: We MUST have an ID to do anything meaningful update-wise
        if (detected.id) {
            // Check existence
            if (detected.id > stockStore.stockSize || detected.id < 1) {
                lastAction.value = `⚠️ ไม่พบรายการ #${detected.id}`;
                playDing(); // Error sound? 
                 logEvent({ raw: rawText, cleaned: cleanText, output: { id: detected.id, error: "Out of range" }, logic: detected.logic, status: "IGNORED" });
                return;
            }

            // Construct Update Payload
            const updateData = {};
            let sizeParts = [];
            
            if (detected.bust) sizeParts.push(`อก ${detected.bust}`);
            if (detected.length) sizeParts.push(`ยาว ${detected.length}`);
            if (detected.sizeLetter) sizeParts.push(detected.sizeLetter);
            if (detected.fabric) sizeParts.push(detected.fabric);

            if (sizeParts.length > 0) updateData.size = sizeParts.join(" ");
            if (detected.price !== null) updateData.price = detected.price;

            // Commit to Store
            if (Object.keys(updateData).length > 0) {
                stockStore.updateItemData(detected.id, updateData);
                
                // Feedback
                let feedback = `✅ #${detected.id}`;
                if (updateData.size) feedback += ` | ${updateData.size}`;
                // Explicit check for undefined because Price can be 0
                if (updateData.price !== undefined) feedback += ` | ${updateData.price}.-`;
                
                lastAction.value = feedback;
                transcript.value = cleanText; // Show the clean version
                playDing();

                logEvent({
                    raw: rawText,
                    cleaned: cleanText,
                    output: { id: detected.id, ...updateData },
                    logic: detected.logic,
                    status: "MATCHED"
                });
            } else {
                // ID found but no data to update? (Just selecting?)
                 lastAction.value = `ℹ️ เลือก #${detected.id} (ไม่มีข้อมูลใหม่)`;
                 logEvent({ raw: rawText, cleaned: cleanText, output: { id: detected.id, msg: "No data" }, logic: detected.logic, status: "IGNORED" });
            }

        } else {
            // No ID found
             if (rawText.length > 5) {
                // Only treat as error/feedback if it was substantial speech
                // lastAction.value = "⚠️ ไม่เข้าใจคำสั่ง"; // Optional: Don't spam UI
                logEvent({ raw: rawText, cleaned: cleanText, output: null, logic: "None", status: "IGNORED" });
             }
        }
    }

    // ============================================
    // EXPORTS
    // ============================================
    function toggleMic() {
        if (!recognition.value) return;
        if (isListening.value) {
            manualStop.value = true;
            recognition.value.stop();
        } else {
            manualStop.value = false;
            try { recognition.value.start(); } catch (e) { console.error(e); }
        }
    }

    return {
        isListening,
        transcript,
        lastAction,
        toggleMic
    };
}

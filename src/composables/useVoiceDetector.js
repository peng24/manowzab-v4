import { ref, onUnmounted } from 'vue';
import { useStockStore } from '../stores/stock';
import { useAudio } from './useAudio';
import { useVoiceLogger } from './useVoiceLogger';
import { useOllama } from './useOllama';

// ============================================
// CONFIG: SMART HUNTER V2
// ============================================
const CONFIG = {
    // Standard Validations
    ranges: {
        bust: { min: 30, max: 70 },
        length: { min: 15, max: 60 },
        id: { min: 1, max: 1000 },
        // "Split-Price must be in [20, 30...100, 120, 150] OR end in 0"
        // We will implement this logic in a helper function, but define the base set here if needed.
    },
    // Regex Patterns
    patterns: {
        corrections: [
            // Fix "Chest" Misinterpretation: "6 52" -> "อก 52"
            { from: /(?:^|\s)(?:6|หก)(?=\s*[3-6]\d\b)/g, to: " อก " },
            // Fix "Polyester" Noise
            { from: /(?:โพลิ|โพรี|Poly)\S*/gi, to: "" },
            // Fix "Price" Keywords
            { from: /(?:เอาไป|ขาย|เหลือ|ราคา)/g, to: " ราคา " },
            // Fix "Item" Keywords
            { from: /(?:เบอร์|รหัส|ตัวที่|ที่|No\.?)/gi, to: " รายการที่ " },
            // Standardize synonyms
            { from: /อก/g, to: " อก " }, // Ensure spaces around keywords
            { from: /ยาว/g, to: " ยาว " }
        ],
        noise: [
            // Context Noise
            /(?:ค่าส่ง|โอน|ปลายทาง|ทั้งหมด|เหลืออีก|มี)\s*\d+/g,
            /(?:กระดุม|ตำหนิ|สำรอง)\s*\d+/g,
            /(?:ลูกค้า|พี่|น้อง|แม่ค้า|ครับ|ค่ะ|จ้า)/gi
        ],
        attributes: {
            fabric: /\b(ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด|ไหมพรม|ซาติน|กำมะหยี่)\b/i,
            bust: /(?:อก|รอบอก|ตึงหน้าผ้า)\s*(\d+)/i,
            length: /(?:ยาว|ความยาว)\s*(\d+)/i,
            sizeLetter: /\b(XXL|XL|L|M|S|XS)\b/i
        },
        anchors: {
            // Explicit Anchors
            id: /รายการที่\s*(\d+)/i,
            price: /(?:ราคา\s*(\d+)|(\d+)\s*บาท)/i, // Matches "ราคา 80" or "80 บาท"
            freebie: /(?:ฟรี|แถม)/i
        }
    }
};

export function useVoiceDetector() {
    // Dependencies
    const stockStore = useStockStore();
    const { playDing } = useAudio();
    const { logEvent } = useVoiceLogger();
    const { extractPriceFromVoice } = useOllama();

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

        recognition.value.onresult = async (event) => {
            const text = event.results[event.results.length - 1][0].transcript.trim();
            await processVoiceCommand(text);
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
    async function processVoiceCommand(rawText) {
        // --- STEP 1: PRE-PROCESSING (The Cleaner) ---
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

        // --- STEP 2: EXTRACTION PIPELINE (Priority Order) ---
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

        // 2.1 Attributes (Get these out first)
        // Fabric
        const fabricMatch = workingText.match(CONFIG.patterns.attributes.fabric);
        if (fabricMatch) {
            detected.fabric = fabricMatch[1];
            workingText = workingText.replace(fabricMatch[0], "").trim();
        }
        // Size Letter
        const sizeMatch = workingText.match(CONFIG.patterns.attributes.sizeLetter);
        if (sizeMatch) {
            detected.sizeLetter = sizeMatch[1].toUpperCase();
            workingText = workingText.replace(sizeMatch[0], "").trim();
        }
        // Bust
        const bustMatch = workingText.match(CONFIG.patterns.attributes.bust);
        if (bustMatch) {
            const val = parseInt(bustMatch[1]);
            if (val >= CONFIG.ranges.bust.min && val <= CONFIG.ranges.bust.max) {
                detected.bust = val;
                workingText = workingText.replace(bustMatch[0], "").trim();
            }
        }
        // Length
        const lengthMatch = workingText.match(CONFIG.patterns.attributes.length);
        if (lengthMatch) {
            const val = parseInt(lengthMatch[1]);
            if (val >= CONFIG.ranges.length.min && val <= CONFIG.ranges.length.max) {
                detected.length = val;
                workingText = workingText.replace(lengthMatch[0], "").trim();
            }
        }

        // 2.2 Explicit Price (The Anchor)
        if (CONFIG.patterns.anchors.freebie.test(workingText)) {
            detected.price = 0;
            workingText = workingText.replace(CONFIG.patterns.anchors.freebie, "").trim();
        } else {
            const priceMatch = workingText.match(CONFIG.patterns.anchors.price);
            if (priceMatch) {
                // Match could be group 1 (ราคา X) or group 2 (X บาท)
                const val = parseInt(priceMatch[1] || priceMatch[2]);
                if (isValidPrice(val)) {
                    detected.price = val;
                    workingText = workingText.replace(priceMatch[0], "").trim();
                }
            }
        }

        // 2.3 Explicit ID (The Anchor)
        const idMatch = workingText.match(CONFIG.patterns.anchors.id);
        if (idMatch) {
            const val = parseInt(idMatch[1]);
            if (isValidId(val)) {
                detected.id = val;
                workingText = workingText.replace(idMatch[0], "").trim();
                detected.logic = "Explicit-ID";
            }
        }

        // --- STEP 3: IMPLICIT LOGIC (The Smart Splitter) ---
        // Only run if we are missing ID or Price
        if (detected.id === null || detected.price === null) {
            
            // Find all remaining independent numbers
            const numbers = [...workingText.matchAll(/\b(\d+)\b/g)].map(m => parseInt(m[1]));

            if (numbers.length > 0) {
                // Case A: Glued Numbers (e.g., "680", "4350")
                if (numbers.length === 1 && detected.id === null && detected.price === null) {
                    const num = numbers[0];
                    const str = num.toString();
                    
                    // Logic: If 3-4 digits, try splitting last 2 digits as Price
                    if (str.length >= 3 && str.length <= 4) {
                        const p2Val = parseInt(str.slice(-2)); // Last 2 digits
                        const p1Val = parseInt(str.slice(0, -2)); // The rest

                        if (isValidPrice(p2Val) && isValidId(p1Val)) {
                             detected.id = p1Val;
                             detected.price = p2Val;
                             detected.logic = "Implicit-Glued-Split";
                        } else if (isValidId(num)) {
                            // Single Number Fallback
                             // Case C: Single Number -> ID
                             detected.id = num;
                             detected.logic = "Implicit-Single-ID";
                        }
                    } else if (isValidId(num)) {
                        // Case C: Single Number -> ID
                        detected.id = num;
                        detected.logic = "Implicit-Single-ID";
                    }
                }
                // Case B: Two Separate Numbers (e.g., "53 80")
                else if (numbers.length >= 2 && detected.id === null && detected.price === null) {
                    const [n1, n2] = numbers;
                    if (isValidId(n1) && isValidPrice(n2)) {
                        detected.id = n1;
                        detected.price = n2;
                        detected.logic = "Implicit-Pair";
                    } else if (isValidId(n1)) {
                         // Fallback?
                         detected.id = n1;
                    }
                }
                // Case C (Variant): We have Price, missing ID, and have a number
                else if (detected.id === null && detected.price !== null && numbers.length > 0) {
                     if (isValidId(numbers[0])) {
                         detected.id = numbers[0];
                         detected.logic = "Implicit-ID-Only";
                     }
                }
                // Case C (Variant): We have ID, missing Price, and have a number
                else if (detected.id !== null && detected.price === null && numbers.length > 0) {
                    if (isValidPrice(numbers[0])) {
                        detected.price = numbers[0];
                        detected.logic = "Implicit-Price-Only";
                    }
                }
            }
        }

        // --- STEP 4: AI FALLBACK (Smart Hybrid Approach) ---
        // Only activate AI if regex failed to detect ID AND text is substantial
        if (detected.id === null && rawText.length > 5) {
            // Show "Thinking..." UI feedback
            lastAction.value = "🤔 กำลังคิด...";
            
            try {
                const aiResult = await extractPriceFromVoice(rawText);
                
                if (aiResult) {
                    // Update detection with AI results
                    if (aiResult.id !== null && aiResult.id !== undefined) {
                        // Handle special case: "current" means user wants current item
                        if (aiResult.id === "current") {
                            // Could integrate with overlay/current selection logic here
                            // For now, just log it
                            console.log("AI detected 'current item' reference");
                        } else {
                            detected.id = typeof aiResult.id === 'string' ? parseInt(aiResult.id) : aiResult.id;
                        }
                    }
                    
                    if (aiResult.price !== null && aiResult.price !== undefined) {
                        detected.price = aiResult.price;
                    }
                    
                    // Mark this as AI-detected
                    if (detected.id !== null) {
                        detected.logic = "AI-Ollama";
                    }
                }
            } catch (error) {
                console.error("AI Fallback Error:", error);
                // Continue without AI result
            }
        }

        // --- STEP 5: OUTPUT ACTION ---
        executeAction(rawText, cleanText, detected);
    }

    // ============================================
    // HELPERS & VALIDATORS
    // ============================================
    function isValidId(num) {
        return num >= CONFIG.ranges.id.min && num <= CONFIG.ranges.id.max;
    }

    function isValidPrice(num) {
        // "Split-Price must be in [20, 30...100, 120, 150] OR end in 0"
        // And generally reasonable prices
        if (num === 0) return true; // Free
        if (num < 10) return false; // Too cheap (unless single digit bugs?)
        if (num % 10 === 0) return true; // Ends in 0 (20, 30, 80, 120)
        // Specific whitelist for common prices if needed:
        const commonPrices = [120, 150, 199, 250, 290]; 
        if (commonPrices.includes(num)) return true;
        
        return false; 
    }

    // ============================================
    // ACTION HANDLER
    // ============================================
    function executeAction(rawText, cleanText, detected) {
        // Admin Commands Check (Cancel/Book)
        const cancelMatch = cleanText.match(/(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*(?:รายการที่)?\s*(\d+)/i);
        if (cancelMatch) {
            const id = parseInt(cancelMatch[1]);
            if (stockStore.stockData[id]) {
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
                 // Just selecting? Or partial parse?
                 lastAction.value = `ℹ️ เลือก #${detected.id}`;
                 logEvent({ raw: rawText, cleaned: cleanText, output: { id: detected.id, msg: "No data" }, logic: detected.logic, status: "IGNORED" });
            }

        } else {
             // No ID found - Ignore
             // Only log substantial speech
             if (rawText.length > 5 && !rawText.includes("แก้ไข")) {
                logEvent({ raw: rawText, cleaned: cleanText, output: null, logic: "None", status: "IGNORED" });
             }
        }
    }

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

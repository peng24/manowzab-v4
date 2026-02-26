import { ref, watch, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useAudio } from "./useAudio";
import { useVoiceLogger } from "./useVoiceLogger";
import { useOllama } from "./useOllama";

// ============================================
// CONFIG: SMART HUNTER V2
// ============================================
const CONFIG = {
  // Standard Validations
  ranges: {
    bust: { min: 30, max: 70 },
    length: { min: 15, max: 60 },
    id: { min: 1, max: 1000 },
  },
  // Regex Patterns
  patterns: {
    corrections: [
      { from: /(?:^|\s)(?:6|หก)(?=\s*[3-6]\d\b)/g, to: " อก " },
      { from: /(?:โพลิ|โพรี|Poly)\S*/gi, to: "" },
      { from: /(?:เอาไป|ขาย|เหลือ|ราคา)/g, to: " ราคา " },
      { from: /(?:เบอร์|รหัส|ตัวที่|ที่|No\.?)/gi, to: " รายการที่ " },
      { from: /อก/g, to: " อก " },
      { from: /ยาว/g, to: " ยาว " },
    ],
    noise: [
      /(?:ค่าส่ง|โอน|ปลายทาง|ทั้งหมด|เหลืออีก|มี)\s*\d+/g,
      /(?:กระดุม|ตำหนิ|สำรอง)\s*\d+/g,
      /(?:ลูกค้า|พี่|น้อง|แม่ค้า|ครับ|ค่ะ|จ้า)/gi,
    ],
    attributes: {
      fabric:
        /\b(ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด|ไหมพรม|ซาติน|กำมะหยี่)\b/i,
      bust: /(?:อก|รอบอก|ตึงหน้าผ้า)(?:\s*(?:ได้|ถึง|[-]|และ))?\s*((?:\d+[- ]\d+)|\d+)/i,
      length: /(?:ยาว|ความยาว)\s*((?:\d+[- ]\d+)|\d+)/i,
      sizeLetter: /\b(XXL|XL|L|M|S|XS)\b/i,
    },
    anchors: {
      id: /รายการที่\s*(\d+)/i,
      price: /(?:ราคา\s*(\d+)|(\d+)\s*บาท)/i,
      freebie: /(?:ฟรี|แถม)/i,
    },
  },
};

export function useVoiceDetector() {
  // Dependencies
  const stockStore = useStockStore();
  const systemStore = useSystemStore();
  const { playSfx } = useAudio();
  const { logEvent } = useVoiceLogger();
  const { extractPriceFromVoice } = useOllama();

  // State
  const isListening = ref(false);
  const transcript = ref("");
  const lastAction = ref("");
  const manualStop = ref(false);

  // ============================================
  // AUTO AGENT STATE (merged from useAutoPriceAgent)
  // ============================================
  const isAutoAgentEnabled = ref(false);
  const autoAgentStatus = ref("🤖 Auto Agent: Standby...");
  const isAutoAgentProcessing = ref(false);
  let agentProcessingTimer = null;
  let agentLastProcessedIndex = 0;

  // Context Tracking
  const lastDetectedId = ref(null);

  // Debounce Timer for AI Fallback
  let aiDebounceTimer = null;

  // Single shared SpeechRecognition instance
  let recognition = null;

  // ============================================
  // INITIALIZATION — Single SpeechRecognition
  // ============================================
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.lang = "th-TH";

    recognition.onstart = () => {
      isListening.value = true;
      manualStop.value = false;

      if (isAutoAgentEnabled.value) {
        agentLastProcessedIndex = 0;
        // Use interim results for Auto Agent (keyword detection)
        recognition.interimResults = true;
        if (!isAutoAgentProcessing.value) {
          autoAgentStatus.value = "🤖 Auto Agent: Listening...";
        }
      } else {
        // Manual mode: final results only
        recognition.interimResults = false;
      }
    };

    recognition.onend = () => {
      isListening.value = false;

      if (isAutoAgentEnabled.value) {
        // Auto Agent: always restart
        try {
          recognition.start();
        } catch (e) {
          /* ignore */
        }
      } else if (!manualStop.value) {
        // Manual mode: auto-restart unless user stopped
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            /* ignore */
          }
        }, 500);
      }
    };

    recognition.onresult = async (event) => {
      if (isAutoAgentEnabled.value) {
        // ===== AUTO AGENT PIPELINE =====
        handleAutoAgentResult(event);
      } else {
        // ===== MANUAL / REGEX+AI PIPELINE =====
        const text =
          event.results[event.results.length - 1][0].transcript.trim();
        await processVoiceCommand(text);
      }
    };

    recognition.onerror = (event) => {
      // Suppress "aborted" errors silently — these are expected during mode switches
      if (event.error === "aborted") {
        console.debug("[SpeechRecognition] Session recycled (aborted)");
        return;
      }

      console.warn("Speech Recognition Error:", event.error);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isListening.value = false;
        manualStop.value = true;
        if (isAutoAgentEnabled.value) {
          isAutoAgentEnabled.value = false;
          autoAgentStatus.value = "🤖 Error: Mic not allowed";
        }
      }
    };
  } else {
    lastAction.value = "⚠️ Browser not supported";
    autoAgentStatus.value = "🤖 Auto Agent: Not supported in this browser.";
  }

  // ============================================
  // AUTO AGENT PIPELINE (from useAutoPriceAgent)
  // ============================================
  function handleAutoAgentResult(event) {
    if (!isAutoAgentEnabled.value || isAutoAgentProcessing.value) return;

    let currentTranscript = "";
    for (let i = agentLastProcessedIndex; i < event.results.length; ++i) {
      currentTranscript += event.results[i][0].transcript + " ";
    }

    // Keyword Trigger
    const keywordRegex = /รายการที่|รหัส|ราคา|ไซส์/;
    if (keywordRegex.test(currentTranscript)) {
      if (agentProcessingTimer) {
        clearTimeout(agentProcessingTimer);
      }

      autoAgentStatus.value = "🤖 Auto Agent: กำลังรอจบประโยค...";

      agentProcessingTimer = setTimeout(async () => {
        isAutoAgentProcessing.value = true;
        autoAgentStatus.value = "🤖 Auto Agent: 🧠 กำลังคิด...";

        let textToProcess = "";
        for (let i = agentLastProcessedIndex; i < event.results.length; ++i) {
          textToProcess += event.results[i][0].transcript + " ";
        }
        agentLastProcessedIndex = event.results.length;

        if (textToProcess.length > 400) {
          textToProcess = "..." + textToProcess.slice(-400);
        }

        try {
          const aiResult = await extractPriceFromVoice(textToProcess.trim());
          if (aiResult && aiResult.id && aiResult.price) {
            await stockStore.updateItemData(aiResult.id, {
              price: aiResult.price,
              size: aiResult.size || null,
            });
            autoAgentStatus.value = `🤖 Auto Agent: ✅ อัปเดต ${aiResult.id} ฿${aiResult.price}`;
          } else {
            autoAgentStatus.value = "🤖 Auto Agent: ❌ ไม่พบข้อมูลที่ชัดเจน";
          }
        } catch (e) {
          console.error("Auto Agent Error:", e);
          autoAgentStatus.value = "🤖 Auto Agent: ⚠️ เกิดข้อผิดพลาด";
        } finally {
          isAutoAgentProcessing.value = false;
          setTimeout(() => {
            if (isAutoAgentEnabled.value && !isAutoAgentProcessing.value) {
              autoAgentStatus.value = "🤖 Auto Agent: Listening...";
            }
          }, 3000);
        }
      }, 1500);
    }
  }

  // ============================================
  // WATCH: Auto Agent Enable/Disable
  // ============================================
  watch(isAutoAgentEnabled, (enabled) => {
    if (enabled) {
      // Stop current session, restart with Agent config
      if (recognition && isListening.value) {
        manualStop.value = true;
        recognition.stop();
      }
      // Start fresh for Agent mode
      setTimeout(() => {
        manualStop.value = false;
        agentLastProcessedIndex = 0;
        try {
          recognition?.start();
        } catch (e) {
          /* ignore */
        }
      }, 300);
    } else {
      // Turning off Agent — stop recognition
      if (recognition) {
        manualStop.value = true;
        recognition.stop();
      }
      isAutoAgentProcessing.value = false;
      if (agentProcessingTimer) clearTimeout(agentProcessingTimer);
      autoAgentStatus.value = "🤖 Auto Agent: Standby...";
    }
  });

  // ============================================
  // CORE LOGIC: SMART HUNTER (Manual Pipeline)
  // ============================================
  async function processVoiceCommand(rawText) {
    if (aiDebounceTimer) {
      clearTimeout(aiDebounceTimer);
      aiDebounceTimer = null;
    }

    // --- STEP 1: PRE-PROCESSING ---
    let cleanText = rawText;
    CONFIG.patterns.corrections.forEach((rule) => {
      cleanText = cleanText.replace(rule.from, rule.to);
    });
    CONFIG.patterns.noise.forEach((pattern) => {
      cleanText = cleanText.replace(pattern, "");
    });
    cleanText = cleanText.replace(/\s+/g, " ").trim();

    // --- STEP 2: EXTRACTION PIPELINE ---
    let workingText = cleanText;
    let detected = {
      id: null,
      price: null,
      fabric: null,
      bust: null,
      length: null,
      sizeLetter: null,
      logic: "Unknown",
    };

    // 2.1 Attributes
    const fabricMatch = workingText.match(CONFIG.patterns.attributes.fabric);
    if (fabricMatch) {
      detected.fabric = fabricMatch[1];
      workingText = workingText.replace(fabricMatch[0], "").trim();
    }
    const sizeMatch = workingText.match(CONFIG.patterns.attributes.sizeLetter);
    if (sizeMatch) {
      detected.sizeLetter = sizeMatch[1].toUpperCase();
      workingText = workingText.replace(sizeMatch[0], "").trim();
    }
    const bustMatch = workingText.match(CONFIG.patterns.attributes.bust);
    if (bustMatch) {
      const rangeStr = bustMatch[1];
      const firstNum = parseInt(rangeStr.split(/[- ]/)[0]);
      if (
        firstNum >= CONFIG.ranges.bust.min &&
        firstNum <= CONFIG.ranges.bust.max
      ) {
        detected.bust = rangeStr;
        workingText = workingText.replace(bustMatch[0], "").trim();
      }
    }
    const lengthMatch = workingText.match(CONFIG.patterns.attributes.length);
    if (lengthMatch) {
      const rangeStr = lengthMatch[1];
      const firstNum = parseInt(rangeStr.split(/[- ]/)[0]);
      if (
        firstNum >= CONFIG.ranges.length.min &&
        firstNum <= CONFIG.ranges.length.max
      ) {
        detected.length = rangeStr;
        workingText = workingText.replace(lengthMatch[0], "").trim();
      }
    }

    // 2.2 Explicit Price
    if (CONFIG.patterns.anchors.freebie.test(workingText)) {
      detected.price = 0;
      workingText = workingText
        .replace(CONFIG.patterns.anchors.freebie, "")
        .trim();
    } else {
      const priceMatch = workingText.match(CONFIG.patterns.anchors.price);
      if (priceMatch) {
        const val = parseInt(priceMatch[1] || priceMatch[2]);
        if (isValidPrice(val)) {
          detected.price = val;
          workingText = workingText.replace(priceMatch[0], "").trim();
        }
      }
    }

    // 2.3 Explicit ID
    const idMatch = workingText.match(CONFIG.patterns.anchors.id);
    if (idMatch) {
      const val = parseInt(idMatch[1]);
      if (isValidId(val)) {
        detected.id = val;
        workingText = workingText.replace(idMatch[0], "").trim();
        detected.logic = "Explicit-ID";
      }
    }

    // --- STEP 3: IMPLICIT LOGIC ---
    if (detected.id === null || detected.price === null) {
      const numbers = [...workingText.matchAll(/\b(\d+)\b/g)].map((m) =>
        parseInt(m[1]),
      );

      if (numbers.length > 0) {
        if (
          numbers.length === 1 &&
          detected.id === null &&
          detected.price === null
        ) {
          const num = numbers[0];
          const str = num.toString();
          if (str.length >= 3 && str.length <= 4) {
            const p2Val = parseInt(str.slice(-2));
            const p1Val = parseInt(str.slice(0, -2));
            if (p2Val > 0 && isValidPrice(p2Val) && isValidId(p1Val)) {
              detected.id = p1Val;
              detected.price = p2Val;
              detected.logic = "Implicit-Glued-Split";
            } else if (isValidId(num)) {
              detected.id = num;
              detected.logic = "Implicit-Single-ID";
            }
          } else if (isValidId(num)) {
            detected.id = num;
            detected.logic = "Implicit-Single-ID";
          }
        } else if (
          numbers.length >= 2 &&
          detected.id === null &&
          detected.price === null
        ) {
          const [n1, n2] = numbers;
          if (isValidId(n1) && isValidPrice(n2)) {
            detected.id = n1;
            detected.price = n2;
            detected.logic = "Implicit-Pair";
          } else if (isValidId(n1)) {
            detected.id = n1;
          }
        } else if (
          detected.id === null &&
          detected.price !== null &&
          numbers.length > 0
        ) {
          if (isValidId(numbers[0])) {
            detected.id = numbers[0];
            detected.logic = "Implicit-ID-Only";
          }
        } else if (
          detected.id !== null &&
          detected.price === null &&
          numbers.length > 0
        ) {
          if (isValidPrice(numbers[0])) {
            detected.price = numbers[0];
            detected.logic = "Implicit-Price-Only";
          }
        }
      }
    }

    // --- STEP 4: AI FALLBACK ---
    if (detected.id === null && rawText.length > 5 && systemStore.isAiEnabled) {
      aiDebounceTimer = setTimeout(async () => {
        if (!isListening.value) return;
        lastAction.value = "🤔 กำลังคิด...";

        try {
          const aiResult = await extractPriceFromVoice(
            rawText,
            lastDetectedId.value,
          );

          if (aiResult) {
            if (aiResult.id !== null && aiResult.id !== undefined) {
              if (aiResult.id === "current" && lastDetectedId.value) {
                detected.id = lastDetectedId.value;
                detected.logic = "AI-Ollama-Context";
              } else if (aiResult.id === "current") {
                console.log(
                  "AI detected 'current' but no lastDetectedId exists",
                );
              } else {
                detected.id =
                  typeof aiResult.id === "string"
                    ? parseInt(aiResult.id)
                    : aiResult.id;
              }
            }

            if (aiResult.price !== null && aiResult.price !== undefined) {
              detected.price = aiResult.price;
            }

            if (
              aiResult.size !== null &&
              aiResult.size !== undefined &&
              aiResult.size !== ""
            ) {
              const sizeParts = [];
              if (detected.bust) sizeParts.push(`อก ${detected.bust}`);
              if (detected.length) sizeParts.push(`ยาว ${detected.length}`);
              if (detected.sizeLetter) sizeParts.push(detected.sizeLetter);
              if (detected.fabric) sizeParts.push(detected.fabric);
              if (
                sizeParts.length === 0 ||
                !sizeParts.join(" ").includes(aiResult.size)
              ) {
                sizeParts.push(aiResult.size);
              }
              detected.aiSize = sizeParts.join(" ");
            }

            if (detected.id !== null) {
              detected.logic = "AI-Ollama";
            }

            executeAction(rawText, cleanText, detected);
          }
        } catch (error) {
          console.error("AI Fallback Error:", error);
          lastAction.value = "⚠️ AI ไม่ตอบสนอง";
        }
      }, 800);

      return;
    } else if (
      detected.id === null &&
      rawText.length > 5 &&
      !systemStore.isAiEnabled
    ) {
      console.log("⚠️ AI Disabled - No ID detected by regex");
      logEvent({
        raw: rawText,
        cleaned: cleanText,
        output: null,
        logic: "AI-Disabled",
        status: "IGNORED",
      });
      return;
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
    if (num === 0) return true;
    if (num < 10) return false;
    if (num % 10 === 0) return true;
    const commonPrices = [120, 150, 199, 250, 290];
    if (commonPrices.includes(num)) return true;
    return false;
  }

  // ============================================
  // ACTION HANDLER
  // ============================================
  function executeAction(rawText, cleanText, detected) {
    const cancelMatch = cleanText.match(
      /(?:ยกเลิก|ลบ|เคลียร์|ไม่เอา)\s*(?:รายการที่)?\s*(\d+)/i,
    );
    if (cancelMatch) {
      const id = parseInt(cancelMatch[1]);
      if (stockStore.stockData[id]) {
        stockStore.processCancel(id);
        lastAction.value = `🗑️ ยกเลิก #${id}`;
        playSfx("ding");
        logEvent({
          raw: rawText,
          cleaned: cleanText,
          output: { action: "CANCEL", id },
          logic: "Admin-Cancel",
          status: "MATCHED",
        });
        return;
      }
    }

    if (detected.id) {
      if (detected.id > stockStore.stockSize || detected.id < 1) {
        lastAction.value = `⚠️ ไม่พบรายการ #${detected.id}`;
        logEvent({
          raw: rawText,
          cleaned: cleanText,
          output: { id: detected.id, error: "Out of range" },
          logic: detected.logic,
          status: "IGNORED",
        });
        return;
      }

      const updateData = {};
      let sizeParts = [];

      if (detected.aiSize) {
        updateData.size = detected.aiSize;
      } else {
        if (detected.bust) sizeParts.push(`อก ${detected.bust}`);
        if (detected.length) sizeParts.push(`ยาว ${detected.length}`);
        if (detected.sizeLetter) sizeParts.push(detected.sizeLetter);
        if (detected.fabric) sizeParts.push(detected.fabric);
        if (sizeParts.length > 0) updateData.size = sizeParts.join(" ");
      }

      if (detected.price !== null) updateData.price = detected.price;

      if (Object.keys(updateData).length > 0) {
        stockStore.updateItemData(detected.id, updateData);
        lastDetectedId.value = detected.id;

        let feedback = `✅ #${detected.id}`;
        if (updateData.size) feedback += ` | ${updateData.size}`;
        if (updateData.price !== undefined)
          feedback += ` | ${updateData.price}.-`;

        lastAction.value = feedback;
        transcript.value = cleanText;
        playSfx("ding");

        logEvent({
          raw: rawText,
          cleaned: cleanText,
          output: { id: detected.id, ...updateData },
          logic: detected.logic,
          status: "MATCHED",
        });
      } else {
        lastAction.value = `ℹ️ เลือก #${detected.id}`;
        logEvent({
          raw: rawText,
          cleaned: cleanText,
          output: { id: detected.id, msg: "No data" },
          logic: detected.logic,
          status: "IGNORED",
        });
      }
    } else {
      if (rawText.length > 5 && !rawText.includes("แก้ไข")) {
        logEvent({
          raw: rawText,
          cleaned: cleanText,
          output: null,
          logic: "None",
          status: "IGNORED",
        });
      }
    }
  }

  function toggleMic() {
    if (!recognition) return;

    // If Auto Agent is active, don't allow manual toggle conflict
    if (isAutoAgentEnabled.value) {
      // Toggle agent off when user taps mic during agent mode
      isAutoAgentEnabled.value = false;
      return;
    }

    if (isListening.value) {
      manualStop.value = true;
      recognition.stop();
    } else {
      manualStop.value = false;
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  }

  // Cleanup
  onUnmounted(() => {
    if (recognition) {
      manualStop.value = true;
      isAutoAgentEnabled.value = false;
      recognition.stop();
    }
    if (agentProcessingTimer) clearTimeout(agentProcessingTimer);
    if (aiDebounceTimer) clearTimeout(aiDebounceTimer);
  });

  return {
    isListening,
    transcript,
    lastAction,
    toggleMic,
    // Auto Agent exports
    isAutoAgentEnabled,
    autoAgentStatus,
    isAutoAgentProcessing,
  };
}

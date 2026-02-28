import { ref, watch, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useAudio } from "./useAudio";
import { useVoiceLogger } from "./useVoiceLogger";


// ============================================
// CONFIG: SMART HUNTER V3 (Livestream Optimized)
// ============================================
const CONFIG = {
  ranges: {
    bust: { min: 30, max: 70 },
    length: { min: 15, max: 60 },
    id: { min: 1, max: 1000 },
  },
  patterns: {
    wordToDigit: [
      { from: /ร้อยนึง|ร้อยบาท|หนึ่งร้อย/g, to: "100" },
      { from: /ร้อยยี่/g, to: "120" },
      { from: /ร้อยห้าสิบ/g, to: "150" },
      { from: /แปดสิบ/g, to: "80" },
      { from: /หกสิบ/g, to: "60" },
      { from: /ห้าสิบ/g, to: "50" },
      { from: /สี่สิบ/g, to: "40" },
      { from: /สามสิบ/g, to: "30" },
      { from: /ยี่สิบ/g, to: "20" },
    ],
    anchors: {
      id: /(?:รายการที่|รหัส|เบอร์|ตัวที่|ที่)\s*(\d+)/i,
      price: /(?:ราคา|เอาไป|จัดไป|ขาย|ตัวละ|เหลือ)\s*(\d+)|(\d+)\s*(?:บาท|.-)/i,
      freebie: /(?:ฟรี|แถม)/i,
    },
  },
};

// Cloud Price Detection API (Hugging Face Spaces)
const PRICE_API_URL = import.meta.env.VITE_PRICE_API_URL || "";

async function callCloudPriceAPI(rawText) {
  if (!PRICE_API_URL) return null;
  try {
    const res = await fetch(`${PRICE_API_URL}/detect_price`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: rawText, enable_llm_fallback: false }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.item_code !== null && data.item_code !== undefined) {
      return {
        id: data.item_code,
        price: data.price,
        size: null,
        method: data.extraction_method || "cloud-api",
      };
    }
    return null;
  } catch (e) {
    console.warn(
      "☁️ Cloud API unavailable:",
      e.message,
    );
    return null;
  }
}

export function useVoiceDetector() {
  // Dependencies
  const stockStore = useStockStore();
  const systemStore = useSystemStore();
  const { playSfx } = useAudio();
  const { logEvent } = useVoiceLogger();


  // State
  const isListening = ref(false);
  const transcript = ref("");
  const lastAction = ref("");
  const manualStop = ref(false);
  const engineStatus = ref("standby");

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
      engineStatus.value = "listening";

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
      } else {
        // Manual stop — go to standby
        engineStatus.value = "standby";
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
          const aiResult = await callCloudPriceAPI(textToProcess.trim());
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
  // CORE LOGIC: SMART HUNTER V3
  // ============================================
  async function processVoiceCommand(rawText) {
    engineStatus.value = "processing";

    if (aiDebounceTimer) {
      clearTimeout(aiDebounceTimer);
      aiDebounceTimer = null;
    }

    // --- STEP 1: NORMALIZE & CLEAN ---
    let cleanText = rawText;
    CONFIG.patterns.wordToDigit.forEach((rule) => {
      cleanText = cleanText.replace(rule.from, rule.to);
    });
    cleanText = cleanText.replace(/\s+/g, " ").trim();
    let workingText = cleanText;

    let detected = {
      id: null,
      price: null,
      sizeParts: [],
      logic: "Unknown",
    };

    // --- STEP 2: QUARANTINE ATTRIBUTES (Remove noise numbers) ---
    const bustMatch = workingText.match(
      /(?:อก|รอบอก|หน้าผ้า)\s*(?:ได้|ถึง|ประมาณ|-)?\s*(\d{2,3})/i,
    );
    if (bustMatch) {
      const b = parseInt(bustMatch[1]);
      if (b >= CONFIG.ranges.bust.min && b <= CONFIG.ranges.bust.max) {
        detected.sizeParts.push(`อก ${b}`);
        workingText = workingText.replace(bustMatch[0], "");
      }
    }

    const lengthMatch = workingText.match(
      /(?:ยาว|ความยาว)\s*(?:ได้|ถึง|ประมาณ|-)?\s*(\d{2})/i,
    );
    if (lengthMatch) {
      const l = parseInt(lengthMatch[1]);
      if (l >= CONFIG.ranges.length.min && l <= CONFIG.ranges.length.max) {
        detected.sizeParts.push(`ยาว ${l}`);
        workingText = workingText.replace(lengthMatch[0], "");
      }
    }

    // Thai phonetic → standard English size mapping
    const sizeMap = {
      'เอส': 'S', 'เอ็ม': 'M', 'แอล': 'L', 'แอลไซส์': 'L',
      'เอ็กแอล': 'XL', 'เอ็กซ์แอล': 'XL',
      'ทูเอ็กแอล': '2XL', 'สองเอ็กแอล': '2XL', 'สองเอ็กซ์แอล': '2XL',
      'สามเอ็กแอล': '3XL', 'สามเอ็กซ์แอล': '3XL', 'ทรีเอ็กแอล': '3XL',
      'สี่เอ็กแอล': '4XL', 'สี่เอ็กซ์แอล': '4XL',
      'ฟรีไซส์': 'Free Size', 'โอเวอร์ไซส์': 'Oversize',
    };

    const sizeRegex = /(?:ไซส์\s*)?(XXL|XL|L|M|S|XS|2XL|3XL|4XL|5XL|เอส|เอ็ม|แอล|แอลไซส์|เอ็กแอล|เอ็กซ์แอล|ทูเอ็กแอล|สองเอ็กแอล|สองเอ็กซ์แอล|สามเอ็กแอล|สามเอ็กซ์แอล|ทรีเอ็กแอล|สี่เอ็กแอล|สี่เอ็กซ์แอล|ฟรีไซส์|โอเวอร์ไซส์)/i;

    const sizeMatch = workingText.match(sizeRegex);
    if (sizeMatch) {
      let capturedSize = sizeMatch[1];

      // Normalize: Thai phonetic → English label, or just uppercase
      if (sizeMap[capturedSize]) {
        capturedSize = sizeMap[capturedSize];
      } else {
        capturedSize = capturedSize.toUpperCase();
      }

      detected.sizeParts.push(capturedSize);
      workingText = workingText.replace(sizeMatch[0], "");
    }

    const fabricMatch = workingText.match(
      /\b(ผ้าเด้ง|ชีฟอง|โพลิเอสเตอร์|โพลี่|ไนลอน|เรยอน|คอตตอน|ลินิน|ยืด|ไหมพรม|ซาติน|กำมะหยี่)\b/i,
    );
    if (fabricMatch) {
      detected.sizeParts.push(fabricMatch[1]);
      workingText = workingText.replace(fabricMatch[0], "");
    }

    // --- STEP 3: EXPLICIT EXTRACTION ---
    if (CONFIG.patterns.anchors.freebie.test(workingText)) {
      detected.price = 0;
      workingText = workingText.replace(CONFIG.patterns.anchors.freebie, "");
    } else {
      const priceMatch = workingText.match(CONFIG.patterns.anchors.price);
      if (priceMatch) {
        const val = parseInt(priceMatch[1] || priceMatch[2]);
        if (isValidPrice(val)) {
          detected.price = val;
          workingText = workingText.replace(priceMatch[0], "");
        }
      }
    }

    const idMatch = workingText.match(CONFIG.patterns.anchors.id);
    if (idMatch) {
      const val = parseInt(idMatch[1]);
      if (isValidId(val)) {
        detected.id = val;
        workingText = workingText.replace(idMatch[0], "");
        detected.logic =
          detected.price !== null ? "Explicit-Both" : "Explicit-ID";
      }
    }

    // --- STEP 4: IMPLICIT EXTRACTION (Loose Numbers) ---
    const numbers = [...workingText.matchAll(/\b(\d+)\b/g)].map((m) =>
      parseInt(m[1]),
    );

    if (numbers.length > 0) {
      if (
        detected.id === null &&
        detected.price === null &&
        numbers.length >= 2
      ) {
        const [n1, n2] = numbers;
        if (isValidId(n1) && isValidPrice(n2)) {
          detected.id = n1;
          detected.price = n2;
          detected.logic = "Implicit-Pair";
        }
      } else if (detected.id !== null && detected.price === null) {
        const validPrices = numbers.filter(isValidPrice);
        if (validPrices.length > 0) {
          detected.price = validPrices[validPrices.length - 1];
          detected.logic = "Explicit-ID + Implicit-Price";
        }
      } else if (detected.price !== null && detected.id === null) {
        const validIds = numbers.filter(isValidId);
        if (validIds.length > 0) {
          detected.id = validIds[0];
          detected.logic = "Implicit-ID + Explicit-Price";
        }
      }
    }

    // --- STEP 5: AI FALLBACK (Cloud API) ---
    if (detected.id === null && rawText.length > 5 && systemStore.isAiEnabled) {
      aiDebounceTimer = setTimeout(async () => {
        if (!isListening.value) return;
        lastAction.value = "🤔 กำลังคิด...";

        try {
          // Cloud Price Detection API (HF Spaces)
          const cloudResult = await callCloudPriceAPI(rawText);
          if (cloudResult && cloudResult.id !== null) {
            detected.id =
              typeof cloudResult.id === "string"
                ? parseInt(cloudResult.id)
                : cloudResult.id;
            if (cloudResult.price !== null && cloudResult.price !== undefined) {
              detected.price = cloudResult.price;
            }
            detected.logic = `Cloud-API:${cloudResult.method}`;
            executeAction(rawText, cleanText, detected);
            return;
          }

          // Cloud API returned no result
          lastAction.value = "⚠️ AI ไม่พบข้อมูล";
          engineStatus.value = "error";
          setTimeout(() => {
            engineStatus.value = isListening.value ? "listening" : "standby";
          }, 1500);
        } catch (error) {
          console.error("AI Fallback Error:", error);
          lastAction.value = "⚠️ AI ไม่ตอบสนอง";
          engineStatus.value = "error";
          setTimeout(() => {
            engineStatus.value = isListening.value ? "listening" : "standby";
          }, 1500);
        }
      }, 800);
      return;
    } else if (
      detected.id === null &&
      rawText.length > 5 &&
      !systemStore.isAiEnabled
    ) {
      logEvent({
        raw: rawText,
        cleaned: cleanText,
        output: null,
        logic: "AI-Disabled",
        status: "IGNORED",
      });
      return;
    }

    // --- STEP 6: OUTPUT ACTION ---
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
    if (num < 10 || num > 2000) return false;
    // Live sales prices mostly end in 0 or 9 (e.g., 50, 80, 100, 199) or specific like 55, 65
    if (num % 10 === 0 || num % 10 === 9) return true;
    if ([55, 65, 85, 95].includes(num)) return true;
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
        engineStatus.value = "error";
        setTimeout(() => {
          engineStatus.value = isListening.value ? "listening" : "standby";
        }, 1500);
        return;
      }

      const updateData = {};
      if (detected.sizeParts && detected.sizeParts.length > 0) {
        updateData.size = detected.sizeParts.join(" ");
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

        engineStatus.value = "success";
        setTimeout(() => {
          engineStatus.value = isListening.value ? "listening" : "standby";
        }, 1500);
      } else {
        lastAction.value = `ℹ️ เลือก #${detected.id}`;
        engineStatus.value = isListening.value ? "listening" : "standby";
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
      engineStatus.value = "standby";
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
    engineStatus,
    // Auto Agent exports
    isAutoAgentEnabled,
    autoAgentStatus,
    isAutoAgentProcessing,
  };
}

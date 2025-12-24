import { ref, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useAudio } from "./useAudio";

export function useVoiceDetector() {
  const stockStore = useStockStore();
  const { playDing } = useAudio();

  const isListening = ref(false);
  const transcript = ref("");
  const lastAction = ref("");
  const recognition = ref(null);
  const manualStop = ref(false); // Track if user manually stopped it

  // Initialize Speech Recognition
  if ("webkitSpeechRecognition" in window) {
    const SpeechRecognition = window.webkitSpeechRecognition;
    recognition.value = new SpeechRecognition();
    recognition.value.continuous = true;
    recognition.value.interimResults = false;
    recognition.value.lang = "th-TH";

    recognition.value.onstart = () => {
      isListening.value = true;
      manualStop.value = false;
    };

    recognition.value.onend = () => {
      isListening.value = false;
      // Auto-Restart logic (Keep-Alive)
      if (!manualStop.value) {
        console.log(
          "🔄 Recognition ended unexpectedly (silence/error). Restarting..."
        );
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
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
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
    // Step 1: Normalize & Merge Digits
    // Remove special characters but keep text, digits, and spaces
    let mergedText = rawText.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s]/g, " ");
    // Digits merging logic: "5 0" -> "50"
    let prevText = "";
    while (prevText !== mergedText) {
      prevText = mergedText;
      mergedText = mergedText.replace(/\b(\d+)\s+(\d+)\b/u, "$1$2");
    }
    mergedText = mergedText.replace(/\s+/g, " ").trim();

    console.log(`🗣️ Raw: "${rawText}" -> Merged: "${mergedText}"`);

    // Prepare variables for extraction
    let workingText = mergedText;
    let targetId = null;
    let targetPrice = null;
    let targetSize = "";

    // Step 2: Extract & Remove SIZE (Priority 1)
    // Keywords: อก, เอว, ยาว, สะโพก, ไซส์, Size
    // Pattern: Keyword + (Optional Filler) + Number
    const sizeKeywords = ["อก", "เอว", "ยาว", "สะโพก", "ไซส์", "Size"];
    // Regex Explanation:
    // (Keyword)
    // [^\d]*? -> Optional Filler (non-digits), non-greedy
    // \s*
    // (\d+(?:\.\d+)?) -> Number (integer or float)
    const sizeRegex = new RegExp(
      `(${sizeKeywords.join("|")})[^\\d]*?\\s*(\\d+(?:\\.\\d+)?)`,
      "gi"
    );

    const sizeMatches = [...workingText.matchAll(sizeRegex)];
    if (sizeMatches.length > 0) {
      targetSize = sizeMatches.map((m) => `${m[1]} ${m[2]}`).join(" ");
      // Remove matches from workingText
      workingText = workingText.replace(sizeRegex, "").trim();
      workingText = workingText.replace(/\s+/g, " ").trim(); // Clean up spaces
    }

    // Step 3: Extract & Remove ITEM ID (Priority 2)
    // Keywords: รายการที่, รหัส, เบอร์, ตัวที่, ที่
    const idRegex = /(?:รายการที่|รหัส|เบอร์|ตัวที่|ที่)\s*(\d+)/i;
    const idMatch = workingText.match(idRegex);
    if (idMatch) {
      targetId = parseInt(idMatch[1]);
      // Remove match from workingText
      workingText = workingText.replace(idRegex, "").trim();
      workingText = workingText.replace(/\s+/g, " ").trim();
    }

    // Step 4: Extract PRICE (Priority 3)
    // Keywords: ราคา, บาท, เอาไป
    // Pattern A: Keyword + Number (ราคา 100)
    // Pattern B: Number + Keyword (100 บาท)
    // Fallback: Any remaining integer
    let priceMatch = workingText.match(/(?:ราคา|เอาไป)\s*(\d+)/); // Pattern A
    if (!priceMatch) {
      priceMatch = workingText.match(/(\d+)\s*(?:บาท|.-)/); // Pattern B
    }
    if (!priceMatch) {
      // Fallback: Find first remaining integer
      // We use \b to ensure we don't catch parts of words if any, but \d+ is standard
      const fallbackMatch = workingText.match(/\b(\d+)\b/);
      if (fallbackMatch) {
        targetPrice = parseInt(fallbackMatch[1]);
      }
    } else {
      targetPrice = parseInt(priceMatch[1]);
    }

    console.log(
      `🔍 Extracted -> ID: ${targetId}, Price: ${targetPrice}, Size: "${targetSize}" | Leftover: "${workingText}"`
    );

    // Action: Update Stock if ID & Price found
    if (targetId && targetPrice !== null) {
      if (targetId > 0 && targetId <= stockStore.stockSize) {
        const updateData = { price: targetPrice };
        if (targetSize) updateData.size = targetSize;

        stockStore.updateItemData(targetId, updateData);

        // Visualization Output
        let displayMsg = `✅ รายการที่ ${targetId} | ${targetPrice}.-`;
        if (targetSize) displayMsg += ` | ${targetSize}`;

        lastAction.value = displayMsg;
        transcript.value = `${mergedText}`; // Show clean text
        playDing();
        return;
      }
    }

    // Fallback: Check Admin Commands (Cancel / Manual Book) on the normalized text
    // Pass original 'mergedText' because 'workingText' has stripped content

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
          stockStore.processOrder(
            stockId,
            "Admin Voice",
            "manual-voice",
            "manual-voice",
            null,
            "manual-voice"
          );
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
    toggleMic,
  };
}

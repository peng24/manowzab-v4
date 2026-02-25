import { ref, watch, onUnmounted } from "vue";
import { useOllama } from "./useOllama";
import { useStockStore } from "../stores/stock";

export function useAutoPriceAgent() {
  const isAutoAgentEnabled = ref(false);
  const isListeningAuto = ref(false);
  const statusText = ref("🤖 Auto Agent: Standby...");
  const isProcessing = ref(false);

  const { extractPriceFromVoice } = useOllama();
  const stockStore = useStockStore();

  let recognition = null;
  let processingTimer = null;
  let lastProcessedIndex = 0;

  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "th-TH";

    recognition.onstart = () => {
      isListeningAuto.value = true;
      lastProcessedIndex = 0;
      if (!isProcessing.value) {
        statusText.value = "🤖 Auto Agent: Listening...";
      }
    };

    recognition.onend = () => {
      isListeningAuto.value = false;
      // Auto restart if still enabled
      if (isAutoAgentEnabled.value) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore
        }
      } else {
        if (!isProcessing.value) {
          statusText.value = "🤖 Auto Agent: Standby...";
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn("Auto Agent Speech Error:", event.error);
      if (event.error === "not-allowed") {
        isAutoAgentEnabled.value = false;
        statusText.value = "🤖 Error: Mic not allowed";
      }
    };

    recognition.onresult = (event) => {
      if (!isAutoAgentEnabled.value || isProcessing.value) return;

      let currentTranscript = "";
      for (let i = lastProcessedIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript + " ";
      }

      // Regex Keyword Trigger: "รายการที่", "รหัส", "ราคา", "ไซส์"
      const keywordRegex = /รายการที่|รหัส|ราคา|ไซส์/;
      if (keywordRegex.test(currentTranscript)) {
        if (processingTimer) {
          clearTimeout(processingTimer);
        }

        statusText.value = "🤖 Auto Agent: กำลังรอจบประโยค...";

        processingTimer = setTimeout(async () => {
          isProcessing.value = true;
          statusText.value = "🤖 Auto Agent: 🧠 กำลังคิด...";

          let textToProcess = "";
          for (let i = lastProcessedIndex; i < event.results.length; ++i) {
            textToProcess += event.results[i][0].transcript + " ";
          }

          // Move index forward so we don't process this chunk again
          lastProcessedIndex = event.results.length;

          // Rolling buffer of approx ~15 seconds (> 400 characters -> trim)
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
              statusText.value = `🤖 Auto Agent: ✅ อัปเดต ${aiResult.id} ฿${aiResult.price}`;
            } else {
              statusText.value = "🤖 Auto Agent: ❌ ไม่พบข้อมูลที่ชัดเจน";
            }
          } catch (e) {
            console.error("Auto Agent Error:", e);
            statusText.value = "🤖 Auto Agent: ⚠️ เกิดข้อผิดพลาด";
          } finally {
            isProcessing.value = false;
            // Go back to listening status after 3 seconds
            setTimeout(() => {
              if (isAutoAgentEnabled.value && !isProcessing.value) {
                statusText.value = "🤖 Auto Agent: Listening...";
              }
            }, 3000);
          }
        }, 1500); // Wait 1.5 seconds for them to finish speaking
      }
    };
  } else {
    statusText.value = "🤖 Auto Agent: Not supported in this browser.";
    console.warn("SpeechRecognition not supported for Auto Agent");
  }

  watch(isAutoAgentEnabled, (newVal) => {
    if (newVal) {
      if (recognition && !isListeningAuto.value) {
        try {
          lastProcessedIndex = 0;
          recognition.start();
        } catch (e) {
          console.error("Agent start error:", e);
        }
      }
    } else {
      if (recognition) {
        recognition.stop();
      }
      isProcessing.value = false;
      if (processingTimer) clearTimeout(processingTimer);
      statusText.value = "🤖 Auto Agent: Standby...";
    }
  });

  onUnmounted(() => {
    if (recognition) {
      isAutoAgentEnabled.value = false;
      recognition.stop();
    }
    if (processingTimer) clearTimeout(processingTimer);
  });

  return {
    isAutoAgentEnabled,
    isListeningAuto,
    statusText,
    isProcessing,
  };
}

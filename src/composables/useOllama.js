import { ref } from "vue";
import { useSystemStore } from "../stores/system";

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

// Request timeout in milliseconds (8 seconds)
const REQUEST_TIMEOUT_MS = 8000;

// ============================================
// AI PROMPTS
// ============================================

/**
 * Prompt for analyzing chat messages to extract user intent
 * Used in: analyzeChat()
 */
const PROMPT_CHAT_ANALYSIS = (text) => `
Role: You are an AI assistant for a Thai live commerce clothing shop (Manowzab). 
Your task is to extract the user's intent from their chat message.

Key Entities:
- **Product ID**: Usually a number (e.g., 1, 15, 99) or starts with F/CF (e.g., F1, CF10).
- **Price**: A number usually followed by "บาท" or appearing after the ID (e.g., 10=100).

Intents:
1. **buy**: User wants to purchase an item.
   - Pattern: "[ID]", "F[ID]", "CF[ID]", "รับ [ID]", "[ID] [Name]", "[ID]=[Price]".
   - CRITICAL EXCEPTION: If the message contains specific question words (เท่าไหร่, ไหม, หรอ, หรือ, ไง) OR specific attribute words (อก, เอว, ยาว, สี, ผ้า, ตำหนิ) appearing alongside a number, it is ALWAYS a "question", NOT a "buy".

2. **cancel**: User wants to cancel an order.
   - Pattern: "CC", "cancel", "ยกเลิก", "ไม่เอา".

3. **question**: User is asking about product details.
   - Keywords: อก, เอว, ยาว, ผ้า, ราคา, สี, ว่างไหม, ทันไหม, เท่าไหร่, กี่บาท, แบบไหน, ดู, ตำหนิ.

4. **shipping**: User wants to ship items.
   - Keywords: "พร้อมส่ง", "สรุปยอด", "ส่งของ", "คิดเงิน".

5. **spam**: Greetings, chit-chat.

Response Format (JSON only):
{"intent": "buy"|"cancel"|"question"|"shipping"|"spam", "id": number|null, "price": number|null}

Input Message: "${text}"
`;

/**
 * Prompt for extracting product ID and price from natural Thai voice input
 * Fine-tuned for Manowzab Shop (V4.5 - Based on actual live captions)
 * Used in: extractPriceFromVoice()
 */
const PROMPT_VOICE_EXTRACTION = (text, contextId = null) => `
Role: You are a smart Thai voice commerce assistant for "Manowzab Shop" (Second-hand clothing live stream).
Your task is to extract **Product ID**, **Price**, and **Size** from the transcriber output, which often contains errors and glued numbers.

Current Context:
${contextId ? `- **FOCUSED ITEM ID**: ${contextId} (Use this if user says price/size without a new ID)` : "- No active item context."}

**Specific Logic for Manowzab Shop:**
1. **GLUED NUMBERS (CRITICAL)**: The speaker speaks fast, causing ID and Price to merge.
   - If you see a 3-4 digit number ending in **30, 50, 60, 80**, SPLIT IT.
   - Examples:
     - "1180" -> ID: 11, Price: 80
     - "2180" -> ID: 21, Price: 80
     - "3950" -> ID: 39, Price: 50
     - "4960" -> ID: 49, Price: 60
     - "3830" -> ID: 38, Price: 30
   - *Exception*: "100" is usually just Price 100.

2. **Sequence Rule**: If two distinct numbers appear near each other, the **First is ID**, **Second is Price**.
   - "21 80 บาท" -> ID: 21, Price: 80
   - "46 50" -> ID: 46, Price: 50

3. **Ignore Noise & Hallucinations**:
   - IGNORE these misheard words: "poโพิเตอร์", "poat", "poor", "โพลิเลอเตอร์", "คุณแม่", "พี่", "ส่งสติ๊กเกอร์", "สวย".
   - IGNORE "รหัส" or "รายการที่" if they just precede a number (just take the number).

4. **Size Ranges**:
   - Patterns like "54 56", "54 ได้ 56 ได้" -> Size: "อก 54-56"
   - "อก 40 ยาว 28" -> Size: "อก 40 ยาว 28"

5. **Self-Correction**:
   - If the user repeats a number for the same category, use the **last mentioned** value.
   - "47 ราคา 5 ราคา 60 บาท" -> ID: 47, Price: 60 (Ignore 5).

6. **Price Defaults**:
   - Common prices in this shop are **30, 50, 60, 80, 100**. If a number matches these and appears after an ID, it is 99% the Price.

Response Format (JSON only):
{"id": number|string|null, "price": number|null, "size": string|null}

Input Message: "${text}"
`;

// ============================================
// REACTIVE STATE
// ============================================

// Reactive AI Logs Array
export const aiLogs = ref([]);

export function useOllama() {
  const modelName = ref("scb10x/llama3.2-typhoon2-3b-instruct");
  const systemStore = useSystemStore();

  async function checkConnection() {
    // Set status to 'warn' (connecting) before fetch
    systemStore.statusOllama = "warn";

    try {
      const response = await fetch("http://localhost:11434/api/tags");

      if (!response.ok) {
        console.log(
          "%c❌ Ollama Disconnected",
          "color: #ff5252; font-weight: bold; font-size: 14px;",
        );
        console.error("Error details:", {
          status: response.status,
          statusText: response.statusText,
        });
        systemStore.statusOllama = "err";
        return false;
      }

      const data = await response.json();

      console.log(
        "%c✅ Ollama Connected",
        "color: #00e676; font-weight: bold; font-size: 14px;",
      );
      console.log("Available models:", data.models || []);

      systemStore.statusOllama = "ok";
      return true;
    } catch (error) {
      console.log(
        "%c❌ Ollama Disconnected",
        "color: #ff5252; font-weight: bold; font-size: 14px;",
      );
      console.warn("⚠️ Ollama not detected (Optional feature disabled).");
      systemStore.statusOllama = "err";
      return false;
    }
  }

  async function analyzeChat(text) {
    // Set status to 'working' at the start
    systemStore.statusOllama = "working";

    // Start tracking execution time
    const startTime = performance.now();

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName.value,
          prompt: PROMPT_CHAT_ANALYSIS(text),
          format: "json",
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "Ollama API Error:",
          response.status,
          response.statusText,
        );
        systemStore.statusOllama = "err";
        return null;
      }

      const result = await response.json();

      // Ollama returns the generated text in `response.response`
      const generatedText = result.response;

      if (!generatedText) {
        console.error("No response from Ollama");
        systemStore.statusOllama = "err";
        return null;
      }

      // Parse JSON from the response
      const match = generatedText.match(/\{.*?\}/s);
      const parsedResult = match ? JSON.parse(match[0]) : null;

      // Set status to 'ok' after successful response
      systemStore.statusOllama = "ok";

      // Calculate duration and log
      const duration = performance.now() - startTime;
      aiLogs.value.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: text,
        output: parsedResult,
        duration: Math.round(duration),
        status: "success",
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      return parsedResult;
    } catch (e) {
      clearTimeout(timeoutId);

      // Check if error is due to timeout
      const isTimeout = e.name === "AbortError";
      const errorMessage = isTimeout ? "Request timed out" : e.message;

      console.error(
        isTimeout ? "Ollama Timeout:" : "Ollama Error:",
        errorMessage,
      );

      // Set status to 'err' on error
      systemStore.statusOllama = "err";

      // Log error
      const duration = performance.now() - startTime;
      aiLogs.value.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: text,
        output: null,
        duration: Math.round(duration),
        status: "error",
        error: errorMessage,
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      // Re-throw timeout error for caller to handle
      if (isTimeout) {
        throw new Error("Request timed out");
      }

      return null;
    }
  }

  async function extractPriceFromVoice(text, contextId = null) {
    // Set status to 'working' at the start
    systemStore.statusOllama = "working";

    // Start tracking execution time
    const startTime = performance.now();

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName.value,
          prompt: PROMPT_VOICE_EXTRACTION(text, contextId),
          format: "json",
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(
          "Ollama API Error:",
          response.status,
          response.statusText,
        );
        systemStore.statusOllama = "err";
        return null;
      }

      const result = await response.json();
      const generatedText = result.response;

      if (!generatedText) {
        console.error("No response from Ollama");
        return null;
      }

      // Parse JSON from the response
      const match = generatedText.match(/\{.*?\}/s);
      const parsedResult = match ? JSON.parse(match[0]) : null;

      // Set status to 'ok' after successful response
      systemStore.statusOllama = "ok";

      // Calculate duration and log
      const duration = performance.now() - startTime;
      aiLogs.value.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: text,
        output: parsedResult,
        duration: Math.round(duration),
        status: "success",
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      return parsedResult;
    } catch (e) {
      clearTimeout(timeoutId);

      // Check if error is due to timeout
      const isTimeout = e.name === "AbortError";
      const errorMessage = isTimeout ? "Request timed out" : e.message;

      console.error(
        isTimeout
          ? "Ollama Voice Timeout:"
          : "Ollama extractPriceFromVoice Error:",
        errorMessage,
      );

      // Set status to 'err' on error
      systemStore.statusOllama = "err";

      // Log error
      const duration = performance.now() - startTime;
      aiLogs.value.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: text,
        output: null,
        duration: Math.round(duration),
        status: "error",
        error: errorMessage,
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      // Re-throw timeout error for caller to handle
      if (isTimeout) {
        throw new Error("Request timed out");
      }

      return null;
    }
  }

  return { modelName, analyzeChat, checkConnection, extractPriceFromVoice };
}

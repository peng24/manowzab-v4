import { ref } from "vue";
import { useSystemStore } from "../stores/system";

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
      console.error("Error details:", error);
      systemStore.statusOllama = "err";
      return false;
    }
  }

  async function analyzeChat(text) {
    // Set status to 'working' at the start
    systemStore.statusOllama = "working";

    // Start tracking execution time
    const startTime = performance.now();

    const prompt = `
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

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName.value,
          prompt: prompt,
          format: "json",
          stream: false,
        }),
      });

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
      console.error("Ollama Error:", e);
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
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      return null;
    }
  }

  async function extractPriceFromVoice(text) {
    // Start tracking execution time
    const startTime = performance.now();

    const prompt = `
Role: You are a Thai voice commerce assistant for a live clothing shop (Manowzab). 
Your task is to extract product ID and price from natural Thai speech.

Key Patterns:
- **Product ID**: Can be a number (e.g., 53, 680), alphanumeric (e.g., A1, CF10), or words like "ตัวนี้", "รายการนี้"
- **Price**: Numbers followed by "บาท", Thai number words (e.g., "ร้อยเดียว" = 100, "แปดสิบ" = 80, "ห้าร้อย" = 500), or standalone numbers near price keywords

Important Rules:
1. IGNORE measurements like "อก 52", "ยาว 40" (these are size attributes, not prices)
2. IGNORE color/fabric words like "สีดำ", "ผ้าเด้ง"
3. If you see "รายการที่ X" or "เบอร์ X" or "รหัส X", extract X as the ID
4. For "ตัวนี้" without a number, return id as "current" (means current/selected item)
5. Thai number words: "ร้อยเดียว"=100, "สองร้อย"=200, "แปดสิบ"=80, "เจ็ดสิบ"=70, etc.

Response Format (JSON only):
{"id": number|string|null, "price": number|null}

Examples:
- "ตัวนี้ ร้อยเดียว" → {"id": "current", "price": 100}
- "รายการที่ 53 แปดสิบบาท" → {"id": 53, "price": 80}
- "รหัส A1 ห้าร้อย" → {"id": "A1", "price": 500}
- "680" → {"id": 6, "price": 80} (implicit glued format)

Input Message: "${text}"
`;

    try {
      const response = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelName.value,
          prompt: prompt,
          format: "json",
          stream: false,
        }),
      });

      if (!response.ok) {
        console.error(
          "Ollama API Error:",
          response.status,
          response.statusText,
        );
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
      console.error("Ollama extractPriceFromVoice Error:", e);

      // Log error
      const duration = performance.now() - startTime;
      aiLogs.value.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        input: text,
        output: null,
        duration: Math.round(duration),
        status: "error",
      });

      // Keep only latest 20 logs
      if (aiLogs.value.length > 20) {
        aiLogs.value.pop();
      }

      return null;
    }
  }

  return { modelName, analyzeChat, checkConnection, extractPriceFromVoice };
}

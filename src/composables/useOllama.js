import { ref } from "vue";
import { useSystemStore } from "../stores/system";

export function useOllama() {
  const modelName = ref("scb10x/llama3.2-typhoon2-3b-instruct");
  const systemStore = useSystemStore();

  async function analyzeChat(text) {
    // Set status to 'working' at the start
    systemStore.statusOllama = "working";

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
        console.error("Ollama API Error:", response.status, response.statusText);
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
      
      return parsedResult;
    } catch (e) {
      console.error("Ollama Error:", e);
      // Set status to 'err' on error
      systemStore.statusOllama = "err";
      return null;
    }
  }

  return { modelName, analyzeChat };
}


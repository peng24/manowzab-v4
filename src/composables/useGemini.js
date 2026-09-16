import { ref } from "vue";

/**
 * useGemini — Composable สำหรับจัดการ Gemini API Key ของผู้ใช้
 *
 * API key ถูกเก็บใน localStorage (ฝั่ง client เท่านั้น)
 * ใช้สำหรับฟีเจอร์ที่เรียก Gemini API โดยตรงจากเบราว์เซอร์
 *
 * ⚠️  หมายเหตุ: ห้ามส่ง API key นี้ไปยัง Firebase หรือ backend ใดๆ
 *
 * @returns {{ apiKey: import('vue').Ref<string>, setApiKey: (key: string) => void }}
 */
export function useGemini() {
  const apiKey = ref(localStorage.getItem("geminiApiKey") || "");

  function setApiKey(key) {
    apiKey.value = key;
    localStorage.setItem("geminiApiKey", key);
  }

  return { apiKey, setApiKey };
}

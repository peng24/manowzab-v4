import { ref } from "vue";

export function useGemini() {
  const apiKey = ref(localStorage.getItem("geminiApiKey") || "");

  function setApiKey(key) {
    apiKey.value = key;
    localStorage.setItem("geminiApiKey", key);
  }

  return { apiKey, setApiKey };
}

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import { globalErrorHandler } from "./utils/errorHandler";
import "./utils/iosAudioUnlock.js";

const app = createApp(App);
app.use(createPinia());

// Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

// ✅ Catch unhandled promise rejections (Firebase, fetch, etc.)
window.addEventListener("unhandledrejection", (event) => {
  console.warn("⚠️ Unhandled Promise Rejection:", event.reason);
  // Prevent the default browser error logging (optional — remove to keep both)
  // event.preventDefault();
});

console.log(
  "%c🚀 Booting Manowzab v4...",
  "color: #00e676; font-weight: bold; font-size: 14px;",
);
app.mount("#app");
console.log("%c✅ App initialized", "color: #00e676; font-weight: bold;");

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import { globalErrorHandler } from "./utils/errorHandler";
import "./utils/iosAudioUnlock.js";
import { logger } from "./utils/logger";

const app = createApp(App);
app.use(createPinia());

// Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

// ✅ Catch unhandled promise rejections (Firebase, fetch, etc.)
window.addEventListener("unhandledrejection", (event) => {
  logger.warn("Unhandled Promise Rejection:", event.reason);
  // Prevent the default browser error logging (optional — remove to keep both)
  // event.preventDefault();
});

logger.system("Booting Manowzab v4...");
app.mount("#app");
logger.system("App initialized");

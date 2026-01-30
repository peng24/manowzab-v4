import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import { globalErrorHandler } from "./utils/errorHandler";

const app = createApp(App);
app.use(createPinia());

// Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

console.log("%c🚀 Booting Manowzab v4...", "color: #00e676; font-weight: bold; font-size: 14px;");
app.mount("#app");
console.log("%c✅ App initialized", "color: #00e676; font-weight: bold;");

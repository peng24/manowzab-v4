import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import { globalErrorHandler } from "./utils/errorHandler";

const app = createApp(App);
app.use(createPinia());

// Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

app.mount("#app");

console.log("✅ App initialized");

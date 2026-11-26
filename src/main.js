import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import "lenis/dist/lenis.css";
import { vSmoothScroll } from "./composables/useSmoothScroll";
import { globalErrorHandler } from "./utils/errorHandler";
import { logger } from "./utils/logger";
import Swal from "sweetalert2";
import { configureSwal } from "./utils/swalConfig";

// ✅ Global SweetAlert2 Config (supports Swal.mixin({ toast: true }) in v11)
configureSwal(Swal);

const app = createApp(App);
app.use(createPinia());
app.directive("smooth-scroll", vSmoothScroll);

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

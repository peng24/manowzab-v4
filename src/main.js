import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./assets/style.css";
import { globalErrorHandler } from "./utils/errorHandler";
import { logger } from "./utils/logger";

import Swal from "sweetalert2";

// ✅ Global SweetAlert2 Config for Popups (Blur & Close Button)
const originalSwalFire = Swal.fire;
Swal.fire = function (...args) {
  let opts = args[0];
  
  // If arguments are passed as strings (e.g. Swal.fire("Title", "Message", "success"))
  if (typeof opts === "string") {
    opts = {
      title: args[0],
      html: args[1],
      icon: args[2]
    };
    args = [opts];
  }

  if (opts && typeof opts === "object" && !opts.toast) {
    if (opts.showCloseButton === undefined) opts.showCloseButton = true;
    if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
  }
  
  return originalSwalFire.apply(this, args);
};

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

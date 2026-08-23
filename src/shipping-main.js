import { createApp } from "vue";
import { createPinia } from "pinia";
import ShippingPage from "./pages/ShippingPage.vue";
import { globalErrorHandler } from "./utils/errorHandler";
import { logger } from "./utils/logger";

import Swal from "sweetalert2";

// ✅ Global SweetAlert2 Config (same as main app)
const originalSwalFire = Swal.fire;
Swal.fire = function (...args) {
  let opts = args[0];
  if (typeof opts === "string") {
    opts = { title: args[0], html: args[1], icon: args[2] };
    args = [opts];
  }
  const isToast = opts && (opts.toast || (this && this.defaultParams && this.defaultParams.toast));
  if (opts && typeof opts === "object") {
    if (opts.heightAuto === undefined) opts.heightAuto = false;
    if (opts.returnFocus === undefined) opts.returnFocus = false;
    if (!isToast) {
      if (opts.showCloseButton === undefined) opts.showCloseButton = true;
      if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
    }
  }
  return originalSwalFire.apply(this, args);
};

const app = createApp(ShippingPage);
app.use(createPinia());

// ✅ Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

window.addEventListener("unhandledrejection", (event) => {
  logger.warn("Unhandled Promise Rejection (Shipping):", event.reason);
});
app.mount("#shipping-app");

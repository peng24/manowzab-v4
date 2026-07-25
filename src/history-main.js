import { createApp } from "vue";
import { createPinia } from "pinia";
import HistoryPage from "./pages/HistoryPage.vue";

import Swal from "sweetalert2";

// ✅ Global SweetAlert2 Config
const originalSwalFire = Swal.fire;
Swal.fire = function (...args) {
  let opts = args[0];
  if (typeof opts === "string") {
    opts = { title: args[0], html: args[1], icon: args[2] };
    args = [opts];
  }
  const isToast = opts && (opts.toast || (this && this.defaultParams && this.defaultParams.toast));
  if (opts && typeof opts === "object" && !isToast) {
    if (opts.showCloseButton === undefined) opts.showCloseButton = true;
    if (opts.allowOutsideClick === undefined) opts.allowOutsideClick = true;
  }
  return originalSwalFire.apply(this, args);
};

const app = createApp(HistoryPage);
app.use(createPinia());
app.mount("#history-app");

import { createApp } from "vue";
import { createPinia } from "pinia";
import AddressPage from "./pages/AddressPage.vue";
import { globalErrorHandler } from "./utils/errorHandler";
import { logger } from "./utils/logger";
import Swal from "sweetalert2";
import { configureSwal } from "./utils/swalConfig";

// ✅ Global SweetAlert2 Config (supports Swal.mixin({ toast: true }) in v11)
configureSwal(Swal);

const app = createApp(AddressPage);
app.use(createPinia());

// ✅ Register Global Error Handler
app.config.errorHandler = globalErrorHandler;

window.addEventListener("unhandledrejection", (event) => {
  logger.warn("Unhandled Promise Rejection (Address):", event.reason);
});

app.mount("#address-app");

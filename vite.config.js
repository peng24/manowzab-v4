import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue(),
    // ❌ เอา VitePWA ออกชั่วคราว (ไว้มีรูปครบค่อยมาเติมครับ)
  ],

  // ✅ ตั้งค่า Base URL สำหรับ GitHub Pages
  base: "/manowzab-v4/",

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    host: true,
  },
});

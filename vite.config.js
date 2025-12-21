import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],

  // ❌ ลบบรรทัด base: "..." ทิ้งไปเลยครับ ไม่ต้องใส่ตรงนี้แล้ว
  // base: "/manowzab-v4/",  <-- ลบออก

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    host: true,
  },
});

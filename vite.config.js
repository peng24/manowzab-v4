import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/manowzab-v4/", // เปลี่ยนเป็นชื่อ repo ของคุณ
});

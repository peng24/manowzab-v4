import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Manowzab Command Center V4",
        short_name: "Manowzab V4",
        description: "ระบบจัดการการขายสดผ่าน YouTube Live",
        theme_color: "#ffffff",
        start_url: "./", // สำคัญมากสำหรับ GitHub Pages หรือ Sub-path
        display: "standalone", // ให้เปิดแบบเต็มจอไม่มี URL bar
        background_color: "#ffffff",
        icons: [
          {
            src: "pwa-192x192.png", // เดี๋ยวเราต้องหารูปมาใส่นะคะ
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  base: "/manowzab-v4/",

  server: {
    host: true, // หรือใส่เป็น '0.0.0.0' ก็ได้ครับ เพื่อเปิดให้เครื่องอื่น connect ได้
  },
});

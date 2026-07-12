import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { spawn } from "node:child_process";

// Keep active Python transcriber process reference
let pythonProcess = null;

// Custom Vite plugin to launch local transcriber script via Web HTTP API
function transcriberPlugin() {
  return {
    name: "transcriber-api",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/api/transcriber/start") {
          res.setHeader("Content-Type", "application/json");
          if (pythonProcess) {
            res.end(JSON.stringify({ status: "running", message: "ตัวถอดเสียง Python กำลังทำงานอยู่ก่อนแล้ว" }));
            return;
          }

          // Spawn python script in background
          pythonProcess = spawn("python", ["yt_transcriber.py"], {
            stdio: "inherit",
            shell: true,
          });

          pythonProcess.on("close", (code) => {
            console.log(`[Vite Server] Python transcriber process exited with code ${code}`);
            pythonProcess = null;
          });

          res.end(JSON.stringify({ status: "running", message: "เปิดรันสคริปต์ yt_transcriber.py สำเร็จ" }));
        } else if (req.url === "/api/transcriber/stop") {
          res.setHeader("Content-Type", "application/json");
          if (pythonProcess) {
            if (process.platform === "win32") {
              // Kill process tree on Windows to ensure ffmpeg shuts down cleanly
              spawn("taskkill", ["/pid", pythonProcess.pid, "/f", "/t"]);
            } else {
              pythonProcess.kill("SIGINT");
            }
            pythonProcess = null;
            res.end(JSON.stringify({ status: "idle", message: "ปิดการทำงานของตัวถอดเสียง Python แล้ว" }));
          } else {
            res.end(JSON.stringify({ status: "idle", message: "ตัวถอดเสียงไม่ได้เปิดทำงานอยู่" }));
          }
        } else if (req.url === "/api/transcriber/status") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            status: pythonProcess ? "running" : "idle",
            message: pythonProcess ? "ตัวถอดเสียง Python กำลังทำงาน" : "ตัวถอดเสียง Python ปิดอยู่"
          }));
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    transcriberPlugin(),
    VitePWA({
      registerType: "prompt", // Changed from autoUpdate to prompt to allow user control
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Manowzab Command Center",
        short_name: "Manowzab",
        description: "ระบบจัดการหลังบ้าน Manowzab",
        theme_color: "#121212",
        background_color: "#0f172a",
        display: "standalone",
        icons: [
          {
            src: "pwa-192x192.png",
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
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // API Calls to Google (YouTube Data API, etc.)
            urlPattern: ({ url }) => url.href.includes('googleapis.com'),
            handler: "NetworkFirst",
            options: {
              cacheName: "google-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  server: {
    host: true,
  },

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        shipping: resolve(__dirname, 'shipping/index.html'),
        preview: resolve(__dirname, 'preview/index.html'),
      },
    },
  },
});

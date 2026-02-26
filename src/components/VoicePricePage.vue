<template>
  <div class="voice-price-page">
    <!-- Header -->
    <header class="header-bar">
      <div class="left-info">
        <h1 class="page-title">🎙️ ตรวจเสียงราคา</h1>
        <div class="header-badges">
          <span class="badge" :class="{ connected: isDbConnected }">
            {{ isDbConnected ? "ONLINE" : "OFFLINE" }}
          </span>
          <span class="badge version">{{ systemStore.version }}</span>
        </div>
      </div>

      <div class="center-controls">
        <!-- Auto Agent Mode Toggle -->
        <div
          class="agent-toggle"
          :class="{
            active: isAutoAgentEnabled,
            processing: isAutoAgentProcessing,
          }"
          @click="isAutoAgentEnabled = !isAutoAgentEnabled"
        >
          <i class="fa-solid fa-robot"></i>
          <span>Auto Agent</span>
          <div class="toggle-dot" :class="{ on: isAutoAgentEnabled }"></div>
        </div>
      </div>

      <div class="right-info">
        <div class="clock">{{ currentTime }}</div>
      </div>
    </header>

    <main class="main-content">
      <!-- Result Card -->
      <div class="result-card" :class="{ flash: isFlashing }">
        <div class="card-grid">
          <div class="col-item id-col">
            <div class="label">รายการที่</div>
            <div class="value" :class="{ 'has-data': resultData.id }">
              {{ resultData.id || "—" }}
            </div>
          </div>
          <div class="col-item size-col">
            <div class="label">ไซส์</div>
            <div class="value" :class="{ 'has-data': resultData.size }">
              {{ resultData.size || "—" }}
            </div>
          </div>
          <div class="col-item price-col">
            <div class="label">ราคา</div>
            <div class="value" :class="{ 'has-data': resultData.price }">
              {{ resultData.price ? `฿${resultData.price}` : "—" }}
            </div>
          </div>
        </div>
      </div>

      <!-- Visualizer & Mic Area -->
      <div class="visualizer-area">
        <canvas ref="canvasRef" class="wave-canvas"></canvas>

        <div class="mic-zone">
          <!-- Auto Agent Status -->
          <transition name="fade">
            <div class="auto-agent-bar" v-if="isAutoAgentEnabled">
              <span
                class="agent-text"
                :class="{ pulsing: isAutoAgentProcessing }"
              >
                {{ autoAgentStatus }}
              </span>
            </div>
          </transition>

          <!-- Transcript / Status -->
          <div class="hearing-status" v-if="!isAutoAgentEnabled">
            <div class="log-transcript">"{{ transcript || "..." }}"</div>
            <div
              class="log-status"
              :class="{
                error:
                  lastAction &&
                  (lastAction.startsWith('⚠️') || lastAction.startsWith('🗑️')),
                success: lastAction && lastAction.startsWith('✅'),
              }"
            >
              {{ lastAction || "รอคำสั่ง..." }}
            </div>
          </div>

          <!-- Mic Button -->
          <button
            class="mic-btn"
            :class="{
              active: isListening,
              'agent-active': isAutoAgentEnabled && isListening,
            }"
            @click="toggleMic"
          >
            <span class="mic-ripple" v-if="isListening"></span>
            <span class="mic-ripple delay" v-if="isListening"></span>
            <i class="fa-solid fa-microphone"></i>
          </button>
          <div class="mic-label">
            {{
              isAutoAgentEnabled
                ? isListening
                  ? "Agent กำลังฟัง..."
                  : "แตะเพื่อหยุด Agent"
                : isListening
                  ? "กำลังฟัง..."
                  : "แตะเพื่อเริ่ม"
            }}
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useSystemStore } from "../stores/system";
import { useVoiceDetector } from "../composables/useVoiceDetector";
import { useVoiceLogger } from "../composables/useVoiceLogger";
import { useFirebase } from "../composables/useFirebase";
import { ref as dbRef, onValue } from "firebase/database";

const systemStore = useSystemStore();
const {
  isListening,
  transcript,
  lastAction,
  toggleMic,
  isAutoAgentEnabled,
  autoAgentStatus,
  isAutoAgentProcessing,
} = useVoiceDetector();
const { downloadLogs } = useVoiceLogger();
const isDbConnected = ref(false);

const currentTime = ref("");
let timer;
let wakeLock = null;

// UI State
const resultData = ref({ id: null, price: null, size: null });
const isFlashing = ref(false);

// Visualizer State
const canvasRef = ref(null);
let animationId = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let source = null;
let phase = 0;

// Watch lastAction
watch(lastAction, (newVal) => {
  if (newVal && newVal.startsWith("✅")) {
    let id = null;
    let price = null;
    let size = null;

    const idMatch = newVal.match(/(?:#|รายการที่|รหัส)\s*(\d+)/);
    if (idMatch) {
      id = idMatch[1];
    }

    const parts = newVal
      .split("|")
      .slice(1)
      .map((p) => p.trim());

    parts.forEach((part) => {
      if (part.endsWith(".-")) {
        price = part.replace(".-", "").trim();
      } else {
        size = part;
      }
    });

    if (id) {
      resultData.value = { id, price, size };
      isFlashing.value = true;
      setTimeout(() => (isFlashing.value = false), 600);
    }
  }
});

// Watch Listening State for visualizer
watch(isListening, (listening) => {
  if (listening) {
    startVisualizer();
  } else {
    stopVisualizer();
  }
});

// --- Visualizer Logic ---
async function startVisualizer() {
  if (animationId) return;
  if (!canvasRef.value) return;

  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    resizeCanvas();
    loop();
  } catch (err) {
    console.error("Visualizer Error:", err);
  }
}

function stopVisualizer() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (source) {
    source.disconnect();
    source.mediaStream.getTracks().forEach((track) => track.stop());
    source = null;
  }
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  }
}

function drawWave(ctx, width, height, color, offset, frequency, amplitude) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (let i = 0; i < width; i++) {
    const x = i;
    const y =
      height / 2 +
      Math.sin(i * frequency + phase + offset) *
        amplitude *
        Math.sin((i / width) * Math.PI);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function loop() {
  if (!canvasRef.value || !analyser) return;
  const canvas = canvasRef.value;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  const dataLength = dataArray.length;
  for (let i = 0; i < dataLength; i++) {
    sum += dataArray[i];
  }
  const average = sum / dataLength;

  const baseAmplitude = 5;
  const dynamicAmplitude = (average / 255) * 100;
  const amplitude = baseAmplitude + dynamicAmplitude;

  ctx.clearRect(0, 0, width, height);

  // Wave 1: Cyan
  drawWave(ctx, width, height, "rgba(34, 211, 238, 0.6)", 0, 0.01, amplitude);
  // Wave 2: Violet
  drawWave(
    ctx,
    width,
    height,
    "rgba(167, 139, 250, 0.5)",
    2,
    0.015,
    amplitude * 0.9,
  );
  // Wave 3: Emerald
  drawWave(
    ctx,
    width,
    height,
    "rgba(52, 211, 153, 0.5)",
    4,
    0.008,
    amplitude * 0.8,
  );

  phase += 0.04;
  animationId = requestAnimationFrame(loop);
}

function resizeCanvas() {
  if (canvasRef.value) {
    const parent = canvasRef.value.parentElement;
    canvasRef.value.width = parent.clientWidth * window.devicePixelRatio;
    canvasRef.value.height = parent.clientHeight * window.devicePixelRatio;
  }
}

// --- Wake Lock & Time ---
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch (err) {
    console.error(`WakeLock: ${err.name}`);
  }
}
async function handleVisibilityChange() {
  if (wakeLock !== null && document.visibilityState === "visible") {
    await requestWakeLock();
  }
}
function updateTime() {
  currentTime.value = new Date().toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);
  requestWakeLock();
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("resize", resizeCanvas);

  nextTick(() => {
    resizeCanvas();
  });

  const connectedRef = dbRef(useFirebase().db, ".info/connected");
  onValue(connectedRef, (snap) => (isDbConnected.value = snap.val() === true));
});

onUnmounted(() => {
  stopVisualizer();
  if (audioContext) {
    audioContext.close();
  }
  clearInterval(timer);
  if (wakeLock !== null) wakeLock.release().then(() => (wakeLock = null));
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("resize", resizeCanvas);
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap");

/* ===== Page Root ===== */
.voice-price-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: radial-gradient(ellipse at 20% 50%, #0c1222 0%, #000000 70%);
  color: #fff;
  font-family: "Outfit", sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 99999;
}

/* ===== Header ===== */
.header-bar {
  padding: 16px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.left-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-title {
  font-size: 1.1rem;
  font-weight: 500;
  opacity: 0.7;
  margin: 0;
  letter-spacing: 0.5px;
}

.header-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge {
  font-size: 0.65rem;
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.35);
  border-radius: 99px;
  font-weight: 700;
  letter-spacing: 1.5px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.badge.connected {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.25);
}

.badge.version {
  color: rgba(255, 255, 255, 0.3);
}

/* Center Controls */
.center-controls {
  display: flex;
  align-items: center;
}

.agent-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.5);
  user-select: none;
}

.agent-toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.agent-toggle.active {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.3);
  color: #34d399;
}

.agent-toggle.active.processing {
  border-color: rgba(52, 211, 153, 0.5);
  box-shadow: 0 0 20px rgba(52, 211, 153, 0.15);
}

.agent-toggle i {
  font-size: 1rem;
}

.toggle-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.toggle-dot.on {
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
}

/* Clock */
.clock {
  font-size: 2rem;
  font-weight: 300;
  opacity: 0.6;
  letter-spacing: 2px;
}

/* ===== Main Content ===== */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 30px;
  padding: 20px 24px;
  position: relative;
}

/* ===== Result Card ===== */
.result-card {
  width: 100%;
  max-width: 800px;
  padding: 32px 40px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 10;
}

.result-card.flash {
  background: rgba(52, 211, 153, 0.08);
  border-color: rgba(52, 211, 153, 0.3);
  transform: scale(1.02);
  box-shadow: 0 0 60px rgba(52, 211, 153, 0.15);
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 20px;
  align-items: center;
  text-align: center;
}

.col-item .label {
  font-size: 0.7rem;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.2);
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 600;
}

.col-item .value {
  font-weight: 700;
  color: rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}

.col-item .value.has-data {
  color: #fff;
}

.id-col .value {
  font-size: 4.5rem;
  line-height: 1;
}

.id-col .value.has-data {
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.size-col .value {
  font-size: 2.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.size-col .value.has-data {
  color: #fbbf24;
}

.price-col .value {
  font-size: 3.5rem;
}

.price-col .value.has-data {
  color: #34d399;
}

/* ===== Visualizer Area ===== */
.visualizer-area {
  position: relative;
  width: 100%;
  height: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.wave-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: none;
  opacity: 0.8;
}

.mic-zone {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ===== Status ===== */
.hearing-status {
  text-align: center;
  margin-bottom: 8px;
}

.log-transcript {
  font-size: 1.1rem;
  font-weight: 300;
  font-style: italic;
  color: rgba(255, 255, 255, 0.5);
  min-height: 1.5em;
}

.log-status {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
}

.log-status.error {
  color: #f87171;
}

.log-status.success {
  color: #34d399;
}

/* Auto Agent Bar */
.auto-agent-bar {
  text-align: center;
  padding: 8px 20px;
  background: rgba(52, 211, 153, 0.06);
  border: 1px solid rgba(52, 211, 153, 0.15);
  border-radius: 16px;
  margin-bottom: 8px;
}

.agent-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: #34d399;
}

.pulsing {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 12px rgba(52, 211, 153, 0.5);
  }
  100% {
    opacity: 0.5;
  }
}

/* ===== Mic Button ===== */
.mic-btn {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: visible;
  z-index: 2;
}

.mic-btn:hover {
  transform: scale(1.05);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.mic-btn.active {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.5);
  color: #ef4444;
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.2);
}

.mic-btn.agent-active {
  background: rgba(52, 211, 153, 0.12);
  border-color: rgba(52, 211, 153, 0.4);
  color: #34d399;
  box-shadow: 0 0 30px rgba(52, 211, 153, 0.2);
}

/* Mic Ripple Effect */
.mic-ripple {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(239, 68, 68, 0.3);
  animation: ripple 2s infinite;
  pointer-events: none;
}

.mic-ripple.delay {
  animation-delay: 0.6s;
}

.agent-active .mic-ripple {
  border-color: rgba(52, 211, 153, 0.3);
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.mic-label {
  font-size: 0.8rem;
  letter-spacing: 1px;
  opacity: 0.35;
  font-weight: 400;
}

/* ===== Transitions ===== */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .header-bar {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 0.9rem;
  }

  .clock {
    font-size: 1.4rem;
  }

  .agent-toggle {
    padding: 8px 14px;
    font-size: 0.8rem;
    gap: 6px;
  }

  .result-card {
    padding: 20px;
  }

  .card-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .id-col .value {
    font-size: 3.5rem;
  }

  .size-col .value {
    font-size: 2rem;
  }

  .price-col .value {
    font-size: 2.5rem;
  }

  .visualizer-area {
    height: 220px;
  }

  .mic-btn {
    width: 76px;
    height: 76px;
    font-size: 1.7rem;
  }
}
</style>

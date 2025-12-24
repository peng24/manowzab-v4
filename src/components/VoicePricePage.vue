<template>
  <div class="voice-price-page">
    <header class="header-bar">
      <div class="left-info">
        <h1 class="page-title">🎙️ ตรวจเสียงราคา (Voice Price Detector)</h1>
        <div class="live-status">
            <span class="badge" :class="{ connected: isDbConnected }">
               {{ isDbConnected ? "ONLINE" : "OFFLINE" }}
            </span>
            <span class="video-id" v-if="systemStore.currentVideoId">
                ID: {{ systemStore.currentVideoId }}
            </span>
            <span class="live-title" v-if="systemStore.liveTitle">
                {{ systemStore.liveTitle }}
            </span>
        </div>
      </div>
      <div class="right-info">
        <div class="clock">{{ currentTime }}</div>
      </div>
    </header>

    <main class="main-content">
       
       <!-- Dashboard Card -->
       <div class="result-card glass-panel" :class="{ flash: isFlashing }">
          <div class="card-grid">
              
              <!-- Column 1: ITEM NO -->
              <div class="col-item id-col">
                  <div class="label">รายการที่</div>
                  <div class="value">{{ resultData.id || "-" }}</div>
              </div>

              <!-- Column 2: SIZE -->
              <div class="col-item size-col">
                  <div class="label">ไซส์</div>
                  <div class="value">{{ resultData.size || "-" }}</div>
              </div>

              <!-- Column 3: PRICE -->
              <div class="col-item price-col">
                  <div class="label">ราคา</div>
                  <div class="value">{{ resultData.price || "-" }}</div>
              </div>

          </div>
       </div>

       <!-- Visualizer & Mic Area -->
       <div class="visualizer-container">
          <canvas ref="canvasRef" class="wave-canvas"></canvas>
          
          <div class="mic-controls">
              <!-- Log / Hearing -->
              <div class="hearing-status">
                 <div class="log-transcript">"{{ transcript || "..." }}"</div>
                 <div class="log-status" :class="{ error: lastAction.startsWith('⚠️' || '🗑️') }">
                    {{ lastAction || "รอคำสั่ง..." }}
                 </div>
              </div>

              <!-- Mic Button -->
              <button 
                class="mic-btn" 
                :class="{ active: isListening }"
                @click="toggleMic"
              >
                <i class="fa-solid fa-microphone"></i>
              </button>
              <div class="mic-label">{{ isListening ? "กำลังฟัง..." : "แตะเพื่อเริ่ม" }}</div>
          </div>
       </div>

    </main>

    <footer class="cheat-sheet glass-panel">
       <div class="cheat-item">
          <i class="fa-solid fa-tag"></i> 
          <span>ตัวอย่าง: "รายการที่ 10 อก 44 ราคา 150"</span>
       </div>
       <div class="cheat-item">
          <i class="fa-solid fa-shirt"></i>
          <span>ไซส์: "อก/เอว/ยาว/ไซส์ + เลข"</span>
       </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useSystemStore } from '../stores/system';
import { useVoiceDetector } from '../composables/useVoiceDetector';
import { useFirebase } from '../composables/useFirebase';
import { ref as dbRef, onValue } from "firebase/database";

const systemStore = useSystemStore();
const { isListening, transcript, lastAction, toggleMic } = useVoiceDetector();
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

        // Extract ID: Matches "#50", "รายการที่ 50"
        const idMatch = newVal.match(/(?:#|รายการที่|รหัส)\s*(\d+)/);
        if (idMatch) {
            id = idMatch[1];
        }

        // Split by pipe to find Price (ending with .-) and Size (the rest)
        const parts = newVal.split("|").slice(1).map(p => p.trim());
        
        parts.forEach(part => {
            if (part.endsWith(".-")) {
                price = part.replace(".-", "").trim();
            } else {
                size = part;
            }
        });

        if (id) {
            resultData.value = {
                id: id,
                price: price,
                size: size
            };
            isFlashing.value = true;
            setTimeout(() => isFlashing.value = false, 500);
        }
    }
});

// Watch Listening State
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
        // 1. Init Audio Context & Stream
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Resume context if suspended
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Smaller FFT size for better performance suitable for simple waves
        source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        resizeCanvas();
        loop();
    } catch (err) {
        console.error("Visualizer Error:", err);
        // Fallback or handle error
    }
}

function stopVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    if (source) {
        source.disconnect();
        source.mediaStream.getTracks().forEach(track => track.stop()); // Stop the mic stream properly
        source = null;
    }

    // Use a decay effect or clear? Clear is cleaner.
    if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
}

function drawWave(ctx, width, height, color, offset, frequency, amplitude) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    // Smoother line join
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    for (let i = 0; i < width; i++) {
        const x = i;
        // Basic Sine Wave modulated by amplitude
        const y = height / 2 + Math.sin(i * frequency + phase + offset) * amplitude * Math.sin(i / width * Math.PI); 
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

function loop() {
    if (!canvasRef.value || !analyser) return;
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Get Audio Data
    analyser.getByteFrequencyData(dataArray);

    // Calculate Volume / Energy
    let sum = 0;
    // Focus on lower frequencies (first half of dataArray) for voice
    const dataLength = dataArray.length;
    for (let i = 0; i < dataLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataLength;
    
    // Smooth factor for less jittery waves
    // Map average (0-255) to reasonable amplitude (0-100)
    // Add a base idle amplitude so it's not perfectly flat when silent (user wants "real voice" but subtle idle is nice, or flat?)
    // User complaint: "too fast". We'll slow down phase speed.
    // User complaint: "run according to real voice".
    
    const baseAmplitude = 5; // Minimal movement
    const dynamicAmplitude = (average / 255) * 100; // Max 100px height
    const amplitude = baseAmplitude + dynamicAmplitude;

    ctx.clearRect(0, 0, width, height);

    // Speed: Slower than before (0.15 -> 0.05)
    // Frequency: Slight variance
    
    // Wave 1: Pink
    drawWave(ctx, width, height, "rgba(236, 72, 153, 0.6)", 0, 0.01, amplitude);
    // Wave 2: Blue
    drawWave(ctx, width, height, "rgba(59, 130, 246, 0.6)", 2, 0.015, amplitude * 0.9);
    // Wave 3: Green
    drawWave(ctx, width, height, "rgba(16, 185, 129, 0.6)", 4, 0.008, amplitude * 0.8);

    // Slower phase increment
    phase += 0.04; 
    
    animationId = requestAnimationFrame(loop);
}

function resizeCanvas() {
    if (canvasRef.value) {
        const parent = canvasRef.value.parentElement;
        canvasRef.value.width = parent.clientWidth * window.devicePixelRatio; 
        canvasRef.value.height = parent.clientHeight * window.devicePixelRatio;
        // Scale context? If we want high DPI we need to scale drawing ops or use width/height as coordinate space.
        // For simple waves pixel mapping is fine, just ensure density is high.
    }
}

// --- Wake Lock & Time ---
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
        }
    } catch (err) {
        console.error(`Status: ${err.name}`);
    }
}
async function handleVisibilityChange() {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
}
function updateTime() {
    currentTime.value = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
    updateTime();
    timer = setInterval(updateTime, 1000);
    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', resizeCanvas);

    // Initial Resize
    nextTick(() => {
        resizeCanvas();
    });

    const connectedRef = dbRef(useFirebase().db, ".info/connected");
    onValue(connectedRef, (snap) => isDbConnected.value = snap.val() === true);
});

onUnmounted(() => {
    stopVisualizer();
    if (audioContext) {
        audioContext.close();
    }
    clearInterval(timer);
    if (wakeLock !== null) wakeLock.release().then(() => wakeLock = null);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap');

.voice-price-page {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  /* Deep Dark Radial Gradient */
  background: radial-gradient(circle at center, #020617 0%, #000000 90%);
  color: #fff;
  font-family: 'Outfit', sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 99999;
}

.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.5);
}

/* Header */
.header-bar {
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.page-title { font-size: 1.25rem; font-weight: 500; opacity: 0.8; margin: 0; }
.live-status { margin-top: 8px; display: flex; gap: 10px; align-items: center; }
.badge { font-size: 0.75rem; padding: 4px 12px; background: #333; color: #888; border-radius: 99px; font-weight: 700; letter-spacing: 1px; }
.badge.connected { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid #10b981; }
.video-id { font-size: 0.9rem; font-family: monospace; color: #aaa; }
.live-title { font-size: 0.9rem; color: #fff; opacity: 0.8; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-left: 10px; border-left: 1px solid rgba(255,255,255,0.2); }
.clock { font-size: 2.5rem; font-weight: 300; opacity: 0.9; }

/* Main */
.main-content {
  flex: 1; display: flex; flex-direction: column;
  justify-content: center; align-items: center; gap: 30px; padding: 20px;
  position: relative; /* Context for visualizer */
}

/* Result Card */
.result-card {
  width: 100%; max-width: 900px; padding: 40px;
  transition: transform 0.2s, background 0.3s;
  z-index: 10; /* Above visualizer */
}
.result-card.flash {
    background: rgba(16, 185, 129, 0.15);
    transform: scale(1.02);
    box-shadow: 0 0 50px rgba(16, 185, 129, 0.3);
}
.card-grid { display: grid; grid-template-columns: 1fr 1.5fr 1fr; gap: 20px; align-items: center; text-align: center; }
.col-item .label { font-size: 0.85rem; letter-spacing: 2px; color: rgba(255,255,255,0.3); margin-bottom: 5px; text-transform: uppercase; }
.col-item .value { font-weight: 700; }
.id-col .value { font-size: 5rem; color: #fff; line-height: 1; }
.size-col .value { font-size: 3rem; color: #facc15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.price-col .value { font-size: 4rem; color: #10b981; }

/* Visualizer Container */
.visualizer-container {
    position: relative;
    width: 100%;
    height: 300px; /* Allocated space */
    display: flex;
    justify-content: center;
    align-items: center;
}
.wave-canvas {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 1;
    pointer-events: none;
}
.mic-controls {
    position: relative;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

/* Status & Mic */
.hearing-status { text-align: center; margin-bottom: 10px; }
.log-transcript { font-size: 1.2rem; font-weight: 300; font-style: italic; color: rgba(255,255,255,0.7); min-height: 1.5em; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
.log-status { font-size: 1rem; color: rgba(255,255,255,0.4); }
.log-status.error { color: #ef4444; }

.mic-btn {
  width: 100px; height: 100px; border-radius: 50%;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  color: #fff; font-size: 2.5rem; cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  display: flex; justify-content: center; align-items: center;
}
.mic-btn:hover { transform: scale(1.05); background: rgba(255,255,255,0.2); }
.mic-btn.active {
   background: rgba(239, 68, 68, 0.8); /* Solid red for active state */
   border-color: #ef4444; color: #fff;
   box-shadow: 0 0 40px rgba(239, 68, 68, 0.6);
}

.mic-label { font-size: 0.9rem; letter-spacing: 1px; opacity: 0.6; }

/* Footer */
.cheat-sheet { margin: 20px; padding: 15px; display: flex; justify-content: center; gap: 30px; z-index: 10; }
.cheat-item { display: flex; align-items: center; gap: 10px; font-size: 0.9rem; opacity: 0.7; }
.cheat-item i { color: #60a5fa; }

@media (max-width: 768px) {
  .result-card { padding: 20px; }
  .card-grid { grid-template-columns: 1fr; gap: 20px; }
  .id-col .value { font-size: 4rem; }
  .size-col .value { font-size: 2.5rem; }
  .cheat-sheet { flex-direction: column; gap: 10px; margin: 10px; }
  .visualizer-container { height: 250px; }
}
</style>

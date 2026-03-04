<template>
  <div class="header">
    <div class="header-controls">
      <div class="status-cluster">
        <span
          :class="['status-item', systemStore.statusDb]"
          :title="getStatusTitle('db')"
        >
          <i class="fa-solid fa-database"></i>
        </span>
        <span
          :class="['status-item', systemStore.statusApi]"
          :title="getStatusTitle('api')"
        >
          <i class="fa-brands fa-youtube"></i>
        </span>
        <span
          :class="['status-item', systemStore.statusChat]"
          :title="getStatusTitle('chat')"
        >
          <i class="fa-solid fa-comments"></i>
        </span>
        <span
          class="key-indicator"
          :title="`กำลังใช้ API Key #${systemStore.currentKeyIndex + 1}`"
        >
          <i class="fa-solid fa-key"></i> {{ systemStore.currentKeyIndex + 1 }}
        </span>
      </div>

      <button
        :class="[
          'btn',
          'btn-ai',
          systemStore.isAiCommander ? 'active' : 'inactive',
        ]"
        @click="toggleAI"
      >
        🤖 AI: {{ systemStore.isAiCommander ? "เปิด" : "ปิด" }}
      </button>

      <button class="btn btn-dark" @click="openHistory">🕒</button>

      <button
        :class="['btn', 'btn-shipping', shippingCount > 0 ? '' : 'empty']"
        @click="openDashboard"
      >
        🚚 ({{ shippingCount }})
      </button>

      <input
        type="text"
        v-model="videoId"
        class="input-id"
        placeholder="Video ID"
        @keyup.enter="toggleConnection"
      />

      <button
        :class="['btn', systemStore.isConnected ? 'btn-dark' : 'btn-primary']"
        @click="toggleConnection"
        :disabled="isConnecting"
      >
        {{
          systemStore.isConnected
            ? "DISCONNECT"
            : isConnecting
              ? "..."
              : "CONNECT"
        }}
      </button>

      <!-- TTS Toggle - Vibrant Blue Gradient (Fixed) -->
      <button
        :class="['btn', 'relative', 'border-0', 'text-white']"
        :style="{
          background: systemStore.useOnlineTts
            ? 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)' // Vivid Blue Gradient
            : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)', // Dark Gray
          boxShadow: systemStore.useOnlineTts
            ? '0 4px 15px rgba(0, 114, 255, 0.4)'
            : 'none',
        }"
        @click="toggleTtsMode"
        :title="
          systemStore.useOnlineTts
            ? `Google Cloud TTS - Key #${systemStore.activeKeyIndex} Active`
            : 'Native TTS (Offline)'
        "
      >
        <!-- Icon -->
        <i
          :class="[
            'text-lg drop-shadow-sm',
            systemStore.useOnlineTts
              ? 'fa-solid fa-cloud'
              : 'fa-solid fa-robot',
          ]"
        ></i>

        <!-- Key Index Number -->
        <span
          v-if="systemStore.useOnlineTts"
          class="ml-2 text-lg font-bold font-mono drop-shadow-sm"
        >
          {{ systemStore.activeKeyIndex }}
        </span>
      </button>

      <div class="dropdown" ref="dropdownRef">
        <button class="btn btn-sim" @click.stop="toggleDropdown">
          ⚡ Tools <i class="fa-solid fa-caret-down"></i>
        </button>

        <Teleport to="body">
          <div
            v-if="showDropdown"
            class="dropdown-content"
            :style="dropdownStyle"
            @click.stop
          >
            <a @click="downloadCSV" class="menu-csv">
              <i class="fa-solid fa-file-csv"></i> บันทึกแชท (CSV)
            </a>
            <a @click="testVoice" class="menu-voice">
              <i class="fa-solid fa-volume-high"></i> ทดสอบเสียง
            </a>
            <a @click="toggleFullScreen" class="menu-screen">
              <i class="fa-solid fa-expand"></i> เต็มจอ (iPad)
            </a>
            <a @click="toggleAwayMode" class="menu-away">
              <i class="fa-solid fa-moon"></i> โหมดพาลูกนอน
            </a>
            <a @click="toggleSimulation" class="menu-sim">
              <i
                :class="isSimulating ? 'fa-solid fa-stop' : 'fa-solid fa-bolt'"
              ></i>
              {{ isSimulating ? "หยุดจำลอง" : "เริ่มจำลองแชท" }}
            </a>
            <a @click="askAiKey" class="menu-key">
              <i class="fa-solid fa-key"></i> ตั้งค่า API Key
            </a>

            <a @click="openOverlayPage" class="menu-overlay">
              <i class="fa-solid fa-layer-group"></i> เปิดหน้าจอ Overlay (OBS)
            </a>
            <a @click="forceUpdate" class="menu-update">
              <i class="fa-solid fa-rotate"></i> บังคับอัปเดต
            </a>
          </div>
        </Teleport>
      </div>
    </div>

    <div class="header-info">
      <div
        :class="['status-dot', systemStore.isConnected ? 'online' : '']"
      ></div>
      <div class="live-viewers">
        👁️ {{ systemStore.viewerCount.toLocaleString() }}
      </div>
      <div class="live-title">{{ systemStore.liveTitle }}</div>

      <div
        class="version-badge"
        :title="getVersionTooltip()"
        @click="showChangelog"
        style="cursor: pointer"
      >
        {{ systemStore.version }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, onBeforeUnmount, watch } from "vue"; // ✅ เพิ่ม watch
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useYouTube } from "../composables/useYouTube";
import { useGemini } from "../composables/useGemini";

import { useAudio } from "../composables/useAudio";
import { ref as dbRef, onValue, update, set } from "firebase/database";
import { db } from "../composables/useFirebase"; // เช็ค path ให้ตรงกับเครื่องคุณ
import Swal from "sweetalert2";

// Logger Configuration (คงเดิม)
const DEBUG_MODE = false;
const logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};

const systemStore = useSystemStore();
const chatStore = useChatStore();
const stockStore = useStockStore();
const { connectVideo, disconnect } = useYouTube();
const { setApiKey } = useGemini();

const { queueAudio, unlockAudio } = useAudio();

const openDashboard = inject("openDashboard");
const openHistory = inject("openHistory");

const videoId = ref("");
const showDropdown = ref(false);
const isSimulating = ref(false);
const isConnecting = ref(false);
const shippingData = ref({});
const dropdownRef = ref(null);
const dropdownStyle = ref({});
let simIntervalId = null;

// ✅ Watcher: ซิงค์รหัส Video ID จาก Firebase (ถ้าเครื่องอื่นเปลี่ยน เครื่องนี้เปลี่ยนด้วย)
watch(
  () => systemStore.currentVideoId,
  (newVal) => {
    if (newVal && newVal !== "demo" && newVal !== videoId.value) {
      videoId.value = newVal;
      logger.log("🔄 Synced Video ID:", newVal);
    }
  },
);

// คำนวณ Shipping Count (คงเดิม)
const shippingCount = computed(() => {
  const currentShipping = shippingData.value[systemStore.currentVideoId] || {};
  const activeBuyerUids = new Set();
  Object.keys(stockStore.stockData).forEach((key) => {
    if (stockStore.stockData[key]?.uid) {
      activeBuyerUids.add(stockStore.stockData[key].uid);
    }
  });
  return Object.keys(currentShipping).filter(
    (uid) => currentShipping[uid]?.ready && activeBuyerUids.has(uid),
  ).length;
});


function getStatusTitle(type) {
  // (Logic เดิม)
  const titles = {
    db: {
      ok: "✅ เชื่อมต่อ Firebase สำเร็จ",
      warn: "⚠️ Firebase มีปัญหา",
      err: "❌ ไม่สามารถเชื่อมต่อ Firebase",
    },
    api: {
      ok: "✅ YouTube API พร้อมใช้งาน",
      warn: "⚠️ API Key ใกล้หมด Quota",
      err: "❌ YouTube API ไม่สามารถใช้งาน",
    },
    chat: {
      ok: "✅ กำลังดึงแชทสด",
      warn: "⚠️ แชทมีปัญหา",
      err: "❌ ไม่สามารถดึงแชท",
      idle: "⚪ ยังไม่เชื่อมต่อ",
    },
  };
  const status =
    type === "db"
      ? systemStore.statusDb
      : type === "api"
        ? systemStore.statusApi
        : type === "chat"
          ? systemStore.statusChat
          : "idle";
  return titles[type]?.[status] || titles[type]?.idle || "ไม่ทราบสถานะ";
}

function toggleDropdown(event) {
  // (Logic เดิม)
  event.preventDefault();
  event.stopPropagation();
  if (!showDropdown.value) {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    dropdownStyle.value = {
      position: "fixed",
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
      zIndex: "9999",
    };
  }
  showDropdown.value = !showDropdown.value;
}

function handleClickOutside(event) {
  if (showDropdown.value) showDropdown.value = false;
}

function toggleAI() {
  // (Logic เดิม + ซิงค์)
  const newState = !systemStore.isAiCommander;
  update(dbRef(db, "system/aiCommander"), {
    enabled: newState ? systemStore.myDeviceId : null,
  })
    .then(() => {
      systemStore.isAiCommander = newState;
      queueAudio(null, "", newState ? "เปิด AI Commander" : "ปิด AI Commander");

    })
    .catch((error) => logger.error("Error toggling AI:", error));
}

// ✅ Extract YouTube Video ID from various URL formats
function extractVideoId(input) {
  if (!input) return "";

  // Handle common YouTube URL formats:
  // - youtube.com/watch?v=ID
  // - youtu.be/ID
  // - youtube.com/live/ID
  // - youtube.com/shorts/ID
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/|shorts\/)([^#&?]*).*/;
  const match = input.match(regExp);

  // Return the extracted ID if it's 11 characters, otherwise return original input
  return match && match[2].length === 11 ? match[2] : input;
}

async function toggleConnection() {
  if (systemStore.isConnected) {
    disconnect();
    systemStore.isConnected = false;
    systemStore.statusChat = "idle"; // ✅ Changed from 'err' to 'idle'
    systemStore.statusApi = "idle"; // ✅ Reset API status too
    queueAudio(null, "", "หยุดการเชื่อมต่อ");
    return;
  }

  // ✅ Auto-clean Video ID from URL before connecting
  const cleanId = extractVideoId(videoId.value);
  if (cleanId !== videoId.value) {
    videoId.value = cleanId; // Update UI to show only the clean ID
  }

  if (!videoId.value.trim()) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "ใส่ Video ID ก่อน",
      timer: 2000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
    return;
  }

  isConnecting.value = true;
  systemStore.isConnected = true;
  systemStore.currentVideoId = videoId.value;
  stockStore.connectToStock(videoId.value);

  // ✅ เพิ่ม: Unlock Audio เพื่อให้เสียงพูดทำงาน
  unlockAudio();

  // ✅ เพิ่ม: ส่งรหัสไลฟ์ขึ้น Firebase เพื่อให้เครื่องอื่นรู้
  set(dbRef(db, "system/activeVideo"), videoId.value).catch((err) =>
    console.error("Sync Error:", err),
  );

  try {
    const success = await connectVideo(videoId.value);
    if (success) {
      systemStore.statusChat = "ok";
      queueAudio(null, "", "เชื่อมต่อสำเร็จ กำลังอ่านคอมเมนต์");
      Swal.fire({
        icon: "success",
        title: "เชื่อมต่อสำเร็จ",
        text: "กำลังอ่านคอมเมนต์จาก YouTube Live",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    } else {
      systemStore.statusChat = "warn";
      Swal.fire({
        icon: "info",
        title: "เชื่อมต่อวิดีโอแล้ว",
        text: "ไม่พบห้องแชทสด (อาจเป็นคลิปย้อนหลัง)",
        timer: 3000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    }
  } catch (error) {
    logger.error("Connection error:", error);
    systemStore.isConnected = false;
    systemStore.statusApi = "err";
    systemStore.statusChat = "err";
    Swal.fire({
      icon: "error",
      title: "เชื่อมต่อไม่สำเร็จ",
      text: error.message,
      timer: 3000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  } finally {
    isConnecting.value = false;
  }
}

function downloadCSV() {
  // (Logic เดิม)
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความแชทเข้ามา",
      timer: 2000,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
    showDropdown.value = false;
    return;
  }
  chatStore.downloadChatCSV(systemStore.currentVideoId);
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    text: "ดาวน์โหลด CSV สำเร็จ",
    timer: 1500,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
  });
  showDropdown.value = false;
}

function testVoice() {
  unlockAudio(); // ✅ Unlock audio context explicitly
  queueAudio(null, "", "ทดสอบเสียง หนึ่ง สอง สาม สี่ ห้า");
  showDropdown.value = false;
}

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      logger.error("Fullscreen error:", err);
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถเข้าโหมดเต็มจอได้",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    });
  } else {
    document.exitFullscreen();
  }
  showDropdown.value = false;
}

function toggleAwayMode() {
  // (Logic เดิม)
  const currentState = systemStore.isAway;
  const awayRef = dbRef(db, "system/awayMode");
  if (!currentState) {
    set(awayRef, {
      isAway: true,
      startTime: Date.now(),
      deviceId: systemStore.myDeviceId,
    }).then(() => {
      logger.log("✅ Away mode enabled");
      Swal.fire({
        icon: "info",
        title: "โหมดพาลูกนอน",
        text: "ระบบจะซิงค์ไปทุกเครื่อง",
        timer: 2000,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
      });
    });
  } else {
    set(awayRef, {
      isAway: false,
      startTime: null,
      closedBy: systemStore.myDeviceId,
    }).then(() => {
      logger.log("✅ Away mode disabled");
    });
  }
  showDropdown.value = false;
}

async function toggleSimulation() {
  // (Logic เดิม)
  isSimulating.value = !isSimulating.value;
  if (isSimulating.value) {
    const { useChatProcessor } =
      await import("../composables/useChatProcessor");
    const { processMessage } = useChatProcessor();
    Swal.fire({
      icon: "info",
      title: "เริ่มจำลองแชท",
      text: "กำลังจำลองข้อความแชท...",
      timer: 1500,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
    simIntervalId = setInterval(() => {
      const rNum = Math.floor(Math.random() * stockStore.stockSize) + 1;
      const actions = [
        `F${rNum}`,
        `${rNum}`,
        `รับ ${rNum}`,
        `เอา ${rNum}`,
        `CF${rNum}`,
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      processMessage({
        id: "sim-" + Date.now(),
        snippet: {
          displayMessage: randomAction,
          publishedAt: new Date().toISOString(),
        },
        authorDetails: {
          channelId: "sim-" + Math.random().toString(36).substr(2, 9),
          displayName: "SimUser" + Math.floor(Math.random() * 100),
          profileImageUrl: "",
        },
      });
    }, 2000);
  } else {
    if (simIntervalId) {
      clearInterval(simIntervalId);
      simIntervalId = null;
    }
    Swal.fire({
      icon: "success",
      title: "หยุดจำลองแล้ว",
      timer: 1500,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
    });
  }
  showDropdown.value = false;
}

function askAiKey() {
  // (Logic เดิม)
  const currentKey = localStorage.getItem("geminiApiKey") || "";
  Swal.fire({
    title: "ตั้งค่า Gemini API Key",
    html: '<a href="https://aistudio.google.com/" target="_blank" style="color:#29b6f6">กดขอ Key ฟรีที่นี่</a>',
    input: "text",
    inputValue: currentKey,
    inputPlaceholder: "ใส่ API Key ของคุณ",
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      setApiKey(result.value);
      Swal.fire({
        icon: "success",
        title: "บันทึกแล้ว",
        text: "API Key ถูกบันทึกเรียบร้อย",
        timer: 1500,
        showConfirmButton: false,
      });
    }
  });
  showDropdown.value = false;
}



function openOverlayPage() {
  window.open(
    window.location.origin + window.location.pathname + "?mode=overlay",
    "_blank",
  );
  showDropdown.value = false;
}

function forceUpdate() {
  // (Logic เดิม)
  Swal.fire({
    title: "บังคับอัปเดต?",
    text: "ระบบจะโหลดหน้าเว็บใหม่",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ใช่, อัปเดต",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#00e676",
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("app_version");
      window.location.reload(true);
    }
  });
  showDropdown.value = false;
}

function getVersionTooltip() {
  return `Manowzab Command Center ${systemStore.version}`;
}

function toggleTtsMode() {
  systemStore.useOnlineTts = !systemStore.useOnlineTts;
  const mode = systemStore.useOnlineTts ? "Google Cloud TTS" : "Native TTS";
  logger.log("🔊 Switched to:", mode);

  queueAudio(null, "", `เปลี่ยนเป็น ${mode}`);
}

function showChangelog() {
  Swal.fire({
    title: `🚀 ${systemStore.version} Patch Notes`,
    html: `<div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ปรับปรุงใหม่</h4>
        <ul>
          <li>🔍 <b>Custom Autocomplete</b> — พิมพ์ชื่อในหน้าแก้ไขรายการ จะแนะนำชื่อจากรายชื่อลูกค้าเดิม รองรับ Keyboard ↑↓/Enter/Escape</li>
          <li>🎨 <b>สีแชทใหม่</b> — ปรับสี Badge และพื้นหลังแชท จอง(เขียว) ยกเลิก(แดง) ส่งเลย(ม่วง) ให้สวยชัดเจนขึ้น</li>
          <li>⏱️ <b>Auto-Scroll 15 วินาที</b> — ถ้าเลื่อนดูแชทเก่าเกิน 15 วินาที จะเด้งกลับมาข้อความล่าสุดอัตโนมัติ</li>
          <li>➕ <b>เพิ่มชื่อ Auto-Focus</b> — กดเพิ่มชื่อแล้ว cursor จะไปที่ช่องใหม่ทันที</li>
        </ul>
        </div>`,
    background: "#1e1e1e",
    color: "#fff",
    confirmButtonText: "รับทราบ!",
    confirmButtonColor: "#00e676",
    width: 600,
  });
}

onMounted(() => {
  logger.log("🎯 Header mounted");
  onValue(dbRef(db, "shipping"), (snapshot) => {
    shippingData.value = snapshot.val() || {};
  });
  document.addEventListener("click", handleClickOutside);
  const savedVideoId = localStorage.getItem("lastVideoId");
  if (savedVideoId) {
    videoId.value = savedVideoId;
  }
});

onBeforeUnmount(() => {
  logger.log("👋 Header unmounting");
  document.removeEventListener("click", handleClickOutside);
  if (simIntervalId) clearInterval(simIntervalId);
  if (videoId.value) localStorage.setItem("lastVideoId", videoId.value);
});
</script>

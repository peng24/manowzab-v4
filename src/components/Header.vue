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
            <a @click="downloadCSV">
              <i class="fa-solid fa-file-csv"></i> บันทึกแชท (CSV)
            </a>
            <a @click="testVoice">
              <i class="fa-solid fa-volume-high"></i> ทดสอบเสียง
            </a>
            <a @click="toggleFullScreen">
              <i class="fa-solid fa-expand"></i> เต็มจอ (iPad)
            </a>
            <a @click="toggleAwayMode">
              <i class="fa-solid fa-moon"></i> โหมดพาลูกนอน
            </a>
            <a @click="toggleSimulation">
              <i
                :class="isSimulating ? 'fa-solid fa-stop' : 'fa-solid fa-bolt'"
              ></i>
              {{ isSimulating ? "หยุดจำลอง" : "เริ่มจำลองแชท" }}
            </a>
            <a @click="askAiKey">
              <i class="fa-solid fa-key"></i> ตั้งค่า API Key
            </a>
            <a @click="forceUpdate" style="color: #00e676">
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
import { ref, inject, computed, onMounted, onBeforeUnmount } from "vue";
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useYouTube } from "../composables/useYouTube";
import { useGemini } from "../composables/useGemini";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, onValue, update, set } from "firebase/database";
import { db } from "../composables/useFirebase"; // หรือ "../firebase" ตามโครงสร้างไฟล์จริงของคุณ
import Swal from "sweetalert2";

// ==========================================
// ✅ Logger Configuration
// ==========================================
const DEBUG_MODE = true;
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
// ==========================================

const systemStore = useSystemStore();
const chatStore = useChatStore();
const stockStore = useStockStore();
const { connectVideo, disconnect } = useYouTube();
const { setApiKey } = useGemini();
const { queueSpeech } = useAudio();

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

// ✅ คำนวณจำนวนลูกค้าที่พร้อมส่ง
const shippingCount = computed(() => {
  const currentShipping = shippingData.value[systemStore.currentVideoId] || {};
  const activeBuyerUids = new Set();

  Object.keys(stockStore.stockData).forEach((key) => {
    if (stockStore.stockData[key]?.uid) {
      activeBuyerUids.add(stockStore.stockData[key].uid);
    }
  });

  return Object.keys(currentShipping).filter(
    (uid) => currentShipping[uid]?.ready && activeBuyerUids.has(uid)
  ).length;
});

// ✅ ฟังก์ชันแสดง Title ของ Status
function getStatusTitle(type) {
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
    },
  };

  const status =
    type === "db"
      ? systemStore.statusDb
      : type === "api"
      ? systemStore.statusApi
      : systemStore.statusChat;

  return titles[type][status] || "ไม่ทราบสถานะ";
}

// ✅ Toggle Dropdown
function toggleDropdown(event) {
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
  logger.log("🔽 Dropdown:", showDropdown.value);
}

// ✅ Close dropdown when clicking outside
function handleClickOutside(event) {
  if (showDropdown.value) {
    showDropdown.value = false;
  }
}

// ✅ Toggle AI Commander
function toggleAI() {
  const newState = !systemStore.isAiCommander;

  update(dbRef(db, "system/aiCommander"), {
    enabled: newState ? systemStore.myDeviceId : null,
  })
    .then(() => {
      systemStore.isAiCommander = newState;
      queueSpeech(newState ? "เปิด AI Commander" : "ปิด AI Commander");
    })
    .catch((error) => {
      logger.error("Error toggling AI:", error);
    });
}

// ✅ Toggle Connection
async function toggleConnection() {
  if (systemStore.isConnected) {
    disconnect();
    systemStore.isConnected = false;
    systemStore.statusChat = "err";
    queueSpeech("หยุดการเชื่อมต่อ");
    return;
  }

  if (!videoId.value.trim()) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "ใส่ Video ID ก่อน",
      timer: 2000,
    });
    return;
  }

  isConnecting.value = true;
  systemStore.isConnected = true;
  systemStore.currentVideoId = videoId.value;
  stockStore.connectToStock(videoId.value);

  try {
    const success = await connectVideo(videoId.value);

    if (success) {
      systemStore.statusChat = "ok";
      queueSpeech("เชื่อมต่อสำเร็จ กำลังอ่านคอมเมนต์");
      Swal.fire({
        icon: "success",
        title: "เชื่อมต่อสำเร็จ",
        text: "กำลังอ่านคอมเมนต์จาก YouTube Live",
        timer: 2000,
        showConfirmButton: false,
      });
    } else {
      systemStore.statusChat = "warn";
      Swal.fire({
        icon: "info",
        title: "เชื่อมต่อวิดีโอแล้ว",
        text: "ไม่พบห้องแชทสด (อาจเป็นคลิปย้อนหลัง)",
        timer: 3000,
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
    });
  } finally {
    isConnecting.value = false;
  }
}

// ✅ Download Chat CSV
function downloadCSV() {
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความแชทเข้ามา",
      timer: 2000,
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
    showConfirmButton: false,
  });
  showDropdown.value = false;
}

// ✅ Test Voice
function testVoice() {
  queueSpeech("ทดสอบเสียง หนึ่ง สอง สาม สี่ ห้า");
  showDropdown.value = false;
}

// ✅ Toggle Fullscreen
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      logger.error("Fullscreen error:", err);
      Swal.fire({
        icon: "error",
        title: "ไม่สามารถเข้าโหมดเต็มจอได้",
        timer: 2000,
      });
    });
  } else {
    document.exitFullscreen();
  }
  showDropdown.value = false;
}

// ✅ Toggle Away Mode
function toggleAwayMode() {
  const currentState = systemStore.isAway;
  const awayRef = dbRef(db, "system/awayMode");

  if (!currentState) {
    set(awayRef, {
      isAway: true,
      startTime: Date.now(),
      deviceId: systemStore.myDeviceId,
    })
      .then(() => {
        logger.log("✅ Away mode enabled");
        Swal.fire({
          icon: "info",
          title: "โหมดพาลูกนอน",
          text: "ระบบจะซิงค์ไปทุกเครื่อง",
          timer: 2000,
          showConfirmButton: false,
        });
      })
      .catch((err) => {
        logger.error("Away mode error:", err);
      });
  } else {
    set(awayRef, {
      isAway: false,
      startTime: null,
      closedBy: systemStore.myDeviceId,
    })
      .then(() => {
        logger.log("✅ Away mode disabled");
      })
      .catch((err) => {
        logger.error("Away mode error:", err);
      });
  }

  showDropdown.value = false;
}

// ✅ Toggle Simulation
async function toggleSimulation() {
  isSimulating.value = !isSimulating.value;

  if (isSimulating.value) {
    // Dynamic import to save load time
    const { useChatProcessor } = await import(
      "../composables/useChatProcessor"
    );
    const { processMessage } = useChatProcessor();

    Swal.fire({
      icon: "info",
      title: "เริ่มจำลองแชท",
      text: "กำลังจำลองข้อความแชท...",
      timer: 1500,
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
      showConfirmButton: false,
    });
  }

  showDropdown.value = false;
}

// ✅ Ask AI Key
function askAiKey() {
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

// ✅ Force Update
function forceUpdate() {
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

// ✅ Get Version Tooltip
function getVersionTooltip() {
  return `Manowzab Command Center ${systemStore.version}`;
}

// ✅ Show Changelog (ย้ายออกมาไว้ตรงนี้แล้ว)
function showChangelog() {
  Swal.fire({
    title: "🚀 v4.1.0 Patch Notes",
    html: `
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ฟีเจอร์ใหม่ (New Features)</h4>
        <ul style="margin-bottom: 10px;">
          <li>📱 <strong>Mobile & iPad Ready:</strong> ปรับ UI ใหม่ แก้ปัญหาตารางซ้อนกัน ใช้งานบนจอสัมผัสได้ลื่นไหล</li>
          <li>🔄 <strong>Multi-device Sync:</strong> ซิงค์ "จำนวนสต็อก" และ "โหมดพาลูกนอน" ข้ามเครื่องทันที</li>
          <li>🧹 <strong>Console Cleaner:</strong> จัดการ Log ไม่ให้รกหน้าจอขณะใช้งานจริง</li>
        </ul>

        <h4 style="color: #ff9800; margin-bottom: 5px;">🐛 การแก้ไขบั๊ก (Bug Fixes)</h4>
        <ul>
          <li>💬 แก้ปัญหาแชท "ทักทาย" หรือข้อความทั่วไปไม่ขึ้นในระบบ</li>
          <li>🛡️ เพิ่มระบบป้องกัน AI Error ไม่ให้กระทบการทำงานหลัก</li>
          <li>⚡ ปรับปรุงประสิทธิภาพการตัดสต็อกให้แม่นยำขึ้น</li>
        </ul>
        
        <p style="margin-top: 15px; font-size: 0.8em; color: #888;">
          Deploy Date: ${new Date().toLocaleDateString("th-TH")}
        </p>
      </div>
    `,
    background: "#1e1e1e",
    color: "#fff",
    confirmButtonText: "รับทราบ!",
    confirmButtonColor: "#00e676",
    width: 600,
  });
}

// ✅ Mounted & Unmounted
onMounted(() => {
  logger.log("🎯 Header mounted");

  // Listen to shipping data
  onValue(dbRef(db, "shipping"), (snapshot) => {
    shippingData.value = snapshot.val() || {};
  });

  // Add click outside listener
  document.addEventListener("click", handleClickOutside);

  // Load saved video ID
  const savedVideoId = localStorage.getItem("lastVideoId");
  if (savedVideoId) {
    videoId.value = savedVideoId;
  }
});

onBeforeUnmount(() => {
  logger.log("👋 Header unmounting");

  // Remove listener
  document.removeEventListener("click", handleClickOutside);

  // Clear simulation
  if (simIntervalId) {
    clearInterval(simIntervalId);
  }

  // Save video ID
  if (videoId.value) {
    localStorage.setItem("lastVideoId", videoId.value);
  }
});
</script>

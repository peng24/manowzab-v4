<template>
  <div class="header">
    <div class="header-controls">
      <div class="status-cluster">
        <span
          :class="['status-item', systemStore.statusDb]"
          :title="getStatusTitle('db')"
        >
          <span :class="['status-led', systemStore.statusDb]"></span>
          <i class="fa-solid fa-database"></i>
        </span>
        <span
          :class="['status-item', systemStore.statusApi]"
          :title="getStatusTitle('api')"
        >
          <span :class="['status-led', systemStore.statusApi]"></span>
          <i class="fa-brands fa-youtube"></i>
        </span>
        <span
          :class="['status-item', systemStore.statusChat]"
          :title="getStatusTitle('chat')"
        >
          <span :class="['status-led', systemStore.statusChat]"></span>
          <i class="fa-solid fa-comments"></i>
        </span>
        <span
          class="key-indicator"
          :title="`กำลังใช้ API Key #${systemStore.currentKeyIndex + 1}`"
        >
          <i class="fa-solid fa-key"></i> {{ systemStore.currentKeyIndex + 1 }}
        </span>
        <span
          class="version-badge"
          :title="getVersionTooltip()"
          @click="showChangelog"
          style="cursor: pointer; margin-left: 5px;"
        >
          {{ systemStore.version }}
        </span>
      </div>

      <!-- 🚚 Shipping Cycle Badge Button (Replaces History button) -->
      <button
        class="btn btn-shipping-cycle"
        @click="openShippingManager"
        :title="`🚚 รอบจัดส่งหลัก: ${shippingCycleLabel} (คลิกเพื่อเปิดรายการจัดส่ง)`"
      >
        <span class="cycle-icon-pill">
          <i class="fa-solid fa-truck-fast"></i>
        </span>
        <span class="cycle-text-content">
          <span class="cycle-title-small">รอบจัดส่ง</span>
          <span class="cycle-date-main">{{ shippingCycleLabel }}</span>
        </span>
        <i class="fa-solid fa-chevron-right cycle-arrow"></i>
      </button>

      <!-- Hero Connect Container -->
      <div :class="['hero-connect-container', { connected: systemStore.isConnected }]">
        <i class="fa-brands fa-youtube" style="color: #ff0000; margin-right: 6px; font-size: 1.1em;"></i>
        <input
          type="text"
          v-model="videoId"
          class="input-id"
          placeholder="YouTube Video ID"
          @keyup.enter="toggleConnection"
          style="border: none; background: transparent; outline: none; padding: 4px;"
        />
        <button
          :class="['btn', systemStore.isConnected ? 'btn-dark' : 'btn-primary']"
          @click="toggleConnection"
          :disabled="isConnecting"
          style="margin-left: 4px;"
        >
          {{
            systemStore.isConnected
              ? "DISCONNECT"
              : isConnecting
                ? "..."
                : "CONNECT"
          }}
        </button>
      </div>

      <!-- TTS Toggle - 4-State (Edge Premwadee / Google Neural2 / Google Standard / Native) -->
      <button
        :class="['btn']"
        :style="{
          background: systemStore.ttsVoiceMode === 'edge'
            ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)'
            : systemStore.ttsVoiceMode === 'neural2'
            ? 'linear-gradient(135deg, #00C6FF 0%, #7928CA 100%)'
            : systemStore.ttsVoiceMode === 'standard'
            ? 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)'
            : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
          boxShadow: systemStore.ttsVoiceMode === 'edge'
            ? '0 4px 15px rgba(236, 72, 153, 0.45)'
            : systemStore.ttsVoiceMode === 'neural2'
            ? '0 4px 15px rgba(121, 40, 202, 0.45)'
            : systemStore.ttsVoiceMode === 'standard'
            ? '0 4px 15px rgba(0, 114, 255, 0.4)'
            : 'none',
          border: 'none',
          color: 'white',
          position: 'relative',
        }"
        @click="toggleTtsMode"
        :title="
          systemStore.ttsVoiceMode === 'edge'
            ? `Microsoft Edge TTS (th-TH-PremwadeeNeural) ${systemStore.edgeTtsUrl ? '✅ พร้อมใช้งาน' : '⚠️ ยังไม่ใส่ URL'}`
            : systemStore.ttsVoiceMode === 'neural2'
            ? `Google Cloud Neural2 (th-TH-Neural2-C) - Key #${systemStore.activeKeyIndex} Active`
            : systemStore.ttsVoiceMode === 'standard'
            ? `Google Cloud Standard (th-TH-Standard-A) - Key #${systemStore.activeKeyIndex} Active`
            : 'Native TTS (Offline)'
        "
      >
        <!-- Icon -->
        <i
          :class="[
            systemStore.ttsVoiceMode === 'edge'
              ? 'fa-solid fa-bolt-lightning'
              : systemStore.useOnlineTts
              ? 'fa-solid fa-cloud'
              : 'fa-solid fa-robot',
          ]"
          style="font-size: 1.1em; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2))"
        ></i>

        <!-- Mode & Key Index Number -->
        <span
          v-if="systemStore.useOnlineTts"
          style="margin-left: 5px; font-size: 1.05em; font-weight: bold; font-family: monospace; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2))"
        >
          {{ systemStore.ttsVoiceMode === 'edge' ? 'P' : (systemStore.ttsVoiceMode === 'neural2' ? 'N' : 'S') + systemStore.activeKeyIndex }}
        </span>
      </button>

      <div class="dropdown" ref="dropdownRef">
        <button class="btn btn-sim" :class="{ active: showDropdown }" @click.stop="toggleDropdown">
          ⚡ Tools <i class="fa-solid fa-caret-down"></i>
        </button>
 
        <Teleport to="body">
          <div
            v-if="showDropdown"
            class="dropdown-content"
            :style="dropdownStyle"
            @click.stop
          >
            <!-- กลุ่มที่ 1: แชท & ไลฟ์สตรีม -->
            <div class="dropdown-group">
              <div class="dropdown-group-title">
                <i class="fa-solid fa-tower-broadcast"></i> แชท & ไลฟ์สตรีม
              </div>
              <a @click="toggleSimulation" class="menu-sim" :class="{ active: isSimulating }">
                <i :class="isSimulating ? 'fa-solid fa-stop' : 'fa-solid fa-bolt'"></i>
                <span>{{ isSimulating ? "หยุดจำลองแชท" : "เริ่มจำลองแชท" }}</span>
              </a>
              <a @click="downloadCSV" class="menu-csv">
                <i class="fa-solid fa-file-csv"></i>
                <span>บันทึกแชท (CSV)</span>
              </a>
            </div>

            <!-- กลุ่มที่ 2: เสียง & คำอ่าน -->
            <div class="dropdown-group">
              <div class="dropdown-group-title">
                <i class="fa-solid fa-volume-high"></i> เสียง & คำอ่าน
              </div>
              <a @click="openPhoneticMgr" class="menu-phonetic">
                <i class="fa-solid fa-microphone-lines"></i>
                <span>จัดการคำอ่าน (TTS)</span>
              </a>
              <a @click="openEdgeTtsSettings" class="menu-edge-tts">
                <i class="fa-solid fa-bolt-lightning" style="color: #ec4899;"></i>
                <span>ตั้งค่า Cloudflare (เสียงเปรมวดี)</span>
              </a>
              <a @click="testVoice" class="menu-voice">
                <i class="fa-solid fa-volume-high"></i>
                <span>ทดสอบเสียง</span>
              </a>
              <a @click="toggleAwayMode" class="menu-away" :class="{ active: systemStore.isAway }">
                <i class="fa-solid fa-moon"></i>
                <span>{{ systemStore.isAway ? "ปิดโหมดพาลูกนอน" : "โหมดพาลูกนอน" }}</span>
              </a>
            </div>

            <!-- กลุ่มที่ 3: ข้อมูล & จัดส่ง -->
            <div class="dropdown-group">
              <div class="dropdown-group-title">
                <i class="fa-solid fa-chart-pie"></i> ข้อมูล & จัดส่ง
              </div>
              <a @click="handleOpenHistory" class="menu-history">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>ประวัติการจอง</span>
              </a>
              <a @click="openLiveSummary" class="menu-summary">
                <i class="fa-solid fa-trophy" style="color: #f59e0b;"></i>
                <span>สรุปผลการขายไลฟ์</span>
              </a>
              <a :href="`${baseUrl}shipping/`" target="_blank" class="menu-shipping-page">
                <i class="fa-solid fa-truck-fast"></i>
                <span>รายการจัดส่ง (มือถือ)</span>
              </a>
              <a :href="`${baseUrl}history/`" target="_blank" class="menu-history-page">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span>ประวัติการขาย (แยกหน้า)</span>
              </a>
              <a href="https://peng24.github.io/manowzab-sales/" target="_blank" class="menu-sales">
                <i class="fa-solid fa-chart-line"></i>
                <span>ยอดขาย</span>
              </a>
            </div>

            <!-- กลุ่มที่ 4: ระบบ & ทั่วไป -->
            <div class="dropdown-group">
              <div class="dropdown-group-title">
                <i class="fa-solid fa-gears"></i> ระบบ & ทั่วไป
              </div>
              <a @click="openNoteEditor" class="menu-note">
                <i class="fa-solid fa-note-sticky"></i>
                <span>จัดการ Note</span>
              </a>
              <a @click="toggleFullScreen" class="menu-screen">
                <i class="fa-solid fa-expand"></i>
                <span>เต็มจอ</span>
              </a>
              <a @click="forceUpdate" class="menu-update">
                <i class="fa-solid fa-rotate"></i>
                <span>บังคับอัปเดต</span>
              </a>
              <a @click="handleLogout" class="menu-logout" style="color: #f87171;">
                <i class="fa-solid fa-arrow-right-from-bracket"></i>
                <span>ออกจากระบบ</span>
              </a>
            </div>
          </div>
        </Teleport>
      </div>

      <!-- ✅ Note Editor Modal -->
      <NoteEditor ref="noteEditorRef" />

      <!-- ✅ Changelog Modal -->
      <ChangelogModal ref="changelogModalRef" />

      <!-- ✅ Live Summary Modal -->
      <LiveSummaryModal ref="liveSummaryModalRef" />
    </div>

    <div class="header-info">
      <div
        :class="['status-dot', systemStore.isConnected ? 'online' : '']"
      ></div>
      <div class="live-viewers">
        👁️ {{ systemStore.viewerCount.toLocaleString() }}
      </div>
      <div class="live-title">
        <span v-if="systemStore.isLiveFinished" class="finished-badge clickable" @click="openLiveSummary" title="คลิกเพื่อดูสรุปผลการขายประจำไลฟ์">
          🔴 ไลฟ์จบแล้ว (ดูสรุป)
        </span>
        {{ systemStore.liveTitle }}
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject, provide, computed, onMounted, onBeforeUnmount, watch } from "vue"; // ✅ เพิ่ม watch
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useYouTube } from "../composables/useYouTube";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, onValue, update, set } from "firebase/database";
import { db } from "../composables/useFirebase"; // เช็ค path ให้ตรงกับเครื่องคุณ
import Swal from "sweetalert2";
import NoteEditor from "./NoteEditor.vue"; // ✅ Import Note Editor
import ChangelogModal from "./ChangelogModal.vue"; // ✅ Import Changelog Modal
import LiveSummaryModal from "./LiveSummaryModal.vue"; // ✅ Import Live Summary Modal
import { useAuthStore } from "../stores/auth";
import { announceShippingCustomers } from "../utils/deliverySync";
import { CONSTANTS } from "../config/constants";
import { formatShippingCycleLabel } from "../utils/chatParserUtils";

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

const authStore = useAuthStore();
const systemStore = useSystemStore();
const chatStore = useChatStore();
const stockStore = useStockStore();
const { connectVideo, disconnect } = useYouTube();

const { queueAudio } = useAudio();

const openDashboard = inject("openDashboard");
const openHistory = inject("openHistory");
const openShippingManager = inject("openShippingManager");
const openPhoneticManager = inject("openPhoneticManager");

const shippingCycleLabel = computed(() => {
  return formatShippingCycleLabel(systemStore.shippingCycle);
});

function handleOpenHistory() {
  if (openHistory) openHistory();
  showDropdown.value = false;
}

const videoId = ref("");
const showDropdown = ref(false);
const isSimulating = ref(false);
const isConnecting = ref(false);
const shippingData = ref({});
const dropdownRef = ref(null);
const dropdownStyle = ref({});
const noteEditorRef = ref(null); // ✅ Note Editor Ref
const changelogModalRef = ref(null); // ✅ Changelog Modal Ref
const liveSummaryModalRef = ref(null); // ✅ Live Summary Modal Ref
let simIntervalId = null;
const cleanupFns = [];

// ✅ Base URL for linking to sub-pages
const baseUrl = computed(() => import.meta.env.BASE_URL || '/');

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

// ✅ Watcher: เปิด Modal สรุปผลการขายอัตโนมัติเมื่อจบไลฟ์ และอ่านรายชื่อลูกค้าที่ให้จัดส่ง (รอ 5s)
watch(
  () => systemStore.isLiveFinished,
  (isFinished, oldVal) => {
    if (isFinished && !oldVal) {
      logger.log("🎉 Stream finished detected! Opening summary modal...");
      openLiveSummary();
      setTimeout(() => {
        announceShippingCustomers(systemStore.currentVideoId);
      }, CONSTANTS.YOUTUBE.ANNOUNCE_SHIPPING_DELAY_MS);
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
    openLiveSummary();
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

function openNoteEditor() {
  if (noteEditorRef.value) {
    if (typeof noteEditorRef.value.openEditor === "function") {
      noteEditorRef.value.openEditor();
    } else if (typeof noteEditorRef.value.open === "function") {
      noteEditorRef.value.open();
    }
  } else {
    logger.warn("noteEditorRef is null");
  }
  showDropdown.value = false;
}

provide("openNoteEditor", openNoteEditor);

function openPhoneticMgr() {
  if (openPhoneticManager) openPhoneticManager();
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
      window.location.reload();
    }
  });
  showDropdown.value = false;
}

function getVersionTooltip() {
  return `Manowzab Command Center ${systemStore.version}`;
}

function toggleTtsMode() {
  const newMode = systemStore.cycleTtsMode();
  let modeName = "Microsoft เปรมวดี";
  if (newMode === "neural2") modeName = "Google Neural2";
  else if (newMode === "standard") modeName = "Google Standard";
  else if (newMode === "native") modeName = "Native TTS";

  logger.log("🔊 Switched to:", modeName);
  queueAudio(null, "", `เปลี่ยนเป็น ${modeName}`);
}

async function openEdgeTtsSettings() {
  if (showDropdown.value) showDropdown.value = false;

  const currentUrl = systemStore.edgeTtsUrl || "";
  const result = await Swal.fire({
    title: "⚡ ตั้งค่า Microsoft Edge TTS (เสียงเปรมวดี)",
    html: `
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6; color: #cbd5e1;">
        <p>นำ URL ของ <b>Cloudflare Worker</b> ที่ Deploy แล้วมาวางที่นี่ (ฟรี 100,000 ครั้ง/วัน):</p>
        <div style="background: rgba(15, 23, 42, 0.6); padding: 8px 12px; border-radius: 6px; font-family: monospace; font-size: 0.85em; color: #38bdf8; margin-bottom: 12px; border: 1px solid rgba(56, 189, 248, 0.2);">
          โค้ด Worker อยู่ใน: <code>scripts/cloudflare-edge-tts-worker.js</code>
        </div>
      </div>
    `,
    input: "url",
    inputValue: currentUrl,
    inputPlaceholder: "https://your-worker.workers.dev",
    showCancelButton: true,
    confirmButtonText: "บันทึก URL",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#ec4899",
    cancelButtonColor: "#334155",
    showDenyButton: !!currentUrl,
    denyButtonText: "ลบ URL ออก",
    denyButtonColor: "#ef4444",
  });

  if (result.isConfirmed && result.value !== undefined) {
    systemStore.setEdgeTtsUrl(result.value);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "บันทึก Edge TTS URL เรียบร้อย!",
      timer: 2000,
      showConfirmButton: false,
    });
  } else if (result.isDenied) {
    systemStore.setEdgeTtsUrl("");
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "ลบ Edge TTS URL ออกแล้ว",
      timer: 2000,
      showConfirmButton: false,
    });
  }
}

function showChangelog() {
  if (changelogModalRef.value) {
    changelogModalRef.value.open()
  }
}

function openLiveSummary() {
  if (showDropdown.value) showDropdown.value = false;
  if (liveSummaryModalRef.value) {
    liveSummaryModalRef.value.open();
  }
}

async function handleLogout() {
  showDropdown.value = false;
  const res = await Swal.fire({
    title: "ออกจากระบบ?",
    text: "คุณต้องการออกจากระบบ Manowzab Command Center ใช่หรือไม่",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ออกจากระบบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#334155",
  });

  if (res.isConfirmed) {
    authStore.logout();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "🚪 ออกจากระบบเรียบร้อยแล้ว",
      showConfirmButton: false,
      timer: 2000,
    });
  }
}

defineExpose({
  openLiveSummary,
  handleLogout,
});


onMounted(() => {
  logger.log("🎯 Header mounted");
  const unsubShipping = onValue(dbRef(db, "shipping"), (snapshot) => {
    shippingData.value = snapshot.val() || {};
  });
  cleanupFns.push(unsubShipping);
  document.addEventListener("click", handleClickOutside);
  const savedVideoId = localStorage.getItem("lastVideoId");
  if (savedVideoId) {
    videoId.value = savedVideoId;
  }
});

onBeforeUnmount(() => {
  logger.log("👋 Header unmounting");
  cleanupFns.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  cleanupFns.length = 0;
  console.log("🧹 Memory Cleaned Up!");
  document.removeEventListener("click", handleClickOutside);
  if (simIntervalId) clearInterval(simIntervalId);
  if (videoId.value) localStorage.setItem("lastVideoId", videoId.value);
});
</script>

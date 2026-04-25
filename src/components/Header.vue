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
        <span
          class="version-badge"
          :title="getVersionTooltip()"
          @click="showChangelog"
          style="cursor: pointer; margin-left: 5px;"
        >
          {{ systemStore.version }}
        </span>
      </div>

      <button class="btn btn-dark" @click="openHistory">🕒</button>






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
        :class="['btn']"
        :style="{
          background: systemStore.useOnlineTts
            ? 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)'
            : 'linear-gradient(135deg, #4B5563 0%, #374151 100%)',
          boxShadow: systemStore.useOnlineTts
            ? '0 4px 15px rgba(0, 114, 255, 0.4)'
            : 'none',
          border: 'none',
          color: 'white',
          position: 'relative',
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
            systemStore.useOnlineTts
              ? 'fa-solid fa-cloud'
              : 'fa-solid fa-robot',
          ]"
          style="font-size: 1.1em; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2))"
        ></i>

        <!-- Key Index Number -->
        <span
          v-if="systemStore.useOnlineTts"
          style="margin-left: 6px; font-size: 1.1em; font-weight: bold; font-family: monospace; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.2))"
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
              <i class="fa-solid fa-expand"></i> เต็มจอ
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
            <a @click="openOverlayPage" class="menu-overlay">
              <i class="fa-solid fa-layer-group"></i> เปิดหน้าจอ Overlay (OBS)
            </a>
            <a @click="openShippingMobilePage" class="menu-shipping-mobile">
              <i class="fa-solid fa-mobile-screen"></i> จัดการจัดส่ง (มือถือ)
            </a>
            <a href="https://peng24.github.io/manowzab-sales/" target="_blank" class="menu-sales">
              <i class="fa-solid fa-chart-line"></i> ยอดขาย
            </a>
            <a @click="openNoteEditor" class="menu-note">
              <i class="fa-solid fa-note-sticky"></i> จัดการ Note
            </a>
            <a @click="forceUpdate" class="menu-update">
              <i class="fa-solid fa-rotate"></i> บังคับอัปเดต
            </a>
            <a @click="openPhoneticMgr" class="menu-phonetic">
              <i class="fa-solid fa-volume-high"></i> จัดการคำอ่าน (TTS)
            </a>
          </div>
        </Teleport>
      </div>

      <!-- ✅ Note Editor Modal -->
      <NoteEditor ref="noteEditorRef" />
    </div>

    <div class="header-info">
      <div
        :class="['status-dot', systemStore.isConnected ? 'online' : '']"
      ></div>
      <div class="live-viewers">
        👁️ {{ systemStore.viewerCount.toLocaleString() }}
      </div>
      <div class="live-title">{{ systemStore.liveTitle }}</div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed, onMounted, onBeforeUnmount, watch } from "vue"; // ✅ เพิ่ม watch
import { useSystemStore } from "../stores/system";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useYouTube } from "../composables/useYouTube";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, onValue, update, set } from "firebase/database";
import { db } from "../composables/useFirebase"; // เช็ค path ให้ตรงกับเครื่องคุณ
import Swal from "sweetalert2";
import NoteEditor from "./NoteEditor.vue"; // ✅ Import Note Editor

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

const { queueAudio } = useAudio();

const openDashboard = inject("openDashboard");
const openHistory = inject("openHistory");
const openShippingManager = inject("openShippingManager");
const openPhoneticManager = inject("openPhoneticManager");

const videoId = ref("");
const showDropdown = ref(false);
const isSimulating = ref(false);
const isConnecting = ref(false);
const shippingData = ref({});
const dropdownRef = ref(null);
const dropdownStyle = ref({});
const noteEditorRef = ref(null); // ✅ Note Editor Ref
let simIntervalId = null;
const cleanupFns = [];

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

function openOverlayPage() {
  window.open(
    window.location.origin + window.location.pathname + "?mode=overlay",
    "_blank",
  );
  showDropdown.value = false;
}

function openShippingMobilePage() {
  window.open(
    window.location.origin + window.location.pathname + "?mode=shipping",
    "_blank",
  );
  showDropdown.value = false;
}

function openNoteEditor() {
  if (noteEditorRef.value) {
    noteEditorRef.value.openEditor();
  }
  showDropdown.value = false;
}

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
  systemStore.useOnlineTts = !systemStore.useOnlineTts;
  const mode = systemStore.useOnlineTts ? "Google Cloud TTS" : "Native TTS";
  logger.log("🔊 Switched to:", mode);

  queueAudio(null, "", `เปลี่ยนเป็น ${mode}`);
}

function showChangelog() {
  Swal.fire({
    title: `🚀 ${systemStore.version} Patch Notes`,
    html: `<div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
      <h4 style="color: #ff9800; margin-bottom: 5px;">🌟 อัปเดตล่าสุด (4.29.4) - 25 เม.ย. 2026</h4>
        <ul>
          <li>🎨 <b>แก้ไขพื้นหลังเบลอ (Blur)</b> — ปิดการแสดงผลพื้นหลังเบลอสำหรับแจ้งเตือนแบบ Toast มุมขวาบน (เช่น โหมดพาลูกนอน และแจ้งเตือนทั่วไป) เพื่อไม่ให้บดบังหน้าจอหลักและตารางการทำงาน</li>
        </ul>
      <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.29.3) - 24 เม.ย. 2026</h4>
        <ul>
          <li>🧹 <b>ทำความสะอาดโค้ด</b> — ลบระบบ iOS/iPad Audio Unlock (ปลดล็อคเสียงบน iPad) ออกจากระบบ เนื่องจากไม่ได้ใช้งานบน iPad แล้ว เพื่อให้ระบบมีขนาดเล็กลงและทำงานได้รวดเร็วขึ้น</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.29.2) - 24 เม.ย. 2026</h4>
        <ul>
          <li>🛠️ <b>ปรับปรุงโครงสร้าง Gitignore</b> — ปรับปรุงไฟล์ .gitignore ให้ครอบคลุมการละเว้นไฟล์ขยะจากระบบปฏิบัติการ, ไฟล์ Environment (เพื่อความปลอดภัย), ไฟล์ประวัติชั่วคราว, และโฟลเดอร์ของ AI Agents เพื่อให้การจัดการ Source Code สะอาดและปลอดภัยยิ่งขึ้น</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.29.1) - 24 เม.ย. 2026</h4>
        <ul>
          <li>🤖 <b>ปรับปรุงเสียงต้อนรับลูกค้าใหม่</b> — ปรับคำพูดทักทายและแจ้งกติกาสำหรับลูกค้าใหม่ให้สั้นและกระชับขึ้น (ลดความยาวประโยค) เพื่อให้ระบบทำงานได้รวดเร็วและไม่รบกวนจังหวะไลฟ์สด</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.29.0) - 24 เม.ย. 2026</h4>
        <ul>
          <li>🎨 <b>ปรับโฉม Icon และ Branding ใหม่ทั้งหมด</b> — อัปเดตไอคอนโปรแกรมเป็นโลโก้ 'M' แนวโมเดิร์น (สไตล์ Neon Glassmorphism) และเปลี่ยนโทนสี PWA/Mask Icon ให้เป็นธีมใหม่ทั้งหมด ยกเลิกการใช้สัญลักษณ์รูปมะนาว</li>
          <li>💬 <b>เปลี่ยน Emoji ป้องกันสแปม</b> — ปรับเปลี่ยนไอคอนข้อความที่ถูกมองว่าเป็นสแปมใน ChatPanel จากรูปมะนาวเป็นข้อความรูปแชท (💬) แทน</li>
          <li>⚡ <b>เมนู Tools ดีไซน์ใหม่</b> — เปลี่ยนไอคอนในเมนู Tools ให้เป็นบล็อกสีไล่ระดับ (Gradient blocks) เพิ่มความสวยงามและทันสมัย</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.28.0) - 16 เม.ย. 2026</h4>
        <ul>
          <li>🔊 <b>ระบบจัดการคำอ่าน (Phonetic Manager)</b> — เมนูใหม่สำหรับเพิ่ม/แก้ไขคำอ่านชื่อลูกค้าแบบ Custom เพื่อให้ระบบ TTS อ่านออกเสียงได้ถูกต้องแม่นยำยิ่งขึ้น พร้อมปุ่ม Preview เพื่อทดสอบฟังสียงก่อนบันทึกจริง</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.27.0) - 9 เม.ย. 2026</h4>
        <ul>
          <li>⌨️ <b>ระบบการนำทางด้วยคีย์บอร์ด (Arrow Keys)</b> — เพิ่มปุ่มและความสามารถในการกดลูกศร ซ้าย-ขวา เพื่อเลื่อนไปแก้ไขรายการถัดไปหรือก่อนหน้าได้ทันที พร้อมบันทึกข้อมูลอัตโนมัติ ช่วยเพิ่มความเร็วในการกรอกและแก้ไขราคา</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.26.2) - 9 เม.ย. 2026</h4>
        <ul>
          <li>🤖 <b>เพิ่มคำศัพท์ใหม่สำหรับวิเคราะห์แชท</b> — อัปเดตระบบวิเคราะห์ข้อความเพื่อให้รองรับคำว่า "ขอผ่าน", "ยกเลก", "ยืดใหม", "เิา", "เปลี่ยนใจ", "หรอ", "ปะ", "ยังไง" และดักจับประโยครูปแบบ "รับค่ะ35" ได้อย่างแม่นยำยิ่งขึ้น</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.26.1) - 9 เม.ย. 2026</h4>
        <ul>
          <li>🧹 <b>ป้องกัน Memory Leak ทั่วระบบ</b> — ใช้ Array Pattern เพื่อเคลียร์ Firebase Listeners ตามหน้าต่างป็อปอัปและระบบต่างๆ (Stock, จัดจัดส่ง, Overlay, Note) ทิ้งอย่างหมดจดเมื่อปิดหน้าต่าง ปิดช่องโหว่กินแรมเมื่อไลฟ์ต่อเนื่องหลายชั่วโมง</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.26.0) - 9 เม.ย. 2026</h4>
        <ul>
          <li>💎 <b>ปรับโฉม Stock Header & Delivery Strip</b> — ย้ายแถบพัสดุ (Delivery Strip) เข้าไปรวมใน Stock Header เป็นแถวเดียวสุด Minimal ช่วยประหยัดพื้นที่หน้าจอแนวตั้ง</li>
          <li>📱 <b>ซ่อนองค์ประกอบที่ไม่จำเป็นบนมือถือ</b> — ปรับแต่ง UI ให้เหมาะสมกับการใช้งานบนมือถือ โดยซ่อนป้ายชื่อที่ไม่จำเป็นเพื่อให้ข้อมูลสำคัญแสดงได้ครบถ้วนในบรรทัดเดียว</li>
          <li>🎯 <b>แก้ไขไอคอน Shipping หายไป</b> — แก้ไขบั๊กที่ปุ่ม Shipping Manager แบบย่อหายไปตอนไม่มีรายการพัสดุ ทำให้เปิด Modal ไม่ได้</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.25.0) - 9 เม.ย. 2026</h4>
        <ul>
          <li>🛡️ <b>แก้ Race Condition ตอนแก้ไขราคา</b> — ถ้าลูกค้า CF เข้ามาขณะที่ Modal เปิดอยู่ ระบบจะอัปเดตเฉพาะราคา โดยไม่ลบข้อมูลเจ้าของที่เพิ่งจองเข้ามา</li>
          <li>🔔 <b>Modal อัปเดตแบบ Real-time</b> — เมื่อมีลูกค้า CF ขณะ Modal เปิดอยู่ (และยังไม่มีเจ้าของ) ระบบจะเติมชื่อลูกค้าเข้ามาทันทีพร้อมเสียงเตือน</li>
          <li>💎 <b>ปรับดีไซน์ Modal ใหม่ทั้งหมด</b> — Glassmorphism overlay, ช่องราคาขนาดใหญ่เป็นจุดโฟกัส, เจ้าของ (👑 ได้ของ) ขอบเรืองแสงเขียว แยกชัดจากคิวสำรอง (ขอบเส้นประจาง)</li>
          <li>🧹 <b>เพิ่มปุ่ม "ล้าง" (Clear)</b> — ล้างราคาและรายชื่อทั้งหมดในคลิกเดียว (มีถาม Confirm ก่อน)</li>
          <li>⌨️ <b>Auto-focus + Enter ที่ช่องราคา</b> — เปิด Modal ปุ๊บ โฟกัสช่องราคาปั๊บ กด Enter บันทึกเลย</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.24.0) - 30 มี.ค. 2026</h4>
        <ul>
          <li>📝 <b>ระบบ Note แบบ Sync ทุกหน้าจอ</b> — สร้าง Note ได้จากเมนู Tools เพื่อแสดงข้อความแจ้งเตือนบนทุกเครื่อง (Sync ผ่าน Firebase) เลือกสีได้อิสระ 16 สี ย่อ/ขยายได้ ปิดถาวรได้ แสดงเป็นแถบลอยที่มุมซ้ายล่างไม่บังแชทหรือตาราง ไม่อ่านออกเสียง!</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.23.1) - 30 มี.ค. 2026</h4>
        <ul>
          <li>🐛 <b>แก้บั๊กรายการจัดส่งซ้ำ</b> — เมื่อระบบตรวจจับคำสั่งจัดส่งจากแชทสด (เช่น "ยุพิน ชร. ส่งเลย") ระบบจะเช็คก่อนว่ามีลูกค้าชื่อเดียวกันอยู่แล้วหรือไม่ ถ้ามีจะอัปเดตรายการเดิมแทนการสร้างใหม่ ป้องกันรายการซ้ำ 2 แถว!</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.23.0) - 26 มี.ค. 2026</h4>
        <ul>
          <li>🤖 <b>ปรับตรรกะการดึงข้อมูลการจัดส่ง </b> — ตอนนี้ระบบดึงรายชื่อการจัดเตรียมส่งจากคอมเมนต์ (เช่น "ส่งพรุ่งนี้ พี่แจง") ได้แม่นยำและยืดหยุ่นเหมือนระบบจองของหน้าแชทหลักแล้ว! ไม่ต้องพิมพ์เว้นวรรคให้เป๊ะก็รู้เรื่อง</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.22.1)</h4>
        <ul>
          <li>🤖 <b>เพิ่มกฎ AI ประจำโปรเจกต์</b> — สร้าง \`GEMINI.md\` เพื่อเป็นข้อกำหนดทางสถาปัตยกรรม (Vue 3, Firebase, Audio Queue) ให้ AI ทำงานร่วมกับระบบปัจจุบันได้อย่างปลอดภัย ไม่กระทบระบบเดิม!</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.22.0)</h4>
        <ul>
          <li>🤖 <b>ระบบอ่านวันที่จัดส่งอัตโนมัติ</b> — เมื่อลูกค้า (หรือแอดมินพิมพ์แทน) ว่า "ส่งเลย", "ส่งพรุ่งนี้" หรือ "ส่ง 3 เม.ย." ระบบจะดึงวันที่จัดส่งเข้าบิลให้โดยอัตโนมัติ ไม่ต้องคอยกรอกเอง!</li>
          <li>📱 <b>หน้าจอ Responsive</b> — แก้ไขช่อง UI เบียดหรือซ้อนทับกันเวลาเปิดบนหน้าจอเล็ก ตอนนี้แถบสถานะยอดขายจะถูกจัดเรียงลงมาด้านล่างอย่างเป็นระเบียบ</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.21.3)</h4>
        <ul>
          <li>🚚 <b>ปรับปรุงหน้ารายการจัดส่ง</b> — นำปุ่ม Dashboard (รูปรถ) ออกจากส่วนหัวเพื่อความเรียบง่าย</li>
          <li>✨ <b>Auto-complete ชื่อลูกค้า</b> — เพิ่มระบบเกี้ยวรายชื่ออัตโนมัติ (Auto-complete) จากลูกค้าเดิมและในสต๊อก</li>
          <li>📅 <b>วันที่จัดส่งอัตโนมัติ</b> — หากไม่ได้ระบุวันที่จัดส่ง ระบบจะกำหนดให้เป็นวันที่ในปัจจุบัน (วันนี้) ให้ทันที</li>
          <li>📦 <b>ย้ายปุ่ม Shipping Manager</b> — ย้ายปุ่มรูปกล่องพัสดุลงไปรวมกับแถบ Delivery ด้านล่างเพื่อความต่อเนื่อง</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.21.0)</h4>
        <ul>
          <li>🎨 <b>เปลี่ยนปุ่มคลังสินค้าเป็นไอคอน</b> — ปรับดีไซน์ปุ่มจัดการรายการจัดส่งให้เป็นไอคอนกล่องพัสดุขนาดใหญ่ ไม่มีพื้นหลัง เพื่อความกลมกลืนและสวยงามมากขึ้น</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.20.0)</h4>
        <ul>
          <li>🔊 <b>เพิ่มเสียงแนะนำลูกค้าใหม่</b> — ระบบจะพูดเตือนกติกาการจอง (พิมพ์ชื่อและรหัส) ให้ลูกค้าใหม่โดยอัตโนมัติ 1 ครั้ง</li>
          <li>🎟️ <b>จองหลายรายการแบบมี _ คั่น</b> — รองรับการพิมพ์รหัสคั่นด้วยขีดล่าง (เช่น 11_37 หรือ ๑๑_๓๗) ให้ระบบจองรวดเดียวได้แล้ว</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.19.2)</h4>
        <ul>
          <li>✨ <b>ปรับปรุง Layout หน้าจอหลัก</b> — ย้ายช่อง Live Chat ให้เต็มความสูงด้านขวา และจัดวางเลขเวอร์ชั่นในตำแหน่งใหม่ที่แถบเมนูด้านบน</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.19.0)</h4>
        <ul>
          <li>🤖 <b>Auto-Sync ระบบจัดส่ง</b> — Dashboard ส่งข้อมูลลูกค้า+จำนวนสินค้า ไป Shipping Manager อัตโนมัติ! รองรับสะสมข้ามไลฟ์ พร้อมปุ่ม Sync All และ breakdown ต่อไลฟ์</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.18.0)</h4>
        <ul>
          <li>📦 <b>ระบบจัดการจัดส่งสินค้า</b> — หน้าจัดการลูกค้า, นัดวันส่ง, นับถอยหลัง, badge แจ้งเตือน</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.16.7)</h4>
        <ul>
          <li>🔄 <b>แก้บั๊กอัปเดตแล้วเป็นหน้าว่าง</b> — ปรับให้ระบบรอโหลดหน้าเว็บเบื้องหลังให้เสร็จสมบูรณ์ ก่อนจะรีเฟรช ป้องกันหน้าจอผู้ใช้ขาวบอด</li>
          <li>⏳ <b>ซ่อนแจ้งเตือนอัตโนมัติ</b> — หากมีแจ้งเตือนอัปเดตระบบแล้วไม่ได้กดภายใน 1 นาที ระบบจะซ่อนแจ้งเตือนไปเองอัตโนมัติ เพื่อไม่ให้ค้างบังหน้าจอไลฟ์</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.16.6)</h4>
        <ul>
          <li>🎨 <b>ย้ายตำแหน่งแจ้งเตือนอัปเดตระบบ</b> — ย้ายการแจ้งเตือน "มีเวอร์ชั่นใหม่พร้อมใช้งาน" จากมุมขวาล่างไปไว้ที่ด้านบนตรงกลางหน้าจอ เพื่อไม่ให้บังแชทลูกค้าเวลาไลฟ์สด</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.16.5)</h4>
        <ul>
          <li>🗣️ <b>แก้ปัญหาหุ่นยนต์สะกดชื่อ</b> — ป้องกันระบบอ่านสะกดชื่อเล่นสั้นๆ เป็นทีละตัวอักษร (เช่น "ปอ" เป็น "ปอ-ออ" หรือ "เอ" เป็น "ออ-เอ") โดยระบบจะเติมคำว่า "คุณ" นำหน้าชื่อให้อัตโนมัติ เพื่อบังคับให้ AI ออกเสียงเป็นชื่อคนอย่างถูกต้องและไพเราะขึ้น</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.16.4)</h4>
        <ul>
          <li>🔊 <b>เพิ่มเสียงเตือน (Error) กรณีของซ้ำ/คิวเต็ม</b> — เมื่อมีลูกค้าพิมพ์สั่งซื้อเข้ามา แต่รหัสสินค้านั้นมีคนได้ไปแล้ว หรือกำลังประมวลผลอยู่ ระบบจะอ่านแชทพร้อมส่งเสียง "Error" เพื่อให้แม่ค้ารู้ว่า "ระบบอ่านแล้วแต่ไม่ได้ของ" (แก้ปัญหาแม่ค้าคิดว่าระบบไม่อ่านแชท)</li>
        </ul>
        <h4 style="color: #00e676; margin-bottom: 5px;">✨ ก่อนหน้า (4.16.3)</h4>
        <ul>
          <li>🔊 <b>แก้ TTS ไม่อ่านบางข้อความ</b> — ข้อความที่ซื้อซ้ำ, คิวซ้ำ, กำลัง Lock หรือ Order Failed ตอนนี้จะถูกอ่านพูดออกเสียงตามปกติแทนที่จะถูกข้ามไปเงียบๆ</li>
          <li>🎯 <b>แก้ Chat Emoji-only ไม่อ่าน</b> — ข้อความที่มีเฉพาะ Emoji จะถูก fallback ไปอ่านด้วย MessageRuns</li>
        </ul>
        </div>`,
    background: "#1e1e1e",
    color: "#fff",
    confirmButtonText: "รับทราบ!",
    confirmButtonColor: "#00e676",
    showCloseButton: true,
    allowOutsideClick: true,
    backdrop: `
      rgba(0,0,0,0.5)
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    `
  });
}

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

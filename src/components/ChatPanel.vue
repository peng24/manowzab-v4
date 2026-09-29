<template>
  <div class="chat-panel">
    <div class="tools-bar">
      <h3 style="color: #fff; margin: 0; font-size: 1.1em">
        <i class="fa-solid fa-comments"></i> Live Chat
      </h3>
      <div class="chat-controls">
        <button
          class="btn-tool"
          :class="{ muted: !systemStore.isSoundOn }"
          @click="toggleSound"
        >
          <i
            :class="
              systemStore.isSoundOn
                ? 'fa-solid fa-volume-high'
                : 'fa-solid fa-volume-xmark'
            "
          ></i>
          {{ systemStore.isSoundOn ? "เสียง: เปิด" : "เสียง: ปิด" }}
        </button>

        <button class="btn-tool" @click="stopVoice">
          <i class="fa-solid fa-stop"></i> หยุดเสียง
        </button>

        <button class="btn-tool btn-csv" @click="exportCSV">
          <i class="fa-solid fa-file-csv"></i> CSV
        </button>
      </div>
    </div>

    <!-- 🏷️ Chat Intent Filter Tabs -->
    <div class="chat-intent-tabs">
      <button class="chat-tab" :class="{ active: selectedChatTab === 'all' }" @click="selectedChatTab = 'all'">ทั้งหมด</button>
      <button class="chat-tab tab-cf" :class="{ active: selectedChatTab === 'buy' }" @click="selectedChatTab = 'buy'">🛒 เฉพาะ CF</button>
      <button class="chat-tab tab-cancel" :class="{ active: selectedChatTab === 'cancel' }" @click="selectedChatTab = 'cancel'">❌ ยกเลิก</button>
      <button class="chat-tab tab-admin" :class="{ active: selectedChatTab === 'admin' }" @click="selectedChatTab = 'admin'">⚡ ระบบ/แอดมิน</button>
      <button
        type="button"
        class="chat-tab tab-author"
        :class="{ active: selectedAuthors.length > 0 || showAuthorDropdown }"
        @click="showAuthorDropdown = !showAuthorDropdown"
        title="เลือกรายชื่อลูกค้าที่ต้องการดูแชท"
      >
        <i class="fa-solid fa-users-viewfinder"></i>
        <span>{{ selectedAuthors.length > 0 ? `กรองชื่อ (${selectedAuthors.length})` : 'กรองตามชื่อ' }}</span>
      </button>
    </div>

    <!-- 🎯 Active Author Filter Bar -->
    <div v-if="selectedAuthors.length > 0" class="active-author-bar">
      <div class="active-author-left">
        <i class="fa-solid fa-filter text-warning"></i>
        <span class="active-author-label">แสดงเฉพาะ ({{ filteredVisibleMessages.length }} ข้อความ):</span>
        <div class="active-author-chips">
          <span
            v-for="name in selectedAuthors"
            :key="name"
            class="author-chip"
          >
            {{ name }}
            <button type="button" class="chip-remove-btn" @click.stop="removeAuthor(name)" title="นำออก">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </span>
        </div>
      </div>
      <button type="button" class="btn-clear-author-filter" @click="clearAuthorFilter" title="ล้างตัวกรอง">
        <i class="fa-solid fa-rotate-left"></i> ล้าง
      </button>
    </div>

    <!-- 👥 Author Dropdown Popover -->
    <div v-if="showAuthorDropdown" class="author-dropdown-popover" @click.stop>
      <div class="author-popover-header">
        <div class="popover-title">
          <i class="fa-solid fa-user-tag text-warning"></i>
          <span>เลือกรายชื่อลูกค้าที่ต้องการกรอง</span>
        </div>
        <button type="button" class="popover-close-btn" @click="showAuthorDropdown = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="author-search-box">
        <i class="fa-solid fa-magnifying-glass search-icon"></i>
        <input
          type="text"
          v-model="authorSearchQuery"
          class="author-search-input"
          placeholder="ค้นหาชื่อที่แชท..."
        />
        <button v-if="authorSearchQuery" class="clear-search-btn" @click="authorSearchQuery = ''">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="author-popover-actions">
        <button type="button" class="btn-popover-act" @click="selectActiveBuyers" title="เลือกทุกคนที่ CF สินค้าในรอบนี้">
          🛒 เฉพาะคน CF รอบนี้
        </button>
        <button v-if="selectedAuthors.length > 0" type="button" class="btn-popover-act clear" @click="clearAuthorFilter">
          ล้างทั้งหมด
        </button>
      </div>

      <div class="author-list-scroll">
        <div v-if="filteredActiveChatters.length === 0" class="author-empty">
          ไม่พบรายชื่อในแชทสด
        </div>
        <div
          v-for="chatter in filteredActiveChatters"
          :key="chatter.norm"
          class="author-item-row"
          :class="{ selected: selectedAuthorsSet.has(chatter.norm) }"
          @click="toggleAuthorByName(chatter.name)"
        >
          <input
            type="checkbox"
            :checked="selectedAuthorsSet.has(chatter.norm)"
            @click.stop
            @change="toggleAuthorByName(chatter.name)"
            class="author-checkbox"
          />
          <div class="author-item-avatar" :style="{ backgroundColor: chatter.color || '#3b82f6' }">
            {{ chatter.name[0] || '?' }}
          </div>
          <span class="author-item-name">{{ chatter.name }}</span>
          <span class="author-item-count">{{ chatter.count }} ข้อความ</span>
        </div>
      </div>
    </div>

    <!-- ✅ Pull-to-Refresh Indicator -->
    <div
      class="pull-indicator"
      :class="{ pulling: isPulling, refreshing: isRefreshing }"
      :style="{ height: pullDistance + 'px' }"
    >
      <i class="fa-solid fa-sync" :class="{ spinning: isRefreshing }"></i>
      <span v-if="pullDistance > pullThreshold">ปล่อยเพื่อรีเฟรช</span>
      <span v-else-if="isPulling">ดึงลงเพื่อรีเฟรช</span>
    </div>

    <div
      id="chat-viewport"
      ref="chatViewport"
      @scroll="handleScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <!-- ✅ Load Previous Messages Button -->
      <button
        v-if="hasMoreMessages"
        class="load-more-btn"
        @click="loadMoreMessages"
      >
        ⬆️ โหลดข้อความเก่าเพิ่ม ({{ chatStore.messages.length - displayLimit }}
        ข้อความ)
      </button>

      <TransitionGroup name="chat-list" tag="div" id="chat-list">
        <div
          v-for="chat in filteredVisibleMessages"
          :key="chat.id"
          v-memo="[chat.id, chat.displayName, chat.realName, chat.type, chat.text, chat.color, isAuthorFiltered(chat), getCustomerMetaKey(chat)]"
          :class="['chat-row', chat.isAdmin ? 'admin' : '', chat.type]"
        >
          <!-- Avatar Left -->
          <div class="avatar-container">
            <img
              :src="chat.avatar"
              class="avatar"
              loading="lazy"
              decoding="async"
              @error="(e) => (e.target.style.display = 'none')"
            />
            <div
              class="avatar-fallback"
              :style="{ backgroundColor: chat.color }"
            >
              {{ chat.displayName?.[0] || "?" }}
            </div>
          </div>

          <!-- Message Bubble Right -->
          <div class="chat-bubble-container">
            <div class="chat-meta">
              <span class="chat-time">{{ formatTime(chat.timestamp) }}</span>
              <span
                class="chat-name"
                :style="{ backgroundColor: chat.color }"
                @click="editNickname(chat)"
                title="คลิกเพื่อแก้ไขข้อมูลลูกค้า (ชื่อเล่น, ที่อยู่, ช่องทางติดต่อ)"
              >
                {{ chat.displayName }}
              </span>

              <!-- 🏷️ Customer Status Micro-Badges (Address, Channel, Payment) -->
              <span
                v-if="getCustomerMeta(chat)?.hasAddress"
                class="cust-mini-badge addr"
                title="📍 มีที่อยู่จัดส่งแล้ว"
              >
                <i class="fa-solid fa-location-dot"></i>
              </span>

              <span
                v-if="getCustomerMeta(chat)?.contactChannel"
                class="cust-mini-badge channel"
                :class="getCustomerMeta(chat).contactChannel"
                :title="`ช่องทางติดต่อ: ${getChannelLabel(getCustomerMeta(chat).contactChannel)}`"
              >
                <i :class="getChannelIcon(getCustomerMeta(chat).contactChannel)"></i>
                <span class="mini-txt">{{ getChannelShortText(getCustomerMeta(chat).contactChannel) }}</span>
              </span>

              <span
                v-if="getCustomerMeta(chat)?.paymentType"
                class="cust-mini-badge pay"
                :class="getCustomerMeta(chat).paymentType"
                :title="`การจัดส่ง/ชำระเงิน: ${getCustomerMeta(chat).paymentType === 'cod' ? 'COD (เก็บปลายทาง)' : 'โอนเงิน'}`"
              >
                <i :class="getCustomerMeta(chat).paymentType === 'cod' ? 'fa-solid fa-box' : 'fa-solid fa-money-bill-transfer'"></i>
                <span class="mini-txt">{{ getCustomerMeta(chat).paymentType === 'cod' ? 'COD' : 'โอน' }}</span>
              </span>

              <!-- 🎯 Instant 1-Click Filter Button -->
              <button
                type="button"
                class="btn-author-filter"
                :class="{ 'is-active': isAuthorFiltered(chat) }"
                @click.stop="toggleAuthorFilter(chat)"
                :title="isAuthorFiltered(chat) ? 'ยกเลิกกรองคนนี้' : '🎯 กรองดูเฉพาะคนนี้'"
              >
                <i class="fa-solid fa-filter"></i>
              </button>

              <!-- ✅ Intent Badge Separated (ยกเว้น buy/เอฟ ซ่อนไว้ตามต้องการ) -->
              <span
                v-if="getIntentBadge(chat.type)"
                class="status-badge"
                :class="getIntentBadge(chat.type).class"
              >
                {{ getIntentBadge(chat.type).icon }}
                {{ getIntentBadge(chat.type).label }}
              </span>
              <span v-else-if="chat.type === 'spam'" class="status-emoji-only"
                >💬</span
              >
            </div>

            <div class="chat-bubble">
              <div class="chat-text">
                <!-- ✅ Render message with emoji support -->
                <template
                  v-if="chat.messageRuns && chat.messageRuns.length > 0"
                >
                  <template v-for="(run, idx) in chat.messageRuns" :key="idx">
                    <span v-if="run.text">{{ run.text }}</span>
                    <img
                      v-else-if="run.emoji && run.emoji.image"
                      :src="
                        run.emoji.image.thumbnails?.[0]?.url ||
                        run.emoji.image.url
                      "
                      :alt="run.emoji.emojiId || 'emoji'"
                      class="emoji-image"
                      loading="lazy"
                      decoding="async"
                    />
                  </template>
                </template>
                <!-- ✅ Fallback to plain text -->
                <template v-else>
                  {{ chat.text }}
                </template>
              </div>

              <!-- 🛒 Quick Action Key Button (on hover) -->
              <div class="force-process-btn">
                <button @click="forceProcess(chat)" class="btn-quick-key" title="คีย์ออเดอร์ด่วนสำหรับลูกค้ารายนี้">
                  🛒 คีย์ด่วน
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <button v-if="showScrollButton" class="new-msg-btn" @click="scrollToBottom">
      ข้อความใหม่ ⬇
    </button>

    <!-- ✏️ Modal แก้ไขข้อมูลลูกค้า (ชื่อเล่น, ที่อยู่, ช่องทางติดต่อ) -->
    <CustomerQuickEditModal ref="quickEditModalRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useChatStore } from "../stores/chat";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useAudio } from "../composables/useAudio";
import CustomerQuickEditModal from "./CustomerQuickEditModal.vue";
import { ref as dbRef, update, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";
import { sanitizeDbKey } from "../utils/dbUtils";
import { logger } from "../utils/logger";
import { normalizeName } from "../utils/addressParser";

const chatStore = useChatStore();
const stockStore = useStockStore();
const systemStore = useSystemStore();
const { resetVoice, playSfx } = useAudio();
let chatUnsubscribe = null;

const chatViewport = ref(null);
const quickEditModalRef = ref(null);
const showScrollButton = ref(false);
const displayLimit = ref(200); // ✅ Pagination: Start with last 200 messages
let isUserScrolling = false;

// ✅ Pull-to-Refresh State
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const pullThreshold = 80; // Minimum pull distance to trigger refresh
let touchStartY = 0;
let canPull = false;

const selectedChatTab = ref("all");
const showNewMsgPill = ref(false);

// 👥 Customer Author Filter & Address Sync State
const selectedAuthors = ref([]);
const showAuthorDropdown = ref(false);
const authorSearchQuery = ref("");
const addressBook = ref({});
const deliveryCustomers = ref({});
const cleanupFns = [];

// 🚀 Performance: O(1) Author Name Lookup via Set
const selectedAuthorsSet = computed(() => {
  return new Set(selectedAuthors.value.map((a) => normalizeName(a)));
});

function isAuthorFiltered(chat) {
  if (!chat || selectedAuthors.value.length === 0) return false;
  const name1 = normalizeName(chat.displayName || chat.authorName || "");
  const name2 = chat.realName ? normalizeName(chat.realName) : "";
  return selectedAuthorsSet.value.has(name1) || (name2 && selectedAuthorsSet.value.has(name2));
}

function toggleAuthorFilter(chat) {
  const targetName = chat.displayName || chat.authorName || chat.realName;
  if (!targetName) return;
  toggleAuthorByName(targetName);
}

function toggleAuthorByName(rawName) {
  if (!rawName) return;
  const norm = normalizeName(rawName);
  const idx = selectedAuthors.value.findIndex((a) => normalizeName(a) === norm);
  if (idx >= 0) {
    selectedAuthors.value.splice(idx, 1);
  } else {
    selectedAuthors.value.push(rawName.trim());
  }
}

function removeAuthor(authorName) {
  const norm = normalizeName(authorName);
  selectedAuthors.value = selectedAuthors.value.filter((a) => normalizeName(a) !== norm);
}

function clearAuthorFilter() {
  selectedAuthors.value = [];
  authorSearchQuery.value = "";
}

function selectActiveBuyers() {
  const buyers = new Set();
  if (stockStore.stockData) {
    Object.values(stockStore.stockData).forEach((item) => {
      if (item && item.owner && typeof item.owner === "string") {
        buyers.add(item.owner.trim());
      }
    });
  }
  if (buyers.size === 0) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "ยังไม่มีลูกค้า CF ในรอบนี้",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }
  selectedAuthors.value = Array.from(buyers);
  showAuthorDropdown.value = false;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: `🎯 กรองเฉพาะลูกค้า CF ${buyers.size} รายแล้ว`,
    showConfirmButton: false,
    timer: 2000,
  });
}

// 🏷️ Customer Metadata (Address, Channel, Payment) Fast O(1) Lookup
function getCustomerMeta(chat) {
  if (!chat) return null;
  const rawName = chat.displayName || chat.authorName || "";
  const normName = normalizeName(rawName).replace(/[.#$[\]/]/g, "_");
  const normReal = chat.realName ? normalizeName(chat.realName).replace(/[.#$[\]/]/g, "_") : "";

  // 1. Check address_book
  const book = (normName && addressBook.value[normName]) || (normReal && addressBook.value[normReal]);

  // 2. Check delivery_customers fallback
  const deliv =
    (chat.uid && deliveryCustomers.value[chat.uid]) ||
    (normName && deliveryCustomers.value[normName]) ||
    (normReal && deliveryCustomers.value[normReal]);

  const hasAddress = Boolean(
    (book?.address && book.address.trim()) ||
    (deliv?.address && deliv.address.trim()) ||
    (Array.isArray(book?.addresses) && book.addresses.some((a) => a && a.address && a.address.trim()))
  );
  const contactChannel = book?.contactChannel || deliv?.contactChannel || "";
  const paymentType = book?.paymentType || deliv?.paymentType || "";

  if (!hasAddress && !contactChannel && !paymentType) return null;

  return {
    hasAddress,
    contactChannel,
    paymentType,
  };
}

function getCustomerMetaKey(chat) {
  const meta = getCustomerMeta(chat);
  if (!meta) return "";
  return `${meta.hasAddress ? 1 : 0}_${meta.contactChannel}_${meta.paymentType}`;
}

function getChannelLabel(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทรศัพท์";
  return channel;
}

function getChannelShortText(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทร";
  return channel;
}

function getChannelIcon(channel) {
  if (channel === "line") return "fa-brands fa-line";
  if (channel === "lineoa") return "fa-solid fa-comment-dots";
  if (channel === "phone") return "fa-solid fa-phone";
  return "fa-solid fa-comments";
}

// 👥 Unique Active Chatters for Popover
const activeChatters = computed(() => {
  const map = new Map();
  const msgs = chatStore.messages;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    const name = m.displayName || m.authorName || m.realName;
    if (!name) continue;
    const norm = normalizeName(name);
    if (!map.has(norm)) {
      map.set(norm, {
        name,
        norm,
        count: 1,
        color: m.color,
      });
    } else {
      map.get(norm).count++;
    }
  }
  return Array.from(map.values());
});

const filteredActiveChatters = computed(() => {
  const q = authorSearchQuery.value.trim().toLowerCase();
  if (!q) return activeChatters.value;
  return activeChatters.value.filter((c) => c.name.toLowerCase().includes(q));
});

// 🚀 Performance: Single-pass Filter & Pagination to avoid intermediate array allocations
const visibleMessages = computed(() => {
  const total = chatStore.messages.length;
  const start = Math.max(0, total - displayLimit.value);
  return chatStore.messages.slice(start);
});

const filteredVisibleMessages = computed(() => {
  const allMsgs = chatStore.messages;
  const total = allMsgs.length;
  const tab = selectedChatTab.value;
  const limit = displayLimit.value;
  const authorSet = selectedAuthorsSet.value;
  const hasAuthorFilter = authorSet.size > 0;

  if (tab === "all" && !hasAuthorFilter) {
    const start = Math.max(0, total - limit);
    return allMsgs.slice(start);
  }

  // Filter backwards to get the latest matching limit messages
  const result = [];
  for (let i = total - 1; i >= 0 && result.length < limit; i--) {
    const m = allMsgs[i];

    // 1. Author Filter Check (O(1))
    if (hasAuthorFilter) {
      const n1 = normalizeName(m.displayName || m.authorName || "");
      const n2 = m.realName ? normalizeName(m.realName) : "";
      if (!authorSet.has(n1) && (!n2 || !authorSet.has(n2))) {
        continue;
      }
    }

    // 2. Tab Filter Check
    if (
      tab === "all" ||
      (tab === "buy" && m.type === "buy") ||
      (tab === "cancel" && m.type === "cancel") ||
      (tab === "admin" && (m.isAdmin || m.type === "shipping" || m.type === "question"))
    ) {
      result.unshift(m);
    }
  }
  return result;
});

// ✅ Check if there are more messages to load
const hasMoreMessages = computed(() => {
  return chatStore.messages.length > displayLimit.value;
});

// ✅ Helper: Get Badge Info for Message Intent
function getIntentBadge(type) {
  switch (type) {
    case "buy":
    case "cancel":
    case "shipping":
      return null; // ✅ ซ่อนแบดจ์ "เอฟ", "ยกเลิก", และ "ส่ง" ตามที่ผู้ใช้ต้องการ
    case "question":
      return { icon: "💬", label: "ถาม", class: "badge-question" };
    default:
      return null; // Return null so we can fallback to just 💬 for spam
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ✅ Edit Customer Info Logic (ชื่อเล่น, ที่อยู่, ช่องทางติดต่อ)
function editNickname(chat) {
  if (quickEditModalRef.value) {
    quickEditModalRef.value.open(chat);
  }
}

// ตรวจจับการ Scroll
function handleScroll() {
  const el = chatViewport.value;
  if (!el) return;

  // ถ้า Scroll ขึ้นไปเกิน 30px จากด้านล่าง ถือว่า user กำลังดูประวัติ (หยุด auto-scroll ทันที)
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  isUserScrolling = distanceToBottom > 30;
  showScrollButton.value = isUserScrolling;
}

// ✅ Phase 3.2: Scroll throttle ด้วย requestAnimationFrame
// ป้องกัน Layout Thrashing เมื่อแชทเข้ามารัวๆ — multiple scroll requests ใน 1 frame
// จะถูก coalesce เป็น 1 scroll call แทนที่จะ force layout ทุกครั้ง
let scrollAnimFrame = null;
let scrollPending = false; // ✅ pending flag — ป้องกัน RAF stack ซ้อน

function scrollToBottom(isSmooth = false) {
  const el = chatViewport.value;
  if (!el) return;

  if (isSmooth) {
    // Smooth scroll: execute immediately (user-initiated, no coalescing needed)
    if (scrollAnimFrame) {
      cancelAnimationFrame(scrollAnimFrame);
      scrollAnimFrame = null;
    }
    scrollPending = false;
    el.scrollTo({ top: el.scrollHeight + 1000, behavior: "smooth" });
    showScrollButton.value = false;
    showNewMsgPill.value = false;
    isUserScrolling = false;
  } else {
    // Instant scroll: ถ้ามี RAF pending อยู่แล้ว ไม่ต้อง queue อีก (coalesce)
    if (scrollPending) return;
    scrollPending = true;
    scrollAnimFrame = requestAnimationFrame(() => {
      scrollPending = false;
      scrollAnimFrame = null;
      const container = chatViewport.value;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
      showScrollButton.value = false;
      showNewMsgPill.value = false;
      isUserScrolling = false;
    });
  }
}


// ✅ Load more messages (pagination)
function loadMoreMessages() {
  const el = chatViewport.value;
  if (!el) return;

  // Save current scroll height to preserve position
  const oldScrollHeight = el.scrollHeight;

  // Increase display limit by 200 messages
  displayLimit.value += 200;

  // Wait for DOM update, then adjust scroll to preserve position
  nextTick(() => {
    const newScrollHeight = el.scrollHeight;
    const scrollDiff = newScrollHeight - oldScrollHeight;
    el.scrollTop += scrollDiff;
  });
}

// เมื่อมีข้อความใหม่
watch(
  () => chatStore.messages.length,
  async () => {
    await nextTick();
    // ถ้า User ไม่ได้เลื่อนดูประวัติอยู่ ให้เลื่อนลงอัตโนมัติแบบ instant fast scroll
    if (!isUserScrolling) {
      scrollToBottom(false);
    } else {
      // ถ้าดูประวัติอยู่ ให้โชว์ปุ่มแจ้งเตือน
      showScrollButton.value = true;
    }
  },
);

onMounted(() => {
  scrollToBottom();

  // ✅ Initialize Firebase Chat Sync
  if (systemStore.currentVideoId) {
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = chatStore.syncFromFirebase(systemStore.currentVideoId);
    logger.info("✅ Chat sync initialized for:", systemStore.currentVideoId);
  }

  // ✅ Real-time Address Book Sync for Customer Badges
  const unsubBook = onValue(dbRef(db, "address_book"), (snap) => {
    addressBook.value = snap.val() || {};
  });
  cleanupFns.push(unsubBook);

  // ✅ Real-time Delivery Customers Sync
  const unsubDeliv = onValue(dbRef(db, "delivery_customers"), (snap) => {
    deliveryCustomers.value = snap.val() || {};
  });
  cleanupFns.push(unsubDeliv);
});

onUnmounted(() => {
  // ✅ Clean up real-time Firebase listeners
  cleanupFns.forEach((fn) => {
    if (typeof fn === "function") fn();
  });
  cleanupFns.length = 0;

  // ✅ Phase 3.2: Cancel pending RAF scroll ป้องกัน callback ทำงานหลัง unmount
  if (scrollAnimFrame) {
    cancelAnimationFrame(scrollAnimFrame);
    scrollAnimFrame = null;
  }
  scrollPending = false;
  if (chatUnsubscribe) {
    chatUnsubscribe();
    chatUnsubscribe = null;
  }
});

// ✅ Watch for Video ID changes to re-sync
watch(
  () => systemStore.currentVideoId,
  (newVideoId, oldVideoId) => {
    if (newVideoId && newVideoId !== oldVideoId) {
      logger.info(
        `🔄 Video ID changed from ${oldVideoId} to ${newVideoId}, re-syncing chat...`,
      );
      if (chatUnsubscribe) chatUnsubscribe();
      chatUnsubscribe = chatStore.syncFromFirebase(newVideoId);
    }
  },
);

// ✅ Force Process Logic (🛒 คีย์ด่วน)
async function forceProcess(chat) {
  const el = chatViewport.value;
  const savedScrollTop = el ? el.scrollTop : null;
  const wasAtBottom = el ? (el.scrollHeight - el.scrollTop - el.clientHeight < 50) : false;

  const { value: formValues } = await Swal.fire({
    title: "บังคับตัดสต็อก",
    html:
      `<input id="swal-input1" class="swal2-input" placeholder="รหัสสินค้า (เช่น 1)" value="" autofocus>` +
      `<input id="swal-input2" class="swal2-input" placeholder="ราคา (ไม่ใส่ก็ได้)" value="">`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "บันทึก",
    cancelButtonText: "ยกเลิก",
    heightAuto: false,
    returnFocus: false,
    preConfirm: () => {
      const numVal = document.getElementById("swal-input1")?.value?.trim();
      const priceVal = document.getElementById("swal-input2")?.value?.trim();
      if (!numVal) {
        Swal.showValidationMessage("กรุณาระบุรหัสสินค้า");
        return false;
      }
      return [numVal, priceVal];
    },
  });

  if (formValues) {
    const [num, price] = formValues;
    if (!num) return;

    await stockStore.processOrder(
      parseInt(num),
      chat.displayName, // ใช้ชื่อจากแชท
      chat.uid, // ใช้ UID จากแชท
      "manual-force",
      price ? parseInt(price) : null,
      "manual",
    );

    Swal.fire({
      icon: "success",
      title: `ตัดสต็อกเบอร์ ${num} ให้ ${chat.displayName} แล้ว`,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  }

  // ✅ รักษาตำแหน่ง Scroll เดิมของช่องแชท ไม่ให้เลื่อนขึ้นด้านบนสุดเอง
  if (el && savedScrollTop !== null) {
    nextTick(() => {
      if (wasAtBottom) {
        scrollToBottom(false);
      } else {
        el.scrollTop = savedScrollTop;
      }
    });
  }
}

// ✅ Button Logic
function toggleSound() {
  systemStore.isSoundOn = !systemStore.isSoundOn;
}

function stopVoice() {
  resetVoice();
  Swal.fire({
    icon: "success",
    title: "หยุดเสียงแล้ว",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1000,
  });
}

function exportCSV() {
  if (chatStore.fullChatLog.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีข้อมูล",
      text: "ยังไม่มีข้อความให้บันทึก",
      timer: 1500,
    });
    return;
  }
  chatStore.downloadChatCSV(systemStore.currentVideoId || "chat-log");
  Swal.fire({
    icon: "success",
    title: "บันทึก CSV แล้ว",
    timer: 1500,
    showConfirmButton: false,
  });
}

// ✅ Pull-to-Refresh Touch Handlers
function handleTouchStart(e) {
  const el = chatViewport.value;
  if (!el) return;

  // Only allow pull when at the top of the scroll
  canPull = el.scrollTop === 0;
  if (canPull) {
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchMove(e) {
  if (!canPull || isRefreshing.value) return;

  const touchY = e.touches[0].clientY;
  const delta = touchY - touchStartY;

  // Only trigger pull when dragging down
  if (delta > 0) {
    isPulling.value = true;
    pullDistance.value = Math.min(delta * 0.5, 120); // Add resistance

    // Prevent native pull-to-refresh on iOS
    if (pullDistance.value > 10) {
      e.preventDefault();
    }
  }
}

async function handleTouchEnd() {
  if (!isPulling.value || isRefreshing.value) return;

  isPulling.value = false;

  // Trigger refresh if pulled beyond threshold
  if (pullDistance.value >= pullThreshold) {
    isRefreshing.value = true;

    // Perform refresh
    await refreshChat();

    // Reset after delay
    setTimeout(() => {
      isRefreshing.value = false;
      pullDistance.value = 0;
    }, 500);
  } else {
    // Spring back
    pullDistance.value = 0;
  }

  canPull = false;
}

async function refreshChat() {
  try {
    // Re-sync from Firebase
    if (systemStore.currentVideoId) {
      if (chatUnsubscribe) chatUnsubscribe();
      chatUnsubscribe = chatStore.syncFromFirebase(systemStore.currentVideoId);
    }

    // Scroll to bottom after refresh
    await nextTick();
    scrollToBottom();

    // Show success feedback
    playSfx();
  } catch (error) {
    console.error("Error refreshing chat:", error);
  }
}
</script>

<style scoped>
/* Dark Blue Theme */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #0f172a; /* Deep Blue Background */
  border-left: 1px solid #1e293b;
  position: relative;
}

/* ✅ Pull-to-Refresh Indicator */
.pull-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
  transition: height 0.3s ease-out;
  color: #64748b;
  font-size: 0.9em;
  gap: 8px;
}

.pull-indicator i {
  font-size: 1.5em;
  transition: transform 0.2s ease;
}

.pull-indicator.pulling i {
  transform: rotate(180deg);
  color: #3b82f6;
}

.pull-indicator.refreshing i {
  animation: spin 1s linear infinite;
  color: #10b981;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.tools-bar {
  padding: 10px 15px;
  background-color: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.chat-controls {
  display: flex;
  gap: 8px;
}

.btn-tool {
  background: #334155;
  color: #e2e8f0;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85em;
  font-family: "Kanit", sans-serif;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.btn-tool:hover {
  background: #475569;
  transform: translateY(-1px);
}

.btn-tool:active {
  transform: translateY(0);
}

.btn-tool.muted {
  background: #475569;
  opacity: 0.7;
}

.btn-tool.btn-csv {
  background: #10b981; /* Green */
  color: white;
  font-weight: 500;
}

.btn-tool.btn-csv:hover {
  background: #059669;
}

#chat-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 15px 5px; /* ✅ Reduced side padding */
  padding-bottom: calc(
    20px + env(safe-area-inset-bottom)
  ); /* ✅ Safe Area for Mobile */
  scroll-behavior: smooth;
}

#chat-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chat-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
  position: relative;
}

.chat-row:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

/* 🛒 Neon Emerald Glass Card (Buy / CF) */
.chat-row.buy {
  background: linear-gradient(135deg, rgba(0, 230, 118, 0.16) 0%, rgba(0, 200, 83, 0.06) 100%);
  border: 1.5px solid rgba(0, 230, 118, 0.4);
  box-shadow: 0 4px 15px rgba(0, 230, 118, 0.14);
}

.chat-row.buy .chat-bubble {
  background: rgba(0, 200, 83, 0.18);
  border: 1px solid rgba(0, 230, 118, 0.3);
  color: #ffffff;
  font-weight: 600;
  font-size: 1.02em;
}

/* ❌ Coral Amber Glass Card (Cancel) */
.chat-row.cancel {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.16) 0%, rgba(185, 28, 28, 0.06) 100%);
  border: 1.5px solid rgba(239, 68, 68, 0.4);
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.14);
}

.chat-row.cancel .chat-bubble {
  background: rgba(185, 28, 28, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

/* 📦 Shipping Message */
.chat-row.shipping {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(126, 34, 206, 0.06) 100%);
  border: 1.5px solid rgba(168, 85, 247, 0.4);
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.14);
}

.chat-row.shipping .chat-bubble {
  background: rgba(126, 34, 206, 0.25);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #ffffff;
}

/* 👑 Admin / Proxy Message */
.chat-row.admin {
  background: linear-gradient(135deg, rgba(124, 77, 255, 0.18) 0%, rgba(81, 45, 168, 0.06) 100%);
  border: 1.5px solid rgba(124, 77, 255, 0.4);
  box-shadow: 0 4px 15px rgba(124, 77, 255, 0.14);
}

.chat-row.admin .chat-bubble {
  background: rgba(81, 45, 168, 0.2);
  border: 1px solid rgba(124, 77, 255, 0.3);
  color: #ffffff;
}

/* ✅ TransitionGroup Animations */
.chat-list-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-list-leave-active {
  transition: all 0.2s ease-in;
}

.chat-list-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.chat-list-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}

.avatar-container {
  flex-shrink: 0;
  position: relative;
  width: 38px;
  height: 38px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  object-fit: cover;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.chat-row.buy .avatar {
  border-color: #00e676;
  box-shadow: 0 0 8px rgba(0, 230, 118, 0.4);
}

.chat-row.admin .avatar {
  border-color: #7c4dff;
  box-shadow: 0 0 8px rgba(124, 77, 255, 0.4);
}

/* ✅ Avatar Fallback (Letter Avatar) */
.avatar-fallback {
  position: absolute;
  top: 0;
  left: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: bold;
  font-size: 1.1em;
  text-transform: uppercase;
  pointer-events: none;
}

/* Hide fallback when image is visible */
.avatar-container img[style*="display: none"] ~ .avatar-fallback {
  display: flex;
}

.avatar-container img:not([style*="display: none"]) ~ .avatar-fallback {
  display: none;
}

.chat-bubble-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.chat-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 5px;
  font-size: 0.85em;
}

.chat-time {
  color: #94a3b8;
  font-size: 0.88em;
  font-family: monospace;
  font-weight: 600;
}

.chat-name {
  font-weight: 700;
  color: #000;
  padding: 2px 10px;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.chat-name:hover {
  transform: scale(1.05);
  opacity: 0.95;
}

.real-name {
  color: #94a3b8;
  font-size: 0.88em;
}

.admin-badge {
  background-color: #7c4dff;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75em;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chat-bubble {
  background-color: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  padding: 10px 14px;
  border-radius: 4px 14px 14px 14px;
  font-size: 0.98em;
  line-height: 1.45;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* ✅ Status Badges (Independent) */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.82em;
  font-weight: 800;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
}

.badge-buy {
  background: #00e676;
  color: #000;
  box-shadow: 0 2px 8px rgba(0, 230, 118, 0.4);
}

.badge-cancel {
  background: #ef4444;
  color: #fff;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.badge-shipping {
  background: linear-gradient(135deg, #a855f7, #7c3aed);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4);
}

.badge-question {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.status-emoji-only {
  font-size: 0.9em;
}

/* ✅ YouTube Emoji Styling */
.emoji-image {
  height: 1.5em;
  width: auto;
  vertical-align: middle;
  display: inline-block;
  margin: 0 2px;
  object-fit: contain;
}

/* Special Types */
.chat-row.buy .chat-bubble {
  background-color: rgba(16, 185, 129, 0.12);
  border: 1.5px solid rgba(16, 185, 129, 0.5);
  border-left: 3px solid #10b981;
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
  color: #f1f5f9;
}

.chat-row.cancel .chat-bubble {
  background-color: rgba(244, 63, 94, 0.12);
  border: 1.5px solid rgba(244, 63, 94, 0.5);
  border-left: 3px solid #f43f5e;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.15);
  color: #f1f5f9;
}

.chat-row.shipping .chat-bubble {
  background-color: rgba(168, 85, 247, 0.12);
  border: 1.5px solid rgba(168, 85, 247, 0.5);
  border-left: 3px solid #a855f7;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.15);
  color: #f1f5f9;
}

.chat-row.admin .chat-bubble {
  border: 1px solid #f59e0b; /* Gold border for Admin */
}

.force-process-btn {
  position: absolute;
  right: -35px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

/* ✅ Desktop: Show on hover */
@media (min-width: 1025px) {
  .chat-bubble:hover .force-process-btn {
    opacity: 1;
  }
}

/* ✅ Mobile/Tablet: Always show with medium opacity */
@media (max-width: 1024px) {
  .force-process-btn {
    opacity: 0.6;
    right: -32px; /* Slightly closer on mobile */
  }
}

.btn-mini {
  background: #334155;
  border: none;
  color: #94a3b8;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8em;
}

.btn-mini:hover {
  background: #f59e0b;
  color: white;
}

.new-msg-btn {
  position: absolute;
  bottom: 20px; /* ✅ Adjusted position */
  left: 0; /* ✅ Center alignment start */
  right: 0; /* ✅ Center alignment end */
  margin: 0 auto; /* ✅ Center alignment magic */
  width: fit-content; /* ✅ Prevent full width */

  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: 25px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
  z-index: 20;
  animation: bounce 2s infinite;
  transition: all 0.3s ease;
}

.new-msg-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.6);
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-5px);
  }
  60% {
    transform: translateY(-3px);
  }
}

/* ✅ Load Previous Messages Button */
.load-more-btn {
  display: block;
  margin: 10px auto 15px;
  padding: 8px 16px;
  background: #334155;
  color: #94a3b8;
  border: 1px solid #475569;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-family: "Kanit", sans-serif;
}

.load-more-btn:hover {
  background: #475569;
  color: #e2e8f0;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.load-more-btn:active {
  transform: translateY(0);
}

/* ✅ Mobile Responsive */
@media (max-width: 768px) {
  .avatar {
    width: 32px;
    height: 32px;
  }

  .new-msg-btn {
    bottom: 20px;
    /* right removed - using centered positioning */
    padding: 8px 14px;
    font-size: 0.9em;
  }
}

/* Scrollbar */
#chat-viewport::-webkit-scrollbar {
  width: 6px;
}
#chat-viewport::-webkit-scrollbar-track {
  background: #0f172a;
}
#chat-viewport::-webkit-scrollbar-thumb {
  background: #334155;
  border-radius: 3px;
}
#chat-viewport::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* ========================================================
   🏷️ Customer Micro-Badges & Author Filter Styles
   ======================================================== */

/* 🏷️ Customer Micro-Badges in chat-meta */
.cust-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72em;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: middle;
  letter-spacing: 0.2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.cust-mini-badge .mini-txt {
  font-size: 0.95em;
}

/* 📍 Has Address Badge */
.cust-mini-badge.addr {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.45);
}

/* 💬 Contact Channel Badges */
.cust-mini-badge.channel.line {
  background: rgba(6, 199, 85, 0.2);
  color: #22c55e;
  border: 1px solid rgba(6, 199, 85, 0.45);
}

.cust-mini-badge.channel.lineoa {
  background: rgba(6, 199, 85, 0.25);
  color: #4ade80;
  border: 1px solid rgba(6, 199, 85, 0.55);
}

.cust-mini-badge.channel.phone {
  background: rgba(2, 132, 199, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(2, 132, 199, 0.45);
}

/* 💳 Payment / Delivery Type Badges */
.cust-mini-badge.pay.transfer {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.45);
}

.cust-mini-badge.pay.cod {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.45);
}

/* 🎯 Instant 1-Click Filter Button on Chat Row */
.btn-author-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.78em;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
}

.btn-author-filter:hover {
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
  transform: scale(1.08);
}

.btn-author-filter.is-active {
  color: #0f172a;
  background: #f59e0b;
  border-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
}

/* 🎯 Active Author Filter Bar */
.active-author-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(245, 158, 11, 0.12);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  gap: 8px;
  animation: fadeIn 0.2s ease;
}

.active-author-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.active-author-label {
  font-size: 0.82em;
  font-weight: 600;
  color: #fbbf24;
  white-space: nowrap;
}

.active-author-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.author-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  background: #f59e0b;
  color: #0f172a;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 700;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
}

.chip-remove-btn {
  background: transparent;
  border: none;
  color: #0f172a;
  cursor: pointer;
  padding: 0;
  font-size: 0.85em;
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.15s;
}

.chip-remove-btn:hover {
  opacity: 1;
  transform: scale(1.15);
}

.btn-clear-author-filter {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.78em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-clear-author-filter:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}

/* 👥 Author Filter Popover Dropdown */
.author-dropdown-popover {
  position: absolute;
  top: 92px;
  left: 10px;
  right: 10px;
  max-width: 360px;
  z-index: 100;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: fadeIn 0.2s ease;
}

.author-popover-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.popover-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.86em;
  font-weight: 600;
  color: #f1f5f9;
}

.popover-close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  font-size: 0.9em;
}

.popover-close-btn:hover {
  color: #fff;
}

.author-search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.author-search-box .search-icon {
  position: absolute;
  left: 10px;
  color: #64748b;
  font-size: 0.82em;
}

.author-search-input {
  width: 100%;
  padding: 6px 28px 6px 30px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 0.84em;
  font-family: inherit;
}

.author-search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.clear-search-btn {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
}

.author-popover-actions {
  display: flex;
  gap: 6px;
}

.btn-popover-act {
  flex: 1;
  padding: 5px 8px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  border-radius: 6px;
  font-size: 0.78em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-popover-act:hover {
  background: rgba(59, 130, 246, 0.3);
  color: #fff;
}

.btn-popover-act.clear {
  flex: 0 0 auto;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #f87171;
}

.btn-popover-act.clear:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fff;
}

.author-list-scroll {
  max-height: 220px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.author-item-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.author-item-row.selected {
  background: rgba(245, 158, 11, 0.15);
}

.author-checkbox {
  cursor: pointer;
  accent-color: #f59e0b;
}

.author-item-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72em;
  font-weight: 700;
  color: #000;
  flex-shrink: 0;
}

.author-item-name {
  flex: 1;
  font-size: 0.84em;
  font-weight: 500;
  color: #e2e8f0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-item-count {
  font-size: 0.74em;
  color: #94a3b8;
}

.author-empty {
  text-align: center;
  padding: 16px;
  color: #64748b;
  font-size: 0.82em;
}

/* Tab Active Color for Author Filter */
.chat-tab.tab-author.active {
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.5);
  color: #fbbf24;
}
</style>

<template>
  <div class="chat-panel" :class="{ 'collapsed': systemStore.isChatCollapsed }">
    <!-- 🌟 Redesigned Modern Live Chat Header Bar -->
    <div class="chat-header-bar">
      <div class="chat-header-left">
        <div class="chat-title-group">
          <i class="fa-solid fa-comments chat-icon"></i>
          <span class="chat-title">Live Chat</span>
        </div>
        <span class="chat-live-pill" title="กำลังเชื่อมต่อสตรีมสด">
          <span class="pulse-dot"></span>
          <span class="live-text">LIVE</span>
        </span>
      </div>

      <div class="chat-header-actions">
        <!-- 🔊 Sound Toggle -->
        <button
          type="button"
          class="chat-act-btn btn-sound"
          :class="{ 'is-muted': !systemStore.isSoundOn }"
          @click="toggleSound"
          :title="systemStore.isSoundOn ? 'เสียงอ่าน: เปิด (คลิกเพื่อปิด หรือ Shift+M)' : 'เสียงอ่าน: ปิด (คลิกเพื่อเปิด หรือ Shift+M)'"
        >
          <i :class="systemStore.isSoundOn ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark'"></i>
          <span class="act-label">{{ systemStore.isSoundOn ? 'เสียง' : 'ปิด' }}</span>
        </button>

        <!-- ⏹ Stop Voice -->
        <button
          type="button"
          class="chat-act-btn btn-stop"
          @click="stopVoice"
          title="หยุดเสียงอ่านทันที"
        >
          <i class="fa-solid fa-stop"></i>
          <span class="act-label">หยุด</span>
        </button>

        <!-- 📥 CSV Export -->
        <button
          type="button"
          class="chat-act-btn btn-csv"
          @click="exportCSV"
          title="ส่งออกแชททั้งหมดเป็นไฟล์ CSV"
        >
          <i class="fa-solid fa-file-csv"></i>
          <span class="act-label">CSV</span>
        </button>

        <div class="chat-act-divider"></div>

        <!-- ⇥ Collapse / Hide Chat -->
        <button
          type="button"
          class="chat-act-btn btn-collapse"
          @click="systemStore.toggleChatCollapse"
          title="ซ่อนช่องแชท (Alt + C) เพื่อขยายตารางสต็อกเต็มจอ"
        >
          <i class="fa-solid fa-angles-right"></i>
          <span class="act-label">ซ่อน</span>
        </button>
      </div>
    </div>

    <!-- 🏷️ Chat Intent Filter Tabs -->
    <div class="chat-intent-tabs">
      <button class="chat-tab" :class="{ active: selectedChatTab === 'all' }" @click="selectedChatTab = 'all'">ทั้งหมด</button>
      <button class="chat-tab tab-cf" :class="{ active: selectedChatTab === 'buy' }" @click="selectedChatTab = 'buy'">🛒 จอง (CF)</button>
      <button class="chat-tab tab-shipping" :class="{ active: selectedChatTab === 'shipping' }" @click="selectedChatTab = 'shipping'">🚚 ส่ง</button>
      <button class="chat-tab tab-cancel" :class="{ active: selectedChatTab === 'cancel' }" @click="selectedChatTab = 'cancel'">❌ ยกเลิก</button>
      <button class="chat-tab tab-admin" :class="{ active: selectedChatTab === 'admin' }" @click="selectedChatTab = 'admin'">⚡ แอดมิน</button>
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
          :style="getChatRowStyle(chat)"
        >

          <!-- Avatar Left Column (Avatar + Action Badge under it) -->
          <div class="avatar-col">
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

            <!-- 🏷️ Intent Action Badge Under Profile Avatar (จอง / ส่ง / ยกเลิก) -->
            <span
              v-if="getIntentBadge(chat.type)"
              class="status-badge-under"
              :class="getIntentBadge(chat.type).class"
            >
              {{ getIntentBadge(chat.type).icon }} {{ getIntentBadge(chat.type).label }}
            </span>
            <span
              v-else-if="chat.type === 'spam'"
              class="status-badge-under badge-spam status-emoji-only"
            >
              💬
            </span>
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

              <!-- 🏷️ Customer Status Micro-Badges Cluster (Address, Channel, Payment) -->
              <div
                v-if="getCustomerMeta(chat)?.hasAddress || getCustomerMeta(chat)?.contactChannel || getCustomerMeta(chat)?.paymentType"
                class="cust-meta-cluster"
              >
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
              </div>

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
            </div>


            <div class="chat-bubble">
              <div class="chat-text">
                <!-- 🌟 Highlight proxy customer name in admin message -->
                <template v-if="getAdminProxyCustomerName(chat)">
                  <span v-html="renderAdminProxyText(chat)" @click="handleChatTextClick($event, chat)"></span>
                </template>
                <!-- ✅ Render message with emoji & YouTube custom emote support -->
                <template
                  v-else-if="getChatRuns(chat)"
                >
                  <template v-for="(run, idx) in getChatRuns(chat)" :key="idx">
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
import { sanitizeDbKey, escapeHtml } from "../utils/dbUtils";
import { extractAdminCustomerName, getCustomerColorTheme } from "../utils/chatParserUtils";
import { parseYouTubeEmotesToRuns, hasYouTubeEmotes } from "../data/youtubeEmotes";
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
let pullResetTimer = null;

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

// 👤 ดึงชื่อลูกค้าเป้าหมายสำหรับข้อความที่ admin จองให้/สั่งส่งให้
function getAdminProxyCustomerName(chat) {
  if (!chat) return null;
  const isMsgAdmin =
    chat.isAdmin ||
    /admin|แอดมิน/i.test(chat.displayName || chat.authorName || "");

  // 1. ตรวจสอบ proxyCustomerName ที่บันทึกไว้ (พร้อมทำความสะอาดหากบันทึกคำสั่งติดไปด้วย เช่น "วาศินา เอาไปฝากคนอื่นด้วย")
  if (chat.proxyCustomerName) {
    const cleaned = extractAdminCustomerName(chat.proxyCustomerName);
    if (cleaned) return cleaned;
    return chat.proxyCustomerName;
  }

  // 2. หากยังไม่มี proxyCustomerName ให้สกัดจากข้อความแอดมิน
  if (isMsgAdmin && chat.text) {
    return extractAdminCustomerName(chat.text);
  }
  return null;
}

// 🏷️ Customer Metadata (Address, Channel, Payment) Fast O(1) Lookup
function getCustomerMeta(chat) {
  if (!chat) return null;
  const proxyName = getAdminProxyCustomerName(chat);
  const rawName = proxyName || chat.displayName || chat.authorName || "";
  const normName = normalizeName(rawName).replace(/[.#$[\]/]/g, "_");
  const normReal = !proxyName && chat.realName ? normalizeName(chat.realName).replace(/[.#$[\]/]/g, "_") : "";

  // 1. Check address_book
  const book = (normName && addressBook.value[normName]) || (normReal && addressBook.value[normReal]);

  // 2. Check delivery_customers fallback
  const targetUid = proxyName ? (chat.proxyUid || null) : chat.uid;
  const deliv =
    (targetUid && deliveryCustomers.value[targetUid]) ||
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
  const proxyName = getAdminProxyCustomerName(chat) || "";
  if (!meta) return proxyName;
  return `${proxyName}_${meta.hasAddress ? 1 : 0}_${meta.contactChannel}_${meta.paymentType}`;
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
      (tab === "shipping" && m.type === "shipping") ||
      (tab === "cancel" && m.type === "cancel") ||
      (tab === "admin" && (m.isAdmin || m.type === "question"))
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
      return { icon: "🛒", label: "จอง", class: "badge-buy" };
    case "shipping":
      return { icon: "🚚", label: "ส่ง", class: "badge-shipping" };
    case "cancel":
      return { icon: "❌", label: "ยกเลิก", class: "badge-cancel" };
    case "question":
      return { icon: "💬", label: "ถาม", class: "badge-question" };
    default:
      return null;
  }
}

// 🎨 Helper: Generate vibrant, unified background tint and accent border from customer signature color
function getChatRowStyle(chat) {
  if (!chat) return {};
  // Priority actions use dedicated class themes (buy, shipping, cancel, admin)
  if (chat.type === "buy" || chat.type === "shipping" || chat.type === "cancel" || chat.isAdmin) {
    return {};
  }

  const rawColor = chat.color;
  if (!rawColor) return {};

  let tint25 = "rgba(56, 189, 248, 0.25)";
  let tint30 = "rgba(56, 189, 248, 0.30)";
  let tint55 = "rgba(56, 189, 248, 0.55)";
  let tint22 = "rgba(56, 189, 248, 0.22)";

  if (rawColor.startsWith("hsl")) {
    tint25 = rawColor.replace("hsl(", "hsla(").replace(")", ", 0.25)");
    tint30 = rawColor.replace("hsl(", "hsla(").replace(")", ", 0.30)");
    tint55 = rawColor.replace("hsl(", "hsla(").replace(")", ", 0.55)");
    tint22 = rawColor.replace("hsl(", "hsla(").replace(")", ", 0.22)");
  } else if (rawColor.startsWith("#")) {
    const hex = rawColor.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      tint25 = `rgba(${r}, ${g}, ${b}, 0.25)`;
      tint30 = `rgba(${r}, ${g}, ${b}, 0.30)`;
      tint55 = `rgba(${r}, ${g}, ${b}, 0.55)`;
      tint22 = `rgba(${r}, ${g}, ${b}, 0.22)`;
    }
  }

  return {
    borderLeft: `4.5px solid ${rawColor}`,
    borderColor: tint55,
    background: `linear-gradient(135deg, ${tint25} 0%, rgba(15, 23, 42, 0.75) 100%)`,
    boxShadow: `0 4px 16px ${tint22}`,
    "--bubble-bg": tint30,
    "--bubble-border": tint55,
    "--bubble-glow": tint22,
  };
}



function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ✏️ เปิด Modal แก้ไขข้อมูลลูกค้าของ proxy customer
function editProxyCustomer(chat) {
  const proxyName = getAdminProxyCustomerName(chat);
  if (!proxyName) return;
  if (quickEditModalRef.value) {
    quickEditModalRef.value.open({
      displayName: proxyName,
      realName: proxyName,
      authorName: proxyName,
      uid: chat.proxyUid || null,
    });
  }
}

// ✅ Edit Customer Info Logic (ชื่อเล่น, ที่อยู่, ช่องทางติดต่อ)
function editNickname(chat) {
  const proxyName = getAdminProxyCustomerName(chat);
  if (proxyName) {
    editProxyCustomer(chat);
    return;
  }
  if (quickEditModalRef.value) {
    quickEditModalRef.value.open(chat);
  }
}

// 🌟 เรนเดอร์ข้อความแชทพร้อมไฮไลต์ชื่อลูกค้าที่ admin จองให้
function renderAdminProxyText(chat) {
  const text = chat?.text || "";
  const proxyName = getAdminProxyCustomerName(chat);
  if (!proxyName || !text) return escapeHtml(text);

  const escapedText = escapeHtml(text);
  const escapedName = escapeHtml(proxyName);
  const themeIdx = getCustomerColorTheme(proxyName);

  // ป้องกัน regex special characters ในชื่อ
  const regexSafe = escapedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${regexSafe})`, "gi");
  return escapedText.replace(
    regex,
    `<span class="chat-highlight-name theme-${themeIdx}" title="คลิกเพื่อแก้ไขข้อมูลลูกค้า: $1"><i class="fa-solid fa-user-tag name-icon"></i>$1</span>`
  );
}

function handleChatTextClick(event, chat) {
  if (event?.target && event.target.closest(".chat-highlight-name")) {
    event.stopPropagation();
    editProxyCustomer(chat);
  }
}

// 🌟 Helper: Resolves message runs with automatic detection of YouTube official custom emotes
function getChatRuns(chat) {
  if (!chat) return null;
  if (chat.messageRuns && chat.messageRuns.length > 0) {
    if (chat.messageRuns.some((r) => r.text && hasYouTubeEmotes(r.text))) {
      return chat.messageRuns.flatMap((run) => {
        if (run.text && hasYouTubeEmotes(run.text)) {
          return parseYouTubeEmotesToRuns(run.text);
        }
        return [run];
      });
    }
    return chat.messageRuns;
  }
  if (chat.text && hasYouTubeEmotes(chat.text)) {
    return parseYouTubeEmotesToRuns(chat.text);
  }
  return null;
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
  if (pullResetTimer) {
    clearTimeout(pullResetTimer);
    pullResetTimer = null;
  }
  if (typeof Swal !== "undefined" && Swal.isVisible()) {
    Swal.close();
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

// ✅ Watch for chat collapse / expand: Reset unread counter and auto-scroll to bottom on expand
watch(
  () => systemStore.isChatCollapsed,
  (isCollapsed) => {
    if (!isCollapsed) {
      chatStore.resetUnreadCollapsed();
      nextTick(() => {
        if (chatViewport.value) {
          chatViewport.value.scrollTop = chatViewport.value.scrollHeight;
        }
      });
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
    if (pullResetTimer) clearTimeout(pullResetTimer);
    pullResetTimer = setTimeout(() => {
      isRefreshing.value = false;
      pullDistance.value = 0;
      pullResetTimer = null;
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
/* Dark Obsidian Theme */
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #0b0f17; /* Deep Obsidian Background */
  border-left: 1px solid rgba(251, 191, 36, 0.12);
  position: relative;
}

/* ✅ Pull-to-Refresh Indicator */
.pull-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(13, 17, 28, 0.95) 0%, rgba(11, 15, 23, 0.98) 100%);
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
  color: #38bdf8;
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

/* ========================================
   🌟 MODERN CHAT HEADER BAR
   ======================================== */
.chat-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(180deg, rgba(11, 15, 23, 0.98) 0%, rgba(13, 17, 28, 0.95) 100%);
  border-bottom: 1px solid rgba(251, 191, 36, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  position: relative;
  z-index: 20;
  gap: 8px;
  min-height: 46px;
  box-sizing: border-box;
}


.chat-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.chat-title-group {
  display: flex;
  align-items: center;
  gap: 7px;
}

.chat-icon {
  font-size: 1.15em;
  color: #38bdf8;
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.45));
}

.chat-title {
  font-family: "Kanit", sans-serif;
  font-weight: 700;
  font-size: 1.05em;
  letter-spacing: 0.3px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
}

.chat-live-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);
  padding: 2px 7px;
  border-radius: 20px;
  user-select: none;
}

.chat-live-pill .pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 6px #ef4444;
  animation: liveBlink 1.6s ease-in-out infinite;
}

.chat-live-pill .live-text {
  font-size: 0.65em;
  font-weight: 800;
  color: #f87171;
  letter-spacing: 0.8px;
}

@keyframes liveBlink {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: nowrap;
}

.chat-act-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 0.82em;
  font-weight: 600;
  font-family: "Kanit", sans-serif;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  white-space: nowrap;
  user-select: none;
}

.chat-act-btn i {
  font-size: 0.9em;
}

/* 🔊 Sound Button */
.chat-act-btn.btn-sound {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.28);
}

.chat-act-btn.btn-sound:hover {
  background: rgba(16, 185, 129, 0.24);
  color: #ffffff;
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
  transform: translateY(-1px);
}

.chat-act-btn.btn-sound.is-muted {
  background: rgba(100, 116, 139, 0.15);
  color: #94a3b8;
  border-color: rgba(100, 116, 139, 0.25);
}

.chat-act-btn.btn-sound.is-muted:hover {
  background: rgba(239, 68, 68, 0.18);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}

/* ⏹ Stop Voice Button */
.chat-act-btn.btn-stop {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.28);
}

.chat-act-btn.btn-stop:hover {
  background: rgba(245, 158, 11, 0.24);
  color: #ffffff;
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  transform: translateY(-1px);
}

.chat-act-btn.btn-stop:active {
  transform: scale(0.95);
}

/* 📥 CSV Export Button */
.chat-act-btn.btn-csv {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.28);
}

.chat-act-btn.btn-csv:hover {
  background: rgba(59, 130, 246, 0.24);
  color: #ffffff;
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
}

/* Separator */
.chat-act-divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 2px;
  flex-shrink: 0;
}

/* ⇥ Collapse Button */
.chat-act-btn.btn-collapse {
  background: rgba(244, 63, 94, 0.14);
  color: #fb7185;
  border-color: rgba(244, 63, 94, 0.3);
}

.chat-act-btn.btn-collapse:hover {
  background: rgba(244, 63, 94, 0.28);
  color: #ffffff;
  border-color: #f43f5e;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.35);
  transform: translateX(2px);
}

.chat-act-btn.btn-collapse i {
  transition: transform 0.2s ease;
}

.chat-act-btn.btn-collapse:hover i {
  transform: translateX(2px);
}

/* Responsive adjustment for narrow screens */
@media (max-width: 380px) {
  .chat-act-btn .act-label {
    display: none;
  }
  .chat-act-btn {
    padding: 6px 8px;
  }
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

/* 🛒 Luxury Emerald Glass Card (Buy / CF) */
.chat-row.buy {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(245, 158, 11, 0.08) 100%) !important;
  border: 1.5px solid rgba(16, 185, 129, 0.6) !important;
  border-left: 4.5px solid #10b981 !important;
  box-shadow: 0 4px 18px rgba(16, 185, 129, 0.22) !important;
}

.chat-row.buy .chat-bubble {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #ffffff;
  font-weight: 600;
  font-size: 1.02em;
}

/* ❌ Coral Amber Glass Card (Cancel) */
.chat-row.cancel {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(220, 38, 38, 0.08) 100%) !important;
  border: 1.5px solid rgba(239, 68, 68, 0.6) !important;
  border-left: 4.5px solid #ef4444 !important;
  box-shadow: 0 4px 18px rgba(239, 68, 68, 0.22) !important;
}

.chat-row.cancel .chat-bubble {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #ffffff;
}

/* 📦 Shipping Message (Royal Violet) */
.chat-row.shipping {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(126, 34, 206, 0.08) 100%) !important;
  border: 1.5px solid rgba(168, 85, 247, 0.6) !important;
  border-left: 4.5px solid #a855f7 !important;
  box-shadow: 0 4px 18px rgba(168, 85, 247, 0.22) !important;
}

.chat-row.shipping .chat-bubble {
  background: rgba(168, 85, 247, 0.18);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #ffffff;
}

/* 👑 Admin / Proxy Message */
.chat-row.admin {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(124, 77, 255, 0.08) 100%) !important;
  border: 1.5px solid rgba(245, 158, 11, 0.5) !important;
  border-left: 4.5px solid #fbbf24 !important;
  box-shadow: 0 4px 18px rgba(245, 158, 11, 0.18) !important;
}

.chat-row.admin .chat-bubble {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
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

.avatar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 48px;
  gap: 4px;
}

.status-badge-under {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 2.5px 6px;
  border-radius: 8px;
  font-size: 0.68em;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  line-height: 1.2;
  letter-spacing: -0.2px;
}

.status-badge-under.badge-spam {
  background: rgba(100, 116, 139, 0.4);
  color: #94a3b8;
  padding: 1px 4px;
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
  border-color: #10b981;
  box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.chat-row.shipping .avatar {
  border-color: #a855f7;
  box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
}

.chat-row.cancel .avatar {
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.chat-row.admin .avatar {
  border-color: #fbbf24;
  box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
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
  flex-wrap: nowrap;
  gap: 4px;
  margin-bottom: 5px;
  font-size: 0.85em;
  min-width: 0;
  width: 100%;
}

.chat-time {
  color: #94a3b8;
  font-size: 0.85em;
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}

.chat-name {
  font-weight: 700;
  color: #000;
  padding: 1.5px 8px;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, opacity 0.2s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 0 1 auto;
}

.chat-name:hover {
  transform: scale(1.03);
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
  background-color: var(--bubble-bg, rgba(20, 27, 45, 0.75));
  border: 1.5px solid var(--bubble-border, rgba(255, 255, 255, 0.12));
  color: #ffffff;
  padding: 10px 14px;
  border-radius: 4px 14px 14px 14px;
  font-size: 0.98em;
  line-height: 1.45;
  position: relative;
  box-shadow: 0 4px 14px var(--bubble-glow, rgba(0, 0, 0, 0.2));
  backdrop-filter: blur(8px);
}

.chat-text {
  color: #ffffff;
  font-weight: 600;
  text-shadow:
    -1px -1px 0 #000000,
     0px -1px 0 #000000,
     1px -1px 0 #000000,
    -1px  0px 0 #000000,
     1px  0px 0 #000000,
    -1px  1px 0 #000000,
     0px  1px 0 #000000,
     1px  1px 0 #000000,
     0px  2px 4px rgba(0, 0, 0, 0.9);
  letter-spacing: 0.3px;
  word-break: break-word;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: 1px solid rgba(52, 211, 153, 0.5);
  box-shadow: 0 2px 10px rgba(16, 185, 129, 0.45);
}

.badge-cancel {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  border: 1px solid rgba(248, 113, 113, 0.5);
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.45);
}

.badge-shipping {
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #ffffff;
  border: 1px solid rgba(192, 132, 252, 0.5);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  box-shadow: 0 2px 10px rgba(168, 85, 247, 0.45);
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
  height: 1.45em;
  width: auto;
  vertical-align: -0.22em;
  display: inline-block;
  margin: 0 2.5px;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.45));
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

  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95) 0%, rgba(245, 158, 11, 0.95) 100%);
  color: #ffffff;
  border: 1px solid rgba(251, 191, 36, 0.4);
  padding: 8px 20px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 0.9em;
  letter-spacing: 0.3px;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5), 0 0 16px rgba(16, 185, 129, 0.4);
  z-index: 50;
  animation: bounce 2s infinite;
  transition: all 0.25s ease;
  backdrop-filter: blur(8px);
}

.new-msg-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 22px rgba(251, 191, 36, 0.6);
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

/* 🏷️ Customer Metadata Badges Cluster (Address, Channel, Payment) */
.cust-meta-cluster {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  white-space: nowrap;
}

/* 🏷️ Customer Micro-Badges in chat-meta */
.cust-mini-badge {
  display: inline-flex;
  align-items: center;
  gap: 2.5px;
  font-size: 0.70em;
  padding: 1px 5px;
  border-radius: 4px;
  font-weight: 600;
  line-height: 1.35;
  vertical-align: middle;
  letter-spacing: 0.2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  white-space: nowrap;
}

.cust-mini-badge .mini-txt {
  font-size: 0.95em;
}

/* 📍 Has Address Badge */
.cust-mini-badge.addr {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.45);
  padding: 1px 4px;
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
  background: rgba(147, 51, 234, 0.22);
  color: #c084fc;
  border: 1px solid rgba(147, 51, 234, 0.55);
}

.cust-mini-badge.pay.cod {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.45);
}

/* 🌟 Customer Name Highlight in Chat Bubble Text (Deep selector for v-html) */
:deep(.chat-highlight-name) {
  display: inline-flex !important;
  align-items: center !important;
  font-weight: 700 !important;
  padding: 2px 9px !important;
  margin: 0 3px !important;
  border-radius: 8px !important;
  font-size: 0.95em !important;
  line-height: 1.35 !important;
  cursor: pointer !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  vertical-align: middle !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
  border: 1.5px solid rgba(255, 255, 255, 0.3) !important;
}

:deep(.chat-highlight-name .name-icon) {
  font-size: 0.78em !important;
  margin-right: 5px !important;
  opacity: 0.9 !important;
  vertical-align: middle !important;
}

:deep(.chat-highlight-name:hover) {
  transform: translateY(-1px) scale(1.03) !important;
  filter: brightness(1.2) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5) !important;
}

/* 🎨 12 Distinct Customer Themes (Reserved exclusively to Blues, Cyans, Magentas, and Pinks) */
/* 0. Pure Neon Cyan */
:deep(.chat-highlight-name.theme-0) {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.28), rgba(8, 145, 178, 0.15)) !important;
  border: 1.5px solid #06b6d4 !important;
  color: #a5f3fc !important;
}
:deep(.chat-highlight-name.theme-0:hover) {
  border-color: #22d3ee !important;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.5) !important;
}

/* 1. Hot Magenta Pink */
:deep(.chat-highlight-name.theme-1) {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(219, 39, 119, 0.15)) !important;
  border: 1.5px solid #ec4899 !important;
  color: #fbcfe8 !important;
}
:deep(.chat-highlight-name.theme-1:hover) {
  border-color: #f472b6 !important;
  box-shadow: 0 0 14px rgba(236, 72, 153, 0.5) !important;
}

/* 2. Sky Azure Blue */
:deep(.chat-highlight-name.theme-2) {
  background: linear-gradient(135deg, rgba(2, 132, 199, 0.28), rgba(3, 105, 161, 0.15)) !important;
  border: 1.5px solid #0284c7 !important;
  color: #bae6fd !important;
}
:deep(.chat-highlight-name.theme-2:hover) {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 14px rgba(2, 132, 199, 0.5) !important;
}

/* 3. Vibrant Fuchsia */
:deep(.chat-highlight-name.theme-3) {
  background: linear-gradient(135deg, rgba(217, 70, 239, 0.28), rgba(192, 38, 211, 0.15)) !important;
  border: 1.5px solid #d946ef !important;
  color: #f5d0fe !important;
}
:deep(.chat-highlight-name.theme-3:hover) {
  border-color: #e879f9 !important;
  box-shadow: 0 0 14px rgba(217, 70, 239, 0.5) !important;
}

/* 4. Cobalt Blue */
:deep(.chat-highlight-name.theme-4) {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.28), rgba(29, 78, 216, 0.15)) !important;
  border: 1.5px solid #2563eb !important;
  color: #bfdbfe !important;
}
:deep(.chat-highlight-name.theme-4:hover) {
  border-color: #60a5fa !important;
  box-shadow: 0 0 14px rgba(37, 99, 235, 0.5) !important;
}

/* 5. Electric Rose */
:deep(.chat-highlight-name.theme-5) {
  background: linear-gradient(135deg, rgba(244, 114, 182, 0.28), rgba(219, 39, 119, 0.15)) !important;
  border: 1.5px solid #f472b6 !important;
  color: #fce7f3 !important;
}
:deep(.chat-highlight-name.theme-5:hover) {
  border-color: #fbcfe8 !important;
  box-shadow: 0 0 14px rgba(244, 114, 182, 0.5) !important;
}

/* 6. Turquoise Aqua */
:deep(.chat-highlight-name.theme-6) {
  background: linear-gradient(135deg, rgba(8, 145, 178, 0.28), rgba(14, 116, 144, 0.15)) !important;
  border: 1.5px solid #0891b2 !important;
  color: #cffafe !important;
}
:deep(.chat-highlight-name.theme-6:hover) {
  border-color: #22d3ee !important;
  box-shadow: 0 0 14px rgba(8, 145, 178, 0.5) !important;
}

/* 7. Deep Sapphire Indigo */
:deep(.chat-highlight-name.theme-7) {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.28), rgba(67, 56, 202, 0.15)) !important;
  border: 1.5px solid #4f46e5 !important;
  color: #e0e7ff !important;
}
:deep(.chat-highlight-name.theme-7:hover) {
  border-color: #818cf8 !important;
  box-shadow: 0 0 14px rgba(79, 70, 229, 0.5) !important;
}

/* 8. Neon Deep Pink */
:deep(.chat-highlight-name.theme-8) {
  background: linear-gradient(135deg, rgba(219, 39, 119, 0.28), rgba(190, 24, 93, 0.15)) !important;
  border: 1.5px solid #db2777 !important;
  color: #fce7f3 !important;
}
:deep(.chat-highlight-name.theme-8:hover) {
  border-color: #f472b6 !important;
  box-shadow: 0 0 14px rgba(219, 39, 119, 0.5) !important;
}

/* 9. Electric Dodger Blue */
:deep(.chat-highlight-name.theme-9) {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.28), rgba(2, 132, 199, 0.15)) !important;
  border: 1.5px solid #0ea5e9 !important;
  color: #bae6fd !important;
}
:deep(.chat-highlight-name.theme-9:hover) {
  border-color: #38bdf8 !important;
  box-shadow: 0 0 14px rgba(14, 165, 233, 0.5) !important;
}

/* 10. Bubblegum Pink */
:deep(.chat-highlight-name.theme-10) {
  background: linear-gradient(135deg, rgba(244, 114, 182, 0.28), rgba(225, 29, 72, 0.15)) !important;
  border: 1.5px solid #f472b6 !important;
  color: #fdf2f8 !important;
}
:deep(.chat-highlight-name.theme-10:hover) {
  border-color: #fbcfe8 !important;
  box-shadow: 0 0 14px rgba(244, 114, 182, 0.5) !important;
}

/* 11. Royal Blue */
:deep(.chat-highlight-name.theme-11) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(37, 99, 235, 0.15)) !important;
  border: 1.5px solid #3b82f6 !important;
  color: #dbeafe !important;
}
:deep(.chat-highlight-name.theme-11:hover) {
  border-color: #60a5fa !important;
  box-shadow: 0 0 14px rgba(59, 130, 246, 0.5) !important;
}

/* 🎯 Instant 1-Click Filter Button on Chat Row */
.btn-author-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.74em;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0;
  flex-shrink: 0;
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

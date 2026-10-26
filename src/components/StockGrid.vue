<template>
  <div class="stock-panel">
    <div class="stock-header">
      <div class="header-main-row">
        <div class="stock-input-group">
          รายการ:
          <input
            type="number"
            v-model.lazy="localStockSize"
            class="edit-input"
            style="
              width: 60px;
              text-align: center;
              font-size: 1em;
              font-weight: bold;
            "
            @change="saveStockSize"
          />
        </div>

        <div class="stock-stats">
          <span class="stats-label">ขายแล้ว:</span>
          <span class="stat-sold">{{ animatedSoldCount }}</span>
          <span style="opacity: 0.5; font-size: 0.85em">/{{ stockStore.stockSize }}</span>
          <div class="sale-percent-badge" :class="[percentColorClass, { 'pulse': isPulsingPercent }]">
            {{ animatedPercentage }}%
          </div>
          <span class="motivational-badge" :key="motivationalText">{{ motivationalText }}</span>
        </div>

        <!-- 📦 Delivery Strip (moved right after sales stats) -->
        <div class="delivery-strip">
          <div
            class="shipping-mgr-btn"
            @click="openShippingManager"
            :title="`รายการจัดส่งรอบนี้ (${cycleDeliveryCount} ท่าน) — คลิกเพื่อเปิด`"
            style="cursor: pointer;"
          >
            <span class="box-emoji">📦</span>
            <span v-if="cycleDeliveryCount > 0" class="delivery-count-text">{{ cycleDeliveryCount }}</span>
          </div>
          <div class="ds-scroll" v-if="deliveryStrip.length > 0">
            <span
              v-for="c in deliveryStrip"
              :key="c.id"
              class="ds-pill"
              :class="'ds-' + c.urgency"
              :title="c.tooltip + ' — คลิกเพื่อเปิดรายการจัดส่ง'"
              @click="openShippingManager"
              style="cursor: pointer;"
            >
              <span class="ds-icon" v-if="c.icon">{{ c.icon }}</span>
              <span class="ds-name">{{ c.name }}</span>
              <span class="ds-info" v-if="c.info">{{ c.info }}</span>
            </span>
          </div>
        </div>

        <!-- 🏷️ Quick Filter Dropdown -->
        <div class="quick-filter-container">
          <div class="stock-search-wrap">
            <i class="fa-solid fa-magnifying-glass stock-search-icon"></i>
            <input
              type="text"
              v-model="stockSearchQuery"
              class="stock-search-input"
              placeholder="ค้นหาชื่อ/เบอร์..."
              @keyup.enter="handleStockSearchEnter"
              @keydown.esc="stockSearchQuery = ''"
            />
            <button
              v-if="stockSearchQuery"
              type="button"
              class="stock-search-clear"
              @click="stockSearchQuery = ''"
              title="ล้างคำค้นหา"
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div class="quick-filter-dropdown-wrap">
            <select v-model="activeFilter" class="quick-filter-select" :class="'qf-' + activeFilter">
              <option value="all">🌐 ทั้งหมด</option>
              <option value="sold">🛒 ขายแล้ว</option>
              <option value="vacant">⚪ ยังว่าง</option>
              <option value="queue">⏳ มีคิว</option>
            </select>
            <i class="fa-solid fa-chevron-down dropdown-arrow"></i>
          </div>
        </div>
      </div>

      <div class="mini-progress-track">
        <div class="mini-progress-fill" :style="{ width: soldPercentage + '%', background: progressBarColor }">
          <div class="mini-shimmer"></div>
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
      class="stock-grid"
      ref="gridContainer"
      @scroll="handleGridScroll"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <StockItemCard
        v-for="i in visibleItemIds"
        :key="i"
        v-memo="[
          getStockItem(i).owner,
          getStockItem(i).price,
          getStockItem(i).backdated,
          getStockItem(i).time,
          getOwnerCount(getStockItem(i).owner, getStockItem(i).uid),
          getQueueFingerprint(i),
          nicknameStore.getNickname(getStockItem(i).uid, getStockItem(i).owner),
          highlightedId === i,
          cancelledItems.has(i),
          cancelledItems.get(i),
          isNewOrder(i),
          activeFilter,
          hasCustomerAddress(getStockItem(i).owner)
        ]"
        :index="i"
        :item="getStockItem(i)"
        :owner-count="getOwnerCount(getStockItem(i).owner, getStockItem(i).uid)"
        :queue-length="getQueueLength(i)"
        :queue-fingerprint="getQueueFingerprint(i)"
        :nickname="nicknameStore.getNickname(getStockItem(i).uid, getStockItem(i).owner)"
        :is-highlighted="highlightedId === i"
        :is-cancelled="cancelledItems.has(i)"
        :cancelled-name="cancelledItems.get(i) || ''"
        :is-new-order="isNewOrder(i)"
        :has-address="hasCustomerAddress(getStockItem(i).owner)"
        @select="openQueueModal(i)"
        @show-owner="showOwnerItems"
      />


      <!-- 📦 Window Capping Load More Indicator -->
      <div
        v-if="gridDisplayLimit < stockStore.stockSize && activeFilter === 'all'"
        class="grid-load-more"
        @click="expandDisplayLimit"
      >
        <span>แสดงเพิ่ม (เหลืออีก {{ stockStore.stockSize - gridDisplayLimit }} รายการ) <i class="fa-solid fa-chevron-down"></i></span>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="queue-modal-overlay"
        @click.self="closeModal"
      >
        <div class="queue-modal">
          <div class="queue-header">
            <div class="queue-header-left">
              <div class="queue-title-badge">
                <i class="fa-solid fa-list-ol"></i>
                <span>รายการที่ {{ editingId }}</span>
              </div>
              <div
                class="queue-status-pill"
                :class="{
                  'status-empty': tempQueue.length === 0,
                  'status-owner': tempQueue.length === 1,
                  'status-backup': tempQueue.length > 1
                }"
              >
                <span class="status-dot"></span>
                <span>{{ tempQueue.length === 0 ? 'ว่าง' : tempQueue.length === 1 ? 'ได้ของ 1 คน' : `ได้ของ 1 + สำรอง ${tempQueue.length - 1}` }}</span>
              </div>
            </div>
            <div class="queue-header-actions">
              <div class="queue-nav-group">
                <button class="btn-queue-nav" @click="saveAndNavigate('prev')" title="บันทึกและไปรายการก่อนหน้า (ลูกศรซ้าย)">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button class="btn-queue-nav" @click="saveAndNavigate('next')" title="บันทึกและไปรายการถัดไป (ลูกศรขวา)">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <button class="btn-queue-clear" @click="clearItemData" title="ล้างข้อมูลรายการนี้">
                <i class="fa-solid fa-broom"></i>
                <span>ล้าง</span>
              </button>
              <button class="btn-queue-close" @click="closeModal" title="ปิดหน้าต่าง">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="queue-body">
            <div class="queue-list">
              <div
                v-if="tempQueue.length === 0"
                class="queue-empty-state"
              >
                <div class="queue-empty-icon">
                  <i class="fa-solid fa-inbox"></i>
                </div>
                <div class="queue-empty-title">ไม่มีการจองในรายการนี้</div>
                <div class="queue-empty-desc">คลิกปุ่ม "+ เพิ่มชื่อ" ด้านล่างเพื่อเพิ่มการจองด้วยตนเอง</div>
              </div>
              <div
                v-for="(person, index) in tempQueue"
                :key="index"
                class="queue-item"
                :class="{ 'queue-item--owner': index === 0, 'queue-item--backup': index > 0 }"
                draggable="true"
                @dragstart="dragStart(index)"
                @dragover.prevent
                @drop="drop(index)"
              >
                <div class="queue-item-left">
                  <div class="drag-handle" title="ลากเพื่อสลับลำดับคิว">
                    <i class="fa-solid fa-grip-vertical"></i>
                  </div>
                  <span class="queue-rank" :class="{ 'queue-rank--owner': index === 0 }">#{{ index + 1 }}</span>
                  <span v-if="index === 0" class="owner-badge">
                    <i class="fa-solid fa-crown"></i> ได้ของ
                  </span>
                  <span v-else class="backup-badge">
                    สำรอง {{ index }}
                  </span>
                  <div class="autocomplete-wrapper">
                    <input
                      type="text"
                      v-model="person.owner"
                      class="queue-input"
                      :class="{ 'unsaved-owner': isUnsavedOwner(person.owner) }"
                      :ref="el => setQueueInputRef(el, index)"
                      @input="onAutocompleteInput(index)"
                      @focus="onAutocompleteFocus(index)"
                      @blur="onAutocompleteBlur"
                      @keydown="handleAutocompleteKeydown($event, index)"
                      autocomplete="off"
                      placeholder="พิมพ์ชื่อลูกค้า..."
                    />
                    <div
                      v-if="activeAutocompleteIdx === index && filteredSuggestions.length > 0"
                      class="autocomplete-dropdown"
                    >
                      <div
                        v-for="(suggestion, sIdx) in filteredSuggestions"
                        :key="suggestion"
                        class="autocomplete-item"
                        :class="{ active: sIdx === highlightedSuggestionIdx }"
                        @mousedown.prevent="selectSuggestion(suggestion, index)"
                      >
                        <span class="autocomplete-avatar">{{ suggestion?.[0] || '?' }}</span>
                        <span class="autocomplete-text" v-html="highlightMatch(suggestion, person.owner)"></span>
                      </div>
                    </div>
                  </div>

                  <!-- 🏷️ Customer Status Micro-Badges (Address, Channel, Payment) -->
                  <div
                    v-if="getCustomerMeta(person.owner)"
                    class="queue-cust-meta"
                  >
                    <span
                      v-if="getCustomerMeta(person.owner).hasAddress"
                      class="cust-mini-badge addr"
                      title="📍 มีที่อยู่จัดส่งแล้ว"
                    >
                      <i class="fa-solid fa-location-dot"></i>
                    </span>
                    <span
                      v-if="getCustomerMeta(person.owner).contactChannel"
                      class="cust-mini-badge channel"
                      :class="getCustomerMeta(person.owner).contactChannel"
                      :title="`ช่องทางติดต่อ: ${getChannelLabel(getCustomerMeta(person.owner).contactChannel)}`"
                    >
                      <i :class="getChannelIcon(getCustomerMeta(person.owner).contactChannel)"></i>
                      <span class="mini-txt">{{ getChannelShortText(getCustomerMeta(person.owner).contactChannel) }}</span>
                    </span>
                    <span
                      v-if="getCustomerMeta(person.owner).paymentType"
                      class="cust-mini-badge pay"
                      :class="getCustomerMeta(person.owner).paymentType"
                      :title="`การจัดส่ง/ชำระเงิน: ${getCustomerMeta(person.owner).paymentType === 'cod' ? 'COD (เก็บปลายทาง)' : 'โอนเงิน'}`"
                    >
                      <i :class="getCustomerMeta(person.owner).paymentType === 'cod' ? 'fa-solid fa-box' : 'fa-solid fa-money-bill-transfer'"></i>
                      <span class="mini-txt">{{ getCustomerMeta(person.owner).paymentType === 'cod' ? 'COD' : 'โอน' }}</span>
                    </span>
                  </div>

                  <!-- 🕒 เวลาจอง / จองย้อนหลัง -->
                  <div
                    v-if="person.time"
                    class="queue-item-time"
                    :class="{ 'backdated': person.backdated }"
                    :title="getBookingTooltip(person.time, person.backdated)"
                  >
                    <template v-if="person.backdated">
                      <i class="fa-solid fa-clock-rotate-left backdated-icon"></i>
                      <span class="backdated-label">ย้อนหลัง</span>
                      <span class="backdated-sep">•</span>
                      <span class="backdated-val">{{ formatBackdatedDetail(person.time) }}</span>
                    </template>
                    <template v-else>
                      <i class="fa-regular fa-clock normal-icon"></i>
                      <span class="normal-time">{{ formatNormalBookingTime(person.time) }}</span>
                    </template>
                  </div>
                </div>
                <div class="queue-actions">
                  <button
                    class="btn-queue-delete"
                    @click="removeQueueItem(index)"
                    title="ลบรายการนี้"
                  >
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="queue-footer">
            <div class="queue-footer-tip">
              <i class="fa-solid fa-keyboard"></i>
              <span>กด Enter หรือ Ctrl+S เพื่อบันทึก</span>
            </div>
            <div class="queue-footer-actions">
              <button class="btn-queue-add" @click="manualReserve">
                <i class="fa-solid fa-user-plus"></i> เพิ่มชื่อ
              </button>
              <button class="btn-queue-save" @click="saveQueueChanges">
                <i class="fa-solid fa-check-double"></i> บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, inject, onMounted, onUnmounted } from "vue";
import StockItemCard from "./StockItemCard.vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useNicknameStore } from "../stores/nickname";
import { useCustomerStore } from "../stores/customer";
import { useAudio } from "../composables/useAudio";
import { useSmoothScroll } from "../composables/useSmoothScroll";
import { ref as dbRef, onValue, get, remove, update, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import { escapeHtml } from "../utils/dbUtils";
import { normalizeCustomerName, syncDeliveryCustomerForOwner } from "../utils/deliverySync";
import { resolveShippingCycleDate, formatDateToYYYYMMDD } from "../utils/chatParserUtils";
import { formatBackdatedDetail, formatNormalBookingTime, getBookingTooltip } from "../utils/timeFormatUtils";
import Swal from "sweetalert2";

const DEBUG_MODE = false;
const logger = { log: (...args) => DEBUG_MODE && console.log(...args) };

const stockStore = useStockStore();
const systemStore = useSystemStore();
const nicknameStore = useNicknameStore();
const customerStore = useCustomerStore();
const { playSfx, queueAudio } = useAudio();
const openShippingManager = inject("openShippingManager");
const gridContainer = ref(null);
const gridSmoothScroll = useSmoothScroll(gridContainer);
const highlightedId = ref(null);
const newOrders = ref(new Set());
const activeFilter = ref("all");

// 🚀 Performance: Cache queue lengths map for O(1) template accesses
const queueLengthsMap = computed(() => {
  const map = {};
  const data = stockStore.stockData;
  if (data) {
    Object.keys(data).forEach((id) => {
      map[id] = data[id]?.queue?.length || 0;
    });
  }
  return map;
});

// ✅ Phase 3.3: Window Capping & v-if Visibility Logic
// ลด DOM node จาก 300+ โหนด เหลือเฉพาะชุดที่ผู้ใช้กำลังดูอยู่ (เริ่มต้น 120 โหนด)
// และขยายแบบ dynamic เมื่อผู้ใช้เลื่อนหน้าจอ หรือเมื่อมีการกระโดดไปหารายการใดๆ
const gridDisplayLimit = ref(120);

function expandDisplayLimit() {
  if (gridDisplayLimit.value < stockStore.stockSize) {
    gridDisplayLimit.value = Math.min(stockStore.stockSize, gridDisplayLimit.value + 60);
    nextTick(() => {
      gridSmoothScroll?.resize();
    });
  }
}

function handleGridScroll(e) {
  const el = e.target;
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 250) {
    expandDisplayLimit();
  }
}

const stockSearchQuery = ref("");

function hasCustomerAddress(owner) {
  if (!owner) return true;
  const meta = customerStore.getCustomerMetaByName(owner);
  return meta ? Boolean(meta.hasAddress) : false;
}

function handleStockSearchEnter() {
  const q = stockSearchQuery.value.trim();
  if (!q) return;

  const numMatch = q.match(/^#?(\d+)$/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    if (num >= 1 && num <= stockStore.stockSize) {
      scrollToItem(num);
      return;
    }
  }

  // If text query, if matches items, scroll to first matching item
  if (visibleItemIds.value.length >= 1) {
    const firstId = visibleItemIds.value[0];
    scrollToItem(firstId);
  }
}

const visibleItemIds = computed(() => {
  const size = stockStore.stockSize;
  if (!size) return [];

  const limit = gridDisplayLimit.value;
  const hId = highlightedId.value;
  const eId = editingId.value;
  const filter = activeFilter.value;
  const stock = stockStore.stockData || {};
  const queueMap = queueLengthsMap.value || {};
  const query = stockSearchQuery.value.trim().toLowerCase();

  const numMatch = query.match(/^#?(\d+)$/);
  const targetNum = numMatch ? parseInt(numMatch[1], 10) : null;

  const result = [];
  for (let i = 1; i <= size; i++) {
    const item = stock[i];

    // If search query is active
    if (query) {
      let isMatch = false;
      if (targetNum !== null) {
        isMatch = (i === targetNum) || String(i).includes(query.replace(/^#/, ''));
      }
      if (!isMatch && item?.owner) {
        const ownerLower = (item.owner || "").toLowerCase();
        const nickLower = (nicknameStore.getNickname(item.uid, item.owner) || "").toLowerCase();
        if (ownerLower.includes(query) || nickLower.includes(query)) {
          isMatch = true;
        }
      }
      if (!isMatch && item?.queue && item.queue.length > 0) {
        isMatch = item.queue.some((q) => {
          const qOwner = (typeof q === "object" ? (q.owner || q.name || "") : String(q)).toLowerCase();
          const qNick = (nicknameStore.getNickname(q?.uid, qOwner) || "").toLowerCase();
          return qOwner.includes(query) || qNick.includes(query);
        });
      }

      if (!isMatch) continue;
      // Match found: include in results (bypassing window capping so user can find all matches)
      result.push(i);
      continue;
    }

    // 1. Window capping: render ถึง limit หรือถ้าไอเทมกำลังถูกไฮไลท์/แก้ไขอยู่
    if (i > limit && hId !== i && eId !== i) {
      continue;
    }

    // 2. Filter check
    if (filter === "all") {
      result.push(i);
      continue;
    }
    if (filter === "sold" && item?.owner) {
      result.push(i);
      continue;
    }
    if (filter === "vacant" && !item?.owner) {
      result.push(i);
      continue;
    }
    if (filter === "queue" && (queueMap[i] || 0) > 0) {
      result.push(i);
      continue;
    }
  }
  return result;
});



// ✅ Cancelled & New Items Timers & Lifecycle Tracking
const cancelledItems = ref(new Map());
const cancelledTimers = {};
const newOrdersTimers = {};
let pulsingPercentTimer = null;
let highlightTimeout = null;
let autocompleteTimer = null;
let pullResetTimer = null;


// 📦 Delivery Strip & Customer Meta State (Shared via customerStore)
const deliveryCustomers = computed(() => customerStore.deliveryCustomersList);
const addressBook = computed(() => customerStore.addressBook);
const cleanupFns = [];

const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatThaiDateShort(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()} ${thaiMonths[d.getMonth()]}`;
}

function getDeliveryDays(dateStr) {
  if (!dateStr) return Infinity;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

const cycleDeliveryCount = computed(() => {
  const targetDateObj = resolveShippingCycleDate(systemStore.shippingCycle || 'today');
  const targetDateStr = formatDateToYYYYMMDD(targetDateObj);
  return deliveryCustomers.value.filter((c) => {
    if (c.status === 'done' || !c.deliveryDate) return false;
    return c.deliveryDate === targetDateStr;
  }).length;
});

const deliveryStrip = computed(() => {
  return deliveryCustomers.value
    .filter((c) => c.status !== 'done' && !!c.deliveryDate)
    .map((c) => {
      const days = getDeliveryDays(c.deliveryDate);
      let urgency, icon, info, tooltip;
      if (!c.deliveryDate) {
        urgency = 'none'; icon = '📌'; info = '';
        tooltip = `${c.name}: ยังไม่กำหนดวันส่ง (${c.itemCount || 0} ชิ้น)`;
      } else if (days < 0) {
        urgency = 'overdue'; icon = '🚨'; info = '';
        tooltip = `🚨 ${c.name}: เลยกำหนด ${Math.abs(days)} วัน (${c.itemCount || 0} ชิ้น)`;
      } else if (days === 0) {
        urgency = 'today'; icon = '🚚'; info = '';
        tooltip = `🚚 ${c.name}: ส่งวันนี้ (${c.itemCount || 0} ชิ้น)`;
      } else if (days === 1) {
        urgency = 'pack-tonight'; icon = '📦'; info = '';
        tooltip = `📦 ${c.name}: ส่งพรุ่งนี้ • แพ็คคืนนี้ (${c.itemCount || 0} ชิ้น)`;
      } else if (days <= 3) {
        urgency = 'soon'; icon = '⏳'; info = `อีก ${days} วัน`;
        tooltip = `⏳ ${c.name}: ${formatThaiDateShort(c.deliveryDate)} • อีก ${days} วัน (${c.itemCount || 0} ชิ้น)`;
      } else {
        urgency = 'later'; icon = '📅'; info = formatThaiDateShort(c.deliveryDate);
        tooltip = `📅 ${c.name}: ${formatThaiDateShort(c.deliveryDate)} (${c.itemCount || 0} ชิ้น)`;
      }
      return { id: c.uid || c.name, name: c.name, urgency, icon, info, days, tooltip, count: c.itemCount || 0 };
    })
    .sort((a, b) => a.days - b.days);
});

// ✅ Phase 3.1 (A): Pre-normalize stockData owner counts — O(n) single pass
// คำนวณแยกออกมา ป้องกันไม่ให้ deliveryCountsMap ต้อง iterate stockData ซ้ำ
const currentNormCountsMap = computed(() => {
  const counts = {};
  Object.values(stockStore.stockData).forEach((item) => {
    if (item?.owner) {
      const norm = normalizeCustomerName(item.owner);
      if (norm) counts[norm] = (counts[norm] || 0) + 1;
    }
  });
  return counts;
});

// ✅ Phase 3.1 (B): Pre-aggregate past session counts per customer — O(m×sessions)
// คำนวณแยก — deliveryCountsMap จะ depend แค่ computed นี้ ไม่ต้อง loop sessions ซ้ำ
const pastSessionCountsMap = computed(() => {
  const videoId = systemStore.currentVideoId;
  const map = {};
  deliveryCustomers.value.forEach((cust) => {
    if (!cust || cust.status === "done" || !cust.name) return;
    const norm = normalizeCustomerName(cust.name);
    if (!norm) return;

    let pastCount = 0;
    if (cust.sessions) {
      Object.keys(cust.sessions).forEach((vid) => {
        if (vid !== videoId) {
          const session = cust.sessions[vid];
          if (session && session.status !== "done") {
            pastCount += session.count || 0;
          }
        }
      });
    }
    map[norm] = { cust, pastCount };
  });
  return map;
});

// ✅ Phase 3.1 (C): Final O(n+m) delivery counts map — no nested loops
// ใช้ผลลัพธ์จาก 2 computed ด้านบน เพื่อให้ complexity ลดลงจาก O(n×m) → O(n+m)
const deliveryCountsMap = computed(() => {
  const counts = {};
  const currentNormCounts = currentNormCountsMap.value;
  const pastSessions = pastSessionCountsMap.value;

  // 1. รวมข้อมูลจาก deliveryCustomers + stockData ใน single pass
  Object.entries(pastSessions).forEach(([norm, { cust, pastCount }]) => {
    const currentCount = currentNormCounts[norm] || 0;
    const total = currentCount + pastCount;

    counts[norm] = total;
    if (cust.uid) counts[cust.uid] = total;
    if (cust.name) counts[cust.name] = total;
  });

  // 2. Owners ที่อยู่ใน stock live แต่ไม่มีใน deliveryCustomers
  Object.keys(currentNormCounts).forEach((norm) => {
    if (counts[norm] === undefined) {
      counts[norm] = currentNormCounts[norm];
    }
  });

  return counts;
});

// Reference สำหรับ cleanup listener & observer ของ modal
let cleanupOwnerModal = null;

function handleExternalJumpToItem(e) {
  const itemId = parseInt(e?.detail?.itemId, 10);
  if (itemId && itemId >= 1) {
    scrollToItem(itemId);
  }
}

function handleExternalShowOwnerItems(e) {
  const ownerName = e?.detail?.ownerName;
  if (ownerName && typeof ownerName === "string") {
    showOwnerItems(ownerName);
  }
}

onMounted(() => {
  const unsubCustomers = customerStore.initCustomerListeners();
  if (unsubCustomers) cleanupFns.push(unsubCustomers);

  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('manowzab:jump-to-item', handleExternalJumpToItem);
  window.addEventListener('manowzab:show-owner-items', handleExternalShowOwnerItems);
});

// ✅ Pull-to-Refresh State
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);
const pullThreshold = 80;
let touchStartY = 0;
let canPull = false;

// ✅ Local Stock Size for Input (Synced with Firebase)
const localStockSize = ref(stockStore.stockSize || 100);

// ✅ Watch Store Stock Size to Sync Input Field
watch(
  () => stockStore.stockSize,
  (newVal) => {
    if (newVal && newVal !== localStockSize.value) {
      localStockSize.value = newVal;
      logger.log("📦 Stock Size synced from Firebase:", newVal);
    }
  },
  { immediate: true },
);

const showModal = ref(false);
const editingId = ref(null);
const editingPrice = ref(0);
const tempQueue = ref([]);
let draggingIndex = null;

// ✅ Autocomplete State
const activeAutocompleteIdx = ref(null);
const highlightedSuggestionIdx = ref(-1);
const queueInputRefs = ref({});

function setQueueInputRef(el, index) {
  if (el) queueInputRefs.value[index] = el;
}

const soldCount = computed(
  () => Object.values(stockStore.stockData).filter((item) => item.owner).length,
);

const soldPercentage = computed(() => {
  if (stockStore.stockSize === 0) return 0;
  return Math.round((soldCount.value / stockStore.stockSize) * 100);
});

// ✅ Animated Counter Logic
const animatedSoldCount = ref(0);
const animatedPercentage = ref(0);
const isPulsingPercent = ref(false);
let soldAnimFrame = null;
let pctAnimFrame = null;

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

function animateValue(fromVal, toVal, duration, onUpdate, onDone) {
  const startTime = performance.now();
  let frame = null;
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutQuart(progress);
    const current = Math.round(fromVal + (toVal - fromVal) * easedProgress);
    onUpdate(current);
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    } else {
      if (onDone) onDone();
    }
  }
  frame = requestAnimationFrame(step);
  return frame;
}

watch(soldCount, (newVal, oldVal) => {
  if (soldAnimFrame) cancelAnimationFrame(soldAnimFrame);
  const from = oldVal ?? 0;
  soldAnimFrame = animateValue(from, newVal, 500, (v) => {
    animatedSoldCount.value = v;
  });
}, { immediate: true });

watch(soldPercentage, (newVal, oldVal) => {
  if (pctAnimFrame) cancelAnimationFrame(pctAnimFrame);
  const from = oldVal ?? 0;
  // Trigger pulse effect without forcing synchronous layout reflow
  isPulsingPercent.value = true;
  if (pulsingPercentTimer) clearTimeout(pulsingPercentTimer);
  pulsingPercentTimer = setTimeout(() => {
    isPulsingPercent.value = false;
    pulsingPercentTimer = null;
  }, 600);
  pctAnimFrame = animateValue(from, newVal, 500, (v) => {
    animatedPercentage.value = v;
  });
}, { immediate: true });

const percentColorClass = computed(() => {
  const pct = soldPercentage.value;
  if (pct <= 20) return 'pct-low';
  if (pct <= 50) return 'pct-medium';
  if (pct <= 80) return 'pct-high';
  return 'pct-complete';
});

onUnmounted(() => {
  if (soldAnimFrame) cancelAnimationFrame(soldAnimFrame);
  if (pctAnimFrame) cancelAnimationFrame(pctAnimFrame);
  // ✅ Cleanup cancelled & new item timers
  Object.values(cancelledTimers).forEach(t => clearTimeout(t));
  Object.values(newOrdersTimers).forEach(t => clearTimeout(t));
  if (pulsingPercentTimer) clearTimeout(pulsingPercentTimer);
  if (highlightTimeout) clearTimeout(highlightTimeout);
  if (autocompleteTimer) clearTimeout(autocompleteTimer);
  if (pullResetTimer) clearTimeout(pullResetTimer);

  // ✅ Force-close SweetAlert2 modal if still active on unmount
  if (typeof Swal !== "undefined" && Swal.isVisible()) {
    Swal.close();
  }

  if (cleanupOwnerModal) {
    cleanupOwnerModal();
    cleanupOwnerModal = null;
  }
  cleanupFns.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  cleanupFns.length = 0;
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('manowzab:jump-to-item', handleExternalJumpToItem);
  window.removeEventListener('manowzab:show-owner-items', handleExternalShowOwnerItems);
  logger.log("🧹 Memory Cleaned Up!");
});

const motivationalText = computed(() => {
  const percentage = soldPercentage.value;
  if (percentage === 0) return "✌️ เริ่มต้นกันเลย!";
  if (percentage <= 20) return "✌️ เริ่มต้นกันเลย!";
  if (percentage <= 50) return "🔥 ไฟเริ่มติดแล้ว!";
  if (percentage <= 80) return "🚀 ยอดพุ่งมากแม่!";
  if (percentage < 100) return "💎 จะหมดแล้ว!";
  return "🎉 ปังปุริเย่ หมดเกลี้ยง!";
});

const progressBarColor = computed(() => {
  const percentage = soldPercentage.value;
  if (percentage <= 30)
    return "linear-gradient(90deg, #ff6b35 0%, #ff4500 100%)"; // ส้ม-แดง
  if (percentage <= 60)
    return "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)"; // เหลือง-ส้ม
  return "linear-gradient(90deg, #10b981 0%, #059669 100%)"; // เขียว
});

const uniqueBuyerNames = computed(() => {
  const names = new Set();
  Object.values(stockStore.stockData).forEach((item) => {
    if (item.owner) names.add(item.owner);
  });
  return Array.from(names).sort();
});

function getStockItem(num) {
  return stockStore.stockData[num] || {};
}

// 🏷️ ตรวจสอบชื่อลูกค้าที่ยังไม่ถูกบันทึก (มี @ นำหน้า)
function isUnsavedOwner(name) {
  return typeof name === "string" && name.trim().startsWith("@");
}

// 🏷️ Customer Metadata (Address, Channel, Payment) O(1) Memoized Lookup
function getCustomerMeta(ownerName) {
  if (!ownerName || typeof ownerName !== "string") return null;
  const rawName = ownerName.trim();
  if (!rawName) return null;
  return customerStore.getCustomerMetaByName(rawName);
}

function getChannelLabel(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทรศัพท์";
  return channel;
}

function getChannelIcon(channel) {
  if (channel === "line") return "fa-brands fa-line";
  if (channel === "lineoa") return "fa-solid fa-comment-dots";
  if (channel === "phone") return "fa-solid fa-phone";
  return "fa-solid fa-comment";
}

function getChannelShortText(channel) {
  if (channel === "line") return "Line";
  if (channel === "lineoa") return "OA";
  if (channel === "phone") return "โทร";
  return channel;
}

// 🛢 นับจำนวนสินค้าต่อ owner (แสดงเฉพาะ >= 2 ชิ้น)
const ownerItemCounts = computed(() => {
  const counts = {};
  Object.values(stockStore.stockData).forEach((item) => {
    if (item.owner) {
      counts[item.owner] = (counts[item.owner] || 0) + 1;
    }
  });
  return counts;
});

// 👗 ดึงข้อมูลยอดจองสะสมจาก Database (ทุกรอบส่งที่ยังไม่จัดส่ง) + รวมของรอบปัจจุบันด้วย
function getOwnerCount(ownerName, uid = null) {
  const map = deliveryCountsMap.value || {};
  if (uid && map[uid] !== undefined) {
    return map[uid];
  }
  const norm = normalizeCustomerName(ownerName);
  if (norm && map[norm] !== undefined) {
    return map[norm];
  }
  if (ownerName && map[ownerName] !== undefined) {
    return map[ownerName];
  }
  return ownerItemCounts.value?.[ownerName] || 0;
}

// ฟังก์ชันสกัดเอาเฉพาะวันที่จากชื่อไลฟ์สดที่ยาวๆ
function extractDateFromTitle(title) {
  if (!title) return "";
  const dateRegex = /(\d{1,2})\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})?/i;
  const match = title.match(dateRegex);
  if (match) {
    const day = match[1];
    const month = match[2];
    const year = match[3] ? ` ${match[3]}` : "";
    return `${day} ${month}${year}`;
  }
  return title.length > 15 ? title.substring(0, 15) + "..." : title;
}

// 👗 แสดงรายการสินค้าทั้งหมดของลูกค้าคนนี้ (รวมทุกวันสะสม) + ปุ่มลบ
const activeOwnerName = ref(null);
const pastItems = ref([]);

// ฟอร์แมตเวลาจอง
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const day = d.getDate();
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const month = months[d.getMonth()];
  const hour = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${hour}:${min}`;
}

// ชื่อวันที่ของสตรีมปัจจุบัน
const currentLiveDateStr = computed(() => {
  let todayDateStr = "";
  if (systemStore.liveTitle) {
    todayDateStr = extractDateFromTitle(systemStore.liveTitle);
  }
  const dateRegex = /(\d{1,2})\s*(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)/i;
  if (!todayDateStr || !dateRegex.test(todayDateStr)) {
    const d = new Date();
    const day = d.getDate();
    const month = thaiMonths[d.getMonth()];
    const yearShort = (d.getFullYear() + 543).toString().slice(-2);
    return `${day} ${month} ${yearShort}`;
  } else {
    if (!/\d{2,4}$/.test(todayDateStr.trim())) {
      const yearShort = (new Date().getFullYear() + 543).toString().slice(-2);
      return `${todayDateStr.trim()} ${yearShort}`;
    }
    return todayDateStr;
  }
});

// ฟังก์ชันอัปเดตข้อมูลใน Swal Modal แบบเรียลไทม์
function updateOwnerItemsModal() {
  if (!activeOwnerName.value || !Swal.isVisible()) return;

  const ownerName = activeOwnerName.value;
  const currentVideoId = systemStore.currentVideoId;

  // 1. ดึงรายการวันนี้
  const todayItems = [];
  Object.keys(stockStore.stockData).forEach((num) => {
    const item = stockStore.stockData[num];
    if (item.owner === ownerName) {
      todayItems.push({
        num: parseInt(num),
        price: item.price || 0,
        time: item.time || 0,
        backdated: !!item.backdated,
        videoId: currentVideoId,
        isToday: true,
        title: currentLiveDateStr.value
      });
    }
  });

  // 2. รวมรายการวันนี้กับวันก่อนหน้าที่โหลดสะสมไว้
  const allItems = [...todayItems, ...pastItems.value];

  // 3. เรียงลำดับวันนี้ขึ้นก่อน ตามด้วยคลิปย้อนหลังจากล่าสุดไปเก่าสุด และเลขที่จองจากน้อยไปมาก
  allItems.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.videoId === b.videoId) {
      return a.num - b.num;
    }
    return b.time - a.time;
  });

  const totalPrice = allItems.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0);

  // 4. สร้าง HTML
  const itemsHtml = allItems.map((item) => {
    const priceText = item.price ? `${parseInt(item.price).toLocaleString()}` : '';
    const timeText = item.time
      ? (item.backdated
          ? `<span style="color:#fbbf24; font-weight:600;"><i class="fa-solid fa-clock-rotate-left"></i> ย้อนหลัง • ${escapeHtml(formatBackdatedDetail(item.time))}</span>`
          : `<span style="color:#94a3b8;"><i class="fa-regular fa-clock"></i> ${escapeHtml(formatNormalBookingTime(item.time))}</span>`)
      : '';
    const removeDetail = escapeHtml(`${item.num}|${item.videoId}`);

    return `<div style="display:flex; align-items:center; gap:10px; padding:10px 12px; margin:4px 0; background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius:10px; border:1px solid #2a2a4a; transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#2a2a4a'">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:linear-gradient(135deg, #0ea5e9, #2563eb); color:#fff; font-weight:700; padding:2px 10px; border-radius:20px; font-size:0.85em; white-space:nowrap;">#${item.num}</span>
          <span style="background:rgba(255, 255, 255, 0.08); color:#cbd5e1; border:1px solid rgba(255, 255, 255, 0.15); font-weight:500; padding:2px 8px; border-radius:20px; font-size:0.8em; white-space:nowrap;">${escapeHtml(item.title)}</span>
          ${priceText ? `<span style="color:#fbbf24; font-weight:600; font-size:0.85em;">💰 ${priceText} ฿</span>` : ''}
        </div>
        ${timeText ? `<div style="font-size:0.75em; margin-top:4px; padding-left:2px;">${timeText}</div>` : ''}
      </div>
      <button onclick="document.dispatchEvent(new CustomEvent('remove-owner-item', {detail: '${removeDetail}'}))" 
              style="background:linear-gradient(135deg, #dc2626, #b91c1c); color:white; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.8em; font-weight:600; flex-shrink:0; transition:all 0.2s; box-shadow:0 2px 6px rgba(220,38,38,0.3);"
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(220,38,38,0.5)'"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(220,38,38,0.3)'">
        <i class="fa-solid fa-trash-can"></i> ลบ
      </button>
    </div>`;
  }).join('');

  // 5. อัปเดต Swal ด้วยข้อมูลใหม่
  Swal.update({
    html: `<div style="text-align:left;">
      <div style="display:flex; justify-content:center; gap:16px; margin-bottom:12px;">
        <div style="text-align:center; background:#1a1a2e; padding:8px 16px; border-radius:10px; border:1px solid #2a2a4a;">
          <div style="font-size:1.4em; font-weight:700; color:#38bdf8;">${allItems.length}</div>
          <div style="font-size:0.7em; color:#9ca3af;">รายการ</div>
        </div>
        <div style="text-align:center; background:#1a1a2e; padding:8px 16px; border-radius:10px; border:1px solid #2a2a4a;">
          <div style="font-size:1.4em; font-weight:700; color:#fbbf24;">฿${totalPrice.toLocaleString()}</div>
          <div style="font-size:0.7em; color:#9ca3af;">ราคารวม</div>
        </div>
      </div>
      <div style="max-height:280px; overflow-y:auto; padding-right:4px;">
        ${itemsHtml}
      </div>
    </div>`
  });
}

// เฝ้าติดตามการซิงค์ข้อมูลสต็อกหรือการจัดส่งเพื่ออัปเดตป๊อปอัปให้เป็นเรียลไทม์ (ทำงานเฉพาะตอนเปิดป๊อปอัปอยู่เท่านั้น)
watch(
  () =>
    activeOwnerName.value
      ? [stockStore.stockData, deliveryCustomers.value]
      : null,
  (val) => {
    if (val && activeOwnerName.value) {
      updateOwnerItemsModal();
    }
  },
);

// 👗 แสดงรายการสินค้าทั้งหมดของลูกค้าคนนี้ (รวมทุกวันสะสม) + ปุ่มลบ
async function showOwnerItems(ownerName) {
  // หา UID จากรายการวันนี้ที่มีชื่อตรงกัน
  let uid = null;
  Object.values(stockStore.stockData).forEach((item) => {
    if (item.owner === ownerName && item.uid) {
      uid = item.uid;
    }
  });

  const cust = deliveryCustomers.value.find(
    (c) => (uid && c.uid === uid) || c.name === ownerName
  );

  const currentVideoId = systemStore.currentVideoId;
  const pastPendingVids = [];
  if (cust && cust.sessions) {
    Object.keys(cust.sessions).forEach((vid) => {
      if (vid !== currentVideoId && cust.sessions[vid].status !== "done") {
        pastPendingVids.push(vid);
      }
    });
  }

  activeOwnerName.value = ownerName;
  pastItems.value = [];

  // ✅ Phase 4.1: Reference สำหรับ cleanup listener & observer
  cleanupOwnerModal = null;

  // เปิด Swal ขึ้นมาพร้อมหน้าตา Loading หรือข้อมูลเริ่มต้นทันที
  Swal.fire({
    title: `👗 ${ownerName}`,
    html: `<div style="text-align:center; padding:30px;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:#0ea5e9;"></i><div style="margin-top:10px; font-size:0.9em; color:#9ca3af;">กำลังโหลดข้อมูล...</div></div>`,
    background: 'linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%)',
    color: '#fff',
    showConfirmButton: true,
    confirmButtonText: '<i class="fa-solid fa-xmark"></i> ปิด',
    confirmButtonColor: '#374151',
    showCloseButton: true,
    width: 420,
    willClose: () => {
      // ✅ Phase 4.1: Clean up observer & event listener explicitly on close
      if (cleanupOwnerModal) cleanupOwnerModal();
    },
    didOpen: () => {

      // ฟัง event ลบรายการ
      const handler = async (e) => {
        const [numStr, vid] = e.detail.split('|');
        const num = parseInt(numStr);
        const isToday = vid === currentVideoId;

        const result = await Swal.fire({
          title: `ลบ #${num} ของ ${ownerName}?`,
          text: !isToday
            ? `ยกเลิกรายการจองนี้จากรอบส่งย้อนหลัง (หากมีคิวสำรองจะเลื่อนขึ้นมาแทน)`
            : `ยกเลิกรายการจองนี้ของลูกค้า (หากมีคิวสำรองจะเลื่อนขึ้นมาแทน)`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ลบเลย',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#d32f2f',
          background: '#1e1e1e',
          color: '#fff',
        });

        if (result.isConfirmed) {
          if (isToday) {
            // ลบรายการของวันนี้ตามปกติ (ระบุ uid และ ownerName เพื่อให้เลื่อนคิวสำรองและเก็บราคาไว้)
            await stockStore.processCancel(num, uid, ownerName);
          } else {
            // ลบรายการของวันก่อนหน้า (Past Session) อย่างปลอดภัยด้วย Transaction (เลื่อนคิวสำรอง/เก็บราคา)
            const pastItemRef = dbRef(db, `stock/${vid}/${num}`);
            let promotedNext = null;
            await runTransaction(pastItemRef, (currentData) => {
              promotedNext = null;
              if (!currentData || !currentData.owner) return currentData;

              const isOwnerMatch =
                (!uid && !ownerName) ||
                (uid && currentData.uid === uid) ||
                (ownerName && normalizeCustomerName(currentData.owner) === normalizeCustomerName(ownerName));

              if (isOwnerMatch) {
                if (currentData.queue && currentData.queue.length > 0) {
                  const next = currentData.queue[0];
                  const nextQ = currentData.queue.slice(1);
                  promotedNext = next;
                  return {
                    ...currentData,
                    owner: next.owner,
                    uid: next.uid,
                    time: Date.now(),
                    queue: nextQ,
                    source: "queue",
                    backdated: next.backdated || null,
                  };
                } else {
                  const preservedPrice = Number(currentData.price);
                  if (!isNaN(preservedPrice) && preservedPrice > 0) {
                    return { price: preservedPrice };
                  }
                  return null;
                }
              }
              return currentData;
            });

            // ดึงรายการสต็อกที่เหลือในเซสชั่นนั้นมาคำนวณยอดจัดส่งและยอดประวัติใหม่ (ประกาศ allStock นอก if เพื่อไม่ให้เกิด ReferenceError)
            const itemSnap = await get(dbRef(db, `stock/${vid}`));
            const allStock = itemSnap.val() || {};

            await syncDeliveryCustomerForOwner(ownerName, uid || cust?.uid || null, vid, allStock);
            if (promotedNext && promotedNext.owner) {
              await syncDeliveryCustomerForOwner(promotedNext.owner, promotedNext.uid || null, vid, allStock);
            }

            // คำนวณยอดขายในประวัติใหม่โดยใช้ allStock ที่ดึงมาแล้ว
            let totalSales = 0;
            let totalItems = 0;
            Object.values(allStock).forEach((order) => {
              if (order && order.owner) {
                totalItems++;
                const p = parseInt(order.price, 10);
                totalSales += isNaN(p) ? 0 : p;
              }
            });
            await update(dbRef(db, `history/${vid}`), {
              totalSales,
              totalItems,
              lastUpdated: Date.now(),
            });

            // ลบจากรายการ pastItems ท้องถิ่นเพื่ออัปเดต UI ทันที
            pastItems.value = pastItems.value.filter((i) => !(i.num === num && i.videoId === vid));
          }

          const remainingTodayCount = Object.values(stockStore.stockData).filter(
            (item) => item && item.owner === ownerName
          ).length;
          if (remainingTodayCount + pastItems.value.length > 0) {
            await showOwnerItems(ownerName);
          } else {
            Swal.fire({
              icon: 'success',
              title: `ลบ #${num} เรียบร้อย`,
              toast: true,
              position: 'top-end',
              timer: 1500,
              showConfirmButton: false,
            });
          }
        } else {
          // หากกดยกเลิกการลบ ให้เปิดป๊อปอัปรายการของลูกค้าคนนี้กลับขึ้นมาเหมือนเดิม
          await showOwnerItems(ownerName);
        }
      };

      document.addEventListener('remove-owner-item', handler);
      // cleanup เมื่อปิด
      const swalEl = Swal.getPopup();
      let observerTimeout = null;

      cleanupOwnerModal = () => {
        document.removeEventListener('remove-owner-item', handler);
        activeOwnerName.value = null;
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        if (observerTimeout) {
          clearTimeout(observerTimeout);
          observerTimeout = null;
        }
        cleanupOwnerModal = null;
      };

      let observer = new MutationObserver(() => {
        if (!document.contains(swalEl)) {
          if (cleanupOwnerModal) cleanupOwnerModal();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // ✅ Phase 4.1: Safety timeout fallback (300,000ms = 5 mins) ป้องกัน observer ค้างใน Memory
      observerTimeout = setTimeout(() => {
        if (cleanupOwnerModal) cleanupOwnerModal();
      }, 300000);

    },
  });

  // อัปเดตครั้งแรกด้วยรายการของวันนี้ทันที
  updateOwnerItemsModal();

  if (pastPendingVids.length > 0) {
    try {
      const fetchedPastItems = [];
      const promises = pastPendingVids.map(async (vid) => {
        const [stockSnap, historySnap] = await Promise.all([
          get(dbRef(db, `stock/${vid}`)),
          get(dbRef(db, `history/${vid}`))
        ]);
        const stockData = stockSnap.val() || {};
        const historyData = historySnap.val() || {};
        const title = historyData.title || vid;
        const cleanTitle = extractDateFromTitle(title);

        Object.keys(stockData).forEach((num) => {
          const item = stockData[num];
          if (item.owner === ownerName || (item.uid && cust.uid && item.uid === cust.uid)) {
            fetchedPastItems.push({
              num: parseInt(num),
              price: item.price || 0,
              time: item.time || 0,
              videoId: vid,
              isToday: false,
              title: cleanTitle
            });
          }
        });
      });

      await Promise.all(promises);
      pastItems.value = fetchedPastItems;
      updateOwnerItemsModal();
    } catch (e) {
      console.error("Error fetching past session items:", e);
    }
  }
}

function getQueueLength(num) {
  return queueLengthsMap.value[num] || 0;
}

function getQueueFingerprint(num) {
  const item = getStockItem(num);
  if (!item?.queue || !Array.isArray(item.queue) || item.queue.length === 0) return "";
  return item.queue
    .map((q) => (typeof q === "object" ? `${q.uid || ""}:${q.name || q.owner || ""}` : String(q)))
    .join(",");
}
function getSourceIcon(source) {
  if (source === "ai") return "fa-solid fa-robot";
  if (source === "regex") return "fa-solid fa-keyboard";
  return "fa-solid fa-hand-pointer";
}
function isNewOrder(num) {
  return newOrders.value.has(num);
}

function saveStockSize() {
  const newSize = parseInt(localStockSize.value);

  if (!newSize || newSize < 1) {
    Swal.fire({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "จำนวนรายการต้องมากกว่า 0",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }

  stockStore.updateStockSize(newSize);

  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    text: `จำนวนรายการ: ${newSize}`,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });

  logger.log("✅ Stock size saved to Firebase:", newSize);
}

let lastVideoId = systemStore.currentVideoId;

watch(
  () => stockStore.stockData,
  (newVal, oldVal) => {
    // Clear cancelled state if stream changed or board was cleared
    if (systemStore.currentVideoId !== lastVideoId) {
      lastVideoId = systemStore.currentVideoId;
      cancelledItems.value.clear();
      Object.keys(cancelledTimers).forEach((key) => {
        clearTimeout(cancelledTimers[key]);
        delete cancelledTimers[key];
      });
      newOrders.value.clear();
      Object.keys(newOrdersTimers).forEach((key) => {
        clearTimeout(newOrdersTimers[key]);
        delete newOrdersTimers[key];
      });
      return;
    }

    if (!newVal || Object.keys(newVal).length === 0) {
      cancelledItems.value.clear();
      Object.keys(cancelledTimers).forEach((key) => {
        clearTimeout(cancelledTimers[key]);
        delete cancelledTimers[key];
      });
      newOrders.value.clear();
      Object.keys(newOrdersTimers).forEach((key) => {
        clearTimeout(newOrdersTimers[key]);
        delete newOrdersTimers[key];
      });
      return;
    }

    // ✅ Detect new orders
    Object.keys(newVal).forEach((key) => {
      const num = parseInt(key);
      const newItem = newVal[key];
      const oldItem = oldVal?.[key];
      if (newItem.owner && (!oldItem || !oldItem.owner)) {
        // ถ้าเป็น order ใหม่ ให้เคลียร์ cancelled state ออก (กรณีคิวเลื่อนขึ้น)
        if (cancelledItems.value.has(num)) {
          clearTimeout(cancelledTimers[num]);
          delete cancelledTimers[num];
          cancelledItems.value.delete(num);
        }
        newOrders.value.add(num);
        if (newOrdersTimers[num]) clearTimeout(newOrdersTimers[num]);
        newOrdersTimers[num] = setTimeout(() => {
          newOrders.value.delete(num);
          delete newOrdersTimers[num];
        }, 15000);
        scrollToItem(num);
      }
    });

    // ✅ Detect cancellations (owner disappeared)
    if (oldVal) {
      Object.keys(oldVal).forEach((key) => {
        const num = parseInt(key);
        const oldItem = oldVal[key];
        const newItem = newVal[key];
        // เฉพาะกรณี: เดิมมี owner แต่ตอนนี้ไม่มีแล้ว (ถูกยกเลิก)
        if (oldItem?.owner && (!newItem || !newItem.owner)) {
          const previousOwner = oldItem.owner;
          // ตั้งค่า blink effect
          cancelledItems.value.set(num, previousOwner);
          // เคลียร์ timer เก่า (กันซ้ำ)
          if (cancelledTimers[num]) clearTimeout(cancelledTimers[num]);
          // ตั้ง timer 15 วินาที แล้วหายไป
          cancelledTimers[num] = setTimeout(() => {
            cancelledItems.value.delete(num);
            delete cancelledTimers[num];
          }, 15000);
        }
      });
    }
  },
  { deep: true },
);

function scrollToItem(num) {
  if (num > gridDisplayLimit.value) {
    gridDisplayLimit.value = Math.min(stockStore.stockSize, num + 20);
  }
  nextTick(() => {
    if (activeFilter.value === "vacant") {
      activeFilter.value = "all";
    }
    nextTick(() => {
      const el = document.getElementById(`stock-${num}`);
      if (el) {
        if (gridSmoothScroll?.lenis?.value && gridContainer.value) {
          const cHeight = gridContainer.value.clientHeight || 400;
          const elHeight = el.clientHeight || 85;
          const offset = -(cHeight / 2 - elHeight / 2);
          gridSmoothScroll.scrollTo(el, { offset, duration: 0.8 });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        highlightedId.value = num;
        if (highlightTimeout) clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(() => {
          if (highlightedId.value === num) highlightedId.value = null;
          highlightTimeout = null;
        }, 10000);
      }
    });
  });
}

function openQueueModal(num) {
  const item = getStockItem(num);
  editingId.value = num;
  editingPrice.value = item.price || 0;
  tempQueue.value = [];
  if (item.owner) {
    tempQueue.value.push({
      owner: item.owner,
      uid: item.uid || "manual",
      time: item.time,
      source: item.source,
      backdated: item.backdated || null,
    });
  }
  if (item.queue) {
    tempQueue.value.push(...JSON.parse(JSON.stringify(item.queue)));
  }

  // 🟢 หากรายการว่าง (ไม่มีการจอง) ให้เพิ่มรายการใหม่ทันทีเพื่อให้พิมพ์ได้เลย
  if (tempQueue.value.length === 0) {
    tempQueue.value.push({
      owner: "",
      uid: "manual-" + Date.now(),
      time: Date.now(),
      source: "manual",
      backdated: systemStore.isLiveFinished ? true : null,
    });
  }

  showModal.value = true;
  nextTick(() => {
    if (queueInputRefs.value[0]) {
      queueInputRefs.value[0].focus();
      queueInputRefs.value[0].select();
    }
  });
}

function closeModal() {
  showModal.value = false;
}

function clearItemData() {
  Swal.fire({
    title: 'ล้างข้อมูลรายการนี้?',
    text: 'ราคาและรายชื่อจะถูกล้างทั้งหมด',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#555',
    confirmButtonText: 'ล้างเลย',
    cancelButtonText: 'ยกเลิก',
    background: '#1e1e1e',
    color: '#fff',
  }).then((result) => {
    if (result.isConfirmed) {
      editingPrice.value = 0;
      tempQueue.value = [];
      Swal.fire({
        icon: 'success',
        title: 'ล้างแล้ว',
        text: 'กดบันทึกเพื่อยืนยัน',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        background: '#1e1e1e',
        color: '#fff',
      });
    }
  });
}
function dragStart(index) {
  draggingIndex = index;
}
function drop(index) {
  const itemToMove = tempQueue.value[draggingIndex];
  tempQueue.value.splice(draggingIndex, 1);
  tempQueue.value.splice(index, 0, itemToMove);
  draggingIndex = null;
}
function removeQueueItem(index) {
  tempQueue.value.splice(index, 1);
}
function manualReserve() {
  tempQueue.value.push({
    owner: "",
    uid: "manual-" + Date.now(),
    time: Date.now(),
    source: "manual",
    backdated: systemStore.isLiveFinished ? true : null,
  });
  // Auto-focus the new input
  nextTick(() => {
    const newIndex = tempQueue.value.length - 1;
    const el = queueInputRefs.value[newIndex];
    if (el) el.focus();
  });
}

// ✅ Autocomplete Logic
const filteredSuggestions = computed(() => {
  if (activeAutocompleteIdx.value === null) return [];
  const person = tempQueue.value[activeAutocompleteIdx.value];
  if (!person) return [];
  const query = (person.owner || "").trim().toLowerCase();
  if (!query) return uniqueBuyerNames.value.slice(0, 10);
  return uniqueBuyerNames.value
    .filter((name) => name.toLowerCase().includes(query) && name.toLowerCase() !== query)
    .slice(0, 10);
});

function onAutocompleteInput(index) {
  activeAutocompleteIdx.value = index;
  highlightedSuggestionIdx.value = -1;
}

function onAutocompleteFocus(index) {
  activeAutocompleteIdx.value = index;
  highlightedSuggestionIdx.value = -1;
}

function onAutocompleteBlur() {
  // Delay to allow mousedown on suggestion
  if (autocompleteTimer) clearTimeout(autocompleteTimer);
  autocompleteTimer = setTimeout(() => {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
    autocompleteTimer = null;
  }, 150);
}

function selectSuggestion(name, index) {
  tempQueue.value[index].owner = name;
  activeAutocompleteIdx.value = null;
  highlightedSuggestionIdx.value = -1;
}

function scrollActiveSuggestionIntoView() {
  nextTick(() => {
    const el = document.querySelector(".autocomplete-dropdown .autocomplete-item.active");
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  });
}

function handleAutocompleteKeydown(event, index) {
  const suggestions = filteredSuggestions.value;

  if (event.key === "ArrowDown") {
    if (suggestions.length === 0) return;
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.min(
      highlightedSuggestionIdx.value + 1,
      suggestions.length - 1,
    );
    scrollActiveSuggestionIntoView();
  } else if (event.key === "ArrowUp") {
    if (suggestions.length === 0) return;
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.max(highlightedSuggestionIdx.value - 1, 0);
    scrollActiveSuggestionIntoView();
  } else if (event.key === "Enter") {
    if (highlightedSuggestionIdx.value >= 0 && suggestions.length > 0) {
      event.preventDefault();
      selectSuggestion(suggestions[highlightedSuggestionIdx.value], index);
    } else {
      // User pressed Enter to save
      event.preventDefault();
      saveQueueChanges();
    }
  } else if (event.key === "Escape") {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
  }
}

function highlightMatch(text, query) {
  if (!text) return "";
  const safeText = escapeHtml(text);
  if (!query) return safeText;
  const q = query.trim();
  if (!q) return safeText;
  const safeQuery = escapeHtml(q);
  const regex = new RegExp(`(${safeQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safeText.replace(regex, '<span class="autocomplete-highlight">$1</span>');
}

async function saveQueueChanges(preventClose = false) {
  const num = editingId.value;
  // Re-fetch latest state at save time to prevent race conditions
  const currentDbItem = getStockItem(num);

  // กรองรายการที่มีชื่อจริง ไม่บันทึกช่องว่างเปล่าๆ
  const validQueue = tempQueue.value.filter(
    (item) => item && typeof item.owner === "string" && item.owner.trim().length > 0
  );

  const newOwnerName = validQueue.length > 0 ? validQueue[0].owner.trim() : null;
  const oldOwnerName = currentDbItem.owner;

  let newData = null;
  if (validQueue.length > 0) {
    const first = validQueue[0];
    const rest = validQueue.slice(1);

    // Determine if the owner booking is new or changed (and not a typo fix)
    let isOwnerChanged = false;
    if (!oldOwnerName && newOwnerName) {
      isOwnerChanged = true;
    } else if (oldOwnerName && newOwnerName && oldOwnerName !== newOwnerName) {
      if (currentDbItem.uid !== first.uid) {
        isOwnerChanged = true;
      }
    }

    if (isOwnerChanged && systemStore.isLiveFinished) {
      first.backdated = true;
      first.time = Date.now();
    }

    newData = {
      owner: first.owner.trim(),
      uid: first.uid,
      time: first.time || Date.now(),
      source: first.source || "manual",
      price: editingPrice.value > 0 ? editingPrice.value : null,
      queue: rest,
    };

    if (first.backdated) {
      newData.backdated = true;
    }
  }

  // Logic Update: Smart TTS handling
  if (oldOwnerName && !newOwnerName) {
    // Case 1: Cancel (Deleted)
    playSfx();
    queueAudio(null, "", `ยกเลิกรายการที่ ${num} ค่ะ`);
  } else if (oldOwnerName && newOwnerName && oldOwnerName !== newOwnerName) {
    // Case 2: Name Changed
    playSfx(); 
    const isSamePerson = currentDbItem.uid === newData.uid;
    if (!isSamePerson) {
      queueAudio(null, "", `${oldOwnerName} หลุดจอง ${newOwnerName}`);
    } else {
      logger.log("✏️ Typo fix detected. Silent update.");
    }
  }

  // แก้ไขบั๊กไม่ยอมลบชื่อคนจองเวลามีราคา
  if (newData) {
    await stockStore.updateItemData(num, newData);
  } else {
    // เคลียร์ข้อมูลคนจองทั้งหมด แต่ยังเก็บราคาไว้ (ถ้ามี)
    await stockStore.updateItemData(num, {
      price: editingPrice.value > 0 ? editingPrice.value : null,
      owner: null,
      uid: null,
      queue: null,
      time: null,
      source: null,
    });
  }

  if (preventClose === true) {
    return;
  }

  closeModal();
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });
}

async function saveAndNavigate(direction) {
  await saveQueueChanges(true); // Save but prevent modal close

  let nextId = editingId.value;
  if (direction === 'prev') {
    nextId = Math.max(1, nextId - 1);
  } else if (direction === 'next') {
    nextId = Math.min(stockStore.stockSize, nextId + 1);
  }

  if (nextId !== editingId.value) {
    if (nextId > gridDisplayLimit.value) {
      gridDisplayLimit.value = Math.min(stockStore.stockSize, nextId + 20);
    }
    if (activeAutocompleteIdx.value !== null) {
      activeAutocompleteIdx.value = null; // Clear autocomplete
    }
    openQueueModal(nextId);
  } else {
    closeModal();
  }
}

function handleGlobalKeydown(e) {
  if (!showModal.value) return;

  if (e.key === 'ArrowLeft') {
    // If they are in a text input, let them move cursor
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    
    e.preventDefault();
    saveAndNavigate('prev');
  } else if (e.key === 'ArrowRight') {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;

    e.preventDefault();
    saveAndNavigate('next');
  }
}

function confirmClear() {
  Swal.fire({
    title: "ล้างกระดาน?",
    text: "ข้อมูลหายหมดนะ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ล้างเลย",
  }).then((r) => {
    if (r.isConfirmed) stockStore.clearAllStock();
  });
}

// ✅ Pull-to-Refresh Touch Handlers
function handleTouchStart(e) {
  const el = gridContainer.value;
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
    pullDistance.value = Math.min(delta * 0.5, 120);

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
    await refreshStock();

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

async function refreshStock() {
  try {
    // Stock data is already synced via Firebase in real-time
    // Just play confirmation sound
    playSfx();

    // Show visual feedback
    logger.log("✅ Stock refreshed");
  } catch (error) {
    console.error("Error refreshing stock:", error);
  }
}

// ✅ Task 2: Real-time modal reactivity — auto-populate tempQueue on background CF
watch(
  () => stockStore.stockData,
  (newVal) => {
    if (!showModal.value || !editingId.value) return;

    // Only act when the modal currently has NO owner (tempQueue empty)
    const hasLocalOwner = tempQueue.value.length > 0 && tempQueue.value[0].owner;
    if (hasLocalOwner) return;

    const incomingItem = newVal[editingId.value];
    if (!incomingItem || !incomingItem.owner) return;

    // A customer CF'd in the background while the modal was open — populate tempQueue
    logger.log("🔔 Background CF detected in modal — auto-populating:", incomingItem.owner);

    tempQueue.value = [
      {
        owner: incomingItem.owner,
        uid: incomingItem.uid || "unknown",
        time: incomingItem.time || Date.now(),
        source: incomingItem.source || "chat",
        backdated: incomingItem.backdated || null,
      },
    ];

    // Append existing queue entries if any
    if (incomingItem.queue && incomingItem.queue.length > 0) {
      tempQueue.value.push(...JSON.parse(JSON.stringify(incomingItem.queue)));
    }

    // 🔊 Notify admin with SFX
    playSfx();
  },
  { deep: true },
);
</script>

<style scoped>
/* Stock Panel & Header */
.stock-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border-right: 1px solid rgba(251, 191, 36, 0.1);
  overflow: hidden;
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

.stock-header {
  position: relative;
  padding: 6px 12px;
  background: linear-gradient(180deg, rgba(11, 15, 23, 0.98) 0%, rgba(13, 17, 28, 0.95) 100%);
  border-bottom: 1px solid rgba(251, 191, 36, 0.12);
  min-height: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}


.header-main-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
}

/* Hide scrollbar for a cleaner look */
.header-main-row::-webkit-scrollbar { display: none; }
.header-main-row { -ms-overflow-style: none; scrollbar-width: none; }

.stock-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  white-space: nowrap;
}

.stat-sold {
  color: #00e676;
  font-size: 1.3em;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 230, 118, 0.3);
  margin: 0 2px;
  font-variant-numeric: tabular-nums;
}

.stock-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95em;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-label {
  color: #888;
  font-size: 0.85em;
  white-space: nowrap;
}

/* ✅ Animated Percentage Badge */
.sale-percent-badge {
  font-size: 0.9em;
  font-weight: 800;
  padding: 1px 8px;
  border-radius: 20px;
  white-space: nowrap;
  letter-spacing: 0.5px;
  font-variant-numeric: tabular-nums;
  transition: color 0.4s ease, background 0.4s ease, box-shadow 0.4s ease;
}

.sale-percent-badge.pct-low {
  color: #9ca3af;
  background: rgba(156, 163, 175, 0.12);
}

.sale-percent-badge.pct-medium {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.15);
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.2);
}

.sale-percent-badge.pct-high {
  color: #fb923c;
  background: rgba(251, 146, 60, 0.15);
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.3);
}

.sale-percent-badge.pct-complete {
  color: #10b981;
  background: rgba(16, 185, 129, 0.15);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.sale-percent-badge.pulse {
  animation: pulse-badge 0.5s ease-out;
}

@keyframes pulse-badge {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

/* ✅ Edge Progress Bar — 2px line at bottom of header */
.mini-progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 0;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  border-radius: 0;
  transition: width 0.6s ease-out, background 0.6s ease-out;
  position: relative;
  overflow: hidden;
}

.mini-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 100%
  );
  animation: mini-shimmer-slide 1.8s infinite;
}

@keyframes mini-shimmer-slide {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* ✅ Motivational Badge */
.motivational-badge {
  font-size: 0.8em;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  white-space: nowrap;
}

/* ✅ Miniaturized Delivery Strip */
.delivery-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1); /* Separator */
  flex-shrink: 0;
}

.shipping-mgr-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 2px 8px 2px 6px;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(13, 148, 136, 0.22) 100%);
  border: 1px solid rgba(45, 212, 191, 0.38);
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.shipping-mgr-btn:hover {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(13, 148, 136, 0.35) 100%);
  border-color: rgba(45, 212, 191, 0.6);
  box-shadow: 0 3px 10px rgba(13, 148, 136, 0.3);
  transform: translateY(-1px) scale(1.04);
}

.shipping-mgr-btn:active {
  transform: scale(0.96);
}

.box-emoji {
  font-size: 14px;
  line-height: 1;
  display: inline-block;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.delivery-count-text {
  color: #2dd4bf;
  font-size: 0.85em;
  font-weight: 800;
  line-height: 1;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  letter-spacing: 0.3px;
}

.ds-scroll {
  display: flex;
  gap: 5px;
}

.ds-pill {
  font-size: 0.8em;
  padding: 2px 9px 2px 7px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ds-icon {
  font-size: 0.95em;
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.ds-name {
  font-weight: 700;
}

.ds-info {
  font-size: 0.85em;
  opacity: 0.88;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.motivational-text {
  font-size: 1.3em;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.progress-bar-container {
  width: 100px;
  max-width: 100px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 99px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
}

.progress-bar {
  height: 100%;
  border-radius: 99px;
  transition:
    width 0.6s ease-out,
    background 0.6s ease-out;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
}

.progress-shimmer {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

.percentage-text {
  font-size: 0.95em;
  font-weight: 700;
  color: #ffd700;
  letter-spacing: 0.5px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Animations */
.stock-list-enter-active,
.stock-list-leave-active {
  transition: all 0.4s ease;
}
.stock-list-enter-from,
.stock-list-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
.stock-list-move {
  transition: transform 0.4s ease;
}

/* Stock Grid & Items */
.stock-grid {
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(125px, 1fr)
  );
  gap: 12px;
  align-content: start; /* ✅ Pack items neatly from top to bottom */
  padding: 16px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  overflow-y: auto;
  flex: 1;
}

.stock-item {
  content-visibility: auto;
  contain-intrinsic-size: 110px 85px;
  aspect-ratio: 1.35;
  background: rgba(13, 17, 28, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px dashed rgba(255, 255, 255, 0.09);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  padding: 8px 6px;
  min-height: 85px;
  z-index: 0;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.03);
}

.grid-load-more {
  grid-column: 1 / -1;
  text-align: center;
  padding: 12px;
  cursor: pointer;
  color: #64748b;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  font-size: 0.9em;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
}

.grid-load-more:hover {
  background: rgba(16, 185, 129, 0.08);
  color: #34d399;
  border-color: rgba(16, 185, 129, 0.35);
}


@media (hover: hover) {
  .stock-item:hover {
    border-color: rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.06);
    transform: translateY(-2px) translateZ(0);
    z-index: 10;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(16, 185, 129, 0.2);
  }

  .stock-item.sold:hover {
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.45) 100%);
    border-color: #34d399;
    box-shadow: 0 8px 28px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(52, 211, 153, 0.4);
  }
}

.stock-item:active {
  transform: scale(0.97) translateZ(0);
}

/* 🟢 Luxury Emerald Theme for Sold Items (replaces old red) */
.stock-item.sold {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.17) 0%, rgba(5, 150, 105, 0.30) 100%);
  border: 1.5px solid rgba(16, 185, 129, 0.6);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 🌟 High-Visibility VIP New Order Alert Effect (จองใหม่สไตล์ VIP Shimmer Beam & Badge) */
.stock-item.sold.new-order {
  animation: newOrderBlink 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  border-width: 2.5px !important;
  z-index: 10 !important;
}

/* 💎 VIP Shimmer Light Sweep (ลำแสงเพชรพาดผ่านตัวการ์ด) */
.new-order-shimmer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
}

.new-order-shimmer::before {
  content: "";
  position: absolute;
  top: -60%;
  left: -120%;
  width: 60%;
  height: 220%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(254, 240, 138, 0.55) 50%,
    rgba(255, 255, 255, 0.4) 75%,
    transparent 100%
  );
  transform: rotate(25deg);
  animation: vipShimmerSweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes vipShimmerSweep {
  0% {
    left: -120%;
  }
  55%, 100% {
    left: 170%;
  }
}

/* 📡 Expanding Radar Pulse Wave for New Order */
.stock-item.sold.new-order::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: calc(var(--radius-md) + 4px);
  border: 1.5px solid #fbbf24;
  pointer-events: none;
  animation: newOrderRadar 1.8s ease-out infinite;
  z-index: -1;
}

/* 🔢 Synchronized High-Contrast Number Flash */
.stock-item.sold.new-order .stock-num {
  animation: newOrderNumBlink 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  z-index: 3;
}

@keyframes newOrderBlink {
  0%,
  100% {
    border-color: #fbbf24 !important;
    background: linear-gradient(145deg, rgba(251, 191, 36, 0.42) 0%, rgba(245, 158, 11, 0.28) 100%) !important;
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.55),
      0 0 30px rgba(251, 191, 36, 0.95),
      0 0 55px rgba(245, 158, 11, 0.45),
      inset 0 0 18px rgba(251, 191, 36, 0.4) !important;
    transform: scale(1.04) translateZ(0);
  }
  50% {
    border-color: #10b981 !important;
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.34) 100%) !important;
    box-shadow:
      0 0 0 1px rgba(16, 185, 129, 0.4),
      0 0 14px rgba(16, 185, 129, 0.35),
      inset 0 0 8px rgba(16, 185, 129, 0.2) !important;
    transform: scale(1.0) translateZ(0);
  }
}

@keyframes newOrderNumBlink {
  0%,
  100% {
    color: #000000 !important;
    background: #fbbf24 !important;
    border-color: #fef08a !important;
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.95);
    transform: scale(1.06);
  }
  50% {
    color: #fbbf24 !important;
    background: rgba(0, 0, 0, 0.85) !important;
    border-color: rgba(251, 191, 36, 0.35) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    transform: scale(1.0);
  }
}

@keyframes newOrderRadar {
  0% {
    transform: scale(0.96);
    opacity: 0.9;
  }
  70% {
    transform: scale(1.18);
    opacity: 0;
  }
  100% {
    transform: scale(1.22);
    opacity: 0;
  }
}

@keyframes highlightBox {
  0% {
    transform: scale(1.15);
    box-shadow: 0 0 30px rgba(251, 191, 36, 0.7);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2);
  }
}

/* 🔢 High-Visibility Item Number Badge — Amber Gold */
.stock-num {
  font-size: 1.1em;
  font-weight: 800;
  font-family: var(--font-main);
  color: #fbbf24;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(251, 191, 36, 0.35);
  padding: 1px 7px;
  border-radius: var(--radius-sm);
  position: absolute;
  top: 5px;
  left: 5px;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.3px;
  z-index: 1; /* Keep behind customer name when long */
}

/* Empty state: dim gold number */
.stock-item:not(.sold) .stock-num {
  color: #64748b;
  border-color: rgba(255, 255, 255, 0.1);
}

.stock-price {
  font-size: 0.75em;
  color: #fbbf24;
  font-weight: bold;
}

.stock-status {
  font-size: 1em;
  color: #e2e8f0;
  font-weight: 600;
  text-align: center;
  width: 100%;
  padding: 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.25;
  margin-top: 8px;
  position: relative;
  z-index: 2;
}

/* 🏷️ Customer Name on Sold Items: White text with crisp 8-way black outline, overlays item number if long */
.stock-item.sold .stock-status {
  color: #ffffff !important;
  font-weight: 700;
  text-shadow:
    -1px -1px 0 #000000,
     0px -1px 0 #000000,
     1px -1px 0 #000000,
    -1px  0px 0 #000000,
     1px  0px 0 #000000,
    -1px  1px 0 #000000,
     0px  1px 0 #000000,
     1px  1px 0 #000000,
     0px  2px 4px rgba(0, 0, 0, 0.95);
  letter-spacing: 0.2px;
  position: relative;
  z-index: 3; /* Overlays item number badge when name is long */
  margin-top: 4px;
}

.stock-status.empty {
  color: var(--status-empty-color);
  font-weight: 400;
  font-size: 0.88em;
  letter-spacing: 0.2px;
}

.stock-status.unsaved-owner {
  color: #fbbf24 !important;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(251, 191, 36, 0.45);
}


.queue-input.unsaved-owner {
  color: #facc15 !important;
  font-weight: 700;
}

/* ... */

/* Responsive Adjustments */
@media (max-width: 768px) {
  .stock-header {
    padding: 4px 8px;
    min-height: 36px;
    gap: 8px;
  }
  .stock-input-group {
    font-size: 0.85em;
    gap: 4px;
  }
  .stock-input-group .edit-input {
    height: 26px;
    width: 50px !important;
    font-size: 0.9em !important;
    padding: 2px 6px;
  }
  .stats-label {
    display: none;
  }
  .motivational-badge {
    display: none;
  }
  .stat-sold {
    font-size: 1.1em;
  }
  .sale-percent-badge {
    font-size: 0.8em;
    padding: 1px 6px;
  }
  .delivery-strip {
    display: none;
  }
}

@media (max-width: 1180px) {
  .stock-grid {
    grid-template-columns: repeat(
      auto-fill,
      minmax(100px, 1fr)
    ); /* Wider on tablet */
    gap: 8px;
    padding: 10px;
  }

  .stock-item {
    min-height: 70px; /* Shorter height */
    border-radius: 8px;
  }

  .stock-num {
    font-size: 1.2em;
  }

  .stock-status {
    font-size: 0.9em;
    margin-top: 6px;
  }

  .stock-item.sold .stock-status {
    margin-top: 3px;
  }

  .stock-price {
    font-size: 0.75em;
    color: #ffd700;
    font-weight: bold;
  }

  .queue-badge {
    font-size: 0.78em;
    padding: 2px 6px;
    top: 4px;
    right: 4px;
  }
}

@media (max-width: 600px) {
  .stock-grid {
    grid-template-columns: repeat(
      auto-fill,
      minmax(90px, 1fr)
    ); /* Wider on mobile */
    gap: 5px;
    padding: 5px;
  }

  .stock-item {
    min-height: 60px; /* Shorter height */
  }
}
/* ✅ Queue Badge (High-Contrast Inside Top-Right Corner) */
.queue-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: linear-gradient(135deg, #ff6d00 0%, #dd2c00 100%);
  color: #ffffff;
  border-radius: 7px;
  padding: 2px 7px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
  box-shadow: 0 2px 8px rgba(221, 44, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.3);
  z-index: 20;
  border: 1.5px solid #fde047;
}

/* 🛢 Owner Booking Count Badge (👗 N ตัว) */
.owner-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  margin-top: 4px;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.owner-count-badge:hover {
  background: rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
  transform: translateY(-1px);
}

/* ✅ Cancelled Item Blink Effect (15 seconds) */
.stock-item.cancelled-blink {
  animation: cancelBlink 1s ease-in-out infinite;
  z-index: 3;
}

@keyframes cancelBlink {
  0%, 100% {
    border-color: #ef4444;
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.6);
    background: rgba(239, 68, 68, 0.25);
  }
  50% {
    border-color: #7f1d1d;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.15);
    background: rgba(239, 68, 68, 0.06);
  }
}

.cancelled-name {
  color: #fca5a5 !important;
  font-weight: 600;
  font-size: 0.85em !important;
  animation: cancelTextPulse 1s ease-in-out infinite;
}

@keyframes cancelTextPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.queue-item-time {
  font-size: 0.72em;
  color: #94a3b8;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  padding: 3px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-left: 4px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.queue-item-time .normal-icon {
  font-size: 0.9em;
  color: #94a3b8;
}

.queue-item-time.backdated {
  color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(234, 88, 12, 0.22) 100%);
  border-color: rgba(245, 158, 11, 0.45);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.queue-item-time.backdated .backdated-icon {
  color: #fbbf24;
  font-size: 0.9em;
}

.queue-item-time.backdated .backdated-label {
  background: rgba(245, 158, 11, 0.25);
  color: #fff7ed;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  letter-spacing: 0.2px;
}

.queue-item-time.backdated .backdated-sep {
  opacity: 0.5;
  color: #f59e0b;
}

.queue-item-time.backdated .backdated-val {
  color: #fed7aa;
}

/* Quick Filter Dropdown */
.quick-filter-container {
  display: flex;
  align-items: center;
}

.quick-filter-dropdown-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.quick-filter-select {
  appearance: none;
  -webkit-appearance: none;
  background: rgba(26, 32, 44, 0.85);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 6px 32px 6px 14px;
  font-weight: 700;
  font-family: "Kanit", sans-serif;
  font-size: 0.88em;
  cursor: pointer;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.quick-filter-select.qf-all {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
}

.quick-filter-select.qf-sold {
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.5);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
}

.quick-filter-select.qf-vacant {
  color: #e2e8f0;
  border-color: rgba(226, 232, 240, 0.35);
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.15);
}

.quick-filter-select.qf-queue {
  color: #c084fc;
  border-color: rgba(192, 132, 252, 0.5);
  box-shadow: 0 0 12px rgba(192, 132, 252, 0.25);
}

.quick-filter-select option {
  background: #1e293b;
  color: #fff;
  font-weight: 600;
  padding: 10px;
}

.quick-filter-dropdown-wrap .dropdown-arrow {
  position: absolute;
  right: 12px;
  font-size: 0.75em;
  color: #94a3b8;
  pointer-events: none;
}

/* 🔍 Stock Search Box */
.stock-search-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
}

.stock-search-icon {
  position: absolute;
  left: 11px;
  font-size: 0.8em;
  color: #94a3b8;
  pointer-events: none;
}

.stock-search-input {
  background: rgba(26, 32, 44, 0.85);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 6px 28px 6px 30px;
  font-weight: 500;
  font-family: "Kanit", sans-serif;
  font-size: 0.86em;
  color: #f1f5f9;
  width: 135px;
  outline: none;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.stock-search-input:focus {
  width: 175px;
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
  background: rgba(15, 23, 42, 0.95);
}

.stock-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 0.8em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.stock-search-clear:hover {
  color: #f87171;
  background: rgba(255, 255, 255, 0.1);
}

@media (max-width: 768px) {
  .stock-search-input {
    width: 105px;
  }
  .stock-search-input:focus {
    width: 135px;
  }
}
</style>

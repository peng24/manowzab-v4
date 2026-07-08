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

        <!-- 📦 Delivery Strip (moved from Header) -->
        <div class="delivery-strip">
          <div
            class="shipping-mgr-icon"
            @click="openShippingManager"
            title="รายการจัดส่ง"
            style="cursor: pointer;"
          >
            <span class="box-emoji">📦</span>
            <span v-if="todayDeliveryCount > 0" class="delivery-badge">{{ todayDeliveryCount }}</span>
          </div>
          <div class="ds-scroll" v-if="deliveryStrip.length > 0">
            <span
              v-for="c in deliveryStrip"
              :key="c.id"
              class="ds-pill"
              :class="'ds-' + c.urgency"
              :title="c.tooltip"
            >
              {{ c.name }}
              <span class="ds-info" v-if="c.info">{{ c.info }}</span>
            </span>
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
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <TransitionGroup name="stock-list">
        <div
          v-for="i in stockStore.stockSize"
          :key="i"
          :class="[
            'stock-item',
            getStockItem(i).owner ? 'sold' : '',
            isNewOrder(i) ? 'new-order' : '',
            highlightedId === i ? 'highlight' : '',
            cancelledItems.has(i) ? 'cancelled-blink' : '',
          ]"
          @click="openQueueModal(i)"
          :id="`stock-${i}`"
        >
          <div class="stock-num">{{ i }}</div>
          <div v-if="cancelledItems.has(i) && !getStockItem(i).owner" class="stock-status cancelled-name">
            ❌ {{ cancelledItems.get(i) }}
          </div>
          <div v-else :class="['stock-status', { empty: !getStockItem(i).owner }]">
            {{ getStockItem(i).owner || "ว่าง" }}
          </div>
          <div
            v-if="getStockItem(i).owner && getOwnerCount(getStockItem(i).owner, getStockItem(i).uid) >= 1"
            class="owner-count-badge"
            :title="`${getStockItem(i).owner} จองทั้งหมด ${getOwnerCount(getStockItem(i).owner, getStockItem(i).uid)} ชิ้น — คลิกเพื่อจัดการ`"
            @click.stop="showOwnerItems(getStockItem(i).owner)"
          >👗 {{ getOwnerCount(getStockItem(i).owner, getStockItem(i).uid) }} ตัว</div>
          <div
            v-if="getStockItem(i).owner && getStockItem(i).backdated"
            class="backdated-time"
            :title="`จองย้อนหลัง: ${formatTime(getStockItem(i).time)}`"
          >
            🕒 {{ formatTime(getStockItem(i).time) }}
          </div>
          <div v-if="getStockItem(i).price" class="stock-price">
            {{ getStockItem(i).price }} บาท
          </div>
          <div v-if="getQueueLength(i) > 0" class="queue-badge">
            +{{ getQueueLength(i) }}
          </div>
        </div>
      </TransitionGroup>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="queue-modal-overlay"
        @click.self="closeModal"
      >
        <div class="queue-modal">
          <div class="queue-header">
            <h3 class="text-success">
              <i class="fa-solid fa-list-ol"></i> รายการที่ {{ editingId }}
            </h3>
            <div style="display: flex; gap: 8px; align-items: center">
              <button class="btn btn-dark btn-sm" @click="saveAndNavigate('prev')" title="บันทึกและไปรายการก่อนหน้า (ลูกศรซ้าย)">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button class="btn btn-dark btn-sm" @click="saveAndNavigate('next')" title="บันทึกและไปรายการถัดไป (ลูกศรขวา)">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
              <button class="btn btn-danger btn-sm" @click="clearItemData" title="ล้างข้อมูล">
                <i class="fa-solid fa-eraser"></i> ล้าง
              </button>
              <button class="btn btn-dark" @click="closeModal">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="queue-body">
            <div class="price-input-section">
              <label class="price-label">
                <i class="fa-solid fa-tag"></i> ราคา
              </label>
              <div class="price-input-row">
                <input
                  type="number"
                  v-model="editingPrice"
                  ref="priceInputRef"
                  class="price-input-field"
                  placeholder="0"
                  @keyup.enter="saveQueueChanges"
                />
                <span class="price-unit">บาท</span>
              </div>
            </div>
            <div class="queue-list">
              <div
                v-if="tempQueue.length === 0"
                class="queue-empty-state"
              >
                <i class="fa-solid fa-inbox" style="font-size: 1.8em; opacity: 0.3; margin-bottom: 4px"></i>
                ไม่มีการจอง
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
                <div class="flex-center gap-10" style="flex: 1">
                  <div class="drag-handle">
                    <i class="fa-solid fa-grip-vertical"></i>
                  </div>
                  <span class="queue-rank" :class="{ 'queue-rank--owner': index === 0 }">#{{ index + 1 }}</span>
                  <span v-if="index === 0" class="owner-badge">
                    <i class="fa-solid fa-crown"></i> ได้ของ
                  </span>
                  <span v-else class="backup-badge">
                    สำรอง
                  </span>
                  <div class="autocomplete-wrapper">
                    <input
                      type="text"
                      v-model="person.owner"
                      class="queue-input"
                      :ref="el => setQueueInputRef(el, index)"
                      @input="onAutocompleteInput(index)"
                      @focus="onAutocompleteFocus(index)"
                      @blur="onAutocompleteBlur"
                      @keydown="handleAutocompleteKeydown($event, index)"
                      autocomplete="off"
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
                        <span v-html="highlightMatch(suggestion, person.owner)"></span>
                      </div>
                    </div>
                  </div>
                  <!-- 🕒 เวลาจอง / จองย้อนหลัง -->
                  <div
                    v-if="person.time"
                    class="queue-item-time"
                    :class="{ 'backdated': person.backdated }"
                    :title="person.backdated ? `จองย้อนหลังเมื่อ ${formatTime(person.time)}` : `จองเมื่อ ${formatTime(person.time)}`"
                  >
                    <span>{{ person.backdated ? '🕒' : '📅' }}</span>
                    <span>{{ formatTime(person.time) }}</span>
                  </div>
                </div>
                <div class="queue-actions">
                  <button
                    class="btn btn-dark btn-sm"
                    @click="removeQueueItem(index)"
                    title="ลบ"
                  >
                    <i class="fa-solid fa-trash text-error"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            class="queue-footer"
          >
            <button class="btn btn-dark" @click="manualReserve">
              <i class="fa-solid fa-plus"></i> เพิ่มชื่อ
            </button>
            <button class="btn btn-success" @click="saveQueueChanges">
              <i class="fa-solid fa-save"></i> บันทึกการแก้ไข
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick, inject, onMounted, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import { useAudio } from "../composables/useAudio";
import { ref as dbRef, onValue, get, remove, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const DEBUG_MODE = false;
const logger = { log: (...args) => DEBUG_MODE && console.log(...args) };

const stockStore = useStockStore();
const systemStore = useSystemStore();
const { playSfx, queueAudio } = useAudio();
const openShippingManager = inject("openShippingManager");
const gridContainer = ref(null);
const highlightedId = ref(null);
const newOrders = ref(new Set());

// ✅ Cancelled Items Blink Effect (15 seconds)
const cancelledItems = ref(new Map());
const cancelledTimers = {};

// 📦 Delivery Strip State
const deliveryCustomers = ref([]);
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

const todayDeliveryCount = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deliveryCustomers.value.filter((c) => {
    if (c.status === 'done' || !c.deliveryDate) return false;
    const target = new Date(c.deliveryDate);
    target.setHours(0, 0, 0, 0);
    return target.getTime() <= today.getTime();
  }).length;
});

const deliveryStrip = computed(() => {
  return deliveryCustomers.value
    .filter((c) => c.status !== 'done')
    .map((c) => {
      const days = getDeliveryDays(c.deliveryDate);
      let urgency, info, tooltip;
      if (!c.deliveryDate) {
        urgency = 'none'; info = '';
        tooltip = `${c.name}: ยังไม่กำหนดวันส่ง (${c.itemCount || 0} ชิ้น)`;
      } else if (days < 0) {
        urgency = 'overdue'; info = `เลย ${Math.abs(days)} วัน!`;
        tooltip = `${c.name}: เลยกำหนด ${Math.abs(days)} วัน (${c.itemCount || 0} ชิ้น)`;
      } else if (days === 0) {
        urgency = 'today'; info = 'วันนี้!';
        tooltip = `${c.name}: ส่งวันนี้ (${c.itemCount || 0} ชิ้น)`;
      } else if (days === 1) {
        urgency = 'pack-tonight'; info = '📦 แพ็คคืนนี้';
        tooltip = `${c.name}: ส่งพรุ่งนี้ • แพ็คคืนนี้ (${c.itemCount || 0} ชิ้น)`;
      } else if (days <= 3) {
        urgency = 'soon'; info = `อีก ${days} วัน`;
        tooltip = `${c.name}: ${formatThaiDateShort(c.deliveryDate)} (${c.itemCount || 0} ชิ้น)`;
      } else {
        urgency = 'later'; info = formatThaiDateShort(c.deliveryDate);
        tooltip = `${c.name}: ${formatThaiDateShort(c.deliveryDate)} (${c.itemCount || 0} ชิ้น)`;
      }
      return { id: c.uid || c.name, name: c.name, urgency, info, days, tooltip, count: c.itemCount || 0 };
    })
    .sort((a, b) => a.days - b.days);
});

onMounted(() => {
  // 📦 Listen delivery_customers for badge count + strip
  const unsubDelivery = onValue(dbRef(db, "delivery_customers"), (snapshot) => {
    const data = snapshot.val() || {};
    deliveryCustomers.value = Object.keys(data).map((key) => ({
      id: key,
      uid: key,
      ...data[key],
    }));
  });
  cleanupFns.push(unsubDelivery);

  window.addEventListener('keydown', handleGlobalKeydown);
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
const priceInputRef = ref(null);
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
  // Trigger pulse effect
  isPulsingPercent.value = false;
  void document.body.offsetWidth; // force reflow
  isPulsingPercent.value = true;
  setTimeout(() => { isPulsingPercent.value = false; }, 600);
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
  // ✅ Cleanup cancelled item timers
  Object.values(cancelledTimers).forEach(t => clearTimeout(t));
  cleanupFns.forEach(fn => {
    if (typeof fn === 'function') {
      fn();
    }
  });
  cleanupFns.length = 0;
  window.removeEventListener('keydown', handleGlobalKeydown);
  console.log("🧹 Memory Cleaned Up!");
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
  const todayCount = ownerItemCounts.value[ownerName] || 0;
  const cust = deliveryCustomers.value.find(
    (c) => (uid && c.uid === uid) || c.name === ownerName
  );
  if (cust) {
    const videoId = systemStore.currentVideoId;
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
    return todayCount + pastCount;
  }
  return todayCount;
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
    const timeText = item.time ? formatTime(item.time) : '';
    const removeDetail = `${item.num}|${item.videoId}`;

    return `<div style="display:flex; align-items:center; gap:10px; padding:10px 12px; margin:4px 0; background:linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius:10px; border:1px solid #2a2a4a; transition:all 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#2a2a4a'">
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span style="background:linear-gradient(135deg, #0ea5e9, #2563eb); color:#fff; font-weight:700; padding:2px 10px; border-radius:20px; font-size:0.85em; white-space:nowrap;">#${item.num}</span>
          <span style="background:rgba(255, 255, 255, 0.08); color:#cbd5e1; border:1px solid rgba(255, 255, 255, 0.15); font-weight:500; padding:2px 8px; border-radius:20px; font-size:0.8em; white-space:nowrap;">${item.title}</span>
          ${priceText ? `<span style="color:#fbbf24; font-weight:600; font-size:0.85em;">💰 ${priceText} ฿</span>` : ''}
        </div>
        ${timeText ? `<div style="font-size:0.7em; color:#6b7280; margin-top:4px; padding-left:2px;">📅 ${timeText}</div>` : ''}
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

// เฝ้าติดตามการซิงค์ข้อมูลสต็อกหรือการจัดส่งเพื่ออัปเดตป๊อปอัปให้เป็นเรียลไทม์
watch(
  [() => stockStore.stockData, () => deliveryCustomers.value],
  () => {
    if (activeOwnerName.value) {
      updateOwnerItemsModal();
    }
  },
  { deep: true }
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
    didOpen: () => {
      // ฟัง event ลบรายการ
      const handler = async (e) => {
        const [numStr, vid] = e.detail.split('|');
        const num = parseInt(numStr);
        const isToday = vid === currentVideoId;

        const result = await Swal.fire({
          title: `ลบ #${num} ของ ${ownerName}?`,
          text: !isToday ? `สินค้านี้อยู่ในรอบส่งย้อนหลัง` : `ราคาและคิวทั้งหมดในช่องนี้จะถูกลบ`,
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
            // ลบรายการของวันนี้ตามปกติ
            await stockStore.processCancel(num);
          } else {
            // ลบรายการของวันก่อนหน้า (Past Session)
            const pastItemRef = dbRef(db, `stock/${vid}/${num}`);
            await remove(pastItemRef);

            // อัปเดตข้อมูลเซสชั่นใน delivery_customers
            if (cust) {
              const sessionRef = dbRef(db, `delivery_customers/${cust.uid || cust.id}/sessions/${vid}`);
              const sessionSnap = await get(sessionRef);
              if (sessionSnap.exists()) {
                const sData = sessionSnap.val();
                const newCount = Math.max((sData.count || 0) - 1, 0);

                // ดึงรายการสต็อกที่เหลือในเซสชั่นนั้นมาคำนวณราคารวมใหม่
                const itemSnap = await get(dbRef(db, `stock/${vid}`));
                const allStock = itemSnap.val() || {};
                let newTotalPrice = 0;
                Object.values(allStock).forEach(i => {
                  if (i.owner === ownerName || (i.uid && cust.uid && i.uid === cust.uid)) {
                    newTotalPrice += i.price ? parseInt(i.price) : 0;
                  }
                });

                if (newCount === 0) {
                  await remove(sessionRef);
                } else {
                  await update(sessionRef, {
                    count: newCount,
                    totalPrice: newTotalPrice
                  });
                }

                // คำนวณยอดสะสม itemCount และ totalPrice ใหม่ในหน้าจัดส่ง
                const sessionsSnap = await get(dbRef(db, `delivery_customers/${cust.uid || cust.id}/sessions`));
                const sessions = sessionsSnap.val() || {};
                const totalCount = Object.values(sessions)
                  .filter(s => s.status !== "done")
                  .reduce((sum, s) => sum + (s.count || 0), 0);
                const totalPrice = Object.values(sessions)
                  .filter(s => s.status !== "done")
                  .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

                await update(dbRef(db, `delivery_customers/${cust.uid || cust.id}`), {
                  itemCount: totalCount,
                  totalPrice: totalPrice,
                  updatedAt: Date.now(),
                });
              }
            }

            // คำนวณยอดขายในประวัติใหม่
            const pastStockSnap = await get(dbRef(db, `stock/${vid}`));
            if (pastStockSnap.exists()) {
              const stockData = pastStockSnap.val();
              let totalSales = 0;
              let totalItems = 0;
              Object.values(stockData).forEach(order => {
                if (order.owner && order.price) {
                  totalSales += parseInt(order.price);
                  totalItems++;
                }
              });
              await update(dbRef(db, `history/${vid}`), {
                totalSales,
                totalItems
              });
            }

            // ลบจากรายการ pastItems ท้องถิ่นเพื่ออัปเดต UI ทันที
            pastItems.value = pastItems.value.filter(i => !(i.num === num && i.videoId === vid));
          }

          Swal.fire({
            icon: 'success',
            title: `ลบ #${num} เรียบร้อย`,
            toast: true,
            position: 'top-end',
            timer: 1500,
            showConfirmButton: false,
          });

          // อัปเดต Modal ทันที
          updateOwnerItemsModal();
        }
      };

      document.addEventListener('remove-owner-item', handler);
      // cleanup เมื่อปิด
      const swalEl = Swal.getPopup();
      const observer = new MutationObserver(() => {
        if (!document.contains(swalEl)) {
          document.removeEventListener('remove-owner-item', handler);
          activeOwnerName.value = null;
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
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
  const item = stockStore.stockData[num];
  return item && item.queue ? item.queue.length : 0;
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
      return;
    }

    if (!newVal || Object.keys(newVal).length === 0) {
      cancelledItems.value.clear();
      Object.keys(cancelledTimers).forEach((key) => {
        clearTimeout(cancelledTimers[key]);
        delete cancelledTimers[key];
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
        setTimeout(() => newOrders.value.delete(num), 15000);
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
  nextTick(() => {
    const el = document.getElementById(`stock-${num}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
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
  showModal.value = true;
  nextTick(() => { if (priceInputRef.value) priceInputRef.value.focus(); });
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
  setTimeout(() => {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
  }, 150);
}

function selectSuggestion(name, index) {
  tempQueue.value[index].owner = name;
  activeAutocompleteIdx.value = null;
  highlightedSuggestionIdx.value = -1;
}

function handleAutocompleteKeydown(event, index) {
  const suggestions = filteredSuggestions.value;
  if (suggestions.length === 0) return;

  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.min(
      highlightedSuggestionIdx.value + 1,
      suggestions.length - 1,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedSuggestionIdx.value = Math.max(highlightedSuggestionIdx.value - 1, 0);
  } else if (event.key === "Enter" && highlightedSuggestionIdx.value >= 0) {
    event.preventDefault();
    selectSuggestion(suggestions[highlightedSuggestionIdx.value], index);
  } else if (event.key === "Escape") {
    activeAutocompleteIdx.value = null;
    highlightedSuggestionIdx.value = -1;
  }
}

function highlightMatch(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return text.replace(regex, '<span class="autocomplete-highlight">$1</span>');
}

async function saveQueueChanges(preventClose = false) {
  const num = editingId.value;
  // Re-fetch latest state at save time to prevent race conditions
  const currentDbItem = getStockItem(num);
  const newOwnerName =
    tempQueue.value.length > 0 ? tempQueue.value[0].owner : null;
  const oldOwnerName = currentDbItem.owner;

  let newData = null;
  if (tempQueue.value.length > 0) {
    const first = tempQueue.value[0];
    const rest = tempQueue.value.slice(1);

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
      owner: first.owner,
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
  border-right: 1px solid var(--border-color);
  overflow: hidden;
}

/* ✅ Pull-to-Refresh Indicator */
.pull-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(180deg, #252525 0%, #1a1a1a 100%);
  transition: height 0.3s ease-out;
  color: #999;
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

.stock-header {
  position: relative;
  padding: 4px 10px;
  background: #252525;
  border-bottom: 1px solid var(--border-color);
  min-height: 40px;
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

.shipping-mgr-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px; /* Smaller size */
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
}

.box-emoji {
  font-size: 14px; /* Smaller emoji */
}

.delivery-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ff4500;
  color: white;
  font-size: 10px; /* Smaller badge */
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 10px;
}

.ds-scroll {
  display: flex;
  gap: 4px;
}

.ds-pill {
  font-size: 0.8em; /* Reduced text size */
  padding: 2px 8px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ds-info {
  font-size: 0.85em;
  opacity: 0.8;
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
    minmax(130px, 1fr)
  ); /* Wider columns */
  gap: 15px;
  row-gap: 20px;
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  overflow-y: auto;
  flex: 1;
}

.stock-item {
  aspect-ratio: 1.4; /* Wider cards (Landscape) */
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center; /* ✅ Centered vertically */
  gap: 0px; /* ✅ Spacing between elements */
  cursor: pointer;
  position: relative;
  padding: 6px;
  /* overflow: hidden; Removed to show badge */
  min-height: 90px; /* Back to original height */
  z-index: 0;
  transition:
    transform 0.1s,
    border-color 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

@media (hover: hover) {
  .stock-item:hover {
    border-color: #777;
    background: #333;
    transform: translateY(-2px) scale(1.02);
    z-index: 10;
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.6);
  }
}

.stock-item:active {
  transform: scale(0.96);
  background: #333;
}
.stock-item.sold {
  background: rgba(211, 47, 47, 0.15);
  border-color: var(--primary);
}
.stock-item.sold.new-order {
  animation: newOrderBlink 1s infinite;
  z-index: 2;
}
.stock-item.highlight {
  animation: highlightBox 1s ease-out;
  z-index: 5;
  border-color: #ffeb3b !important;
}

@keyframes newOrderBlink {
  0%,
  100% {
    border-color: #ffd700;
    box-shadow: 0 0 15px #ffd700;
    background-color: rgba(255, 215, 0, 0.3);
  }
  50% {
    border-color: var(--primary);
    box-shadow: none;
    background-color: rgba(211, 47, 47, 0.15);
  }
}
@keyframes highlightBox {
  0% {
    transform: scale(1.15);
    box-shadow: 0 0 25px #ffeb3b;
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 10px rgba(211, 47, 47, 0.3);
  }
}

.stock-num {
  font-size: 1.45em;
  font-weight: bold;
  color: rgba(255, 255, 255, 0.3);
  position: absolute;
  top: 2px;
  left: 6px;
  line-height: 1;
}

.stock-price {
  font-size: 0.75em;
  color: #ffd700;
  font-weight: bold;
}

.stock-status {
  font-size: 1.15em;
  color: #00e676; /* Changed to Green Accent */
  font-weight: 500;
  text-align: center;
  width: 100%;
}

.stock-status.empty {
  color: rgba(255, 255, 255, 0.3);
}

.stock-status {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 1.4em;

  /* Multi-line truncation logic */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.2;
  margin-top: 0; /* ✅ Remove margin to allow true centering */
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
    margin-top: 10px;
  }

  .stock-price {
    font-size: 0.75em;
    color: #ffd700;
    font-weight: bold;
  }

  .queue-badge {
    font-size: 0.7em;
    padding: 1px 3px;
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
/* ✅ Queue Badge (Red Circle) */
.queue-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #d32f2f;
  color: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  z-index: 20;
  border: 2px solid #2a2a2a; /* Border matching card bg to make it pop */
}

/* 🛢 Owner Booking Count Badge (👗 N ตัว) */
.owner-count-badge {
  display: block;
  font-size: 0.85em;
  color: #60a5fa;
  font-weight: 600;
  margin-top: 1px;
  opacity: 0.9;
  text-align: center;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: color 0.2s;
}

.owner-count-badge:hover {
  color: #93c5fd;
  text-decoration: underline;
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

.backdated-time {
  font-size: 0.7em;
  color: #fb923c;
  font-weight: 600;
  margin-top: 2px;
  background: rgba(251, 146, 60, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(251, 146, 60, 0.25);
  display: flex;
  align-items: center;
  gap: 3px;
  letter-spacing: 0.2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.queue-item-time {
  font-size: 0.72em;
  color: #888;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-left: 4px;
}

.queue-item-time.backdated {
  color: #fb923c;
  background: rgba(251, 146, 60, 0.12);
  border-color: rgba(251, 146, 60, 0.3);
}
</style>

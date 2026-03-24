<template>
  <div class="stock-panel">
    <div class="stock-header">
      <div class="stock-input-group">
        รายการ:
        <input
          type="number"
          v-model.lazy="localStockSize"
          class="edit-input"
          style="
            width: 70px;
            text-align: center;
            font-size: 1.1em;
            font-weight: bold;
          "
          @change="saveStockSize"
        />
      </div>

      <div class="header-center stock-stats">
        <span class="stats-label">ขายแล้ว:</span>
        <span class="stat-sold">{{ animatedSoldCount }}</span>
        <span style="opacity: 0.5">/{{ stockStore.stockSize }}</span>
        <div class="sale-percent-badge" :class="[percentColorClass, { 'pulse': isPulsingPercent }]">
          {{ animatedPercentage }}%
        </div>
        <div class="mini-progress-track">
          <div class="mini-progress-fill" :style="{ width: soldPercentage + '%', background: progressBarColor }">
            <div class="mini-shimmer"></div>
          </div>
        </div>
        <span class="motivational-badge" :key="motivationalText">{{ motivationalText }}</span>
      </div>

      <div></div>
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
          ]"
          @click="openQueueModal(i)"
          :id="`stock-${i}`"
        >
          <div class="stock-num">{{ i }}</div>
          <div :class="['stock-status', { empty: !getStockItem(i).owner }]">
            {{ getStockItem(i).owner || "ว่าง" }}
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
            <button class="btn btn-dark" @click="closeModal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="queue-body">
            <div
              class="flex-center gap-10 mb-10 p-10"
              style="background: #2a2a2a; border-radius: 8px"
            >
              <span>ราคา:</span>
              <input
                type="number"
                v-model="editingPrice"
                class="edit-input"
                style="width: 100px"
              />
              <span>บาท</span>
            </div>
            <div class="queue-list">
              <div
                v-if="tempQueue.length === 0"
                class="text-center p-10 text-secondary"
              >
                ไม่มีการจอง
              </div>
              <div
                v-for="(person, index) in tempQueue"
                :key="index"
                class="queue-item"
                :class="{ active: index === 0 }"
                draggable="true"
                @dragstart="dragStart(index)"
                @dragover.prevent
                @drop="drop(index)"
              >
                <div class="flex-center gap-10" style="flex: 1">
                  <div class="drag-handle">
                    <i class="fa-solid fa-grip-vertical"></i>
                  </div>
                  <span class="queue-rank">#{{ index + 1 }}</span>
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
            class="queue-header"
            style="justify-content: flex-end; gap: 10px"
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
import { computed, ref, watch, nextTick, onUnmounted } from "vue";
import { useStockStore } from "../stores/stock";
import { useAudio } from "../composables/useAudio";
import Swal from "sweetalert2";

const DEBUG_MODE = false;
const logger = { log: (...args) => DEBUG_MODE && console.log(...args) };

const stockStore = useStockStore();
const { playSfx, queueAudio } = useAudio();
const gridContainer = ref(null);
const highlightedId = ref(null);
const newOrders = ref(new Set());

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

watch(
  () => stockStore.stockData,
  (newVal, oldVal) => {
    Object.keys(newVal).forEach((key) => {
      const num = parseInt(key);
      const newItem = newVal[key];
      const oldItem = oldVal?.[key];
      if (newItem.owner && (!oldItem || !oldItem.owner)) {
        newOrders.value.add(num);
        setTimeout(() => newOrders.value.delete(num), 15000);
        scrollToItem(num);
      }
    });
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
    });
  }
  if (item.queue) {
    tempQueue.value.push(...JSON.parse(JSON.stringify(item.queue)));
  }
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
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

async function saveQueueChanges() {
  const num = editingId.value;
  const oldItem = getStockItem(num);
  const newOwnerName =
    tempQueue.value.length > 0 ? tempQueue.value[0].owner : null;
  const oldOwnerName = oldItem.owner;

  let newData = null;
  if (tempQueue.value.length > 0) {
    const first = tempQueue.value[0];
    const rest = tempQueue.value.slice(1);
    newData = {
      owner: first.owner,
      uid: first.uid,
      time: first.time || Date.now(),
      source: first.source || "manual",
      price: editingPrice.value > 0 ? editingPrice.value : null,
      queue: rest,
    };
  }

  // ✅ Logic Update: Smart TTS handling
  if (oldOwnerName && !newOwnerName) {
    // Case 1: Cancel (Deleted)
    playSfx();
    queueAudio(null, "", `ยกเลิกรายการที่ ${num} ค่ะ`);
  } else if (oldOwnerName && newOwnerName && oldOwnerName !== newOwnerName) {
    // Case 2: Name Changed
    playSfx(); // Always play "Ting" sound

    // Check if it's the same UID (Typo fix) or different UID (New Person)
    // We compare the UID of the item currently in stock vs the new data being saved
    const isSamePerson = oldItem.uid === newData.uid;

    if (!isSamePerson) {
      // 📢 Different person -> Announce swap
      queueAudio(null, "", `${oldOwnerName} หลุดจอง ${newOwnerName}`);
    } else {
      // 🤫 Same person (Typo fix) -> Silent update (Only SFX played above)
      logger.log("✏️ Typo fix detected. Silent update.");
    }
  }

  if (newData) {
    await stockStore.updateItemData(num, newData);
  } else if (editingPrice.value > 0) {
    // ✅ Case: Empty item but Price is set (OVERWRITE to clear owner)
    await stockStore.updateItemData(num, {
      price: editingPrice.value,
      owner: null,
      uid: null,
      queue: null,
      time: null,
      source: null,
    });
    playSfx();
  } else {
    await stockStore.processCancel(num);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #252525;
  border-bottom: 1px solid var(--border-color);
  position: relative;
  height: 70px;
}

.stock-input-group {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-secondary);
  z-index: 2;
}

.header-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  white-space: nowrap;
}

.stat-sold {
  color: #00e676;
  font-size: 1.8em;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(0, 230, 118, 0.3);
  margin-left: 5px;
  margin-right: 5px;
  font-variant-numeric: tabular-nums;
}

.stock-stats {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.stats-label {
  color: #999;
  font-size: 0.95em;
  white-space: nowrap;
}

/* ✅ Animated Percentage Badge */
.sale-percent-badge {
  font-size: 1.1em;
  font-weight: 800;
  padding: 2px 10px;
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

/* ✅ Mini Progress Bar */
.mini-progress-track {
  width: 80px;
  height: 8px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 99px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.mini-progress-fill {
  height: 100%;
  border-radius: 99px;
  transition: width 0.6s ease-out, background 0.6s ease-out;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(255, 107, 53, 0.4);
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
    rgba(255, 255, 255, 0.35) 50%,
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
  font-size: 0.95em;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
  white-space: nowrap;
  animation: gentle-bounce 2.5s ease-in-out infinite;
}

@keyframes gentle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
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
</style>

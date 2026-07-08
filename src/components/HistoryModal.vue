<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="history-modal-container">
      
      <!-- HEADER -->
      <div class="modal-header">
        <h2><i class="fa-solid fa-clock-rotate-left"></i> ประวัติการขาย (History)</h2>
        <button class="btn-close" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- SIDEBAR: List of Lives -->
        <div class="sidebar">
          <div class="sidebar-header">
            <span>รายการย้อนหลัง</span>
            <div class="flex gap-1">
                 <button class="btn-icon-sm-danger" @click="openCleanupModal" title="ล้างประวัติย้อนหลังเกิน 3 เดือน">
                   <i class="fa-solid fa-broom"></i>
                 </button>
                 <button class="btn-icon-sm" @click="fixHistoryData" title="คำนวณยอดใหม่ (Fix Data)">
                   <i class="fa-solid fa-wrench"></i>
                 </button>
                 <button class="btn-icon-sm" @click="history.fetchHistoryList" title="รีเฟรช">
                   <i class="fa-solid fa-rotate-right"></i>
                 </button>
            </div>
          </div>
          
          <div v-if="history.isLoading.value" class="text-center p-10 text-muted">
            <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...
          </div>

          <div v-else class="sidebar-list">
             <div 
               v-for="item in history.historyList.value" 
               :key="item.videoId"
               class="sidebar-item"
               :class="{ active: selectedId === item.videoId }"
               @click="selectLive(item)"
             >
               <div class="item-title">{{ item.title || "ไม่มีชื่อ" }}</div>
               <div class="item-date">
                 <i class="fa-regular fa-calendar"></i> {{ formatDate(item.timestamp) }}
               </div>
               <div class="item-meta">
                 ยอด: {{ formatCurrency(item.totalSales || 0) }}
               </div>
             </div>
             
             <div v-if="history.historyList.value.length === 0" class="text-center p-10 text-muted">
                ไม่พบข้อมูลประวัติ
             </div>
          </div>
        </div>

        <!-- MAIN CONTENT: Details -->
        <div class="main-content">
          <div v-if="!selectedItem" class="empty-state">
            <i class="fa-solid fa-arrow-left"></i>
            <p>เลือกรายการทางซ้ายเพื่อดูรายละเอียด</p>
          </div>

          <div v-else class="content-wrapper">
             <!-- Stats Bar (Styled like StockGrid header) -->
             <div class="stats-bar-header">
                <div v-if="isDetailsLoading" class="flex items-center justify-center p-4 w-full text-muted">
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...
                </div>
                <template v-else>
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
                      <span style="opacity: 0.5; font-size: 0.85em">/{{ selectedItem.stockSize || 70 }}</span>
                      <div class="sale-percent-badge" :class="[percentColorClass, { 'pulse': isPulsingPercent }]">
                        {{ animatedPercentage }}%
                      </div>
                      <span class="motivational-badge">{{ motivationalText }}</span>
                    </div>

                    <div class="header-actions">
                      <button class="btn btn-warning btn-sm" @click="confirmClearHistoryStock" title="ล้างกระดานประวัติ">
                        <i class="fa-solid fa-eraser"></i> ล้างกระดาน
                      </button>
                      <button class="btn btn-success btn-sm" @click="exportCSV" title="ดาวน์โหลดรายงาน CSV">
                        <i class="fa-solid fa-file-csv"></i> Export CSV
                      </button>
                      <button class="btn btn-danger btn-sm" @click="handleDelete" title="ลบไลฟ์สดนี้ถาวร">
                        <i class="fa-solid fa-trash"></i> ลบไลฟ์
                      </button>
                    </div>
                  </div>

                  <div class="mini-progress-track">
                    <div class="mini-progress-fill" :style="{ width: soldPercentage + '%', background: progressBarColor }">
                      <div class="mini-shimmer"></div>
                    </div>
                  </div>
                </template>
             </div>

             <!-- Controls -->
             <div class="controls-bar">
                <div class="search-wrapper">
                  <i class="fa-solid fa-magnifying-glass search-icon"></i>
                  <input 
                    v-model="searchQuery" 
                    type="text" 
                    class="search-input" 
                    placeholder="ค้นหาชื่อลูกค้า, รหัสสินค้า..."
                  >
                </div>
                
                <div class="view-toggles flex gap-2 ml-4">
                    <button 
                        class="btn btn-sm" 
                        :class="viewMode === 'list' ? 'btn-primary' : 'btn-outline'"
                        @click="viewMode = 'list'"
                        title="List View"
                    >
                        <i class="fa-solid fa-list"></i>
                    </button>
                    <button 
                        class="btn btn-sm" 
                        :class="viewMode === 'grid' ? 'btn-primary' : 'btn-outline'"
                        @click="viewMode = 'grid'"
                        title="Grid View"
                    >
                        <i class="fa-solid fa-th"></i>
                    </button>
                    <button 
                        v-if="viewMode === 'grid'"
                        class="btn btn-sm btn-outline" 
                        @click="isFullscreen = !isFullscreen"
                        title="Full Screen"
                    >
                        <i class="fa-solid fa-expand"></i>
                    </button>
                </div>
             </div>

             <!-- Table (List View) -->
             <div v-if="viewMode === 'list'" class="table-container">
               <table class="data-table">
                 <thead>
                   <tr>
                     <th width="80">ลำดับ</th>
                     <th width="100">รหัส</th>
                     <th>ลูกค้า</th>
                     <th width="120" class="text-right">ราคา</th>
                     <th width="100" class="text-center">ช่องทาง</th>
                     <th width="120">เวลา</th>
                     <th width="120" class="text-center">จัดการ</th>
                   </tr>
                 </thead>
                 <tbody>
                   <tr v-if="filteredOrders.length === 0">
                      <td colspan="7" class="text-center py-20 text-muted">ไม่พบข้อมูลคำสั่งซื้อ</td>
                   </tr>
                   <tr v-for="(order, index) in filteredOrders" :key="order.stockId" class="hover:bg-slate-700">
                     <td class="text-muted">#{{ index + 1 }}</td>
                     <td class="font-bold">{{ order.stockId }}</td>
                     <td>
                        <div class="customer-name">{{ order.owner }}</div>
                        <div class="customer-uid text-sm text-muted">{{ order.uid }}</div>
                     </td>
                     <td class="text-right font-mono">{{ formatCurrency(order.price || 0) }}</td>
                     <td class="text-center">
                        <span class="badge" :class="order.method === 'manual-force' ? 'badge-warn' : 'badge-info'">
                           {{ order.method || 'System' }}
                        </span>
                     </td>
                     <td class="text-sm text-muted">
                        {{ formatTime(order.timestamp) }}
                     </td>
                     <td class="text-center">
                        <div class="action-btns">
                           <button class="btn-action btn-action-edit" @click.stop="openQueueModal(order.stockId)" title="จัดการคิว">
                             <i class="fa-solid fa-list-ol"></i>
                           </button>
                           <button class="btn-action btn-action-delete" @click.stop="processHistoryCancel(order.stockId, order.uid, order.owner)" title="ลบชื่อคนจอง">
                             <i class="fa-solid fa-user-xmark"></i>
                           </button>
                        </div>
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
             
             <!-- Grid View (Styled like StockGrid) -->
             <div v-else class="grid-container" :class="{ 'fullscreen-grid': isFullscreen }">
                <div v-if="isFullscreen" class="fullscreen-header">
                     <h2>รายการขาย {{ selectedItem.title }}</h2>
                     <button class="btn btn-danger" @click="isFullscreen = false">
                        <i class="fa-solid fa-compress"></i> ออก
                     </button>
                </div>
             
                <div class="grid-content">
                    <div 
                        v-for="item in allGridItems" 
                        :key="item.id"
                        class="grid-item"
                        :class="{ 'empty': item.isEmpty, 'sold': !item.isEmpty }"
                        @click="openQueueModal(item.id)"
                    >
                        <div class="item-num">{{ item.id }}</div>
                        
                        <div class="item-status" :class="{ empty: item.isEmpty }">
                          {{ item.isEmpty ? 'ว่าง' : item.owner }}
                        </div>
                        
                        <div
                          v-if="!item.isEmpty && getOwnerCount(item.owner, item.uid) >= 1"
                           class="owner-count-badge"
                           :title="`${item.owner} จองทั้งหมด ${getOwnerCount(item.owner, item.uid)} ชิ้น — คลิกเพื่อจัดการ`"
                           @click.stop="showOwnerItems(item.owner)"
                        >
                          👗 {{ getOwnerCount(item.owner, item.uid) }} ตัว
                        </div>
                        
                        <div
                          v-if="!item.isEmpty && item.backdated"
                          class="backdated-time"
                          :title="`จองย้อนหลัง: ${formatTime(item.time)}`"
                        >
                          🕒 {{ formatTime(item.time) }}
                        </div>
                        
                        <div v-if="!item.isEmpty && item.price" class="stock-price">
                          {{ item.price }} บาท
                        </div>

                        <div v-if="getQueueLength(item.id) > 0" class="queue-badge">
                          +{{ getQueueLength(item.id) }}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>

      </div>

    </div>
  </div>

  <!-- Historical Queue Modal (Teleport or Overlay) -->
  <Teleport to="body">
    <div v-if="showQueueModal" class="queue-modal-overlay" @click.self="closeQueueModal">
      <div class="queue-modal">
        <div class="queue-header">
          <h3 class="text-success">
            <i class="fa-solid fa-list-ol"></i> รายการประวัติที่ {{ editingId }}
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
            <button class="btn btn-dark" @click="closeQueueModal">
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
            <div v-if="tempQueue.length === 0" class="queue-empty-state">
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
                
                <div
                  v-if="person.time"
                  class="queue-item-time backdated"
                  :title="`จองย้อนหลังเมื่อ ${formatTime(person.time)}`"
                >
                  <span>🕒</span>
                  <span>{{ formatTime(person.time) }}</span>
                </div>
              </div>
              
              <div class="queue-actions">
                <button class="btn btn-dark btn-sm" @click="removeQueueItem(index)" title="ลบ">
                  <i class="fa-solid fa-trash text-error"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="queue-footer">
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
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useHistory } from "../composables/useHistory";
import { ref as dbRef, onValue, get, remove, update, runTransaction, set } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);
const history = useHistory();

const selectedId = ref(null);
const selectedItem = ref(null);
const searchQuery = ref("");
const viewMode = ref("list"); // 'list' | 'grid'
const isFullscreen = ref(false);
const isDetailsLoading = ref(false);

// Scoped Customer Total Purchases State
const deliveryCustomers = ref([]);
const activeOwnerName = ref(null);
const pastItems = ref([]);

// Queue Modal State
const showQueueModal = ref(false);
const editingId = ref(null);
const editingPrice = ref(0);
const tempQueue = ref([]);
const priceInputRef = ref(null);
let draggingIndex = null;

// Autocomplete State
const activeAutocompleteIdx = ref(null);
const highlightedSuggestionIdx = ref(-1);
const queueInputRefs = ref({});

function setQueueInputRef(el, index) {
  if (el) queueInputRefs.value[index] = el;
}

// Active dynamic listeners cleanup references
const pageListeners = [];
const sessionListeners = [];

function cleanupSessionListeners() {
  sessionListeners.forEach(unsub => {
    if (typeof unsub === "function") unsub();
  });
  sessionListeners.length = 0;
}

onMounted(() => {
  history.fetchHistoryList();

  // Listen to delivery customers for badge counts + past summaries
  const unsubDelivery = onValue(dbRef(db, "delivery_customers"), (snapshot) => {
    const data = snapshot.val() || {};
    deliveryCustomers.value = Object.keys(data).map((key) => ({
      id: key,
      uid: key,
      ...data[key],
    }));
  });
  pageListeners.push(unsubDelivery);

  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  cleanupSessionListeners();
  pageListeners.forEach(unsub => {
    if (typeof unsub === "function") unsub();
  });
  window.removeEventListener('keydown', handleGlobalKeydown);
});

// Setup dynamic real-time listener when a session is selected
async function selectLive(item) {
  cleanupSessionListeners();

  selectedId.value = item.videoId;
  selectedItem.value = { ...item, orders: {}, stockSize: 70 };
  searchQuery.value = ""; // Reset search

  isDetailsLoading.value = true;
  // Fetch details initially
  const { orders, stockSize } = await history.fetchHistoryDetails(item.videoId);
  selectedItem.value.orders = orders;
  selectedItem.value.stockSize = stockSize;
  isDetailsLoading.value = false;

  // Real-time stock sync
  const stockRef = dbRef(db, `stock/${item.videoId}`);
  const unsubStock = onValue(stockRef, (snapshot) => {
    const val = snapshot.val() || {};
    if (selectedItem.value && selectedId.value === item.videoId) {
      selectedItem.value.orders = val;
    }
  });
  sessionListeners.push(unsubStock);

  // Real-time stockSize sync
  const sizeRef = dbRef(db, `settings/${item.videoId}/stockSize`);
  const unsubSize = onValue(sizeRef, (snapshot) => {
    const val = snapshot.val();
    if (selectedItem.value && selectedId.value === item.videoId && val) {
      selectedItem.value.stockSize = val;
    }
  });
  sessionListeners.push(unsubSize);
}

// Convert orders object to array
const ordersList = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return [];
  
  return Object.keys(selectedItem.value.orders).map(key => {
    const item = selectedItem.value.orders[key];
    return {
      stockId: key,
      ...item,
      timestamp: item.timestamp || item.time || 0
    };
  }).sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
});

// Filter Logic
const filteredOrders = computed(() => {
  if (!searchQuery.value) return ordersList.value;
  const q = searchQuery.value.toLowerCase();
  
  return ordersList.value.filter(o => 
     o.stockId.toString().includes(q) ||
     (o.owner && o.owner.toLowerCase().includes(q))
  );
});

// Unique customer names for autocomplete
const customerNames = computed(() => {
    if (!selectedItem.value || !selectedItem.value.orders) return [];
    const names = new Set();
    Object.values(selectedItem.value.orders).forEach(order => {
        if (order.owner) names.add(order.owner);
    });
    return [...names].sort();
});

// Grid Items Logic
const allGridItems = computed(() => {
    if (!selectedItem.value) return [];
    const size = selectedItem.value.stockSize || 70;
    const orders = selectedItem.value.orders || {};
    const items = [];

    for (let i = 1; i <= size; i++) {
        const order = orders[i];
        items.push({
            id: i,
            ...order,
            isEmpty: !order || !order.owner
        });
    }
    
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        return items.filter(item => 
           item.id.toString().includes(q) || 
           (item.owner && item.owner.toLowerCase().includes(q))
        );
    }

    return items;
});

// Stats Logic (Progress Bar & Badges)
const soldCount = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return 0;
  return Object.values(selectedItem.value.orders).filter((item) => item.owner).length;
});

const soldPercentage = computed(() => {
  if (!selectedItem.value) return 0;
  const size = selectedItem.value.stockSize || 70;
  if (size === 0) return 0;
  return Math.round((soldCount.value / size) * 100);
});

const totalRevenue = computed(() => {
  if (!selectedItem.value || !selectedItem.value.orders) return 0;
  return Object.values(selectedItem.value.orders).reduce((sum, o) => sum + (parseInt(o.price) || 0), 0);
});

// Animated Counter Logic
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
    return "linear-gradient(90deg, #ff6b35 0%, #ff4500 100%)";
  if (percentage <= 60)
    return "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)";
  return "linear-gradient(90deg, #10b981 0%, #059669 100%)";
});

// Formatters
function formatDate(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("th-TH", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function formatTime(timestamp) {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function formatCurrency(val) {
   return new Intl.NumberFormat('th-TH').format(val);
}

// Scoped Owner count badge (👗 N ตัว)
const ownerItemCounts = computed(() => {
  const counts = {};
  if (!selectedItem.value || !selectedItem.value.orders) return counts;
  Object.values(selectedItem.value.orders).forEach((item) => {
    if (item.owner) {
      counts[item.owner] = (counts[item.owner] || 0) + 1;
    }
  });
  return counts;
});

function getOwnerCount(ownerName, uid = null) {
  const currentCount = ownerItemCounts.value[ownerName] || 0;
  const cust = deliveryCustomers.value.find(
    (c) => (uid && c.uid === uid) || c.name === ownerName
  );
  if (cust) {
    let pastCount = 0;
    if (cust.sessions) {
      Object.keys(cust.sessions).forEach((vid) => {
        if (vid !== selectedId.value) {
          const session = cust.sessions[vid];
          if (session && session.status !== "done") {
            pastCount += session.count || 0;
          }
        }
      });
    }
    return currentCount + pastCount;
  }
  return currentCount;
}

// Date parser helper
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

function getStockItem(num) {
  if (!selectedItem.value || !selectedItem.value.orders) return {};
  return selectedItem.value.orders[num] || {};
}

function getQueueLength(num) {
  const item = getStockItem(num);
  return item && item.queue ? item.queue.length : 0;
}

// Autocomplete filter logic
const filteredSuggestions = computed(() => {
  if (activeAutocompleteIdx.value === null) return [];
  const person = tempQueue.value[activeAutocompleteIdx.value];
  if (!person) return [];
  const query = (person.owner || "").trim().toLowerCase();
  if (!query) return customerNames.value.slice(0, 10);
  return customerNames.value
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

// Queue modal edits
function openQueueModal(num) {
  const item = getStockItem(num);
  editingId.value = num;
  editingPrice.value = item.price || 0;
  tempQueue.value = [];
  if (item.owner) {
    tempQueue.value.push({
      owner: item.owner,
      uid: item.uid || "manual",
      time: item.time || Date.now(),
      source: item.source || "manual",
      backdated: item.backdated || null,
    });
  }
  if (item.queue) {
    try {
      const q = typeof item.queue === 'string' ? JSON.parse(item.queue) : item.queue;
      if (Array.isArray(q)) {
        tempQueue.value.push(...JSON.parse(JSON.stringify(q)));
      }
    } catch (e) {
      console.error("Error parsing queue:", e);
    }
  }
  showQueueModal.value = true;
  nextTick(() => { if (priceInputRef.value) priceInputRef.value.focus(); });
}

function closeQueueModal() {
  showQueueModal.value = false;
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
    backdated: true,
  });
  nextTick(() => {
    const newIndex = tempQueue.value.length - 1;
    const el = queueInputRefs.value[newIndex];
    if (el) el.focus();
  });
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

// Scoped recalculation of deliveries and history totals
async function updateDeliveryAndHistoryTotals(videoId) {
  if (!videoId) return;

  try {
    const deliveryCustSnap = await get(dbRef(db, "delivery_customers"));
    const deliveryData = deliveryCustSnap.val() || {};

    const stockSnap = await get(dbRef(db, `stock/${videoId}`));
    const allStock = stockSnap.val() || {};

    const sessionCounts = {};
    Object.values(allStock).forEach(item => {
      if (item.owner) {
        const key = item.uid || item.owner;
        if (!sessionCounts[key]) {
          sessionCounts[key] = { count: 0, totalPrice: 0 };
        }
        sessionCounts[key].count++;
        sessionCounts[key].totalPrice += item.price ? parseInt(item.price) : 0;
      }
    });

    const promises = Object.keys(deliveryData).map(async (custKey) => {
      const cust = deliveryData[custKey];
      const hasSession = cust.sessions && cust.sessions[videoId];
      const matchKey = Object.keys(sessionCounts).find(k => k === cust.uid || k === cust.name);
      
      if (matchKey) {
        const stats = sessionCounts[matchKey];
        const currentSessionStatus = hasSession ? (cust.sessions[videoId].status || "pending") : "pending";
        
        await update(dbRef(db, `delivery_customers/${custKey}/sessions/${videoId}`), {
          count: stats.count,
          totalPrice: stats.totalPrice,
          status: currentSessionStatus
        });
      } else {
        if (hasSession) {
          await remove(dbRef(db, `delivery_customers/${custKey}/sessions/${videoId}`));
        }
      }

      const sessionsSnap = await get(dbRef(db, `delivery_customers/${custKey}/sessions`));
      const sessions = sessionsSnap.val() || {};
      
      const totalCount = Object.values(sessions)
        .filter(s => s.status !== "done")
        .reduce((sum, s) => sum + (s.count || 0), 0);
      const totalAmount = Object.values(sessions)
        .filter(s => s.status !== "done")
        .reduce((sum, s) => sum + (s.totalPrice || 0), 0);

      await update(dbRef(db, `delivery_customers/${custKey}`), {
        itemCount: totalCount,
        totalPrice: totalAmount,
        updatedAt: Date.now()
      });
    });

    await Promise.all(promises);

    let totalSales = 0;
    let totalItems = 0;
    Object.values(allStock).forEach(order => {
      if (order.owner) {
        if (order.price) {
          totalSales += parseInt(order.price);
        }
        totalItems++;
      }
    });

    await update(dbRef(db, `history/${videoId}`), {
      totalSales,
      totalItems,
      lastUpdated: Date.now()
    });

  } catch (err) {
    console.error("Error in updateDeliveryAndHistoryTotals:", err);
  }
}

// Save Queue Changes Scoped
async function saveQueueChanges(preventClose = false) {
  if (!selectedId.value || !editingId.value) return;
  const num = editingId.value;
  const videoId = selectedId.value;

  const currentDbItem = getStockItem(num);
  const newOwnerName = tempQueue.value.length > 0 ? tempQueue.value[0].owner : null;

  let newData = null;
  if (tempQueue.value.length > 0) {
    const first = tempQueue.value[0];
    const rest = tempQueue.value.slice(1);

    newData = {
      owner: first.owner,
      uid: first.uid || "manual-" + Date.now(),
      time: first.time || Date.now(),
      source: first.source || "manual-edit",
      price: editingPrice.value > 0 ? editingPrice.value : null,
      queue: rest,
      backdated: true
    };
  }

  if (newData) {
    await history.updateHistoryItem(videoId, num, newData);
  } else {
    await history.updateHistoryItem(videoId, num, null);
    if (editingPrice.value > 0) {
      await update(dbRef(db, `stock/${videoId}/${num}`), {
        price: editingPrice.value
      });
    }
  }

  await updateDeliveryAndHistoryTotals(videoId);

  if (preventClose === true) {
    return;
  }

  closeQueueModal();
  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });
}

// Scoped transaction cancel
async function processHistoryCancel(num, uid = null, ownerName = null) {
  if (!selectedId.value) return;
  const videoId = selectedId.value;
  const itemRef = dbRef(db, `stock/${videoId}/${num}`);

  try {
    await runTransaction(itemRef, (currentData) => {
      if (!currentData) return null;

      const isOwner =
        (!uid && !ownerName) ||
        (uid && currentData.uid === uid) ||
        (ownerName && currentData.owner === ownerName);

      if (isOwner) {
        if (currentData.queue && currentData.queue.length > 0) {
          const next = currentData.queue[0];
          const nextQ = currentData.queue.slice(1);

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
          return {
            price: currentData.price || null
          };
        }
      } else {
        if (currentData.queue && currentData.queue.length > 0) {
          currentData.queue = currentData.queue.filter((q) => {
            const matchesUid = uid && q.uid === uid;
            const matchesName = ownerName && q.owner === ownerName;
            return !(matchesUid || matchesName);
          });
        }
        return currentData;
      }
    });

    await updateDeliveryAndHistoryTotals(videoId);

    Swal.fire({
      icon: "success",
      title: "ยกเลิกรายการเรียบร้อย",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500
    });

  } catch (e) {
    console.error("History cancel failed: ", e);
  }
}

// Scoped navigation and global keys
const localStockSize = ref(70);

watch(
  () => selectedItem.value?.stockSize,
  (newVal) => {
    if (newVal && newVal !== localStockSize.value) {
      localStockSize.value = newVal;
    }
  },
  { immediate: true }
);

async function saveStockSize() {
  if (!selectedId.value) return;
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

  const sizeRef = dbRef(db, `settings/${selectedId.value}/stockSize`);
  await set(sizeRef, newSize);

  await updateDeliveryAndHistoryTotals(selectedId.value);

  Swal.fire({
    icon: "success",
    title: "บันทึกแล้ว",
    text: `จำนวนรายการ: ${newSize}`,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 1500,
  });
}

async function saveAndNavigate(direction) {
  await saveQueueChanges(true);

  const size = selectedItem.value?.stockSize || 70;
  let nextId = editingId.value;
  if (direction === 'prev') {
    nextId = Math.max(1, nextId - 1);
  } else if (direction === 'next') {
    nextId = Math.min(size, nextId + 1);
  }

  if (nextId !== editingId.value) {
    if (activeAutocompleteIdx.value !== null) {
      activeAutocompleteIdx.value = null;
    }
    openQueueModal(nextId);
  } else {
    closeQueueModal();
  }
}

function handleGlobalKeydown(e) {
  if (!showQueueModal.value) return;

  if (e.key === 'ArrowLeft') {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    e.preventDefault();
    saveAndNavigate('prev');
  } else if (e.key === 'ArrowRight') {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    e.preventDefault();
    saveAndNavigate('next');
  }
}

// Clear Board for historical session
function confirmClearHistoryStock() {
  if (!selectedId.value) return;
  Swal.fire({
    title: "ล้างกระดาน?",
    text: "ข้อมูลของประวัตินี้จะหายหมดนะ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ล้างเลย",
    cancelButtonText: "ยกเลิก",
    background: '#1e293b',
    color: '#fff'
  }).then(async (r) => {
    if (r.isConfirmed) {
      const stockRef = dbRef(db, `stock/${selectedId.value}`);
      await remove(stockRef);

      await updateDeliveryAndHistoryTotals(selectedId.value);
      
      Swal.fire("ล้างเรียบร้อย", "ล้างข้อมูลกระดานสำเร็จแล้ว", "success");
    }
  });
}

// Scoped Customer Total Purchases modal
watch(
  [() => selectedItem.value?.orders, () => deliveryCustomers.value],
  () => {
    if (activeOwnerName.value) {
      updateOwnerItemsModal();
    }
  },
  { deep: true }
);

function updateOwnerItemsModal() {
  if (!activeOwnerName.value || !Swal.isVisible()) return;

  const ownerName = activeOwnerName.value;
  const videoId = selectedId.value;

  const currentItems = [];
  if (selectedItem.value && selectedItem.value.orders) {
    Object.keys(selectedItem.value.orders).forEach((num) => {
      const item = selectedItem.value.orders[num];
      if (item.owner === ownerName) {
        currentItems.push({
          num: parseInt(num),
          price: item.price || 0,
          time: item.time || 0,
          videoId: videoId,
          isToday: true,
          title: extractDateFromTitle(selectedItem.value.title)
        });
      }
    });
  }

  const allItems = [...currentItems, ...pastItems.value];

  allItems.sort((a, b) => {
    if (a.isToday && !b.isToday) return -1;
    if (!a.isToday && b.isToday) return 1;
    if (a.videoId === b.videoId) {
      return a.num - b.num;
    }
    return b.time - a.time;
  });

  const totalPrice = allItems.reduce((sum, i) => sum + (parseInt(i.price) || 0), 0);

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
      <button onclick="document.dispatchEvent(new CustomEvent('remove-owner-item-history', {detail: '${removeDetail}'}))" 
              style="background:linear-gradient(135deg, #dc2626, #b91c1c); color:white; border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.8em; font-weight:600; flex-shrink:0; transition:all 0.2s; box-shadow:0 2px 6px rgba(220,38,38,0.3);"
              onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(220,38,38,0.5)'"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(220,38,38,0.3)'">
        <i class="fa-solid fa-trash-can"></i> ลบ
      </button>
    </div>`;
  }).join('');

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

async function showOwnerItems(ownerName) {
  let uid = null;
  if (selectedItem.value && selectedItem.value.orders) {
    Object.values(selectedItem.value.orders).forEach((item) => {
      if (item.owner === ownerName && item.uid) {
        uid = item.uid;
      }
    });
  }

  const cust = deliveryCustomers.value.find(
    (c) => (uid && c.uid === uid) || c.name === ownerName
  );

  const videoId = selectedId.value;
  const pastPendingVids = [];
  if (cust && cust.sessions) {
    Object.keys(cust.sessions).forEach((vid) => {
      if (vid !== videoId && cust.sessions[vid].status !== "done") {
        pastPendingVids.push(vid);
      }
    });
  }

  activeOwnerName.value = ownerName;
  pastItems.value = [];

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
      const handler = async (e) => {
        const [numStr, vid] = e.detail.split('|');
        const num = parseInt(numStr);
        const isCurrentSession = vid === videoId;

        const result = await Swal.fire({
          title: `ลบ #${num} ของ ${ownerName}?`,
          text: !isCurrentSession ? `สินค้านี้อยู่ในรอบส่งย้อนหลัง` : `ราคาและคิวทั้งหมดในช่องนี้จะถูกลบ`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ลบเลย',
          cancelButtonText: 'ยกเลิก',
          confirmButtonColor: '#d32f2f',
          background: '#1e1e1e',
          color: '#fff',
        });

        if (result.isConfirmed) {
          if (isCurrentSession) {
            await processHistoryCancel(num, uid, ownerName);
          } else {
            const pastItemRef = dbRef(db, `stock/${vid}/${num}`);
            await remove(pastItemRef);
            
            await updateDeliveryAndHistoryTotals(vid);

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

          updateOwnerItemsModal();
        }
      };

      document.addEventListener('remove-owner-item-history', handler);
      
      const swalEl = Swal.getPopup();
      const observer = new MutationObserver(() => {
        if (!document.contains(swalEl)) {
          document.removeEventListener('remove-owner-item-history', handler);
          activeOwnerName.value = null;
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    },
  });

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

// Actions
async function handleDelete() {
  const result = await Swal.fire({
    title: "ยืนยันการลบ?",
    text: `ต้องการลบประวัติ "${selectedItem.value.title}" และแชททั้งหมด?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก"
  });

  if (result.isConfirmed) {
     await history.deleteHistory(selectedId.value);
     selectedId.value = null;
     selectedItem.value = null;
     Swal.fire("เรียบร้อย", "ลบข้อมูลสำเร็จแล้ว", "success");
  }
}

function exportCSV() {
  if (filteredOrders.value.length === 0) {
     Swal.fire("ไม่มีข้อมูล", "ไม่พบรายการสั่งซื้อ", "warning");
     return;
  }

  let csvContent = "\uFEFFDate,Time,Stock ID,Customer Name,Price,Source\n";
  const dateStr = formatDate(selectedItem.value.timestamp).split(' ')[0];

  filteredOrders.value.forEach(order => {
     const timeStr = formatTime(order.timestamp);
     const safeName = order.owner ? order.owner.replace(/"/g, '""') : "";
     
     csvContent += `"${dateStr}","${timeStr}",${order.stockId},"${safeName}",${order.price || 0},"${order.method || 'unknown'}"\n`;
  });
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `sales_history_${selectedId.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function fixHistoryData() {
    const result = await Swal.fire({
        title: "คำนวณยอดใหม่?",
        text: "ระบบจะสแกนรายการทั้งหมดและคำนวณยอดขายใหม่ (อาจใช้เวลาสักครู่)",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "เริ่มคำนวณ",
        cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
        await history.recalculateAllHistory();
        Swal.fire("เสร็จสิ้น", "คำนวณยอดขายทั้งหมดใหม่เรียบร้อยแล้ว", "success");
    }
}

async function openCleanupModal() {
  Swal.fire({
    title: "กำลังประเมินขนาดข้อมูล...",
    html: "ระบบกำลังคำนวณขนาดข้อมูลย้อนหลังเกิน 3 เดือน กรุณารอสักครู่",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  try {
    const preview = await history.getCleanupPreview();
    Swal.close();

    if (preview.olderLivesCount === 0) {
      Swal.fire({
        title: "ไม่มีประวัติเก่า",
        text: "ไม่พบข้อมูลประวัติย้อนหลังเกิน 3 เดือนให้ลบ",
        icon: "info",
        confirmButtonText: "ตกลง",
        confirmButtonColor: "#3b82f6",
        background: '#0f172a',
        color: '#fff'
      });
      return;
    }

    const sizeInMB = preview.estimatedSizeInBytes / (1024 * 1024);
    const sizeText = sizeInMB >= 1 
      ? `${sizeInMB.toFixed(2)} MB` 
      : `${(preview.estimatedSizeInBytes / 1024).toFixed(2)} KB`;

    const livesListHtml = preview.olderLives.map(live => {
      const dateStr = formatDate(live.timestamp);
      return `<li style="text-align: left; padding: 6px 8px; border-bottom: 1px solid #334155; font-size: 0.9em; display: flex; justify-content: space-between;">
        <span style="color: #cbd5e1;">${live.title || 'ไม่มีชื่อไลฟ์'}</span>
        <span style="color: #f87171; font-weight: bold; font-family: monospace;">[${dateStr.split(' ')[0]}]</span>
      </li>`;
    }).slice(0, 8).join('') + (preview.olderLivesCount > 8 ? `<li style="text-align: center; padding-top: 8px; color: #94a3b8; font-style: italic;">...และอีก ${preview.olderLivesCount - 8} ไลฟ์</li>` : '');

    const confirmHtml = `
      <div style="font-size: 0.95rem; text-align: left; line-height: 1.5;">
        <div style="background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 15px; color: #fca5a5;">
          <strong>พบประวัติย้อนหลังทั้งหมด:</strong> ${preview.totalLives} ไลฟ์<br>
          <strong>เกิน 3 เดือนย้อนหลัง:</strong> ${preview.olderLivesCount} ไลฟ์<br>
          <strong>พื้นที่ฐานข้อมูลโดยประมาณที่จะได้รับคืน:</strong> <span style="font-weight: bold; color: #ef4444;">${sizeText}</span>
        </div>
        <div style="font-weight: bold; margin-bottom: 8px; color: #e2e8f0;">รายชื่อไลฟ์สดที่จะถูกลบ:</div>
        <ul style="max-height: 150px; overflow-y: auto; padding-left: 0; margin: 0 0 15px 0; background: #0f172a; border-radius: 6px; border: 1px solid #334155; list-style-type: none;">
          ${livesListHtml}
        </ul>
        <div style="color: #f87171; font-weight: bold; text-align: center;">
          ⚠️ คำเตือน: ประวัติการขาย รายการจองสต็อก และแชทสดทั้งหมดของไลฟ์เหล่านี้จะถูกลบถาวร ไม่สามารถกู้คืนได้!
        </div>
      </div>
    `;

    const result = await Swal.fire({
      title: "ล้างประวัติย้อนหลัง?",
      html: confirmHtml,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#475569",
      confirmButtonText: `ยืนยันการลบ ${preview.olderLivesCount} ไลฟ์`,
      cancelButtonText: "ยกเลิก",
      background: '#1e293b',
      color: '#fff',
      width: 500
    });

    if (result.isConfirmed) {
      Swal.fire({
        title: "กำลังลบข้อมูล...",
        html: "กรุณารอระบบเคลียร์ข้อมูลสักครู่",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const videoIdsToDelete = preview.olderLives.map(live => live.videoId);
      await history.deleteMultipleHistory(videoIdsToDelete);
      
      if (selectedId.value && videoIdsToDelete.includes(selectedId.value)) {
        selectedId.value = null;
        selectedItem.value = null;
      }

      Swal.fire({
        title: "ลบสำเร็จแล้ว!",
        text: `ทำการเคลียร์พื้นที่ฐานข้อมูลเรียบร้อย คืนพื้นที่ประมาณ ${sizeText}`,
        icon: "success",
        confirmButtonColor: "#10b981",
        background: '#0f172a',
        color: '#fff'
      });
    }
  } catch (error) {
    console.error("Cleanup error:", error);
    Swal.fire({
      title: "เกิดข้อผิดพลาด",
      text: "ไม่สามารถคำนวณหรือลบข้อมูลได้ในขณะนี้",
      icon: "error",
      confirmButtonColor: "#ef4444",
      background: '#0f172a',
      color: '#fff'
    });
  }
}
</script>

<style scoped>
.history-modal-container {
  background: var(--bg-panel, #0f172a);
  width: 95%;
  max-width: 1100px;
  height: 85vh;
  border-radius: 12px;
  border: 1px solid var(--border-color, #334155);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  padding: 15px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
}
.btn-close:hover { color: #fff; }

.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 300px;
  background: #1e293b;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 10px 15px;
  background: #0f172a;
  border-bottom: 1px solid #334155;
  color: #94a3b8;
  font-size: 0.9em;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
}

.sidebar-item {
  padding: 15px;
  border-bottom: 1px solid #334155;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-item:hover { background: #334155; }
.sidebar-item.active { background: #2563eb; border-color: #2563eb; }

.item-title {
  color: #f1f5f9;
  font-weight: 500;
  margin-bottom: 4px;
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
}
.item-date { color: #94a3b8; font-size: 0.85em; }
.item-meta { margin-top: 5px; color: #10b981; font-size: 0.9em; font-weight: bold; }

.sidebar-item.active .item-date,
.sidebar-item.active .item-meta { color: #cbd5e1; }

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #0f172a;
  position: relative;
  min-height: 0;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 1.2em;
  gap: 15px;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.stats-bar-header {
  position: relative;
  padding: 10px 20px 12px 20px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
  min-height: 48px;
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

.header-main-row::-webkit-scrollbar { display: none; }
.header-main-row { -ms-overflow-style: none; scrollbar-width: none; }

.stock-input-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9em;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
  white-space: nowrap;
}

.stock-input-group input.edit-input {
  background: #0f172a;
  border: 1px solid #334155;
  color: white;
  border-radius: 4px;
  padding: 2px 6px;
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
  color: #cbd5e1;
  white-space: nowrap;
  flex-shrink: 0;
}

.stats-label {
  color: #888;
  font-size: 0.85em;
  white-space: nowrap;
}

/* Animated Percentage Badge */
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

/* Edge Progress Bar */
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

.motivational-badge {
  font-size: 0.8em;
  font-weight: 700;
  color: #ffd700;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.controls-bar {
  padding: 15px 20px;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-wrapper {
  position: relative;
  max-width: 400px;
  flex: 1;
}
.search-input {
  width: 100%;
  padding: 10px 10px 10px 40px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #fff;
  font-size: 1em;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
}

.table-container {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: #1e293b;
  color: #94a3b8;
  padding: 12px 15px;
  text-align: left;
  font-weight: 500;
  position: sticky;
  top: 0;
}

.data-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #1e293b;
  color: #e2e8f0;
}

.data-table tr:hover td {
  background: #1e293b;
}

.font-bold { font-weight: 600; }
.font-mono { font-family: 'Courier New', monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.text-muted { color: #64748b; }
.text-success { color: #10b981; }
.text-sm { font-size: 0.85em; }

.badge {
  padding: 2px 8px;
  border-radius: 99px;
  font-size: 0.75em;
  font-weight: 600;
}
.badge-info { background: #3b82f6; color: white; }
.badge-warn { background: #f59e0b; color: white; }

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-warning { background: #f59e0b; color: white; }
.btn-warning:hover { background: #d97706; }
.btn-icon-sm { background: transparent; border: none; color: #94a3b8; cursor: pointer; }
.btn-icon-sm:hover { color: #fff; }
.btn-icon-sm-danger { background: transparent; border: none; color: #f87171; cursor: pointer; transition: color 0.2s; }
.btn-icon-sm-danger:hover { color: #f43f5e; }

/* Action buttons in list view */
.action-btns {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.btn-action {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #475569;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  transition: all 0.2s;
}

.btn-action-edit:hover {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.btn-action-delete:hover {
  background: #f59e0b;
  border-color: #f59e0b;
  color: white;
}

/* Responsive */
@media (max-width: 768px) {
  .history-modal-container {
     flex-direction: column;
     height: 95vh;
  }
  .sidebar { width: 100%; height: 200px; border-right: none; border-bottom: 1px solid #334155; }
  .modal-body { flex-direction: column; }
}

/* Grid View CSS */
.grid-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #0f172a;
}

.grid-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 15px;
    padding-bottom: 50px;
}

.grid-item {
    aspect-ratio: 1.4;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 5px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.grid-item:hover {
    border-color: #3b82f6;
    transform: scale(1.03);
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.grid-item.empty {
    opacity: 0.4;
    border-style: dashed;
}

.grid-item.sold {
    background: rgba(16, 185, 129, 0.15);
    border-color: #10b981;
}

.item-num {
    position: absolute;
    top: 4px;
    left: 8px;
    font-size: 1.25em;
    font-weight: bold;
    color: #64748b;
}

.item-status {
    font-size: 1.15em;
    font-weight: 500;
    color: #e2e8f0;
    text-align: center;
    width: 100%;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: normal;
    line-height: 1.2;
}

.grid-item.empty .item-status {
    color: #64748b;
    font-style: italic;
}

.stock-price {
  font-size: 0.75em;
  color: #ffd700;
  font-weight: bold;
  margin-top: 2px;
}

/* Toggle Buttons */
.btn-primary { background: #3b82f6; color: white; border: none; }
.btn-outline { background: transparent; border: 1px solid #475569; color: #94a3b8; }
.btn-outline:hover { background: #334155; color: white; }
.btn-sm { padding: 4px 8px; font-size: 0.9em; }

/* Fullscreen Grid */
.fullscreen-grid {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9999;
    background: #0f172a;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.fullscreen-header {
    padding: 15px 20px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fullscreen-header h2 { margin: 0; color: white; font-size: 1.25em; }

.fullscreen-grid .grid-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

/* Queue Badge (Red Circle) */
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
  border: 2px solid #1e293b;
}

/* Owner Booking Count Badge (👗 N ตัว) */
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

.flex-center {
  display: flex;
  align-items: center;
}
.gap-10 {
  gap: 10px;
}
</style>

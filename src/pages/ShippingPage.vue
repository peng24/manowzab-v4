<template>
  <div class="sp-app">
    <!-- ============ STICKY HEADER ============ -->
    <header class="sp-header">
      <div class="sp-header-left">
        <span class="sp-logo">📦</span>
        <h1 class="sp-title">รายการจัดส่ง</h1>
      </div>
      <div class="sp-header-actions">
        <button class="sp-icon-btn" @click="refreshData" title="รีเฟรช">
          <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isRefreshing }"></i>
        </button>
        <a :href="baseUrl" class="sp-icon-btn" title="กลับ Command Center">
          <i class="fa-solid fa-desktop"></i>
        </a>
      </div>
    </header>

    <!-- ============ SEARCH (simple) ============ -->
    <div class="sp-toolbar">
      <div class="sp-search-wrap">
        <i class="fa-solid fa-magnifying-glass sp-search-icon"></i>
        <input
          type="text"
          v-model="searchQuery"
          class="sp-search"
          placeholder="ค้นหาชื่อ..."
        />
        <button v-if="searchQuery" class="sp-clear-btn" @click="searchQuery = ''">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <!-- Filter chips -->
      <div class="sp-chips">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          :class="['sp-chip', { active: activeFilter === tab.key }]"
          @click="activeFilter = tab.key"
        >
          {{ tab.label }}
          <span v-if="tab.count > 0" class="sp-chip-n">{{ tab.count }}</span>
        </button>
      </div>
    </div>

    <!-- ============ QUICK ADD (Collapsible) ============ -->
    <div class="sp-add-wrap">
      <button class="sp-add-toggle" @click="showAddForm = !showAddForm">
        <i :class="showAddForm ? 'fa-solid fa-minus' : 'fa-solid fa-plus'"></i>
        {{ showAddForm ? 'ปิด' : 'เพิ่มลูกค้า' }}
      </button>
      <transition name="sp-slide">
        <div v-if="showAddForm" class="sp-add-form">
          <input
            type="text"
            v-model="newName"
            class="sp-input"
            placeholder="ชื่อลูกค้า"
            @keyup.enter="addManualCustomer"
            list="customerNamesList"
          />
          <datalist id="customerNamesList">
            <option v-for="name in uniqueCustomerNames" :key="name" :value="name"></option>
          </datalist>
          <div class="sp-add-row">
            <div style="position: relative; flex: 1;">
              <ThaiDatePicker v-model="newDateFormatted" position="bottom-left">
                <input
                  type="text"
                  :value="newDate"
                  @input="onNewDateInput"
                  class="sp-input"
                  placeholder="วว/ดด/ปปปป"
                  maxlength="10"
                />
              </ThaiDatePicker>
            </div>
            <button
              class="sp-btn-add"
              @click="addManualCustomer"
              :disabled="!newName.trim()"
            >
              <i class="fa-solid fa-plus"></i> เพิ่ม
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- ============ CUSTOMER LIST ============ -->
    <div class="sp-list-container">
      <div v-if="filteredCustomers.length === 0" class="sp-empty">
        <span>{{ searchQuery ? '🔍 ไม่พบ' : '📭 ยังไม่มีรายการ' }}</span>
      </div>

      <TransitionGroup name="sp-item-anim" tag="div" class="sp-list">
        <div
          v-for="c in filteredCustomers"
          :key="c.id"
          :class="[
            'sp-item',
            {
              'sp-item--overdue': getCountdown(c.deliveryDate).color === 'overdue',
              'sp-item--today': getCountdown(c.deliveryDate).color === 'red',
              'sp-item--pack': isPackTonight(c),
              'sp-item--done': c.status === 'done',
            },
          ]"
        >
          <!-- Row 1: Name -->
          <div class="sp-row1">
            <input
              type="text"
              class="sp-name"
              :value="c.name"
              @change="updateField(c.id, 'name', $event.target.value)"
              @focus="$event.target.select()"
            />
          </div>

          <!-- Row 2: Date · Items · Badge -->
          <div class="sp-row2">
            <ThaiDatePicker
              :modelValue="c.deliveryDate"
              position="bottom-left"
              @update:modelValue="val => updateField(c.id, 'deliveryDate', val)"
            >
              <span class="sp-date" v-if="c.deliveryDate">
                {{ formatThaiDate(c.deliveryDate) }} <i class="fa-solid fa-pen sp-edit-ico"></i>
              </span>
              <span class="sp-date sp-date--empty" v-else>
                ตั้งวันส่ง <i class="fa-solid fa-plus sp-edit-ico"></i>
              </span>
            </ThaiDatePicker>
            <span class="sp-sep">·</span>
            <span class="sp-items" :title="getSessionBreakdown(c)">
              {{ c.itemCount || 0 }} ชิ้น
            </span>
            <span v-if="c.totalBookings > 0" class="sp-vip">⭐{{ c.totalBookings }}</span>
            <span class="sp-row2-spacer"></span>
            <span
              class="sp-badge"
              :class="'sp-badge--' + getCountdown(c.deliveryDate).color"
            >
              {{ getCountdown(c.deliveryDate).text }}
            </span>
          </div>

          <!-- Row 3: Note (compact) -->
          <div class="sp-row3" v-if="c.note || c.status !== 'done'">
            <input
              type="text"
              class="sp-note"
              :value="c.note || ''"
              placeholder="โน้ต..."
              @change="updateField(c.id, 'note', $event.target.value)"
              @focus="$event.target.select()"
            />
          </div>

          <!-- Pack Tonight indicator -->
          <div v-if="isPackTonight(c)" class="sp-pack-indicator">📦 แพ็คคืนนี้</div>

          <!-- Actions: bottom-right -->
          <div class="sp-actions">
            <button
              v-if="c.status !== 'done'"
              class="sp-act sp-act--done"
              @click="markDone(c)"
              title="เสร็จแล้ว"
            >✅</button>
            <button
              v-else
              class="sp-act sp-act--undo"
              @click="undoDone(c)"
              title="ยกเลิก"
            >↩️</button>
            <button
              class="sp-act sp-act--del"
              @click="deleteCustomer(c.id, c.name)"
              title="ลบ"
            >🗑️</button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- ============ FOOTER ============ -->
    <div class="sp-footer">
      <label class="sp-toggle">
        <input type="checkbox" v-model="showDone" />
        <span>เสร็จแล้ว ({{ doneCount }})</span>
      </label>
      <span class="sp-summary">
        {{ activeCustomers.length }} รายการ · {{ totalItemCount }} ชิ้น
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ref as dbRef, onValue, update, remove, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";
import ThaiDatePicker from "../components/ThaiDatePicker.vue";

// ====== State ======
const allCustomers = ref([]);
const newName = ref("");
const newDate = ref("");
const showDone = ref(false);
const showAddForm = ref(false);
const searchQuery = ref("");
const activeFilter = ref("all");
const isRefreshing = ref(false);
const cleanupFns = [];

const baseUrl = computed(() => import.meta.env.BASE_URL || '/');

// ====== Date Formatting ======
const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

const newDateFormatted = computed({
  get() { return parseDDMMYYYY(newDate.value) || ''; },
  set(val) {
    if (!val) { newDate.value = ''; }
    else {
      const parts = val.split('-');
      if (parts.length === 3) {
        newDate.value = `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
      }
    }
  }
});

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543) % 100;
  return `${day} ${month} ${year}`;
}

function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    else if (y.length === 4 && parseInt(y) > 2500) y = (parseInt(y) - 543).toString();
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function formatMaskedDateInput(v) {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length >= 5) v = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
  else if (v.length >= 3) v = `${v.substring(0, 2)}/${v.substring(2)}`;
  return v;
}

function onNewDateInput(e) {
  newDate.value = formatMaskedDateInput(e.target.value);
  e.target.value = newDate.value;
}

// ====== Firebase Listener ======
onMounted(() => {
  const customersRef = dbRef(db, "delivery_customers");
  const unsubListener = onValue(customersRef, (snapshot) => {
    const data = snapshot.val() || {};
    allCustomers.value = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
      itemCount: data[key].itemCount || 0,
      sessions: data[key].sessions || null,
    }));
  });
  cleanupFns.push(unsubListener);
});

onUnmounted(() => {
  cleanupFns.forEach(fn => { if (typeof fn === 'function') fn(); });
  cleanupFns.length = 0;
});

// ====== Computed ======
const activeCustomers = computed(() =>
  allCustomers.value.filter((c) => c.status !== "done")
);

const customers = computed(() => {
  if (showDone.value) return allCustomers.value;
  return activeCustomers.value;
});

const sortedCustomers = computed(() => {
  return [...customers.value].sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1;
    if (a.status !== "done" && b.status === "done") return -1;
    const ca = getCountdown(a.deliveryDate);
    const cb = getCountdown(b.deliveryDate);
    return ca.days - cb.days;
  });
});

const filteredCustomers = computed(() => {
  let list = sortedCustomers.value;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(c => c.name && c.name.toLowerCase().includes(q));
  }

  if (activeFilter.value === 'urgent') {
    list = list.filter(c => {
      const d = getCountdown(c.deliveryDate).days;
      return d <= 1 && c.status !== 'done';
    });
  } else if (activeFilter.value === 'normal') {
    list = list.filter(c => {
      const d = getCountdown(c.deliveryDate).days;
      return d > 1 && c.status !== 'done';
    });
  } else if (activeFilter.value === 'done') {
    list = list.filter(c => c.status === 'done');
  }

  return list;
});

const todayCount = computed(() =>
  activeCustomers.value.filter((c) => getCountdown(c.deliveryDate).days === 0).length
);

const overdueCount = computed(() =>
  activeCustomers.value.filter((c) => getCountdown(c.deliveryDate).days < 0).length
);

const packTonightCount = computed(() =>
  activeCustomers.value.filter((c) => isPackTonight(c)).length
);

const soonCount = computed(() =>
  activeCustomers.value.filter((c) => {
    const d = getCountdown(c.deliveryDate).days;
    return d > 0 && d <= 3;
  }).length
);

const totalItemCount = computed(() =>
  activeCustomers.value.reduce((sum, c) => sum + (c.itemCount || 0), 0)
);

const doneCount = computed(() =>
  allCustomers.value.filter((c) => c.status === "done").length
);

const uniqueCustomerNames = computed(() => {
  const names = new Set();
  allCustomers.value.forEach(c => { if (c.name) names.add(c.name); });
  return Array.from(names).sort();
});

const filterTabs = computed(() => {
  const tabs = [
    { key: 'all', label: 'ทั้งหมด', count: activeCustomers.value.length },
  ];
  const urgentN = activeCustomers.value.filter(c => getCountdown(c.deliveryDate).days <= 1).length;
  if (urgentN > 0) tabs.push({ key: 'urgent', label: '🔴 เร่ง', count: urgentN });
  const normalN = activeCustomers.value.filter(c => getCountdown(c.deliveryDate).days > 1).length;
  if (normalN > 0) tabs.push({ key: 'normal', label: 'ปกติ', count: normalN });
  if (doneCount.value > 0) tabs.push({ key: 'done', label: '✅', count: doneCount.value });
  return tabs;
});

// ====== Countdown Logic ======
function getCountdown(deliveryDate) {
  if (!deliveryDate) return { text: "ไม่กำหนด", color: "gray", days: Infinity };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `เลย ${Math.abs(diffDays)} วัน!`, color: "overdue", days: diffDays };
  if (diffDays === 0) return { text: "วันนี้!", color: "red", days: 0 };
  if (diffDays === 1) return { text: "พรุ่งนี้", color: "orange", days: 1 };
  if (diffDays <= 3) return { text: `${diffDays} วัน`, color: "yellow", days: diffDays };
  return { text: `${diffDays} วัน`, color: "green", days: diffDays };
}

function isPackTonight(customer) {
  if (!customer.deliveryDate || customer.status === 'done') return false;
  return getCountdown(customer.deliveryDate).days === 1;
}

function getSessionBreakdown(customer) {
  if (!customer.sessions) return "ไม่มีข้อมูลไลฟ์";
  return Object.entries(customer.sessions)
    .map(([vid, s]) => `${vid.substring(0, 8)}...: ${s.count} ชิ้น`)
    .join("\n");
}

function refreshData() {
  isRefreshing.value = true;
  setTimeout(() => { isRefreshing.value = false; }, 800);
}

// ====== CRUD ======
function addManualCustomer() {
  let name = newName.value.trim();
  if (!name) return;

  let parsedDate = parseDDMMYYYY(newDate.value);

  const shipNowMatch = name.match(/ส่งเลย|ส่งวันนี้/);
  const shipTmrMatch = name.match(/ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/);
  const shipDateMatch = name.match(/ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/);

  let matchedKeyword = null;
  if (shipNowMatch) matchedKeyword = shipNowMatch[0];
  else if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
  else if (shipDateMatch) matchedKeyword = shipDateMatch[0];

  if (matchedKeyword) {
    let cleanName = name.replace(matchedKeyword, "").replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "").trim();
    if (cleanName.length > 0) name = cleanName;

    if (!newDate.value) {
      let autoShipDate = new Date();
      if (shipNowMatch) { /* today */ }
      else if (shipTmrMatch) { autoShipDate.setDate(autoShipDate.getDate() + 1); }
      else if (shipDateMatch) {
        const day = parseInt(shipDateMatch[1]);
        autoShipDate.setDate(day);
        const monthStr = shipDateMatch[2];
        if (monthStr) {
          const mNamesShort = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
          const mNamesFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
          const cleanMonth = monthStr.replace(/\./g, '');
          let mIndex = mNamesShort.indexOf(cleanMonth);
          if (mIndex === -1) mIndex = mNamesFull.indexOf(cleanMonth);
          if (mIndex !== -1) autoShipDate.setMonth(mIndex);
        }
        if (autoShipDate < new Date() && (new Date().getDate() - day) > 15) {
          autoShipDate.setMonth(autoShipDate.getMonth() + 1);
        }
      }
      const y = autoShipDate.getFullYear();
      const m = String(autoShipDate.getMonth() + 1).padStart(2, '0');
      const d = String(autoShipDate.getDate()).padStart(2, '0');
      parsedDate = `${y}-${m}-${d}`;
    }
  }

  if (!parsedDate) {
    const today = new Date();
    parsedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }

  let targetUid = "manual-" + Date.now();
  const existingCustomer = allCustomers.value.find(c => c.name === name && c.status !== "done");
  if (existingCustomer) targetUid = existingCustomer.id;

  update(dbRef(db, `delivery_customers/${targetUid}`), {
    name,
    itemCount: existingCustomer ? existingCustomer.itemCount : 0,
    deliveryDate: parsedDate,
    note: existingCustomer ? existingCustomer.note : "",
    status: "pending",
    createdAt: existingCustomer ? existingCustomer.createdAt : Date.now(),
    updatedAt: Date.now(),
  }).then(() => {
    newName.value = "";
    newDate.value = "";
    Swal.fire({ icon: "success", title: `เพิ่ม "${name}" แล้ว`, toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
  });
}

function updateField(id, field, value) {
  update(dbRef(db, `delivery_customers/${id}`), {
    [field]: value,
    updatedAt: Date.now(),
  });
}

function markDone(customer) {
  Swal.fire({
    title: `"${customer.name}" ส่งเสร็จ?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#10b981",
  }).then(async (r) => {
    if (r.isConfirmed) {
      const currentCount = customer.itemCount || 0;
      if (currentCount > 0) {
        const totalRef = dbRef(db, `delivery_customers/${customer.id}/totalBookings`);
        await runTransaction(totalRef, (currentTotal) => (currentTotal || 0) + currentCount);
      }
      const updates = { status: "done", itemCount: 0, updatedAt: Date.now() };
      if (customer.sessions) {
        Object.keys(customer.sessions).forEach((vid) => {
          updates[`sessions/${vid}/status`] = "done";
        });
      }
      await update(dbRef(db, `delivery_customers/${customer.id}`), updates);
      Swal.fire({ icon: "success", title: "เสร็จ!", toast: true, position: "top-end", timer: 1200, showConfirmButton: false });
    }
  });
}

function undoDone(customer) {
  const updates = { status: "pending", updatedAt: Date.now() };
  if (customer.sessions) {
    Object.keys(customer.sessions).forEach((vid) => {
      updates[`sessions/${vid}/status`] = "pending";
    });
  }
  const allSessions = customer.sessions || {};
  updates.itemCount = Object.values(allSessions).reduce((sum, s) => sum + (s.count || 0), 0);
  updates.totalPrice = Object.values(allSessions).reduce((sum, s) => sum + (s.totalPrice || 0), 0);
  update(dbRef(db, `delivery_customers/${customer.id}`), updates);
}

function deleteCustomer(id, name) {
  Swal.fire({
    title: `ลบ "${name}"?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
  }).then((r) => {
    if (r.isConfirmed) {
      remove(dbRef(db, `delivery_customers/${id}`));
      Swal.fire({ icon: "success", title: "ลบแล้ว", toast: true, position: "top-end", timer: 1200, showConfirmButton: false });
    }
  });
}
</script>

<style>
/* ===========================================
   SHIPPING PAGE v2 — CLEAN & COMPACT
   =========================================== */

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  height: 100dvh;
  width: 100%;
  overflow: hidden;
}

body {
  font-family: "Kanit", sans-serif;
  background: #0d0d12;
  color: #ddd;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overscroll-behavior: none;
}

#shipping-app {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }

.sp-app {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ======== HEADER ======== */
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #111118;
  border-bottom: 1px solid #1e1e28;
  flex-shrink: 0;
  padding-top: calc(10px + env(safe-area-inset-top));
}

.sp-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sp-logo { font-size: 1.3em; }

.sp-title {
  font-size: 1em;
  font-weight: 600;
  color: #fff;
  line-height: 1;
}

.sp-header-actions { display: flex; gap: 6px; }

.sp-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.07);
  color: #777;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.15s;
  text-decoration: none;
}

.sp-icon-btn:hover { background: rgba(255,255,255,0.1); color: #ccc; }

/* ======== TOOLBAR (Search + Chips) ======== */
.sp-toolbar {
  padding: 8px 14px 6px;
  flex-shrink: 0;
  background: #0d0d12;
}

.sp-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.sp-search-icon {
  position: absolute;
  left: 12px;
  color: #444;
  font-size: 0.8em;
  pointer-events: none;
}

.sp-search {
  width: 100%;
  padding: 8px 36px 8px 34px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85em;
}

.sp-search:focus {
  outline: none;
  border-color: rgba(99,102,241,0.4);
}

.sp-search::placeholder { color: #3a3a3a; }

.sp-clear-btn {
  position: absolute;
  right: 8px;
  background: rgba(255,255,255,0.08);
  border: none;
  color: #666;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.65em;
}

.sp-chips {
  display: flex;
  gap: 6px;
  margin-top: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.sp-chips::-webkit-scrollbar { display: none; }

.sp-chip {
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.06);
  background: transparent;
  color: #666;
  font-family: inherit;
  font-size: 0.72em;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.sp-chip.active {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.3);
  color: #a5b4fc;
}

.sp-chip-n {
  background: rgba(255,255,255,0.08);
  padding: 0 5px;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 600;
}

.sp-chip.active .sp-chip-n {
  background: rgba(99,102,241,0.25);
}

/* ======== QUICK ADD ======== */
.sp-add-wrap {
  padding: 4px 14px 6px;
  flex-shrink: 0;
}

.sp-add-toggle {
  width: 100%;
  padding: 8px;
  border-radius: 10px;
  border: 1px dashed rgba(255,255,255,0.1);
  background: transparent;
  color: #555;
  font-family: inherit;
  font-size: 0.78em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;
}

.sp-add-toggle:hover {
  border-color: rgba(99,102,241,0.25);
  color: #a5b4fc;
}

.sp-add-form {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sp-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85em;
}

.sp-input:focus {
  outline: none;
  border-color: rgba(99,102,241,0.4);
}

.sp-input::placeholder { color: #3a3a3a; }

.sp-add-row { display: flex; gap: 6px; }

.sp-btn-add {
  padding: 8px 16px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  transition: all 0.15s;
}

.sp-btn-add:hover:not(:disabled) { filter: brightness(1.1); }
.sp-btn-add:disabled { opacity: 0.35; cursor: not-allowed; }

.sp-slide-enter-active, .sp-slide-leave-active { transition: all 0.2s ease; overflow: hidden; }
.sp-slide-enter-from, .sp-slide-leave-to { max-height: 0; opacity: 0; margin-top: 0; }
.sp-slide-enter-to, .sp-slide-leave-from { max-height: 200px; opacity: 1; }

/* ======== CUSTOMER LIST ======== */
.sp-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px 14px 60px;
  -webkit-overflow-scrolling: touch;
}

.sp-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sp-empty {
  text-align: center;
  padding: 50px 0;
  color: #444;
  font-size: 0.9em;
}

/* === List Item === */
.sp-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 10px 12px 10px 12px;
  position: relative;
  transition: all 0.15s;
}

/* Urgency styles */
.sp-item--overdue {
  border-color: rgba(220,38,38,0.35);
  background: rgba(220,38,38,0.05);
}

.sp-item--today {
  border-color: rgba(239,68,68,0.3);
  background: rgba(239,68,68,0.04);
}

.sp-item--pack {
  border-left: 3px solid #f97316;
}

.sp-item--done {
  opacity: 0.35;
}

/* Row 1: Name */
.sp-row1 {
  display: flex;
  align-items: center;
  padding-right: 70px; /* space for action buttons */
}

.sp-name {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.95em;
  font-weight: 600;
  padding: 2px 0;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}

.sp-name:focus {
  outline: none;
  border-bottom-color: rgba(99,102,241,0.4);
}

.sp-badge {
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.68em;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.sp-badge--overdue { background: rgba(220,38,38,0.2); color: #fca5a5; }
.sp-badge--red { background: rgba(239,68,68,0.2); color: #fca5a5; }
.sp-badge--orange { background: rgba(245,158,11,0.15); color: #fbbf24; }
.sp-badge--yellow { background: rgba(234,179,8,0.12); color: #facc15; }
.sp-badge--green { background: rgba(16,185,129,0.12); color: #6ee7b7; }
.sp-badge--gray { background: rgba(107,114,128,0.12); color: #9ca3af; }

/* Row 2: Date · Items · Badge */
.sp-row2 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.78em;
  color: #888;
  padding-right: 70px; /* space for action buttons */
}

.sp-row2-spacer { flex: 1; }

.sp-date {
  cursor: pointer;
  color: #aaa;
  transition: color 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.sp-date:hover { color: #a5b4fc; }

.sp-date--empty {
  color: #444;
  font-style: italic;
}

.sp-edit-ico {
  font-size: 0.8em;
  color: #444;
}

.sp-date:hover .sp-edit-ico { color: #a5b4fc; }

.sp-sep { color: #333; }

.sp-items {
  color: #34d399;
  font-weight: 600;
}

.sp-vip {
  color: #a78bfa;
  font-size: 0.9em;
  margin-left: 2px;
}

/* Row 3: Note */
.sp-row3 {
  margin-top: 4px;
}

.sp-note {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: #666;
  font-family: inherit;
  font-size: 0.75em;
  padding: 3px 0;
  transition: all 0.15s;
}

.sp-note:focus {
  outline: none;
  border-bottom-color: rgba(99,102,241,0.3);
  color: #ccc;
}

.sp-note::placeholder { color: #2a2a2a; }

/* Pack Tonight */
.sp-pack-indicator {
  display: inline-block;
  margin-top: 4px;
  padding: 1px 8px;
  border-radius: 6px;
  font-size: 0.65em;
  font-weight: 700;
  color: #fdba74;
  background: rgba(249,115,22,0.15);
  border: 1px solid rgba(249,115,22,0.25);
}

/* Actions — fixed right column */
.sp-actions {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sp-act {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 0.85em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  opacity: 0.5;
}

.sp-item:hover .sp-act,
.sp-item:active .sp-act { opacity: 1; }

/* Touch: always show on mobile */
@media (hover: none) {
  .sp-act { opacity: 0.7; }
}

.sp-act:hover { background: rgba(255,255,255,0.06); transform: scale(1.1); }
.sp-act:active { transform: scale(0.95); }

/* ======== FOOTER ======== */
.sp-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px 14px;
  padding-bottom: calc(8px + env(safe-area-inset-bottom));
  background: linear-gradient(to top, #0d0d12 60%, transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 50;
}

.sp-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #555;
  font-size: 0.72em;
  cursor: pointer;
}

.sp-toggle input { accent-color: #6366f1; width: 14px; height: 14px; }

.sp-summary {
  font-size: 0.72em;
  color: #444;
  font-variant-numeric: tabular-nums;
}

/* ======== ANIMATIONS ======== */
.sp-item-anim-enter-active { transition: all 0.25s ease; }
.sp-item-anim-leave-active { transition: all 0.15s ease; }
.sp-item-anim-enter-from { opacity: 0; transform: translateY(-8px); }
.sp-item-anim-leave-to { opacity: 0; transform: translateX(20px); }
.sp-item-anim-move { transition: transform 0.25s ease; }

/* ======== TABLET+ ======== */
@media (min-width: 600px) {
  .sp-toolbar, .sp-add-wrap, .sp-list-container { max-width: 500px; margin-left: auto; margin-right: auto; width: 100%; }
  .sp-list { max-width: 500px; margin: 0 auto; }
}
</style>

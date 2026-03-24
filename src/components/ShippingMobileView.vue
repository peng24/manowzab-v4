<template>
  <div class="shipping-mobile-container">
    <!-- Header -->
    <div class="smob-header">
      <div class="smob-title">📦 รายการจัดส่ง</div>
      <div class="smob-close">
        <button class="btn btn-dark" @click="closeWindow">ปิด</button>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="smob-stats">
      <div class="smob-stat">
        <span class="smob-stat-num">{{ activeCustomers.length }}</span>
        <span class="smob-stat-label">ทั้งหมด</span>
      </div>
      <div class="smob-stat urgent">
        <span class="smob-stat-num">{{ todayCount }}</span>
        <span class="smob-stat-label">ส่งวันนี้</span>
      </div>
      <div class="smob-stat warn">
        <span class="smob-stat-num">{{ soonCount }}</span>
        <span class="smob-stat-label">1-3 วัน</span>
      </div>
    </div>

    <!-- Add Form -->
    <div class="smob-add-form">
      <input
        type="text"
        v-model="newName"
        class="smob-input"
        placeholder="เพิ่มลูกค้า (ชื่อ)"
        @keyup.enter="addManualCustomer"
      />
      <div class="smob-date-wrap">
        <ThaiDatePicker v-model="newDateFormatted" position="bottom-right">
          <input
            type="text"
            :value="newDate"
            @input="onNewDateInput"
            class="smob-input smob-date-input"
            placeholder="วว/ดด/ปป"
            maxlength="10"
          />
        </ThaiDatePicker>
      </div>
      <button class="btn btn-success smob-add-btn" @click="addManualCustomer" :disabled="!newName.trim()">
        <i class="fa-solid fa-plus"></i> เพิ่ม
      </button>
    </div>

    <!-- Filter -->
    <div class="smob-filter">
      <label class="smob-toggle">
        <input type="checkbox" v-model="showDone" />
        <span>ดูรายการที่เสร็จแล้ว ({{ doneCount }})</span>
      </label>
    </div>

    <!-- Customer List (Cards) -->
    <div class="smob-list">
      <div v-if="sortedCustomers.length === 0" class="smob-empty">
        ยังไม่มีรายการจัดส่ง — เพิ่มลูกค้าด้วยมือ หรือรอจากระบบแชท
      </div>
      
      <div
        v-for="(c, idx) in sortedCustomers"
        :key="c.id"
        class="smob-card"
        :class="{ 'card-urgent': getCountdown(c.deliveryDate).days <= 0 && c.deliveryDate, 'card-done': c.status === 'done' }"
      >
        <div class="smob-card-header">
          <div class="smob-card-name">
            <span class="smob-idx">{{ idx + 1 }}.</span>
            <input
              type="text"
              class="smob-edit-input fw-bold"
              :value="c.name"
              @change="updateField(c.id, 'name', $event.target.value)"
            />
          </div>
          <span class="smob-countdown" :class="'cd-' + getCountdown(c.deliveryDate).color">
            {{ getCountdown(c.deliveryDate).text }}
          </span>
        </div>

        <div class="smob-card-body">
          <div class="smob-row">
            <div class="smob-col">
              <span class="smob-label">สินค้า:</span>
              <span class="smob-val item-count-auto" :title="getSessionBreakdown(c)">
                {{ c.itemCount || 0 }} ชิ้น
              </span>
            </div>
            <div class="smob-col date-col">
              <span class="smob-label">วันส่ง:</span>
              <div class="smob-date-cell">
                <span v-if="c.deliveryDate" class="thai-date">{{ formatThaiDate(c.deliveryDate) }}</span>
                <span v-else class="no-date">ดด/วว/ปป</span>
                <ThaiDatePicker :modelValue="c.deliveryDate" position="bottom-center" @update:modelValue="val => updateField(c.id, 'deliveryDate', val)" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                  <input
                    type="text"
                    class="smob-date-input-text"
                    style="width: 100%; height: 100%; box-sizing: border-box;"
                    :value="formatToDDMMYYYY(c.deliveryDate)"
                    @input="onTableRowDateInput"
                    @change="handleTableDateChange(c.id, $event.target.value)"
                    placeholder="วว/ดด/ปปปป"
                    maxlength="10"
                  />
                </ThaiDatePicker>
              </div>
            </div>
          </div>
          <div class="smob-row">
            <div class="smob-col-full">
              <input
                type="text"
                class="smob-edit-input smob-note"
                :value="c.note || ''"
                placeholder="เพิ่มโน้ต..."
                @change="updateField(c.id, 'note', $event.target.value)"
              />
            </div>
          </div>
        </div>

        <div class="smob-card-actions">
          <button
            v-if="c.status !== 'done'"
            class="smob-btn-action smob-btn-done"
            @click="markDone(c)"
          >
            ✅ เสร็จแล้ว
          </button>
          <button
            v-else
            class="smob-btn-action smob-btn-undo"
            @click="undoDone(c.id)"
          >
            ↩️ เลิกทำ
          </button>
          <button
            class="smob-btn-action smob-btn-del"
            @click="deleteCustomer(c.id, c.name)"
          >
            🗑️ ลบ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { ref as dbRef, onValue, update, remove, get } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import Swal from "sweetalert2";
import ThaiDatePicker from "./ThaiDatePicker.vue";

const stockStore = useStockStore();
const systemStore = useSystemStore();

// State
const allCustomers = ref([]);
const newName = ref("");
const newDate = ref("");
const showDone = ref(false);
let unsubListener = null;

const newDateFormatted = computed({
  get() {
    return parseDDMMYYYY(newDate.value) || '';
  },
  set(val) {
    if (!val) {
      newDate.value = '';
    } else {
      const parts = val.split('-');
      if (parts.length === 3) {
        newDate.value = `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
      }
    }
  }
});

// ✅ Thai month abbreviations
const thaiMonths = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

function formatThaiDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = (d.getFullYear() + 543) % 100;
  return `${day} ${month} ${year}`;
}

function formatToDDMMYYYY(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return dateStr;
}

function parseDDMMYYYY(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    let [d, m, y] = parts;
    if (y.length === 2) {
      y = (parseInt(y) > 50 ? '19' : '20') + y;
    } else if (y.length === 4 && parseInt(y) > 2500) {
      y = (parseInt(y) - 543).toString();
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}

function formatMaskedDateInput(v) {
  v = v.replace(/\D/g, "");
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length >= 5) {
    v = `${v.substring(0, 2)}/${v.substring(2, 4)}/${v.substring(4)}`;
  } else if (v.length >= 3) {
    v = `${v.substring(0, 2)}/${v.substring(2)}`;
  }
  return v;
}

function onNewDateInput(e) {
  newDate.value = formatMaskedDateInput(e.target.value);
  e.target.value = newDate.value;
}

function onTableRowDateInput(e) {
  e.target.value = formatMaskedDateInput(e.target.value);
}

function handleTableDateChange(id, val) {
  const parsed = parseDDMMYYYY(val);
  updateField(id, 'deliveryDate', parsed || null);
}

// Firebase Listener
onMounted(() => {
  const customersRef = dbRef(db, "delivery_customers");
  unsubListener = onValue(customersRef, (snapshot) => {
    const data = snapshot.val() || {};
    allCustomers.value = Object.keys(data).map((key) => ({
      id: key,
      ...data[key],
      itemCount: data[key].itemCount || 0,
      sessions: data[key].sessions || null,
    }));
  });
});

onUnmounted(() => {
  if (unsubListener) unsubListener();
});

// ✅ REAL-TIME SYNC
watch(
  () => stockStore.stockData,
  async (newStockData) => {
    const videoId = systemStore.currentVideoId;
    if (!videoId || allCustomers.value.length === 0) return;
    const orders = {};
    Object.keys(newStockData).forEach((num) => {
      const item = newStockData[num];
      if (item?.uid) {
        if (!orders[item.uid]) orders[item.uid] = { count: 0, totalPrice: 0 };
        orders[item.uid].count++;
        orders[item.uid].totalPrice += item.price ? parseInt(item.price) : 0;
      }
    });

    for (const customer of allCustomers.value) {
      if (customer.status === "done") continue;
      const uid = customer.id;
      const order = orders[uid];
      if (!order) continue;

      const currentSession = customer.sessions?.[videoId];
      if (currentSession && currentSession.count === order.count && currentSession.totalPrice === order.totalPrice) continue;

      await update(dbRef(db, `delivery_customers/${uid}/sessions/${videoId}`), {
        count: order.count,
        totalPrice: order.totalPrice,
      });

      const sessionsSnap = await get(dbRef(db, `delivery_customers/${uid}/sessions`));
      const sessions = sessionsSnap.val() || {};
      const totalCount = Object.values(sessions).reduce((sum, s) => sum + (s.count || 0), 0);
      await update(dbRef(db, `delivery_customers/${uid}`), {
        itemCount: totalCount,
        updatedAt: Date.now(),
      });
    }
  },
  { deep: true }
);

// Computed
const activeCustomers = computed(() => allCustomers.value.filter((c) => c.status !== "done"));

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

const todayCount = computed(() => activeCustomers.value.filter((c) => getCountdown(c.deliveryDate).days === 0).length);
const soonCount = computed(() => activeCustomers.value.filter((c) => {
  const d = getCountdown(c.deliveryDate).days;
  return d > 0 && d <= 3;
}).length);
const totalItemCount = computed(() => activeCustomers.value.reduce((sum, c) => sum + (c.itemCount || 0), 0));
const doneCount = computed(() => allCustomers.value.filter((c) => c.status === "done").length);

// Countdown Logic
function getCountdown(deliveryDate) {
  if (!deliveryDate) return { text: "ยังไม่กำหนด", color: "gray", days: Infinity };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate); target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `เลย ${Math.abs(diffDays)} วัน!`, color: "overdue", days: diffDays };
  if (diffDays === 0) return { text: "ส่งวันนี้!", color: "red", days: 0 };
  if (diffDays === 1) return { text: "พรุ่งนี้", color: "orange", days: 1 };
  if (diffDays <= 3) return { text: `อีก ${diffDays} วัน`, color: "yellow", days: diffDays };
  return { text: `อีก ${diffDays} วัน`, color: "green", days: diffDays };
}

function getSessionBreakdown(customer) {
  if (!customer.sessions) return "";
  return Object.entries(customer.sessions)
    .map(([vid, s]) => `${vid.substring(0, 8)}...: ${s.count} ชิ้น`)
    .join("\n");
}

function addManualCustomer() {
  const name = newName.value.trim();
  if (!name) return;
  const parsedDate = parseDDMMYYYY(newDate.value);
  const manualUid = "manual-" + Date.now();
  update(dbRef(db, `delivery_customers/${manualUid}`), {
    name, itemCount: 0, deliveryDate: parsedDate || null, note: "", status: "pending", createdAt: Date.now(), updatedAt: Date.now(),
  }).then(() => {
    newName.value = ""; newDate.value = "";
    Swal.fire({ icon: "success", title: `เพิ่มแล้ว`, toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
  });
}

function updateField(id, field, value) {
  update(dbRef(db, `delivery_customers/${id}`), { [field]: value, updatedAt: Date.now() });
}

function markDone(customer) {
  update(dbRef(db, `delivery_customers/${customer.id}`), {
    status: "done", itemCount: 0, sessions: null, updatedAt: Date.now(),
  });
  Swal.fire({ icon: "success", title: "เสร็จ!", toast: true, position: "top-end", timer: 1000, showConfirmButton: false });
}

function undoDone(id) {
  update(dbRef(db, `delivery_customers/${id}`), { status: "pending", updatedAt: Date.now() });
}

function deleteCustomer(id, name) {
  Swal.fire({
    title: `ลบ ${name}?`, icon: "warning", showCancelButton: true, confirmButtonColor: "#d32f2f", confirmButtonText: "ลบ", cancelButtonText: "ยกเลิก"
  }).then((r) => {
    if (r.isConfirmed) remove(dbRef(db, `delivery_customers/${id}`));
  });
}

function closeWindow() {
  window.close(); // For separate tab viewing
}
</script>

<style scoped>
.shipping-mobile-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #0f1115;
  color: #fff;
  font-family: "Kanit", sans-serif;
  overflow: hidden;
}

/* Header */
.smob-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #1a1d24;
  border-bottom: 1px solid #2a2d35;
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
  z-index: 10;
}
.smob-title { font-size: 1.4em; font-weight: 800; color: #fff; letter-spacing: 0.5px; }

/* Stats */
.smob-stats {
  display: flex;
  gap: 10px;
  padding: 16px;
  background: #14161b;
}
.smob-stat {
  flex: 1;
  background: #1f2229;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  border: 1px solid #2a2d35;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.smob-stat.urgent { border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08); }
.smob-stat.warn { border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08); }

.smob-stat-num { font-size: 1.6em; font-weight: 800; color: #fff; }
.smob-stat.urgent .smob-stat-num { color: #fca5a5; }
.smob-stat.warn .smob-stat-num { color: #fcd34d; }
.smob-stat-label { font-size: 0.8em; color: #aaa; margin-top: 4px; }

/* Add Form */
.smob-add-form {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px 16px;
  border-bottom: 1px solid #2a2d35;
}
.smob-input {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #333;
  background: #1f2229;
  color: #fff;
  font-family: "Kanit", sans-serif;
  font-size: 1em;
  width: 100%;
}
.smob-input:focus { outline: none; border-color: #3b82f6; }
.smob-date-wrap { flex: 0 0 100px; position: relative; }
.smob-add-btn { flex: 0 0 auto; padding: 0 16px; border-radius: 10px; font-weight: bold; }

/* Filter */
.smob-filter {
  padding: 12px 16px;
  background: #14161b;
  border-bottom: 1px solid #2a2d35;
}
.smob-toggle { display: flex; align-items: center; gap: 8px; color: #ccc; font-size: 0.9em; cursor: pointer; }
.smob-toggle input { accent-color: #3b82f6; width: 18px; height: 18px; }

/* List */
.smob-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-bottom: 100px;
  background: #0f1115;
}
.smob-empty { text-align: center; color: #777; padding: 40px 20px; font-size: 0.95em; }

/* Cards */
.smob-card {
  background: #1a1d24;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid #2a2d35;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card-urgent { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.05); }
.card-done { opacity: 0.5; filter: grayscale(50%); }

.smob-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed #333;
  padding-bottom: 12px;
}
.smob-card-name { display: flex; align-items: center; gap: 8px; flex: 1; }
.smob-idx { color: #888; font-weight: bold; font-size: 1.1em; }
.smob-edit-input {
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  padding: 4px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1.1em;
  width: 100%;
}
.smob-edit-input:focus { background: #1f2229; border-color: #3b82f6; outline: none; }
.fw-bold { font-weight: 700; color: #60a5fa; }

/* Countdown badge */
.smob-countdown {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.85em;
  font-weight: bold;
  white-space: nowrap;
}
.cd-overdue { background: rgba(220, 38, 38, 0.2); color: #fca5a5; }
.cd-red { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
.cd-orange { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.cd-yellow { background: rgba(234, 179, 8, 0.12); color: #facc15; }
.cd-green { background: rgba(16, 185, 129, 0.12); color: #6ee7b7; }
.cd-gray { background: rgba(107, 114, 128, 0.12); color: #9ca3af; }

.smob-card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.smob-row { display: flex; gap: 12px; }
.smob-col { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.smob-col-full { flex: 1; }
.smob-label { font-size: 0.8em; color: #888; }
.smob-val { font-size: 1em; color: #fff; font-weight: 600; }
.item-count-auto { color: #10b981; }

.smob-note { font-size: 0.9em; background: #14161b; border: 1px solid #2a2d35; border-radius: 8px; padding: 10px; width: 100%; box-sizing: border-box; }

/* Date Picker adjustments */
.smob-date-cell { position: relative; display: inline-flex; align-items: center; justify-content: flex-start; min-width: 100px; height: 32px; background: #14161b; padding: 0 10px; border-radius: 8px; border: 1px solid #2a2d35; cursor:text;}
.thai-date { font-weight: bold; color: #fff; white-space: nowrap; }
.no-date { color: #666; font-size: 0.9em; }
.smob-date-input-text { position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; z-index:2; cursor:pointer;}
.smob-date-input-text:focus { opacity:1; background:#14161b; color:#fff; border-radius:8px; border:1px solid #3b82f6; outline:none; text-align:center; }

/* Actions */
.smob-card-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  border-top: 1px dashed #333;
  padding-top: 12px;
}
.smob-btn-action {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  font-weight: bold;
  font-family: inherit;
  font-size: 0.9em;
  cursor: pointer;
}
.smob-btn-done { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.smob-btn-undo { background: rgba(107, 114, 128, 0.2); color: #cbd5e1; }
.smob-btn-del { flex: 0 0 auto; background: rgba(239, 68, 68, 0.15); color: #f87171; padding: 10px 16px; }
</style>

<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="sm-content">
      <!-- Header -->
      <div class="sm-header">
        <div class="sm-title">📦 รายการจัดส่ง</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-dark" @click="$emit('close')">ปิด</button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="sm-stats">
        <div class="sm-stat">
          <span class="sm-stat-num">{{ activeCustomers.length }}</span>
          <span class="sm-stat-label">ทั้งหมด</span>
        </div>
        <div class="sm-stat urgent">
          <span class="sm-stat-num">{{ todayCount }}</span>
          <span class="sm-stat-label">ส่งวันนี้</span>
        </div>
        <div class="sm-stat warn">
          <span class="sm-stat-num">{{ soonCount }}</span>
          <span class="sm-stat-label">1-3 วัน</span>
        </div>
        <div class="sm-stat">
          <span class="sm-stat-num">{{ totalItemCount }}</span>
          <span class="sm-stat-label">สินค้ารวม</span>
        </div>
      </div>

      <!-- Add Customer Form (manual) -->
      <div class="sm-add-form">
        <input
          type="text"
          v-model="newName"
          class="sm-input"
          placeholder="เพิ่มลูกค้า (ชื่อ)"
          @keyup.enter="addManualCustomer"
          list="customerNamesList"
        />
        <datalist id="customerNamesList">
          <option v-for="name in uniqueCustomerNames" :key="name" :value="name"></option>
        </datalist>
        <div style="position: relative;">
          <ThaiDatePicker v-model="newDateFormatted" position="bottom-right">
            <input
              type="text"
              :value="newDate"
              @input="onNewDateInput"
              class="sm-input sm-date"
              placeholder="วว/ดด/ปปปป"
              maxlength="10"
            />
          </ThaiDatePicker>
        </div>
        <button class="btn btn-success sm-add-btn" @click="addManualCustomer" :disabled="!newName.trim()">
          <i class="fa-solid fa-plus"></i> เพิ่ม
        </button>
      </div>

      <!-- Customer List -->
      <div class="sm-table-wrap">
        <table class="sm-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ชื่อลูกค้า</th>
              <th>สินค้า</th>
              <th>วันส่ง</th>
              <th>นับถอยหลัง</th>
              <th>โน้ต</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedCustomers.length === 0">
              <td colspan="7" style="text-align: center; color: #666; padding: 30px;">
                ยังไม่มีรายการจัดส่ง — เพิ่มลูกค้าจาก Dashboard หรือเพิ่มด้วยมือ
              </td>
            </tr>
            <tr
              v-for="(c, idx) in sortedCustomers"
              :key="c.id"
              :class="{ 'row-urgent': getCountdown(c.deliveryDate).days <= 0 && c.deliveryDate, 'row-done': c.status === 'done' }"
            >
              <td class="td-center">{{ idx + 1 }}</td>
              <td>
                <input
                  type="text"
                  class="sm-edit-input"
                  :value="c.name"
                  @change="updateField(c.id, 'name', $event.target.value)"
                />
              </td>
              <td class="td-center">
                <span class="item-count-auto" :title="getSessionBreakdown(c)">
                  {{ c.itemCount || 0 }} ชิ้น
                  <i v-if="c.sessions" class="fa-solid fa-circle-info session-info-icon"></i>
                </span>
              </td>
              <td class="td-center">
                <div class="date-cell">
                  <span v-if="c.deliveryDate" class="thai-date">{{ formatThaiDate(c.deliveryDate) }}</span>
                  <span v-else class="no-date">ดด/วว/ปป</span>
                  <ThaiDatePicker :modelValue="c.deliveryDate" position="bottom-center" @update:modelValue="val => updateField(c.id, 'deliveryDate', val)" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
                    <input
                      type="text"
                      class="sm-date-input-text"
                      style="width: 100%; height: 100%; box-sizing: border-box;"
                      :value="formatToDDMMYYYY(c.deliveryDate)"
                      @input="onTableRowDateInput"
                      @change="handleTableDateChange(c.id, $event.target.value)"
                      placeholder="วว/ดด/ปปปป"
                      maxlength="10"
                    />
                  </ThaiDatePicker>
                </div>
              </td>
              <td class="td-center">
                <span class="countdown-badge" :class="'cd-' + getCountdown(c.deliveryDate).color">
                  {{ getCountdown(c.deliveryDate).text }}
                </span>
              </td>
              <td>
                <input
                  type="text"
                  class="sm-edit-input sm-note"
                  :value="c.note || ''"
                  placeholder="โน้ต..."
                  @change="updateField(c.id, 'note', $event.target.value)"
                />
              </td>
              <td class="td-center">
                <div class="action-btns">
                  <button
                    v-if="c.status !== 'done'"
                    class="action-btn done-btn"
                    @click="markDone(c)"
                    title="เสร็จแล้ว"
                  >✅</button>
                  <button
                    v-else
                    class="action-btn undo-btn"
                    @click="undoDone(c.id)"
                    title="ยังไม่เสร็จ"
                  >↩️</button>
                  <button
                    class="action-btn del-btn"
                    @click="deleteCustomer(c.id, c.name)"
                    title="ลบ"
                  >🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Filter Toggle -->
      <div class="sm-footer">
        <label class="sm-toggle">
          <input type="checkbox" v-model="showDone" />
          <span>แสดงรายการที่เสร็จแล้ว ({{ doneCount }})</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted, watch } from "vue";
import { ref as dbRef, onValue, update, remove, get } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useStockStore } from "../stores/stock";
import { useSystemStore } from "../stores/system";
import Swal from "sweetalert2";
import ThaiDatePicker from "./ThaiDatePicker.vue";

const emit = defineEmits(["close"]);

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
  const year = (d.getFullYear() + 543) % 100; // พ.ศ. 2 หลัก
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

// ✅ REAL-TIME SYNC: Watch stock data → auto-update delivery_customers
watch(
  () => stockStore.stockData,
  async (newStockData) => {
    const videoId = systemStore.currentVideoId;
    if (!videoId || allCustomers.value.length === 0) return;

    // Build current orders per uid
    const orders = {};
    Object.keys(newStockData).forEach((num) => {
      const item = newStockData[num];
      if (item?.uid) {
        if (!orders[item.uid]) {
          orders[item.uid] = { count: 0, totalPrice: 0 };
        }
        orders[item.uid].count++;
        orders[item.uid].totalPrice += item.price ? parseInt(item.price) : 0;
      }
    });

    // Auto-update only customers already in delivery_customers
    for (const customer of allCustomers.value) {
      if (customer.status === "done") continue;
      const uid = customer.id;
      const order = orders[uid];
      if (!order) continue;

      // Check if this session data changed
      const currentSession = customer.sessions?.[videoId];
      if (currentSession && currentSession.count === order.count && currentSession.totalPrice === order.totalPrice) {
        continue; // No change
      }

      // Update session + recalc
      await update(dbRef(db, `delivery_customers/${uid}/sessions/${videoId}`), {
        count: order.count,
        totalPrice: order.totalPrice,
      });

      // Recalc total
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

const todayCount = computed(() =>
  activeCustomers.value.filter((c) => getCountdown(c.deliveryDate).days === 0).length
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
  
  allCustomers.value.forEach(c => {
    if (c.name) names.add(c.name);
  });
  
  if (stockStore.stockData) {
    Object.values(stockStore.stockData).forEach(item => {
      if (item && item.owner) names.add(item.owner);
      if (item && item.queue) {
        item.queue.forEach(q => {
          if (q.owner) names.add(q.owner);
        });
      }
    });
  }
  
  return Array.from(names).sort();
});

// Countdown Logic
function getCountdown(deliveryDate) {
  if (!deliveryDate) return { text: "ยังไม่กำหนด", color: "gray", days: Infinity };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `เลย ${Math.abs(diffDays)} วัน!`, color: "overdue", days: diffDays };
  if (diffDays === 0) return { text: "ส่งวันนี้!", color: "red", days: 0 };
  if (diffDays === 1) return { text: "พรุ่งนี้", color: "orange", days: 1 };
  if (diffDays <= 3) return { text: `อีก ${diffDays} วัน`, color: "yellow", days: diffDays };
  return { text: `อีก ${diffDays} วัน`, color: "green", days: diffDays };
}

function getSessionBreakdown(customer) {
  if (!customer.sessions) return "ไม่มีข้อมูลไลฟ์";
  return Object.entries(customer.sessions)
    .map(([vid, s]) => `${vid.substring(0, 8)}...: ${s.count} ชิ้น`)
    .join("\n");
}

// CRUD
function addManualCustomer() {
  let name = newName.value.trim();
  if (!name) return;

  let parsedDate = parseDDMMYYYY(newDate.value);

  // --- Apply Chat-Like Logic ---
  const shipNowMatch = name.match(/ส่งเลย|ส่งวันนี้/);
  const shipTmrMatch = name.match(/ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/);
  const shipDateMatch = name.match(/ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/);

  let matchedKeyword = null;
  if (shipNowMatch) matchedKeyword = shipNowMatch[0];
  else if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
  else if (shipDateMatch) matchedKeyword = shipDateMatch[0];

  if (matchedKeyword) {
    // 1. Clean the name
    let cleanName = name
      .replace(matchedKeyword, "")
      .replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "")
      .trim();

    if (cleanName.length > 0) {
      name = cleanName;
    }

    // 2. Auto-set the date if not explicitly manually filled in the date input
    if (!newDate.value) {
      let autoShipDate = new Date();
      if (shipNowMatch) {
         // today
      } else if (shipTmrMatch) {
         autoShipDate.setDate(autoShipDate.getDate() + 1);
      } else if (shipDateMatch) {
         const day = parseInt(shipDateMatch[1]);
         autoShipDate.setDate(day);
         const monthStr = shipDateMatch[2];
         if (monthStr) {
           const mNamesShort = ["มค", "กพ", "มีค", "เมย", "พค", "มิย", "กค", "สค", "กย", "ตค", "พย", "ธค"];
           const mNamesFull = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
           const cleanMonth = monthStr.replace(/\./g, '');
           let mIndex = mNamesShort.indexOf(cleanMonth);
           if (mIndex === -1) mIndex = mNamesFull.indexOf(cleanMonth);
           if (mIndex !== -1) {
             autoShipDate.setMonth(mIndex);
           }
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

  // Backup fallback: Today
  if (!parsedDate) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    parsedDate = `${y}-${m}-${d}`;
  }

  // Find if customer already exists to update them instead of duplicating
  let targetUid = "manual-" + Date.now();
  const existingCustomer = allCustomers.value.find(c => c.name === name && c.status !== "done");
  if (existingCustomer) {
    targetUid = existingCustomer.id;
  }

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
    title: `ส่งของ "${customer.name}" เสร็จแล้ว?`,
    text: "สถานะจะเปลี่ยนเป็นเสร็จ + reset sessions",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#10b981",
  }).then((r) => {
    if (r.isConfirmed) {
      update(dbRef(db, `delivery_customers/${customer.id}`), {
        status: "done",
        itemCount: 0,
        sessions: null,
        updatedAt: Date.now(),
      });
      Swal.fire({ icon: "success", title: "เสร็จเรียบร้อย!", toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
    }
  });
}

function undoDone(id) {
  update(dbRef(db, `delivery_customers/${id}`), {
    status: "pending",
    updatedAt: Date.now(),
  });
}

function deleteCustomer(id, name) {
  Swal.fire({
    title: `ลบ "${name}"?`,
    text: "ข้อมูลจะหายถาวร",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบเลย",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
  }).then((r) => {
    if (r.isConfirmed) {
      remove(dbRef(db, `delivery_customers/${id}`));
      Swal.fire({ icon: "success", title: "ลบแล้ว", toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
    }
  });
}
</script>

<style scoped>
.sm-content {
  background: #121212;
  border-radius: 12px;
  max-width: 95%;
  width: 950px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.sm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #333;
}

.sm-title { font-size: 1.3em; font-weight: bold; color: #fff; }

/* Stats */
.sm-stats {
  display: flex;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid #2a2a2a;
}

.sm-stat {
  flex: 1;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 10px 12px;
  text-align: center;
  border: 1px solid #333;
}

.sm-stat.urgent { border-color: #ef4444; background: rgba(239, 68, 68, 0.08); }
.sm-stat.warn { border-color: #f59e0b; background: rgba(245, 158, 11, 0.08); }

.sm-stat-num {
  display: block;
  font-size: 1.5em;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
}

.sm-stat.urgent .sm-stat-num { color: #ef4444; }
.sm-stat.warn .sm-stat-num { color: #f59e0b; }
.sm-stat-label { font-size: 0.7em; color: #888; margin-top: 2px; }

/* Add Form */
.sm-add-form { display: flex; gap: 10px; padding: 12px 0; align-items: center; }

.sm-input {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #444;
  background: #1e1e1e;
  color: #fff;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  flex: 1;
}

.sm-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
.sm-date { max-width: 160px; flex: unset; }
.sm-add-btn { padding: 8px 16px; font-size: 0.95em; white-space: nowrap; }

/* Table */
.sm-table-wrap { flex: 1; overflow-y: auto; overflow-x: auto; }

.sm-table { width: 100%; border-collapse: collapse; font-size: 0.85em; }

.sm-table th {
  background: #252525;
  color: #aaa;
  padding: 10px 6px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

.sm-table td { padding: 7px 6px; border-bottom: 1px solid #2a2a2a; vertical-align: middle; }
.sm-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
.td-center { text-align: center; }
.row-urgent { background: rgba(239, 68, 68, 0.06) !important; }
.row-done { opacity: 0.45; }

/* Auto Item Count */
.item-count-auto {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: #10b981;
}

.session-info-icon { font-size: 0.75em; color: #666; cursor: help; }

/* Thai Date Cell */
.date-cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
  gap: 6px;
  cursor: text;
}

.thai-date {
  font-weight: 600;
  color: #e0e0e0;
  white-space: nowrap;
}

.no-date { color: #555; font-size: 0.85em; }

.sm-date-input-text {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  text-align: center;
  font-family: inherit;
  font-size: 0.95em;
  border-radius: 4px;
  cursor: text;
  transition: all 0.2s;
}

.sm-date-input-text:focus {
  opacity: 1;
  background: #1e1e1e;
  border-color: #3b82f6;
  outline: none;
  z-index: 10;
}

/* Editable Inputs */
.sm-edit-input {
  background: transparent;
  border: 1px solid transparent;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: "Kanit", sans-serif;
  font-size: 0.95em;
  width: 100%;
  transition: border-color 0.2s;
}

.sm-edit-input:hover { border-color: #555; }
.sm-edit-input:focus { border-color: #3b82f6; outline: none; background: #1e1e1e; }
.sm-note { max-width: 130px; font-size: 0.85em; color: #aaa; }

/* Countdown Badge */
.countdown-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 700;
  white-space: nowrap;
}

.cd-overdue { background: rgba(220, 38, 38, 0.2); color: #fca5a5; animation: pulse-urgent 1.5s infinite; }
.cd-red { background: rgba(239, 68, 68, 0.2); color: #fca5a5; animation: pulse-urgent 2s infinite; }
.cd-orange { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
.cd-yellow { background: rgba(234, 179, 8, 0.12); color: #facc15; }
.cd-green { background: rgba(16, 185, 129, 0.12); color: #6ee7b7; }
.cd-gray { background: rgba(107, 114, 128, 0.12); color: #9ca3af; }

@keyframes pulse-urgent {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}

/* Action Buttons */
.action-btns { display: flex; gap: 6px; justify-content: center; }

.action-btn {
  background: transparent;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: transform 0.15s, background 0.15s;
}

.action-btn:hover { transform: scale(1.2); background: rgba(255,255,255,0.05); }

/* Footer */
.sm-footer { padding: 10px 0 0; border-top: 1px solid #2a2a2a; }

.sm-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 0.85em;
  cursor: pointer;
}

.sm-toggle input { accent-color: #3b82f6; }

/* Responsive */
@media (max-width: 768px) {
  .sm-content { padding: 14px; }
  .sm-stats { flex-wrap: wrap; gap: 8px; }
  .sm-stat { min-width: calc(50% - 4px); }
  .sm-add-form { flex-wrap: wrap; }
  .sm-input { min-width: 100%; }
  .sm-date { max-width: unset; min-width: 100%; }
  .sm-table { font-size: 0.75em; }
  .sm-note { max-width: 100px; }
}
</style>

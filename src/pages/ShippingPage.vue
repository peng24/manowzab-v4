<template>
  <div class="sp-app">
    <!-- 🔒 High-Security Authentication Gate -->
    <AuthGate v-if="!authStore.isAuthenticated" />

    <template v-else>
      <!-- ============ STICKY HEADER ============ -->
      <header class="sp-header">
        <div class="sp-header-left">
          <span class="sp-logo">📦</span>
          <h1 class="sp-title">รายการจัดส่ง</h1>
        </div>
        <div class="sp-header-actions">
          <button class="sp-header-act-btn print" @click="showShippingLabels = true" title="พิมพ์ใบปะหน้าพัสดุ">
            <i class="fa-solid fa-print"></i> ปริ้นใบปะหน้า
          </button>
          <button class="sp-header-act-btn import" @click="showAddressImport = true" title="นำเข้าที่อยู่จาก Note / แชท">
            <i class="fa-solid fa-file-import"></i> นำเข้าที่อยู่
          </button>
          <button class="sp-icon-btn" @click="refreshData" title="รีเฟรช">
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isRefreshing }"></i>
          </button>
          <a :href="baseUrl" class="sp-icon-btn" title="กลับ Command Center">
            <i class="fa-solid fa-desktop"></i>
          </a>
          <button class="sp-icon-btn" @click="handleLogout" title="ออกจากระบบ" style="color: #f87171;">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
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

    <!-- ============ SHIPPING CYCLE SELECTOR ============ -->
    <div class="sp-cycle-wrap">
      <div class="sp-cycle-info">
        <span class="sp-cycle-ico">🚚</span>
        <span class="sp-cycle-title">รอบจัดส่งหลัก:</span>
        <span class="sp-cycle-badge">{{ currentCycleLabel }}</span>
      </div>
      <div class="sp-cycle-select-wrap">
        <select
          class="sp-cycle-select"
          :value="shippingCycle"
          @change="onShippingCycleChange($event.target.value)"
        >
          <option value="today">📅 ส่งวันนี้</option>
          <option value="tomorrow">⏭️ ส่งพรุ่งนี้</option>
          <option value="จันทร์">วันจันทร์</option>
          <option value="อังคาร">วันอังคาร</option>
          <option value="พุธ">วันพุธ</option>
          <option value="พฤหัส">วันพฤหัสบดี</option>
          <option value="ศุกร์">วันศุกร์</option>
          <option value="เสาร์">วันเสาร์</option>
          <option value="อาทิตย์">วันอาทิตย์</option>
        </select>
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

          <!-- Row 3: Address Indicator (Sleek & Subtle) -->
          <div class="sp-row-addr">
            <!-- 📚 Multi-Address Pill when > 1 address -->
            <span
              v-if="getCustomerAddressCount(c) > 1"
              class="sp-multi-addr-pill"
              @click="selectedCustomerForAddress = c"
              :title="`ลูกค้ารายนี้มี ${getCustomerAddressCount(c)} ที่อยู่ — คลิกเพื่อเลือกหรือสลับที่อยู่จัดส่ง`"
            >
              <i class="fa-solid fa-layer-group"></i>
              <span class="multi-count-num">{{ getCustomerAddressCount(c) }} ที่อยู่</span>
              <span class="multi-count-action">
                {{ getActiveAddressLabel(c) ? `(เลือก: ${getActiveAddressLabel(c)})` : '(เลือกที่อยู่)' }}
              </span>
            </span>

            <span
              class="sp-addr-mini-pill"
              :class="hasAddress(c) ? 'has' : 'none'"
              @click="selectedCustomerForAddress = c"
              :title="hasAddress(c) ? getCustomerAddressSummary(c) : 'กดเพื่อใส่ที่อยู่ลูกค้า'"
            >
              <i class="fa-solid fa-location-dot"></i>
              <span>
                <template v-if="hasAddress(c)">
                  {{ c.recipientName ? `ผู้รับ: ${c.recipientName}` : 'มีที่อยู่' }}
                </template>
                <template v-else>
                  ยังไม่มีที่อยู่
                </template>
              </span>
            </span>

            <!-- 💳 Payment Type Pill (โอน / COD / ยังไม่ระบุ) -->
            <span
              class="sp-payment-pill"
              :class="getCustomerPaymentType(c) === 'cod' ? 'cod' : (getCustomerPaymentType(c) === 'transfer' ? 'transfer' : 'unspecified')"
              @click.stop="togglePaymentType(c)"
              :title="`รูปแบบส่ง: ${getPaymentTypeDisplay(c)} (คลิกเพื่อสลับ)`"
            >
              <i :class="getCustomerPaymentType(c) === 'cod' ? 'fa-solid fa-money-bill-wave' : (getCustomerPaymentType(c) === 'transfer' ? 'fa-solid fa-credit-card' : 'fa-regular fa-circle-question')"></i>
              <span>{{ getPaymentTypeDisplay(c) }}</span>
            </span>

            <!-- 🖨️ Printed status badge with toggle -->
            <span
              class="sp-printed-pill"
              :class="c.labelPrinted ? 'printed' : 'unprinted'"
              @click.stop="togglePrinted(c)"
              :title="c.labelPrinted ? 'พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)' : 'ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)'"
            >
              <i :class="c.labelPrinted ? 'fa-solid fa-circle-check' : 'fa-solid fa-print'"></i>
              <span>{{ c.labelPrinted ? 'พิมพ์แล้ว' : 'ยังไม่พิมพ์' }}</span>
            </span>
          </div>

          <!-- Row 4: Note (compact) -->
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
              class="sp-act sp-act--print"
              :class="{ 'is-printed': c.labelPrinted }"
              @click="openPrintForCustomer(c)"
              title="พิมพ์ใบปะหน้าเฉพาะคนนี้"
            >🖨️</button>
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

    <!-- 🖨️ Shipping Label Print Modal -->
    <ShippingLabelModal
      v-if="showShippingLabels"
      :customers="allCustomers"
      :addressBook="addressBook"
      :initialSelectedId="selectedCustomerForPrint"
      @close="showShippingLabels = false; selectedCustomerForPrint = null"
    />

    <!-- 📥 Address Import Modal -->
    <AddressImportModal
      v-if="showAddressImport"
      :customers="allCustomers"
      :addressBook="addressBook"
      @close="showAddressImport = false"
    />

    <!-- 📍 Multiple Address Manager Modal -->
    <CustomerAddressModal
      v-if="currentCustomerForModal"
      :customer="currentCustomerForModal"
      :addressBook="addressBook"
      @close="selectedCustomerForAddress = null"
    />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../stores/auth";
import AuthGate from "../components/AuthGate.vue";
import { ref as dbRef, onValue, update, remove, runTransaction } from "firebase/database";
import { db } from "../composables/useFirebase";
import Swal from "sweetalert2";
import ThaiDatePicker from "../components/ThaiDatePicker.vue";
import ShippingLabelModal from "../components/ShippingLabelModal.vue";
import AddressImportModal from "../components/AddressImportModal.vue";
import CustomerAddressModal from "../components/CustomerAddressModal.vue";
import { normalizeName } from "../utils/addressParser";
import {
  resolveShippingCycleDate,
  formatDateToYYYYMMDD,
  formatShippingCycleLabel,
  shipDayOfWeekRegex,
  calcNextDayOfWeekDate,
} from "../utils/chatParserUtils";

// ====== State ======
const authStore = useAuthStore();
const allCustomers = ref([]);
const newName = ref("");
const newDate = ref("");
const showDone = ref(false);
const showAddForm = ref(false);
const searchQuery = ref("");
const activeFilter = ref("requested");
const isRefreshing = ref(false);
const shippingCycle = ref("today");
const showShippingLabels = ref(false);
const selectedCustomerForPrint = ref(null);
const showAddressImport = ref(false);
const selectedCustomerForAddress = ref(null);
const addressBook = ref({});
const cleanupFns = [];

const currentCustomerForModal = computed(() => {
  if (!selectedCustomerForAddress.value) return null;
  return allCustomers.value.find((c) => c.id === selectedCustomerForAddress.value.id) || selectedCustomerForAddress.value;
});

async function handleLogout() {
  const res = await Swal.fire({
    title: "ออกจากระบบ?",
    text: "คุณต้องการออกจากระบบ ใช่หรือไม่",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "ออกจากระบบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#334155",
  });

  if (res.isConfirmed) {
    authStore.logout();
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "🚪 ออกจากระบบเรียบร้อยแล้ว",
      showConfirmButton: false,
      timer: 2000,
    });
  }
}

const currentCycleLabel = computed(() => {
  return formatShippingCycleLabel(shippingCycle.value);
});

async function onShippingCycleChange(newCycle) {
  shippingCycle.value = newCycle || "today";
  await update(dbRef(db), { "settings/shippingCycle": newCycle || "today" });
  Swal.fire({
    icon: "success",
    title: `🚚 ตั้งรอบจัดส่งหลักเป็น: ${formatShippingCycleLabel(newCycle)}`,
    toast: true,
    position: "top-end",
    timer: 1800,
    showConfirmButton: false,
  });
}

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

  const addressBookRef = dbRef(db, "address_book");
  const unsubAddressBook = onValue(addressBookRef, (snapshot) => {
    addressBook.value = snapshot.val() || {};
  });
  cleanupFns.push(unsubAddressBook);

  const cycleRef = dbRef(db, "settings/shippingCycle");
  const unsubCycle = onValue(cycleRef, (snapshot) => {
    shippingCycle.value = snapshot.val() || "today";
  });
  cleanupFns.push(unsubCycle);
});

onUnmounted(() => {
  cleanupFns.forEach(fn => { if (typeof fn === 'function') fn(); });
  cleanupFns.length = 0;
});

// ====== Address Helpers ======
function getCustomerSavedAddresses(customer) {
  if (!customer) return [];
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  const inCust = customer.addresses;
  const inBook = addressBook.value && addressBook.value[norm]?.addresses;
  const rawList = inCust || inBook;
  let list = [];
  if (Array.isArray(rawList)) {
    list = rawList.filter(Boolean);
  } else if (rawList && typeof rawList === "object") {
    list = Object.values(rawList).filter(Boolean);
  }
  if (list.length > 0) return list;
  if (hasAddress(customer)) {
    const info = getCustomerAddressInfo(customer);
    return info ? [info] : [];
  }
  return [];
}

function getCustomerAddressCount(customer) {
  return getCustomerSavedAddresses(customer).length;
}

function getActiveAddressLabel(customer) {
  if (!customer) return "";
  const list = getCustomerSavedAddresses(customer);
  if (!list || list.length === 0) return "";

  // 1. Match by selectedAddressId
  if (customer.selectedAddressId) {
    const matched = list.find((a) => a.id === customer.selectedAddressId);
    if (matched) return matched.label || (matched.recipientName ? `${matched.recipientName}` : "");
  }

  // 2. Match by address string
  if (customer.address && customer.address.trim()) {
    const trimmed = customer.address.trim();
    const matched = list.find((a) => a.address && a.address.trim() === trimmed);
    if (matched) return matched.label || (matched.recipientName ? `${matched.recipientName}` : "");
  }

  // 3. Fallback to first item's label
  return list[0]?.label || "";
}

function getCustomerAddressInfo(customer) {
  if (customer.address && customer.address.trim()) {
    return {
      recipientName: customer.recipientName || "",
      phone: customer.phone || "",
      address: customer.address || "",
      postalCode: customer.postalCode || "",
    };
  }
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  if (addressBook.value && addressBook.value[norm]) {
    return addressBook.value[norm];
  }
  return null;
}

function hasAddress(customer) {
  const info = getCustomerAddressInfo(customer);
  return !!(info && info.address && info.address.trim());
}

function getCustomerAddressSummary(customer) {
  const info = getCustomerAddressInfo(customer);
  if (!info || !info.address) return "";
  const recipientPart = info.recipientName && info.recipientName !== customer.name ? `[ผู้รับ: ${info.recipientName}] ` : "";
  return `${recipientPart}${info.phone ? info.phone + ' • ' : ''}${info.address}`;
}

function promptEditAddress(customer) {
  selectedCustomerForAddress.value = customer;
}

// ====== Computed ======
const activeCustomers = computed(() =>
  allCustomers.value.filter((c) => c.status !== "done")
);

const shippingRequestedCustomers = computed(() =>
  allCustomers.value.filter(
    (c) => c.status !== "done" && c.deliveryDate && c.deliveryDate.trim() !== ""
  )
);

const unassignedCustomers = computed(() =>
  allCustomers.value.filter(
    (c) => c.status !== "done" && (!c.deliveryDate || c.deliveryDate.trim() === "")
  )
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

  if (activeFilter.value === 'requested') {
    list = list.filter(c => c.status !== 'done' && c.deliveryDate && c.deliveryDate.trim() !== "");
  } else if (activeFilter.value === 'unassigned') {
    list = list.filter(c => c.status !== 'done' && (!c.deliveryDate || c.deliveryDate.trim() === ""));
  } else if (activeFilter.value === 'urgent') {
    list = list.filter(c => {
      const d = getCountdown(c.deliveryDate).days;
      return d <= 1 && c.status !== 'done' && c.deliveryDate;
    });
  } else if (activeFilter.value === 'normal') {
    list = list.filter(c => {
      const d = getCountdown(c.deliveryDate).days;
      return d > 1 && c.status !== 'done' && c.deliveryDate;
    });
  } else if (activeFilter.value === 'done') {
    list = list.filter(c => c.status === 'done');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(c => c.name && c.name.toLowerCase().includes(q));
  }

  return list;
});

const todayCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => getCountdown(c.deliveryDate).days === 0).length
);

const overdueCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => getCountdown(c.deliveryDate).days < 0).length
);

const packTonightCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => isPackTonight(c)).length
);

const soonCount = computed(() =>
  shippingRequestedCustomers.value.filter((c) => {
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
    { key: 'requested', label: '📦 แจ้งส่งแล้ว', count: shippingRequestedCustomers.value.length },
    { key: 'unassigned', label: '🛋️ ฝากสินค้า', count: unassignedCustomers.value.length },
    { key: 'all', label: '🌐 ทั้งหมด', count: activeCustomers.value.length },
  ];
  const urgentN = shippingRequestedCustomers.value.filter(c => getCountdown(c.deliveryDate).days <= 1).length;
  if (urgentN > 0) tabs.push({ key: 'urgent', label: '🔴 เร่ง', count: urgentN });
  const normalN = shippingRequestedCustomers.value.filter(c => getCountdown(c.deliveryDate).days > 1).length;
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

  const shipNowMatch = name.match(/ส่งเลย|ส่งวันนี้|ส่งครับ|ส่งค่ะ|ส่งด้วย|พร้อมส่ง|ขอส่ง|แจ้งส่ง|รวมส่ง|(?:^|[^\u0E00-\u0E7F])ส่ง(?:$|[^\u0E00-\u0E7F\w])/);
  const shipTmrMatch = name.match(/ส่งพรุ่งนี้|พรุ่งนี้ส่ง|ส่งวันพรุ่งนี้/);
  const shipDayOfWeekMatch = name.match(shipDayOfWeekRegex);
  const shipDateMatch = name.match(/ส่ง(?:วันที่\s*)?(\d{1,2})(?:\s*)(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)?/);

  let matchedKeyword = null;
  if (shipTmrMatch) matchedKeyword = shipTmrMatch[0];
  else if (shipDayOfWeekMatch) matchedKeyword = shipDayOfWeekMatch[0];
  else if (shipDateMatch) matchedKeyword = shipDateMatch[0];
  else if (shipNowMatch) matchedKeyword = shipNowMatch[0];

  if (matchedKeyword) {
    let cleanName = name.replace(matchedKeyword, "").replace(/^[^\w\u0E00-\u0E7F]+|[^\w\u0E00-\u0E7F]+$/g, "").trim();
    if (cleanName.length > 0) name = cleanName;

    if (!newDate.value) {
      let autoShipDate = new Date();
      if (shipTmrMatch) {
        autoShipDate.setDate(autoShipDate.getDate() + 1);
      } else if (shipDayOfWeekMatch) {
        const dayName = shipDayOfWeekMatch[1];
        autoShipDate = calcNextDayOfWeekDate(dayName);
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
          if (mIndex !== -1) autoShipDate.setMonth(mIndex);
        }
        if (autoShipDate < new Date() && (new Date().getDate() - day) > 15) {
          autoShipDate.setMonth(autoShipDate.getMonth() + 1);
        }
      } else if (shipNowMatch) {
        autoShipDate = resolveShippingCycleDate(shippingCycle.value);
      }
      parsedDate = formatDateToYYYYMMDD(autoShipDate);
    }
  }

  if (!parsedDate) {
    const cycleDate = resolveShippingCycleDate(shippingCycle.value);
    parsedDate = formatDateToYYYYMMDD(cycleDate);
  }

  let targetUid = "manual-" + Date.now();
  const existingCustomer = allCustomers.value.find(c => c.name === name && c.status !== "done");
  if (existingCustomer) targetUid = existingCustomer.id;

  update(dbRef(db, `delivery_customers/${targetUid}`), {
    name,
    itemCount: existingCustomer ? (existingCustomer.itemCount ?? 0) : 0,
    deliveryDate: parsedDate,
    note: (existingCustomer && existingCustomer.note) || "",
    status: "pending",
    createdAt: existingCustomer ? (existingCustomer.createdAt ?? Date.now()) : Date.now(),
    updatedAt: Date.now(),
  }).then(() => {
    newName.value = "";
    newDate.value = "";
    Swal.fire({ icon: "success", title: `เพิ่ม "${name}" แล้ว`, toast: true, position: "top-end", timer: 1500, showConfirmButton: false });
  });
}

function updateField(id, field, value) {
  update(dbRef(db, `delivery_customers/${id}`), {
    [field]: value ?? "",
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

function openPrintForCustomer(customer) {
  selectedCustomerForPrint.value = customer.id;
  showShippingLabels.value = true;
}

async function togglePrinted(customer) {
  const newStatus = !customer.labelPrinted;
  try {
    await update(dbRef(db, `delivery_customers/${customer.id}`), {
      labelPrinted: newStatus,
      labelPrintedAt: newStatus ? Date.now() : null,
    });
    Swal.fire({
      icon: "success",
      title: newStatus ? `ทำเครื่องหมาย "${customer.name}" พิมพ์แล้ว` : `ยกเลิกสถานะพิมพ์แล้วของ "${customer.name}"`,
      toast: true,
      position: "top-end",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to toggle labelPrinted:", err);
  }
}

// 💳 Payment Type Helpers (โอน / COD / ยังไม่ระบุ)
function getCustomerPaymentType(customer) {
  if (!customer) return "";
  if (customer.paymentType) {
    const pt = String(customer.paymentType).trim().toLowerCase();
    if (pt === "cod" || pt === "ปลายทาง" || pt === "เก็บเงินปลายทาง" || pt === "เก็บปลายทาง") {
      return "cod";
    }
    if (pt === "transfer" || pt === "โอน" || pt === "โอนเงิน") {
      return "transfer";
    }
  }

  const note = (customer.note || "").toLowerCase();
  const addr = (customer.address || "").toLowerCase();
  if (
    note.includes("cod") ||
    note.includes("ปลายทาง") ||
    note.includes("เก็บเงิน") ||
    addr.includes("cod") ||
    addr.includes("ปลายทาง")
  ) {
    return "cod";
  }

  return "";
}

function isCod(customer) {
  return getCustomerPaymentType(customer) === "cod";
}

function getPaymentTypeDisplay(customer) {
  const type = getCustomerPaymentType(customer);
  if (type === "cod") {
    const match = (customer?.note || "").match(/(?:cod|ปลายทาง)\s*[:=]?\s*(\d+)/i);
    if (match && match[1]) {
      return `COD (${match[1]}฿)`;
    }
    return "COD";
  }
  if (type === "transfer") {
    return "โอน";
  }
  return "ยังไม่ระบุ";
}

async function togglePaymentType(customer) {
  if (!customer) return;
  const current = getCustomerPaymentType(customer);
  const nextType = current === "cod" ? "transfer" : (current === "transfer" ? "cod" : "transfer");

  try {
    await update(dbRef(db, `delivery_customers/${customer.id}`), {
      paymentType: nextType,
      updatedAt: Date.now(),
    });
    Swal.fire({
      icon: "success",
      title: `เปลี่ยนรูปแบบส่งของ "${customer.name}" เป็น "${nextType === 'cod' ? 'COD' : (nextType === 'transfer' ? 'โอน' : 'ยังไม่ระบุ')}" แล้ว`,
      toast: true,
      position: "top-end",
      timer: 1200,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Failed to toggle paymentType:", err);
  }
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

/* ======== SHIPPING CYCLE ======== */
.sp-cycle-wrap {
  margin: 4px 14px 6px;
  padding: 6px 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.sp-cycle-info {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.sp-cycle-ico {
  font-size: 0.95em;
  flex-shrink: 0;
}

.sp-cycle-title {
  font-size: 0.75em;
  color: #818cf8;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}

.sp-cycle-badge {
  font-size: 0.72em;
  background: rgba(99, 102, 241, 0.2);
  border: 1px solid rgba(99, 102, 241, 0.35);
  color: #c7d2fe;
  padding: 1px 7px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.sp-cycle-select-wrap {
  flex-shrink: 0;
}

.sp-cycle-select {
  background: #181824;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #fff;
  padding: 3px 6px;
  font-family: inherit;
  font-size: 0.72em;
  outline: none;
  cursor: pointer;
}

.sp-cycle-select:focus {
  border-color: #6366f1;
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
  font-size: 1.35em;
  font-weight: 800;
  padding: 2px 0;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
  letter-spacing: 0.3px;
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

/* ======== HEADER ACTION BUTTONS ======== */
.sp-header-act-btn {
  padding: 4px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.72em;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}

.sp-header-act-btn.print {
  background: #3b82f6;
  color: #ffffff;
}

.sp-header-act-btn.print:hover {
  background: #2563eb;
}

.sp-header-act-btn.import {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #93c5fd;
}

.sp-header-act-btn.import:hover {
  background: rgba(59, 130, 246, 0.15);
  border-color: #3b82f6;
}

/* ======== ADDRESS INDICATOR IN CARD ======== */
.sp-row-addr {
  margin-top: 3px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sp-addr-mini-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85em;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1.4;
}

.sp-addr-mini-pill.has {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.sp-addr-mini-pill.has:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: #10b981;
}

.sp-addr-mini-pill.none {
  background: rgba(255, 255, 255, 0.04);
  color: #a1a1aa;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.sp-addr-mini-pill.none:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}

/* Payment Type Pill */
.sp-payment-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1.4;
}

.sp-payment-pill.transfer {
  background: rgba(59, 130, 246, 0.12);
  color: #60a5fa;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.sp-payment-pill.transfer:hover {
  background: rgba(59, 130, 246, 0.22);
  border-color: #3b82f6;
}

.sp-payment-pill.cod {
  background: rgba(245, 158, 11, 0.14);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.sp-payment-pill.cod:hover {
  background: rgba(245, 158, 11, 0.24);
  border-color: #f59e0b;
}

.sp-payment-pill.unspecified {
  background: rgba(148, 163, 184, 0.08);
  color: #94a3b8;
  border: 1px dashed rgba(148, 163, 184, 0.3);
}

.sp-payment-pill.unspecified:hover {
  background: rgba(148, 163, 184, 0.16);
  border-color: #cbd5e1;
  color: #f1f5f9;
}

/* Printed Status Pill */
.sp-printed-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
  line-height: 1.4;
}

.sp-printed-pill.printed {
  background: rgba(16, 185, 129, 0.14);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.sp-printed-pill.printed:hover {
  background: rgba(16, 185, 129, 0.24);
  border-color: #10b981;
}

.sp-printed-pill.unprinted {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
  border: 1px dashed rgba(245, 158, 11, 0.3);
}

.sp-printed-pill.unprinted:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
}

.sp-act--print {
  color: #60a5fa;
}

.sp-act--print.is-printed {
  color: #34d399;
}

/* 📚 Multi-Address Indicator Pill */
.sp-multi-addr-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.85em;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 14px;
  cursor: pointer;
  background: rgba(99, 102, 241, 0.16);
  color: #818cf8;
  border: 1px solid rgba(129, 140, 248, 0.45);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.15);
  transition: all 0.2s ease;
  user-select: none;
  line-height: 1.4;
  white-space: nowrap;
}

.sp-multi-addr-pill:hover {
  background: rgba(99, 102, 241, 0.28);
  border-color: #a5b4fc;
  color: #ffffff;
  box-shadow: 0 0 14px rgba(99, 102, 241, 0.35);
  transform: translateY(-1px);
}

.sp-multi-addr-pill .multi-count-num {
  font-weight: 800;
  color: #a5b4fc;
}

.sp-multi-addr-pill:hover .multi-count-num {
  color: #c7d2fe;
}

.sp-multi-addr-pill .multi-count-action {
  font-size: 0.88em;
  color: #e0e7ff;
  font-weight: 600;
  opacity: 0.95;
}

.multi-count {
  font-weight: 700;
  color: #60a5fa;
  margin-right: 2px;
}

/* ======== TABLET+ ======== */
@media (min-width: 600px) {
  .sp-toolbar, .sp-add-wrap, .sp-list-container { max-width: 500px; margin-left: auto; margin-right: auto; width: 100%; }
  .sp-list { max-width: 500px; margin: 0 auto; }
}
</style>

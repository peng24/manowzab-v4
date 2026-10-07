<template>
  <div class="ap-app">
    <!-- 🔒 High-Security Authentication Gate -->
    <AuthGate v-if="!authStore.isAuthenticated" />

    <template v-else>
      <!-- ============ STICKY HEADER ============ -->
      <header class="ap-header">
        <div class="ap-header-left">
          <a :href="baseUrl" class="ap-brand-link">
            <span class="ap-logo">🍋</span>
            <span class="ap-brand-name">MANOWZAB</span>
          </a>
          <span class="ap-nav-divider">/</span>
          <div class="ap-title-wrap">
            <h1 class="ap-title">
              <i class="fa-solid fa-address-book text-warning"></i> สมุดที่อยู่ลูกค้า
            </h1>
            <span class="ap-subtitle">Customer Address Book</span>
          </div>
        </div>

        <div class="ap-header-actions">
          <button class="ap-act-btn add" @click="openAddCustomer" title="เพิ่มข้อมูลลูกค้า / ที่อยู่ใหม่">
            <i class="fa-solid fa-user-plus"></i> เพิ่มลูกค้าใหม่
          </button>
          <button class="ap-act-btn import" @click="showImportModal = true" title="นำเข้าที่อยู่จาก Note / แชท">
            <i class="fa-solid fa-file-import"></i> นำเข้าจาก Note
          </button>
          <button class="ap-act-btn export" @click="exportCSV" title="ส่งออกเป็นไฟล์ Excel / CSV">
            <i class="fa-solid fa-file-excel"></i> ส่งออก CSV
          </button>

          <span class="ap-header-sep"></span>

          <a :href="baseUrl" class="ap-nav-link" title="กลับหน้าหลัก Command Center">
            <i class="fa-solid fa-desktop"></i> หน้าหลัก
          </a>
          <a :href="`${baseUrl}shipping/`" class="ap-nav-link" title="ไปหน้ารายการจัดส่ง">
            <i class="fa-solid fa-truck-fast"></i> จัดส่ง
          </a>
          <a :href="`${baseUrl}history/`" class="ap-nav-link" title="ไปหน้าประวัติการขาย">
            <i class="fa-solid fa-clock-rotate-left"></i> ประวัติ
          </a>

          <button class="ap-icon-btn refresh" @click="refreshData" title="รีเฟรชข้อมูล">
            <i class="fa-solid fa-arrows-rotate" :class="{ 'fa-spin': isRefreshing }"></i>
          </button>

          <button class="ap-icon-btn logout" @click="handleLogout" title="ออกจากระบบ">
            <i class="fa-solid fa-arrow-right-from-bracket"></i>
          </button>
        </div>
      </header>

      <!-- ============ STATS METRICS STRIP ============ -->
      <section class="ap-stats-strip">
        <div class="ap-stat-card">
          <div class="stat-icon-wrap all">
            <i class="fa-solid fa-users"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">ลูกค้าทั้งหมด</span>
            <span class="stat-val">{{ totalCustomersCount }}</span>
          </div>
        </div>

        <div class="ap-stat-card">
          <div class="stat-icon-wrap has-addr">
            <i class="fa-solid fa-location-dot"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">มีที่อยู่จัดส่งแล้ว</span>
            <span class="stat-val text-success">{{ withAddressCount }}</span>
          </div>
        </div>

        <div class="ap-stat-card">
          <div class="stat-icon-wrap no-addr">
            <i class="fa-solid fa-location-cross"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">ยังไม่มีที่อยู่</span>
            <span class="stat-val text-danger">{{ missingAddressCount }}</span>
          </div>
        </div>

        <div class="ap-stat-card">
          <div class="stat-icon-wrap multi-addr">
            <i class="fa-solid fa-house-chimney"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">มีหลายที่อยู่</span>
            <span class="stat-val text-primary">{{ multiAddressCount }}</span>
          </div>
        </div>

        <div class="ap-stat-card">
          <div class="stat-icon-wrap vip">
            <i class="fa-solid fa-crown"></i>
          </div>
          <div class="stat-info">
            <span class="stat-label">ลูกค้า VIP (มียอดซื้อ)</span>
            <span class="stat-val text-warning">{{ vipCount }}</span>
          </div>
        </div>
      </section>

      <!-- ============ TOOLBAR & FILTERS ============ -->
      <section class="ap-toolbar">
        <div class="ap-search-box">
          <i class="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            ref="searchInputRef"
            type="text"
            v-model="searchQuery"
            class="ap-search-input"
            placeholder="ค้นหาชื่อลูกค้า, ชื่อผู้รับ, เบอร์โทร, จังหวัด, รหัสไปรษณีย์... (กด / เพื่อค้นหา)"
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''" title="ล้างคำค้นหา">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Filter Chips -->
        <div class="ap-filter-chips">
          <button
            v-for="chip in filterChips"
            :key="chip.key"
            class="ap-filter-chip"
            :class="{ active: activeFilter === chip.key }"
            @click="activeFilter = chip.key"
          >
            {{ chip.label }}
            <span class="chip-count">{{ chip.count }}</span>
          </button>
        </div>

        <!-- Sort Select -->
        <div class="ap-sort-wrap">
          <label class="sort-label"><i class="fa-solid fa-arrow-down-short-wide"></i> เรียงตาม:</label>
          <select v-model="sortBy" class="ap-sort-select">
            <option value="updatedAt">🕒 อัปเดตล่าสุด</option>
            <option value="name">🔤 ชื่อ ก-ฮ</option>
            <option value="bookings">👑 ยอดซื้อสูงสุด</option>
            <option value="addresses">🏠 จำนวนที่อยู่</option>
          </select>
        </div>
      </section>

      <!-- ============ DESKTOP DATA TABLE ============ -->
      <main class="ap-table-wrapper">
        <table class="ap-table">
          <thead>
            <tr>
              <th class="th-num">#</th>
              <th class="th-cust">ลูกค้า</th>
              <th class="th-recipient">ผู้รับ & เบอร์โทร</th>
              <th class="th-address">ที่อยู่จัดส่ง</th>
              <th class="th-multi">หลายที่อยู่</th>
              <th class="th-status">การจัดส่ง & ช่องทาง</th>
              <th class="th-updated">อัปเดตเมื่อ</th>
              <th class="th-actions">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredCustomers.length === 0" class="tr-empty">
              <td colspan="8">
                <div class="empty-state">
                  <i class="fa-solid fa-users-slash empty-icon"></i>
                  <div class="empty-title">ไม่พบข้อมูลลูกค้า</div>
                  <div class="empty-sub">ลองปรับเงื่อนไขการค้นหา หรือเพิ่มลูกค้าใหม่</div>
                  <button class="btn btn-sm btn-primary" style="margin-top: 10px;" @click="openAddCustomer">
                    <i class="fa-solid fa-plus"></i> เพิ่มลูกค้าคนแรก
                  </button>
                </div>
              </td>
            </tr>

            <tr
              v-for="(cust, idx) in filteredCustomers"
              :key="cust.normKey || idx"
              class="ap-row"
              :class="{ 'has-missing-addr': !cust.hasAddress }"
            >
              <!-- 1. Index -->
              <td class="td-num">{{ idx + 1 }}</td>

              <!-- 2. Customer Name -->
              <td class="td-cust">
                <div class="cust-name-cell">
                  <div class="cust-avatar" :style="{ backgroundColor: getAvatarColor(cust.name) }">
                    {{ cust.name?.[0] || '?' }}
                  </div>
                  <div class="cust-name-info">
                    <span class="cust-main-name" @click="editCustomer(cust)" title="คลิกเพื่อแก้ไขข้อมูล">
                      {{ cust.name }}
                    </span>
                    <span v-if="cust.totalBookings > 0" class="badge-vip" title="ยอดซื้อสะสม">
                      ⭐ {{ cust.totalBookings }} ออเดอร์
                    </span>
                  </div>
                </div>
              </td>

              <!-- 3. Recipient & Phone -->
              <td class="td-recipient">
                <div class="recipient-cell">
                  <div class="recipient-name">
                    <i class="fa-solid fa-user-tag text-muted"></i>
                    <span>{{ cust.recipientName || cust.name || '-' }}</span>
                  </div>
                  <div class="recipient-phone" v-if="cust.phone">
                    <i class="fa-solid fa-phone text-muted"></i>
                    <span>{{ cust.phone }}</span>
                    <button class="mini-copy-btn" @click.stop="copyText(cust.phone, 'คัดลอกเบอร์โทรแล้ว!')" title="คัดลอกเบอร์โทร">
                      <i class="fa-regular fa-copy"></i>
                    </button>
                  </div>
                  <span v-else class="text-dim">-</span>
                </div>
              </td>

              <!-- 4. Address -->
              <td class="td-address">
                <div v-if="cust.hasAddress" class="address-cell">
                  <span class="address-text" :title="cust.address">{{ cust.address }}</span>
                  <button
                    class="mini-copy-btn addr-copy"
                    @click.stop="copyDeliverySlip(cust)"
                    title="คัดลอกข้อมูลจัดส่งทั้งหมด (ชื่อ, เบอร์, ที่อยู่)"
                  >
                    <i class="fa-regular fa-copy"></i> คัดลอก
                  </button>
                </div>
                <div v-else class="no-address-tag">
                  <i class="fa-solid fa-triangle-exclamation"></i> ยังไม่มีที่อยู่
                </div>
              </td>

              <!-- 5. Multi-Address Badge -->
              <td class="td-multi">
                <button
                  class="multi-addr-btn"
                  :class="{ active: cust.addressCount > 1 }"
                  @click="editCustomer(cust)"
                  :title="`มี ${cust.addressCount} ที่อยู่ — คลิกเพื่อดูหรือเลือกที่อยู่หลัก`"
                >
                  <i class="fa-solid fa-house"></i>
                  <span>{{ cust.addressCount }} ที่อยู่</span>
                </button>
              </td>

              <!-- 6. Payment & Channel -->
              <td class="td-status">
                <div class="status-cell">
                  <!-- Payment -->
                  <span v-if="cust.paymentType === 'transfer'" class="pill pay transfer" title="การจัดส่ง: โอนเงิน">
                    <i class="fa-solid fa-money-bill-transfer"></i> โอน
                  </span>
                  <span v-else-if="cust.paymentType === 'cod'" class="pill pay cod" title="การจัดส่ง: COD (เก็บเงินปลายทาง)">
                    <i class="fa-solid fa-box"></i> COD
                  </span>
                  <span v-else class="pill pay unset" title="ยังไม่ระบุรูปแบบจัดส่ง">
                    -
                  </span>

                  <!-- Channel -->
                  <span v-if="cust.contactChannel === 'line'" class="pill channel line" title="ช่องทางติดต่อ: Line">
                    <i class="fa-brands fa-line"></i> Line
                  </span>
                  <span v-else-if="cust.contactChannel === 'lineoa'" class="pill channel lineoa" title="ช่องทางติดต่อ: OA">
                    <i class="fa-solid fa-comment-dots"></i> OA
                  </span>
                  <span v-else-if="cust.contactChannel === 'phone'" class="pill channel phone" title="ช่องทางติดต่อ: โทรศัพท์">
                    <i class="fa-solid fa-phone"></i> โทร
                  </span>
                </div>
              </td>

              <!-- 7. Updated Time -->
              <td class="td-updated">
                <span class="time-text">{{ formatTimeAgo(cust.updatedAt) }}</span>
              </td>

              <!-- 8. Actions -->
              <td class="td-actions">
                <div class="act-btn-group">
                  <button class="row-act-btn edit" @click="editCustomer(cust)" title="แก้ไขข้อมูล">
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button class="row-act-btn copy" @click="copyDeliverySlip(cust)" title="คัดลอกข้อมูลส่งพัสดุ">
                    <i class="fa-solid fa-clipboard-list"></i>
                  </button>
                  <button class="row-act-btn delete" @click="confirmDeleteCustomer(cust)" title="ลบออกจากสมุดที่อยู่">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </main>

      <!-- ✏️ Modal แก้ไขข้อมูลลูกค้า (ชื่อเล่น, ที่อยู่, ช่องทางติดต่อ) -->
      <CustomerQuickEditModal ref="quickEditModalRef" />

      <!-- 📥 Modal นำเข้าที่อยู่จาก Note / แชท -->
      <AddressImportModal v-if="showImportModal" @close="showImportModal = false" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuthStore } from "../stores/auth";
import AuthGate from "../components/AuthGate.vue";
import CustomerQuickEditModal from "../components/CustomerQuickEditModal.vue";
import AddressImportModal from "../components/AddressImportModal.vue";
import { ref as dbRef, onValue, remove, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { normalizeName } from "../utils/addressParser";
import Swal from "sweetalert2";

const baseUrl = import.meta.env.BASE_URL || "/";
const authStore = useAuthStore();

// State
const addressBook = ref({});
const deliveryCustomers = ref({});
const isRefreshing = ref(false);
const searchQuery = ref("");
const activeFilter = ref("all");
const sortBy = ref("updatedAt");
const showImportModal = ref(false);
const searchInputRef = ref(null);
const quickEditModalRef = ref(null);
const cleanupFns = [];

// Load Firebase Real-time listeners
function initListeners() {
  const unsubBook = onValue(dbRef(db, "address_book"), (snap) => {
    addressBook.value = snap.val() || {};
  });
  cleanupFns.push(unsubBook);

  const unsubDeliv = onValue(dbRef(db, "delivery_customers"), (snap) => {
    deliveryCustomers.value = snap.val() || {};
  });
  cleanupFns.push(unsubDeliv);
}

// Aggregated Unified Customer List
const allCustomers = computed(() => {
  const map = new Map();

  // 1. Process central address_book entries
  Object.entries(addressBook.value || {}).forEach(([normKey, book]) => {
    if (!book) return;
    const name = book.name || normKey;
    const norm = normalizeName(name);

    const addresses = Array.isArray(book.addresses) ? book.addresses.filter(Boolean) : [];
    const activeAddr = addresses.find((a) => a.id === book.selectedAddressId) || addresses[0] || null;

    const fullAddr = activeAddr?.address || book.address || "";
    const recName = activeAddr?.recipientName || book.recipientName || name;
    const phone = activeAddr?.phone || book.phone || "";
    const postal = activeAddr?.postalCode || book.postalCode || "";
    const contact = activeAddr?.contactChannel || book.contactChannel || "";
    const payment = activeAddr?.paymentType || book.paymentType || "";

    map.set(norm, {
      normKey,
      addressBookKeys: [normKey],
      deliveryIds: [],
      name,
      recipientName: recName,
      phone,
      address: fullAddr,
      postalCode: postal,
      hasAddress: Boolean(fullAddr && fullAddr.trim()),
      addressCount: Math.max(addresses.length, fullAddr ? 1 : 0),
      contactChannel: contact,
      paymentType: payment,
      totalBookings: 0,
      updatedAt: book.updatedAt || 0,
      rawBook: book,
    });
  });

  // 2. Merge with delivery_customers (for lifetime purchases and missing customers)
  Object.entries(deliveryCustomers.value || {}).forEach(([id, cust]) => {
    if (!cust || !cust.name) return;
    const norm = normalizeName(cust.name);

    if (map.has(norm)) {
      const existing = map.get(norm);
      if (!existing.deliveryIds.includes(id)) {
        existing.deliveryIds.push(id);
      }
      if (cust.totalBookings && cust.totalBookings > existing.totalBookings) {
        existing.totalBookings = cust.totalBookings;
      }
      if (!existing.hasAddress && cust.address && cust.address.trim()) {
        existing.address = cust.address;
        existing.hasAddress = true;
        existing.recipientName = cust.recipientName || existing.recipientName;
        existing.phone = cust.phone || existing.phone;
        existing.postalCode = cust.postalCode || existing.postalCode;
        existing.addressCount = Math.max(existing.addressCount, 1);
      }
      if (!existing.contactChannel && cust.contactChannel) {
        existing.contactChannel = cust.contactChannel;
      }
      if (!existing.paymentType && cust.paymentType) {
        existing.paymentType = cust.paymentType;
      }
    } else {
      const addresses = Array.isArray(cust.addresses) ? cust.addresses.filter(Boolean) : [];
      const fullAddr = cust.address || "";
      map.set(norm, {
        normKey: norm.replace(/[.#$[\]/]/g, "_"),
        addressBookKeys: [],
        deliveryIds: [id],
        name: cust.name,
        recipientName: cust.recipientName || cust.name,
        phone: cust.phone || "",
        address: fullAddr,
        postalCode: cust.postalCode || "",
        hasAddress: Boolean(fullAddr && fullAddr.trim()),
        addressCount: Math.max(addresses.length, fullAddr ? 1 : 0),
        contactChannel: cust.contactChannel || "",
        paymentType: cust.paymentType || "",
        totalBookings: cust.totalBookings || 0,
        updatedAt: cust.updatedAt || 0,
        rawDeliv: cust,
      });
    }
  });

  return Array.from(map.values());
});

// Metrics
const totalCustomersCount = computed(() => allCustomers.value.length);
const withAddressCount = computed(() => allCustomers.value.filter((c) => c.hasAddress).length);
const missingAddressCount = computed(() => allCustomers.value.filter((c) => !c.hasAddress).length);
const multiAddressCount = computed(() => allCustomers.value.filter((c) => c.addressCount > 1).length);
const vipCount = computed(() => allCustomers.value.filter((c) => c.totalBookings > 0).length);

// Filter chips
const filterChips = computed(() => [
  { key: "all", label: "ทั้งหมด", count: totalCustomersCount.value },
  { key: "hasAddr", label: "📍 มีที่อยู่แล้ว", count: withAddressCount.value },
  { key: "missingAddr", label: "⚠️ ยังไม่มีที่อยู่", count: missingAddressCount.value },
  { key: "multiAddr", label: "🏠 มีหลายที่อยู่", count: multiAddressCount.value },
  { key: "transfer", label: "💳 โอนเงิน", count: allCustomers.value.filter((c) => c.paymentType === "transfer").length },
  { key: "cod", label: "💵 COD", count: allCustomers.value.filter((c) => c.paymentType === "cod").length },
  { key: "vip", label: "👑 ลูกค้า VIP", count: vipCount.value },
]);

// Filtered & Sorted Customers
const filteredCustomers = computed(() => {
  let list = allCustomers.value;

  // Filter Tab
  if (activeFilter.value === "hasAddr") {
    list = list.filter((c) => c.hasAddress);
  } else if (activeFilter.value === "missingAddr") {
    list = list.filter((c) => !c.hasAddress);
  } else if (activeFilter.value === "multiAddr") {
    list = list.filter((c) => c.addressCount > 1);
  } else if (activeFilter.value === "transfer") {
    list = list.filter((c) => c.paymentType === "transfer");
  } else if (activeFilter.value === "cod") {
    list = list.filter((c) => c.paymentType === "cod");
  } else if (activeFilter.value === "vip") {
    list = list.filter((c) => c.totalBookings > 0);
  }

  // Search
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.recipientName && c.recipientName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.postalCode && c.postalCode.includes(q))
    );
  }

  // Sort
  return [...list].sort((a, b) => {
    if (sortBy.value === "name") {
      return a.name.localeCompare(b.name, "th");
    }
    if (sortBy.value === "bookings") {
      return (b.totalBookings || 0) - (a.totalBookings || 0);
    }
    if (sortBy.value === "addresses") {
      return (b.addressCount || 0) - (a.addressCount || 0);
    }
    // Default updatedAt
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
});

// Avatar Colors Generator
function getAvatarColor(name) {
  if (!name) return "#3b82f6";
  const colors = [
    "#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Format relative date
function formatTimeAgo(timestamp) {
  if (!timestamp) return "-";
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชม. ที่แล้ว`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} วันที่แล้ว`;
  const date = new Date(timestamp);
  return date.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

// Copy Helper
async function copyText(text, successMsg = "คัดลอกสำเร็จ!") {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: successMsg,
      showConfirmButton: false,
      timer: 1800,
    });
  } catch (err) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: "ไม่สามารถคัดลอกได้",
      showConfirmButton: false,
      timer: 1800,
    });
  }
}

// Copy full courier formatted slip
function copyDeliverySlip(cust) {
  if (!cust.address) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "warning",
      title: "ลูกค้ารายนี้ยังไม่มีที่อยู่",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }
  const lines = [
    `ชื่อ: ${cust.recipientName || cust.name}`,
    `เบอร์โทร: ${cust.phone || '-'}`,
    `ที่อยู่: ${cust.address}`,
  ];
  if (cust.paymentType === 'cod') {
    lines.push(`(เก็บเงินปลายทาง COD)`);
  }
  copyText(lines.join('\n'), `📋 คัดลอกข้อมูลจัดส่งของ ${cust.name} แล้ว!`);
}

// Actions
function openAddCustomer() {
  if (quickEditModalRef.value) {
    quickEditModalRef.value.open({
      displayName: "",
      realName: "",
    });
  }
}

function editCustomer(cust) {
  if (quickEditModalRef.value) {
    quickEditModalRef.value.open({
      displayName: cust.name,
      realName: cust.name,
    });
  }
}

async function confirmDeleteCustomer(cust) {
  const res = await Swal.fire({
    title: `ลบที่อยู่ของ "${cust.name}"?`,
    text: "ข้อมูลลูกค้าและที่อยู่จะถูกลบออกจากสมุดที่อยู่",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบข้อมูล",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#334155",
  });

  if (res.isConfirmed) {
    try {
      const multiPathUpdates = {};
      const norm = normalizeName(cust.name);

      // 1. ลบจาก address_book (ทุก key ที่ตรงกับลูกค้ารายนี้)
      if (Array.isArray(cust.addressBookKeys) && cust.addressBookKeys.length > 0) {
        cust.addressBookKeys.forEach((key) => {
          multiPathUpdates[`address_book/${key}`] = null;
        });
      }
      if (cust.normKey) {
        multiPathUpdates[`address_book/${cust.normKey}`] = null;
      }
      if (norm) {
        multiPathUpdates[`address_book/${norm}`] = null;
        multiPathUpdates[`address_book/${norm.replace(/[.#$[\]/]/g, "_")}`] = null;
      }
      Object.entries(addressBook.value || {}).forEach(([k, b]) => {
        if (b && (normalizeName(b.name || "") === norm || normalizeName(k) === norm)) {
          multiPathUpdates[`address_book/${k}`] = null;
        }
      });

      // 2. ลบจาก delivery_customers (ทุก id ที่ตรงกับลูกค้ารายนี้)
      if (Array.isArray(cust.deliveryIds) && cust.deliveryIds.length > 0) {
        cust.deliveryIds.forEach((id) => {
          multiPathUpdates[`delivery_customers/${id}`] = null;
        });
      }
      Object.entries(deliveryCustomers.value || {}).forEach(([id, c]) => {
        if (c && (normalizeName(c.name || "") === norm || normalizeName(id) === norm)) {
          multiPathUpdates[`delivery_customers/${id}`] = null;
        }
      });

      // 3. ดำเนินการลบแบบ Atomic Multi-Path Update พร้อมกันทั้งหมด
      await update(dbRef(db), multiPathUpdates);

      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: `ลบที่อยู่ของ "${cust.name}" สำเร็จ`,
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาดในการลบ",
        text: err.message,
      });
    }
  }
}

// Export CSV with UTF-8 BOM for Thai Excel
function exportCSV() {
  const list = filteredCustomers.value;
  if (list.length === 0) {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "info",
      title: "ไม่มีข้อมูลสำหรับส่งออก",
      showConfirmButton: false,
      timer: 2000,
    });
    return;
  }

  const headers = ["ลำดับ", "ชื่อลูกค้า", "ชื่อผู้รับ", "เบอร์โทร", "ที่อยู่", "รหัสไปรษณีย์", "รูปแบบจัดส่ง", "ช่องทางติดต่อ", "ยอดซื้อสะสม", "จำนวนที่อยู่"];
  const rows = list.map((c, i) => [
    i + 1,
    `"${(c.name || '').replace(/"/g, '""')}"`,
    `"${(c.recipientName || '').replace(/"/g, '""')}"`,
    `"${c.phone || ''}"`,
    `"${(c.address || '').replace(/"/g, '""')}"`,
    `"${c.postalCode || ''}"`,
    `"${c.paymentType === 'cod' ? 'COD' : c.paymentType === 'transfer' ? 'โอนเงิน' : ''}"`,
    `"${c.contactChannel || ''}"`,
    c.totalBookings || 0,
    c.addressCount || 1,
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const todayStr = new Date().toISOString().slice(0, 10);
  a.download = `manowzab_address_book_${todayStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: `📥 ส่งออก CSV ${list.length} รายการสำเร็จ`,
    showConfirmButton: false,
    timer: 2000,
  });
}

function refreshData() {
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "รีเฟรชข้อมูลล่าสุดแล้ว",
      showConfirmButton: false,
      timer: 1500,
    });
  }, 400);
}

// Global Keyboard Shortcut: '/' to focus search
function handleKeydown(e) {
  if (e.key === "/" && document.activeElement !== searchInputRef.value) {
    e.preventDefault();
    searchInputRef.value?.focus();
  } else if (e.key === "Escape" && document.activeElement === searchInputRef.value) {
    searchQuery.value = "";
    searchInputRef.value?.blur();
  }
}

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
  }
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    initListeners();
  }
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  cleanupFns.forEach((fn) => {
    if (typeof fn === "function") fn();
  });
  cleanupFns.length = 0;
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style>
@import "../assets/style.css";

html, body, #address-app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #0b0f19;
  font-family: var(--font-main, 'Kanit', sans-serif);
  color: #f8fafc;
}

.ap-app {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* ============ STICKY HEADER ============ */
.ap-header {
  height: 60px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 20;
}

.ap-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ap-brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}

.ap-logo {
  font-size: 1.5em;
}

.ap-brand-name {
  font-size: 1.15em;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.ap-nav-divider {
  color: #475569;
  font-size: 1.1em;
}

.ap-title-wrap {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ap-title {
  margin: 0;
  font-size: 1.15em;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ap-subtitle {
  font-size: 0.78em;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.ap-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ap-act-btn {
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.84em;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.ap-act-btn.add {
  background: #10b981;
  color: #fff;
}
.ap-act-btn.add:hover {
  background: #059669;
  transform: translateY(-1px);
}

.ap-act-btn.import {
  background: rgba(59, 130, 246, 0.15);
  border-color: rgba(59, 130, 246, 0.4);
  color: #60a5fa;
}
.ap-act-btn.import:hover {
  background: rgba(59, 130, 246, 0.25);
  color: #fff;
}

.ap-act-btn.export {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #34d399;
}
.ap-act-btn.export:hover {
  background: rgba(16, 185, 129, 0.25);
  color: #fff;
}

.ap-header-sep {
  width: 1px;
  height: 24px;
  background: #334155;
  margin: 0 4px;
}

.ap-nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.84em;
  color: #cbd5e1;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.ap-nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.ap-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.ap-icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.ap-icon-btn.logout:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.4);
}

/* ============ STATS METRICS STRIP ============ */
.ap-stats-strip {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  padding: 12px 20px;
  background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}

.ap-stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
}

.stat-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
}

.stat-icon-wrap.all { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
.stat-icon-wrap.has-addr { background: rgba(16, 185, 129, 0.15); color: #34d399; }
.stat-icon-wrap.no-addr { background: rgba(239, 68, 68, 0.15); color: #f87171; }
.stat-icon-wrap.multi-addr { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
.stat-icon-wrap.vip { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.76em;
  color: #94a3b8;
}

.stat-val {
  font-size: 1.25em;
  font-weight: 700;
  line-height: 1.2;
}

/* ============ TOOLBAR ============ */
.ap-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 20px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.ap-search-box {
  position: relative;
  flex: 1;
  min-width: 280px;
  max-width: 480px;
  display: flex;
  align-items: center;
}

.ap-search-box .search-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  font-size: 0.9em;
}

.ap-search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f8fafc;
  font-size: 0.88em;
  font-family: inherit;
  transition: border-color 0.2s ease;
}

.ap-search-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
}

.ap-filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.ap-filter-chip {
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.82em;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.ap-filter-chip:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}

.ap-filter-chip.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.5);
  color: #60a5fa;
  font-weight: 600;
}

.chip-count {
  font-size: 0.82em;
  padding: 1px 5px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}

.ap-sort-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 0.82em;
  color: #94a3b8;
  white-space: nowrap;
}

.ap-sort-select {
  padding: 6px 10px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #f8fafc;
  font-size: 0.82em;
  font-family: inherit;
  cursor: pointer;
}

/* ============ TABLE WORKSPACE ============ */
.ap-table-wrapper {
  flex: 1;
  overflow: auto;
  padding: 0 20px 20px 20px;
  background: #0b0f19;
}

.ap-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.88em;
}

.ap-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #0f172a;
}

.ap-table th {
  padding: 12px 14px;
  text-align: left;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 2px solid #1e293b;
  white-space: nowrap;
}

.th-num { width: 50px; text-align: center; }
.th-cust { width: 180px; }
.th-recipient { width: 180px; }
.th-address { min-width: 280px; }
.th-multi { width: 110px; text-align: center; }
.th-status { width: 140px; }
.th-updated { width: 110px; }
.th-actions { width: 120px; text-align: center; }

.ap-table tbody tr {
  background: rgba(15, 23, 42, 0.6);
  transition: background 0.15s ease;
}

.ap-table tbody tr:hover {
  background: rgba(30, 41, 59, 0.7);
}

.ap-table td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.td-num {
  text-align: center;
  color: #64748b;
  font-weight: 600;
  font-size: 0.84em;
}

/* Cust Cell */
.cust-name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cust-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #000;
  font-size: 0.9em;
  flex-shrink: 0;
}

.cust-name-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.cust-main-name {
  font-weight: 700;
  color: #f1f5f9;
  cursor: pointer;
  transition: color 0.15s;
}

.cust-main-name:hover {
  color: #38bdf8;
  text-decoration: underline;
}

.badge-vip {
  font-size: 0.7em;
  font-weight: 700;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 1px 5px;
  border-radius: 4px;
  width: fit-content;
  margin-top: 2px;
}

/* Recipient Cell */
.recipient-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.9em;
}

.recipient-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #e2e8f0;
}

.recipient-phone {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #94a3b8;
  font-family: monospace;
  font-size: 0.95em;
}

.mini-copy-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
  transition: color 0.15s;
}

.mini-copy-btn:hover {
  color: #38bdf8;
}

/* Address Cell */
.address-cell {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.address-text {
  color: #cbd5e1;
  font-family: "Sarabun", sans-serif;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.addr-copy {
  flex-shrink: 0;
  padding: 3px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 0.78em;
  color: #94a3b8;
  white-space: nowrap;
}

.addr-copy:hover {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.4);
}

.no-address-tag {
  color: #f87171;
  font-size: 0.82em;
  background: rgba(239, 68, 68, 0.1);
  border: 1px dashed rgba(239, 68, 68, 0.3);
  padding: 4px 8px;
  border-radius: 6px;
  width: fit-content;
}

/* Multi-Address Button */
.td-multi {
  text-align: center;
}

.multi-addr-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.8em;
  color: #94a3b8;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.multi-addr-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.multi-addr-btn.active {
  background: rgba(168, 85, 247, 0.18);
  border-color: rgba(168, 85, 247, 0.45);
  color: #c084fc;
  font-weight: 600;
}

/* Status Cell */
.status-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76em;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.pill.pay.transfer { background: rgba(147, 51, 234, 0.2); color: #c084fc; border: 1px solid rgba(147, 51, 234, 0.45); }
.pill.pay.cod { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
.pill.pay.unset { color: #64748b; }

.pill.channel.line { background: rgba(6, 199, 85, 0.18); color: #22c55e; border: 1px solid rgba(6, 199, 85, 0.35); }
.pill.channel.lineoa { background: rgba(6, 199, 85, 0.22); color: #4ade80; border: 1px solid rgba(6, 199, 85, 0.45); }
.pill.channel.phone { background: rgba(2, 132, 199, 0.18); color: #38bdf8; border: 1px solid rgba(2, 132, 199, 0.35); }

/* Time */
.time-text {
  font-size: 0.8em;
  color: #64748b;
  white-space: nowrap;
}

/* Actions */
.act-btn-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.row-act-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.82em;
  transition: all 0.15s ease;
}

.row-act-btn:hover {
  transform: translateY(-1px);
}

.row-act-btn.edit:hover { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(59, 130, 246, 0.4); }
.row-act-btn.copy:hover { background: rgba(16, 185, 129, 0.2); color: #34d399; border-color: rgba(16, 185, 129, 0.4); }
.row-act-btn.delete:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(239, 68, 68, 0.4); }

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 3em;
  margin-bottom: 12px;
  color: #334155;
}

.empty-title {
  font-size: 1.1em;
  font-weight: 600;
  color: #94a3b8;
}

.empty-sub {
  font-size: 0.85em;
  margin-top: 4px;
}
</style>

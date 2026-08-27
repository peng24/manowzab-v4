<template>
  <div class="slm-overlay" @click.self="$emit('close')">
    <div class="slm-modal">
      <!-- Non-printable Header & Toolbar -->
      <div class="slm-header no-print">
        <div class="slm-title">
          <span>🏷️ ใบปะหน้าพัสดุ 130x76 mm (แนวนอน)</span>
          <span class="slm-count-badge">{{ printableCustomers.length }} รายการ</span>
        </div>
        <button class="slm-close-btn" @click="$emit('close')" title="ปิด">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Non-printable Controls -->
      <div class="slm-controls no-print">
        <!-- Quick Filters -->
        <div class="slm-filter-group">
          <button
            class="slm-filter-btn"
            :class="{ active: filterType === 'unprinted' }"
            @click="setFilter('unprinted')"
          >
            ⏳ ยังไม่พิมพ์ ({{ unprintedCount }})
          </button>
          <button
            class="slm-filter-btn"
            :class="{ active: filterType === 'today' }"
            @click="setFilter('today')"
          >
            🚨 ส่งวันนี้ ({{ todayCount }})
          </button>
          <button
            class="slm-filter-btn"
            :class="{ active: filterType === 'pack-tonight' }"
            @click="setFilter('pack-tonight')"
          >
            📦 แพ็คคืนนี้ ({{ packTonightCount }})
          </button>
          <button
            class="slm-filter-btn"
            :class="{ active: filterType === 'all-requested' }"
            @click="setFilter('all-requested')"
          >
            🌐 ทั้งหมดที่รอส่ง ({{ allRequestedCount }})
          </button>
        </div>

        <!-- 👥 Customer Selector Bar & Chips (เลือกรายบุคคล) -->
        <div class="slm-customer-selector">
          <div class="slm-selector-header">
            <div class="slm-search-box">
              <i class="fa-solid fa-magnifying-glass slm-search-icon"></i>
              <input
                type="text"
                v-model="searchQuery"
                class="slm-search-input"
                placeholder="🔍 ค้นหาชื่อลูกค้า / ผู้รับ (เช่น หนิง, ปิยะวาท)..."
              />
              <button v-if="searchQuery" class="slm-clear-search" @click="searchQuery = ''">✕</button>
            </div>
            <div class="slm-quick-select-btns">
              <button class="slm-mini-btn" @click="selectedIds = currentPool.map(c => c.id)">
                <i class="fa-solid fa-check-double"></i> เลือกทั้งหมด
              </button>
              <button class="slm-mini-btn" @click="selectedIds = []">
                <i class="fa-solid fa-xmark"></i> ยกเลิกทั้งหมด
              </button>
              <button class="slm-mini-btn highlight" @click="selectedIds = currentPool.filter(c => !c.labelPrinted).map(c => c.id)">
                <i class="fa-solid fa-filter"></i> เฉพาะที่ยังไม่พิมพ์
              </button>
            </div>
          </div>

          <div class="slm-chips-scroll">
            <div
              v-for="c in currentPool"
              :key="c.id"
              class="slm-cust-chip"
              :class="{
                'selected': selectedIds.includes(c.id),
                'printed': c.labelPrinted,
                'no-address': !getCustomerAddress(c)
              }"
              @click="toggleCustomerSelection(c.id)"
              :title="`คลิกเพื่อ ${selectedIds.includes(c.id) ? 'ยกเลิก' : 'เลือก'} ${c.name}`"
            >
              <span class="chip-checkbox">
                <i class="fa-solid" :class="selectedIds.includes(c.id) ? 'fa-square-check' : 'fa-square'"></i>
              </span>
              <span class="chip-name">{{ c.name }}</span>
              <span class="chip-items" v-if="c.itemCount">({{ c.itemCount }} ชิ้น)</span>
              <span
                class="chip-status-tag"
                :class="c.labelPrinted ? 'is-printed' : 'is-unprinted'"
                @click.stop="toggleCustomerPrinted(c)"
                :title="c.labelPrinted ? 'พิมพ์แล้ว (คลิกเพื่อเปลี่ยนเป็นยังไม่พิมพ์)' : 'ยังไม่พิมพ์ (คลิกเพื่อเปลี่ยนเป็นพิมพ์แล้ว)'"
              >
                <i :class="c.labelPrinted ? 'fa-solid fa-circle-check' : 'fa-solid fa-print'"></i>
                {{ c.labelPrinted ? 'พิมพ์แล้ว' : 'ยังไม่พิมพ์' }}
              </span>
              <span v-if="!getCustomerAddress(c)" class="chip-warn-tag" title="ยังไม่มีที่อยู่">
                ⚠️ รอที่อยู่
              </span>
            </div>
            <div v-if="currentPool.length === 0" class="slm-no-chips">
              ไม่พบรายชื่อในหมวดนี้
            </div>
          </div>
        </div>

        <div class="slm-options-row">
          <!-- Orientation Selector -->
          <div class="slm-select-wrap">
            <label><i class="fa-solid fa-rotate"></i> ทิศทาง:</label>
            <div class="slm-orient-tabs">
              <button
                class="slm-orient-btn"
                :class="{ active: orientation === 'landscape' }"
                @click="orientation = 'landscape'"
              >
                🔄 แนวนอน (130x76mm)
              </button>
              <button
                class="slm-orient-btn"
                :class="{ active: orientation === 'portrait' }"
                @click="orientation = 'portrait'"
              >
                ↕️ แนวตั้ง (76x130mm)
              </button>
            </div>
          </div>

          <!-- Paper Size Selection -->
          <div class="slm-select-wrap">
            <label><i class="fa-solid fa-scroll"></i> ขนาดฉลาก:</label>
            <select v-model="paperSize" class="slm-select">
              <option value="thermal-76x130">สติ๊กเกอร์ 76 x 130 mm (มาตรฐานของคุณ)</option>
              <option value="thermal-100x150">สติ๊กเกอร์ 100 x 150 mm (4x6")</option>
              <option value="thermal-80x100">สติ๊กเกอร์ 80 x 100 mm</option>
              <option value="a4-grid">กระดาษ A4 (สติ๊กเกอร์ 2 คอลัมน์)</option>
            </select>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <!-- Export to Excel Button for Printer App -->
            <button class="slm-export-excel-btn" @click="exportExcelForApp" title="ส่งออกไฟล์เพื่อนำเข้าไปเปิดในแอปเครื่องพิมพ์">
              <i class="fa-solid fa-file-excel"></i> ส่งออก Excel เข้าแอปปริ้นเตอร์
            </button>

            <!-- Sender Settings Toggle -->
            <button class="slm-toggle-sender-btn" @click="showSenderConfig = !showSenderConfig">
              <i class="fa-solid fa-store"></i> {{ showSenderConfig ? 'ซ่อนข้อมูลร้าน' : 'แก้ไขข้อมูลร้านผู้ส่ง' }}
            </button>
          </div>
        </div>

        <!-- Sender Config Drawer -->
        <div v-if="showSenderConfig" class="slm-sender-box">
          <div class="slm-sender-title">🏠 ข้อมูลผู้ส่งและข้อความขอบคุณ (บันทึกจำไว้ในเครื่องอัตโนมัติ)</div>
          <div class="slm-sender-grid">
            <input type="text" v-model="sender.name" class="slm-input" placeholder="ชื่อร้าน (เช่น มะนาวแซ่บ)" />
            <input type="text" v-model="sender.phone" class="slm-input" placeholder="เบอร์โทรผู้ส่ง" />
            <input type="text" v-model="sender.address" class="slm-input slm-col-span" placeholder="ที่อยู่ผู้ส่ง (บ้านเลขที่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์)" />
            <input type="text" v-model="sender.thankYouText" class="slm-input slm-col-span" placeholder="ข้อความขอบคุณท้ายใบปะหน้า (เช่น 🙏 ขอบคุณที่อุดหนุนนะคะ ❤️)" />
          </div>
        </div>

        <!-- Select All Bar -->
        <div class="slm-select-bar">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <label class="slm-check-all">
              <input
                type="checkbox"
                :checked="isAllSelected"
                @change="toggleSelectAll($event.target.checked)"
              />
              <span>เลือก {{ selectedIds.length }} จาก {{ currentPool.length }} คน</span>
            </label>
            <span class="slm-addr-counter" v-if="printableCustomers.length > 0">
              <span class="cnt-item has"><i class="fa-solid fa-circle-check"></i> มีที่อยู่ {{ hasAddressCount }}</span>
              <span class="cnt-item missing" v-if="missingAddressCount > 0"><i class="fa-solid fa-circle-exclamation"></i> รอที่อยู่ {{ missingAddressCount }}</span>
            </span>
          </div>

          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary slm-print-btn" @click="handlePrint" :disabled="printableCustomers.length === 0">
              <i class="fa-solid fa-print"></i> สั่งพิมพ์ใบปะหน้า ({{ printableCustomers.length }} ใบ)
            </button>
          </div>
        </div>
      </div>

      <!-- Preview & Printable Area -->
      <div class="slm-preview-area" :class="['paper-' + paperSize, 'mode-' + orientation]">
        <div v-if="printableCustomers.length === 0" class="slm-empty-state no-print">
          <i class="fa-solid fa-box-open slm-empty-icon"></i>
          <div>ไม่มีรายการที่เลือกพิมพ์ (กรุณาคลิกเลือกรายชื่อลูกค้าด้านบน)</div>
        </div>

        <!-- Labels Loop (Landscape Mode by Default) -->
        <div
          v-for="customer in printableCustomers"
          :key="customer.id"
          class="shipping-label-card"
          :class="['label-' + paperSize, orientation === 'landscape' ? 'layout-landscape' : 'layout-portrait']"
        >
          <!-- LANDSCAPE: 2-Column Split Layout -->
          <div class="label-main-grid" v-if="orientation === 'landscape'">
            <!-- Left Column: Sender (FROM) -->
            <div class="ls-sender-col">
              <div class="ls-sender-name">{{ sender.name || 'มะนาวแซ่บ' }}</div>
              <div class="ls-sender-addr" style="white-space: pre-line;">
                {{ sender.address || '191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000' }}
              </div>
              <div class="ls-sender-phone">โทร. {{ sender.phone || '095-155-5706' }}</div>
            </div>

            <!-- Right Column: Receiver (TO) - Shifted down towards bottom with 10% bottom margin -->
            <div class="ls-receiver-col">
              <div class="ls-receiver-name">{{ getRecipientDisplayName(customer) }}</div>
              <div class="ls-receiver-addr">
                {{ getCustomerCleanAddress(customer) || '⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)' }}
              </div>
              <div class="ls-receiver-zip" v-if="getCustomerZip(customer)">
                <span class="zip-big">{{ getCustomerZip(customer) }}</span>
              </div>
              <div class="ls-receiver-phone">
                โทร {{ getCustomerPhone(customer) || '-' }}
              </div>
            </div>
          </div>

          <!-- PORTRAIT: Stacked Layout -->
          <div class="label-portrait-body" v-else>
            <div class="label-sender-block">
              <div class="sender-body">
                <div class="sender-name-line">{{ sender.name || 'มะนาวแซ่บ' }}</div>
                <div class="sender-addr-line" style="white-space: pre-line;">
                  {{ sender.address || '191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000' }}
                </div>
                <div class="sender-phone-line">โทร. {{ sender.phone || '095-155-5706' }}</div>
              </div>
            </div>

            <div class="label-receiver-block">
              <div class="receiver-body">
                <div class="receiver-name">{{ getRecipientDisplayName(customer) }}</div>
                <div class="receiver-address">
                  {{ getCustomerCleanAddress(customer) || '⚠️ ยังไม่มีที่อยู่จัดส่ง (กรุณานำเข้าจาก Note หรือพิมพ์เพิ่ม)' }}
                </div>
                <div class="receiver-zipcode" v-if="getCustomerZip(customer)">
                  <span class="zip-num">{{ getCustomerZip(customer) }}</span>
                </div>
                <div class="receiver-phone">
                  โทร {{ getCustomerPhone(customer) || '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Thank You Message -->
          <div class="label-thankyou-footer">
            {{ sender.thankYouText || '🙏 ขอบคุณที่อุดหนุนนะคะ ❤️' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { ref as dbRef, update } from "firebase/database";
import { db } from "../composables/useFirebase";
import { normalizeName } from "../utils/addressParser";
import Swal from "sweetalert2";

const props = defineProps({
  customers: {
    type: Array,
    default: () => [],
  },
  addressBook: {
    type: Object,
    default: () => ({}),
  },
  initialSelectedId: {
    type: String,
    default: null,
  },
});

defineEmits(["close"]);

const filterType = ref("unprinted"); // 'unprinted' | 'today' | 'pack-tonight' | 'all-requested'
const orientation = ref("landscape"); // 'landscape' (แนวนอน 130x76mm) | 'portrait' (แนวตั้ง 76x130mm)
const paperSize = ref("thermal-76x130"); // Default 76x130mm
const showSenderConfig = ref(false);
const selectedIds = ref([]);
const searchQuery = ref("");

// Sender State with LocalStorage memory (Defaults from user screenshot)
const sender = ref({
  name: localStorage.getItem("manowzab_sender_name") || "มะนาวแซ่บ",
  phone: localStorage.getItem("manowzab_sender_phone") || "095-155-5706",
  address: localStorage.getItem("manowzab_sender_address") || "191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000",
  thankYouText: localStorage.getItem("manowzab_sender_thankyou") || "🙏 ขอบคุณที่อุดหนุนนะคะ ❤️",
});

watch(
  sender,
  (val) => {
    localStorage.setItem("manowzab_sender_name", val.name || "");
    localStorage.setItem("manowzab_sender_phone", val.phone || "");
    localStorage.setItem("manowzab_sender_address", val.address || "");
    localStorage.setItem("manowzab_sender_thankyou", val.thankYouText || "");
  },
  { deep: true }
);

// Helper for countdown
function getDiffDays(deliveryDate) {
  if (!deliveryDate) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deliveryDate);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

const activeRequested = computed(() => {
  if (props.initialSelectedId) {
    const target = props.customers.find((c) => c.id === props.initialSelectedId);
    const others = props.customers.filter(
      (c) => c.id !== props.initialSelectedId && c.status !== "done" && c.deliveryDate && c.deliveryDate.trim() !== ""
    );
    return target ? [target, ...others] : others;
  }
  return props.customers.filter(
    (c) => c.status !== "done" && c.deliveryDate && c.deliveryDate.trim() !== ""
  );
});

const unprintedCount = computed(() => {
  return activeRequested.value.filter((c) => !c.labelPrinted).length;
});

const todayCount = computed(() => {
  return activeRequested.value.filter((c) => getDiffDays(c.deliveryDate) === 0).length;
});

const packTonightCount = computed(() => {
  return activeRequested.value.filter((c) => getDiffDays(c.deliveryDate) === 1).length;
});

const allRequestedCount = computed(() => {
  return activeRequested.value.length;
});

const currentPool = computed(() => {
  let list = activeRequested.value;
  if (filterType.value === "unprinted") {
    list = activeRequested.value.filter((c) => !c.labelPrinted);
  } else if (filterType.value === "today") {
    list = activeRequested.value.filter((c) => getDiffDays(c.deliveryDate) === 0);
  } else if (filterType.value === "pack-tonight") {
    list = activeRequested.value.filter((c) => getDiffDays(c.deliveryDate) === 1);
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const rec = (c.recipientName || "").toLowerCase();
      const addr = (getCustomerAddress(c) || "").toLowerCase();
      return name.includes(q) || rec.includes(q) || addr.includes(q);
    });
  }

  return list;
});

const printableCustomers = computed(() => {
  return currentPool.value.filter((c) => selectedIds.value.includes(c.id));
});

const hasAddressCount = computed(() => {
  return printableCustomers.value.filter((c) => !!getCustomerAddress(c)).length;
});

const missingAddressCount = computed(() => {
  return printableCustomers.value.length - hasAddressCount.value;
});

const isAllSelected = computed(() => {
  return currentPool.value.length > 0 && selectedIds.value.length === currentPool.value.length;
});

watch(
  () => props.initialSelectedId,
  (newId) => {
    if (newId) {
      filterType.value = "all-requested";
      selectedIds.value = [newId];
      searchQuery.value = "";
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.initialSelectedId) {
    filterType.value = "all-requested";
    selectedIds.value = [props.initialSelectedId];
    searchQuery.value = "";
  } else {
    // Default to unprinted if available, otherwise today or all-requested
    if (unprintedCount.value > 0) {
      filterType.value = "unprinted";
    } else if (todayCount.value > 0) {
      filterType.value = "today";
    } else {
      filterType.value = "all-requested";
    }
    selectedIds.value = currentPool.value.map((c) => c.id);
  }
});

function setFilter(type) {
  filterType.value = type;
  selectedIds.value = currentPool.value.map((c) => c.id);
}

function toggleSelectAll(checked) {
  if (checked) {
    selectedIds.value = currentPool.value.map((c) => c.id);
  } else {
    selectedIds.value = [];
  }
}

function toggleCustomerSelection(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx > -1) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

async function toggleCustomerPrinted(c) {
  const newStatus = !c.labelPrinted;
  try {
    await update(dbRef(db, `delivery_customers/${c.id}`), {
      labelPrinted: newStatus,
      labelPrintedAt: newStatus ? Date.now() : null,
    });
    Swal.fire({
      icon: "success",
      title: newStatus ? `ทำเครื่องหมาย "${c.name}" พิมพ์แล้ว` : `ยกเลิกสถานะพิมพ์แล้วของ "${c.name}"`,
      toast: true,
      position: "top-end",
      timer: 1500,
      showConfirmButton: false,
    });
  } catch (err) {
    console.error("Error updating printed status:", err);
  }
}

function getCustomerAddressData(customer) {
  if (customer.address) {
    return {
      recipientName: customer.recipientName || "",
      phone: customer.phone || "",
      address: customer.address || "",
      postalCode: customer.postalCode || "",
    };
  }

  // Lookup in Address Book
  const norm = normalizeName(customer.name).replace(/[.#$[\]/]/g, "_");
  if (props.addressBook && props.addressBook[norm]) {
    return props.addressBook[norm];
  }

  return { recipientName: "", phone: "", address: "", postalCode: "" };
}

function getRecipientDisplayName(customer) {
  if (customer.recipientName && customer.recipientName.trim()) {
    return customer.recipientName.trim();
  }
  const data = getCustomerAddressData(customer);
  if (data && data.recipientName && data.recipientName.trim()) {
    return data.recipientName.trim();
  }
  return customer.name;
}

function getCustomerPhone(customer) {
  return getCustomerAddressData(customer).phone;
}

function getCustomerAddress(customer) {
  return getCustomerAddressData(customer).address;
}

function getCustomerZip(customer) {
  const data = getCustomerAddressData(customer);
  if (data.postalCode) return data.postalCode;
  const match = (data.address || "").match(/\b[1-9]\d{4}\b(?!\/|\d)/);
  return match ? match[0] : "";
}

function getCustomerCleanAddress(customer) {
  const addr = getCustomerAddress(customer) || "";
  const zip = getCustomerZip(customer);
  if (!zip) return addr;
  // Remove duplicate zip code from the address string
  return addr.replace(new RegExp(`\\b${zip}\\b(?![/\\d])`, "g"), "").replace(/\s+/g, " ").trim();
}

function handlePrint() {
  if (printableCustomers.value.length === 0) return;

  // Remove any previous print iframe
  const oldIframe = document.getElementById("manowzab-label-print-frame");
  if (oldIframe) {
    oldIframe.remove();
  }

  const iframe = document.createElement("iframe");
  iframe.id = "manowzab-label-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const isLandscape = orientation.value === "landscape";
  const pageWidth = isLandscape ? "130mm" : "76mm";
  const pageHeight = isLandscape ? "76mm" : "130mm";
  const senderName = sender.value.name || "มะนาวแซ่บ";
  const senderPhone = sender.value.phone || "095-155-5706";
  const senderAddress = (sender.value.address || "191 หมู่3 ต.ขามใหญ่ อ.เมือง จ.อุบลราชธานี 34000").replace(/\n/g, "<br>");
  const thankYou = sender.value.thankYouText || "🙏 ขอบคุณที่อุดหนุนนะคะ ❤️";

  const cardsHtml = printableCustomers.value
    .map((customer, idx) => {
      const recipient = getRecipientDisplayName(customer);
      const address = getCustomerCleanAddress(customer) || "⚠️ ยังไม่มีที่อยู่จัดส่ง";
      const zip = getCustomerZip(customer);
      const phone = getCustomerPhone(customer) || "-";

      if (isLandscape) {
        return `
          <div class="print-page">
            <div class="print-card landscape">
              <div class="card-grid">
                <!-- Left: Sender -->
                <div class="ls-sender">
                  <div class="sender-name">${senderName}</div>
                  <div class="sender-addr">${senderAddress}</div>
                  <div class="sender-phone">โทร. ${senderPhone}</div>
                </div>

                <!-- Right: Receiver -->
                <div class="ls-receiver">
                  <div class="receiver-name">${recipient}</div>
                  <div class="receiver-addr">${address}</div>
                  ${zip ? `<div class="receiver-zip">${zip}</div>` : ""}
                  <div class="receiver-phone">โทร ${phone}</div>
                </div>
              </div>

              <!-- Thank you footer -->
              <div class="card-footer">${thankYou}</div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="print-page">
            <div class="print-card portrait">
              <div class="port-sender">
                <div class="sender-name">${senderName}</div>
                <div class="sender-addr">${senderAddress}</div>
                <div class="sender-phone">โทร. ${senderPhone}</div>
              </div>

              <div class="port-receiver">
                <div class="receiver-name">${recipient}</div>
                <div class="receiver-addr">${address}</div>
                ${zip ? `<div class="receiver-zip">${zip}</div>` : ""}
                <div class="receiver-phone">โทร ${phone}</div>
              </div>

              <div class="card-footer">${thankYou}</div>
            </div>
          </div>
        `;
      }
    })
    .join("");

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>พิมพ์ใบปะหน้าพัสดุ - ${senderName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700;800;900&family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${pageWidth} ${pageHeight} ${isLandscape ? "landscape" : "portrait"};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: 'Kanit', 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-page {
            width: ${pageWidth};
            height: ${pageHeight};
            max-width: ${pageWidth};
            max-height: ${pageHeight};
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            padding: 0;
            margin: 0;
            box-sizing: border-box;
            display: block;
            overflow: hidden;
          }
          .print-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .print-card {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 0;
            padding: 4mm 6mm 1mm 6mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            background: #ffffff;
            color: #000000;
            box-sizing: border-box;
            overflow: hidden;
          }
          .card-grid {
            display: flex;
            width: 100%;
            gap: 6mm;
            flex: 1;
          }
          .ls-sender {
            width: 28%;
            font-size: 8.5pt;
            line-height: 1.35;
            display: flex;
            flex-direction: column;
            padding-top: 1mm;
          }
          .sender-name {
            font-size: 10.5pt;
            font-weight: 800;
            margin-bottom: 2px;
          }
          .sender-addr {
            font-size: 8.2pt;
            margin-top: 2px;
            line-height: 1.35;
          }
          .sender-phone {
            font-size: 8.5pt;
            font-weight: 700;
            margin-top: 3px;
          }
          .ls-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 7.5mm;
            padding-top: 0;
            padding-left: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .port-sender {
            font-size: 8.5pt;
            line-height: 1.35;
          }
          .port-receiver {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            padding-bottom: 13mm;
            padding-top: 0;
            word-break: break-word;
            overflow-wrap: break-word;
          }
          .receiver-name {
            font-size: 13.5pt;
            font-weight: 800;
            line-height: 1.25;
            margin-bottom: 3px;
          }
          .receiver-addr {
            font-size: 11pt;
            line-height: 1.4;
            font-weight: 600;
          }
          .receiver-zip {
            margin-top: 3px;
            font-size: 14pt;
            font-weight: 900;
            letter-spacing: 2px;
          }
          .receiver-phone {
            font-size: 11pt;
            font-weight: 800;
            margin-top: 3px;
          }
          .card-footer {
            text-align: center;
            font-size: 9pt;
            font-weight: 700;
            margin-top: auto;
            padding-top: 0;
            padding-bottom: 0.5mm;
          }
        </style>
      </head>
      <body>
        ${cardsHtml}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(async () => {
    try {
      if (iframe.contentWindow && iframe.contentWindow.document.fonts) {
        await iframe.contentWindow.document.fonts.ready;
      }
    } catch (e) {}
    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    // Auto mark printed customers in Firebase
    try {
      const updates = {};
      const now = Date.now();
      printableCustomers.value.forEach((c) => {
        updates[`delivery_customers/${c.id}/labelPrinted`] = true;
        updates[`delivery_customers/${c.id}/labelPrintedAt`] = now;
      });
      if (Object.keys(updates).length > 0) {
        await update(dbRef(db), updates);
      }
    } catch (err) {
      console.error("Error auto-updating labelPrinted status:", err);
    }
  }, 250);
}

// 📊 Export to CSV / Excel for Thermal Printer Apps (e.g. Print Master, Niimbot, Phomemo, Flash)
function exportExcelForApp() {
  if (printableCustomers.value.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "ไม่มีรายการที่เลือก",
      text: "กรุณาเลือกรายการลูกค้าที่ต้องการส่งออกก่อนครับ",
    });
    return;
  }

  const rows = [
    ["ลำดับ", "ชื่อผู้รับ (พิมพ์บนกล่อง)", "ชื่อลูกค้า (CF)", "เบอร์โทร", "ที่อยู่", "รหัสไปรษณีย์", "จำนวนสินค้า", "รอบส่ง", "โน้ต", "ผู้ส่ง", "เบอร์ผู้ส่ง", "ที่อยู่ผู้ส่ง"],
  ];

  printableCustomers.value.forEach((c, idx) => {
    const recipient = getRecipientDisplayName(c) || "";
    const phone = getCustomerPhone(c) || "";
    const addr = getCustomerAddress(c) || "";
    const zip = getCustomerZip(c) || "";
    rows.push([
      idx + 1,
      `"${recipient.replace(/"/g, '""')}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${phone}"`,
      `"${addr.replace(/"/g, '""')}"`,
      `"${zip}"`,
      c.itemCount || 0,
      c.deliveryDate || "",
      `"${(c.note || '').replace(/"/g, '""')}"`,
      `"${(sender.value.name || '').replace(/"/g, '""')}"`,
      `"${(sender.value.phone || '').replace(/"/g, '""')}"`,
      `"${(sender.value.address || '').replace(/"/g, '""')}"`,
    ]);
  });

  const csvContent = "\uFEFF" + rows.map((e) => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("href", url);
  link.setAttribute("download", `รายการที่อยู่จัดส่ง_130x76_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  Swal.fire({
    icon: "success",
    title: "ส่งออกไฟล์สำเร็จ!",
    html: `
      <div style="text-align: left; font-size: 0.9em; line-height: 1.6;">
        ดาวน์โหลดไฟล์ <b>.csv</b> เรียบร้อยแล้ว<br>
        สามารถนำไฟล์นี้ไปกดเปิดในแอปเครื่องพิมพ์ (ปุ่ม <b>Excel</b>) เพื่อพิมพ์สติ๊กเกอร์รวดเดียวได้เลยครับ!
      </div>
    `,
    confirmButtonColor: "#3b82f6",
  });
}

onMounted(() => {
  if (todayCount.value > 0) {
    setFilter("today");
  } else if (packTonightCount.value > 0) {
    setFilter("pack-tonight");
  } else {
    setFilter("all-requested");
  }
});
</script>

<style scoped>
.slm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 16px;
  box-sizing: border-box;
}

.slm-modal {
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 920px;
  max-height: 94vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  overflow: hidden;
  font-family: "Kanit", sans-serif;
}

.slm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #27272a;
}

.slm-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.15em;
  font-weight: 700;
  color: #fff;
}

.slm-count-badge {
  font-size: 0.75em;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 10px;
  border-radius: 12px;
}

.slm-close-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-size: 1.2em;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s;
}

.slm-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.slm-controls {
  padding: 12px 18px;
  background: #141417;
  border-bottom: 1px solid #27272a;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.slm-filter-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.slm-filter-btn {
  padding: 6px 12px;
  background: #202024;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  color: #a1a1aa;
  font-family: inherit;
  font-size: 0.85em;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.slm-filter-btn:hover {
  border-color: #71717a;
  color: #fff;
}

.slm-filter-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
  font-weight: 700;
}

/* Customer Selector Strip */
.slm-customer-selector {
  background: #18181b;
  border: 1px solid #27272a;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slm-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.slm-search-box {
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
}

.slm-search-icon {
  position: absolute;
  left: 10px;
  color: #71717a;
  font-size: 0.85em;
  pointer-events: none;
}

.slm-search-input {
  width: 100%;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  padding: 5px 28px 5px 30px;
  color: #fff;
  font-family: inherit;
  font-size: 0.85em;
  outline: none;
  transition: all 0.2s;
}

.slm-search-input:focus {
  border-color: #3b82f6;
  background: #202024;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.slm-clear-search {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 0.8em;
  padding: 2px 4px;
}

.slm-quick-select-btns {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.slm-mini-btn {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #d4d4d8;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.78em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.slm-mini-btn:hover {
  background: #3f3f46;
  color: #fff;
}

.slm-mini-btn.highlight {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}

.slm-mini-btn.highlight:hover {
  background: rgba(245, 158, 11, 0.22);
}

.slm-chips-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  max-height: 85px;
  flex-wrap: wrap;
}

.slm-cust-chip {
  background: #202024;
  border: 1px solid #333338;
  border-radius: 8px;
  padding: 4px 8px;
  color: #a1a1aa;
  font-family: inherit;
  font-size: 0.82em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
  user-select: none;
}

.slm-cust-chip:hover {
  background: #27272a;
  color: #fff;
  border-color: #52525b;
}

.slm-cust-chip.selected {
  background: rgba(59, 130, 246, 0.18);
  border-color: #3b82f6;
  color: #fff;
}

.slm-cust-chip.selected .chip-checkbox {
  color: #3b82f6;
}

.chip-name {
  font-weight: 600;
  color: #f4f4f5;
}

.chip-items {
  font-size: 0.85em;
  color: #10b981;
  font-weight: 700;
}

.chip-status-tag {
  font-size: 0.72em;
  padding: 1px 5px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: all 0.15s;
}

.chip-status-tag.is-printed {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
}

.chip-status-tag.is-unprinted {
  background: rgba(245, 158, 11, 0.12);
  color: #fbbf24;
}

.chip-warn-tag {
  font-size: 0.7em;
  color: #f87171;
  background: rgba(239, 68, 68, 0.1);
  padding: 1px 4px;
  border-radius: 4px;
}

.slm-no-chips {
  font-size: 0.8em;
  color: #71717a;
  padding: 6px;
}



.slm-options-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.slm-orient-tabs {
  display: flex;
  gap: 4px;
  background: #202024;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid #3f3f46;
}

.slm-orient-btn {
  background: transparent;
  border: none;
  color: #a1a1aa;
  font-family: inherit;
  font-size: 0.82em;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.slm-orient-btn.active {
  background: #3b82f6;
  color: #fff;
  font-weight: 600;
}

.slm-select-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: #a1a1aa;
}

.slm-select {
  background: #202024;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  color: #fff;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 0.88em;
  outline: none;
}

.slm-export-excel-btn {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 6px;
  color: #34d399;
  padding: 5px 10px;
  font-family: inherit;
  font-size: 0.82em;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.slm-export-excel-btn:hover {
  background: rgba(16, 185, 129, 0.25);
  border-color: #10b981;
}

.slm-toggle-sender-btn {
  background: transparent;
  border: 1px dashed #52525b;
  border-radius: 6px;
  color: #93c5fd;
  padding: 5px 10px;
  font-family: inherit;
  font-size: 0.82em;
  cursor: pointer;
  transition: all 0.2s;
}

.slm-toggle-sender-btn:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.08);
}

.slm-sender-box {
  background: #1f1f23;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 10px;
}

.slm-sender-title {
  font-size: 0.8em;
  font-weight: 600;
  color: #a1a1aa;
  margin-bottom: 6px;
}

.slm-sender-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.slm-col-span {
  grid-column: 1 / -1;
}

.slm-input {
  background: #121214;
  border: 1px solid #3f3f46;
  border-radius: 6px;
  color: #fff;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 0.85em;
  outline: none;
}

.slm-input:focus {
  border-color: #3b82f6;
}

.slm-select-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 4px;
}

.slm-check-all {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88em;
  color: #e4e4e7;
  cursor: pointer;
}

.slm-check-all input {
  accent-color: #3b82f6;
  width: 16px;
  height: 16px;
}

.slm-addr-counter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75em;
  font-weight: 500;
}

.cnt-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
}

.cnt-item.has {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
}

.cnt-item.missing {
  background: rgba(245, 158, 11, 0.1);
  color: #fbbf24;
}

.slm-print-btn {
  padding: 7px 16px;
  font-size: 0.9em;
  font-weight: 700;
  border-radius: 8px;
}

/* Preview Area */
.slm-preview-area {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
  background: #27272a;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.slm-empty-state {
  text-align: center;
  color: #a1a1aa;
  padding: 40px 20px;
}

.slm-empty-icon {
  font-size: 3em;
  color: #52525b;
  margin-bottom: 12px;
}

/* ==================== 🏷️ LANDSCAPE (แนวนอน 130 x 76 mm) STYLES ==================== */
.shipping-label-card {
  background: #ffffff;
  color: #000000;
  border: none;
  border-radius: 4px;
  padding: 16px 20px 8px 20px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: "Kanit", "Sarabun", sans-serif;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  page-break-after: always;
}

.shipping-label-card.layout-landscape {
  width: 100%;
  max-width: 580px;
  min-height: 330px;
  aspect-ratio: 130 / 76;
}

.shipping-label-card.layout-portrait {
  width: 100%;
  max-width: 380px;
  min-height: 520px;
  aspect-ratio: 76 / 130;
}

.label-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #000000;
  padding-bottom: 4px;
  margin-bottom: 8px;
}

.label-badge-shop {
  font-size: 1.05em;
  font-weight: 900;
  letter-spacing: 0.5px;
}

.label-index {
  font-size: 0.8em;
  font-weight: 700;
  color: #000000;
}

/* Landscape 2-Column Split Layout */
.label-main-grid {
  display: flex;
  gap: 8px;
  flex: 1;
  align-items: stretch;
  padding: 4px 6px;
}

.ls-sender-col {
  width: 28%;
  font-size: 0.82em;
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}

.ls-sender-name {
  font-weight: 800;
  font-size: 1.02em;
  margin-bottom: 2px;
}

.ls-sender-addr {
  font-size: 0.88em;
  margin-top: 2px;
  line-height: 1.35;
}

.ls-sender-phone {
  font-weight: 600;
  font-size: 0.88em;
  margin-top: 3px;
}

/* Right Column: Receiver (TO) - Shifted down towards bottom with 10% bottom margin */
.ls-receiver-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-left: 0;
  padding-bottom: 28px;
  padding-top: 0;
  word-break: break-word;
  overflow-wrap: break-word;
}

.ls-receiver-name {
  font-size: 1.15em;
  font-weight: 800;
  line-height: 1.3;
  margin-bottom: 3px;
  color: #000000;
}

.ls-receiver-addr {
  font-size: 1.05em;
  line-height: 1.45;
  font-weight: 600;
  color: #000000;
}

.ls-receiver-zip {
  margin-top: 4px;
  font-size: 1.25em;
  font-weight: 900;
  letter-spacing: 2px;
}

.ls-receiver-phone {
  font-size: 1.05em;
  font-weight: 800;
  margin-top: 3px;
  color: #000000;
}

/* Portrait styles */
.label-portrait-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  padding-top: 8px;
}

.label-sender-block {
  font-size: 0.82em;
  line-height: 1.35;
}

.sender-name-line {
  font-weight: 800;
  font-size: 1.02em;
}

.sender-addr-line {
  font-size: 0.88em;
  margin-top: 2px;
}

.sender-phone-line {
  font-weight: 600;
  font-size: 0.88em;
  margin-top: 3px;
}

.label-receiver-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding-bottom: 36px;
  padding-top: 0;
}

.receiver-name {
  font-size: 1.15em;
  font-weight: 800;
  margin-bottom: 3px;
}

.receiver-address {
  font-size: 1.05em;
  line-height: 1.45;
  font-weight: 600;
}

.receiver-zipcode {
  margin-top: 4px;
  font-size: 1.25em;
  font-weight: 900;
  letter-spacing: 2px;
}

.receiver-phone {
  margin-top: 3px;
  font-size: 1.05em;
  font-weight: 800;
}

/* Bottom Thank You Bar */
.label-thankyou-footer {
  text-align: center;
  font-size: 0.8em;
  font-weight: 700;
  color: #000000;
  padding-top: 4px;
  margin-top: auto;
  letter-spacing: 0.3px;
  width: 100%;
}

/* ==================== 🖨️ PRINT MEDIA STYLES ==================== */
@media print {
  html, body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
  }

  body * {
    visibility: hidden;
  }

  .slm-overlay,
  .slm-modal,
  .slm-preview-area,
  .slm-preview-area * {
    visibility: visible;
  }

  .no-print,
  .slm-header,
  .slm-toolbar,
  .slm-sender-box,
  .slm-select-bar {
    display: none !important;
  }

  .slm-overlay {
    position: static !important;
    display: block !important;
    width: 100% !important;
    height: auto !important;
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    z-index: 99999 !important;
  }

  .slm-modal {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
    max-width: 100% !important;
    max-height: none !important;
    width: 100% !important;
    height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    display: block !important;
    overflow: visible !important;
  }

  .slm-preview-area {
    background: transparent !important;
    padding: 0 !important;
    margin: 0 !important;
    display: block !important;
    overflow: visible !important;
    height: auto !important;
    max-height: none !important;
  }

  .shipping-label-card {
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    page-break-before: always !important;
    break-before: page !important;
    page-break-after: always !important;
    break-after: page !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
    box-shadow: none !important;
    border: none !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  .shipping-label-card:first-child {
    page-break-before: auto !important;
    break-before: auto !important;
  }

  .shipping-label-card.layout-landscape {
    width: 100% !important;
    max-width: 130mm !important;
    height: 74mm !important;
    max-height: 74mm !important;
  }

  .shipping-label-card.layout-landscape .ls-receiver-col {
    padding-top: 22mm !important;
    padding-left: 0 !important;
  }

  .shipping-label-card.layout-portrait {
    width: 100% !important;
    max-width: 76mm !important;
    height: 128mm !important;
    max-height: 128mm !important;
  }

  .shipping-label-card.layout-portrait .label-receiver-block {
    padding-top: 60mm !important;
  }

  .label-thankyou-footer {
    font-size: 8.5pt;
    font-weight: bold;
    text-align: center;
    color: #000000;
    margin-top: auto;
    padding-top: 1mm;
  }

  /* Exact 130x76 mm landscape page setup */
  @page {
    size: 130mm 76mm landscape;
    margin: 0mm;
  }
}
</style>

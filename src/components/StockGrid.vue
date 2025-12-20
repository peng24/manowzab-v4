<template>
  <div class="stock-panel">
    <div class="stock-header">
      <div class="stock-stats">
        รายการทั้งหมด:
        <span class="text-white">{{ stockStore.stockSize }}</span>
      </div>
      <div class="stock-stats">
        ขายแล้ว: <span class="stat-sold">{{ soldCount }}</span>
      </div>

      <div class="flex gap-10">
        <input
          type="number"
          v-model.number="stockStore.stockSize"
          class="edit-input"
          style="width: 80px"
          @change="saveStockSize"
        />
        <button class="btn btn-dark" @click="confirmClear">
          <i class="fa-solid fa-trash"></i> ล้าง
        </button>
      </div>
    </div>

    <div class="stock-grid" ref="gridContainer">
      <div
        v-for="i in stockStore.stockSize"
        :key="i"
        :class="[
          'stock-item',
          getStockItem(i).owner ? 'sold' : '',
          isNewOrder(i) ? 'new-order' : '',
          highlightedId === i ? 'highlight' : '',
        ]"
        @click="handleItemClick(i)"
        :id="`stock-${i}`"
      >
        <div class="stock-num">{{ i }}</div>

        <div class="stock-status">
          {{ getStockItem(i).owner || "ว่าง" }}
        </div>

        <div v-if="getStockItem(i).price" class="stock-price">
          {{ getStockItem(i).price }}.-
        </div>

        <div v-if="getQueueLength(i) > 0" class="queue-badge">
          +{{ getQueueLength(i) }}
        </div>

        <div
          v-if="getStockItem(i).source"
          :class="['source-icon', getStockItem(i).source]"
        >
          <i :class="getSourceIcon(getStockItem(i).source)"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { useStockStore } from "../stores/stock";
import Swal from "sweetalert2";

// ==========================================
// ✅ เพิ่มส่วน Logger ลงไปตรงนี้ครับ
// ==========================================
const DEBUG_MODE = true;
const logger = {
  log: (...args) => {
    if (DEBUG_MODE) console.log(...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn(...args);
  },
  error: (...args) => {
    console.error(...args);
  },
};
// ==========================================

const stockStore = useStockStore();
const gridContainer = ref(null);
const highlightedId = ref(null);
const newOrders = ref(new Set());

// Computed
const soldCount = computed(() => {
  return Object.values(stockStore.stockData).filter((item) => item.owner)
    .length;
});

// Helper Functions
function getStockItem(num) {
  return stockStore.stockData[num] || {};
}

function getQueueLength(num) {
  const item = stockStore.stockData[num];
  return item && item.queue ? item.queue.length : 0;
}

function getSourceIcon(source) {
  if (source === "ai") return "fa-solid fa-robot";
  if (source === "regex") return "fa-solid fa-code";
  return "fa-solid fa-hand-pointer";
}

function isNewOrder(num) {
  return newOrders.value.has(num);
}

// Save Stock Size
function saveStockSize() {
  stockStore.updateStockSize(stockStore.stockSize);
}

// Watch for new orders to trigger animation & scroll
watch(
  () => stockStore.stockData,
  (newVal, oldVal) => {
    // หาความแตกต่างเพื่อดูว่าเลขไหนเพิ่งขายออก
    Object.keys(newVal).forEach((key) => {
      const num = parseInt(key);
      const newItem = newVal[key];
      const oldItem = oldVal?.[key];

      // ถ้าเป็นรายการใหม่ หรือ เพิ่งมีเจ้าของ
      if (newItem.owner && (!oldItem || !oldItem.owner)) {
        logger.log("🎯 New order detected:", num); // ✅ ใช้ logger ได้แล้ว

        // 1. Add to new orders set (for animation)
        newOrders.value.add(num);

        // Remove animation class after 15 seconds
        setTimeout(() => {
          newOrders.value.delete(num);
        }, 15000);

        // 2. Auto Scroll to item
        scrollToItem(num);
      }
    });
  },
  { deep: true }
);

function scrollToItem(num) {
  nextTick(() => {
    const el = document.getElementById(`stock-${num}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightedId.value = num;
      setTimeout(() => (highlightedId.value = null), 2000);
    }
  });
}

// Handle Click
function handleItemClick(num) {
  const item = getStockItem(num);

  if (!item.owner) {
    // Case 1: Empty -> Manual Reserve
    Swal.fire({
      title: `จองรหัส ${num}`,
      input: "text",
      inputPlaceholder: "ชื่อลูกค้า",
      showCancelButton: true,
      confirmButtonText: "จอง",
      confirmButtonColor: "#00e676",
      cancelButtonText: "ยกเลิก",
      background: "#1e1e1e",
      color: "#fff",
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        stockStore.processOrder(
          num,
          result.value,
          "manual-" + Date.now(),
          "manual"
        );
      }
    });
  } else {
    // Case 2: Occupied -> Manage (Cancel / Edit Price / Clear)
    Swal.fire({
      title: `จัดการรหัส ${num}`,
      html: `
        <p>เจ้าของ: <strong>${item.owner}</strong></p>
        <p class="text-sm text-gray-400">วิธี: ${item.source || "Unknown"}</p>
        ${
          item.queue
            ? `<p class="text-warn">คิวต่อ: ${item.queue.length} คน</p>`
            : ""
        }
      `,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: "แก้ไขราคา",
      denyButtonText: "ยกเลิกจอง (หลุด)",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#3085d6",
      denyButtonColor: "#d33",
      background: "#1e1e1e",
      color: "#fff",
    }).then((result) => {
      if (result.isConfirmed) {
        // Edit Price
        Swal.fire({
          title: "ใส่ราคา",
          input: "number",
          inputValue: item.price || "",
          background: "#1e1e1e",
          color: "#fff",
        }).then((priceResult) => {
          if (priceResult.isConfirmed) {
            stockStore.updateStockPrice(num, parseInt(priceResult.value));
          }
        });
      } else if (result.isDenied) {
        // Cancel Order
        stockStore.processCancel(num);
      }
    });
  }
}

// Clear All
function confirmClear() {
  Swal.fire({
    title: "ล้างข้อมูลทั้งหมด?",
    text: "ข้อมูลการจองจะหายไปทั้งหมด!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "ใช่, ล้างเลย",
    cancelButtonText: "ยกเลิก",
    background: "#1e1e1e",
    color: "#fff",
  }).then((result) => {
    if (result.isConfirmed) {
      stockStore.clearAllStock();
      Swal.fire({
        title: "ล้างเรียบร้อย",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        background: "#1e1e1e",
        color: "#fff",
      });
    }
  });
}
</script>

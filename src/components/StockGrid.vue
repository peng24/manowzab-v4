<template>
  <div class="stock-panel" ref="stockPanelRef">
    <div class="stock-header">
      <div style="display: flex; align-items: center; gap: 10px">
        <input
          type="number"
          v-model.number="stockStore.stockSize"
          style="
            width: 60px;
            background: #333;
            border: none;
            color: white;
            text-align: center;
            border-radius: 4px;
            padding: 5px;
          "
          @change="saveStockSize"
        />
        <span style="font-size: 0.8em; color: #aaa">รายการ</span>
        <button class="btn btn-dark" @click="adjustGridZoom(-0.1)">-</button>
        <button class="btn btn-dark" @click="adjustGridZoom(0.1)">+</button>
      </div>

      <div class="stock-stats">
        จอง <span class="stat-sold">{{ soldCount }}</span> /
        {{ stockStore.stockSize }}
      </div>

      <button class="btn btn-dark" @click="clearAll">🗑️ ล้าง</button>
    </div>

    <div class="stock-grid" :style="{ fontSize: gridSize + 'em' }">
      <div
        v-for="num in stockStore.stockSize"
        :key="num"
        :ref="(el) => (stockItemRefs[num] = el)"
        :id="`stock-${num}`"
        :class="getStockClass(num)"
        @click="handleStockClick(num)"
      >
        <span class="stock-num">{{ num }}</span>

        <div
          v-if="stockStore.stockData[num]?.queue?.length"
          class="queue-badge"
        >
          +{{ stockStore.stockData[num].queue.length }}
        </div>

        <span class="stock-status">
          {{ stockStore.stockData[num]?.owner || "ว่าง" }}
        </span>

        <span
          v-if="stockStore.stockData[num]?.price"
          class="stock-price"
          :style="{
            color: stockStore.stockData[num]?.owner
              ? '#ffd700'
              : 'var(--vacant-price)',
          }"
        >
          ฿{{ stockStore.stockData[num].price }}
        </span>

        <span v-if="stockStore.stockData[num]?.source" class="source-icon">
          <i :class="getSourceIcon(stockStore.stockData[num].source)"></i>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue";
import { useStockStore } from "../stores/stock";
import Swal from "sweetalert2";

const stockStore = useStockStore();
const gridSize = ref(1);
const stockPanelRef = ref(null);
const stockItemRefs = ref({});

const soldCount = computed(() => {
  return Object.values(stockStore.stockData).filter((item) => item?.owner)
    .length;
});

// ✅ Watch for new orders and auto-scroll
watch(
  () => stockStore.stockData,
  (newData, oldData) => {
    // หา item ที่เพิ่งจองใหม่
    Object.keys(newData).forEach((num) => {
      const newItem = newData[num];
      const oldItem = oldData?.[num];

      // ถ้ามีการจองใหม่
      if (newItem?.owner && (!oldItem || !oldItem.owner)) {
        console.log("🎯 New order detected:", num);

        nextTick(() => {
          const element = stockItemRefs.value[num];
          if (element && stockPanelRef.value) {
            // ✅ Scroll to center with smooth animation
            element.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "center",
            });

            // เพิ่ม highlight effect
            element.classList.add("highlight");
            setTimeout(() => {
              element.classList.remove("highlight");
            }, 1000);
          }
        });
      }
    });
  },
  { deep: true }
);

function getStockClass(num) {
  const item = stockStore.stockData[num];
  const classes = ["stock-item"];

  if (item?.owner) {
    classes.push("sold");

    // ✅ New order animation (15 seconds only)
    if (Date.now() - item.time < 15000) {
      classes.push("new-order");
    }
  }

  return classes;
}

function getSourceIcon(source) {
  const icons = {
    ai: "fa-solid fa-robot",
    regex: "fa-solid fa-bolt",
    manual: "fa-solid fa-hand-pointer",
    queue: "fa-solid fa-users",
  };
  return icons[source] || "fa-solid fa-users";
}

function handleStockClick(num) {
  const current = stockStore.stockData[num];

  // ถ้ายังไม่มีคนจอง
  if (!current || !current.owner) {
    const currentPrice = current?.price || "";
    Swal.fire({
      title: `เบอร์ ${num}`,
      text: "ใส่ชื่อเพื่อจอง หรือ ใส่ตัวเลขเพื่อตั้งราคา",
      input: "text",
      inputValue: currentPrice,
      showCancelButton: true,
      confirmButtonText: "บันทึก",
      cancelButtonText: "ยกเลิก",
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const val = result.value.trim();

        if (/^\d+$/.test(val)) {
          stockStore.updateStockPrice(num, val);
        } else {
          stockStore.processOrder(num, val, "manual-" + Date.now(), "manual");
        }
      }
    });
    return;
  }

  // ถ้ามีคนจองแล้ว
  let queueHtml = "";
  if (current.queue && current.queue.length > 0) {
    queueHtml =
      '<div style="margin-top:10px; text-align:left; background:#eee; color:#000; padding:10px; border-radius:6px;"><strong>คิวต่อ:</strong><ul style="padding-left:0; margin:10px 0; list-style:none;">';
    current.queue.forEach((q, idx) => {
      queueHtml += `<li style="background:#fff; padding:8px; margin-bottom:4px; border-radius:4px;">
        <strong>${idx + 1}.</strong> ${q.owner}
      </li>`;
    });
    queueHtml += "</ul></div>";
  }

  Swal.fire({
    title: `เบอร์ ${num}`,
    html: `
      <div style="font-size:1.2em; color:#00e676; margin-bottom:10px;">${current.owner}</div>
      <div style="display:flex; gap:5px; justify-content:center; flex-wrap:wrap;">
        <button onclick="editName(${num})" class="swal2-confirm swal2-styled" style="background:#1976d2; margin:0;">แก้ชื่อ</button>
        <button onclick="editPrice(${num})" class="swal2-confirm swal2-styled" style="background:#555; margin:0;">แก้ราคา</button>
        <button onclick="cancelOrder(${num})" class="swal2-confirm swal2-styled" style="background:#d32f2f; margin:0;">ยกเลิกจอง</button>
      </div>
      ${queueHtml}
    `,
    showConfirmButton: false,
  });
}

// Global functions for Swal
window.editName = (num) => {
  Swal.close();
  Swal.fire({
    input: "text",
    inputValue: stockStore.stockData[num].owner,
    title: "แก้ไขชื่อ",
  }).then((result) => {
    if (result.value) {
      const updates = {};
      updates[`stock/${stockStore.stockData[num]}/owner`] = result.value;
    }
  });
};

window.editPrice = (num) => {
  Swal.close();
  Swal.fire({
    input: "number",
    title: "แก้ไขราคา",
  }).then((result) => {
    if (result.value) {
      stockStore.updateStockPrice(num, result.value);
    }
  });
};

window.cancelOrder = (num) => {
  Swal.close();
  stockStore.processCancel(num);
  Swal.fire({ icon: "success", title: "ยกเลิกรายการสำเร็จ", timer: 1500 });
};

function clearAll() {
  Swal.fire({
    title: "ล้างทั้งหมด?",
    showCancelButton: true,
    confirmButtonText: "ใช่",
    cancelButtonText: "ไม่",
  }).then((result) => {
    if (result.isConfirmed) {
      stockStore.clearAllStock();
    }
  });
}

function saveStockSize() {
  // Save to Firebase
}

function adjustGridZoom(delta) {
  gridSize.value += delta;
  if (gridSize.value < 0.5) gridSize.value = 0.5;
  if (gridSize.value > 2) gridSize.value = 2;
}
</script>

<template>
  <div class="stock-panel">
    <div class="stock-header">
      <div class="stock-stats flex-center gap-10">
        รายการทั้งหมด:
        <input
          type="number"
          v-model.lazy="stockStore.stockSize"
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

      <div class="stock-stats">
        ขายแล้ว: <span class="stat-sold">{{ soldCount }}</span> /
        {{ stockStore.stockSize }}
      </div>

      <button class="btn btn-dark" @click="confirmClear">
        <i class="fa-solid fa-trash"></i> ล้างกระดาน
      </button>
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
        @click="openQueueModal(i)"
        :id="`stock-${i}`"
      >
        <div class="stock-num">{{ i }}</div>
        <div class="stock-status">{{ getStockItem(i).owner || "ว่าง" }}</div>
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
          <span
            v-if="getStockItem(i).source === 'regex'"
            style="margin-left: 2px; font-size: 0.9em"
            >พิมพ์รหัส</span
          >
        </div>
      </div>
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
                  <input
                    type="text"
                    v-model="person.owner"
                    class="queue-input"
                  />
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
import { computed, ref, watch, nextTick } from "vue";
import { useStockStore } from "../stores/stock";
import { useAudio } from "../composables/useAudio"; // เรียกใช้เสียง
import Swal from "sweetalert2";

// Logger (ใส่ไว้เหมือนเดิม)
const DEBUG_MODE = true;
const logger = { log: (...args) => DEBUG_MODE && console.log(...args) };

const stockStore = useStockStore();
const { playDing, queueSpeech } = useAudio();
const gridContainer = ref(null);
const highlightedId = ref(null);
const newOrders = ref(new Set());

// Modal Variables
const showModal = ref(false);
const editingId = ref(null);
const editingPrice = ref(0);
const tempQueue = ref([]);
let draggingIndex = null;

const soldCount = computed(
  () => Object.values(stockStore.stockData).filter((item) => item.owner).length
);

function getStockItem(num) {
  return stockStore.stockData[num] || {};
}
function getQueueLength(num) {
  const item = stockStore.stockData[num];
  return item && item.queue ? item.queue.length : 0;
}
function getSourceIcon(source) {
  if (source === "ai") return "fa-solid fa-robot";
  if (source === "regex") return "fa-solid fa-keyboard"; // เปลี่ยนไอคอน
  return "fa-solid fa-hand-pointer";
}
function isNewOrder(num) {
  return newOrders.value.has(num);
}
function saveStockSize() {
  stockStore.updateStockSize(stockStore.stockSize);
}

// Watcher (เหมือนเดิม)
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
  { deep: true }
);

function scrollToItem(num) {
  nextTick(() => {
    const el = document.getElementById(`stock-${num}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

// ==========================================
// ✅ Logic จัดการคิว (Drag & Drop)
// ==========================================

function openQueueModal(num) {
  const item = getStockItem(num);
  editingId.value = num;
  editingPrice.value = item.price || 0;

  // แปลงข้อมูล Owner + Queue ให้เป็น Array เดียวกันเพื่อจัดการง่าย
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

// Drag & Drop Handlers
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
  // ถ้าลบคนแรก (เจ้าของ) ให้ระบบเสียงแจ้งเตือนตอนบันทึก (ทำใน saveQueueChanges)
  tempQueue.value.splice(index, 1);
}

function manualReserve() {
  tempQueue.value.push({
    owner: "ลูกค้าใหม่",
    uid: "manual-" + Date.now(),
    time: Date.now(),
    source: "manual",
  });
}

async function saveQueueChanges() {
  const num = editingId.value;
  const oldItem = getStockItem(num);
  const newOwnerName =
    tempQueue.value.length > 0 ? tempQueue.value[0].owner : null;
  const oldOwnerName = oldItem.owner;

  // สร้าง Object ข้อมูลใหม่
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

  // เช็คว่ามีการเปลี่ยนคนได้ของหรือไม่ เพื่อเล่นเสียง
  if (oldOwnerName && !newOwnerName) {
    // กรณีลบหมด
    playDing();
    queueSpeech(`ยกเลิกรายการที่ ${num} ค่ะ`);
  } else if (oldOwnerName && newOwnerName && oldOwnerName !== newOwnerName) {
    // กรณีเปลี่ยนคน (ยกเลิกคนเก่า คนใหม่เสียบ)
    playDing();
    queueSpeech(`${oldOwnerName} หลุด... ${newOwnerName} ได้ต่อค่ะ`);
  }

  // บันทึกลง Firebase
  if (newData) {
    await stockStore.updateItemData(num, newData);
  } else {
    await stockStore.processCancel(num); // ลบรายการ
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
</script>

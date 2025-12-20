<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="dashboard-content">
      <div class="dashboard-header">
        <div class="dash-title">🕒 ประวัติการไลฟ์</div>
        <button class="btn btn-dark" @click="$emit('close')">ปิด</button>
      </div>

      <div style="padding: 10px">
        <input
          type="text"
          v-model="searchText"
          class="history-search-box"
          placeholder="🔍 ค้นหาชื่อไลฟ์..."
        />
      </div>

      <div style="overflow-y: auto; flex: 1; padding: 0 10px">
        <ul class="history-list">
          <li
            v-if="loading"
            style="text-align: center; color: #888; padding: 20px"
          >
            <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลดประวัติ...
          </li>

          <li
            v-for="item in filteredHistory"
            :key="item.id"
            class="history-item"
            @click="loadHistory(item.id)"
          >
            <div class="history-title">{{ item.title }}</div>
            <div class="history-date">{{ formatDate(item.timestamp) }}</div>
            <button
              class="btn-delete-history"
              @click.stop="deleteHistory(item.id)"
              title="ลบประวัติ"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </li>

          <li
            v-if="!loading && filteredHistory.length === 0"
            style="text-align: center; color: #888; padding: 20px"
          >
            <i class="fa-solid fa-inbox"></i><br />
            ไม่พบประวัติ
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { ref as dbRef, onValue, remove } from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "../stores/system";
import { useStockStore } from "../stores/stock";
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);

const systemStore = useSystemStore();
const stockStore = useStockStore();

const historyData = ref([]);
const searchText = ref("");
const loading = ref(true);

const filteredHistory = computed(() => {
  if (!searchText.value) return historyData.value;

  const search = searchText.value.toLowerCase();
  return historyData.value.filter((item) =>
    item.title.toLowerCase().includes(search)
  );
});

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  return `${date.getDate()} ${months[date.getMonth()]} ${
    date.getFullYear() + 543
  } (${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")})`;
}

function loadHistory(videoId) {
  systemStore.currentVideoId = videoId;
  stockStore.connectToStock(videoId);

  Swal.fire({
    icon: "success",
    title: "โหลดประวัติสำเร็จ",
    text: `Video ID: ${videoId}`,
    timer: 2000,
    showConfirmButton: false,
  });

  emit("close");
}

function deleteHistory(videoId) {
  Swal.fire({
    title: "ลบประวัติ?",
    text: "คุณต้องการลบประวัติการไลฟ์นี้หรือไม่?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "ลบ",
    cancelButtonText: "ยกเลิก",
    confirmButtonColor: "#d32f2f",
  }).then((result) => {
    if (result.isConfirmed) {
      remove(dbRef(db, `history/${videoId}`))
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "ลบประวัติแล้ว",
            timer: 1500,
            showConfirmButton: false,
          });
        })
        .catch((error) => {
          console.error("Error deleting history:", error);
          Swal.fire("Error", "ลบไม่สำเร็จ", "error");
        });
    }
  });
}

onMounted(() => {
  onValue(dbRef(db, "history"), (snapshot) => {
    const data = snapshot.val() || {};
    historyData.value = Object.keys(data)
      .map((key) => ({
        id: key,
        ...data[key],
      }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    loading.value = false;
  });
});
</script>

<style scoped>
.dashboard-content {
  background: #121212;
  border-radius: 8px;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history-item {
  background: #1e1e1e;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  border: 1px solid #333;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
}

.history-item:hover {
  background: #252525;
  border-color: #555;
  transform: translateY(-2px);
}

.history-title {
  font-size: 1.1em;
  font-weight: bold;
  color: #fff;
  margin-bottom: 5px;
  padding-right: 40px;
}

.history-date {
  font-size: 0.9em;
  color: #888;
}

.btn-delete-history {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #d32f2f;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: 0.2s;
}

.btn-delete-history:hover {
  background: #b71c1c;
}
</style>

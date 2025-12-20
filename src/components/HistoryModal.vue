<template>
  <div class="dashboard-overlay" @click.self="$emit('close')">
    <div class="history-modal">
      <div class="dashboard-header">
        <div class="flex gap-10" style="align-items: center">
          <h2 class="dash-title">
            <i class="fa-solid fa-clock-rotate-left"></i> ประวัติแชท
          </h2>
          <span class="text-secondary" style="font-size: 0.9em">
            {{ systemStore.liveTitle || "กำลังโหลดชื่อไลฟ์..." }}
          </span>
        </div>

        <button class="btn btn-dark" @click="$emit('close')">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div
        class="p-10"
        style="background: #252525; border-bottom: 1px solid #333"
      >
        <div class="flex gap-10">
          <input
            v-model="searchQuery"
            type="text"
            class="history-search-box"
            placeholder="🔍 ค้นหาชื่อ หรือ ข้อความ..."
            autofocus
          />
          <button
            class="btn btn-dark"
            @click="confirmClearHistory"
            title="ล้างประวัติ"
          >
            <i class="fa-solid fa-trash text-error"></i>
          </button>
        </div>
      </div>

      <div
        class="dashboard-content"
        style="padding: 0; background: transparent; box-shadow: none"
      >
        <div class="history-list" style="overflow-y: auto; padding: 15px">
          <div
            v-if="filteredHistory.length === 0"
            class="text-center text-secondary mt-10"
          >
            ไม่พบข้อมูล
          </div>

          <div
            v-for="chat in filteredHistory"
            :key="chat.id"
            class="history-item"
          >
            <div
              class="flex"
              style="justify-content: space-between; align-items: flex-start"
            >
              <div>
                <div class="history-title">
                  {{ chat.displayName }}
                  <span
                    v-if="chat.realName !== chat.displayName"
                    class="real-name-sub"
                  >
                    ({{ chat.realName }})
                  </span>
                </div>
                <div class="text-white">{{ chat.text }}</div>
              </div>
              <div
                class="text-secondary"
                style="font-size: 0.8em; white-space: nowrap"
              >
                {{ formatTime(chat.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useChatStore } from "../stores/chat";
import { useSystemStore } from "../stores/system"; // ✅ เรียกใช้ System Store
import Swal from "sweetalert2";

const emit = defineEmits(["close"]);
const chatStore = useChatStore();
const systemStore = useSystemStore(); // ✅ ใช้งาน
const searchQuery = ref("");

// Filter logic
const filteredHistory = computed(() => {
  if (!searchQuery.value) return chatStore.fullChatLog.slice().reverse();

  const q = searchQuery.value.toLowerCase();
  return chatStore.fullChatLog
    .filter(
      (c) =>
        c.text.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.realName.toLowerCase().includes(q)
    )
    .slice()
    .reverse();
});

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confirmClearHistory() {
  Swal.fire({
    title: "ล้างประวัติแชททั้งหมด?",
    text: "กู้คืนไม่ได้นะ!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    confirmButtonText: "ล้างเลย",
    cancelButtonText: "ยกเลิก",
    background: "#1e1e1e",
    color: "#fff",
    // ✅ CSS ใน style.css จะช่วยดันให้ swal นี้อยู่บนสุดเองครับ
  }).then((result) => {
    if (result.isConfirmed) {
      chatStore.clearChat();
      Swal.fire({
        title: "เรียบร้อย!",
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

<style scoped>
/* ย้าย style หลักไปไว้ใน assets/style.css แล้ว */
/* ปรับแต่งเพิ่มเติมเฉพาะหน้า */
.history-modal {
  background: #1e1e1e;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  border-radius: 12px;
  border: 1px solid #444;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9);
  position: relative;
  z-index: 9999;
}

.history-search-box {
  width: 100%;
  padding: 10px 15px;
  background: #333;
  border: 1px solid #555;
  border-radius: 6px;
  color: #fff;
  font-size: 1em;
  font-family: "Kanit", sans-serif; /* ใช้ Font Kanit */
}

.history-item {
  background: #2a2a2a;
  padding: 10px 15px;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 1px solid #333;
}
</style>

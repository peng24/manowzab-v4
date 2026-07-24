<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <span>รายการย้อนหลัง</span>
      <div class="flex gap-1">
        <button class="btn-icon-sm-danger" @click="$emit('open-cleanup')" title="ล้างประวัติย้อนหลังเกิน 3 เดือน">
          <i class="fa-solid fa-broom"></i>
        </button>
        <button class="btn-icon-sm" @click="$emit('fix-data')" title="คำนวณยอดใหม่ (Fix Data)">
          <i class="fa-solid fa-wrench"></i>
        </button>
        <button class="btn-icon-sm" @click="$emit('refresh')" title="รีเฟรช">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
      </div>
    </div>
    
    <div v-if="isLoading" class="text-center p-10 text-muted">
      <i class="fa-solid fa-spinner fa-spin"></i> กำลังโหลด...
    </div>

    <div v-else class="sidebar-list">
      <div 
        v-for="item in historyList" 
        :key="item.videoId"
        class="sidebar-item"
        :class="{ active: selectedId === item.videoId }"
        @click="$emit('select', item)"
      >
        <div class="item-title">{{ item.title || "ไม่มีชื่อ" }}</div>
        <div class="item-date">
          <i class="fa-regular fa-calendar"></i> {{ formatDate(item.timestamp) }}
        </div>
        <div class="item-meta">
          ยอด: {{ formatCurrency(item.totalSales || 0) }}
        </div>
      </div>
      
      <div v-if="historyList.length === 0" class="text-center p-10 text-muted">
        ไม่พบข้อมูลประวัติ
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  historyList: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  selectedId: { type: String, default: null }
});

defineEmits(['select', 'refresh', 'fix-data', 'open-cleanup']);

function formatDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(val) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(val);
}
</script>

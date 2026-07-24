<template>
  <div class="stats-bar-header">
    <div v-if="isLoading" class="flex items-center justify-center p-4 w-full text-muted">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...
    </div>
    <template v-else>
      <div class="header-main-row">
        <div class="stock-input-group">
          รายการ:
          <input
            type="number"
            :value="stockSize"
            @change="$emit('update:stockSize', parseInt($event.target.value) || 70)"
            class="edit-input"
            style="width: 60px; text-align: center; font-size: 1em; font-weight: bold;"
          />
        </div>

        <div class="stock-stats">
          <span class="stats-label">ขายแล้ว:</span>
          <span class="stat-sold">{{ soldCount }}</span>
          <span style="opacity: 0.5; font-size: 0.85em">/{{ stockSize }}</span>
          <div class="sale-percent-badge" :class="percentColorClass">
            {{ percentage }}%
          </div>
          <span class="motivational-badge">{{ motivationalText }}</span>
        </div>

        <div class="header-actions">
          <button class="btn btn-warning btn-sm" @click="$emit('clear-stock')" title="ล้างกระดานประวัติ">
            <i class="fa-solid fa-eraser"></i> ล้างกระดาน
          </button>
          <button class="btn btn-danger btn-sm" @click="$emit('delete-history')" title="ลบประวัติรายการนี้">
            <i class="fa-solid fa-trash"></i> ลบประวัติ
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  soldCount: { type: Number, default: 0 },
  stockSize: { type: Number, default: 70 },
  percentage: { type: Number, default: 0 },
  motivationalText: { type: String, default: '' }
});

defineEmits(['update:stockSize', 'clear-stock', 'delete-history']);

const percentColorClass = computed(() => {
  if (props.percentage >= 100) return 'badge-hundred';
  if (props.percentage >= 80) return 'badge-eighty';
  if (props.percentage >= 50) return 'badge-fifty';
  return 'badge-normal';
});
</script>

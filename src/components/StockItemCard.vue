<template>
  <div
    v-memo="[
      item.owner,
      item.price,
      item.backdated,
      item.time,
      ownerCount,
      queueLength,
      isHighlighted,
      isCancelled,
      isNewOrder,
      cancelledName
    ]"
    :class="[
      'stock-item',
      item.owner ? 'sold' : '',
      isNewOrder ? 'new-order' : '',
      isHighlighted ? 'highlight' : '',
      isCancelled ? 'cancelled-blink' : '',
    ]"
    @click="$emit('select', index)"
    :id="`stock-${index}`"
  >
    <div class="stock-num">{{ index }}</div>
    
    <div v-if="isCancelled && !item.owner" class="stock-status cancelled-name">
      ❌ {{ cancelledName }}
    </div>
    <div v-else :class="['stock-status', { empty: !item.owner, 'unsaved-owner': isUnsavedOwner(item.owner) }]">
      {{ item.owner || "ว่าง" }}
    </div>

    <div
      v-if="item.owner && ownerCount >= 1"
      class="owner-count-badge"
      :title="`${item.owner} จองทั้งหมด ${ownerCount} ชิ้น — คลิกเพื่อจัดการ`"
      @click.stop="$emit('show-owner', item.owner)"
    >👗 {{ ownerCount }} ตัว</div>

    <div
      v-if="item.owner && item.backdated"
      class="backdated-time"
      :title="`จองย้อนหลัง: ${formattedTime}`"
    >
      🕒 {{ formattedTime }}
    </div>

    <!-- <div v-if="item.price" class="stock-price">
      {{ item.price }} บาท
    </div> -->

    <div v-if="queueLength > 0" class="queue-badge">
      +{{ queueLength }}
    </div>

    <!-- 🌟 VIP Shimmer Beam (ลำแสงเพชรพาดผ่านตัวการ์ด) -->
    <div v-if="isNewOrder" class="new-order-shimmer"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  index: { type: Number, required: true },
  item: { type: Object, default: () => ({}) },
  ownerCount: { type: Number, default: 0 },
  queueLength: { type: Number, default: 0 },
  isHighlighted: { type: Boolean, default: false },
  isCancelled: { type: Boolean, default: false },
  cancelledName: { type: String, default: '' },
  isNewOrder: { type: Boolean, default: false },
});

defineEmits(['select', 'show-owner']);

const formattedTime = computed(() => {
  if (!props.item.time) return '';
  const date = new Date(props.item.time);
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});

function isUnsavedOwner(name) {
  return typeof name === 'string' && name.trim().startsWith('@');
}
</script>

<style scoped>
.stock-status.unsaved-owner {
  color: #facc15 !important;
  font-weight: 700;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.45);
}

.stock-item.sold.new-order {
  animation: newOrderBlink 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  border-width: 2.5px !important;
  z-index: 10 !important;
}

.new-order-shimmer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
}

.new-order-shimmer::before {
  content: "";
  position: absolute;
  top: -60%;
  left: -120%;
  width: 60%;
  height: 220%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(254, 240, 138, 0.55) 50%,
    rgba(255, 255, 255, 0.4) 75%,
    transparent 100%
  );
  transform: rotate(25deg);
  animation: vipShimmerSweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes vipShimmerSweep {
  0% { left: -120%; }
  55%, 100% { left: 170%; }
}

@keyframes newOrderBlink {
  0%,
  100% {
    border-color: #fbbf24 !important;
    background: linear-gradient(145deg, rgba(251, 191, 36, 0.42) 0%, rgba(245, 158, 11, 0.28) 100%) !important;
    box-shadow:
      0 0 0 3px rgba(251, 191, 36, 0.55),
      0 0 30px rgba(251, 191, 36, 0.95),
      0 0 55px rgba(245, 158, 11, 0.45),
      inset 0 0 18px rgba(251, 191, 36, 0.4) !important;
    transform: scale(1.04) translateZ(0);
  }
  50% {
    border-color: #10b981 !important;
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.34) 100%) !important;
    box-shadow:
      0 0 0 1px rgba(16, 185, 129, 0.4),
      0 0 14px rgba(16, 185, 129, 0.35),
      inset 0 0 8px rgba(16, 185, 129, 0.2) !important;
    transform: scale(1.0) translateZ(0);
  }
}
</style>

<template>
  <div
    v-memo="[
      item.owner,
      item.price,
      item.backdated,
      item.time,
      ownerCount,
      queueFingerprint,
      nickname,
      isHighlighted,
      isCancelled,
      isNewOrder,
      cancelledName,
      hasAddress
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
      {{ nickname || item.owner || "ว่าง" }}
    </div>

    <div class="card-meta-row" v-if="item.owner">
      <div
        v-if="ownerCount >= 1"
        class="owner-count-badge"
        :title="`${item.owner} จองทั้งหมด ${ownerCount} ชิ้น — คลิกเพื่อจัดการ`"
        @click.stop="$emit('show-owner', item.owner)"
      >👗 {{ ownerCount }} ตัว</div>

      <div
        v-if="!hasAddress"
        class="no-addr-indicator"
        :title="`${item.owner} ยังไม่มีที่อยู่จัดส่งในระบบ`"
        @click.stop="$emit('show-owner', item.owner)"
      >
        <i class="fa-solid fa-location-dot"></i> รอที่อยู่
      </div>
    </div>

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
  queueFingerprint: { type: String, default: '' },
  nickname: { type: String, default: '' },
  isHighlighted: { type: Boolean, default: false },
  isCancelled: { type: Boolean, default: false },
  cancelledName: { type: String, default: '' },
  isNewOrder: { type: Boolean, default: false },
  hasAddress: { type: Boolean, default: true },
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
.stock-item {
  content-visibility: auto;
  contain-intrinsic-size: 110px 85px;
  aspect-ratio: 1.35;
  background: rgba(13, 17, 28, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px dashed rgba(255, 255, 255, 0.09);
  border-radius: var(--radius-md, 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  padding: 8px 6px;
  min-height: 85px;
  z-index: 0;
  backface-visibility: hidden;
  transition: transform 0.2s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.03);
}

@media (hover: hover) {
  .stock-item:hover {
    border-color: rgba(16, 185, 129, 0.45);
    background: rgba(16, 185, 129, 0.06);
    will-change: transform;
    transform: translateY(-2px) translateZ(0);
    z-index: 10;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(16, 185, 129, 0.2);
  }

  .stock-item.sold:hover {
    background: linear-gradient(145deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.45) 100%);
    border-color: #34d399;
    box-shadow: 0 8px 28px rgba(16, 185, 129, 0.35), 0 0 0 1px rgba(52, 211, 153, 0.4);
  }
}

.stock-item:active {
  will-change: transform;
  transform: scale(0.97) translateZ(0);
}

.stock-item.sold {
  background: linear-gradient(145deg, rgba(16, 185, 129, 0.17) 0%, rgba(5, 150, 105, 0.30) 100%);
  border: 1.5px solid rgba(16, 185, 129, 0.6);
  box-shadow: 0 4px 16px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.stock-num {
  font-size: 1.1em;
  font-weight: 800;
  font-family: var(--font-main, sans-serif);
  color: #fbbf24;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(251, 191, 36, 0.35);
  padding: 1px 7px;
  border-radius: var(--radius-sm, 6px);
  position: absolute;
  top: 5px;
  left: 5px;
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.3px;
  z-index: 1;
}

.stock-item:not(.sold) .stock-num {
  color: #64748b;
  border-color: rgba(255, 255, 255, 0.1);
}

.stock-status {
  font-size: 1em;
  color: #e2e8f0;
  font-weight: 600;
  text-align: center;
  width: 100%;
  padding: 0 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.25;
  margin-top: 8px;
  position: relative;
  z-index: 2;
}

.stock-item.sold .stock-status {
  color: #ffffff !important;
  font-weight: 700;
  text-shadow:
    -1px -1px 0 #000000,
     0px -1px 0 #000000,
     1px -1px 0 #000000,
    -1px  0px 0 #000000,
     1px  0px 0 #000000,
    -1px  1px 0 #000000,
     0px  1px 0 #000000,
     1px  1px 0 #000000,
     0px  2px 4px rgba(0, 0, 0, 0.95);
  letter-spacing: 0.2px;
  position: relative;
  z-index: 3;
  margin-top: 4px;
}

.stock-status.empty {
  color: var(--status-empty-color, #64748b);
  font-weight: 400;
  font-size: 0.88em;
  letter-spacing: 0.2px;
}

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

.stock-item.sold.new-order::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: calc(var(--radius-md, 12px) + 4px);
  border: 1.5px solid #fbbf24;
  pointer-events: none;
  animation: newOrderRadar 1.8s ease-out infinite;
  z-index: -1;
}

.stock-item.sold.new-order .stock-num {
  animation: newOrderNumBlink 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  z-index: 3;
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

@keyframes newOrderNumBlink {
  0%, 100% {
    color: #000000 !important;
    background: #fbbf24 !important;
    border-color: #fef08a !important;
    box-shadow: 0 0 12px rgba(251, 191, 36, 0.95);
    transform: scale(1.06);
  }
  50% {
    color: #fbbf24 !important;
    background: rgba(0, 0, 0, 0.85) !important;
    border-color: rgba(251, 191, 36, 0.35) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    transform: scale(1.0);
  }
}

@keyframes newOrderRadar {
  0% { transform: scale(0.96); opacity: 0.9; }
  70% { transform: scale(1.18); opacity: 0; }
  100% { transform: scale(1.22); opacity: 0; }
}

.queue-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: linear-gradient(135deg, #ff6d00 0%, #dd2c00 100%);
  color: #ffffff;
  border-radius: 7px;
  padding: 2px 7px;
  min-width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
  box-shadow: 0 2px 8px rgba(221, 44, 0, 0.55), 0 0 0 1px rgba(0, 0, 0, 0.3);
  z-index: 20;
  border: 1.5px solid #fde047;
}

.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 3px;
  flex-wrap: wrap;
  z-index: 2;
}

.owner-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 7px;
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.owner-count-badge:hover {
  background: rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
  transform: translateY(-1px);
}

.no-addr-indicator {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.72em;
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.45);
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: all 0.2s ease;
}

.no-addr-indicator:hover {
  background: rgba(239, 68, 68, 0.35);
  border-color: #f87171;
  color: #ffffff;
  transform: translateY(-1px);
}

.stock-item.cancelled-blink {
  animation: cancelBlink 1s ease-in-out infinite;
  z-index: 3;
}

@keyframes cancelBlink {
  0%, 100% {
    border-color: #ef4444;
    box-shadow: 0 0 18px rgba(239, 68, 68, 0.6);
    background: rgba(239, 68, 68, 0.25);
  }
  50% {
    border-color: #7f1d1d;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.15);
    background: rgba(239, 68, 68, 0.06);
  }
}

.cancelled-name {
  color: #fca5a5 !important;
  font-weight: 600;
  font-size: 0.85em !important;
  animation: cancelTextPulse 1s ease-in-out infinite;
}

@keyframes cancelTextPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.backdated-time {
  font-size: 0.7em;
  color: #fb923c;
  font-weight: 600;
  margin-top: 2px;
  background: rgba(251, 146, 60, 0.1);
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid rgba(251, 146, 60, 0.25);
  display: flex;
  align-items: center;
  gap: 3px;
  letter-spacing: 0.2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
</style>

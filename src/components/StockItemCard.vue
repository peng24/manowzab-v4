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
    draggable="false"
    @dragstart.prevent
    @click="$emit('select', index)"
    :id="`stock-${index}`"
  >
    <!-- Top Row: Item Number (Left) + Price & Queue (Right) — Zero Overlap -->
    <div class="card-top-row">
      <div class="stock-num">{{ index }}</div>

      <div class="card-top-right">
        <div
          v-if="item.price && Number(item.price) > 0"
          class="stock-price-pill"
          :title="`ราคาสินค้า: ฿${Number(item.price).toLocaleString()} บาท (คลิกเพื่อแก้ไข)`"
          @click.stop="$emit('select', index)"
        >
          ฿{{ Number(item.price).toLocaleString() }}
        </div>
        <div v-if="queueLength > 0" class="queue-badge" :title="`มีคิวสำรอง ${queueLength} คน`">
          +{{ queueLength }}
        </div>
      </div>
    </div>

    <!-- Center Body: High-Contrast Customer Name or Vacant / Cancelled -->
    <div class="card-center-body">
      <div v-if="isCancelled && !item.owner" class="stock-status cancelled-name">
        <i class="fa-solid fa-xmark cancel-x-icon"></i> {{ cancelledName }}
      </div>
      <div v-else :class="['stock-status', { empty: !item.owner, 'unsaved-owner': isUnsavedOwner(item.owner) }]">
        <span>{{ nickname || item.owner || "ว่าง" }}</span>
        <i
          v-if="item.owner && item.backdated"
          class="fa-solid fa-clock-rotate-left backdated-inline-icon"
          :title="backdatedTooltip"
        ></i>
      </div>
    </div>

    <!-- Bottom Micro-Meta Row (Subtle, Non-intrusive) -->
    <div class="card-meta-row" v-if="item.owner">
      <div
        v-if="ownerCount >= 1"
        class="owner-count-badge"
        :title="`${item.owner} จองทั้งหมด ${ownerCount} ชิ้น — คลิกเพื่อจัดการ`"
        @click.stop="$emit('show-owner', item.owner)"
      >×{{ ownerCount }}</div>

      <div
        v-if="!hasAddress"
        class="no-addr-indicator"
        :title="`${item.owner} ยังไม่มีที่อยู่จัดส่งในระบบ`"
        @click.stop="$emit('show-owner', item.owner)"
      >
        <span class="no-addr-dot"></span>รอที่อยู่
      </div>
    </div>

    <!-- 🌟 VIP Shimmer Beam (แสงทองวิ่งผ่านตอนจองใหม่) -->
    <div v-if="isNewOrder" class="new-order-shimmer"></div>
    <!-- 🚨 Cancel Flash Sweep (แสงแดงแจ้งเตือนตอนยกเลิก) -->
    <div v-if="isCancelled && !item.owner" class="cancel-flash-sweep"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getBookingTooltip } from '../utils/timeFormatUtils.js';

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

const backdatedTooltip = computed(() => {
  return getBookingTooltip(props.item.time, true);
});

function isUnsavedOwner(name) {
  return typeof name === 'string' && name.trim().startsWith('@');
}
</script>

<style scoped>
.stock-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 104px;
  min-height: 104px;
  height: auto;
  aspect-ratio: auto;
  box-sizing: border-box;
  background: rgba(10, 14, 22, 0.42);
  border: 1.5px dashed rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  position: relative;
  padding: 8px 9px;
  gap: 4px;
  z-index: 0;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  backface-visibility: hidden;
  transition:
    transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    background 0.3s ease,
    border-color 0.3s ease,
    box-shadow 0.3s ease;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35);
}

@media (hover: hover) {
  .stock-item:hover {
    border-style: solid;
    border-color: rgba(229, 184, 105, 0.55);
    background: rgba(24, 31, 48, 0.85);
    will-change: transform;
    transform: translateY(-2px) translateZ(0);
    z-index: 10;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.42);
  }

  .stock-item.sold:hover {
    background: linear-gradient(155deg, rgba(16, 185, 129, 0.82) 0%, rgba(5, 150, 105, 0.94) 55%, rgba(6, 95, 70, 1) 100%);
    border-color: #6ee7b7;
    box-shadow: 0 10px 26px rgba(16, 185, 129, 0.42), inset 0 1px 0 rgba(209, 250, 229, 0.45);
  }
}

.stock-item:active {
  will-change: transform;
  transform: scale(0.97) translateZ(0);
}

.stock-item.sold {
  background: linear-gradient(155deg, rgba(16, 185, 129, 0.68) 0%, rgba(5, 130, 92, 0.88) 55%, rgba(6, 78, 59, 0.98) 100%);
  border: 2px solid #34d399;
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.32), inset 0 1px 0 rgba(167, 243, 208, 0.38);
}

/* 🔎 Search / Jump Highlight */
.stock-item.highlight {
  border-color: #e5b869 !important;
  box-shadow:
    0 0 0 2px rgba(229, 184, 105, 0.5),
    0 0 24px rgba(229, 184, 105, 0.35) !important;
  animation: highlightFocusPulse 0.9s cubic-bezier(0.22, 1, 0.36, 1) 2;
  z-index: 12;
}

@keyframes highlightFocusPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

/* Top Row: Number Left, Price & Queue Right */
.card-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  min-height: 22px;
  z-index: 2;
}

.card-top-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.stock-num {
  font-size: 1.16em;
  font-weight: 800;
  font-family: var(--font-main, sans-serif);
  font-variant-numeric: tabular-nums;
  color: #fef08a;
  background: rgba(3, 30, 26, 0.9);
  border: 1.5px solid #facc15;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
  padding: 1.5px 8px;
  border-radius: 8px;
  line-height: 1.2;
  letter-spacing: 0.25px;
  flex-shrink: 0;
}

.stock-item:not(.sold) .stock-num {
  color: #e2e8f0;
  background: rgba(30, 41, 59, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.36);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Center Body: Clear Seller-Readable Name */
.card-center-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 30px;
  z-index: 2;
}

.stock-status {
  font-size: 1.04em;
  color: #f1f5f9;
  font-weight: 600;
  text-align: center;
  width: 100%;
  padding: 0 2px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.28;
  word-break: break-word;
}

.stock-item.sold .stock-status {
  color: #ffffff;
  font-weight: 700;
  font-size: 1.08em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
  letter-spacing: 0.15px;
}

.stock-status.empty {
  color: #475569;
  font-weight: 400;
  font-size: 0.86em;
  letter-spacing: 0.3px;
}

.stock-status.unsaved-owner {
  color: #facc15 !important;
  font-weight: 700;
}

/* ======================================================
   ✨ BOOKING ANIMATION (CF Confirmed — Pop + Gold Sweep)
   ====================================================== */
.stock-item.sold.new-order {
  animation:
    orderPopEntry 0.55s cubic-bezier(0.22, 1, 0.36, 1) 1,
    newOrderLuxPulse 1.5s ease-in-out infinite;
  border: 1.5px solid #e5b869 !important;
  z-index: 10 !important;
}

.stock-item.sold.new-order::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 17px;
  border: 1.5px solid rgba(229, 184, 105, 0.75);
  pointer-events: none;
  animation: newOrderRadar 1.6s ease-out infinite;
  z-index: -1;
}

.stock-item.sold.new-order .stock-num {
  color: #0b0f17 !important;
  background: linear-gradient(135deg, #f3cf7a 0%, #d4a145 100%) !important;
  border-color: #fef08a !important;
  box-shadow: 0 0 10px rgba(229, 184, 105, 0.6);
}

.new-order-shimmer {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}

.new-order-shimmer::before {
  content: "";
  position: absolute;
  top: -60%;
  left: -120%;
  width: 55%;
  height: 220%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(243, 207, 122, 0.45) 50%,
    rgba(255, 255, 255, 0.3) 75%,
    transparent 100%
  );
  transform: rotate(25deg);
  animation: vipShimmerSweep 1.7s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes orderPopEntry {
  0% { transform: scale(0.9) translateZ(0); }
  55% { transform: scale(1.06) translateZ(0); }
  100% { transform: scale(1) translateZ(0); }
}

@keyframes vipShimmerSweep {
  0% { left: -120%; }
  60%, 100% { left: 170%; }
}

@keyframes newOrderLuxPulse {
  0%, 100% {
    border-color: #e5b869 !important;
    background: linear-gradient(155deg, rgba(229, 184, 105, 0.48) 0%, rgba(16, 185, 129, 0.72) 52%, rgba(6, 78, 59, 0.96) 100%) !important;
    box-shadow:
      0 0 0 2px rgba(229, 184, 105, 0.45),
      0 6px 24px rgba(229, 184, 105, 0.38);
  }
  50% {
    border-color: #6ee7b7 !important;
    background: linear-gradient(155deg, rgba(16, 185, 129, 0.72) 0%, rgba(5, 130, 92, 0.9) 55%, rgba(6, 78, 59, 0.98) 100%) !important;
    box-shadow:
      0 0 0 1px rgba(110, 231, 183, 0.45),
      0 6px 20px rgba(16, 185, 129, 0.36);
  }
}

@keyframes newOrderRadar {
  0% { transform: scale(0.98); opacity: 0.85; }
  75% { transform: scale(1.12); opacity: 0; }
  100% { transform: scale(1.15); opacity: 0; }
}

/* Queue Badge (Neat Top-Right Pill) */
.queue-badge {
  background: linear-gradient(135deg, #f97316 0%, #dc2626 100%);
  color: #ffffff;
  border-radius: 6px;
  padding: 1px 6px;
  min-width: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.78em;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.25;
  border: 1px solid rgba(254, 240, 138, 0.65);
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.45);
  flex-shrink: 0;
}

/* Bottom Meta Row */
.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  flex-wrap: wrap;
  z-index: 2;
  min-height: 18px;
}

.owner-count-badge {
  display: inline-flex;
  align-items: center;
  font-size: 0.72em;
  font-variant-numeric: tabular-nums;
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.28);
  padding: 0.5px 6px;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.owner-count-badge:hover {
  background: rgba(16, 185, 129, 0.28);
  color: #ffffff;
  transform: translateY(-1px);
}

.no-addr-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7em;
  color: #fda4af;
  background: rgba(244, 63, 94, 0.14);
  border: 1px solid rgba(244, 63, 94, 0.35);
  padding: 0.5px 6px;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.no-addr-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #fb7185;
  flex-shrink: 0;
}

.no-addr-indicator:hover {
  background: rgba(244, 63, 94, 0.28);
  color: #ffffff;
}

.stock-price-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.94em;
  font-variant-numeric: tabular-nums;
  color: #fef08a;
  background: rgba(180, 118, 14, 0.34);
  border: 1.5px solid rgba(251, 191, 36, 0.78);
  padding: 1.5px 7px;
  border-radius: 8px;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.65);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.32);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.stock-price-pill:hover {
  background: rgba(217, 119, 6, 0.52);
  color: #ffffff;
  border-color: #fef08a;
}

/* High-contrast badge backing on vivid emerald sold cards */
.stock-item.sold .stock-price-pill {
  color: #fef08a;
  background: rgba(20, 18, 6, 0.8);
  border-color: #facc15;
}

.stock-item.sold .stock-price-pill:hover {
  background: rgba(36, 32, 8, 0.95);
  color: #ffffff;
  border-color: #fef08a;
}

.stock-item.sold .owner-count-badge {
  color: #a7f3d0;
  background: rgba(4, 38, 34, 0.82);
  border-color: rgba(110, 231, 183, 0.55);
}

.stock-item.sold .owner-count-badge:hover {
  background: rgba(6, 56, 48, 0.95);
  color: #ffffff;
}

.stock-item.sold .no-addr-indicator {
  color: #fecdd3;
  background: rgba(76, 5, 25, 0.88);
  border-color: rgba(251, 113, 133, 0.7);
}

.stock-item.sold .no-addr-indicator:hover {
  background: rgba(136, 19, 55, 0.95);
  color: #ffffff;
}

/* ======================================================
   🚨 CANCELLATION ANIMATION (Shake + Crimson Pulse)
   ====================================================== */
.stock-item.cancelled-blink {
  animation:
    cancelShakeEntry 0.45s cubic-bezier(0.36, 0.07, 0.19, 0.97) 1,
    cancelPulseLux 1.15s ease-in-out infinite;
  border: 1.5px solid rgba(244, 63, 94, 0.85) !important;
  z-index: 8;
}

.cancel-flash-sweep {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.cancel-flash-sweep::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(244, 63, 94, 0.28) 0%, transparent 72%);
  animation: cancelFlashFade 1.15s ease-in-out infinite;
}

@keyframes cancelShakeEntry {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px) rotate(-0.8deg); }
  40% { transform: translateX(4px) rotate(0.8deg); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@keyframes cancelPulseLux {
  0%, 100% {
    border-color: rgba(244, 63, 94, 0.9);
    box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.25), 0 6px 20px rgba(244, 63, 94, 0.35);
    background: rgba(127, 29, 29, 0.32);
  }
  50% {
    border-color: rgba(244, 63, 94, 0.38);
    box-shadow: 0 0 6px rgba(244, 63, 94, 0.15);
    background: rgba(69, 10, 10, 0.22);
  }
}

@keyframes cancelFlashFade {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.25; }
}

.cancelled-name {
  color: #fecdd3 !important;
  font-weight: 700;
  font-size: 0.92em !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 4px;
  animation: cancelTextPulse 1.15s ease-in-out infinite;
}

.cancel-x-icon {
  color: #fb7185;
  font-size: 0.95em;
}

@keyframes cancelTextPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.65; }
}

.backdated-inline-icon {
  display: inline-block;
  color: #fb923c;
  font-size: 0.78em;
  margin-left: 4px;
  vertical-align: -0.5px;
  transition: transform 0.2s ease, color 0.2s ease;
  cursor: help;
}

.backdated-inline-icon:hover {
  color: #f3cf7a;
  transform: scale(1.15);
}

@media (max-width: 768px) {
  .stock-item {
    min-height: 92px;
    padding: 6px 7px;
    border-radius: 11px;
    gap: 3px;
  }

  .stock-num {
    font-size: 1.04em;
    padding: 1px 6px;
  }

  .stock-price-pill {
    font-size: 0.86em;
    padding: 1px 6px;
  }

  .stock-status {
    font-size: 0.95em;
  }

  .stock-item.sold .stock-status {
    font-size: 0.98em;
  }
}
</style>

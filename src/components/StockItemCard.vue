<template>
  <div
    v-memo="[
      item.owner,
      item.price,
      item.details,
      item.size,
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

    <!-- Bottom Micro-Meta Row (Subtle, Non-intrusive: Count, Address, Smart Compact Size) -->
    <div class="card-meta-row" v-if="item.owner || compactSize">
      <div
        v-if="item.owner && ownerCount >= 1"
        class="owner-count-badge"
        :title="`${item.owner} จองทั้งหมด ${ownerCount} ชิ้น — คลิกเพื่อจัดการ`"
        @click.stop="$emit('show-owner', item.owner)"
      >×{{ ownerCount }}</div>

      <div
        v-if="item.owner && !hasAddress"
        class="no-addr-indicator"
        :title="`${item.owner} ยังไม่มีที่อยู่จัดส่งในระบบ`"
        @click.stop="$emit('show-owner', item.owner)"
      >
        <span class="no-addr-dot"></span>รอที่อยู่
      </div>

      <span
        v-if="compactSize"
        class="stock-size-meta"
        :title="`สเปกสินค้า: ${fullDetails} (คลิกการ์ดเพื่อแก้ไข)`"
      >{{ compactSize }}</span>
    </div>

    <!-- ✨ Floating "ใหม่" Pill (ชัดเจน ดูง่ายจากระยะไกล ไม่บังเบอร์/ชื่อ/ราคา) -->
    <div v-if="isNewOrder && item.owner" class="new-order-pill" aria-hidden="true">
      <span class="new-order-dot"></span>
      <span>ใหม่</span>
    </div>

    <!-- 🌟 VIP Shimmer Beam (แสงทองวิ่งผ่านตอนจองใหม่) -->
    <div v-if="isNewOrder && item.owner" class="new-order-shimmer" aria-hidden="true"></div>

    <!-- ⏱️ GPU Countdown Bar (8s scaleX — บอกจังหวะจองใหม่ดูง่าย) -->
    <div v-if="isNewOrder && item.owner" class="new-order-timer-track" aria-hidden="true">
      <div class="new-order-timer-fill"></div>
    </div>

    <!-- 🚨 Cancel Flash Sweep (แสงแดงแจ้งเตือนตอนยกเลิก) -->
    <div v-if="isCancelled && !item.owner" class="cancel-flash-sweep" aria-hidden="true"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getBookingTooltip } from '../utils/timeFormatUtils.js';
import { formatCompactStockSize, formatFullStockDetails } from '../utils/stockSizeUtils.js';

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

const fullDetails = computed(() => formatFullStockDetails(props.item));
const compactSize = computed(() => formatCompactStockSize(props.item));

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
    background: linear-gradient(155deg, rgba(220, 38, 38, 0.52) 0%, rgba(153, 27, 27, 0.74) 55%, rgba(92, 16, 16, 0.94) 100%);
    border-color: #fca5a5;
    box-shadow: 0 8px 22px rgba(185, 28, 28, 0.34), inset 0 1px 0 rgba(254, 202, 202, 0.28);
  }
}

.stock-item:active {
  will-change: transform;
  transform: scale(0.97) translateZ(0);
}

.stock-item.sold {
  background: linear-gradient(155deg, rgba(185, 28, 28, 0.42) 0%, rgba(127, 29, 29, 0.62) 55%, rgba(69, 10, 10, 0.88) 100%);
  border: 1.5px solid rgba(248, 113, 113, 0.65);
  box-shadow: 0 4px 14px rgba(153, 27, 27, 0.25), inset 0 1px 0 rgba(254, 202, 202, 0.16);
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
  font-size: 1.2em;
  font-weight: 800;
  font-family: var(--font-main, sans-serif);
  font-variant-numeric: tabular-nums;
  color: #fef08a;
  background: transparent;
  border: none;
  box-shadow: none;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.65);
  padding: 0 2px;
  border-radius: 0;
  line-height: 1.15;
  letter-spacing: 0.25px;
  flex-shrink: 0;
}

.stock-item:not(.sold) .stock-num {
  color: #cbd5e1;
  background: transparent;
  border: none;
  box-shadow: none;
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
   ✨ BOOKING ANIMATION (CF Confirmed — Clear Luxury Ruby-Gold Pop, 60fps GPU-Only)
   ====================================================== */
.stock-item.sold.new-order {
  animation: orderPopEntry 0.56s cubic-bezier(0.22, 1, 0.36, 1) 1;
  background: linear-gradient(
    155deg,
    rgba(217, 119, 6, 0.46) 0%,
    rgba(180, 42, 24, 0.74) 50%,
    rgba(92, 16, 16, 0.94) 100%
  );
  border: 2px solid #fde047 !important;
  box-shadow:
    0 0 0 2px rgba(250, 204, 21, 0.42),
    0 8px 26px rgba(245, 158, 11, 0.34),
    inset 0 1px 0 rgba(254, 249, 195, 0.38);
  z-index: 10 !important;
}

.stock-item.sold.new-order::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  border: 2px solid rgba(253, 224, 71, 0.85);
  pointer-events: none;
  animation: newOrderRadar 1.9s cubic-bezier(0.16, 1, 0.3, 1) 4 forwards;
  will-change: transform, opacity;
  z-index: -1;
}

/* Keep background-free stock number invariant even during new-order highlight */
.stock-item.sold.new-order .stock-num {
  color: #fef08a !important;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  text-shadow: 0 0 12px rgba(253, 224, 71, 0.9), 0 1px 3px rgba(0, 0, 0, 0.8);
}

.stock-item.sold.new-order .stock-status {
  color: #fffef0;
  animation: newOrderNameReveal 0.42s cubic-bezier(0.22, 1, 0.36, 1) 1;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.78);
}

.new-order-pill {
  position: absolute;
  top: -9px;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1.5px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fef08a 0%, #f59e0b 100%);
  color: #1c1917;
  font-size: 0.68em;
  font-weight: 800;
  letter-spacing: 0.25px;
  line-height: 1.25;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.45), 0 0 0 1.5px rgba(254, 249, 195, 0.65);
  pointer-events: none;
  z-index: 5;
  animation: newOrderBadgePop 0.48s cubic-bezier(0.22, 1, 0.36, 1) 1;
  will-change: transform, opacity;
}

.new-order-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #dc2626;
  animation: newOrderDotPulse 1.6s ease-in-out 5;
  will-change: transform, opacity;
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
  left: 0;
  width: 56%;
  height: 220%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 20%,
    rgba(254, 240, 138, 0.48) 50%,
    rgba(255, 255, 255, 0.3) 75%,
    transparent 100%
  );
  transform: translate3d(-180%, 0, 0) rotate(24deg);
  animation: vipShimmerSweep 1.9s cubic-bezier(0.4, 0, 0.2, 1) 4 forwards;
  will-change: transform;
}

.new-order-timer-track {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3.5px;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
  z-index: 4;
}

.new-order-timer-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #fde047 0%, #f59e0b 65%, #fb923c 100%);
  transform-origin: left center;
  transform: scaleX(1) translateZ(0);
  animation: newOrderCountdown 8s linear 1 forwards;
  will-change: transform;
}

@keyframes orderPopEntry {
  0% { transform: scale(0.88) translateZ(0); }
  48% { transform: scale(1.06) translateZ(0); }
  76% { transform: scale(0.99) translateZ(0); }
  100% { transform: scale(1) translateZ(0); }
}

@keyframes newOrderNameReveal {
  0% { transform: translate3d(0, 4px, 0) scale(0.94); opacity: 0.45; }
  100% { transform: translate3d(0, 0, 0) scale(1); opacity: 1; }
}

@keyframes newOrderBadgePop {
  0% { transform: translate3d(-50%, 6px, 0) scale(0.65); opacity: 0; }
  60% { transform: translate3d(-50%, -1px, 0) scale(1.08); opacity: 1; }
  100% { transform: translate3d(-50%, 0, 0) scale(1); opacity: 1; }
}

@keyframes newOrderDotPulse {
  0%, 100% { transform: scale(1) translateZ(0); opacity: 1; }
  50% { transform: scale(1.45) translateZ(0); opacity: 0.45; }
}

@keyframes vipShimmerSweep {
  0% { transform: translate3d(-180%, 0, 0) rotate(24deg); }
  100% { transform: translate3d(320%, 0, 0) rotate(24deg); }
}

@keyframes newOrderRadar {
  0% { transform: scale(0.97) translateZ(0); opacity: 0.85; }
  78% { transform: scale(1.12) translateZ(0); opacity: 0; }
  100% { transform: scale(1.14) translateZ(0); opacity: 0; }
}

@keyframes newOrderCountdown {
  0% { transform: scaleX(1) translateZ(0); }
  100% { transform: scaleX(0) translateZ(0); }
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
  font-size: 1em;
  font-variant-numeric: tabular-nums;
  color: #fbbf24;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0 2px;
  border-radius: 0;
  font-weight: 800;
  letter-spacing: 0.2px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
  cursor: pointer;
  transition: color 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
}

.stock-price-pill:hover {
  background: transparent;
  color: #ffffff;
  transform: scale(1.06);
}

/* Clean high-contrast text on deep crimson sold cards (no dark background box for num/price) */
.stock-item.sold .stock-price-pill {
  color: #fde047;
  background: transparent;
  border: none;
}

.stock-item.sold .stock-price-pill:hover {
  background: transparent;
  color: #ffffff;
}

.stock-item.sold .owner-count-badge {
  color: #fecaca;
  background: rgba(20, 8, 8, 0.45);
  border-color: rgba(254, 202, 202, 0.38);
}

.stock-item.sold .owner-count-badge:hover {
  background: rgba(69, 10, 10, 0.85);
  color: #ffffff;
}

.stock-item.sold .no-addr-indicator {
  color: #fecdd3;
  background: rgba(15, 23, 42, 0.78);
  border-color: rgba(251, 113, 133, 0.68);
}

.stock-item.sold .no-addr-indicator:hover {
  background: rgba(30, 41, 59, 0.95);
  color: #ffffff;
}

/* 📏 Smart Compact Size (Background-Free, Subtle & Scannable) */
.stock-size-meta {
  display: inline-flex;
  align-items: center;
  font-size: 0.78em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #7dd3fc;
  background: transparent;
  border: none;
  padding: 0 2px;
  line-height: 1.2;
  letter-spacing: 0.1px;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stock-item.sold .stock-size-meta {
  color: #bae6fd;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.72);
}

/* ======================================================
   🚨 CANCELLATION ANIMATION (GPU-only Shake + Soft Crimson Pulse)
   ====================================================== */
.stock-item.cancelled-blink {
  animation: cancelShakeEntry 0.42s cubic-bezier(0.36, 0.07, 0.19, 0.97) 1;
  border: 1.5px solid rgba(244, 63, 94, 0.88) !important;
  background: rgba(127, 29, 29, 0.28);
  box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.22), 0 6px 16px rgba(244, 63, 94, 0.28);
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
  background: radial-gradient(circle at center, rgba(244, 63, 94, 0.3) 0%, transparent 72%);
  animation: cancelFlashFade 1.4s ease-in-out infinite;
  will-change: opacity;
}

@keyframes cancelShakeEntry {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px) rotate(-0.8deg); }
  40% { transform: translateX(4px) rotate(0.8deg); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

@keyframes cancelFlashFade {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.2; }
}

.cancelled-name {
  color: #fecdd3 !important;
  font-weight: 700;
  font-size: 0.92em !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.cancel-x-icon {
  color: #fb7185;
  font-size: 0.95em;
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
    font-size: 1.08em;
    padding: 0 1px;
  }

  .stock-price-pill {
    font-size: 0.9em;
    padding: 0 1px;
  }

  .stock-status {
    font-size: 0.95em;
  }

  .stock-item.sold .stock-status {
    font-size: 0.98em;
  }

  .stock-size-meta {
    font-size: 0.72em;
  }

  .new-order-pill {
    top: -7px;
    padding: 1px 6px;
    font-size: 0.62em;
  }

  .new-order-timer-track {
    height: 3px;
    border-radius: 0 0 10px 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stock-item.sold.new-order,
  .stock-item.sold.new-order::after,
  .stock-item.sold.new-order .stock-status,
  .new-order-pill,
  .new-order-dot,
  .new-order-shimmer::before,
  .new-order-timer-fill {
    animation: none !important;
  }
}
</style>

<template>
  <Teleport to="body">
    <Transition name="summary-fade">
      <div v-if="isOpen" class="summary-overlay" @click.self="close">
        <Transition name="summary-slide">
          <div v-if="isOpen" class="summary-modal-container">
            
            <!-- HEADER -->
            <div class="modal-header">
              <div class="header-title-group">
                <div class="icon-badge">
                  <i class="fa-solid fa-trophy"></i>
                </div>
                <div>
                  <h2>สรุปผลการขายประจำไลฟ์</h2>
                  <p class="live-subtitle">
                    <i class="fa-brands fa-youtube" style="color: #ff0000; margin-right: 4px;"></i>
                    {{ systemStore.liveTitle || "รายการไลฟ์สด" }}
                  </p>
                </div>
              </div>
              <button class="btn-close" @click="close" title="ปิด">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- BODY -->
            <div class="modal-body">
              
              <!-- 4 MAIN KPI CARDS -->
              <div class="kpi-grid">
                <!-- Sold Items Card -->
                <div class="kpi-card sold-card">
                  <div class="kpi-icon"><i class="fa-solid fa-box-open"></i></div>
                  <div class="kpi-content">
                    <span class="kpi-label">จำนวนขายได้ทั้งหมด</span>
                    <div class="kpi-value highlight-val">{{ metrics.soldCount }} <span class="unit">ชิ้น</span></div>
                    <span class="kpi-subtext">สำเร็จ {{ metrics.soldPercent }}% ของสต็อก</span>
                  </div>
                </div>

                <!-- Stock Capacity Card -->
                <div class="kpi-card capacity-card">
                  <div class="kpi-icon"><i class="fa-solid fa-boxes-stacked"></i></div>
                  <div class="kpi-content">
                    <span class="kpi-label">ความจุสต็อกทั้งหมด</span>
                    <div class="kpi-value">{{ metrics.stockSize }} <span class="unit">ชิ้น</span></div>
                    <div class="progress-bar-bg">
                      <div class="progress-bar-fill" :style="{ width: metrics.soldPercent + '%' }"></div>
                    </div>
                  </div>
                </div>

                <!-- Buyers Card -->
                <div class="kpi-card buyers-card">
                  <div class="kpi-icon"><i class="fa-solid fa-users"></i></div>
                  <div class="kpi-content">
                    <span class="kpi-label">จำนวนลูกค้าที่สั่งได้</span>
                    <div class="kpi-value">{{ metrics.uniqueBuyersCount }} <span class="unit">ท่าน</span></div>
                    <span class="kpi-subtext">เฉลี่ย {{ metrics.avgItemsPerBuyer }} ชิ้น / คน</span>
                  </div>
                </div>

                <!-- Queue Card -->
                <div class="kpi-card queue-card">
                  <div class="kpi-icon"><i class="fa-solid fa-clock-rotate-left"></i></div>
                  <div class="kpi-content">
                    <span class="kpi-label">คิวสำรองรอหลุด</span>
                    <div class="kpi-value">{{ metrics.totalQueued }} <span class="unit">รายการ</span></div>
                    <span class="kpi-subtext" v-if="metrics.mostQueuedItem">
                      คิวยาวสุด: เบอร์ {{ metrics.mostQueuedItem.number }} ({{ metrics.mostQueuedItem.queueLength }} คิว)
                    </span>
                    <span class="kpi-subtext" v-else>ไม่มีคิวสำรอง</span>
                  </div>
                </div>
              </div>

              <!-- TWO COLUMN CONTENT -->
              <div class="content-columns">
                
                <!-- TOP BUYERS COLUMN -->
                <div class="column-panel top-buyers-panel">
                  <div class="panel-header">
                    <h3><i class="fa-solid fa-crown" style="color: #f59e0b;"></i> ลูกค้ายอดเยี่ยม (รับสินค้ามากที่สุด)</h3>
                  </div>

                  <div class="panel-body">
                    <div class="buyer-list">
                      <div 
                        v-for="(buyer, rank) in metrics.topVolumeBuyers" 
                        :key="buyer.uid || buyer.name"
                        class="buyer-item"
                        :class="'rank-' + (rank + 1)"
                      >
                        <div class="rank-badge">
                          <i v-if="rank === 0" class="fa-solid fa-crown rank-1-icon"></i>
                          <span v-else>#{{ rank + 1 }}</span>
                        </div>
                        <div class="buyer-info">
                          <div class="buyer-name">{{ buyer.name }}</div>
                          <div class="buyer-sub">ได้รับสินค้าไปแล้ว</div>
                        </div>
                        <div class="buyer-volume">{{ buyer.itemsCount }} ชิ้น</div>
                      </div>

                      <div v-if="metrics.topVolumeBuyers.length === 0" class="empty-state">
                        ยังไม่มีข้อมูลการสั่งซื้อ
                      </div>
                    </div>
                  </div>
                </div>

                <!-- HIGHLIGHTS & STREAM STATS COLUMN -->
                <div class="column-panel highlights-panel">
                  <div class="panel-header">
                    <h3><i class="fa-solid fa-fire" style="color: #ef4444;"></i> ไฮไลท์ & สถิติไลฟ์</h3>
                  </div>

                  <div class="panel-body">
                    <div class="highlight-cards-grid">
                      <!-- Avg Items per Buyer -->
                      <div class="highlight-box">
                        <div class="box-icon" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">
                          <i class="fa-solid fa-chart-pie"></i>
                        </div>
                        <div class="box-details">
                          <span class="box-title">อัตราส่วนการซื้อเฉลี่ย</span>
                          <div class="box-value">
                            {{ metrics.avgItemsPerBuyer }} ชิ้น <span class="box-sub">ต่อลูกค้า 1 ท่าน</span>
                          </div>
                        </div>
                      </div>

                      <!-- Most Queued Item -->
                      <div class="highlight-box">
                        <div class="box-icon" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">
                          <i class="fa-solid fa-fire-flame-curved"></i>
                        </div>
                        <div class="box-details">
                          <span class="box-title">สินค้ายอดฮิต (คิวยาวสุด)</span>
                          <div v-if="metrics.mostQueuedItem" class="box-value">
                            เบอร์ {{ metrics.mostQueuedItem.number }} ({{ metrics.mostQueuedItem.queueLength }} คิวสำรอง)
                            <span class="box-sub">เจ้าของ: {{ metrics.mostQueuedItem.owner }}</span>
                          </div>
                          <div v-else class="box-value muted">ไม่มีคิวสำรอง</div>
                        </div>
                      </div>

                      <!-- Stream Duration & Chat count -->
                      <div class="highlight-box">
                        <div class="box-icon" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">
                          <i class="fa-solid fa-stopwatch"></i>
                        </div>
                        <div class="box-details">
                          <span class="box-title">ระยะเวลาไลฟ์สด</span>
                          <div class="box-value">
                            {{ metrics.streamDurationText }}
                            <span class="box-sub">รวม {{ chatStore.fullChatLog.length }} คอมเมนต์</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <!-- FOOTER QUICK ACTIONS -->
            <div class="modal-footer">
              <div class="footer-left">
                <button class="btn btn-primary-gradient" @click="copySummaryText">
                  <i class="fa-solid fa-copy"></i> คัดลอกสรุปข้อความ ( Copy )
                </button>
              </div>

              <div class="footer-right">
                <button class="btn btn-outline" @click="handleOpenShipping">
                  <i class="fa-solid fa-truck-fast"></i> ระบบจัดส่ง
                </button>
                <button class="btn btn-outline" @click="handleOpenHistory">
                  <i class="fa-solid fa-clock-rotate-left"></i> ดูประวัติย้อนหลัง
                </button>
                <button class="btn btn-secondary" @click="close">
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import { useSystemStore } from "../stores/system";
import { useStockStore } from "../stores/stock";
import { useChatStore } from "../stores/chat";
import { triggerCelebration } from "../utils/celebration";
import Swal from "sweetalert2";

const isOpen = ref(false);

const systemStore = useSystemStore();
const stockStore = useStockStore();
const chatStore = useChatStore();

const openShippingManager = inject("openShippingManager", null);
const openHistory = inject("openHistory", null);

// Calculated Summary Metrics (Excluding Prices)
const metrics = computed(() => {
  const stockData = stockStore.stockData || {};
  const stockSize = stockStore.stockSize > 0 ? stockStore.stockSize : 70;

  let soldCount = 0;
  let totalQueued = 0;
  const buyersMap = {};
  let mostQueuedItem = null;

  Object.entries(stockData).forEach(([numStr, item]) => {
    if (item && item.owner) {
      soldCount++;

      // Map Buyer Volume Stats
      const buyerKey = item.uid || item.owner;
      if (!buyersMap[buyerKey]) {
        buyersMap[buyerKey] = {
          name: item.owner,
          uid: item.uid || "",
          itemsCount: 0,
        };
      }
      buyersMap[buyerKey].itemsCount += 1;
    }

    // Track Queue
    if (item && item.queue && Array.isArray(item.queue)) {
      const qLen = item.queue.length;
      totalQueued += qLen;
      if (qLen > 0 && (!mostQueuedItem || qLen > (mostQueuedItem.queueLength || 0))) {
        mostQueuedItem = {
          number: numStr,
          owner: item.owner || "ยังไม่มีผู้จองหลัก",
          queueLength: qLen,
        };
      }
    }
  });

  const uniqueBuyersList = Object.values(buyersMap);
  const uniqueBuyersCount = uniqueBuyersList.length;

  const soldPercent = Math.round((soldCount / stockSize) * 100);
  const avgItemsPerBuyer = uniqueBuyersCount > 0 ? (soldCount / uniqueBuyersCount).toFixed(1) : "0.0";

  // Top Volume Buyers
  const topVolumeBuyers = [...uniqueBuyersList]
    .sort((a, b) => b.itemsCount - a.itemsCount)
    .slice(0, 5);

  // Stream Duration Text
  let streamDurationText = "ไม่สามารถคำนวณได้";
  if (chatStore.streamStartTime) {
    const diffMs = Date.now() - chatStore.streamStartTime;
    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours > 0) {
      streamDurationText = `${hours} ชม. ${mins} นาที`;
    } else {
      streamDurationText = `${mins} นาที`;
    }
  }

  return {
    soldCount,
    stockSize,
    soldPercent,
    uniqueBuyersCount,
    avgItemsPerBuyer,
    totalQueued,
    mostQueuedItem,
    topVolumeBuyers,
    streamDurationText,
  };
});

function open() {
  isOpen.value = true;
  // 🎉 Trigger Confetti Celebration when modal opens
  triggerCelebration(100);
}

function close() {
  isOpen.value = false;
}

function handleOpenShipping() {
  close();
  if (openShippingManager) openShippingManager();
}

function handleOpenHistory() {
  close();
  if (openHistory) openHistory();
}

// Copy Text Summary for Line / FB Page (No prices)
function copySummaryText() {
  const m = metrics.value;
  const title = systemStore.liveTitle || "ไลฟ์สด";

  let text = `🎉 สรุปผลการขายประจำไลฟ์!\n`;
  text += `📌 หัวข้อ: ${title}\n`;
  text += `📦 ขายได้ทั้งหมด: ${m.soldCount} / ${m.stockSize} ชิ้น (${m.soldPercent}%)\n`;
  text += `👥 จำนวนลูกค้าทั้งหมด: ${m.uniqueBuyersCount} ท่าน\n`;
  text += `📊 เฉลี่ย ${m.avgItemsPerBuyer} ชิ้น / คน\n`;
  text += `⏳ คิวสำรองรอหลุด: ${m.totalQueued} รายการ\n`;

  if (m.topVolumeBuyers.length > 0) {
    text += `\n🏆 Top Buyers ประจำไลฟ์ (เหมาสินค้าสูงสุด):\n`;
    m.topVolumeBuyers.slice(0, 3).forEach((b, idx) => {
      const medals = ["👑", "🥈", "🥉"];
      text += `${medals[idx] || "•"} ${b.name} - ${b.itemsCount} ชิ้น\n`;
    });
  }

  text += `\nขอบคุณลูกค้าทุกท่านที่มาอุดหนุนครับ/ค่ะ 🙏✨`;

  navigator.clipboard.writeText(text).then(() => {
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: "คัดลอกสรุปข้อความแล้ว!",
      showConfirmButton: false,
      timer: 2000,
    });
  }).catch(() => {
    Swal.fire({
      icon: "error",
      title: "คัดลอกไม่สำเร็จ",
      text: "โปรดลองคัดลอกใหม่อีกครั้ง",
    });
  });
}

defineExpose({
  open,
  close,
  isOpen,
});
</script>

<style scoped>
/* Overlay & Container Transitions */
.summary-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.summary-fade-enter-active,
.summary-fade-leave-active {
  transition: opacity 0.3s ease;
}

.summary-fade-enter-from,
.summary-fade-leave-to {
  opacity: 0;
}

.summary-slide-enter-active,
.summary-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.summary-slide-enter-from,
.summary-slide-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(12px);
}

.summary-modal-container {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(56, 189, 248, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
}

/* Modal Header */
.modal-header {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(15, 23, 42, 0.95));
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title-group {
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon-badge {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4em;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.35em;
  font-weight: 700;
  color: #ffffff;
}

.live-subtitle {
  margin: 2px 0 0 0;
  font-size: 0.85em;
  color: #94a3b8;
  display: flex;
  align-items: center;
}

.btn-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1em;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}

/* Modal Body */
.modal-body {
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 4 KPI Cards Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.kpi-card {
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
}

.kpi-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2em;
  flex-shrink: 0;
}

.sold-card .kpi-icon {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.capacity-card .kpi-icon {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.buyers-card .kpi-icon {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.queue-card .kpi-icon {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.kpi-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.kpi-label {
  font-size: 0.78em;
  color: #94a3b8;
  font-weight: 500;
}

.kpi-value {
  font-size: 1.4em;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1.2;
}

.highlight-val {
  color: #38bdf8;
}

.unit {
  font-size: 0.6em;
  font-weight: 500;
  color: #94a3b8;
}

.kpi-subtext {
  font-size: 0.72em;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress bar inside Capacity Card */
.progress-bar-bg {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin: 6px 0 2px 0;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 2px;
  transition: width 0.5s ease;
}

/* Two Columns Layout */
.content-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 768px) {
  .content-columns {
    grid-template-columns: 1fr;
  }
}

.column-panel {
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.02em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
}

/* Buyer List Items */
.buyer-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.buyer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 10px 12px;
  border-radius: 10px;
}

.buyer-item.rank-1 {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(30, 41, 59, 0.6));
  border-color: rgba(245, 158, 11, 0.3);
}

.rank-badge {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  font-weight: 700;
  color: #94a3b8;
}

.rank-1-icon {
  font-size: 1.1em;
  color: #f59e0b;
}

.buyer-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.buyer-name {
  font-weight: 600;
  font-size: 0.9em;
  color: #f1f5f9;
}

.buyer-sub {
  font-size: 0.75em;
  color: #64748b;
}

.buyer-volume {
  font-weight: 700;
  font-size: 0.95em;
  color: #38bdf8;
}

.empty-state {
  text-align: center;
  color: #64748b;
  padding: 20px;
  font-size: 0.85em;
}

/* Highlight boxes */
.highlight-cards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.highlight-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 10px;
}

.box-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1em;
  flex-shrink: 0;
}

.box-details {
  display: flex;
  flex-direction: column;
}

.box-title {
  font-size: 0.75em;
  color: #94a3b8;
}

.box-value {
  font-size: 0.92em;
  font-weight: 700;
  color: #f8fafc;
}

.box-value.muted {
  color: #64748b;
  font-weight: 400;
}

.box-sub {
  font-size: 0.8em;
  font-weight: 400;
  color: #94a3b8;
  margin-left: 6px;
}

/* Modal Footer */
.modal-footer {
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-primary-gradient {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #ffffff;
  border: 1px solid rgba(56, 189, 248, 0.3);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
}

.btn-primary-gradient:hover {
  background: linear-gradient(135deg, #0369a1, #075985);
  transform: translateY(-1px);
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
}

.btn-outline:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
}
</style>

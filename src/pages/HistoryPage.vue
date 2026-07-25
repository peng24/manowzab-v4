<template>
  <div class="history-page-layout">
    <!-- TOP NAVIGATION BAR -->
    <header class="page-nav-bar">
      <div class="nav-brand">
        <a :href="baseUrl" class="brand-link">
          <i class="fa-solid fa-bolt brand-icon"></i>
          <span class="brand-name">MANOWZAB</span>
        </a>
        <span class="nav-divider">/</span>
        <span class="nav-title"><i class="fa-solid fa-clock-rotate-left"></i> ประวัติการขาย (History Page)</span>
      </div>

      <div class="nav-actions">
        <a :href="baseUrl" class="nav-btn">
          <i class="fa-solid fa-house"></i> หน้าหลักแดชบอร์ด
        </a>
        <a :href="`${baseUrl}shipping/`" class="nav-btn">
          <i class="fa-solid fa-truck-fast"></i> รายการจัดส่ง
        </a>
      </div>
    </header>

    <!-- FULL PAGE HISTORY INTERFACE -->
    <div class="history-page-body">
      <HistoryModalContent />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useNicknameStore } from "../stores/nickname";
import HistoryModalContent from "../components/HistoryModal.vue";

const baseUrl = import.meta.env.BASE_URL || "/";
const nicknameStore = useNicknameStore();

onMounted(() => {
  nicknameStore.initNicknameListener();
});
</script>

<style>
@import "../assets/style.css";

html, body, #history-app {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #0b0f19;
  font-family: var(--font-main, 'Kanit', sans-serif);
  color: #f8fafc;
}

.history-page-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at top right, rgba(0, 230, 118, 0.04), transparent 40%),
              radial-gradient(circle at bottom left, rgba(124, 77, 255, 0.04), transparent 40%),
              #0b0f19;
}

.page-nav-bar {
  height: 52px;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: #ffffff;
  font-weight: 800;
  font-size: 1.1em;
  letter-spacing: 0.5px;
}

.brand-icon {
  color: #00e676;
  filter: drop-shadow(0 0 6px rgba(0, 230, 118, 0.6));
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
  font-weight: 300;
}

.nav-title {
  color: #cbd5e1;
  font-size: 0.95em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-title i {
  color: #38bdf8;
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  padding: 6px 14px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 0.88em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.history-page-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* Make HistoryModal inside HistoryPage render full screen without popup overlay backdrop */
.history-page-body .dashboard-overlay {
  position: relative !important;
  inset: auto !important;
  width: 100% !important;
  height: 100% !important;
  background: transparent !important;
  padding: 0 !important;
  display: block !important;
}

.history-page-body .history-modal-container {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.history-page-body .modal-header {
  display: none !important;
}
</style>

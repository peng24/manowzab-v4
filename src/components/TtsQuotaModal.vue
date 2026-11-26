<template>
  <Teleport to="body">
    <Transition name="tts-quota-fade">
      <div v-if="isOpen" class="tts-quota-overlay" @click.self="close">
        <div class="tts-quota-modal" role="dialog" aria-modal="true" aria-label="โควตาตัวอักษรเสียง TTS">
          <div class="tts-quota-header">
            <div class="tts-quota-title-row">
              <div class="tts-quota-title-group">
                <div class="tts-header-icon">
                  <i class="fa-solid fa-gauge-high"></i>
                </div>
                <div>
                  <div class="tts-quota-title">
                    <span>โควตาเสียงอ่าน TTS</span>
                    <span class="tts-month-pill">{{ thaiMonthLabel }}</span>
                  </div>
                  <p class="tts-quota-subtitle">
                    ซิงค์รวมทุกเครื่อง • รีเซ็ตอัตโนมัติ: <strong>{{ nextResetLabel }}</strong>
                  </p>
                </div>
              </div>
              <button type="button" class="tts-quota-close" @click="close" title="ปิด (Esc)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          <div class="tts-quota-body">
            <!-- Current Mode Summary -->
            <div class="tts-status-banner" :class="`level-${overallLevel}`">
              <i :class="overallLevel === 'danger' ? 'fa-solid fa-circle-exclamation' : overallLevel === 'warn' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
              <span>{{ statusHeadline }}</span>
            </div>

            <!-- Chirp 3: HD Card -->
            <div class="tts-tier-card" :class="[`level-${chirp3.level}`, { 'is-active-tier': isChirpActive }]">
              <div class="tier-top">
                <div>
                  <div class="tier-name">
                    <span class="tier-badge chirp">A / C</span>
                    <span>Chirp 3: HD (Achernar &amp; Aoede)</span>
                    <span v-if="isChirpActive" class="tier-live-tag">กำลังใช้งาน</span>
                  </div>
                  <div class="tier-sub">สลับไป Standard-A อัตโนมัติเมื่อถึง 90% ({{ chirp3.autoSwitchThreshold.toLocaleString() }})</div>
                </div>
                <div class="tier-percent">{{ chirp3.percent }}%</div>
              </div>
              <div class="tier-bar-wrap">
                <div class="tier-bar-fill" :style="{ width: `${Math.min(100, chirp3.percent)}%` }"></div>
                <div class="tier-threshold-mark" style="left: 90%;" title="จุดสลับอัตโนมัติ 90%"></div>
              </div>
              <div class="tier-numbers">
                <span>ใช้แล้ว <strong>{{ chirp3.used.toLocaleString() }}</strong> / {{ chirp3.monthlyLimit.toLocaleString() }}</span>
                <span>เหลือก่อนสลับ <strong>{{ chirp3.remainingBeforeSwitch.toLocaleString() }}</strong></span>
              </div>
            </div>

            <!-- Standard-A Card -->
            <div class="tts-tier-card" :class="[`level-${standard.level}`, { 'is-active-tier': isStandardActive }]">
              <div class="tier-top">
                <div>
                  <div class="tier-name">
                    <span class="tier-badge standard">S</span>
                    <span>Google Standard (สำรอง)</span>
                    <span v-if="isStandardActive" class="tier-live-tag">กำลังใช้งาน</span>
                  </div>
                  <div class="tier-sub">สลับไปเสียงในเครื่องอัตโนมัติเมื่อถึง 90% ({{ standard.autoSwitchThreshold.toLocaleString() }})</div>
                </div>
                <div class="tier-percent">{{ standard.percent }}%</div>
              </div>
              <div class="tier-bar-wrap">
                <div class="tier-bar-fill" :style="{ width: `${Math.min(100, standard.percent)}%` }"></div>
                <div class="tier-threshold-mark" style="left: 90%;" title="จุดสลับอัตโนมัติ 90%"></div>
              </div>
              <div class="tier-numbers">
                <span>ใช้แล้ว <strong>{{ standard.used.toLocaleString() }}</strong> / {{ standard.monthlyLimit.toLocaleString() }}</span>
                <span>เหลือก่อนสลับ <strong>{{ standard.remainingBeforeSwitch.toLocaleString() }}</strong></span>
              </div>
            </div>

            <!-- Auto-switch Toggle -->
            <label class="tts-autoswitch-row">
              <div>
                <div class="autoswitch-title">สลับไปใช้อันอื่นอัตโนมัติเมื่อใกล้เต็ม (90%)</div>
                <div class="autoswitch-desc">Chirp 3: HD ➔ Standard-A ➔ เสียงในเครื่อง (ฟรี)</div>
              </div>
              <input
                type="checkbox"
                class="tts-switch-input"
                :checked="systemStore.ttsAutoSwitchEnabled"
                @change="onToggleAutoSwitch($event.target.checked)"
              />
            </label>

            <!-- Collapsible Calibration / Reset Controls -->
            <div class="tts-calibration-box">
              <div class="calib-header">
                <button type="button" class="calib-toggle-btn" @click="showCalibration = !showCalibration">
                  <i class="fa-solid fa-sliders"></i>
                  <span>ปรับตัวเลขให้ตรงกับ Google Cloud</span>
                  <i :class="showCalibration ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'"></i>
                </button>
                <button type="button" class="calib-reset-btn" @click="handleReset">
                  <i class="fa-solid fa-rotate-left"></i> รีเซ็ต 0
                </button>
              </div>
              <div v-if="showCalibration" class="calib-inputs">
                <label>
                  <span>Chirp 3: HD ใช้แล้ว</span>
                  <input v-model.number="editChirp3" type="number" min="0" step="1000" />
                </label>
                <label>
                  <span>Standard ใช้แล้ว</span>
                  <input v-model.number="editStandard" type="number" min="0" step="1000" />
                </label>
                <button type="button" class="calib-save-btn" @click="handleSaveCalibration">
                  บันทึกค่า
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import Swal from "sweetalert2";
import { useSystemStore } from "../stores/system";
import { getNextTtsResetLabel, formatThaiQuotaMonth } from "../utils/ttsQuota";

const systemStore = useSystemStore();
const isOpen = ref(false);
const showCalibration = ref(false);
const editChirp3 = ref(0);
const editStandard = ref(0);
const thaiMonthLabel = computed(() => formatThaiQuotaMonth(systemStore.ttsUsage.month));
const nextResetLabel = computed(() => {
  void systemStore.ttsUsage.month;
  return getNextTtsResetLabel();
});

const chirp3 = computed(() => systemStore.chirp3QuotaStatus);
const standard = computed(() => systemStore.standardQuotaStatus);
const isChirpActive = computed(() => systemStore.ttsVoiceMode === "achernar" || systemStore.ttsVoiceMode === "chirp3");
const isStandardActive = computed(() => systemStore.ttsVoiceMode === "standard");

const overallLevel = computed(() => {
  if (chirp3.value.isNearLimit || standard.value.isNearLimit) return "danger";
  if (chirp3.value.isWarning || standard.value.isWarning) return "warn";
  return "ok";
});

const statusHeadline = computed(() => {
  const mode = systemStore.ttsVoiceMode;
  if (mode === "native") {
    return standard.value.isNearLimit
      ? "โควตา Google Cloud ใกล้เต็มแล้ว — กำลังใช้เสียงในเครื่อง (ฟรีไม่จำกัด)"
      : "กำลังใช้เสียงในเครื่อง (ไม่ใช้โควตา Google Cloud)";
  }
  if (mode === "standard") {
    if (standard.value.isNearLimit) {
      return "คำเตือน: โควตา Standard-A ใกล้เต็ม (>= 90%) — แนะนำสลับเป็นเสียงในเครื่อง";
    }
    return chirp3.value.isNearLimit
      ? "โควตา Chirp 3: HD ใกล้เต็ม (>= 90%) — สลับมาใช้ Standard-A แล้ว"
      : "กำลังใช้ Google Cloud Standard (th-TH-Standard-A)";
  }
  const voiceLabel = mode === "achernar" ? "Achernar" : "Aoede";
  if (chirp3.value.isNearLimit) {
    return `คำเตือน: โควตา Chirp 3: HD (${voiceLabel}) ใกล้เต็ม (>= 90%)`;
  }
  if (chirp3.value.isWarning) {
    return `ใกล้ถึงเกณฑ์เตือน — กำลังใช้ Chirp 3: HD (${voiceLabel})`;
  }
  return `ปกติ — กำลังใช้ Chirp 3: HD (${voiceLabel})`;
});

function open() {
  systemStore.ensureCurrentQuotaMonth?.();
  editChirp3.value = systemStore.ttsUsage.chirp3;
  editStandard.value = systemStore.ttsUsage.standard;
  showCalibration.value = false;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

function onToggleAutoSwitch(checked) {
  systemStore.setTtsAutoSwitchEnabled(checked);
}

async function handleSaveCalibration() {
  await systemStore.setTtsUsageCalibration({
    chirp3: editChirp3.value,
    standard: editStandard.value,
  });
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: "อัปเดตตัวนับโควตา TTS แล้ว",
    showConfirmButton: false,
    timer: 1800,
  });
}

async function handleReset() {
  await systemStore.resetTtsUsageMonth();
  editChirp3.value = 0;
  editStandard.value = 0;
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "info",
    title: "รีเซ็ตตัวนับโควตาเดือนนี้เป็น 0 แล้ว",
    showConfirmButton: false,
    timer: 1800,
  });
}

function onKeyDown(e) {
  if (e.key === "Escape" && isOpen.value) {
    close();
  }
}

onMounted(() => window.addEventListener("keydown", onKeyDown));
onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

defineExpose({ open, close });
</script>

<style scoped>
.tts-quota-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, 0.78);
  backdrop-filter: blur(6px);
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.tts-quota-modal {
  width: 100%;
  max-width: 520px;
  max-height: 92vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #111827 0%, #0b0f19 100%);
  border: 1px solid rgba(229, 184, 105, 0.24);
  border-radius: 18px;
  box-shadow: 0 28px 65px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.04) inset;
  color: #f8fafc;
  animation: modalPop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  0% { transform: scale(0.95); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.tts-quota-header {
  padding: 16px 20px 14px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.tts-quota-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tts-quota-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tts-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.32);
  color: #7dd3fc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.tts-quota-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #f8fafc;
  flex-wrap: wrap;
}

.tts-month-pill {
  font-size: 0.74rem;
  font-weight: 700;
  background: rgba(229, 184, 105, 0.14);
  color: #f3cf7a;
  border: 1px solid rgba(229, 184, 105, 0.35);
  border-radius: 999px;
  padding: 2px 9px;
}

.tts-quota-close {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.tts-quota-close:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fecaca;
}

.tts-quota-subtitle {
  margin: 4px 0 0;
  font-size: 0.78rem;
  color: #94a3b8;
}

.tts-quota-subtitle strong {
  color: #e2e8f0;
}

.tts-quota-body {
  padding: 16px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tts-status-banner {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 13px;
  border-radius: 11px;
  font-size: 0.85rem;
  font-weight: 600;
}

.tts-status-banner.level-ok {
  background: rgba(16, 185, 129, 0.13);
  border: 1px solid rgba(16, 185, 129, 0.32);
  color: #6ee7b7;
}

.tts-status-banner.level-warn {
  background: rgba(245, 158, 11, 0.14);
  border: 1px solid rgba(245, 158, 11, 0.38);
  color: #fcd34d;
}

.tts-status-banner.level-danger {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.38);
  color: #fca5a5;
}

.tts-tier-card {
  background: rgba(30, 41, 59, 0.56);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 13px;
  padding: 13px 15px;
  transition: border-color 0.2s ease;
}

.tts-tier-card.is-active-tier {
  border-color: rgba(229, 184, 105, 0.38);
  background: rgba(30, 41, 59, 0.78);
}

.tier-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.tier-name {
  display: flex;
  align-items: center;
  gap: 7px;
  font-weight: 700;
  font-size: 0.91rem;
  flex-wrap: wrap;
}

.tier-badge {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 1px 7px;
  border-radius: 6px;
}

.tier-badge.chirp {
  background: rgba(56, 189, 248, 0.18);
  color: #7dd3fc;
}

.tier-badge.standard {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.tier-live-tag {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(229, 184, 105, 0.16);
  color: #f3cf7a;
  border: 1px solid rgba(229, 184, 105, 0.35);
}

.tier-sub {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 3px;
}

.tier-percent {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  font-size: 1.05rem;
  color: #f8fafc;
}

.tier-bar-wrap {
  position: relative;
  height: 10px;
  background: rgba(2, 6, 23, 0.75);
  border-radius: 999px;
  overflow: hidden;
  margin: 10px 0 8px;
}

.tier-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8, #34d399);
  transition: width 0.25s ease;
}

.level-warn .tier-bar-fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.level-danger .tier-bar-fill {
  background: linear-gradient(90deg, #ef4444, #f87171);
}

.tier-threshold-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(243, 207, 122, 0.85);
}

.tier-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  gap: 8px;
  flex-wrap: wrap;
}

.tts-autoswitch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 13px;
  background: rgba(30, 41, 59, 0.42);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 11px;
  cursor: pointer;
}

.autoswitch-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #f1f5f9;
}

.autoswitch-desc {
  font-size: 0.74rem;
  color: #94a3b8;
  margin-top: 2px;
}

.tts-switch-input {
  width: 18px;
  height: 18px;
  accent-color: #38bdf8;
  cursor: pointer;
  flex-shrink: 0;
}

.tts-calibration-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 11px;
  padding: 9px 12px;
}

.calib-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.calib-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 2px 0;
  cursor: pointer;
}

.calib-toggle-btn:hover {
  color: #e2e8f0;
}

.calib-reset-btn {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.28);
  color: #fca5a5;
  font-size: 0.74rem;
  padding: 3px 9px;
  border-radius: 7px;
  cursor: pointer;
}

.calib-reset-btn:hover {
  background: rgba(239, 68, 68, 0.22);
}

.calib-inputs {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed rgba(148, 163, 184, 0.16);
}

.calib-inputs label {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.74rem;
  color: #cbd5e1;
}

.calib-inputs input {
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f8fafc;
  border-radius: 7px;
  padding: 6px 9px;
  font-size: 0.84rem;
  font-family: var(--font-mono);
}

.calib-save-btn {
  background: rgba(229, 184, 105, 0.18);
  border: 1px solid rgba(229, 184, 105, 0.45);
  color: #fde68a;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 7px 13px;
  border-radius: 7px;
  cursor: pointer;
}

.calib-save-btn:hover {
  background: rgba(229, 184, 105, 0.28);
}

.tts-quota-fade-enter-active,
.tts-quota-fade-leave-active {
  transition: opacity 0.18s ease;
}
.tts-quota-fade-enter-from,
.tts-quota-fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <Teleport to="body">
    <Transition name="tts-quota-fade">
      <div v-if="isOpen" class="tts-quota-overlay" @click.self="close">
        <div class="tts-quota-modal" role="dialog" aria-modal="true" aria-label="โควตาตัวอักษรเสียง TTS">
          <div class="tts-quota-header">
            <div class="tts-quota-title-row">
              <div class="tts-quota-title">
                <i class="fa-solid fa-gauge-high" style="color: #38bdf8;"></i>
                <span>โควตาเสียงอ่าน TTS รายเดือน</span>
                <span class="tts-month-pill">{{ systemStore.ttsUsage.month }}</span>
              </div>
              <button type="button" class="tts-quota-close" @click="close" title="ปิด (Esc)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <p class="tts-quota-subtitle">
              นับตัวอักษรจริงที่ส่งไป Google Cloud TTS (นับรวมทุกเครื่องที่ล็อกอินบัญชีเดียวกัน • รีเซ็ตทุกวันที่ 1 UTC)
            </p>
          </div>

          <div class="tts-quota-body">
            <!-- Current Mode Summary -->
            <div class="tts-status-banner" :class="`level-${overallLevel}`">
              <i :class="overallLevel === 'danger' ? 'fa-solid fa-circle-exclamation' : overallLevel === 'warn' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-check'"></i>
              <span>{{ statusHeadline }}</span>
            </div>

            <!-- Chirp 3: HD Card -->
            <div class="tts-tier-card" :class="`level-${chirp3.level}`">
              <div class="tier-top">
                <div>
                  <div class="tier-name">
                    <span class="tier-badge chirp">A / C</span>
                    Chirp 3: HD (Achernar &amp; Aoede)
                  </div>
                  <div class="tier-sub">สลับอัตโนมัติไป Standard-A เมื่อถึง 90% ({{ chirp3.autoSwitchThreshold.toLocaleString() }})</div>
                </div>
                <div class="tier-percent">{{ chirp3.percent }}%</div>
              </div>
              <div class="tier-bar-wrap">
                <div class="tier-bar-fill" :style="{ width: `${Math.min(100, chirp3.percent)}%` }"></div>
                <div class="tier-threshold-mark" style="left: 90%;" title="จุดสลับอัตโนมัติ 90%"></div>
              </div>
              <div class="tier-numbers">
                <span>ใช้แล้ว <strong>{{ chirp3.used.toLocaleString() }}</strong> / {{ chirp3.monthlyLimit.toLocaleString() }} ตัวอักษร</span>
                <span>เหลือก่อนสลับ <strong>{{ chirp3.remainingBeforeSwitch.toLocaleString() }}</strong></span>
              </div>
            </div>

            <!-- Standard-A Card -->
            <div class="tts-tier-card" :class="`level-${standard.level}`">
              <div class="tier-top">
                <div>
                  <div class="tier-name">
                    <span class="tier-badge standard">S</span>
                    Google Cloud Standard (th-TH-Standard-A)
                  </div>
                  <div class="tier-sub">สลับอัตโนมัติไปเสียงในเครื่องเมื่อถึง 90% ({{ standard.autoSwitchThreshold.toLocaleString() }})</div>
                </div>
                <div class="tier-percent">{{ standard.percent }}%</div>
              </div>
              <div class="tier-bar-wrap">
                <div class="tier-bar-fill" :style="{ width: `${Math.min(100, standard.percent)}%` }"></div>
                <div class="tier-threshold-mark" style="left: 90%;" title="จุดสลับอัตโนมัติ 90%"></div>
              </div>
              <div class="tier-numbers">
                <span>ใช้แล้ว <strong>{{ standard.used.toLocaleString() }}</strong> / {{ standard.monthlyLimit.toLocaleString() }} ตัวอักษร</span>
                <span>เหลือก่อนสลับ <strong>{{ standard.remainingBeforeSwitch.toLocaleString() }}</strong></span>
              </div>
            </div>

            <!-- Auto-switch Toggle -->
            <label class="tts-autoswitch-row">
              <div>
                <div class="autoswitch-title">สลับไปใช้อันอื่นอัตโนมัติเมื่อใกล้เต็ม (90%)</div>
                <div class="autoswitch-desc">กันเกินโควตาฟรี: Chirp 3: HD ➔ Standard-A ➔ เสียงในเครื่อง (ฟรี)</div>
              </div>
              <input
                type="checkbox"
                :checked="systemStore.ttsAutoSwitchEnabled"
                @change="onToggleAutoSwitch($event.target.checked)"
              />
            </label>

            <!-- Calibration / Reset Controls -->
            <div class="tts-calibration-box">
              <div class="calib-header">
                <span><i class="fa-solid fa-sliders"></i> ปรับตัวเลขให้ตรงกับ Google Cloud Billing</span>
                <button type="button" class="calib-reset-btn" @click="handleReset">
                  <i class="fa-solid fa-rotate-left"></i> รีเซ็ตเป็น 0
                </button>
              </div>
              <div class="calib-inputs">
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

const systemStore = useSystemStore();
const isOpen = ref(false);
const editChirp3 = ref(0);
const editStandard = ref(0);

const chirp3 = computed(() => systemStore.chirp3QuotaStatus);
const standard = computed(() => systemStore.standardQuotaStatus);

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
    return chirp3.value.isNearLimit
      ? "โควตา Chirp 3: HD ใกล้เต็ม (>= 90%) — สลับมาใช้ Standard-A แล้ว"
      : "กำลังใช้ Google Cloud Standard (th-TH-Standard-A)";
  }
  const voiceLabel = mode === "achernar" ? "Achernar" : "Aoede";
  return `ปกติ — กำลังใช้ Chirp 3: HD (${voiceLabel})`;
});

function open() {
  editChirp3.value = systemStore.ttsUsage.chirp3;
  editStandard.value = systemStore.ttsUsage.standard;
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
  background: rgba(2, 6, 23, 0.72);
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
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  color: #f8fafc;
  overflow: hidden;
}

.tts-quota-header {
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.tts-quota-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.tts-quota-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.05rem;
  font-weight: 700;
}

.tts-month-pill {
  font-size: 0.76rem;
  font-family: var(--font-mono);
  background: rgba(56, 189, 248, 0.14);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 999px;
  padding: 2px 8px;
}

.tts-quota-close {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
}

.tts-quota-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.tts-quota-subtitle {
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #94a3b8;
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
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.86rem;
  font-weight: 600;
}

.tts-status-banner.level-ok {
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
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
  background: rgba(30, 41, 59, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  padding: 12px 14px;
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
  font-size: 0.92rem;
}

.tier-badge {
  font-family: var(--font-mono);
  font-size: 0.74rem;
  padding: 1px 6px;
  border-radius: 6px;
}

.tier-badge.chirp {
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
}

.tier-badge.standard {
  background: rgba(148, 163, 184, 0.2);
  color: #e2e8f0;
}

.tier-sub {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
}

.tier-percent {
  font-family: var(--font-mono);
  font-weight: 800;
  font-size: 1rem;
  color: #e2e8f0;
}

.tier-bar-wrap {
  position: relative;
  height: 10px;
  background: rgba(15, 23, 42, 0.9);
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
  background: rgba(255, 255, 255, 0.65);
}

.tier-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: #cbd5e1;
  gap: 8px;
  flex-wrap: wrap;
}

.tts-autoswitch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 10px;
  cursor: pointer;
}

.autoswitch-title {
  font-size: 0.86rem;
  font-weight: 600;
}

.autoswitch-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.tts-autoswitch-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #38bdf8;
  cursor: pointer;
}

.tts-calibration-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(148, 163, 184, 0.22);
  border-radius: 10px;
  padding: 10px 12px;
}

.calib-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  color: #94a3b8;
  margin-bottom: 8px;
}

.calib-reset-btn {
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  font-size: 0.75rem;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.calib-inputs {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  flex-wrap: wrap;
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
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 0.84rem;
  font-family: var(--font-mono);
}

.calib-save-btn {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #e0f2fe;
  font-weight: 600;
  font-size: 0.8rem;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
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

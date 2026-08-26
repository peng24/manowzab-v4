<template>
  <div class="auth-gate-overlay">
    <!-- 🌌 Cyber Grid & Background Matrix -->
    <div class="auth-grid-bg"></div>

    <!-- 🔮 Floating Aurora Glowing Orbs -->
    <div class="auth-orb orb-1"></div>
    <div class="auth-orb orb-2"></div>
    <div class="auth-orb orb-3"></div>
    <div class="auth-orb orb-4"></div>

    <!-- ✨ Floating Cyber Particles -->
    <div class="auth-particles">
      <span class="p-dot" v-for="n in 12" :key="n" :style="getParticleStyle(n)"></span>
    </div>

    <!-- 💳 Glassmorphism Auth Card -->
    <div
      class="auth-card"
      :class="{
        'shake-animation': isShaking,
        'success-unlock': isSuccess,
        'card-ready': isMounted
      }"
    >
      <!-- Animated Glowing Border Beam -->
      <div class="card-border-glow"></div>

      <!-- 🍋 Branding / Logo Header -->
      <div class="auth-brand-header">
        <div class="auth-logo-container">
          <div class="auth-logo-circle">
            <span class="auth-logo-emoji">🍋</span>
            <div class="auth-lock-badge">
              <i :class="isSuccess ? 'fa-solid fa-lock-open unlock-icon' : 'fa-solid fa-lock'"></i>
            </div>
            <!-- Radar Pulse Wave -->
            <div class="radar-wave wave-1"></div>
            <div class="radar-wave wave-2"></div>
          </div>
        </div>

        <h1 class="auth-title">
          <span class="title-gradient">MANOWZAB</span>
        </h1>
        <p class="auth-subtitle">Command Center &bull; High-Security Portal</p>

        <div class="auth-security-chip">
          <span class="chip-pulse-dot"></span>
          <i class="fa-solid fa-shield-halved"></i>
          <span>ระบบรักษาความปลอดภัยระดับสูง</span>
        </div>
      </div>

      <!-- 📝 Login Form -->
      <form @submit.prevent="handleSubmit" class="auth-form" novalidate>
        <!-- Email Input -->
        <div class="auth-field" :class="{ 'field-focused': focusedField === 'email' }">
          <label class="auth-label">
            <i class="fa-solid fa-envelope label-icon"></i>
            <span>อีเมลผู้ดูแลระบบ</span>
          </label>
          <div class="auth-input-wrapper">
            <input
              type="email"
              v-model="email"
              placeholder="peng24@gmail.com"
              class="auth-input"
              :disabled="isLoading || isSuccess || authStore.isLockedOut"
              autocomplete="username"
              required
              ref="emailInputRef"
              @focus="focusedField = 'email'"
              @blur="focusedField = null"
            />
            <span class="auth-input-icon">
              <i class="fa-solid fa-user-shield"></i>
            </span>
          </div>
        </div>

        <!-- Password Input -->
        <div class="auth-field" :class="{ 'field-focused': focusedField === 'password' }">
          <label class="auth-label">
            <i class="fa-solid fa-key label-icon"></i>
            <span>รหัสผ่านความปลอดภัย</span>
          </label>
          <div class="auth-input-wrapper">
            <input
              :type="showPassword ? 'text' : 'password'"
              v-model="password"
              placeholder="••••••••••••••••"
              class="auth-input"
              :disabled="isLoading || isSuccess || authStore.isLockedOut"
              autocomplete="current-password"
              required
              @focus="focusedField = 'password'"
              @blur="focusedField = null"
            />
            <button
              type="button"
              class="auth-eye-btn"
              @click="togglePasswordVisibility"
              tabindex="-1"
              title="แสดง/ซ่อนรหัสผ่าน"
            >
              <i
                :class="showPassword ? 'fa-solid fa-eye-slash eye-active' : 'fa-solid fa-eye'"
                class="eye-icon"
              ></i>
            </button>
          </div>
        </div>

        <!-- 🔒 Permanent Session Info Badge -->
        <div class="auth-permanent-badge">
          <span class="badge-icon-wrap">
            <i class="fa-solid fa-circle-check"></i>
          </span>
          <div class="badge-text-group">
            <span class="badge-title">เข้าสู่ระบบถาวรบนอุปกรณ์นี้</span>
            <span class="badge-sub">ไม่ต้องเข้าสู่ระบบซ้ำจนกว่าจะกดออกจากระบบ</span>
          </div>
        </div>

        <!-- ⚠️ Error Feedback Alert -->
        <transition name="alert-slide">
          <div v-if="errorMessage" class="auth-error-alert" role="alert">
            <div class="alert-icon-wrap">
              <i class="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div class="alert-text-wrap">
              <span class="alert-title">เข้าสู่ระบบไม่สำเร็จ</span>
              <span class="alert-msg">{{ errorMessage }}</span>
            </div>
          </div>
        </transition>

        <!-- ⏱️ Lockout Warning Alert -->
        <transition name="alert-slide">
          <div v-if="authStore.isLockedOut" class="auth-lockout-alert" role="alert">
            <i class="fa-solid fa-clock fa-spin"></i>
            <span>ระบบถูกระงับชั่วคราว กรุณารอ <strong>{{ countdown }}</strong> วินาที</span>
          </div>
        </transition>

        <!-- 🚀 Submit Button -->
        <button
          type="submit"
          class="auth-submit-btn"
          :class="{
            'btn-loading': isLoading,
            'btn-success': isSuccess,
            'btn-locked': authStore.isLockedOut
          }"
          :disabled="isLoading || isSuccess || authStore.isLockedOut || !email || !password"
        >
          <!-- Shimmer light sweep -->
          <span class="btn-shimmer"></span>

          <span v-if="isSuccess" class="auth-btn-content success-content">
            <i class="fa-solid fa-circle-check animate-bounce"></i> เข้าสู่ระบบสำเร็จ!
          </span>
          <span v-else-if="isLoading" class="auth-btn-spinner">
            <i class="fa-solid fa-circle-notch fa-spin"></i> กำลังตรวจสอบรหัสผ่าน...
          </span>
          <span v-else-if="authStore.isLockedOut" class="auth-btn-locked">
            <i class="fa-solid fa-lock"></i> ระงับชั่วคราว ({{ countdown }}s)
          </span>
          <span v-else class="auth-btn-content">
            <i class="fa-solid fa-arrow-right-to-bracket btn-arrow-icon"></i> เข้าสู่ระบบ Command Center
          </span>
        </button>
      </form>

      <!-- 🛡️ Security Footer Notice -->
      <div class="auth-footer">
        <p>
          <i class="fa-solid fa-shield-check"></i>
          <span>ปกป้องด้วย SHA-256 One-Way Cryptographic Hash &bull; เฉพาะแอดมินเท่านั้น</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useAuthStore } from "../stores/auth";
import Swal from "sweetalert2";

const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const showPassword = ref(false);
const isLoading = ref(false);
const isSuccess = ref(false);
const errorMessage = ref("");
const isShaking = ref(false);
const isMounted = ref(false);
const focusedField = ref(null);
const countdown = ref(0);
const emailInputRef = ref(null);

let countdownTimer = null;

function getParticleStyle(n) {
  const left = (n * 8.3) % 100;
  const delay = (n * 0.4).toFixed(1);
  const duration = (5 + (n % 4) * 2).toFixed(1);
  const size = 3 + (n % 3) * 2;
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`,
  };
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value;
}

function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdown.value = authStore.lockoutSecondsLeft;

  countdownTimer = setInterval(() => {
    countdown.value = authStore.lockoutSecondsLeft;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      errorMessage.value = "";
    }
  }, 1000);
}

watch(
  () => authStore.isLockedOut,
  (isLocked) => {
    if (isLocked) {
      startCountdown();
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  if (isLoading.value || isSuccess.value || authStore.isLockedOut) return;
  if (!email.value || !password.value) {
    triggerShake("กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน");
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";

  // Smooth verification feedback delay
  await new Promise((r) => setTimeout(r, 450));

  const result = await authStore.login(email.value, password.value);
  isLoading.value = false;

  if (result.success) {
    isSuccess.value = true;

    // Trigger success feedback
    await new Promise((r) => setTimeout(r, 600));

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `🔑 ยินดีต้อนรับคุณ ${authStore.currentUser?.email}`,
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    });
  } else {
    triggerShake(result.error);
    if (result.lockoutRemaining) {
      startCountdown();
    }
  }
}

function triggerShake(msg) {
  errorMessage.value = msg;
  isShaking.value = true;
  setTimeout(() => {
    isShaking.value = false;
  }, 650);
}

onMounted(() => {
  setTimeout(() => {
    isMounted.value = true;
  }, 50);

  if (emailInputRef.value) {
    emailInputRef.value.focus();
  }
});

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
});
</script>

<style scoped>
/* ============================================================
   🌌 CYBER GLASSMORPHISM OVERLAY & ATMOSPHERE
   ============================================================ */
.auth-gate-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at 50% 30%, #0c192c 0%, #030712 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  overflow: hidden;
  user-select: none;
}

/* Cyber Matrix Grid */
.auth-grid-bg {
  position: absolute;
  inset: -50%;
  background-image: 
    linear-gradient(rgba(14, 165, 233, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(14, 165, 233, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  transform: perspective(600px) rotateX(60deg);
  animation: gridDrift 25s linear infinite;
  pointer-events: none;
  opacity: 0.7;
}

@keyframes gridDrift {
  0% { transform: perspective(600px) rotateX(60deg) translateY(0); }
  100% { transform: perspective(600px) rotateX(60deg) translateY(40px); }
}

/* Ambient glowing orbs with organic pulse */
.auth-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.35;
  pointer-events: none;
  mix-blend-mode: screen;
}

.orb-1 {
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, #06b6d4 0%, rgba(6, 182, 212, 0) 70%);
  top: 5%;
  left: 10%;
  animation: floatOrb1 18s ease-in-out infinite alternate;
}

.orb-2 {
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, #10b981 0%, rgba(16, 185, 129, 0) 70%);
  bottom: 5%;
  right: 10%;
  animation: floatOrb2 22s ease-in-out infinite alternate;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, #6366f1 0%, rgba(99, 102, 241, 0) 70%);
  top: 50%;
  left: 50%;
  animation: floatOrb3 15s ease-in-out infinite alternate;
}

.orb-4 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, #f59e0b 0%, rgba(245, 158, 11, 0) 70%);
  bottom: 25%;
  left: 15%;
  opacity: 0.2;
  animation: floatOrb1 20s ease-in-out infinite alternate-reverse;
}

@keyframes floatOrb1 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(60px, -40px) scale(1.15); }
  100% { transform: translate(-40px, 50px) scale(0.95); }
}

@keyframes floatOrb2 {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-70px, 40px) scale(1.1); }
  100% { transform: translate(50px, -60px) scale(1.05); }
}

@keyframes floatOrb3 {
  0% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-40%, -60%) scale(1.2); }
  100% { transform: translate(-60%, -40%) scale(0.9); }
}

/* Floating Cyber Particles */
.auth-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.p-dot {
  position: absolute;
  bottom: -20px;
  background: #38bdf8;
  border-radius: 50%;
  opacity: 0.4;
  box-shadow: 0 0 8px #38bdf8;
  animation: particleRise linear infinite;
}

@keyframes particleRise {
  0% {
    transform: translateY(0) scale(0.8);
    opacity: 0;
  }
  20% {
    opacity: 0.5;
  }
  80% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-110vh) scale(1.2);
    opacity: 0;
  }
}

/* ============================================================
   💳 AUTH CARD & GLOWING BORDER BEAM
   ============================================================ */
.auth-card {
  position: relative;
  width: 100%;
  max-width: 450px;
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(45, 212, 191, 0.25);
  border-radius: 24px;
  padding: 34px 30px;
  box-shadow: 
    0 25px 60px rgba(0, 0, 0, 0.7),
    0 0 35px rgba(13, 148, 136, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  gap: 22px;
  z-index: 10;
  opacity: 0;
  transform: translateY(24px) scale(0.96);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}

.auth-card.card-ready {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.auth-card.success-unlock {
  border-color: #10b981;
  box-shadow: 0 0 50px rgba(16, 185, 129, 0.4);
  transform: scale(1.02);
}

/* Card Top Border Beam */
.card-border-glow {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #2dd4bf, #38bdf8, transparent);
  animation: borderBeam 4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes borderBeam {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

/* Shake Animation on Error */
.shake-animation {
  animation: authShake 0.6s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes authShake {
  10%, 90% { transform: translate3d(-3px, 0, 0); }
  20%, 80% { transform: translate3d(5px, 0, 0); }
  30%, 50%, 70% { transform: translate3d(-7px, 0, 0); }
  40%, 60% { transform: translate3d(7px, 0, 0); }
}

/* ============================================================
   🍋 BRAND HEADER & LOGO
   ============================================================ */
.auth-brand-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.auth-logo-container {
  position: relative;
  margin-bottom: 12px;
}

.auth-logo-circle {
  position: relative;
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.25) 0%, rgba(2, 132, 199, 0.25) 100%);
  border: 1px solid rgba(45, 212, 191, 0.45);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 25px rgba(13, 148, 136, 0.35);
  animation: logoFloat 4s ease-in-out infinite alternate;
}

@keyframes logoFloat {
  0% { transform: translateY(0); }
  100% { transform: translateY(-5px); }
}

.auth-logo-emoji {
  font-size: 34px;
  filter: drop-shadow(0 4px 10px rgba(250, 204, 21, 0.4));
  transition: transform 0.3s ease;
}

.auth-card:hover .auth-logo-emoji {
  transform: rotate(10deg) scale(1.1);
}

.auth-lock-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, #0d9488, #0284c7);
  border: 2.5px solid #0f172a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #ffffff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
}

.unlock-icon {
  color: #a7f3d0;
  animation: unlockGlow 0.5s ease-out forwards;
}

@keyframes unlockGlow {
  0% { transform: scale(0.8) rotate(-15deg); }
  50% { transform: scale(1.25) rotate(15deg); }
  100% { transform: scale(1) rotate(0); }
}

/* Radar Wave Pulse */
.radar-wave {
  position: absolute;
  inset: -6px;
  border: 1px solid rgba(45, 212, 191, 0.4);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  animation: radarPing 3s cubic-bezier(0, 0.2, 0.8, 1) infinite;
}

.wave-2 {
  animation-delay: 1.5s;
}

@keyframes radarPing {
  0% { transform: scale(0.9); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

/* Titles */
.auth-title {
  font-size: 1.65em;
  font-weight: 900;
  letter-spacing: 2px;
  margin: 0;
}

.title-gradient {
  background: linear-gradient(135deg, #ffffff 30%, #5eead4 70%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 4px 15px rgba(45, 212, 191, 0.2);
}

.auth-subtitle {
  font-size: 0.82em;
  color: #94a3b8;
  margin: 4px 0 12px 0;
  letter-spacing: 0.5px;
}

.auth-security-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(13, 148, 136, 0.14);
  border: 1px solid rgba(45, 212, 191, 0.35);
  color: #2dd4bf;
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.76em;
  font-weight: 600;
  box-shadow: 0 2px 10px rgba(13, 148, 136, 0.12);
}

.chip-pulse-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  box-shadow: 0 0 8px #10b981;
  animation: dotBlink 1.5s ease-in-out infinite alternate;
}

@keyframes dotBlink {
  0% { opacity: 0.4; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.3); }
}

/* ============================================================
   📝 FORM & INPUT FIELDS
   ============================================================ */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  transition: transform 0.2s ease;
}

.auth-label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82em;
  font-weight: 600;
  color: #94a3b8;
  transition: color 0.2s ease;
}

.label-icon {
  color: #0d9488;
  transition: color 0.2s ease, transform 0.2s ease;
}

.auth-field.field-focused .auth-label {
  color: #f1f5f9;
}

.auth-field.field-focused .label-icon {
  color: #2dd4bf;
  transform: scale(1.15);
}

.auth-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.auth-input {
  width: 100%;
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 12px;
  padding: 12px 42px 12px 16px;
  font-size: 0.95em;
  color: #f8fafc;
  outline: none;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.auth-input:focus {
  background: rgba(30, 41, 59, 0.95);
  border-color: #2dd4bf;
  box-shadow: 
    0 0 0 3px rgba(45, 212, 191, 0.22),
    0 0 16px rgba(45, 212, 191, 0.15),
    inset 0 1px 2px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

.auth-input::placeholder {
  color: #64748b;
  font-size: 0.92em;
}

.auth-input-icon {
  position: absolute;
  right: 15px;
  color: #64748b;
  font-size: 0.92em;
  pointer-events: none;
  transition: color 0.2s ease;
}

.auth-field.field-focused .auth-input-icon {
  color: #2dd4bf;
}

.auth-eye-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 8px;
  font-size: 1em;
  border-radius: 8px;
  transition: color 0.2s ease, transform 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-eye-btn:hover {
  color: #2dd4bf;
  transform: scale(1.1);
}

.eye-active {
  color: #2dd4bf;
}

/* ============================================================
   🔒 PERMANENT SESSION BADGE
   ============================================================ */
.auth-permanent-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.14) 0%, rgba(2, 132, 199, 0.1) 100%);
  border: 1px solid rgba(45, 212, 191, 0.25);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  margin-top: -2px;
}

.badge-icon-wrap {
  width: 24px;
  height: 24px;
  background: rgba(16, 185, 129, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #34d399;
  font-size: 0.95em;
  flex-shrink: 0;
}

.badge-text-group {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.badge-title {
  font-size: 0.82em;
  font-weight: 700;
  color: #5eead4;
}

.badge-sub {
  font-size: 0.7em;
  color: #94a3b8;
}

/* ============================================================
   ⚠️ ALERTS & FEEDBACK
   ============================================================ */
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s ease;
}

.alert-slide-enter-from,
.alert-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.auth-error-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.45);
  color: #fca5a5;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.82em;
  box-shadow: 0 4px 14px rgba(239, 68, 68, 0.15);
}

.alert-icon-wrap {
  font-size: 1.1em;
  color: #ef4444;
  flex-shrink: 0;
}

.alert-text-group {
  display: flex;
  flex-direction: column;
}

.alert-title {
  font-weight: 700;
  display: block;
}

.alert-msg {
  font-size: 0.9em;
  opacity: 0.9;
}

.auth-lockout-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #fcd34d;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.84em;
}

/* ============================================================
   🚀 SUBMIT BUTTON & SHIMMER
   ============================================================ */
.auth-submit-btn {
  position: relative;
  background: linear-gradient(135deg, #0d9488 0%, #0284c7 100%);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #ffffff;
  font-size: 0.98em;
  font-weight: 700;
  padding: 13px;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(13, 148, 136, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  overflow: hidden;
}

.btn-shimmer {
  position: absolute;
  top: -50%;
  left: -60%;
  width: 50%;
  height: 200%;
  background: linear-gradient(
    60deg,
    transparent 20%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 80%
  );
  transform: rotate(25deg);
  animation: btnShimmerSweep 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes btnShimmerSweep {
  0% { left: -60%; }
  35%, 100% { left: 140%; }
}

.auth-submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #0f766e 0%, #0369a1 100%);
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: 0 6px 26px rgba(13, 148, 136, 0.55), 0 0 16px rgba(45, 212, 191, 0.35);
  transform: translateY(-2px) scale(1.01);
}

.auth-submit-btn:active:not(:disabled) {
  transform: translateY(0.5px) scale(0.99);
  box-shadow: 0 2px 10px rgba(13, 148, 136, 0.3);
}

.auth-submit-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-arrow-icon {
  transition: transform 0.2s ease;
}

.auth-submit-btn:hover:not(:disabled) .btn-arrow-icon {
  transform: translateX(3px);
}

.btn-success {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
  border-color: #34d399 !important;
  box-shadow: 0 6px 28px rgba(16, 185, 129, 0.5) !important;
}

.animate-bounce {
  animation: miniBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite alternate;
}

@keyframes miniBounce {
  0% { transform: scale(0.9); }
  100% { transform: scale(1.2); }
}

/* ============================================================
   🛡️ FOOTER
   ============================================================ */
.auth-footer {
  text-align: center;
  border-top: 1px solid rgba(71, 85, 105, 0.3);
  padding-top: 16px;
}

.auth-footer p {
  margin: 0;
  font-size: 0.72em;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.auth-footer i {
  color: #0d9488;
}
</style>

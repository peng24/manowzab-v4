<template>
  <div class="auth-splash" role="status" aria-live="polite" aria-label="กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ">
    <!-- Subtle ambient aura (pure radial gradient — zero filter: blur) -->
    <div class="splash-aura" aria-hidden="true"></div>

    <div class="splash-center">
      <!-- Minimalist orbital emblem -->
      <div class="splash-emblem" aria-hidden="true">
        <span class="splash-ring-outer"></span>
        <span class="splash-ring-arc"></span>
        <span class="splash-logo-core">
          <span class="splash-emoji">🍋</span>
        </span>
      </div>

      <!-- Brand mark -->
      <div class="splash-brand">
        <span class="splash-title">MANOWZAB</span>
        <span class="splash-sub">COMMAND CENTER</span>
      </div>

      <!-- Sleek GPU-only progress bar -->
      <div class="splash-progress-track" aria-hidden="true">
        <span class="splash-progress-bar"></span>
      </div>

      <p class="splash-status">{{ message }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  message: {
    type: String,
    default: "กำลังเชื่อมต่อระบบ...",
  },
});
</script>

<style scoped>
.auth-splash {
  position: fixed;
  inset: 0;
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(ellipse at 50% 38%, #101b2e 0%, #070b14 68%, #04070d 100%);
  font-family: var(--font-main, "Kanit", "Noto Sans Thai", sans-serif);
  color: #f8fafc;
  user-select: none;
  overflow: hidden;
}

.splash-aura {
  position: absolute;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 46% 44%, rgba(250, 204, 21, 0.14) 0%, rgba(16, 185, 129, 0.08) 38%, transparent 70%);
  pointer-events: none;
  animation: splashAuraBreath 3.6s ease-in-out infinite alternate;
  will-change: transform, opacity;
}

.splash-center {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: splashFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.splash-emblem {
  position: relative;
  width: 88px;
  height: 88px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}

.splash-ring-outer {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(250, 204, 21, 0.2);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(15, 23, 42, 0.45));
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.splash-ring-arc {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #facc15;
  border-right-color: rgba(45, 212, 191, 0.65);
  animation: splashOrbit 1.45s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite;
  will-change: transform;
}

.splash-logo-core {
  position: relative;
  z-index: 1;
  width: 68px;
  height: 68px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, rgba(250, 204, 21, 0.16), rgba(15, 23, 42, 0.78) 72%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.splash-emoji {
  font-size: 36px;
  line-height: 1;
  animation: splashFloat 2.4s ease-in-out infinite alternate;
  will-change: transform;
}

.splash-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-bottom: 20px;
}

.splash-title {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: 3.5px;
  background: linear-gradient(125deg, #fef08a 0%, #ffffff 48%, #5eead4 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.splash-sub {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 3.2px;
  color: rgba(148, 163, 184, 0.78);
}

.splash-progress-track {
  position: relative;
  width: 156px;
  height: 3px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  overflow: hidden;
  margin-bottom: 12px;
}

.splash-progress-bar {
  position: absolute;
  inset: 0;
  width: 48%;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent 0%, #facc15 42%, #2dd4bf 75%, transparent 100%);
  animation: splashSlide 1.25s ease-in-out infinite;
  will-change: transform;
}

.splash-status {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 400;
  color: #94a3b8;
  letter-spacing: 0.3px;
}

@keyframes splashFadeIn {
  from {
    opacity: 0;
    transform: translate3d(0, 8px, 0) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes splashOrbit {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes splashFloat {
  from {
    transform: translate3d(0, 1px, 0) scale(0.98);
  }
  to {
    transform: translate3d(0, -3px, 0) scale(1.04);
  }
}

@keyframes splashAuraBreath {
  from {
    opacity: 0.72;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1.06);
  }
}

@keyframes splashSlide {
  0% {
    transform: translate3d(-110%, 0, 0);
  }
  100% {
    transform: translate3d(240%, 0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-aura,
  .splash-center,
  .splash-ring-arc,
  .splash-emoji,
  .splash-progress-bar {
    animation: none !important;
  }
  .splash-progress-bar {
    width: 60%;
    transform: translate3d(33%, 0, 0);
  }
}
</style>

<template>
  <div class="live-status" :class="`live-status--${status.tone}`">
    <span class="live-status-main" role="status" aria-live="polite">
      <span class="live-status-dot" aria-hidden="true"></span>{{ status.label }}
    </span>
    <span class="live-status-age" v-if="showAge">{{ age }}</span>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useSystemStore } from '../stores/system';
import { getLiveStatus, formatReceivedAge } from '../utils/liveStatus';
defineProps({ showAge: { type: Boolean, default: true } });
const system = useSystemStore();
const now = ref(Date.now());
const networkOnline = ref(typeof navigator === 'undefined' || navigator.onLine !== false);
const status = computed(() => getLiveStatus({
  isConnecting: system.isConnecting, isConnected: system.isConnected,
  currentVideoId: system.currentVideoId, isLiveFinished: system.isLiveFinished,
  statusDb: system.statusDb, statusApi: system.statusApi, statusChat: system.statusChat,
  lastChatPollAt: system.lastChatPollAt, lastChatReceivedAt: system.lastChatReceivedAt,
  networkOnline: networkOnline.value,
}));
const age = computed(() => formatReceivedAge(system.lastChatReceivedAt, now.value));
let timer;
const updateNetwork = () => { networkOnline.value = navigator.onLine !== false; };
onMounted(() => {
  timer = setInterval(() => { now.value = Date.now(); }, 1000);
  window.addEventListener('online', updateNetwork);
  window.addEventListener('offline', updateNetwork);
});
onUnmounted(() => {
  clearInterval(timer);
  window.removeEventListener('online', updateNetwork);
  window.removeEventListener('offline', updateNetwork);
});
</script>

<style scoped>
.live-status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; color: #a9b6c8; font-size: 12px; }
.live-status-main { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.live-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.live-status-age { color: #9aa9bc; font-size: 11px; }
.live-status--live, .live-status--synced { color: #6ee7b7; }
.live-status--connecting, .live-status--waiting { color: #fcd58a; }
.live-status--error { color: #fda4af; }
.live-status--ended { color: #c5b5e5; }
</style>

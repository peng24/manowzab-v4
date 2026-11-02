import { ref, computed, onMounted, onUnmounted } from 'vue';
import { clampChatWidth } from '../utils/workspaceLayout';

export function useWorkspaceLayout(system) {
  const viewportWidth = ref(typeof window === 'undefined' ? 1280 : window.innerWidth);
  const isResizing = ref(false);
  const displayedWidth = computed(() => clampChatWidth(system.chatPanelWidth, viewportWidth.value));
  let cleanupDrag = () => {};
  function startResize(event) {
    if (event.button !== 0) return;
    event.preventDefault();
    cleanupDrag();
    const startX = event.clientX, startWidth = displayedWidth.value;
    isResizing.value = true;
    const move = e => { system.chatPanelWidth = clampChatWidth(startWidth + startX - e.clientX, window.innerWidth); };
    const finish = () => {
      system.setChatPanelWidth(system.chatPanelWidth, window.innerWidth);
      cleanupDrag();
    };
    cleanupDrag = () => {
      isResizing.value = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', finish);
      cleanupDrag = () => {};
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish, { once: true });
    window.addEventListener('pointercancel', finish, { once: true });
    window.addEventListener('blur', finish, { once: true });
  }
  function resizeByKey(event) {
    const widths = { ArrowLeft: displayedWidth.value + 24, ArrowRight: displayedWidth.value - 24, Home: 280, End: 600 };
    if (!(event.key in widths)) return;
    event.preventDefault();
    system.setChatPanelWidth(widths[event.key], viewportWidth.value);
  }
  const updateViewport = () => {
    viewportWidth.value = window.innerWidth;
    if (viewportWidth.value <= 768 && system.mobilePanel === 'chat' && system.isChatCollapsed) system.setChatCollapsed(false);
  };
  onMounted(() => window.addEventListener('resize', updateViewport));
  onUnmounted(() => { cleanupDrag(); window.removeEventListener('resize', updateViewport); });
  return { isResizing, displayedWidth, startResize, resizeByKey, maxWidth: computed(() => clampChatWidth(600, viewportWidth.value)) };
}

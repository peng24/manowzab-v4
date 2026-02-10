import { onMounted, onBeforeUnmount } from "vue";

export function usePullToRefresh() {
  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  let indicator = null;

  const PULL_THRESHOLD = 150; // pixels to trigger refresh
  const MAX_PULL = 200; // maximum pull distance for visual effect

  function createIndicator() {
    indicator = document.createElement("div");
    indicator.id = "pull-to-refresh-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: -80px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #00e676 0%, #00c853 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 0 0 16px 16px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0, 230, 118, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    `;
    document.body.appendChild(indicator);
  }

  function updateIndicator(pullDistance) {
    if (!indicator) return;

    const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
    const topPosition = Math.min((pullDistance / MAX_PULL) * 80, 80) - 80;

    if (pullDistance >= PULL_THRESHOLD) {
      indicator.innerHTML = "↻ ปล่อยเพื่อรีเฟรช";
      indicator.style.background =
        "linear-gradient(135deg, #00e676 0%, #00c853 100%)";
    } else {
      indicator.innerHTML = "⬇️ ดึงเพื่อรีเฟรช";
      indicator.style.background = `linear-gradient(135deg, rgba(0, 230, 118, ${progress}) 0%, rgba(0, 200, 83, ${progress}) 100%)`;
    }

    indicator.style.top = `${topPosition}px`;
    indicator.style.opacity = progress;
  }

  function hideIndicator() {
    if (!indicator) return;
    indicator.style.top = "-80px";
    indicator.style.opacity = "0";
  }

  function getScrollableParent(element) {
    let current = element;
    while (current && current !== document.body) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        current.scrollHeight > current.clientHeight
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null; // No scrollable parent found — use window
  }

  let activeScrollContainer = null;

  function handleTouchStart(e) {
    // ✅ Find the nearest scrollable container from touch target
    activeScrollContainer = getScrollableParent(e.target);

    // Check if at top: either window or the scrollable container
    const isAtTop = activeScrollContainer
      ? activeScrollContainer.scrollTop === 0
      : window.scrollY === 0;

    if (isAtTop) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }

  function handleTouchMove(e) {
    if (!isPulling) return;

    currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;

    // ✅ Re-check scroll position during move
    const isAtTop = activeScrollContainer
      ? activeScrollContainer.scrollTop === 0
      : window.scrollY === 0;

    // Only trigger if pulling down (positive distance) and still at top
    if (pullDistance > 0 && isAtTop) {
      // Prevent default scrolling behavior
      if (pullDistance > 10) {
        e.preventDefault();
      }

      updateIndicator(pullDistance);
    } else {
      isPulling = false;
      hideIndicator();
    }
  }

  function handleTouchEnd() {
    if (!isPulling) return;

    const pullDistance = currentY - startY;

    // ✅ Check scroll position of the active container
    const isAtTop = activeScrollContainer
      ? activeScrollContainer.scrollTop === 0
      : window.scrollY === 0;

    if (pullDistance >= PULL_THRESHOLD && isAtTop) {
      // Show loading state
      if (indicator) {
        indicator.innerHTML = "↻ กำลังรีเฟรช...";
        indicator.style.top = "0px";
        indicator.style.opacity = "1";
      }

      // Reload the page after a short delay for visual feedback
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } else {
      hideIndicator();
    }

    isPulling = false;
    startY = 0;
    currentY = 0;
    activeScrollContainer = null;
  }

  onMounted(() => {
    createIndicator();
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  });

  return {
    // Export functions if needed for manual control
  };
}

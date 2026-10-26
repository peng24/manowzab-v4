import { ref, shallowRef, onMounted, onBeforeUnmount, watch, nextTick, getCurrentInstance } from "vue";
import Lenis from "lenis";

/**
 * useSmoothScroll
 * Composable to attach Lenis smooth inertial scrolling to any container element or component.
 * 
 * @param {import('vue').Ref<HTMLElement | null>} containerRef - Ref to the scroll container element.
 * @param {Object} options - Lenis configuration options.
 * @returns {{
 *   lenis: import('vue').ShallowRef<Lenis | null>,
 *   scrollTo: (target: any, scrollOptions?: any) => void,
 *   resize: () => void,
 *   start: () => void,
 *   stop: () => void,
 *   destroy: () => void
 * }}
 */
export function useSmoothScroll(containerRef, options = {}) {
  const lenis = shallowRef(null);
  let resizeObserver = null;
  let mutationObserver = null;

  function initLenis(el) {
    if (!el || typeof window === "undefined") return;
    if (lenis.value) {
      lenis.value.destroy();
      lenis.value = null;
    }

    const mergedOptions = {
      wrapper: el,
      content: el,
      eventsTarget: el,
      autoRaf: true,
      smoothWheel: true,
      syncTouch: false, // Keep native touch gestures snappy & responsive on mobile
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      ...options
    };

    try {
      const instance = new Lenis(mergedOptions);
      lenis.value = instance;

      // Monitor dimension changes on the container
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          instance.resize();
        });
        resizeObserver.observe(el);
      }

      // Monitor child mutations (e.g. items added/removed/filtered in stock grid)
      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(() => {
          instance.resize();
        });
        mutationObserver.observe(el, { childList: true, subtree: false });
      }

      // Initial dimension calculation after DOM render
      nextTick(() => {
        instance.resize();
      });
    } catch (err) {
      console.warn("[useSmoothScroll] Failed to initialize Lenis:", err);
    }
  }

  function destroy() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (lenis.value) {
      lenis.value.destroy();
      lenis.value = null;
    }
  }

  function resize() {
    lenis.value?.resize();
  }

  function start() {
    lenis.value?.start();
  }

  function stop() {
    lenis.value?.stop();
  }

  function scrollTo(target, scrollOptions = {}) {
    if (lenis.value) {
      lenis.value.scrollTo(target, scrollOptions);
    } else if (containerRef && containerRef.value) {
      const el = containerRef.value;
      if (typeof target === "number") {
        el.scrollTo({ top: target, behavior: "smooth", ...scrollOptions });
      } else if (target instanceof HTMLElement) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  if (containerRef) {
    watch(
      () => containerRef.value,
      (newEl) => {
        if (newEl) {
          initLenis(newEl);
        } else {
          destroy();
        }
      },
      { immediate: true }
    );
  }

  const currentInstance = getCurrentInstance();
  if (currentInstance) {
    onMounted(() => {
      if (containerRef && containerRef.value && !lenis.value) {
        initLenis(containerRef.value);
      }
    });

    onBeforeUnmount(() => {
      destroy();
    });
  }

  return {
    lenis,
    scrollTo,
    resize,
    start,
    stop,
    destroy
  };
}

/**
 * Custom Vue directive `v-smooth-scroll`
 * Usage: <div class="my-scroll-list" v-smooth-scroll>
 */
export const vSmoothScroll = {
  mounted(el, binding) {
    if (typeof window === "undefined" || !el) return;
    const userOpts = binding.value || {};
    try {
      const lenis = new Lenis({
        wrapper: el,
        content: el,
        eventsTarget: el,
        autoRaf: true,
        smoothWheel: true,
        syncTouch: false,
        duration: 1.0,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        ...userOpts
      });
      el.__lenis__ = lenis;

      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => lenis.resize());
        ro.observe(el);
        el.__lenis_ro__ = ro;
      }
    } catch (e) {
      console.warn("[vSmoothScroll] Failed to bind Lenis:", e);
    }
  },
  unmounted(el) {
    if (el.__lenis_ro__) {
      el.__lenis_ro__.disconnect();
      delete el.__lenis_ro__;
    }
    if (el.__lenis__) {
      el.__lenis__.destroy();
      delete el.__lenis__;
    }
  }
};

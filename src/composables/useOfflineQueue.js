import { ref, onMounted, onUnmounted } from "vue";
import { logger } from "../utils/logger";

const STORAGE_KEY = "manowzab_offline_queue_v1";
const isOnline = ref(navigator.onLine);
const pendingQueue = ref(loadQueue());
let sequenceCounter = 0;

function loadQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    logger.error("Failed to load offline queue:", err);
    return [];
  }
}

function saveQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    logger.error("Failed to save offline queue:", err);
  }
}

export function useOfflineQueue() {
  function handleOnline() {
    isOnline.value = true;
    logger.log("🌐 Connection restored (Online). Processing offline queue...");
    flushQueue();
  }

  function handleOffline() {
    isOnline.value = false;
    logger.warn("📡 Connection lost (Offline). Actions will be queued locally.");
  }

  onMounted(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  });

  onUnmounted(() => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  });

  /**
   * Enqueue an action to be performed when online
   * @param {string} type Action type identifier (e.g. 'STOCK_UPDATE', 'ORDER_BOOK')
   * @param {Object} payload Payload data
   * @param {Function} handler Execution handler function (async)
   */
  function enqueueAction(type, payload) {
    sequenceCounter += 1;
    const actionItem = {
      id: `${Date.now()}_${sequenceCounter}`,
      sequenceId: sequenceCounter,
      type,
      payload,
      timestamp: Date.now()
    };

    pendingQueue.value.push(actionItem);
    saveQueue(pendingQueue.value);

    if (isOnline.value) {
      flushQueue();
    }
  }

  /**
   * Flush pending offline actions sequentially
   * @param {Function} processor Async callback to process each item
   */
  async function flushQueue(processor) {
    if (pendingQueue.value.length === 0 || !isOnline.value) return;

    // Sort by sequenceId and timestamp to guarantee strictly ordered execution
    pendingQueue.value.sort((a, b) => a.timestamp - b.timestamp || a.sequenceId - b.sequenceId);

    const queueCopy = [...pendingQueue.value];
    for (const item of queueCopy) {
      try {
        if (processor) {
          await processor(item);
        }
        // Remove processed item
        pendingQueue.value = pendingQueue.value.filter((i) => i.id !== item.id);
        saveQueue(pendingQueue.value);
      } catch (err) {
        logger.error(`Error flushing offline item ${item.id}:`, err);
        break; // Stop on first failure to prevent out-of-order processing
      }
    }
  }

  return {
    isOnline,
    pendingQueue,
    enqueueAction,
    flushQueue
  };
}

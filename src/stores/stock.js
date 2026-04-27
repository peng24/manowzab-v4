import { defineStore } from "pinia";
import { triggerCelebration } from "../utils/celebration";
import { ref } from "vue";
import {
  ref as dbRef,
  onValue,
  set,
  update,
  remove,
  runTransaction,
} from "firebase/database";
import { db } from "../composables/useFirebase";
import { useSystemStore } from "./system";

/**
 * Stock Store
 * Manages inventory, orders, and real-time syncing with Firebase.
 */
export const useStockStore = defineStore("stock", () => {
  /** @type {import('vue').Ref<Object>} Dictionary of stock items */
  const stockData = ref({});

  /** @type {import('vue').Ref<number>} Total number of stock items */
  const stockSize = ref(parseInt(localStorage.getItem('lastStockSize')) || 50);

  /** @type {import('vue').Ref<Object>} Tracks which percentage milestones have been celebrated */
  const milestones = ref({ fifty: false, eighty: false, hundred: false });

  const systemStore = useSystemStore();

  let currentUnsubscribe = null;

  /**
   * Connects to the stock node in Firebase for a specific video.
   * @param {string} videoId - The YouTube Video ID or 'demo'.
   * @returns {Function} Cleanup function to unsubscribe listeners.
   */
  function connectToStock(videoId) {
    if (currentUnsubscribe) {
      currentUnsubscribe();
      currentUnsubscribe = null;
    }

    // ✅ Reset milestones when connecting to a new session
    milestones.value = { fifty: false, eighty: false, hundred: false };
    
    const stockRef = dbRef(db, `stock/${videoId}`);

    let isInitialLoad = true;
    const unsubStock = onValue(stockRef, (snapshot) => {
      const val = snapshot.val() || {};
      stockData.value = val;

      if (videoId && videoId !== "demo") {
        let totalSales = 0;
        let totalItems = 0;

        Object.values(val).forEach((item) => {
          if (item.owner && item.price) {
            totalSales += parseInt(item.price);
            totalItems++;
          } else if (item.owner) {
            // Count items that have an owner even if price is missing
            totalItems++;
          }
        });

        // ✅ Check Milestones for Celebration (50%, 80%, 100%) — Skip on initial load
        if (!isInitialLoad) {
          const currentSize = stockSize.value > 0 ? stockSize.value : 70;
          const percentage = (totalItems / currentSize) * 100;

          if (percentage >= 50 && !milestones.value.fifty) {
            triggerCelebration(50);
            milestones.value.fifty = true;
          }
          if (percentage >= 80 && !milestones.value.eighty) {
            triggerCelebration(80);
            milestones.value.eighty = true;
          }
          if (percentage >= 100 && !milestones.value.hundred) {
            triggerCelebration(100);
            milestones.value.hundred = true;
          }
        } else {
          // ✅ On initial load, just mark already-passed milestones as done
          const currentSize = stockSize.value > 0 ? stockSize.value : 70;
          const percentage = (totalItems / currentSize) * 100;
          if (percentage >= 50) milestones.value.fifty = true;
          if (percentage >= 80) milestones.value.eighty = true;
          if (percentage >= 100) milestones.value.hundred = true;
        }

        const historyRef = dbRef(db, `history/${videoId}`);
        update(historyRef, {
          totalSales: totalSales,
          totalItems: totalItems,
          lastUpdated: Date.now(),
        }).catch((err) => console.error("History Sync Error:", err));
      }

      isInitialLoad = false;
    });

    const sizeRef = dbRef(db, `settings/${videoId}/stockSize`);
    const unsubSize = onValue(sizeRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        stockSize.value = val;
        localStorage.setItem('lastStockSize', val);
      }
    });

    currentUnsubscribe = () => {
      unsubStock();
      unsubSize();
    };

    return currentUnsubscribe;
  }

  /**
   * Processes a new order (booking/buying).
   * Used by both Manual input and Chat/AI processing.
   *
   * @param {number} num - The item number to book.
   * @param {string} owner - Display name of the buyer.
   * @param {string} uid - Unique ID of the buyer (channelId).
   * @param {string} [source="manual"] - Origin of the order (manual, chat, ai).
   * @param {number|null} [price=null] - Price override if specified.
   * @param {string} [method="manual"] - Detection method (regex, ai, manual).
   */
  async function processOrder(
    num,
    owner,
    uid,
    source = "manual",
    price = null,
    method = "manual",
  ) {
    const itemRef = dbRef(db, `stock/${systemStore.currentVideoId}/${num}`);

    try {
      let action = "unknown";

      await runTransaction(itemRef, (currentData) => {
        if (currentData === null) {
          // Create new item if not exists
          action = "claimed";
          return {
            owner,
            uid,
            time: Date.now(),
            queue: [],
            source: method,
            price: price || null,
          };
        } else if (!currentData.owner) {
          // Claim empty item
          action = "claimed";
          currentData.owner = owner;
          currentData.uid = uid;
          currentData.time = Date.now();
          currentData.source = method;
          if (price) currentData.price = price;
          if (!currentData.queue) currentData.queue = [];
          return currentData;
        } else {
          // Add to queue if occupied
          if (currentData.owner === owner) {
            action = "already_owned";
            return; // Already owns it
          }
          const queue = currentData.queue || [];
          if (queue.find((q) => q.owner === owner)) {
            action = "already_queued";
            return; // Already in queue
          }
          action = "queued";
          queue.push({ owner, uid, time: Date.now() });
          currentData.queue = queue;
          return currentData;
        }
      });

      return { success: true, action, error: null };
    } catch (e) {
      console.error("Transaction failed: ", e);
      return { success: false, action: "error", error: e.message };
    }
  }

  /**
   * Cancels an order and promotes the next person in queue.
   *
   * @param {number} num - The item number to cancel.
   * @returns {Promise<{previousOwner: string, nextOwner: string|null}|null>} Info about the cancellation for TTS.
   */
  async function processCancel(num) {
    const itemRef = dbRef(db, `stock/${systemStore.currentVideoId}/${num}`);
    let previousOwner = null;
    let nextOwner = null;

    try {
      await runTransaction(itemRef, (currentData) => {
        if (!currentData) return null; // Nothing to cancel

        previousOwner = currentData.owner;

        if (currentData.queue && currentData.queue.length > 0) {
          // Promote next in queue
          const next = currentData.queue[0];
          const nextQ = currentData.queue.slice(1);
          
          nextOwner = next.owner;
          
          return {
            ...currentData,
            owner: next.owner,
            uid: next.uid,
            time: Date.now(),
            queue: nextQ,
            source: "queue",
          };
        } else {
          // No one in queue, delete the item
          return null;
        }
      });

      return { success: true, previousOwner, nextOwner, error: null };
    } catch (e) {
      console.error("Cancel failed: ", e);
      return {
        success: false,
        previousOwner,
        nextOwner: null,
        error: e.message,
      };
    }
  }

  /**
   * Clears all stock for the current video.
   */
  function clearAllStock() {
    remove(dbRef(db, `stock/${systemStore.currentVideoId}`));
    milestones.value = { fifty: false, eighty: false, hundred: false }; // ✅ Reset milestones for the next round
  }

  /**
   * Updates only the price of a stock item.
   * @param {number} num
   * @param {number} price
   */
  function updateStockPrice(num, price) {
    const path = `stock/${systemStore.currentVideoId}/${num}/price`;
    return update(dbRef(db), { [path]: price });
  }

  /**
   * Sets the total stock size (max items).
   * @param {number} newSize
   */
  function updateStockSize(newSize) {
    if (!systemStore.currentVideoId) return;
    const sizeRef = dbRef(
      db,
      `settings/${systemStore.currentVideoId}/stockSize`,
    );
    set(sizeRef, newSize);
    localStorage.setItem('lastStockSize', newSize);
  }

  /**
   * Updates generic item data (Price, Size, etc.).
   * @param {number} num - Item ID
   * @param {Object} newData - Data to update (e.g. { price: 100, size: "XL" })
   */
  async function updateItemData(num, newData) {
    if (!systemStore.currentVideoId) return;

    // 1. Update Stock Item
    await update(
      dbRef(db, `stock/${systemStore.currentVideoId}/${num}`),
      newData,
    );
  }

  return {
    stockData,
    stockSize,
    connectToStock,
    processOrder,
    processCancel,
    clearAllStock,
    updateStockPrice,
    updateStockSize,
    updateItemData,
  };
});

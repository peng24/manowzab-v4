import { defineStore } from "pinia";
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
  const stockSize = ref(70);
  
  const systemStore = useSystemStore();

  /**
   * Connects to the stock node in Firebase for a specific video.
   * @param {string} videoId - The YouTube Video ID or 'demo'.
   * @returns {Function} Cleanup function to unsubscribe listeners.
   */
  function connectToStock(videoId) {
    const stockRef = dbRef(db, `stock/${videoId}`);

    const unsubStock = onValue(stockRef, (snapshot) => {
      const val = snapshot.val() || {};
      stockData.value = val;
    });

    const sizeRef = dbRef(db, `settings/${videoId}/stockSize`);
    const unsubSize = onValue(sizeRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        stockSize.value = val;
      }
    });

    return () => {
      unsubStock();
      unsubSize();
    };
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
    method = "manual"
  ) {
    const itemRef = dbRef(db, `stock/${systemStore.currentVideoId}/${num}`);

    try {
      await runTransaction(itemRef, (currentData) => {
        if (currentData === null) {
          // Create new item if not exists
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
          currentData.owner = owner;
          currentData.uid = uid;
          currentData.time = Date.now();
          currentData.source = method;
          if (price) currentData.price = price;
          if (!currentData.queue) currentData.queue = [];
          return currentData;
        } else {
          // Add to queue if occupied
          if (currentData.owner === owner) return; // Already owns it
          const queue = currentData.queue || [];
          if (queue.find((q) => q.owner === owner)) return; // Already in queue
          queue.push({ owner, uid, time: Date.now() });
          currentData.queue = queue;
          return currentData;
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }

  /**
   * Cancels an order and promotes the next person in queue.
   * 
   * @param {number} num - The item number to cancel.
   * @returns {Promise<{previousOwner: string, nextOwner: string|null}|null>} Info about the cancellation for TTS.
   */
  async function processCancel(num) {
    const current = stockData.value[num];
    if (!current) return null;

    const previousOwner = current.owner;
    let nextOwner = null;

    if (current.queue && current.queue.length > 0) {
      // Promote next in queue
      const next = current.queue[0];
      const nextQ = current.queue.slice(1);
      const newData = {
        owner: next.owner,
        uid: next.uid,
        time: Date.now(),
        queue: nextQ,
        source: "queue",
      };
      if (current.price) newData.price = current.price;

      await set(
        dbRef(db, `stock/${systemStore.currentVideoId}/${num}`),
        newData
      );
      nextOwner = next.owner;
    } else {
      // Delete item if no queue
      await remove(dbRef(db, `stock/${systemStore.currentVideoId}/${num}`));
    }

    return { previousOwner, nextOwner };
  }

  /**
   * Clears all stock for the current video.
   */
  function clearAllStock() {
    remove(dbRef(db, `stock/${systemStore.currentVideoId}`));
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
      `settings/${systemStore.currentVideoId}/stockSize`
    );
    set(sizeRef, newSize);
  }

  /**
   * Updates generic item data (Price, Size, etc.) and syncs with Overlay.
   * @param {number} num - Item ID
   * @param {Object} newData - Data to update (e.g. { price: 100, size: "XL" })
   */
  async function updateItemData(num, newData) {
    if (!systemStore.currentVideoId) return;

    // 1. Update Stock Item
    await update(dbRef(db, `stock/${systemStore.currentVideoId}/${num}`), newData);

    // 2. Update Overlay "Current Item" (Only if we have price/size)
    if (newData.price || newData.size) {
      await update(dbRef(db, `overlay/${systemStore.currentVideoId}/current_item`), {
        id: num,
        price: newData.price || null,
        size: newData.size || null,
        updatedAt: Date.now()
      });
    }
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

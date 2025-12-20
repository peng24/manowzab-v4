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

export const useStockStore = defineStore("stock", () => {
  const stockData = ref({});
  const stockSize = ref(70);
  const systemStore = useSystemStore();

  function connectToStock(videoId) {
    const stockRef = dbRef(db, `stock/${videoId}`);

    onValue(stockRef, (snapshot) => {
      const val = snapshot.val() || {};
      stockData.value = val;
    });

    // 2. ✅ เพิ่ม: ดึงค่า Stock Size (จำนวนรายการ)
    const sizeRef = dbRef(db, `settings/${videoId}/stockSize`);
    onValue(sizeRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        stockSize.value = val;
      }
    });
  }

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
          return {
            owner,
            uid,
            time: Date.now(),
            queue: [],
            source: method,
            price: price || null,
          };
        } else if (!currentData.owner) {
          currentData.owner = owner;
          currentData.uid = uid;
          currentData.time = Date.now();
          currentData.source = method;
          if (price) currentData.price = price;
          if (!currentData.queue) currentData.queue = [];
          return currentData;
        } else {
          if (currentData.owner === owner) return;
          const queue = currentData.queue || [];
          if (queue.find((q) => q.owner === owner)) return;
          queue.push({ owner, uid, time: Date.now() });
          currentData.queue = queue;
          return currentData;
        }
      });
    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }

  function processCancel(num) {
    const current = stockData.value[num];
    if (!current) return;

    if (current.queue && current.queue.length > 0) {
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
      set(dbRef(db, `stock/${systemStore.currentVideoId}/${num}`), newData);
    } else {
      remove(dbRef(db, `stock/${systemStore.currentVideoId}/${num}`));
    }
  }

  function clearAllStock() {
    remove(dbRef(db, `stock/${systemStore.currentVideoId}`));
  }

  function updateStockPrice(num, price) {
    const path = `stock/${systemStore.currentVideoId}/${num}/price`;
    return update(dbRef(db), { [path]: price });
  }

  function updateStockSize(newSize) {
    if (!systemStore.currentVideoId) return;
    const sizeRef = dbRef(
      db,
      `settings/${systemStore.currentVideoId}/stockSize`
    );
    set(sizeRef, newSize);
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
  };
});

import { defineStore } from "pinia";
import { shallowRef, computed } from "vue";
import { ref as dbRef, onValue } from "firebase/database";
import { db } from "../composables/useFirebase";
import {
  normalizeCustomerName,
  setLiveDeliveryCustomersCache,
  setLiveAddressBookCache,
} from "../utils/deliverySync";

export const useCustomerStore = defineStore("customer", () => {
  // Raw snapshots from Firebase (shallowRef avoids deep reactivity overhead on hundreds of customer records)
  const deliveryCustomersRaw = shallowRef({});
  const addressBook = shallowRef({});

  let unsubDelivery = null;
  let unsubAddressBook = null;
  let listenerRefCount = 0;

  // Array representation for StockGrid & ShippingManager
  const deliveryCustomersList = computed(() => {
    const data = deliveryCustomersRaw.value || {};
    return Object.keys(data).map((key) => ({
      id: key,
      uid: key,
      ...data[key],
      itemCount: data[key]?.itemCount || 0,
      sessions: data[key]?.sessions || null,
    }));
  });

  // O(1) lookup index for delivery_customers by normalized name, uid, or id
  const deliveryByNormKey = computed(() => {
    const data = deliveryCustomersRaw.value || {};
    const index = Object.create(null);

    Object.keys(data).forEach((key) => {
      const c = data[key];
      if (!c) return;
      index[key] = c;
      if (c.uid) index[c.uid] = c;

      const cNorm = normalizeCustomerName(c.name || c.displayName || "").replace(
        /[.#$[\]/]/g,
        "_",
      );
      if (cNorm) {
        // Prefer active (non-done) record when multiple records share the same normalized name
        const prev = index[cNorm];
        if (!prev || (prev.status === "done" && c.status !== "done")) {
          index[cNorm] = c;
        }
      }
    });

    return index;
  });

  // Reactive memoization cache that automatically clears when addressBook or deliveryCustomersRaw changes
  const metaLookupCache = computed(() => {
    // Touch dependencies so the Map resets whenever Firebase data updates
    void addressBook.value;
    void deliveryByNormKey.value;
    return new Map();
  });

  /**
   * O(1) memoized lookup for customer metadata (hasAddress, contactChannel, paymentType)
   */
  function getCustomerMetaByName(rawName, targetUid = null, realName = null) {
    if (!rawName && !targetUid && !realName) return null;
    const cacheKey = `${rawName || ""}|${targetUid || ""}|${realName || ""}`;
    const cache = metaLookupCache.value;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const normName = rawName
      ? normalizeCustomerName(rawName).replace(/[.#$[\]/]/g, "_")
      : "";
    const normReal = realName
      ? normalizeCustomerName(realName).replace(/[.#$[\]/]/g, "_")
      : "";

    const bookMap = addressBook.value || {};
    const delivMap = deliveryByNormKey.value;

    const book =
      (normName && bookMap[normName]) || (normReal && bookMap[normReal]) || null;
    const deliv =
      (targetUid && delivMap[targetUid]) ||
      (normName && delivMap[normName]) ||
      (normReal && delivMap[normReal]) ||
      null;

    const hasAddress = Boolean(
      (book?.address && book.address.trim()) ||
        (deliv?.address && deliv.address.trim()) ||
        (Array.isArray(book?.addresses) &&
          book.addresses.some((a) => a && a.address && a.address.trim())),
    );
    const contactChannel = book?.contactChannel || deliv?.contactChannel || "";
    const paymentType = book?.paymentType || deliv?.paymentType || "";

    const result =
      !hasAddress && !contactChannel && !paymentType
        ? null
        : {
            hasAddress,
            contactChannel,
            paymentType,
          };

    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Starts shared Firebase listeners for delivery_customers and address_book (reference counted).
   * @returns {Function} Cleanup function to call on component unmount
   */
  function initCustomerListeners() {
    listenerRefCount++;

    if (!unsubDelivery) {
      unsubDelivery = onValue(dbRef(db, "delivery_customers"), (snapshot) => {
        const data = snapshot.val() || {};
        deliveryCustomersRaw.value = data;
        setLiveDeliveryCustomersCache(data);
      });
    }

    if (!unsubAddressBook) {
      unsubAddressBook = onValue(dbRef(db, "address_book"), (snapshot) => {
        const data = snapshot.val() || {};
        addressBook.value = data;
        setLiveAddressBookCache(data);
      });
    }

    let cleanedUp = false;
    return () => {
      if (cleanedUp) return;
      cleanedUp = true;
      listenerRefCount = Math.max(0, listenerRefCount - 1);
      if (listenerRefCount === 0) {
        if (unsubDelivery) {
          unsubDelivery();
          unsubDelivery = null;
        }
        if (unsubAddressBook) {
          unsubAddressBook();
          unsubAddressBook = null;
        }
        setLiveDeliveryCustomersCache(null);
        setLiveAddressBookCache(null);
      }
    };
  }

  return {
    deliveryCustomersRaw,
    deliveryCustomersList,
    addressBook,
    deliveryByNormKey,
    getCustomerMetaByName,
    initCustomerListeners,
  };
});

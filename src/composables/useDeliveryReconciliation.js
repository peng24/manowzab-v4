import { computed, watch } from 'vue';

const normalize = name => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Read only booking fields: queue/lock/colour changes do not invalidate this plan.
export function deliverySyncPlan(stock, customers, videoId) {
  const owners = new Map();
  for (const [id, item] of Object.entries(stock || {})) {
    if (!item?.owner) continue;
    const key = normalize(item.owner);
    if (!owners.has(key)) owners.set(key, { name: item.owner, uid: item.uid || null, items: {} });
    const owner = owners.get(key);
    owner.uid = item.uid || owner.uid;
    owner.items[id] = {
      bookingKey: `${id}:${item.time || 0}`,
      bookedAt: Number(item.time) || 0,
      price: Number.parseInt(item.price, 10) || 0,
    };
  }
  // Also repair old sessions whose final booking has already been removed.
  for (const [uid, customer] of Object.entries(customers || {})) {
    if (!customer?.name || !customer.sessions?.[videoId]) continue;
    const key = normalize(customer.name);
    if (!owners.has(key)) owners.set(key, { name: customer.name, uid, items: {} });
  }
  for (const owner of owners.values()) owner.signature = JSON.stringify([owner.name, owner.uid, owner.items]);
  return owners;
}

export function useDeliveryReconciliation({ stock, customers, videoId, authorized, sync, delay = 1000 }) {
  const plan = computed(() => deliverySyncPlan(stock(), customers(), videoId()));
  let previous = new Map();
  let previousVideo = null;
  return watch([plan, videoId, authorized], ([next, video, allowed], _old, onCleanup) => {
    if (!allowed || !video || video === 'demo') {
      previous = new Map();
      previousVideo = null;
      return;
    }
    if (previousVideo !== video) previous = new Map();
    previousVideo = video;
    const changed = [...next].filter(([key, owner]) => previous.get(key)?.signature !== owner.signature)
      .map(([, owner]) => owner);
    for (const [key, owner] of previous) {
      if (!next.has(key)) changed.push({ ...owner, items: {} });
    }
    if (!changed.length) return;
    const timer = setTimeout(() => {
      previous = next;
      for (const owner of changed) sync(owner.name, owner.uid, video, stock(), owner.items);
    }, delay);
    onCleanup(() => clearTimeout(timer));
  }, { immediate: true });
}

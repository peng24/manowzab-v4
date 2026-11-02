import { computed, ref } from 'vue';

export function queueDraftFingerprint(price, queue) {
  return JSON.stringify({
    price: Math.max(0, Number(price) || 0),
    queue: queue.filter(p => typeof p?.owner === 'string' && p.owner.trim()).map(p => ({
      owner: p.owner.trim(), uid: p.uid || '', time: p.time || 0,
      source: p.source || 'manual', backdated: Boolean(p.backdated),
    })),
  });
}

export function useQueueDraft({ price, queue, confirmDiscard, close }) {
  const baseline = ref('');
  const isSaving = ref(false);
  const isConfirming = ref(false);
  const fingerprint = computed(() => queueDraftFingerprint(price.value, queue.value));
  const isDirty = computed(() => baseline.value !== fingerprint.value);
  function capture() { baseline.value = fingerprint.value; }
  async function requestClose() {
    if (isSaving.value || isConfirming.value) return false;
    if (isDirty.value) {
      isConfirming.value = true;
      try { if (!await confirmDiscard()) return false; }
      finally { isConfirming.value = false; }
    }
    close(); return true;
  }
  async function save(persist, { closeAfter = true } = {}) {
    if (isSaving.value || isConfirming.value) return false;
    isSaving.value = true;
    try {
      if (await persist() === false) return false;
      capture();
      if (closeAfter) close();
      return true;
    } finally { isSaving.value = false; }
  }
  return { isDirty, isSaving, isConfirming, capture, requestClose, save };
}

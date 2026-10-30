// Deterministic synthetic workload. No Firebase writes, live chat or TTS.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { reactive, effectScope, nextTick } from 'vue';

Object.assign(process.env, {
  VITE_FIREBASE_API_KEY: 'demo-review-key',
  VITE_FIREBASE_PROJECT_ID: 'demo-manowzab-review',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-manowzab-review.firebaseapp.com',
  VITE_FIREBASE_DATABASE_URL: 'https://demo-manowzab-review-default-rtdb.firebaseio.com',
  VITE_USE_FIREBASE_EMULATORS: 'true',
  VITE_YOUTUBE_API_KEYS: '',
  VITE_GOOGLE_API_KEYS: '',
});
const server = await createServer({ mode: 'review', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { useDeliveryReconciliation } = await server.ssrLoadModule('/src/composables/useDeliveryReconciliation.js');
  const { useSmartAnswerLookup } = await server.ssrLoadModule('/src/composables/useSmartAnswerLookup.js');
  const { resolveSmartAnswer } = await server.ssrLoadModule('/src/utils/smartAnswerUtils.js');
  const stock = reactive(Object.fromEntries(Array.from({ length: 300 }, (_, i) => [i + 1,
    { owner: `Customer ${i}`, uid: `uid-${i}`, price: 100, time: i + 1, queue: [] }])));
  const context = () => ({ stockData: stock, currentVideoId: 'benchmark' });
  const chats = Array.from({ length: 200 }, (_, i) => reactive({ text: 'พี่ได้กี่ตัว',
    displayName: `Customer ${i}`, uid: `uid-${i}`, type: 'question' }));
  const measure = fn => { const start = performance.now(); fn(); return performance.now() - start; };
  const oldTimes = [], newTimes = [];
  for (let trial = 0; trial < 5; trial++) {
    oldTimes.push(measure(() => { for (const chat of chats) for (let read = 0; read < 12; read++) resolveSmartAnswer(chat, context()); }));
    const lookup = useSmartAnswerLookup(context, () => false);
    newTimes.push(measure(() => { for (const chat of chats) for (let read = 0; read < 12; read++) lookup(chat); }));
  }
  let resolved = 0;
  const lookup = useSmartAnswerLookup(context, () => false, (...args) => { resolved++; return resolveSmartAnswer(...args); });
  for (const chat of chats) for (let read = 0; read < 12; read++) lookup(chat);
  assert.equal(resolved, 200);
  let synced = 0;
  const scope = effectScope();
  const waitForBatch = async () => { await nextTick(); await new Promise(resolve => setTimeout(resolve, 10)); };
  scope.run(() => useDeliveryReconciliation({ stock: () => stock, customers: () => ({}),
    videoId: () => 'benchmark', authorized: () => true, sync: () => synced++, delay: 0 }));
  await waitForBatch();
  const initial = synced;
  synced = 0; stock[1].price = 150; await waitForBatch();
  const priceChange = synced;
  synced = 0; stock[1].queue.push({ name: 'Waiting' }); await waitForBatch();
  scope.stop();
  assert.equal(initial, 300); assert.equal(priceChange, 1); assert.equal(synced, 0);
  const median = values => Number([...values].sort((a, b) => a - b)[2].toFixed(2));
  const result = { workload: { customers: 300, questionMessages: 200, readsPerMessage: 12, trials: 5 },
    reconciliation: { initialSyncCalls: initial, singlePriceChangeSyncCalls: priceChange, queueOnlySyncCalls: synced },
    smartAnswers: { uncachedResolutions: 2400, cachedResolutions: resolved,
      uncachedMedianMs: median(oldTimes), cachedMedianMs: median(newTimes) } };
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await server.close(); }

import { describe, it, expect, vi, afterEach } from 'vitest';
import { effectScope, reactive, nextTick } from 'vue';
import { deliverySyncPlan, useDeliveryReconciliation } from '../composables/useDeliveryReconciliation';
import { bookingItems } from '../utils/deliveryState';

const scopes = [];
afterEach(() => { scopes.splice(0).forEach(scope => scope.stop()); vi.useRealTimers(); });
function setup(count = 300) {
  vi.useFakeTimers();
  const state = reactive({ stock: Object.fromEntries(Array.from({ length: count }, (_, i) => [i + 1,
    { owner: `Customer ${i}`, uid: `uid-${i}`, price: 100, time: i + 1, queue: [] }])),
    customers: {}, video: 'live-one', allowed: true });
  const sync = vi.fn();
  const scope = effectScope();
  scopes.push(scope);
  scope.run(() => useDeliveryReconciliation({ stock: () => state.stock, customers: () => state.customers,
    videoId: () => state.video, authorized: () => state.allowed, sync }));
  return { state, sync };
}
async function flush() { await nextTick(); await vi.advanceTimersByTimeAsync(1000); }

describe('selective delivery reconciliation', () => {
  it('reduces one price edit from 300 owners to one and skips queue-only changes', async () => {
    const { state, sync } = setup();
    await flush();
    expect(sync).toHaveBeenCalledTimes(300);
    sync.mockClear();
    state.stock[1].price = 120;
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync.mock.calls[0][4]).toEqual(bookingItems(state.stock, 'Customer 0'));
    sync.mockClear();
    state.stock[1].queue.push({ name: 'Waiting customer' });
    await flush();
    expect(sync).not.toHaveBeenCalled();
    state.stock = JSON.parse(JSON.stringify(state.stock));
    await flush();
    expect(sync).not.toHaveBeenCalled();
  });
  it('syncs both old and promoted owners, including removal of the last booking', async () => {
    const { state, sync } = setup(1);
    await flush(); sync.mockClear();
    state.stock[1] = { ...state.stock[1], owner: 'Promoted customer', uid: 'next', time: 500 };
    await flush();
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync.mock.calls.find(c => c[0] === 'Customer 0')[4]).toEqual({});
    sync.mockClear(); state.stock = {};
    await flush();
    expect(sync.mock.calls[0][0]).toBe('Promoted customer');
    expect(sync.mock.calls[0][4]).toEqual({});
  });
  it('cancels deferred work on logout, resets on login/video change, and disposes timers', async () => {
    const { state, sync } = setup(2);
    state.allowed = false; await flush();
    expect(sync).not.toHaveBeenCalled();
    state.allowed = true; await flush();
    expect(sync).toHaveBeenCalledTimes(2);
    sync.mockClear(); state.video = 'live-two'; await flush();
    expect(sync).toHaveBeenCalledTimes(2);
    expect(sync.mock.calls.every(c => c[2] === 'live-two')).toBe(true);
    sync.mockClear(); state.stock[1].price++;
    await nextTick(); scopes[0].stop(); await flush();
    expect(sync).not.toHaveBeenCalled();
  });
  it('groups normalized names once and repairs customer snapshots that arrive after stock', async () => {
    const { state, sync } = setup(1);
    state.stock[2] = { owner: ' customer  0 ', uid: 'uid-0', price: '200', time: 25 };
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync.mock.calls[0][4]).toEqual(bookingItems(state.stock, 'Customer 0'));
    sync.mockClear();
    state.customers = { old: { name: 'Cancelled', sessions: { 'live-one': { count: 1 } } } };
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync.mock.calls[0][0]).toBe('Cancelled');
    expect(sync.mock.calls[0][4]).toEqual({});
  });
  it('matches canonical booking fields including sparse Firebase arrays', () => {
    const stock = [null, { owner: 'A', time: 5, price: '129' }, null, { owner: 'A', price: null }];
    expect(deliverySyncPlan(stock, {}, 'live').get('a').items).toEqual(bookingItems(stock, 'A'));
  });
});

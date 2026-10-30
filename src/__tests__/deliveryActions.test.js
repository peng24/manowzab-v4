import { describe, it, expect, beforeEach, vi } from 'vitest';
import { completeDelivery, restoreDelivery, markDone, undoDone } from '../utils/deliveryActions';
import { syncDeliveryCustomerForOwner, setLiveDeliveryCustomersCache, setLiveAddressBookCache } from '../utils/deliverySync';

const state = vi.hoisted(() => ({ records: {}, stock: {}, retry: false }));
vi.mock('../composables/useFirebase', () => ({ db: {} }));
vi.mock('sweetalert2', () => ({ default: { fire: vi.fn().mockResolvedValue({ isConfirmed: true }) } }));
vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => path),
  get: vi.fn(async path => ({ val: () => structuredClone(state.stock[path] || null), exists: () => Boolean(state.stock[path]) })),
  update: vi.fn(),
  runTransaction: vi.fn(async (path, transition) => {
    if (state.retry) transition(null); // Firebase's first callback may have an empty local cache.
    const next = transition(structuredClone(state.records[path] || null));
    if (next !== undefined) state.records[path] = next;
    return { committed: next !== undefined,
      snapshot: { val: () => structuredClone(state.records[path]), exists: () => Boolean(state.records[path]) } };
  }),
}));

const path = 'delivery_customers/u';
const stock = { 1: { owner: 'Buyer', uid: 'u', time: 100, price: 100 } };
const customer = () => ({ id: 'u', ...structuredClone(state.records[path]) });
beforeEach(() => {
  vi.clearAllMocks(); state.records = {}; state.stock = {}; state.retry = false;
  setLiveDeliveryCustomersCache({ u: { name: 'Buyer', status: 'pending' } });
  setLiveAddressBookCache({});
});

describe('shared shipping actions and real stock-sync entry point', () => {
  it('books through sync, completes, restores and completes again', async () => {
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    await completeDelivery(customer());
    expect(customer()).toMatchObject({ itemCount: 0, totalBookings: 1 });
    await restoreDelivery(customer());
    expect(customer()).toMatchObject({ itemCount: 1, totalBookings: 0 });
    await completeDelivery(customer());
    expect(customer().totalBookings).toBe(1);
  });
  it('counts one delivery once when two devices confirm simultaneously', async () => {
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    const expected = customer();
    const results = await Promise.allSettled([completeDelivery(expected), completeDelivery(expected)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(customer().totalBookings).toBe(1);
  });
  it('restores only once when two devices undo simultaneously', async () => {
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    await completeDelivery(customer());
    const expected = customer();
    const results = await Promise.allSettled([restoreDelivery(expected), restoreDelivery(expected)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(customer()).toMatchObject({ itemCount: 1, totalBookings: 0 });
  });
  it('aggregates two simultaneous sessions despite stale customer caches', async () => {
    await Promise.all([
      syncDeliveryCustomerForOwner('Buyer', 'u', 'live1', stock),
      syncDeliveryCustomerForOwner('Buyer', 'u', 'live2', { 2: { ...stock[1], price: 200 } }),
    ]);
    expect(customer()).toMatchObject({ itemCount: 2, totalPrice: 300 });
  });
  it('does not resurrect a delivered item when its price is edited', async () => {
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    await completeDelivery(customer());
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', { 1: { ...stock[1], price: 200 } });
    expect(customer()).toMatchObject({ status: 'done', itemCount: 0, totalBookings: 1 });
  });
  it('captures stock identities for legacy pending sessions before completion', async () => {
    state.records[path] = { name: 'Buyer', status: 'pending', itemCount: 1, sessions: { live: { count: 1, totalPrice: 100, status: 'pending' } } };
    state.stock['stock/live'] = stock;
    await completeDelivery(customer());
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    expect(customer()).toMatchObject({ status: 'done', itemCount: 0 });
  });
  it('still ships and restores count-only legacy records when historical stock has been pruned', async () => {
    state.records[path] = { name: 'Buyer', status: 'pending', itemCount: 2, sessions: { old: { count: 2, totalPrice: 200, status: 'pending' } } };
    await completeDelivery(customer());
    expect(customer()).toMatchObject({ itemCount: 0, totalBookings: 2 });
    await restoreDelivery(customer());
    expect(customer()).toMatchObject({ itemCount: 2, totalPrice: 200, totalBookings: 0 });
  });
  it('refuses a legacy shipment when its existing stock changed after the operator reviewed it', async () => {
    state.records[path] = { name: 'Buyer', status: 'pending', itemCount: 2, sessions: { old: { count: 2, totalPrice: 200, status: 'pending' } } };
    state.stock['stock/old'] = stock;
    await expect(completeDelivery(customer())).rejects.toThrow('ข้อมูลสินค้าเปลี่ยนแปลง');
    expect(customer().status).toBe('pending');
  });
  it('tolerates empty-cache callbacks and transaction retries', async () => {
    await syncDeliveryCustomerForOwner('Buyer', 'u', 'live', stock);
    state.retry = true;
    await completeDelivery(customer());
    await restoreDelivery(customer());
    expect(customer()).toMatchObject({ itemCount: 1, totalBookings: 0 });
  });
  it('reports write failures without claiming a successful completion', async () => {
    const { runTransaction } = await import('firebase/database');
    const { default: Swal } = await import('sweetalert2');
    runTransaction.mockRejectedValueOnce(new Error('offline'));
    await markDone({ id: 'u', name: 'Buyer' });
    expect(Swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({ icon: 'error', text: 'offline' }));
    expect(Swal.fire).not.toHaveBeenCalledWith(expect.objectContaining({ icon: 'success' }));
  });
  it('leaves data intact when the confirmation dialog is cancelled', async () => {
    const { runTransaction } = await import('firebase/database');
    const { default: Swal } = await import('sweetalert2');
    Swal.fire.mockResolvedValueOnce({ isConfirmed: false });
    await markDone({ id: 'u', name: 'Buyer' });
    expect(runTransaction).not.toHaveBeenCalled();
  });
  it('shows an actionable error for historical records without a safe undo snapshot', async () => {
    const { default: Swal } = await import('sweetalert2');
    await undoDone({ id: 'u', status: 'done' });
    expect(Swal.fire).toHaveBeenLastCalledWith(expect.objectContaining({ icon: 'error' }));
  });
});

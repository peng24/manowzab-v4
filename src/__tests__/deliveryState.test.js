import { describe, it, expect } from 'vitest';
import { bookingItems, syncDeliverySession, completeDeliveryState, undoDeliveryState, deliveryUndoKey, isOutstandingBooking } from '../utils/deliveryState';

const ownerName = 'Buyer';
const board = { 1: { owner: ownerName, uid: 'u', time: 100, price: 100 }, 2: { owner: ownerName, uid: 'u', time: 200, price: 200 } };
const sync = (current, videoId = 'live', stock = board) => syncDeliverySession(current,
  { ownerName, videoId, items: bookingItems(stock, ownerName), now: 1000 });
const complete = customer => completeDeliveryState(customer, structuredClone(customer), 2000, 'cycle-1');

describe('delivery lifecycle', () => {
  it('books, completes, undoes and completes again without double lifetime totals', () => {
    const booked = sync(null);
    const done = complete(booked);
    expect(done).toMatchObject({ status: 'done', totalBookings: 2, itemCount: 0, totalPrice: 0 });
    const restored = undoDeliveryState(done, 'cycle-1', 3000);
    expect(restored).toMatchObject({ totalBookings: 0, itemCount: 2, totalPrice: 300 });
    expect(complete(restored).totalBookings).toBe(2);
  });

  it('aborts simultaneous confirmations and simultaneous undo attempts', () => {
    const booked = sync(null);
    const done = complete(booked);
    expect(completeDeliveryState(done, booked, 2001, 'cycle-2')).toBeUndefined();
    const restored = undoDeliveryState(done, 'cycle-1', 3000);
    expect(undoDeliveryState(restored, 'cycle-1', 3001)).toBeUndefined();
  });

  it('leaves old completed sessions closed when undoing the latest shipment', () => {
    const booked = sync({ sessions: { old: { count: 10, totalPrice: 1000, status: 'done' } }, totalBookings: 10 });
    const restored = undoDeliveryState(complete(booked), 'cycle-1', 3000);
    expect(restored.sessions.old.status).toBe('done');
    expect(restored.itemCount).toBe(2);
    expect(restored.totalBookings).toBe(10);
  });

  it('does not revive completed bookings on price edits, board reload or empty-board cleanup', () => {
    const done = complete(sync(null));
    const changed = { ...board, 1: { ...board[1], price: 999 } };
    expect(sync(done, 'live', changed)).toMatchObject({ status: 'done', itemCount: 0 });
    expect(sync(done)).toMatchObject({ status: 'done', itemCount: 0 });
    expect(sync(done, 'live', {})).toMatchObject({ status: 'done', itemCount: 0 });
  });

  it('only opens newly booked items in the same video after shipping', () => {
    const done = complete(sync(null));
    const extended = { ...board, 3: { owner: ownerName, uid: 'u', time: 300, price: 50 } };
    const pending = sync(done, 'live', extended);
    expect(pending).toMatchObject({ status: 'pending', itemCount: 1, totalPrice: 50 });
    expect(Object.keys(pending.sessions.live.items)).toEqual(['3']);
    const second = completeDeliveryState(pending, pending, 3000, 'cycle-2');
    expect(second.totalBookings).toBe(3);
    const undone = undoDeliveryState(second, 'cycle-2', 4000);
    expect(undone.itemCount).toBe(1);
    expect(undone.totalBookings).toBe(2);
    expect(sync(undone, 'live', extended).itemCount).toBe(1);
  });

  it('recognizes cancellation and rebooking of the same item as a new booking', () => {
    const done = complete(sync(null));
    const rebooked = { ...board, 1: { ...board[1], time: 400 } };
    expect(sync(done, 'live', rebooked)).toMatchObject({ itemCount: 1, totalPrice: 100 });
  });

  it('preserves bookings arriving after completion when undoing an earlier cycle', () => {
    const done = complete(sync(null));
    const extended = { ...board, 3: { owner: ownerName, time: 300, price: 50 } };
    const restored = undoDeliveryState(sync(done, 'live', extended), 'cycle-1', 4000);
    expect(restored).toMatchObject({ itemCount: 3, totalPrice: 350, totalBookings: 0 });
  });

  it('recalculates simultaneous different-video writes from the latest transaction state', () => {
    const first = sync(null, 'live1', { 1: board[1] });
    const second = sync(first, 'live2', { 2: board[2] });
    expect(second).toMatchObject({ itemCount: 2, totalPrice: 300 });
  });

  it('aborts a stale confirmation when new items arrived while the dialog was open', () => {
    const original = sync(null, 'live', { 1: board[1] });
    expect(completeDeliveryState(sync(original), original, 2000, 'cycle')).toBeUndefined();
  });

  it('accepts equivalent reviewed items even if Firebase serializes their field order differently', () => {
    const original = sync(null);
    const reviewed = structuredClone(original);
    const item = reviewed.sessions.live.items[1];
    reviewed.sessions.live.items[1] = { price: item.price, bookedAt: item.bookedAt, bookingKey: item.bookingKey };
    expect(completeDeliveryState(original, reviewed, 2000, 'cycle')).toMatchObject({ status: 'done', totalBookings: 2 });
  });

  it('handles Firebase numeric-key item maps returned as sparse arrays or JSON arrays', () => {
    const original = sync(null);
    const fromFirebase = structuredClone(original);
    fromFirebase.sessions.live.items = [];
    fromFirebase.sessions.live.items[1] = original.sessions.live.items[1];
    fromFirebase.sessions.live.items[2] = original.sessions.live.items[2];
    const reviewed = JSON.parse(JSON.stringify(fromFirebase));
    const done = completeDeliveryState(fromFirebase, reviewed, 2000, 'cycle');
    expect(done).toMatchObject({ status: 'done', totalBookings: 2 });
    const roundTrip = JSON.parse(JSON.stringify(done));
    roundTrip.sessions.live.fulfilledItems = [null, ...Object.values(done.sessions.live.fulfilledItems)];
    expect(sync(roundTrip).itemCount).toBe(0);
    expect(undoDeliveryState(roundTrip, 'cycle', 3000)).toMatchObject({ itemCount: 2, totalPrice: 300 });
  });

  it('adopts legacy done records without reopening historical stock', () => {
    const legacy = { status: 'done', totalBookings: 2, sessions: { live: { count: 2, totalPrice: 300, status: 'done' } } };
    expect(sync(legacy)).toMatchObject({ status: 'done', itemCount: 0, totalBookings: 2 });
  });

  it('recognizes bookings newer than a legacy shipment completion time', () => {
    const legacy = { status: 'done', updatedAt: 150, totalBookings: 1, sessions: { live: { count: 1, totalPrice: 100, status: 'done' } } };
    expect(sync(legacy)).toMatchObject({ status: 'pending', itemCount: 1, totalPrice: 200 });
  });

  it('handles manual customers without sessions', () => {
    const customer = { name: ownerName, itemCount: 2, totalPrice: 300, status: 'pending' };
    expect(undoDeliveryState(complete(customer), 'cycle-1', 3000)).toMatchObject({ itemCount: 2, totalPrice: 300, totalBookings: 0 });
  });

  it('does not invent an undo cycle for historical records without metadata', () => {
    expect(undoDeliveryState({ status: 'done', totalBookings: 10 }, null, 3000)).toBeUndefined();
  });

  it('keeps legacy undo working when the previous app saved the latest cycle IDs', () => {
    const legacy = { status: 'done', updatedAt: 1000, lastDoneCount: 2, lastDoneSessions: ['recent'], totalBookings: 12,
      sessions: { old: { status: 'done', count: 10 }, recent: { status: 'done', count: 2, totalPrice: 300 } } };
    const restored = undoDeliveryState(legacy, deliveryUndoKey(legacy), 2000);
    expect(restored).toMatchObject({ itemCount: 2, totalPrice: 300, totalBookings: 10 });
    expect(restored.sessions.old.status).toBe('done');
    expect(deliveryUndoKey(restored)).toBeNull();
  });

  it('does not treat changing a proxy UID to a real UID as a new booking', () => {
    const done = complete(sync(null));
    expect(sync(done, 'live', { ...board, 1: { ...board[1], uid: 'real-youtube-uid' } }).itemCount).toBe(0);
  });

  it('identifies pending items consistently for counters, owner lists and dashboard', () => {
    const done = complete(sync(null));
    expect(isOutstandingBooking(done.sessions.live, '1', board[1])).toBe(false);
    expect(isOutstandingBooking(done.sessions.live, '3', { time: 300 })).toBe(true);
    expect(isOutstandingBooking({ status: 'done' }, '1', board[1])).toBe(false);
    expect(isOutstandingBooking(null, '1', board[1])).toBe(true);
  });

  it('does not mutate the state Firebase supplies when retrying a transaction', () => {
    const original = sync(null);
    const copy = structuredClone(original);
    complete(original);
    expect(original).toEqual(copy);
  });
});

// Pure state transitions shared by stock sync and both shipping screens.
// RTDB records are JSON; this also works on older iPads without structuredClone.
const cloneRecord = value => JSON.parse(JSON.stringify(value));
// RTDB may return dense numeric-key maps as arrays (with empty/null slots).
const normalizeItems = items => Object.fromEntries(Object.entries(items || {}).filter(([, item]) => item && typeof item === 'object'));

export function bookingItems(stock, ownerName) {
  const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  return Object.fromEntries(Object.entries(stock || {})
    .filter(([, item]) => item?.owner && norm(item.owner) === norm(ownerName))
    .map(([id, item]) => [id, {
      bookingKey: `${id}:${item.time || 0}`,
      bookedAt: Number(item.time) || 0,
      price: Number.parseInt(item.price, 10) || 0,
    }]));
}

export function isOutstandingBooking(session, id, item) {
  if (!session) return true;
  if (session.fulfilledItems) {
    return session.fulfilledItems[id]?.bookingKey !== `${id}:${item.time || 0}`;
  }
  return session.status !== 'done';
}

function itemTotals(items) {
  items = normalizeItems(items);
  return {
    count: Object.keys(items || {}).length,
    totalPrice: Object.values(items || {}).reduce((sum, item) => sum + item.price, 0),
  };
}

export function recalculateDelivery(customer) {
  const active = Object.values(customer.sessions || {}).filter(s => s && s.status !== 'done');
  customer.itemCount = active.reduce((sum, s) => sum + (Number(s.count) || 0), 0);
  customer.totalPrice = active.reduce((sum, s) => sum + (Number(s.totalPrice) || 0), 0);
  return customer;
}

export function syncDeliverySession(current, { ownerName, videoId, items, paymentType = '', now }) {
  if (!current && Object.keys(items).length === 0) return current;
  const next = cloneRecord(current || {
    name: ownerName.trim(), status: 'pending', note: '', paymentType,
    createdAt: now,
  });
  next.sessions ||= {};
  const previous = next.sessions[videoId];
  // Old completed sessions have no item identities. Adopt the current board as
  // their delivered baseline once, rather than reviving historical shipments.
  const legacyBaseline = previous?.status === 'done'
    ? Object.fromEntries(Object.entries(items).filter(([, item]) => !current.updatedAt || item.bookedAt <= current.updatedAt))
    : {};
  const fulfilled = normalizeItems(previous?.fulfilledItems || legacyBaseline);
  const pending = Object.fromEntries(Object.entries(items)
    .filter(([id, item]) => fulfilled[id]?.bookingKey !== item.bookingKey));
  if (Object.keys(pending).length) {
    next.sessions[videoId] = {
      ...previous, ...itemTotals(pending), status: 'pending', items: pending, fulfilledItems: fulfilled,
    };
    if (next.status === 'done') {
      next.status = 'pending';
      next.deliveryDate = null;
      next.labelPrinted = false;
      next.labelPrintedAt = null;
    }
  } else if (previous?.status === 'done') {
    next.sessions[videoId] = { ...previous, fulfilledItems: fulfilled };
  } else if (Object.keys(fulfilled).length) {
    next.sessions[videoId] = { count: 0, totalPrice: 0, status: 'done', fulfilledItems: fulfilled };
  } else {
    delete next.sessions[videoId];
  }
  next.name = ownerName.trim();
  if (!next.paymentType && paymentType) next.paymentType = paymentType;
  next.updatedAt = now;
  return recalculateDelivery(next);
}

function activeSignature(customer) {
  return JSON.stringify(Object.entries(customer.sessions || {})
    .filter(([, s]) => s && s.status !== 'done')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, s]) => [id, s.count || 0, s.totalPrice || 0,
      Object.entries(normalizeItems(s.items)).sort(([a], [b]) => a.localeCompare(b))
        .map(([itemId, item]) => [itemId, item.bookingKey, Number(item.price) || 0])]));
}

export function completeDeliveryState(current, expected, now, doneId, fallbackItems = {}) {
  if (!current) return current; // Firebase may first invoke a transaction with an empty cache.
  if (current.status === 'done' || activeSignature(current) !== activeSignature(expected) ||
      (current.itemCount || 0) !== (expected.itemCount || 0)) return;
  const next = cloneRecord(current);
  const sessions = {};
  for (const [vid, session] of Object.entries(next.sessions || {})) {
    if (!session || session.status === 'done') continue;
    const items = normalizeItems(session.items || fallbackItems[vid]);
    sessions[vid] = { ...session, items };
    next.sessions[vid] = {
      ...session, items, status: 'done', fulfilledItems: { ...normalizeItems(session.fulfilledItems), ...items },
    };
  }
  const hasSessions = Object.keys(sessions).length > 0;
  const count = hasSessions ? Object.values(sessions).reduce((sum, s) => sum + (s.count || 0), 0) : (current.itemCount || 0);
  const totalPrice = hasSessions ? Object.values(sessions).reduce((sum, s) => sum + (s.totalPrice || 0), 0) : (current.totalPrice || 0);
  next.lastDoneSnapshot = { sessions, itemCount: count, totalPrice };
  next.lastDoneSessions = Object.keys(sessions);
  next.lastDoneCount = count;
  next.lastDoneId = doneId;
  next.totalBookings = (Number(current.totalBookings) || 0) + count;
  next.status = 'done';
  next.itemCount = 0;
  next.totalPrice = 0;
  next.labelPrinted = false;
  next.labelPrintedAt = null;
  next.updatedAt = now;
  return next;
}

export function deliveryUndoKey(customer) {
  if (customer.lastDoneId && customer.lastDoneSnapshot) return customer.lastDoneId;
  if (customer.status === 'done' && Array.isArray(customer.lastDoneSessions) && customer.lastDoneSessions.length &&
      typeof customer.lastDoneCount === 'number') {
    return `legacy:${customer.updatedAt || 0}:${customer.lastDoneCount}:${[...customer.lastDoneSessions].sort().join(',')}`;
  }
  return null;
}

export function undoDeliveryState(current, expectedDoneId, now) {
  if (!current) return current;
  if (!expectedDoneId || deliveryUndoKey(current) !== expectedDoneId) return;
  const next = cloneRecord(current);
  const snapshot = next.lastDoneSnapshot || {
    sessions: Object.fromEntries(next.lastDoneSessions.filter(vid => next.sessions?.[vid])
      .map(vid => [vid, { ...next.sessions[vid], status: 'pending' }])),
  };
  next.sessions ||= {};
  for (const [vid, original] of Object.entries(snapshot.sessions || {})) {
    const active = next.sessions[vid];
    const newItems = active?.status !== 'done' ? normalizeItems(active?.items) : {};
    const items = { ...normalizeItems(original.items), ...newItems };
    next.sessions[vid] = {
      ...original, status: 'pending', items,
      ...(Object.keys(items).length ? itemTotals(items) : {}),
    };
  }
  recalculateDelivery(next);
  if (!Object.keys(snapshot.sessions || {}).length) {
    next.itemCount += snapshot.itemCount || 0;
    next.totalPrice += snapshot.totalPrice || 0;
  }
  next.totalBookings = Math.max(0, (Number(next.totalBookings) || 0) - (next.lastDoneCount || 0));
  next.status = 'pending';
  next.labelPrinted = false;
  next.labelPrintedAt = null;
  next.updatedAt = now;
  delete next.lastDoneSnapshot;
  delete next.lastDoneSessions;
  delete next.lastDoneCount;
  delete next.lastDoneId;
  return next;
}

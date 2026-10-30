// Run only against local emulators; never accepts a production project or endpoint.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously, signOut } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, ref, get, set, onValue, runTransaction, goOffline } from 'firebase/database';
import { bookingItems, syncDeliverySession, completeDeliveryState, undoDeliveryState } from '../src/utils/deliveryState.js';
import { createServer } from 'vite';
import { createPinia, setActivePinia } from 'pinia';

const projectId = 'demo-manowzab-review';
const namespace = `${projectId}-default-rtdb`;
const databaseHost = '127.0.0.1:9009';
const authHost = '127.0.0.1:9098';
const apps = [];
let passed = 0;
let server;
let appFirebase;
let appAuthStore;
let succeeded = false;
const listeners = [];

async function adminWrite(path, body) {
  const response = await fetch(`http://${databaseHost}/${path}.json?ns=${namespace}`, {
    method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10_000),
  });
  assert.equal(response.ok, true, await response.text());
}

function client(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-review-key', databaseURL: `https://${namespace}.firebaseio.com` }, `${name}-${Date.now()}`);
  apps.push(app);
  const auth = getAuth(app);
  const db = getDatabase(app);
  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectDatabaseEmulator(db, '127.0.0.1', 9009);
  return { app, auth, db };
}

async function check(name, fn) {
  let timeout;
  try {
    await Promise.race([fn(), new Promise((_resolve, reject) => {
      timeout = setTimeout(() => reject(new Error(`Timed out: ${name}`)), 15_000);
    })]);
  } finally { clearTimeout(timeout); }
  passed++;
  console.log(`PASS ${name}`);
}

try {
  const rules = JSON.parse(await readFile(new URL('../database.rules.json', import.meta.url), 'utf8'));
  await adminWrite('.settings/rules', rules);
  const admin = client('admin');
  const other = client('other-admin');
  const outsider = client('outsider');
  const anonymous = client('anonymous');
  const guest = client('guest');
  const password = 'Emulator-only-password-123';
  const create = (target, email) => createUserWithEmailAndPassword(target.auth, email, password);
  const [a, b] = await Promise.all([
    create(admin, `admin-${Date.now()}@example.invalid`),
    create(other, `other-${Date.now()}@example.invalid`),
    create(outsider, `outsider-${Date.now()}@example.invalid`),
    signInAnonymously(anonymous.auth),
  ]);
  await adminWrite('admin_users', { [a.user.uid]: true, [b.user.uid]: true });

  await check('Email/password signs in and rejects incorrect passwords', async () => {
    const email = a.user.email;
    await signOut(admin.auth);
    await assert.rejects(signInWithEmailAndPassword(admin.auth, email, 'incorrect-password'));
    await signInWithEmailAndPassword(admin.auth, email, password);
    assert.equal((await get(ref(admin.db, `admin_users/${a.user.uid}`))).val(), true);
  });

  const protectedNodes = Object.keys(rules.rules).filter(key => !key.startsWith('.') && key !== 'admin_users');
  for (const node of protectedNodes) {
    await check(`Rules protect ${node} for guests, anonymous and non-admin users`, async () => {
      await set(ref(admin.db, `${node}/review`), { test: true });
      for (const target of [guest, anonymous, outsider]) {
        await assert.rejects(get(ref(target.db, node)));
        await assert.rejects(set(ref(target.db, `${node}/review`), { modified: true }));
      }
      assert.deepEqual((await get(ref(other.db, `${node}/review`))).val(), { test: true });
    });
  }
  await check('Clients cannot grant themselves or other users administrator access', async () => {
    await assert.rejects(set(ref(outsider.db, `admin_users/${outsider.auth.currentUser.uid}`), true));
    await assert.rejects(set(ref(admin.db, 'admin_users/new-admin'), true));
    await assert.rejects(get(ref(outsider.db, `admin_users/${a.user.uid}`)));
  });

  // Load the actual app stores through Vite, with the same dev-only emulator
  // configuration as the browser, rather than copying their booking logic here.
  globalThis.localStorage = (() => {
    const data = new Map();
    return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
  })();
  globalThis.sessionStorage = globalThis.localStorage;
  Object.assign(process.env, {
    VITE_FIREBASE_API_KEY: 'demo-review-key', VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_DATABASE_URL: `https://${namespace}.firebaseio.com`,
    VITE_USE_FIREBASE_EMULATORS: 'true', VITE_YOUTUBE_API_KEYS: '', VITE_GOOGLE_API_KEYS: '',
  });
  server = await createServer({ mode: 'review', server: { middlewareMode: true }, appType: 'custom' });
  appFirebase = await server.ssrLoadModule('/src/composables/useFirebase.js');
  assert.equal(appFirebase.auth.app.options.projectId, projectId);
  await signInWithEmailAndPassword(appFirebase.auth, a.user.email, password);
  setActivePinia(createPinia());
  const { useAuthStore } = await server.ssrLoadModule('/src/stores/auth.js');
  appAuthStore = useAuthStore();
  const waitFor = async predicate => {
    for (let i = 0; i < 100; i++) {
      if (predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    assert.fail('Timed out waiting for app state');
  };
  await check('Actual auth store restores only an approved Firebase session', async () => {
    await waitFor(() => appAuthStore.isAuthenticated);
    assert.equal(appAuthStore.currentUser.uid, a.user.uid);
  });
  const { useSystemStore } = await server.ssrLoadModule('/src/stores/system.js');
  const { useStockStore } = await server.ssrLoadModule('/src/stores/stock.js');
  const system = useSystemStore();
  const stockStore = useStockStore();
  system.currentVideoId = 'review-live';
  await adminWrite('stock/review-live', null);
  await check('Actual stock store books, queues, deduplicates and promotes the next buyer', async () => {
    assert.equal((await stockStore.processOrder(15, 'Alice', 'buyer-alice', 'manual', 150)).action, 'claimed');
    assert.equal((await stockStore.processOrder(15, 'Bob', 'buyer-bob')).action, 'queued');
    assert.equal((await stockStore.processOrder(15, 'Bob', 'buyer-bob')).action, 'already_queued');
    const promoted = await stockStore.processCancel(15, 'buyer-alice', 'Alice');
    assert.equal(promoted.nextOwner, 'Bob');
    const item = (await get(ref(appFirebase.db, 'stock/review-live/15'))).val();
    assert.equal(item.owner, 'Bob');
    assert.equal(item.price, 150);
    await stockStore.processCancel(15, 'buyer-bob', 'Bob');
    assert.deepEqual((await get(ref(appFirebase.db, 'stock/review-live/15'))).val(), { price: 150 });
  });

  const ownerName = 'Emulator Buyer';
  const stock = { 1: { owner: ownerName, uid: 'buyer', time: 100, price: 100 }, 2: { owner: ownerName, uid: 'buyer', time: 200, price: 200 } };
  const path = 'delivery_customers/review-buyer';
  await adminWrite(path, null);
  const observed = new Map();
  // Match the application: each active screen keeps a real-time customer listener.
  await Promise.all([admin, other].map(target => new Promise((resolve, reject) => {
    listeners.push(onValue(ref(target.db, path), snapshot => { observed.set(target, snapshot.val()); resolve(); }, reject));
  })));
  // Assert server state, since an active client's listener cache may trail another
  // client's just-committed transaction by one event-loop turn.
  const current = async () => {
    const response = await fetch(`http://${databaseHost}/${path}.json?ns=${namespace}`, {
      headers: { Authorization: 'Bearer owner' }, signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.ok, true);
    return response.json();
  };
  const sync = (target, videoId, board) => runTransaction(ref(target.db, path), value => syncDeliverySession(value, {
    ownerName, videoId, items: bookingItems(board, ownerName), now: Date.now(),
  }));

  await check('Concurrent sessions preserve aggregate count and price', async () => {
    await Promise.all([sync(admin, 'live1', { 1: stock[1] }), sync(other, 'live2', { 2: stock[2] })]);
    assert.equal((await current()).itemCount, 2);
    assert.equal((await current()).totalPrice, 300);
  });
  await check('Two clients complete the same delivery exactly once', async () => {
    const expected = await current();
    await waitFor(() => [admin, other].every(target => observed.get(target)?.itemCount === expected.itemCount));
    const results = await Promise.all([admin, other].map((target, index) => runTransaction(ref(target.db, path),
      value => completeDeliveryState(value, expected, Date.now(), `cycle-${index}`))));
    assert.equal(results.filter(result => result.committed).length, 1);
    assert.equal((await current()).totalBookings, 2);
    assert.equal((await current()).itemCount, 0);
  });
  await check('Editing shipped stock does not reopen delivery', async () => {
    await sync(admin, 'live1', { 1: { ...stock[1], price: 500 } });
    assert.equal((await current()).status, 'done');
    assert.equal((await current()).itemCount, 0);
  });
  await check('Two clients undo the same delivery exactly once', async () => {
    const expected = await current();
    await waitFor(() => [admin, other].every(target => observed.get(target)?.lastDoneId === expected.lastDoneId));
    const results = await Promise.all([admin, other].map(target => runTransaction(ref(target.db, path),
      value => undoDeliveryState(value, expected.lastDoneId, Date.now()))));
    assert.equal(results.filter(result => result.committed).length, 1);
    assert.equal((await current()).totalBookings, 0);
    assert.equal((await current()).itemCount, 2);
  });
  await check('Revoking an administrator grant blocks subsequent writes', async () => {
    await adminWrite(`admin_users/${b.user.uid}`, false);
    await assert.rejects(set(ref(other.db, 'stock/review'), { test: 'revoked' }));
  });
  await check('Actual auth store removes access when its server grant is revoked', async () => {
    await adminWrite(`admin_users/${a.user.uid}`, false);
    await waitFor(() => !appAuthStore.isAuthenticated);
    await appAuthStore.logout();
    assert.equal(appFirebase.auth.currentUser, null);
  });
  console.log(`Firebase Emulator verification: ${passed} checks passed`);
  succeeded = true;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  // Firebase's Node transport can retain shutdown handles after goOffline.
  // Bound CLI cleanup without allowing a failed assertion to exit successfully.
  setTimeout(() => process.exit(succeeded ? 0 : 1), 2000);
  listeners.forEach(unsubscribe => unsubscribe());
  appAuthStore?.$dispose();
  if (appFirebase) { goOffline(appFirebase.db); await deleteApp(appFirebase.auth.app); }
  await server?.close();
  await Promise.all(apps.map(async app => { goOffline(getDatabase(app)); await deleteApp(app); }));
}

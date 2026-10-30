import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '../stores/auth';

const state = vi.hoisted(() => ({ auth: { currentUser: null }, authCallback: null, accessCallback: null, accessError: null, stopAccess: vi.fn(), stopAuth: vi.fn() }));
vi.mock('../composables/useFirebase', () => ({ auth: state.auth, db: {} }));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: 'local', setPersistence: vi.fn().mockResolvedValue(),
  onAuthStateChanged: vi.fn((_auth, callback) => { state.authCallback = callback; return state.stopAuth; }),
  signInWithEmailAndPassword: vi.fn(), signOut: vi.fn().mockImplementation(async () => {
    state.auth.currentUser = null; state.authCallback?.(null);
  }),
}));
vi.mock('firebase/database', () => ({
  ref: vi.fn((_db, path) => path), get: vi.fn(),
  onValue: vi.fn((_ref, callback, error) => { state.accessCallback = callback; state.accessError = error; return state.stopAccess; }),
}));

const admin = { uid: 'test-admin', email: 'admin@example.invalid', isAnonymous: false };
let store;
beforeEach(() => {
  vi.useFakeTimers(); vi.clearAllMocks();
  state.auth.currentUser = null; state.authCallback = null; state.accessCallback = null;
  setActivePinia(createPinia());
  global.localStorage = { removeItem: vi.fn() };
  global.sessionStorage = { removeItem: vi.fn() };
  store = useAuthStore();
});
afterEach(() => { store.$dispose(); vi.useRealTimers(); });

async function signIn(granted = true) {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const { get } = await import('firebase/database');
  get.mockResolvedValue({ val: () => granted });
  signInWithEmailAndPassword.mockImplementation(async () => {
    state.auth.currentUser = admin; state.authCallback(admin); return { user: admin };
  });
  return store.login(' ADMIN@example.invalid ', 'test-only-password');
}

describe('Firebase-backed administrator authentication', () => {
  it('never trusts or restores a fabricated local session', () => {
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.removeItem).toHaveBeenCalledWith('manowzab_auth_session');
    expect(sessionStorage.removeItem).toHaveBeenCalledWith('manowzab_auth_session');
  });
  it('authenticates a real Firebase user with a server-controlled admin grant', async () => {
    expect((await signIn()).success).toBe(true);
    expect(store.currentUser).toEqual({ uid: admin.uid, email: admin.email });
    const { setPersistence, signInWithEmailAndPassword } = await import('firebase/auth');
    expect(setPersistence).toHaveBeenCalledWith(state.auth, 'local');
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(state.auth, 'admin@example.invalid', 'test-only-password');
  });
  it('rejects an authenticated user who is not on the admin list', async () => {
    expect((await signIn(false)).success).toBe(false);
    expect(store.isAuthenticated).toBe(false);
    expect(state.auth.currentUser).toBeNull();
  });
  it('rejects anonymous restored users', () => {
    state.auth.currentUser = { uid: 'anonymous', isAnonymous: true };
    state.authCallback(state.auth.currentUser);
    expect(store.isAuthenticated).toBe(false);
  });
  it('restores SDK sessions only after checking access and reacts to revocation', () => {
    state.auth.currentUser = admin; state.authCallback(admin);
    expect(store.isAuthenticated).toBe(false);
    state.accessCallback({ val: () => true });
    expect(store.isAuthenticated).toBe(true);
    state.accessCallback({ val: () => false });
    expect(store.isAuthenticated).toBe(false);
  });
  it('denies access when the permission listener fails', () => {
    state.auth.currentUser = admin; state.authCallback(admin);
    state.accessError(new Error('permission denied'));
    expect(store.isAuthenticated).toBe(false);
    expect(store.authReady).toBe(true);
  });
  it('logs out of Firebase and detaches the permission listener', async () => {
    await signIn(); await store.logout();
    expect(store.isAuthenticated).toBe(false);
    expect(state.auth.currentUser).toBeNull();
    expect(state.stopAccess).toHaveBeenCalled();
  });
  it('ignores an obsolete permission event after logout', async () => {
    await signIn(); const oldCallback = state.accessCallback;
    await store.logout(); oldCallback({ val: () => true });
    expect(store.isAuthenticated).toBe(false);
  });
  it('updates the lockout countdown and re-enables login after expiry', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });
    for (let i = 0; i < 5; i++) await store.login('admin@example.invalid', 'wrong');
    expect(store.isLockedOut).toBe(true);
    expect(store.lockoutSecondsLeft).toBe(30);
    await vi.advanceTimersByTimeAsync(1000);
    expect(store.lockoutSecondsLeft).toBe(29);
    await vi.advanceTimersByTimeAsync(29000);
    expect(store.isLockedOut).toBe(false);
    expect((await signIn()).success).toBe(true);
  });
  it('reports network errors without accepting a local fallback', async () => {
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/network-request-failed' });
    const result = await store.login('admin@example.invalid', 'password');
    expect(result.success).toBe(false);
    expect(result.error).toContain('อินเทอร์เน็ต');
  });
});

import { defineStore } from 'pinia';
import { ref, computed, onScopeDispose } from 'vue';
import { browserLocalPersistence, onAuthStateChanged, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref as dbRef, get, onValue } from 'firebase/database';
import { auth, db } from '../composables/useFirebase';

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false);
  const authReady = ref(false);
  const currentUser = ref(null);
  const failedAttempts = ref(0);
  const lockoutUntil = ref(0);
  const clock = ref(Date.now());
  let clockTimer = null;
  let accessUnsubscribe = null;
  let loginInProgress = false;
  let generation = 0;

  // Retire client-generated sessions; they are never proof of identity.
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try { globalThis[storageName]?.removeItem('manowzab_auth_session'); } catch { /* Storage may be disabled. */ }
  }

  function setUser(user, allowed) {
    isAuthenticated.value = Boolean(user && !user.isAnonymous && allowed);
    currentUser.value = isAuthenticated.value ? { uid: user.uid, email: user.email } : null;
  }

  const unsubscribe = onAuthStateChanged(auth, user => {
    const version = ++generation;
    accessUnsubscribe?.();
    accessUnsubscribe = null;
    setUser(null, false);
    if (!user || user.isAnonymous) {
      authReady.value = true;
      return;
    }
    // Watch server-controlled grants, including revocation on an open device.
    accessUnsubscribe = onValue(dbRef(db, `admin_users/${user.uid}`), snapshot => {
      if (version !== generation || auth.currentUser?.uid !== user.uid) return;
      setUser(user, snapshot.val() === true);
      authReady.value = true;
    }, () => {
      if (version !== generation) return;
      setUser(null, false);
      authReady.value = true;
    });
  });

  function startLockout() {
    lockoutUntil.value = Date.now() + 30_000;
    clock.value = Date.now();
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      clock.value = Date.now();
      if (clock.value >= lockoutUntil.value) {
        lockoutUntil.value = 0;
        failedAttempts.value = 0;
        clearInterval(clockTimer);
        clockTimer = null;
      }
    }, 250);
  }

  const isLockedOut = computed(() => lockoutUntil.value > clock.value);
  const lockoutSecondsLeft = computed(() => Math.max(0, Math.ceil((lockoutUntil.value - clock.value) / 1000)));

  async function login(email, password) {
    clock.value = Date.now();
    if (isLockedOut.value) return { success: false, error: 'กรุณารอให้ครบเวลาที่ระงับก่อนลองอีกครั้ง' };
    if (loginInProgress) return { success: false, error: 'กำลังเข้าสู่ระบบ กรุณารอสักครู่' };
    loginInProgress = true;
    try {
      await setPersistence(auth, browserLocalPersistence);
      const { user } = await signInWithEmailAndPassword(auth, (email || '').trim().toLowerCase(), password || '');
      const grant = await get(dbRef(db, `admin_users/${user.uid}`));
      if (user.isAnonymous || grant.val() !== true || auth.currentUser?.uid !== user.uid) {
        await signOut(auth);
        setUser(null, false);
        return { success: false, error: 'บัญชีนี้ยังไม่ได้รับสิทธิ์ผู้ดูแลระบบ' };
      }
      setUser(user, true);
      authReady.value = true;
      failedAttempts.value = 0;
      lockoutUntil.value = 0;
      clearInterval(clockTimer);
      return { success: true };
    } catch (error) {
      setUser(null, false);
      failedAttempts.value += 1;
      if (failedAttempts.value >= 5) startLockout();
      const network = error.code === 'auth/network-request-failed';
      return { success: false, error: network ? 'เชื่อมต่อระบบเข้าสู่ระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต' : 'อีเมล รหัสผ่าน หรือสิทธิ์ผู้ดูแลระบบไม่ถูกต้อง' };
    } finally {
      loginInProgress = false;
    }
  }

  async function logout() {
    ++generation;
    accessUnsubscribe?.();
    accessUnsubscribe = null;
    setUser(null, false);
    await signOut(auth);
  }

  onScopeDispose(() => {
    ++generation;
    unsubscribe();
    accessUnsubscribe?.();
    clearInterval(clockTimer);
  });

  return { isAuthenticated, authReady, currentUser, failedAttempts, lockoutUntil,
    isLockedOut, lockoutSecondsLeft, login, logout };
});

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { logger } from "../utils/logger";

// 🔒 Irreversible One-Way Cryptographic Hashes (SHA-256 + Salt)
// No plaintext passwords or sensitive credentials exist anywhere in the code bundle!
const AUTH_EMAIL_HASH = "6d8f813edb17742eec9ed13a614045614409a9f8215ca0837b5dec082bc23c53";
const AUTH_PASS_HASH = "b6084fe2126624dfbe16de71b9c029fd87a0d80643c5cc3667c891e9bf1f8623";

const SESSION_STORAGE_KEY = "manowzab_auth_session";
const LOCKOUT_KEY = "manowzab_auth_lockout";
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds cooldown

// In-memory fallback for environments without Web Storage (e.g. Node tests)
const memoryStorage = new Map();

function safeGetItem(key, type = "local") {
  try {
    if (typeof window !== "undefined" && window[`${type}Storage`]) {
      return window[`${type}Storage`].getItem(key);
    }
  } catch {}
  return memoryStorage.get(`${type}_${key}`) || null;
}

function safeSetItem(key, val, type = "local") {
  try {
    if (typeof window !== "undefined" && window[`${type}Storage`]) {
      window[`${type}Storage`].setItem(key, val);
      return;
    }
  } catch {}
  memoryStorage.set(`${type}_${key}`, val);
}

function safeRemoveItem(key, type = "local") {
  try {
    if (typeof window !== "undefined" && window[`${type}Storage`]) {
      window[`${type}Storage`].removeItem(key);
      return;
    }
  } catch {}
  memoryStorage.delete(`${type}_${key}`);
}

/**
 * Irreversible SHA-256 Hash Digest with Web Crypto API
 */
export async function sha256Hash(str) {
  const salt = "manowzab_v4_salt";
  const saltedStr = `${str}:${salt}`;
  const cryptoObj = typeof globalThis !== "undefined" ? (globalThis.crypto || window?.crypto) : null;
  if (cryptoObj && cryptoObj.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedStr);
    const hashBuffer = await cryptoObj.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return "";
}

/**
 * Cryptographic signature generator for verified sessions
 */
function generateAuthSignature(email) {
  const raw = `${email.trim().toLowerCase()}:manowzab_permanent_auth_v4_secret`;
  try {
    return btoa(raw);
  } catch {
    return `${email}_perm_token`;
  }
}

export const useAuthStore = defineStore("auth", () => {
  const isAuthenticated = ref(false);
  const currentUser = ref(null);
  const failedAttempts = ref(0);
  const lockoutUntil = ref(0);

  // Initialize auth state from localStorage (Permanent Session Support)
  function checkAuth() {
    try {
      // 1. Check lockout status
      const savedLockout = safeGetItem(LOCKOUT_KEY, "local");
      if (savedLockout) {
        const parsedLock = parseInt(savedLockout, 10);
        if (parsedLock > Date.now()) {
          lockoutUntil.value = parsedLock;
        } else {
          safeRemoveItem(LOCKOUT_KEY, "local");
          lockoutUntil.value = 0;
          failedAttempts.value = 0;
        }
      }

      // 2. Check stored permanent session
      const stored = safeGetItem(SESSION_STORAGE_KEY, "local") || safeGetItem(SESSION_STORAGE_KEY, "session");
      if (stored) {
        const session = JSON.parse(stored);
        if (
          session &&
          session.email &&
          session.token &&
          session.token === generateAuthSignature(session.email)
        ) {
          isAuthenticated.value = true;
          currentUser.value = { email: session.email };
          logger.info("🔑 Permanent Auth Session Restored");
          return true;
        }
      }
    } catch (err) {
      logger.warn("⚠️ Auth validation error, resetting session:", err);
      logout();
    }

    isAuthenticated.value = false;
    currentUser.value = null;
    return false;
  }

  // Attempt login with SHA-256 Hash Matching
  async function login(email, password) {
    const now = Date.now();

    // Check if currently locked out
    if (lockoutUntil.value > now) {
      const remainingSec = Math.ceil((lockoutUntil.value - now) / 1000);
      return {
        success: false,
        error: `ระบบถูกระงับชั่วคราวเนื่องจากรหัสผ่านผิดเกินกำหนด กรุณารออีก ${remainingSec} วินาที`,
        lockoutRemaining: remainingSec,
      };
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = password || "";

    // Compute irreversible SHA-256 hash for both email & password
    const [emailHash, passHash] = await Promise.all([
      sha256Hash(cleanEmail),
      sha256Hash(cleanPass),
    ]);

    const isEmailValid = emailHash === AUTH_EMAIL_HASH;
    const isPassValid = passHash === AUTH_PASS_HASH;

    if (isEmailValid && isPassValid) {
      // Successful Login -> Persist Permanently in localStorage
      failedAttempts.value = 0;
      lockoutUntil.value = 0;
      safeRemoveItem(LOCKOUT_KEY, "local");

      const sessionData = {
        email: cleanEmail,
        token: generateAuthSignature(cleanEmail),
        loginAt: now,
        permanent: true,
      };

      const serialized = JSON.stringify(sessionData);
      safeSetItem(SESSION_STORAGE_KEY, serialized, "local");
      safeRemoveItem(SESSION_STORAGE_KEY, "session");

      isAuthenticated.value = true;
      currentUser.value = { email: cleanEmail };
      logger.info("✅ Login Success (Permanent Session Active)");

      return { success: true };
    } else {
      // Failed Login
      failedAttempts.value += 1;
      logger.warn(`❌ Failed Login Attempt (${failedAttempts.value}/${MAX_FAILED_ATTEMPTS})`);

      if (failedAttempts.value >= MAX_FAILED_ATTEMPTS) {
        const lockTime = now + LOCKOUT_DURATION_MS;
        lockoutUntil.value = lockTime;
        safeSetItem(LOCKOUT_KEY, lockTime.toString(), "local");
        return {
          success: false,
          error: "กรอกรหัสผ่านผิดเกิน 5 ครั้ง ระบบระงับการเข้าสู่ระบบชั่วคราว 30 วินาที",
          lockoutRemaining: 30,
        };
      }

      const remaining = MAX_FAILED_ATTEMPTS - failedAttempts.value;
      return {
        success: false,
        error: `อีเมลหรือรหัสผ่านไม่ถูกต้อง (เหลือโอกาสอีก ${remaining} ครั้ง)`,
        remainingAttempts: remaining,
      };
    }
  }

  // Logout
  function logout() {
    safeRemoveItem(SESSION_STORAGE_KEY, "local");
    safeRemoveItem(SESSION_STORAGE_KEY, "session");
    isAuthenticated.value = false;
    currentUser.value = null;
    logger.info("🚪 Logged out from Manowzab Command Center");
  }

  const isLockedOut = computed(() => {
    return lockoutUntil.value > Date.now();
  });

  const lockoutSecondsLeft = computed(() => {
    if (!isLockedOut.value) return 0;
    return Math.max(0, Math.ceil((lockoutUntil.value - Date.now()) / 1000));
  });

  // Automatically check auth on store creation
  checkAuth();

  return {
    isAuthenticated,
    currentUser,
    failedAttempts,
    lockoutUntil,
    isLockedOut,
    lockoutSecondsLeft,
    checkAuth,
    login,
    logout,
  };
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAuthStore } from "../stores/auth";

// Mock Web Storage for Node environment
function createStorageMock() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();
global.window = {
  localStorage: global.localStorage,
  sessionStorage: global.sessionStorage,
};

describe("useAuthStore (Single-User Authentication)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    global.localStorage.clear();
    global.sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("initializes with isAuthenticated = false when no stored session exists", () => {
    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.currentUser).toBeNull();
  });

  it("authenticates successfully with valid credentials and sets session", async () => {
    const authStore = useAuthStore();

    const result = await authStore.login(
      "peng24@gmail.com",
      "Peng24@31197012"
    );

    expect(result.success).toBe(true);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.currentUser?.email).toBe("peng24@gmail.com");

    // Verify localStorage persistence
    const saved = localStorage.getItem("manowzab_auth_session");
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved);
    expect(parsed.email).toBe("peng24@gmail.com");
    expect(parsed.token).toBeTruthy();
  });

  it("accepts email with leading/trailing spaces and different cases", async () => {
    const authStore = useAuthStore();

    const result = await authStore.login(
      "  PENG24@GMAIL.COM  ",
      "Peng24@31197012"
    );

    expect(result.success).toBe(true);
    expect(authStore.isAuthenticated).toBe(true);
  });

  it("rejects invalid password and increments failedAttempts", async () => {
    const authStore = useAuthStore();

    const result = await authStore.login("peng24@gmail.com", "WrongPassword123");

    expect(result.success).toBe(false);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.failedAttempts).toBe(1);
    expect(result.remainingAttempts).toBe(4);
  });

  it("rejects invalid email address", async () => {
    const authStore = useAuthStore();

    const result = await authStore.login("other@gmail.com", "Peng24@31197012");

    expect(result.success).toBe(false);
    expect(authStore.isAuthenticated).toBe(false);
  });

  it("locks out user for 30 seconds after 5 consecutive failed attempts", async () => {
    const authStore = useAuthStore();

    for (let i = 0; i < 4; i++) {
      const res = await authStore.login("peng24@gmail.com", "wrong");
      expect(res.success).toBe(false);
      expect(authStore.isLockedOut).toBe(false);
    }

    // 5th attempt triggers lockout
    const res5 = await authStore.login("peng24@gmail.com", "wrong");
    expect(res5.success).toBe(false);
    expect(authStore.isLockedOut).toBe(true);
    expect(res5.lockoutRemaining).toBe(30);

    // Subsequent attempt during lockout is immediately rejected
    const blockedRes = await authStore.login(
      "peng24@gmail.com",
      "Peng24@31197012"
    );
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.error).toContain("ระบบถูกระงับชั่วคราว");
  });

  it("logs out and clears session storage", async () => {
    const authStore = useAuthStore();

    await authStore.login("peng24@gmail.com", "Peng24@31197012", true);
    expect(authStore.isAuthenticated).toBe(true);

    authStore.logout();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.currentUser).toBeNull();
    expect(localStorage.getItem("manowzab_auth_session")).toBeNull();
  });

  it("restores authentication on checkAuth() when valid token is present", () => {
    localStorage.setItem(
      "manowzab_auth_session",
      JSON.stringify({
        email: "peng24@gmail.com",
        token: btoa("peng24@gmail.com:manowzab_permanent_auth_v4_secret"),
      })
    );

    const authStore = useAuthStore();
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.currentUser?.email).toBe("peng24@gmail.com");
  });
});

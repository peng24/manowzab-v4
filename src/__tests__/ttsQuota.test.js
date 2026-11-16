import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import {
  getCurrentTtsQuotaMonth,
  getVoiceQuotaTier,
  normalizeUsageCounts,
  getTierStatus,
  formatCompactChars,
} from "../utils/ttsQuota";

if (typeof localStorage === "undefined" || !localStorage.getItem) {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
}

vi.mock("firebase/database", () => ({
  ref: vi.fn((_db, path) => ({ path })),
  onValue: vi.fn(() => vi.fn()),
  get: vi.fn().mockResolvedValue({ exists: () => false, val: () => ({}) }),
  update: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

describe("TTS Quota Utilities", () => {
  it("formats UTC month key, classifies voice tier, and resets on month rollover", () => {
    expect(getCurrentTtsQuotaMonth(new Date("2026-11-16T10:00:00Z"))).toBe("2026-11");
    expect(getVoiceQuotaTier("th-TH-Chirp3-HD-Achernar")).toBe("chirp3");
    expect(getVoiceQuotaTier("th-TH-Chirp3-HD-Aoede")).toBe("chirp3");
    expect(getVoiceQuotaTier("th-TH-Standard-A")).toBe("standard");

    expect(normalizeUsageCounts({ month: "2026-10", chirp3: 500000, standard: 10000 }, "2026-11")).toEqual({
      month: "2026-11",
      chirp3: 0,
      standard: 0,
      updatedAt: 0,
    });
  });

  it("computes ok / warn (70%) / danger (90%) levels and compact formatting", () => {
    expect(getTierStatus("chirp3", 100_000)).toMatchObject({ level: "ok", percent: 10, isNearLimit: false });
    expect(getTierStatus("chirp3", 700_000)).toMatchObject({ level: "warn", isWarning: true, isNearLimit: false });
    expect(getTierStatus("chirp3", 900_000)).toMatchObject({ level: "danger", isNearLimit: true, remainingBeforeSwitch: 0 });
    expect(getTierStatus("standard", 3_600_000)).toMatchObject({ level: "danger", isNearLimit: true });

    expect(formatCompactChars(450)).toBe("450");
    expect(formatCompactChars(12450)).toBe("12.4k");
    expect(formatCompactChars(1_000_000)).toBe("1M");
  });
});

describe("System Store - TTS Quota Tracking & Auto-Switch", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not record usage or touch Firebase in a free build", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "false");
    const { update, onValue } = await import("firebase/database");
    vi.mocked(update).mockClear();
    vi.mocked(onValue).mockClear();

    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    store.recordTtsUsage("th-TH-Chirp3-HD-Achernar", 950_000);
    await store.setTtsUsageCalibration({ chirp3: 500_000, standard: 0 });
    expect(store.initTtsUsageListener()).toBeNull();
    expect(store.ttsUsage.chirp3).toBe(0);
    expect(store.ttsVoiceMode).toBe("native");
    expect(update).not.toHaveBeenCalled();
    expect(onValue).not.toHaveBeenCalled();
  });

  it("auto-switches Chirp 3: HD -> Standard-A at 90% and Standard-A -> Native at 90%", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    expect(store.ttsVoiceMode).toBe("achernar");
    expect(store.ttsAutoSwitchEnabled).toBe(true);

    store.recordTtsUsage("th-TH-Chirp3-HD-Achernar", 899_990);
    expect(store.ttsVoiceMode).toBe("achernar");
    expect(store.chirp3QuotaStatus.isWarning).toBe(true);

    // Crossing 900,000 triggers automatic switch to Standard-A
    store.recordTtsUsage("th-TH-Chirp3-HD-Achernar", 20);
    expect(store.ttsUsage.chirp3).toBe(900_010);
    expect(store.ttsVoiceMode).toBe("standard");
    expect(store.ttsAutoSwitchEvent).toMatchObject({
      fromMode: "achernar",
      toMode: "standard",
      reason: "chirp3_near_limit",
    });

    // Crossing 3,600,000 on Standard-A triggers automatic switch to Native
    store.recordTtsUsage("th-TH-Standard-A", 3_600_000);
    expect(store.ttsVoiceMode).toBe("native");
    expect(store.ttsAutoSwitchEvent).toMatchObject({
      fromMode: "standard",
      toMode: "native",
      reason: "standard_near_limit",
    });
  });

  it("flushes accumulated usage deltas via atomic Firebase transaction after debounce", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    const { runTransaction } = await import("firebase/database");
    vi.mocked(runTransaction).mockClear();

    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    store.recordTtsUsage("th-TH-Chirp3-HD-Achernar", 120);
    store.recordTtsUsage("th-TH-Standard-A", 45);
    expect(runTransaction).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(runTransaction).toHaveBeenCalledTimes(1);
    const updater = vi.mocked(runTransaction).mock.calls[0][1];
    const currentMonth = getCurrentTtsQuotaMonth();
    expect(updater({ month: currentMonth, chirp3: 1000, standard: 200 })).toMatchObject({
      month: currentMonth,
      chirp3: 1120,
      standard: 245,
    });
  });
});

import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

// Mock localStorage
if (typeof localStorage === "undefined" || !localStorage.getItem) {
  let store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

// Mock Firebase Realtime Database methods
vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
  get: vi.fn().mockResolvedValue({ exists: () => false, val: () => ({}) }),
  update: vi.fn().mockResolvedValue(true),
  runTransaction: vi.fn().mockResolvedValue({ committed: true }),
}));

// Mock Firebase config
vi.mock("../composables/useFirebase", () => ({
  db: {}
}));

describe("System Store - TTS Modes", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("defaults to 'standard' voice mode when no preference is saved", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.ttsVoiceMode).toBe("standard");
    expect(systemStore.useOnlineTts).toBe(true);
    expect(systemStore.googleVoiceName).toBe("th-TH-Standard-A");
  });

  it("automatically migrates legacy 'neural2' mode to 'standard'", async () => {
    localStorage.setItem("manowzab_tts_voice_mode", "neural2");

    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.ttsVoiceMode).toBe("standard");
    expect(localStorage.getItem("manowzab_tts_voice_mode")).toBe("standard");
  });

  it("restores 'native' mode if saved in localStorage", async () => {
    localStorage.setItem("manowzab_tts_voice_mode", "native");

    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.ttsVoiceMode).toBe("native");
    expect(systemStore.useOnlineTts).toBe(false);
  });

  it("cycles between 'standard' and 'native' in a 2-state loop", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    expect(systemStore.ttsVoiceMode).toBe("standard");

    // Cycle 1: standard -> native
    const mode1 = systemStore.cycleTtsMode();
    expect(mode1).toBe("native");
    expect(systemStore.ttsVoiceMode).toBe("native");
    expect(systemStore.useOnlineTts).toBe(false);
    expect(localStorage.getItem("manowzab_tts_voice_mode")).toBe("native");

    // Cycle 2: native -> standard
    const mode2 = systemStore.cycleTtsMode();
    expect(mode2).toBe("standard");
    expect(systemStore.ttsVoiceMode).toBe("standard");
    expect(systemStore.useOnlineTts).toBe(true);
    expect(localStorage.getItem("manowzab_tts_voice_mode")).toBe("standard");
  });

  it("updates ttsVoiceMode when useOnlineTts computed setter is used", async () => {
    const { useSystemStore } = await import("../stores/system");
    const systemStore = useSystemStore();

    systemStore.useOnlineTts = false;
    expect(systemStore.ttsVoiceMode).toBe("native");

    systemStore.useOnlineTts = true;
    expect(systemStore.ttsVoiceMode).toBe("standard");
  });
});

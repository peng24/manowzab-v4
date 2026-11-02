import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "false");
    vi.stubEnv("VITE_GOOGLE_API_KEYS", "test-cloud-key-1,test-cloud-key-2");
    setActivePinia(createPinia());
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("defaults to free native speech and does not load Cloud keys", async () => {
    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    expect(store.ttsVoiceMode).toBe("native");
    expect(store.useOnlineTts).toBe(false);
    expect(store.googleCloudTtsEnabled).toBe(false);
    expect(store.googleApiKey).toBe("");
  });

  it.each(["standard", "neural2", "invalid"])("migrates saved %s to free native speech", async saved => {
    localStorage.setItem("manowzab_tts_voice_mode", saved);
    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    expect(store.ttsVoiceMode).toBe("native");
    expect(store.useOnlineTts).toBe(false);
    expect(localStorage.getItem("manowzab_tts_voice_mode")).toBe("native");
  });

  it("restores native speech on existing devices", async () => {
    localStorage.setItem("manowzab_tts_voice_mode", "native");
    const { useSystemStore } = await import("../stores/system");
    expect(useSystemStore().ttsVoiceMode).toBe("native");
  });

  it("cannot switch to Cloud using either the toggle or computed setter in a free build", async () => {
    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    for (let i = 0; i < 3; i++) expect(store.cycleTtsMode()).toBe("native");
    store.useOnlineTts = true;
    expect(store.useOnlineTts).toBe(false);
    expect(localStorage.getItem("manowzab_tts_voice_mode")).toBe("native");
    store.ttsVoiceMode = "standard";
    expect(store.useOnlineTts).toBe(false);
  });

  it("skips Cloud key distribution and presence writes in a free build", async () => {
    const { useSystemStore } = await import("../stores/system");
    const { get, update } = await import("firebase/database");
    vi.mocked(get).mockClear(); vi.mocked(update).mockClear();
    const store = useSystemStore();
    store.googleApiKey = "key1,key2";
    await store.assignOptimalTtsKey(); store.updatePresenceTtsKey();
    expect(get).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
  });

  it("preserves the Cloud toggle only when explicitly enabled at build time", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    const { useSystemStore } = await import("../stores/system");
    const store = useSystemStore();
    expect(store.ttsVoiceMode).toBe("standard");
    expect(store.googleCloudTtsEnabled).toBe(true);
    expect(store.googleApiKey).toBe("test-cloud-key-1,test-cloud-key-2");
    expect(store.cycleTtsMode()).toBe("native");
    expect(store.useOnlineTts).toBe(false);
    expect(store.cycleTtsMode()).toBe("standard");
    store.useOnlineTts = true;
    expect(store.useOnlineTts).toBe(true);
  });

  it("restores Cloud once on devices migrated to native, then preserves a manual native choice", async () => {
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    localStorage.setItem("manowzab_tts_voice_mode", "native");
    const { useSystemStore } = await import("../stores/system");
    const first = useSystemStore();
    expect(first.ttsVoiceMode).toBe("standard");
    expect(localStorage.getItem("manowzab_tts_cloud_policy")).toBe("cloud-primary-2026-11-02");
    first.cycleTtsMode();
    setActivePinia(createPinia());
    expect(useSystemStore().ttsVoiceMode).toBe("native");
  });

  it("deduplicates author prefix when message starts with author name", async () => {
    const { ttsService } = await import("../services/TextToSpeech");
    const pushSpy = vi.spyOn(ttsService.queue, "push");
    vi.spyOn(ttsService, "processQueue").mockImplementation(() => {
      ttsService.queue.forEach((i) => i.onComplete?.());
      ttsService.queue.length = 0;
    });

    await ttsService.speak("มะระ", "มะระ 39 เมื่อวาน");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "มะระ ... สามสิบเก้า เมื่อวาน" })
    );

    await ttsService.speak("มะระ", "ของมะระ 39 เมื่อวาน");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "มะระ ... สามสิบเก้า เมื่อวาน" })
    );

    await ttsService.speak("นิรชา", "พี่เอาใบที่120");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "นิรชา ... พี่เอาใบที่หนึ่งร้อยยี่สิบ" })
    );

    await ttsService.speak("เดย์", "เสื้อสีแดง ราคาเท่าไหร่ เดย์");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "เดย์ ... เสื้อสีแดง ราคาเท่าไหร่" })
    );

    // ✅ Test booking number 15 pronounced as "สิบห้า" instead of "หนึ่งห้า"
    await ttsService.speak("สมใจ", "15");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "สมใจ ... สิบห้า" })
    );

    await ttsService.speak("สมใจ", "15 ค่ะ");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "สมใจ ... สิบห้า ค่ะ" })
    );

    await ttsService.speak("สมใจ", "cf 15");
    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({ text: "สมใจ ... ซีเอฟ สิบห้า" })
    );
  });
});

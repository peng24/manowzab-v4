import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextToSpeech } from "../services/TextToSpeech";
import { selectThaiVoice } from "../utils/nativeVoiceUtils";

vi.mock("../stores/system", () => ({ useSystemStore: () => ({
  useOnlineTts: true, googleApiKey: "old-key", googleVoiceName: "th-TH-Standard-A",
}) }));
vi.mock("../utils/logger", () => ({ logger: new Proxy({}, { get: () => vi.fn() }) }));

const localThai = { name: "Microsoft Pattara", lang: "th-TH", localService: true };
const browserThai = { name: "Google ไทย", lang: "th-TH", localService: false };
const english = { name: "English", lang: "en-US", localService: true };

describe("Thai voice selection", () => {
  it("prefers an installed Thai voice over a browser network voice", () => {
    expect(selectThaiVoice([english, browserThai, localThai])).toBe(localThai);
  });
  it("uses browser Thai when there is no installed Thai voice", () => {
    expect(selectThaiVoice([english, browserThai])).toBe(browserThai);
  });
  it.each([{ voices: [] }, { voices: [english] }])("does not choose an English voice for Thai: $voices", ({ voices }) => {
    expect(selectThaiVoice(voices)).toBeNull();
  });
  it("accepts a Thai locale with an underscore", () => {
    const voice = { ...localThai, lang: "th_TH" };
    expect(selectThaiVoice([voice])).toBe(voice);
  });
});

describe("free native TTS actual service", () => {
  let service, synth, fetchMock;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "false");
    fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    synth = { getVoices: vi.fn(() => [english, browserThai, localThai]), speak: vi.fn(), cancel: vi.fn(), speaking: false };
    vi.stubGlobal("window", { speechSynthesis: synth, ttsActiveUtterances: [] });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(text) { this.text = text; } });
    service = new TextToSpeech();
  });
  afterEach(() => {
    service.reset();
    if (service.poller) clearInterval(service.poller);
    vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks();
  });

  it("blocks even direct Cloud calls without making an HTTP request", async () => {
    await service.speakOnline("ทดสอบเสียง");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0]).toMatchObject({ lang: "th-TH", voice: localThai });
    synth.speak.mock.calls[0][0].onend();
  });

  it("keeps numbered Thai messages sequential and never invokes Cloud with legacy settings", async () => {
    const online = vi.spyOn(service, "speakOnline");
    const first = service.speak("สมใจ", "15");
    const second = service.speak("มะระ", "จอง 26");
    await Promise.resolve();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].text).toContain("สิบห้า");
    synth.speak.mock.calls[0][0].onend();
    await Promise.resolve();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    expect(synth.speak.mock.calls[1][0].text).toContain("ยี่สิบหก");
    synth.speak.mock.calls[1][0].onend();
    await Promise.all([first, second]);
    expect(online).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
    expect(service.isSpeaking).toBe(false);
    expect(window.ttsActiveUtterances).toHaveLength(0);
  });

  it("advances once after a native error even if an end event also arrives", async () => {
    const first = service.speak("", "หนึ่ง");
    const second = service.speak("", "สอง");
    await Promise.resolve();
    const utterance = synth.speak.mock.calls[0][0];
    utterance.onerror({ error: "synthesis-failed" }); utterance.onend();
    await Promise.resolve();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    synth.speak.mock.calls[1][0].onend();
    await Promise.all([first, second]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a Thai voice on the same call that loads it lazily", () => {
    service.cachedBestVoice = null; service.voices = [];
    expect(service.getBestVoice()).toBe(localThai);
  });

  it("returns no voice safely if the browser has no voice-list API", () => {
    service.cachedBestVoice = null;
    synth.getVoices = undefined;
    expect(service.getBestVoice()).toBeNull();
  });

  it("keeps polling when only English voices load first, then accepts late Thai", () => {
    service.cachedBestVoice = null;
    synth.getVoices.mockReturnValue([english]); service.loadVoices();
    expect(service.cachedBestVoice).toBeNull(); expect(service.poller).not.toBeNull();
    synth.getVoices.mockReturnValue([english, localThai]);
    vi.advanceTimersByTime(500);
    expect(service.cachedBestVoice).toBe(localThai); expect(service.poller).toBeNull();
  });

  it("reset settles active and waiting speech without starting the next utterance", async () => {
    const first = service.speak("", "หนึ่ง"); const second = service.speak("", "สอง");
    await Promise.resolve(); service.reset();
    await Promise.all([first, second]);
    expect(synth.speak).toHaveBeenCalledTimes(1); expect(service.queue).toHaveLength(0);
    expect(service.isSpeaking).toBe(false); expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TextToSpeech } from "../services/TextToSpeech";

const state = vi.hoisted(() => ({ useOnlineTts: true, googleApiKey: "key-a,key-b", googleVoiceName: "th-TH-Standard-A", activeKeyIndex: 1, updatePresenceTtsKey: vi.fn() }));
vi.mock("../stores/system", () => ({ useSystemStore: () => state }));
vi.mock("../utils/logger", () => ({ logger: new Proxy({}, { get: () => vi.fn() }) }));
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

describe("Cloud primary actual speech service", () => {
  let service, synth, sources, context, fetchMock;
  beforeEach(() => {
    vi.useFakeTimers(); vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
    state.useOnlineTts = true; state.activeKeyIndex = 1;
    sources = [];
    context = { state: "running", destination: {}, resume: vi.fn().mockResolvedValue(),
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
      createBufferSource: vi.fn(() => { const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; sources.push(source); return source; }) };
    synth = { getVoices: () => [{ name: "Microsoft Pattara", lang: "th-TH", localService: true }], speak: vi.fn(), cancel: vi.fn(), speaking: false };
    vi.stubGlobal("window", { AudioContext: function () { return context; }, speechSynthesis: synth, ttsActiveUtterances: [] });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(text) { this.text = text; } });
    fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audioContent: btoa("MP3") }) });
    vi.stubGlobal("fetch", fetchMock); service = new TextToSpeech();
  });
  afterEach(() => { service.reset(); clearInterval(service.poller); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("prefetches formatted speech without playing and consumes it once in FIFO order", async () => {
    await service.prefetchSpeech("สมใจ", "15");
    expect(sources).toHaveLength(0); expect(synth.speak).not.toHaveBeenCalled();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).input.text).toBe("สมใจ ... สิบห้า");
    const first = service.speak("สมใจ", "15"), second = service.speak("มะระ", "จอง 26");
    await flush(); expect(sources).toHaveLength(1); expect(fetchMock).toHaveBeenCalledTimes(1);
    sources[0].onended(); await flush();
    expect(sources).toHaveLength(2); expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).input.text).toContain("ยี่สิบหก");
    sources[1].onended(); await Promise.all([first, second]);
    expect(service.isSpeaking).toBe(false); expect(synth.speak).not.toHaveBeenCalled();
  });

  it("falls back to Pattara when Billing is disabled and continues every message", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: { details: [{ reason: "BILLING_DISABLED" }] } }) });
    const first = service.speak("", "หนึ่ง"), second = service.speak("", "สอง"); await flush();
    expect(synth.speak.mock.calls[0][0].voice.name).toBe("Microsoft Pattara");
    synth.speak.mock.calls[0][0].onend(); await flush();
    expect(synth.speak).toHaveBeenCalledTimes(2); expect(fetchMock).toHaveBeenCalledTimes(1);
    synth.speak.mock.calls[1][0].onend(); await Promise.all([first, second]);
    expect(service.isSpeaking).toBe(false);
  });

  it("falls back when a successful HTTP response contains undecodable audio", async () => {
    context.decodeAudioData.mockRejectedValue(new Error("Invalid MP3"));
    const task = service.speak("", "ทดสอบ"); await flush();
    expect(synth.speak).toHaveBeenCalledTimes(1); expect(sources).toHaveLength(0);
    synth.speak.mock.calls[0][0].onend(); await task;
  });

  it.each(["fetch", "decode", "resume"])("reset during %s prevents stale playback and leaves the new queue intact", async stage => {
    const delayed = deferred();
    if (stage === "fetch") fetchMock.mockReturnValueOnce(delayed.promise);
    if (stage === "decode") context.decodeAudioData.mockReturnValueOnce(delayed.promise);
    if (stage === "resume") { context.state = "suspended"; context.resume.mockReturnValueOnce(delayed.promise); }
    const old = service.speak("", "เก่า"); await flush(); service.reset(); await old;
    context.state = "running";
    const next = service.speak("", "ใหม่"); await flush();
    expect(sources).toHaveLength(1);
    delayed.resolve(stage === "fetch" ? { ok: true, json: async () => ({ audioContent: btoa("old") }) } : { duration: 1 });
    await flush(); expect(sources).toHaveLength(1); expect(service.isSpeaking).toBe(true);
    sources[0].onended(); await next; expect(service.isSpeaking).toBe(false);
    expect(synth.speak).not.toHaveBeenCalled();
  });

  it("ignores native cancellation events from the old generation", async () => {
    state.useOnlineTts = false;
    const old = service.speak("", "เก่า"); await flush();
    const previous = synth.speak.mock.calls[0][0]; service.reset(); await old;
    const next = service.speak("", "ใหม่"); await flush();
    previous.onerror({ error: "interrupted" }); previous.onend();
    expect(service.isSpeaking).toBe(true); expect(synth.speak).toHaveBeenCalledTimes(2);
    synth.speak.mock.calls[1][0].onend(); await next;
  });

  it("invalidates late decoding when the safety watchdog advances to the next message", async () => {
    const delayed = deferred(); context.decodeAudioData.mockReturnValueOnce(delayed.promise);
    const old = service.speak("", "เก่า"), next = service.speak("", "ใหม่"); await flush();
    await vi.advanceTimersByTimeAsync(30000);
    expect(sources).toHaveLength(1);
    delayed.resolve({ duration: 1 }); await flush();
    expect(sources).toHaveLength(1); expect(service.isSpeaking).toBe(true);
    sources[0].onended(); await Promise.all([old, next]);
  });
});

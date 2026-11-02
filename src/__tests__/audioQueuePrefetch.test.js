import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ isSoundOn: true, useOnlineTts: true }));
const tts = vi.hoisted(() => ({ audioCtx: null, speak: vi.fn(), prefetchSpeech: vi.fn(), reset: vi.fn() }));
vi.mock("../stores/system", () => ({ useSystemStore: () => state }));
vi.mock("../services/TextToSpeech", () => ({ ttsService: tts }));
vi.mock("../utils/logger", () => ({ logger: { debug: vi.fn(), warn: vi.fn() } }));
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe("unified audio queue with prefetch", () => {
  let audio, completions;
  beforeEach(async () => {
    vi.resetModules(); vi.useFakeTimers(); completions = [];
    state.isSoundOn = true; state.useOnlineTts = true;
    tts.audioCtx = null; tts.prefetchSpeech.mockReset().mockResolvedValue(null);
    tts.speak.mockReset().mockImplementation(() => new Promise(resolve => completions.push(resolve)));
    vi.stubGlobal("window", { speechSynthesis: { speaking: false }, addEventListener: vi.fn(), requestIdleCallback: vi.fn() });
    const { useAudio } = await import("../composables/useAudio"); audio = useAudio();
  });
  afterEach(() => { audio.resetVoice(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("prepares ahead while preserving every spoken message in order", async () => {
    for (const text of ["หนึ่ง", "สอง", "สาม", "สี่"]) audio.queueAudio(null, "", text);
    expect(tts.speak.mock.calls.map(call => call[1])).toEqual(["หนึ่ง"]);
    expect(tts.prefetchSpeech.mock.calls.map(call => call[1])).toEqual(["หนึ่ง", "สอง", "สาม"]);
    for (let i = 0; i < 4; i++) { completions[i](); await flush(); await vi.advanceTimersByTimeAsync(0); }
    expect(tts.speak.mock.calls.map(call => call[1])).toEqual(["หนึ่ง", "สอง", "สาม", "สี่"]);
  });

  it("does no speculative work when sound is muted or native is selected", () => {
    state.isSoundOn = false; audio.queueAudio(null, "", "ปิดเสียง");
    expect(tts.speak).not.toHaveBeenCalled(); expect(tts.prefetchSpeech).not.toHaveBeenCalled();
    state.isSoundOn = true; state.useOnlineTts = false; audio.queueAudio(null, "", "เสียงเครื่อง");
    expect(tts.speak).toHaveBeenCalledTimes(1); expect(tts.prefetchSpeech).not.toHaveBeenCalled();
  });

  it("ignores an old completion after reset without starting messages over the new active item", async () => {
    audio.queueAudio(null, "", "เก่า"); audio.resetVoice();
    audio.queueAudio(null, "", "ใหม่"); audio.queueAudio(null, "", "ถัดไป");
    completions[0](); await flush(); await vi.advanceTimersByTimeAsync(0);
    expect(tts.speak.mock.calls.map(call => call[1])).toEqual(["เก่า", "ใหม่"]);
    completions[1](); await flush(); await vi.advanceTimersByTimeAsync(0);
    expect(tts.speak.mock.calls.map(call => call[1])).toEqual(["เก่า", "ใหม่", "ถัดไป"]);
  });

  it("does not speak an old item when reset happens during its SFX", async () => {
    audio.queueAudio("success", "", "เก่า"); audio.resetVoice(); audio.queueAudio(null, "", "ใหม่");
    await flush(); expect(tts.speak.mock.calls.map(call => call[1])).toEqual(["ใหม่"]);
  });
});

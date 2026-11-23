import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  resolveTtsEmotion,
  getTtsEmotionProfile,
  applyEmotionTextCue,
} from "../utils/ttsEmotion";
import { TextToSpeech } from "../services/TextToSpeech";

const state = vi.hoisted(() => ({
  useOnlineTts: true,
  ttsVoiceMode: "achernar",
  googleApiKey: "key-a",
  googleVoiceName: "th-TH-Chirp3-HD-Achernar",
  activeKeyIndex: 1,
  updatePresenceTtsKey: vi.fn(),
  ttsAutoSwitchEnabled: true,
}));
vi.mock("../stores/system", () => ({ useSystemStore: () => state }));
vi.mock("../utils/logger", () => ({ logger: new Proxy({}, { get: () => vi.fn() }) }));

const flush = async () => {
  for (let i = 0; i < 30; i++) await Promise.resolve();
};

describe("Subtle TTS Emotion Mapping & Playback", () => {
  it("maps chat message intents to subtle emotions (buy -> happy, cancel -> sad, others -> neutral)", () => {
    expect(resolveTtsEmotion({ type: "buy" })).toBe("happy");
    expect(resolveTtsEmotion({ type: "cancel" })).toBe("sad");
    expect(resolveTtsEmotion({ sfxType: "cancel" })).toBe("sad");
    expect(resolveTtsEmotion({ type: "question" })).toBe("neutral");
    expect(resolveTtsEmotion({ type: "general" })).toBe("neutral");
    expect(resolveTtsEmotion({ type: "note" })).toBe("neutral");
    expect(resolveTtsEmotion({ type: "shipping" })).toBe("neutral");
    expect(resolveTtsEmotion({ type: null })).toBe("neutral");
    expect(resolveTtsEmotion(null)).toBe("neutral");
  });

  it("applies subtle text cue only for happy without introducing dots", () => {
    expect(applyEmotionTextCue("คุณสมใจ, สิบห้า", "happy")).toBe("คุณสมใจ, สิบห้า!");
    expect(applyEmotionTextCue("คุณสมใจ, สิบห้า!", "happy")).toBe("คุณสมใจ, สิบห้า!");
    expect(applyEmotionTextCue("คุณสมใจ, สีอะไรคะ?", "happy")).toBe("คุณสมใจ, สีอะไรคะ?");
    expect(applyEmotionTextCue("คุณสมใจ, สีอะไรคะ", "neutral")).toBe("คุณสมใจ, สีอะไรคะ");
    expect(applyEmotionTextCue("คุณสมใจ, ยกเลิก สิบห้า", "sad")).toBe("คุณสมใจ, ยกเลิก สิบห้า");
  });

  it("keeps acoustic shifts clearly audible yet natural (not exaggerated)", () => {
    const happy = getTtsEmotionProfile("happy");
    const neutral = getTtsEmotionProfile("neutral");
    const sad = getTtsEmotionProfile("sad");

    expect(happy.playbackRate).toBeGreaterThanOrEqual(1.07);
    expect(happy.playbackRate).toBeLessThanOrEqual(1.12);
    expect(happy.filterType).toBe("highshelf");
    expect(happy.filterGainDb).toBeGreaterThan(0);

    expect(sad.playbackRate).toBeLessThanOrEqual(0.9);
    expect(sad.playbackRate).toBeGreaterThanOrEqual(0.85);
    expect(sad.filterType).toBe("highshelf");
    expect(sad.filterGainDb).toBeLessThan(0);

    expect(neutral.playbackRate).toBe(1.0);
    expect(neutral.filterType).toBeNull();
    expect(neutral.standardPitch).toBe(0);
    expect(happy.standardPitch).toBeGreaterThan(0);
    expect(sad.standardPitch).toBeLessThan(0);
  });

  describe("Engine integration (Chirp 3: HD, Standard-A, Native)", () => {
    let service, synth, sources, filters, gains, context, fetchMock;

    beforeEach(() => {
      vi.stubEnv("VITE_ENABLE_GOOGLE_CLOUD_TTS", "true");
      state.useOnlineTts = true;
      state.ttsVoiceMode = "achernar";
      state.googleVoiceName = "th-TH-Chirp3-HD-Achernar";
      sources = [];
      filters = [];
      gains = [];
      context = {
        state: "running",
        destination: {},
        resume: vi.fn().mockResolvedValue(),
        decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
        createBiquadFilter: vi.fn(() => {
          const f = { type: "", frequency: { value: 0 }, gain: { value: 0 }, connect: vi.fn(), disconnect: vi.fn() };
          filters.push(f);
          return f;
        }),
        createGain: vi.fn(() => {
          const g = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
          gains.push(g);
          return g;
        }),
        createBufferSource: vi.fn(() => {
          const source = {
            playbackRate: { value: 1 },
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
          sources.push(source);
          return source;
        }),
      };
      synth = {
        getVoices: () => [{ name: "Microsoft Pattara", lang: "th-TH", localService: true }],
        speak: vi.fn(),
        cancel: vi.fn(),
        speaking: false,
      };
      vi.stubGlobal("window", {
        AudioContext: function () { return context; },
        speechSynthesis: synth,
        ttsActiveUtterances: [],
      });
      vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(text) { this.text = text; } });
      fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ audioContent: btoa("MP3") }) });
      vi.stubGlobal("fetch", fetchMock);
      service = new TextToSpeech();
    });

    afterEach(() => {
      service.reset();
      clearInterval(service.poller);
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("applies Web Audio prosody, EQ filter & '!' cue on Chirp 3: HD without sending pitch/speakingRate to API", async () => {
      const p1 = service.speak("คุณสมใจ", "15", { emotion: "happy" });
      await flush();
      const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body1.input.text).toBe("คุณสมใจ, สิบห้า!");
      expect(body1.audioConfig).toEqual({ audioEncoding: "MP3" });
      expect(sources[0].playbackRate.value).toBe(getTtsEmotionProfile("happy").playbackRate);
      expect(filters[0].type).toBe("highshelf");
      expect(filters[0].gain.value).toBe(getTtsEmotionProfile("happy").filterGainDb);
      expect(gains[0].gain.value).toBe(getTtsEmotionProfile("happy").gain);
      sources[0].onended();
      await p1;

      const p2 = service.speak("คุณสมใจ", "ยกเลิก 15", { emotion: "sad" });
      await flush();
      const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body2.input.text).toBe("คุณสมใจ, ยกเลิก สิบห้า");
      expect(body2.audioConfig).toEqual({ audioEncoding: "MP3" });
      expect(sources[1].playbackRate.value).toBe(getTtsEmotionProfile("sad").playbackRate);
      expect(filters[1].type).toBe("highshelf");
      expect(filters[1].gain.value).toBe(getTtsEmotionProfile("sad").filterGainDb);
      expect(gains[1].gain.value).toBe(getTtsEmotionProfile("sad").gain);
      sources[1].onended();
      await p2;

      const p3 = service.speak("คุณสมใจ", "สีอะไรคะ", { emotion: "neutral" });
      await flush();
      expect(sources[2].playbackRate.value).toBe(1);
      expect(filters).toHaveLength(2);
      expect(gains).toHaveLength(2); // neutral connects directly to destination
      sources[2].onended();
      await p3;
    });

    it("sends native pitch/speakingRate on Standard-A and does NOT double-apply Web Audio playbackRate", async () => {
      state.ttsVoiceMode = "standard";
      state.googleVoiceName = "th-TH-Standard-A";

      const p1 = service.speak("คุณสมใจ", "15", { emotion: "happy" });
      await flush();
      const body1 = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body1.audioConfig).toEqual({
        audioEncoding: "MP3",
        speakingRate: getTtsEmotionProfile("happy").standardSpeakingRate,
        pitch: getTtsEmotionProfile("happy").standardPitch,
      });
      expect(sources[0].playbackRate.value).toBe(1);
      sources[0].onended();
      await p1;

      const p2 = service.speak("คุณสมใจ", "ยกเลิก 15", { emotion: "sad" });
      await flush();
      const body2 = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(body2.audioConfig).toEqual({
        audioEncoding: "MP3",
        speakingRate: getTtsEmotionProfile("sad").standardSpeakingRate,
        pitch: getTtsEmotionProfile("sad").standardPitch,
      });
      expect(sources[1].playbackRate.value).toBe(1);
      sources[1].onended();
      await p2;
    });

    it("applies subtle rate/pitch on Native SpeechSynthesis", async () => {
      state.useOnlineTts = false;

      const p1 = service.speak("คุณสมใจ", "15", { emotion: "happy" });
      await flush();
      expect(synth.speak.mock.calls[0][0].rate).toBe(getTtsEmotionProfile("happy").nativeRate);
      expect(synth.speak.mock.calls[0][0].pitch).toBe(getTtsEmotionProfile("happy").nativePitch);
      synth.speak.mock.calls[0][0].onend();
      await p1;

      const p2 = service.speak("คุณสมใจ", "ยกเลิก 15", { emotion: "sad" });
      await flush();
      expect(synth.speak.mock.calls[1][0].rate).toBe(getTtsEmotionProfile("sad").nativeRate);
      expect(synth.speak.mock.calls[1][0].pitch).toBe(getTtsEmotionProfile("sad").nativePitch);
      synth.speak.mock.calls[1][0].onend();
      await p2;
    });
  });
});

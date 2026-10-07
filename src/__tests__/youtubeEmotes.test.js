import { describe, it, expect } from "vitest";
import {
  YOUTUBE_EMOTES,
  hasYouTubeEmotes,
  getYouTubeEmoteUrl,
  parseYouTubeEmotesToRuns,
  stripYouTubeEmotes,
} from "../data/youtubeEmotes";
import { TextToSpeech } from "../services/TextToSpeech";

describe("YouTube Custom Emotes Suite", () => {
  describe("YOUTUBE_EMOTES Dictionary", () => {
    it("contains official YouTube emotes with valid CDN URLs", () => {
      expect(Object.keys(YOUTUBE_EMOTES).length).toBeGreaterThan(90);
      expect(YOUTUBE_EMOTES[":yt:"]).toBeDefined();
      expect(YOUTUBE_EMOTES[":yt:"]).toContain("https://yt3.ggpht.com/");
      expect(YOUTUBE_EMOTES[":hand-pink-waving:"]).toBeDefined();
      expect(YOUTUBE_EMOTES[":buffering:"]).toBeDefined();
      expect(YOUTUBE_EMOTES[":face-blue-smiling:"]).toBeDefined();
    });

    it("all emote keys start and end with colons", () => {
      for (const key of Object.keys(YOUTUBE_EMOTES)) {
        expect(key.startsWith(":")).toBe(true);
        expect(key.endsWith(":")).toBe(true);
      }
    });
  });

  describe("hasYouTubeEmotes()", () => {
    it("detects known YouTube emotes in text", () => {
      expect(hasYouTubeEmotes("สวัสดี :yt: ครับ")).toBe(true);
      expect(hasYouTubeEmotes(":hand-pink-waving:")).toBe(true);
      expect(hasYouTubeEmotes("CF 01 :buffering:")).toBe(true);
    });

    it("returns false for regular text without emotes", () => {
      expect(hasYouTubeEmotes("สวัสดีครับ")).toBe(false);
      expect(hasYouTubeEmotes("CF 01")).toBe(false);
      expect(hasYouTubeEmotes("")).toBe(false);
      expect(hasYouTubeEmotes(null)).toBe(false);
      expect(hasYouTubeEmotes(undefined)).toBe(false);
    });
  });

  describe("getYouTubeEmoteUrl()", () => {
    it("returns URL for known emote", () => {
      const url = getYouTubeEmoteUrl(":yt:");
      expect(url).toBeDefined();
      expect(url).toContain("https://yt3.ggpht.com/");
    });

    it("returns null for unknown emote", () => {
      expect(getYouTubeEmoteUrl(":unknown-emote:")).toBeNull();
      expect(getYouTubeEmoteUrl("")).toBeNull();
      expect(getYouTubeEmoteUrl(null)).toBeNull();
    });
  });

  describe("parseYouTubeEmotesToRuns()", () => {
    it("parses single emote-only message into single emoji run", () => {
      const runs = parseYouTubeEmotesToRuns(":yt:");
      expect(runs).toHaveLength(1);
      expect(runs[0].emoji).toBeDefined();
      expect(runs[0].emoji.emojiId).toBe(":yt:");
      expect(runs[0].emoji.image.url).toBe(YOUTUBE_EMOTES[":yt:"]);
    });

    it("parses mixed text and emotes into sequential runs", () => {
      const text = "สวัสดี :hand-pink-waving: จอง 01 :yt:";
      const runs = parseYouTubeEmotesToRuns(text);
      expect(runs.length).toBeGreaterThanOrEqual(4);
      expect(runs[0].text).toBe("สวัสดี ");
      expect(runs[1].emoji.emojiId).toBe(":hand-pink-waving:");
      expect(runs[2].text).toBe(" จอง 01 ");
      expect(runs[3].emoji.emojiId).toBe(":yt:");
    });

    it("returns simple text run if no emotes exist", () => {
      const runs = parseYouTubeEmotesToRuns("ข้อความธรรมดา");
      expect(runs).toEqual([{ text: "ข้อความธรรมดา" }]);
    });

    it("handles null and empty input safely", () => {
      expect(parseYouTubeEmotesToRuns("")).toEqual([{ text: "" }]);
      expect(parseYouTubeEmotesToRuns(null)).toEqual([{ text: "" }]);
    });
  });

  describe("stripYouTubeEmotes()", () => {
    it("removes YouTube emote shortcodes from text", () => {
      expect(stripYouTubeEmotes("hello :yt: world")).toBe("hello  world");
      expect(stripYouTubeEmotes(":yt: :hand-pink-waving:")).toBe("");
    });
  });

  describe("TTS Sanitization with YouTube Emotes", () => {
    it("sanitizes text containing YouTube emotes without leaving shortcodes", () => {
      const tts = new TextToSpeech();
      const sanitized = tts.sanitize("สวัสดีครับ :hand-pink-waving: จอง 01");
      expect(sanitized).toBe("สวัสดีครับ จอร์ง 01");
      expect(sanitized).not.toContain(":hand-pink-waving:");
    });

    it("sanitizes emote-only message to empty string (triggering sent sticker fallback)", () => {
      const tts = new TextToSpeech();
      const sanitized = tts.sanitize(":yt:");
      expect(sanitized).toBe("");
    });
  });
});

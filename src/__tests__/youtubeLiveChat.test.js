import { describe, it, expect } from "vitest";
import { extractMessageRuns } from "../services/YouTubeLiveChat";

describe("YouTubeLiveChat - extractMessageRuns", () => {
  it("extracts plain string from textMessageDetails", () => {
    const item = {
      snippet: {
        textMessageDetails: {
          messageText: "CF 25 จ้า",
        },
        displayMessage: "CF 25 จ้า",
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "CF 25 จ้า" }]);
  });

  it("extracts runs array with emojis", () => {
    const item = {
      snippet: {
        textMessageDetails: {
          messageText: [
            { text: "สวัสดีครับ " },
            { emoji: { emojiId: "custom_wave", image: { url: "https://example.com/wave.png" } } },
          ],
        },
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs.length).toBe(2);
    expect(runs[0].text).toBe("สวัสดีครับ ");
    expect(runs[1].emoji.emojiId).toBe("custom_wave");
  });

  it("extracts altText from superStickerDetails (e.g. YouTube greeting sticker)", () => {
    const item = {
      snippet: {
        type: "superStickerEvent",
        superStickerDetails: {
          superStickerMetadata: {
            altText: "ทักทาย",
          },
        },
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "ทักทาย" }]);
  });

  it("falls back to 'ส่งสติกเกอร์' if superSticker has no altText", () => {
    const item = {
      snippet: {
        type: "superStickerEvent",
        superStickerDetails: {},
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "ส่งสติกเกอร์" }]);
  });

  it("extracts userComment from superChatDetails", () => {
    const item = {
      snippet: {
        type: "superChatEvent",
        superChatDetails: {
          userComment: "ขอบคุณมากครับ",
        },
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "ขอบคุณมากครับ" }]);
  });

  it("extracts userComment from memberMilestoneChatDetails", () => {
    const item = {
      snippet: {
        type: "memberMilestoneChatEvent",
        memberMilestoneChatDetails: {
          userComment: "สมาชิก 6 เดือนแล้วจ้า",
        },
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "สมาชิก 6 เดือนแล้วจ้า" }]);
  });

  it("falls back to displayMessage if no specific details exist", () => {
    const item = {
      snippet: {
        displayMessage: "ทักทาย",
      },
    };
    const runs = extractMessageRuns(item);
    expect(runs).toEqual([{ text: "ทักทาย" }]);
  });
});

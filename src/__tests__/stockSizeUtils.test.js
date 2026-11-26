import { describe, it, expect } from "vitest";
import {
  formatCompactStockSize,
  formatFullStockDetails,
  matchesStockDetailsQuery,
} from "../utils/stockSizeUtils.js";

describe("stockSizeUtils (Smart Compact Size Display & Search)", () => {
  it("extracts compact bust measurement first (single, dash, slash, and Thai range)", () => {
    expect(formatCompactStockSize({ details: "อก 54 ยาว 29 ไซส์ 2XL" })).toBe("อก54");
    expect(formatCompactStockSize({ details: "อก 52-54 ยาว 32" })).toBe("อก52-54");
    expect(formatCompactStockSize({ details: "อก 44 ถึง 46 ยาว 28" })).toBe("อก44-46");
    expect(formatCompactStockSize({ details: "อก 44/46" })).toBe("อก44-46");
    expect(formatCompactStockSize({ details: "อก 48.5 ยาว 27" })).toBe("อก48.5");
  });

  it("falls back to tag size (including Thai ฟรีไซส์ in long strings), then length, then short custom text", () => {
    expect(formatCompactStockSize({ details: "ไซส์ 2XL สีดำ" })).toBe("2XL");
    expect(formatCompactStockSize({ size: "xl" })).toBe("XL");
    expect(formatCompactStockSize({ details: "ฟรีไซส์ สีขาว ยาว 28" })).toBe("ฟรีไซส์");
    expect(formatCompactStockSize({ details: "ยาว 29 สีขาว" })).toBe("ยาว29");
    expect(formatCompactStockSize({ details: "ฟรีไซส์" })).toBe("ฟรีไซส์");
    expect(formatCompactStockSize({})).toBe("");
    expect(formatCompactStockSize(null)).toBe("");
  });

  it("returns full trimmed details string for tooltips and modal", () => {
    expect(formatFullStockDetails({ details: "  อก 52-54 ยาว 32  " })).toBe("อก 52-54 ยาว 32");
    expect(formatFullStockDetails({ size: "XL" })).toBe("XL");
    expect(formatFullStockDetails({})).toBe("");
  });

  it("matches size/details queries space-insensitively while ignoring pure item-number queries", () => {
    const item = { details: "อก 52-54 ยาว 32 ไซส์ 2XL" };
    expect(matchesStockDetailsQuery(item, "อก 52")).toBe(true);
    expect(matchesStockDetailsQuery(item, "อก52")).toBe(true);
    expect(matchesStockDetailsQuery(item, "2xl")).toBe(true);
    expect(matchesStockDetailsQuery(item, "ยาว32")).toBe(true);
    expect(matchesStockDetailsQuery(item, "อก 40")).toBe(false);
    // Pure digits must NOT match details so searching "#52" or "32" stays item/price-focused
    expect(matchesStockDetailsQuery(item, "52")).toBe(false);
    expect(matchesStockDetailsQuery(item, "#32")).toBe(false);
    expect(matchesStockDetailsQuery(item, "")).toBe(false);
  });
});

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("firebase/database", () => ({
  ref: vi.fn(),
  onValue: vi.fn(() => vi.fn()),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("../composables/useFirebase", () => ({
  db: {},
}));

import { normalizeStockSnapshot } from "../stores/stock";

describe("StockItemCard new-order animation & sparse-array resilience (60fps GPU-only)", () => {
  const cardSrc = readFileSync(resolve(process.cwd(), "src/components/StockItemCard.vue"), "utf8");
  const gridSrc = readFileSync(resolve(process.cwd(), "src/components/StockGrid.vue"), "utf8");
  const cssSrc = readFileSync(resolve(process.cwd(), "src/assets/style.css"), "utf8");

  it("normalizes Firebase RTDB sparse arrays without null holes so StockGrid watcher never crashes", () => {
    const sparse = [null, { owner: "กุ้ง", price: 60 }, null, { owner: "พี่กวาง", price: 80 }];
    const normalized = normalizeStockSnapshot(sparse);
    expect(Array.isArray(normalized)).toBe(false);
    expect(normalized[0]).toBeUndefined();
    expect(normalized[1]).toEqual({ owner: "กุ้ง", price: 60 });
    expect(normalized[2]).toBeUndefined();
    expect(normalized[3]).toEqual({ owner: "พี่กวาง", price: 80 });
    expect(normalizeStockSnapshot(null)).toEqual({});
    expect(normalizeStockSnapshot({ 1: { owner: "A" }, 2: null })).toEqual({ 1: { owner: "A" } });
  });

  it("renders floating new-order badge, flash burst, shimmer beam, and 8s GPU countdown bar when isNewOrder && item.owner", () => {
    expect(cardSrc).toContain('class="new-order-pill"');
    expect(cardSrc).toContain('class="new-order-flash"');
    expect(cardSrc).toContain('class="new-order-shimmer"');
    expect(cardSrc).toContain('class="new-order-timer-track"');
    expect(cardSrc).toContain('class="new-order-timer-fill"');
    expect(cardSrc).toContain("animation: newOrderCountdown 8s linear 1 forwards;");
  });

  it("uses only GPU-composited properties (transform/opacity) in all new-order keyframes and avoids infinite loops", () => {
    const keyframeNames = [
      "orderPopEntry",
      "newOrderFlashBurst",
      "newOrderNameReveal",
      "newOrderBadgePop",
      "newOrderDotPulse",
      "vipShimmerSweep",
      "newOrderRadar",
      "newOrderCountdown",
    ];

    for (const name of keyframeNames) {
      const match = cardSrc.match(new RegExp(`@keyframes\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
      expect(match, `Missing @keyframes ${name}`).not.toBeNull();
      const body = match[1];
      expect(body).not.toMatch(/\b(left|top|width|height|box-shadow|background(?:-color|-position)?)\s*:/);
      // Every animation invocation of this keyframe must be finite (no infinite)
      expect(cardSrc).not.toMatch(new RegExp(`animation:[^;]*${name}[^;]*infinite`));
    }
  });

  it("disables paint containment clipping on .new-order and does not globally kill live-order alerts on Windows reduced-motion", () => {
    expect(cardSrc).toMatch(/\.stock-item\.sold\.new-order\s*\{[\s\S]*?content-visibility:\s*visible;/);
    expect(cardSrc).toMatch(/\.stock-item\.sold\.new-order\s+\.stock-num\s*\{[\s\S]*?background:\s*transparent\s*!important;/);
    expect(cardSrc).toContain(".stock-item.highlight:not(.new-order)");
    expect(cardSrc).toContain("@media (prefers-reduced-motion: reduce)");
    // Must NOT contain wildcard * animation kill inside prefers-reduced-motion
    const reducedBlock = cssSrc.slice(cssSrc.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reducedBlock).not.toMatch(/\*\s*,[\s\S]*?animation-duration:\s*0\.01ms/);
  });

  it("marks empty loaded live boards as hydrated in StockGrid so the very first booking animates", () => {
    expect(gridSrc).toContain("if (activeVid && stockStore.loadedVideoId === activeVid)");
    expect(gridSrc).toContain("hydratedVideoId = activeVid;");
  });
});

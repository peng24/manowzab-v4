import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("StockItemCard new-order animation invariants (60fps GPU-only)", () => {
  const cardSrc = readFileSync(resolve(process.cwd(), "src/components/StockItemCard.vue"), "utf8");
  const gridSrc = readFileSync(resolve(process.cwd(), "src/components/StockGrid.vue"), "utf8");

  it("renders floating new-order badge, shimmer beam, and 8s GPU countdown bar when isNewOrder && item.owner", () => {
    expect(cardSrc).toContain('class="new-order-pill"');
    expect(cardSrc).toContain('class="new-order-shimmer"');
    expect(cardSrc).toContain('class="new-order-timer-track"');
    expect(cardSrc).toContain('class="new-order-timer-fill"');
    expect(cardSrc).toContain("animation: newOrderCountdown 8s linear 1 forwards;");
  });

  it("uses only GPU-composited properties (transform/opacity) in all new-order keyframes and avoids infinite loops", () => {
    const keyframeNames = [
      "orderPopEntry",
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

  it("preserves background-free .stock-num and prefers-reduced-motion support", () => {
    expect(cardSrc).toMatch(/\.stock-item\.sold\.new-order\s+\.stock-num\s*\{[\s\S]*?background:\s*transparent\s*!important;/);
    expect(cardSrc).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("marks empty loaded live boards as hydrated in StockGrid so the very first booking animates", () => {
    expect(gridSrc).toContain("if (activeVid && stockStore.loadedVideoId === activeVid)");
    expect(gridSrc).toContain("hydratedVideoId = activeVid;");
  });
});

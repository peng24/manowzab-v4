# Release 5.4.20 — Restore v5.4.18 UX/UI (2026-11-02)

## Requested behavior

The user requested returning the UX/UI to v5.4.18. Application source under `src/`, except changelog metadata and one trailing-whitespace cleanup, is restored to `b50aca2`, whose application source is the published v5.4.18 baseline. This restores the original layout, colours/glows, chat header/buttons, collapse interaction, mobile layout and queue editor. The v5.4.19 mobile tabs, width resizer, runtime status panels, draft interface and associated presentation-only helpers/tests are withdrawn. Original new-order emphasis still uses the 15,000ms timer.

The release number increases to 5.4.20 so installed clients can detect and receive the rollback. The UI baseline is v5.4.18; the published package version is 5.4.20. Historical release notes remain available. Previous v5.4.19 checks and its 800-test result describe that withdrawn UI, not this release.

Google Standard primary/native fallback, prefetch/FIFO/deadlines, explicit Cloud/free-build boundaries, the reviewed regex parser, authentication, stock/delivery transactions and business schema match v5.4.18. No production business data, payment settings or Billing controls are changed.

## Verification

- `git diff --ignore-space-at-eol --exit-code b50aca2 -- src :!src/data/changelog.js`: passes with no functional source differences. All production application source and pre-existing regression tests match the requested baseline; removed v5.4.19 helpers have no remaining runtime references.
- `npm test`: 772 tests passed in 32 files, including Cloud/native TTS, queue FIFO/reset, the reviewed chat corpus, stock, auth and delivery cases.
- `npm run build:gh`: four Pages entries plus PWA, 66 precache entries, approximately 1,442.48 KiB. Version, package-lock and changelog agree on 5.4.20; changelog retains 20 entries.
- A separate free-check build succeeds; artifact audit verifies the free bundle contains neither the Google synthesis endpoint nor the existing TTS keys.
- Browser fixture uses the actual App/components with localhost-only mock authentication and in-memory database. Desktop 1280px shows the original CONNECT/S1/LIVE header and 400px chat layout; the new tabs/resizer/status/audio controls are absent. Original collapse hides and reopens chat. Opening a queue, editing its customer name, saving and closing update the fixture correctly. Smart Answer remains a direct full-width row child with its thin black outline; question filtering and pin/HUD work. Mobile-emulated 390px restores the original layout without the v5.4.19 workspace tabs.
- The fixture proves rendering and local interaction, not authenticated production workflow, live YouTube, actual Google synthesis or physical two-device/audio/iPad/printing/PWA upgrade behavior.

## Checklist coverage and rules

| verify.md scope | Evidence |
|---|---|
| 1–5, 10–11, 17–18, 21–22 | Exact v5.4.18 source parity and current unit/regression suite, including TTS, parser, auth, stock and delivery. |
| 6–9, 12–16, 19–20 | Source parity/build plus original chat/queue/collapse/Smart Answer browser interaction. No production cleanup or real printer/device test. |
| 23 | Increasing release number, retained historical changelog, four-page/PWA artifact audit and publication checks. |

Updated `AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md` and verify items 16.6–16.10 to reflect the user's restored baseline and retire v5.4.19-only acceptance requirements. Original Billing alert-only documentation remains intact.

## Additional integration and deployment

- Firebase Emulator: 23 checks passed against local Auth 9098 / RTDB 9009 and demo-manowzab-review, including actual-store authorization/revocation, queue promotion and two-client delivery concurrency. Initial combined startup timed out waiting for Auth; starting Auth separately and rerunning the same integration suite succeeded. Expected permission-denied cases are passing security tests. No production data was written.
- After all 23 checks passed, the temporary Vite verification server logged an outdated dependency-scan cancellation during teardown. This was a closed-server background scan, not a failed test; the separate production builds completed successfully.
- Source commit `6d247e9` pushed to main; GitHub Pages published commit `7b1efa3`. All four HTML pages and entry scripts match the final build byte-for-byte, as do `sw.js` and `manifest.webmanifest`. The initial check ran during Pages propagation and the subsequent full check passed.
- Fresh production browser loads `main-CsYnv42a.js`; actual system store reports v5.4.20, Cloud enabled, standard mode, and no v5.4.19 mobilePanel/chatPanelWidth fields. The login page has no console warnings/errors. Protected production login and business workflows were not exercised.
- Unauthenticated stock/delivery_customers/address_book reads remain denied with HTTP 401. The fixture tab is closed and localhost ports 5190/9098/9009 are no longer listening.

# Release 5.4.19 — 2026-11-02

## Behavior

Implements the six approved workspace improvements: truthful connection and receipt-age labels; actual per-device Google/native/fallback/mute display; guarded queue drafts and save-and-navigation; mobile stock/chat workspaces plus desktop chat resizing; larger primary controls and keyboard access; and quieter operational surfaces. New bookings retain approximately 15 seconds of gentle emphasis through `CONSTANTS.UI.NEW_ORDER_EFFECT_MS = 15000`. Reduced-motion preferences suppress motion while keeping the temporary emphasis.

Mobile workspace and desktop width preferences remain local to each device. Incoming bookings do not change the selected mobile chat tab; explicit Smart Answer item jumps reveal stock and focus the item. CSV remains available in the mobile chat menu. Desktop pointer/keyboard resizing reserves stock space and cleans up temporary listeners.

Queue drafts confirm before discarding meaningful edits. Saving blocks duplicate submission, field changes and closing. Failed persistence retains the edited fields and current item; save-and-next proceeds only after success. Drafts from a different video cannot be saved. Manual edit announcements use `queueAudio` after successful persistence.

Status presentation adds no Firebase schema or shared preference writes. Historical/duplicate messages do not refresh receipt age; successful empty YouTube polls remain healthy. Existing authentication, booking transactions, delivery identity, parser rules, Cloud opt-in, prefetch deadlines, audio FIFO and blacklist/time guards remain in force. No Billing controls or payment settings were changed.

## Verification

- `npm test`: 800 tests passed across 33 files, including actual speech-service fallback/recovery/stale callbacks, fresh-versus-historical Firebase receipts, empty/failed poll heartbeat, local workspace preferences, mobile shortcut behavior, draft failure/serialization and width bounds. The reviewed 307-row chat corpus also passes.
- `npm run build:gh`: four entry pages and PWA generated, 66 precache entries, approximately 1,475.08 KiB. Version/package-lock/changelog agree; 20 changelog entries retained.
- Firebase Emulator: 23 checks passed using local Auth 9098 / RTDB 9009 and `demo-manowzab-review`. Actual stores and two clients exercise authorization/revocation, booking/queue promotion, concurrent delivery complete/undo and shipped-stock isolation. Expected permission-denied cases are part of the passing suite. No production business data was written.
- `npm run test:transcriber`: 3 tests passed. `benchmark:performance`: initial/one-price-change/queue-only sync calls remain 300/1/0; cached answer resolutions 2,400 → 200. Synthetic medians 1,039.69 → 109ms are local workload measurements, not production guarantees.
- Browser fixture runs the actual App, Header, ChatPanel, StockGrid and services with authentication/database replaced only in an ignored, localhost-only fixture. It is not production login or Firebase integration evidence.
- Desktop 1024/1280 and mobile-emulated 320/390/768px: no document overflow; primary header controls remain visible; stock rows do not overlap. Chat takes the full mobile workspace. Pointer resize persisted 480px; keyboard resize persisted its changed width. Mobile shortcut switches workspaces without an empty collapsed pane.
- Dirty queue close warns; cancelling discard retains the draft. A deliberately failed stock write retained item 1 and its edited name, with no navigation; retry persisted the name before opening item 2. Keyboard activation opens the card; Tab and Shift+Tab remain inside the queue dialog, and arrow keys in an input do not navigate items.
- Actual DOM observation measured new-order class removal at 15,006ms after the synthetic incoming booking (appeared in about 15ms). An incoming order while reading chat did not switch workspaces. Reduced-motion emulation removed animation.
- Smart Answer remains a direct, full-width row child with the thin black text outline at 320px. Question filter, pin/HUD and explicit item jump work; jump reveals stock and focuses item 1. Incoming chat stayed pinned with bottom gap 0; reading older chat retained scrollTop 20 after the next message.
- Mobile CSV export produced 84 CSV lines for 83 fixture messages and closed the menu. Independent browser contexts retained separate desktop widths (480px and 300px). Escape opened the dirty-draft warning; confirmed discard closed the dialog without writing the edited name and restored stock-card focus.
- Audio labels render Google, native fallback and mute from runtime state, including the mobile chat header. Automated actual-service tests validate the engine transitions separately; this release does not claim new live-Google synthesis or physical-speaker tests from display fixtures.

## Checklist coverage

| verify.md categories | Evidence and scope |
|---|---|
| 1–2 | Poll heartbeat and full parser/processor/corpus regressions; no live YouTube stream or real quota rotation exercised. |
| 3, 5, 10–11, 17–18, 21–22 | Actual-store unit suite, local two-client Firebase integration, queue/browser failure checks, selective reconciliation benchmark. Physical two-device operation and authenticated production workflows remain separate checks. |
| 4, 7, 9, 12–14, 16, 19–20 | Actual speech-service regressions; browser status/mobile/resize/draft/focus/scroll/smart-answer/reduced-motion checks; full build. Sound through physical speakers, real iPad/iOS unlock and installed-PWA upgrades remain untested this round. |
| 6, 8, 15 | Unit/build/source review and transcriber tests; no production history cleanup or thermal-printer run. |
| 23 | Version, changelog, rule/checklist updates, artifact audit and publication checks; publication results recorded below when completed. |

## Rules

Updated `AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md` and verify items 16.6–16.10 for truthful device status, safe drafts, responsive local workspaces, keyboard/touch controls and the mandatory 15-second emphasis. Browser fixture/auth mocks and original logs remain outside tracked production code.

## Deployment

Pending final artifact audit and publication verification.

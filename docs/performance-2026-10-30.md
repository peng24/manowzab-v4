# Performance verification — 2026-10-30

## Changes and measured impact

The original final watcher in `App.vue` initiated delivery sync for every owner whenever any nested stock field changed. Its captured baseline with 300 customers was 300 calls for a single price edit and 300 for a queue-only edit (`tmp/performance-baseline.json`, ignored local artifact).

`useDeliveryReconciliation.js` now groups booking fields once and compares owner snapshots before invoking the existing transaction helper. It passes prepared booking items, avoiding another full stock scan per owner. The initial reconciliation still processes all owners. Cancellation, promotion, stock clearing, late customer snapshots, video/auth changes and disposal are covered by regression tests. The transactional shipment safeguards remain in `deliverySync.js` and `deliveryState.js`.

`useSmartAnswerLookup.js` shares a Vue computed answer across repeated row/HUD reads. Weak keys allow removed chats to be collected. Nested booking changes, replaced customer/address snapshots, chat edits and bans remain reactive. `ChatPanel.vue` includes the complete result in `v-memo`, including address previews and prices that the older category fingerprint omitted.

Also restored the missing `resolveDeliveryUid` import in Dashboard's proxy-customer shipping action. Browser verification confirmed a proxy booking can be added to shipping under both its canonical and name keys.

Run `npm run benchmark:performance` (optionally append `-- tmp/performance-after.json`). The script uses demo configuration and synthetic data without database writes or audio playback. Five trials measure the actual resolver with and without the computed cache, including cache creation/first reads. Timing varies by machine; call-count assertions are deterministic.

| Workload | Before | After |
|---|---:|---:|
| Initial reconciliation, 300 owners | 300 calls | 300 calls |
| One item price edit | 300 calls | 1 call |
| Queue-only edit | 300 calls | 0 calls |
| 200 questions × 12 answer reads | 2,400 resolutions | 200 resolutions |
| Median resolver workload, 5 trials on this machine | 1,098.23 ms | 112.61 ms |

These count reconciliation helper invocations, not HTTP requests or total database traffic. Direct booking/cancel writers retain their immediate synchronization.

## Chrome DevTools measurements

- Production build of the review/demo configuration, served locally by Vite preview: cold HTTP-cache reload of the login page, no CPU/network throttling. LCP **281 ms**, CLS **0.00**. No production dashboard authentication was attempted. This is a login baseline, not a before/after speedup claim.
- Network review: requested local JS/CSS and external fonts returned 200. Render-blocking insight estimated **0 ms LCP savings**. Font Awesome's font-display block showed about 30 ms FCP savings; no font loading change was justified by the measured impact in this pass.
- Authenticated development dashboard using local Firebase emulators, 300 booking records and 200 rendered Smart Answer messages: clicking the question tab and entering a stock search recorded **INP 120 ms**, CLS **0.01**. The first interaction trace used the default 50-slot grid; search beyond slot 120 was separately verified after setting grid capacity to 300. These are sampled interactions in a development build, not field metrics.
- Browser checks: login; 200 answer cards render; search finds Customer 299/item 300 outside the initial window; changing item price updates the visible answer and the canonical delivery record; proxy-customer Dashboard shipping action succeeds. Console had only the expected missing YouTube-key warning from the intentionally isolated review environment.
- Browser tests used demo data only. No live YouTube/Google TTS request, production data edit, printer or physical iPad test was performed.

## Validation

- `npm test`: **321 tests passed**, 24 files, including 7 new regression tests.
- `npm run test:firebase`: **23 checks passed** against local Auth/RTDB emulators, covering actual auth/stock stores, queue promotion, concurrent delivery sync and once-only complete/undo.
- `npm run test:transcriber`: **3 tests passed**.
- `npm run build`: all four entry pages and PWA built successfully; 66 precache entries, approximately 1,444.67 KiB.
- `git diff --check`: passed (normal LF/CRLF conversion notices).

No deployment, commit or production Firebase configuration change was made.

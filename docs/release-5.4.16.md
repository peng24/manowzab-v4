# Release 5.4.16 — 2026-10-31

## Change

Reviewed all 307 messages in five CSV logs and hardened chat intent matching across parser, actual processor and stored-data Smart Answers. The release distinguishes shipping/cancellation questions from actions, keeps holds from assigning delivery dates, preserves complete numeric IDs, recognizes explicit confirmation and return/withdraw IDs, and filters observed conversational nickname false positives. Shared normalization handles Thai digits and zero-width characters while retaining original chat text.

The first poll batch of a new video now retains all queued messages and settles their promises in timestamp order. Each queued entry captures videoId; stale queued entries are settled without processing in a new video. This does not cancel a transaction already in progress when video changes.

See [review findings](chat-regex-review-2026-10-31.md) and [archive manifest](chat-log-archive-2026-10-31.json). The five analyzed source files were moved into their requested old directory with matching before/after SHA-256 values; three existing filename collisions were preserved. Raw logs and replay data remain outside Git in ignored tmp. Regression fixtures remove author IDs/handles/timestamps and replace full names/contact strings.

Version, root lockfile package and changelog match 5.4.16; changelog retains 20 entries. This release does not change Firebase rules, grants, account passwords or production business records.

## Verification

Rerun for this publication:

- npm test: 730 tests passed in 28 files, including all 307 reviewed corpus rows, 68 boundary cases, 24 actual-processor tests and 10 Smart Answer cases added in this change.
- npm run test:firebase: 23 local Auth/RTDB emulator checks passed, including actual auth/stock stores, queue promotion, concurrent totals, complete/undo once-only and grant revocation. The harness is fixed to demo-manowzab-review and localhost.
- npm run test:transcriber: 3 tests passed.
- npm run build:gh: four entry pages plus PWA generated with base /manowzab-v4/, 66 precache entries, approximately 1,447.03 KiB.
- npm run benchmark:performance: initial/price-edit/queue-only sync calls 300/1/0; answer resolution calls 2,400 → 200. Five-trial medians 1,222.85 → 117.14 ms on this machine while release checks ran concurrently; synthetic timings are not production field metrics.
- git diff --check and version/changelog/checklist/local-reference consistency checked before commit.

## Checklist coverage

| verify.md categories | Evidence this release | Remaining live/device checks |
|---|---|---|
| 1–2: YouTube and intent | YouTube service tests, 307-row replay, parser boundary tests and actual-processor side-effect/FIFO regressions; shared guards traced through source | Real live stream, quota/key rotation and unseen conversational context |
| 3, 6, 10–11: stock/history/shipping/counts | Stock/delivery tests and actual store emulator transactions; mocked processor assertions prevent erroneous writes and latest-item cancellation | Authenticated production UI on two physical devices; real shipping workflow |
| 4: audio/TTS | Existing TTS/Thai-number tests; original text retained; no new direct audio calls in processor, blacklist audio guard tested | Speakers, Google/native audio, iOS unlock and cross-device playback |
| 5, 9, 13, 16, 19–20, 22: sync/UI/performance/scroll/answers | Chat/cache/scroll/reconciliation tests, Smart Answer log regressions, benchmark and production build; unchanged layout/Lenis/search source reviewed | Installed-device PWA update, visual dashboard after production login and reconnect |
| 7–8, 12, 14: away/cleanup/alerts/safety | Lifecycle and guard paths reviewed; no service changes; auth/blacklist tests and build | Full live away/cleanup/alert interaction |
| 15, 17–18: labels/blacklist/time | Address/contact/blacklist/time tests; unchanged label generation and time-format source | Real printer, paper dimensions and physical audio suppression |
| 21: auth/delivery safety | 23 local emulator checks including actual stores; no production auth/rules/grant change requested or made | Production password login and physical two-device UI |
| 23: release | Matching versions, 20 changelog entries, diff check and Pages build; publication checks recorded below | Physical installed-PWA upgrade and every dashboard function after real login |

Passing the reviewed corpus is regression evidence, not 100% accuracy on new messages. Unnumbered contextual buys still do not infer the item from missing video context. No historical orders were reconstructed from CSV.

## Rule updates

Updated AI_RULES.md, GEMINI.md, .agents/AGENTS.md, the manowzab-core skill and verify.md items 2.11–2.15 to preserve shared request guards, numeric/name boundaries, hold dates, explicit cancellation IDs, reviewed fixtures and first-batch queue settlement. Release evidence will be appended after publication.

## Deployment

Prepared for publication. Source/gh-pages commits, published artifact matches and browser login-page checks are recorded after deployment.

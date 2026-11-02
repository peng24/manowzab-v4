# Release 5.4.18 — 2026-11-02

## Behavior and configuration

The user subsequently approved restoring the original Google Cloud Standard Thai voice as primary, native Thai speech (Microsoft Pattara on this Windows device) as fallback, and playback on both devices. This supersedes the current installation's v5.4.17 native preference. The build still requires explicit `VITE_ENABLE_GOOGLE_CLOUD_TTS=true`; unapproved/free builds retain the previous no-Cloud boundary. This installation's ignored `.env.production.local` opts in. Future release environments must explicitly supply the same flag if Cloud is intended.

An approved Cloud build migrates existing devices to standard once using `manowzab_tts_cloud_policy`. Subsequent manual native selections persist independently on each device. Firebase chat/time/blacklist audio guards and the single `queueAudio` playback entry point are unchanged. There is no shared monthly usage meter or hard spending cap in this release; key rotation does not reset project quotas.

`GoogleTtsAudio` prepares MP3 bytes without playing audio or advancing queues. It deduplicates in-flight text/voice requests, limits background requests to current plus next two, and reuses the existing 50-entry LRU cache with independent ArrayBuffer copies. Foreground and prefetch use the same Thai number/name/emoji formatting. Two devices prepare their own audio independently.

Network and response-body loading share a 2,000ms total deadline across all keys, with at most 1,500ms for one key. Invalid-key/network failures may rotate within that deadline. Billing failures and HTTP 429 stop key churn and use native speech, with cooldowns of 60 seconds for Billing and 10 seconds otherwise. Recovery is automatic after cooldown or explicit from the mode control. Decoding/playback readiness is separate from this network deadline.

Reset invalidates pending fetch, decode, AudioContext-resume and native callbacks before stopping audio. Old outer-queue completions cannot release a new active item. The 30-second speech watchdog invalidates the current item before continuing remaining queued messages. No queued chat is discarded to make normal playback faster; long speech can still create a backlog.

## Verification

- `npm test`: 772 tests passed in 32 files, including 27 additional tests for loader deadlines, cache/in-flight reuse, malformed payloads, key rotation, Billing/quota cooldown and recovery, reset during asynchronous stages, native cancellation, watchdog continuation, outer FIFO and one-time preference migration. The reviewed 307-row chat corpus remains passing.
- `npm run build:gh`: all four entry pages and PWA generated for `/manowzab-v4/`; 66 precache entries, approximately 1,447.54 KiB. Version, lockfile and changelog agree on 5.4.18; changelog retains 20 entries.
- Browser fixture: actual Header, system store, useAudio and TextToSpeech, with review Firebase configuration and Header shipping listener disabled. Two isolated browser contexts migrate a saved native mode to standard and each play both messages in FIFO order with maximum active Cloud sources = 1. Each makes two deduplicated preparation requests before first playback finishes. Observed inter-message gaps were about 4ms in this fixture; this is a mocked-API/local-buffer result, not production latency.
- Browser Cloud responses use an existing short synthetic MP3 and simulated network delay; no customer data is submitted. These checks prove Web Audio playback and queue behavior, not successful live Google synthesis or physical two-device/iPad behavior.
- Simulated Billing failure in the browser falls back to Microsoft Pattara: both fallback utterances received native start/end in order, no errors, queue idle afterward. Two background requests were already started for the two distinct texts before the failure response; no additional key rotation occurred for Billing.
- A separate `free-check` build and artifact audit confirm that explicitly free bundles still contain neither the synthesize endpoint nor either existing TTS key. Direct loader/request calls are guarded in addition to the speech-service entry points.
- Initial live probes returned HTTP 403 / BILLING_DISABLED while the existing payment method was declined. After the user corrected the card directly in Google, read-only Billing metadata reports open=true. Both existing keys now return HTTP 200 and 11,520-byte MP3 for synthetic `ทดสอบเสียง`, with full response times of 538ms and 478ms. ffprobe validates MP3, mono 24kHz, duration 1.44 seconds. The agent did not make a payment, change a card, purchase credits or mutate Billing.

## Checklist coverage

| verify.md categories | Evidence and scope |
|---|---|
| 1–3, 6–8, 10–12, 15–18, 21 | No parser/auth/stock/delivery implementation changes; full unit/regression suite passed. No new Firebase emulator, live YouTube, authenticated production workflow or printer run. |
| 4–5, 9, 13–14, 19–20, 22 | Actual TTS/store/outer-queue regressions, two isolated browser contexts and four-page/PWA build. Speaker listening, real second device, iOS unlock and installed-PWA upgrade remain device checks. |
| 23 | Version/lock/changelog and diff checks; live Google synthesis and browser playback now pass; publication evidence is recorded below after deployment. |

## Rules and operation

Updated AI_RULES.md, GEMINI.md, .agents/AGENTS.md, manowzab-core/SKILL.md and verify.md 4.13/4.14/4.17/4.18 for explicit Cloud approval, prefetch limits, total deadlines, cooldown/recovery and stale-callback cancellation. Free builds remain protected and separately testable.

Billing recovery and live validation are complete. A second browser fixture uses the real Google endpoint with the existing local keys, actual application services and synthetic text; it keeps review Firebase configuration and does not write production business data. Two isolated contexts use key indices 1 and 2 respectively, each making two HTTP 200 requests and receiving two Cloud start/end pairs in FIFO order, no native fallback and no remaining error. Maximum active sources is 1 per context; measured header latency is 286–583ms and the inter-message gaps are approximately 2–5ms with prefetch. These local measurements are not production guarantees. Human speaker listening, physical two-device/iPad behavior and installed-PWA upgrades remain unverified.

Deployment completed after the full suite and Pages build passed. Publication evidence follows.


## Deployment

- Source commit `0574a37` pushed to main; `npm run deploy:gh` published gh-pages commit `6e9bab0`.
- Published URL: https://peng24.github.io/manowzab-v4/ . All four HTML pages and their entry scripts returned HTTP 200 and exactly matched the final build. `sw.js` and `manifest.webmanifest` also matched.
- Fresh production browser loaded `main-CYE8PLUZ.js`. A saved native preference with the old migration policy removed became standard automatically. Actual store: version v5.4.18, Cloud enabled=true, Standard voice and keys present (values not logged).
- The production login page had email/password fields, no console warnings/errors and all 27 observed initial network requests succeeded. Unauthenticated stock/delivery_customers/address_book remained denied with HTTP 401. Production password login and business-data workflows were not exercised.
- Direct synthetic synthesis from the production origin using the actual store's two keys returned HTTP 200 for both, 13,632 audio bytes each, 341ms and 906ms full response time. This verifies production-origin API access in addition to the actual-service live playback fixture. No customer chat or business-data write was used.
- Temporary live-key fixture was removed and four local browser fixture tabs closed after testing. Original logs and credentials remain outside tracked files. The user's physical two-device speakers, installed-PWA update and iOS behavior remain separate checks.

# Release 5.4.17 — 2026-11-02

## Change and cost boundary

The user selected no TTS service charges after Google Cloud synthesis failed. This release defaults to native Thai speech from the device/browser. It does not reopen Billing, add payment methods, or change existing Cloud accounts. This concerns TTS charges; Firebase/YouTube/network usage remains separate.

Free builds migrate saved standard/neural2/invalid modes to native, expose no Google TTS keys, skip key distribution and TTS presence writes, and block Cloud at both processQueue and direct speakOnline. The Header shows TH ฟรี: clicking tests Thai speech through the existing queueAudio path; devices without a Thai voice receive installation guidance. A paid Cloud path remains source-compatible only behind explicit VITE_ENABLE_GOOGLE_CLOUD_TTS=true at build time, requiring separate user approval. Current production configuration does not enable that flag.

Native voice selection prefers installed Thai voices, then browser-provided Thai voices. getBestVoice now returns a voice loaded during that call, and bounded voice polling continues when only non-Thai voices arrive first. A browser-provided remote voice is not described as offline. See [MDN voice availability](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices) and [localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

The sequential SFX/TTS queue, Thai cardinal-number conversion, shared AudioContext, iOS unlock and Firebase audio/blacklist guards remain in place. Version and lockfile match 5.4.17; changelog retains 20 entries.

## Diagnosis and root cause

Actual synthesize requests using both existing keys returned HTTP 403 with ErrorInfo reason BILLING_DISABLED and no audio. Authenticated read-only checks found myshoptts and myshoptts2 had the TTS API enabled and billing links present, but their shared billing account was closed. This ruled out missing API enablement, missing billing linkage and audio decode/speaker failures as the cause of that rejection. No payment or Billing mutation was made. The user chose the free native alternative instead of reopening Billing.

The earlier tests covered mode switching and text conversion but did not assert zero Cloud requests with old preferences or native playback lifecycle. New regressions cover that boundary and late voice loading. Raw logs, credentials, billing details and browser experiment artifacts stay in ignored tmp.

## Verification

- npm test: 745 tests passed in 29 files, including free defaults/migration, forced old settings, direct Cloud-call blocking, skipped TTS key writes, opt-in compatibility, installed Thai selection, delayed voices, sequential native end/error/reset and Thai-number pronunciation.
- npm run build:gh: four entry pages and PWA generated for /manowzab-v4/; 66 precache entries, approximately 1,442.50 KiB.
- Production bundle inspection: neither of the two old Google TTS key values nor the texttospeech.googleapis.com/v1/text:synthesize endpoint is present in generated JavaScript.
- Browser fixture uses actual Header, system store, useAudio and TextToSpeech; it suppresses only the Header shipping listener and uses review environment, without production business-data writes. Saved standard becomes native, Cloud flag is false and Cloud key is empty.
- On this Windows browser Microsoft Pattara - Thai (Thailand), localService=true, produced start/end events for the TH ฟรี button and both queued messages, in order: test start/end, สมใจ ... สิบห้า start/end, มะระ ... จอร์ง ยี่สิบหก start/end. No error events occurred and the observed Cloud request count remained zero. These are engine events, not a claim that a human listened through the speakers.
- Simulating no Thai voices showed the installation-guidance dialog; restoring the voice list selected Pattara again without Cloud calls.
- Existing Firebase auth/rules/stock/delivery source is unchanged. This audio release ran their unit tests as part of the full suite; it did not rerun Firebase emulators, transcriber or performance workloads. The 23 emulator checks in 5.4.16 are historical evidence only.

## Checklist coverage

| verify.md categories | Evidence and scope |
|---|---|
| 1–3, 6–8, 10–12, 14–18, 21 | Existing services unchanged; relevant unit suite passed; source reviewed for affected store exports/presence and alerts. Live YouTube, physical printer, authenticated production workflows and two-device sync not retested. |
| 4–5, 9, 13, 19–20, 22 | Actual native service/store tests, Header browser controls, queue speech events, chat/cache/scroll/blacklist tests and Pages build. iOS/other devices, speaker listening, full dashboard appearance and installed-PWA upgrade remain device checks. |
| 23 | Version/lock/changelog, local links/checklist IDs, no-Cloud bundle and diff checks; publication evidence recorded below. |

## Rules and operation

Updated AI_RULES.md, GEMINI.md, .agents/AGENTS.md, manowzab-core/SKILL.md and verify.md 4.5/4.13/4.14/4.16 for the user-selected free policy. Devices with no Thai voice need Thai speech installed through their device language settings, then a browser restart. On an installed Thai voice, speech needs no Google Cloud API/Billing; other browser voices may require a network connection.

## Deployment

Prepared for publication. Source/gh-pages commits and live artifact/login-page verification will be recorded after deployment.

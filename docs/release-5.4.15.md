# Release 5.4.15 — 2026-10-30

## Change

Smart Answer panels now sit below the customer's message as direct children of the main chat row. They span the full inner width, including the avatar column. The design uses a dark violet frame, distinct status panels, thin black text outlines, responsive metadata wrapping, larger pin controls and the `ดูสินค้า #N →` button. Quick-order controls stay inside the message frame with an accessible name.

Answer resolution, reactive cache, memo invalidation, audio routing, Firebase paths, database rules and transactional delivery logic are unchanged. Version and lockfile match 5.4.15; changelog retains 20 entries.

## Verification results

- `npm test`: 321 tests passed in 24 files.
- `npm run test:firebase`: 23 local Auth/RTDB emulator checks passed, including actual auth/stock stores, queue promotion, concurrent delivery totals, once-only complete/undo and revocation.
- `npm run test:transcriber`: 3 tests passed.
- `npm run build:gh`: all four entry pages and PWA generated for `/manowzab-v4/`; 66 precache entries, approximately 1,444.61 KiB.
- `npm run benchmark:performance`: deterministic counts passed: initial 300 sync calls; one price change 1; queue-only 0; 2,400 resolver reads reduced to 200 resolutions. Five-trial medians in this run were 3,141.97 ms uncached and 248.70 ms cached while other release checks also ran. These timings are synthetic, machine-dependent measurements, not production load times.
- Browser component fixture using in-memory data and mocked customer listeners: widths 200/280/390/440 px all kept answers outside the customer bubble, full-width with equal inner margins, black text outlines and no row/card overflow. Desktop and mobile emulation were checked; ordinary buy rows retained their existing layout.
- Browser controls: item jump dispatched ID 16; pin opened the HUD; stock edits updated both card and HUD; HUD expired after its 25-second timeout. Quick-order dialog opened and cancelled without writing an order. Question filter showed 3 questions and excluded the buy row.
- Browser scroll: latest messages stayed bottom-pinned; after scrolling up, a new message preserved the user's reading position.
- `git diff --check`, unique checklist IDs/local links and version/changelog consistency: passed.

## Checklist coverage

The full checklist was reviewed by category. A passing unit/emulator result does not certify physical devices, real APIs, or every screen after production login.

| verify.md categories | Evidence this release | Remaining external/device checks |
|---|---|---|
| 1–2: YouTube, chat intent | YouTube service, parser, subscriber and emote tests; processing source unchanged | Live connection, quota/key rotation with real YouTube |
| 3, 6, 10–11, 21: stock, history, delivery, auth | Unit tests and 23 emulator checks; actual store paths; shipped-item and cycle guards unchanged | Production password login, authenticated UI on two physical devices |
| 4: audio/TTS | TTS store and Thai-number tests; processing/audio services unchanged | Speakers, Google/native TTS, iOS unlock and actual cross-device audio |
| 5, 9, 13, 16, 19–20, 22: UI, sync, performance, scrolling | Browser layout/control/scroll checks, cache and scroll tests, benchmark, build | PWA/device layout on installed tablets and real network reconnection |
| 7–8, 12, 14: away, cleanup, alerts, safety | Relevant lifecycle, guards and event handlers reviewed; unchanged services; auth/blacklist tests and build | Full away/cleanup/alert interactions in a live session |
| 15, 17–18: labels, blacklist, time formatting | Address/parser/contact/blacklist/time tests; unchanged label generation | Actual printer, label size, real audio suppression on banned users |
| 23: release | Version/lock/changelog checked; Firebase provider, enabled owner and existing admin grant verified read-only; production rules match source | Published artifact and login-page smoke checks are recorded after deployment below |

## Production readiness

Project `manowlive-chat` already has Email/Password enabled and an enabled owner account with an administrator grant. Production RTDB rules match the reviewed source. No grant, password, business data or database rule change is needed for this visual release.

## Deployment

- Source release commit `c4cec82` pushed to `main`; `npm run deploy:gh` completed and published `8ecfc81` to `gh-pages`.
- Live URL: https://peng24.github.io/manowzab-v4/ .
- GitHub Pages initially served the previous build during propagation; the subsequent cache-busted check confirmed main, shipping/, history/ and address/ all returned HTTP 200 with HTML and entry JavaScript exactly matching the local 5.4.15 build.
- Live browser loaded `main-DlsMRA6h.js`, the new full-width answer CSS and email/password login inputs. No failed resources, console warnings or errors were observed on the login page.
- Unauthenticated production reads of stock, delivery_customers and address_book returned HTTP 401. Existing production rules, administrator grants and passwords were not modified in this release.
- Local test emulators and Vite preview were stopped after verification. Physical audio/iOS/printer, installed-device PWA update and production password login remain outside the checks performed in this release.

## Rule updates

Updated `AI_RULES.md`, `.agents/AGENTS.md`, the core skill and `verify.md` to preserve the full-width answer structure and checks. Removed the obsolete fixed count of 15 categories in release instructions and corrected the version workflow to use the shared changelog data consumed by Header's modal.

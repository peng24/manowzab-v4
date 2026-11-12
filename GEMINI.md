# Gemini Integration Instructions for Manowzab v4

These instructions help customize interactions with the Gemini agent for this specific project.

## 🌟 Core Principles
- **Stability First**: This is a production Vue 3 application used for Live Commerce. Never break existing features, especially the real-time Firebase sync, stock booking queues, and the audio/TTS queue.
- **Read the Rules**: Always review [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md) before implementing logic changes.
- **Additive Enhancements**: Focus on adding features alongside existing code. Only modify or remove code when explicitly requested or to clean up obsolete logic (e.g., the iOS Audio Unlock removal in v4.29.3).
- **Responsive Premium UI**: Ensure UI designs are modern, clean, and dynamic. All layouts must be responsive, accommodating all devices including portrait smartphone views.

## 🛠️ Technical Context & Architecture
Manowzab Command Center (currently v5.3.2+) coordinates live sales stream management. It utilizes the following stack and subsystems:

### 1. Frontend & State
- **Framework**: Vue 3 (Composition API) + Vite.
- **State Management**: Pinia (`src/stores/`).
  - [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js): Inventory, queues, sales, throttled & deduplicated history sync.
  - [customer.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/customer.js): Centralized reference-counted Firebase listeners for `delivery_customers` and `address_book`, $O(1)$ lookup index (`deliveryByNormKey`), and memoized reactive customer metadata (`getCustomerMetaByName`).
  - [system.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/system.js): Connection statuses, active live stream, API key rotation, TTS settings.
  - [chat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/chat.js): Live chat log & Firebase sync.
  - [nickname.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/nickname.js): Pronunciation overrides.
- **Styling**: Custom Vanilla CSS. Avoid introducing external CSS frameworks.

### 2. Live Chat Sync & Processing
- **YouTube Polling**: Polled in [YouTubeLiveChat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/YouTubeLiveChat.js) using round-robin API key rotation via `systemStore.currentKeyIndex` and concurrent `Promise.allSettled` dispatch into the 80ms micro-batch window.
- **Intent Processor**: [useChatProcessor.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useChatProcessor.js) parses chats via lazy short-circuit Regex patterns to detect buying (`CF`), cancelling, shipping updates, and admin proxy commands.
- **Firebase Real-Time Sync**: Proccessed chat messages are written to Firebase `chats/{videoId}`. All clients listen and render reactively to maintain consistency.

### 3. Stock Management
- **Transaction Safety**: [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js) uses Firebase `runTransaction` for allocating stock (`processOrder`, `processCancel`) to prevent race conditions.
- **Booking Queues**: If an item is already claimed, subsequent buyers are placed in a queue. Cancelling promotes the next in queue automatically.
- **Stock Size Sync**: The grid size (stock size) is synced across devices and auto-expands when bookings exceed the limit.

### 4. Audio & Text-to-Speech (TTS)
- **Unified Audio Queue**: Managed in [useAudio.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useAudio.js). All audio events (SFX + TTS) must go through `queueAudio(sfxType, author, message)`. **Do not call TTS services directly** to prevent overlapping.
- **Synthesized SFX**: Sound effects (`'success'`, `'error'`, `'cancel'`) are generated dynamically on-the-fly using the shared singleton Web Audio API `AudioContext` (`ttsService.getAudioContext()`).
- **TTS Engine**: [TextToSpeech.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/TextToSpeech.js) handles 2 TTS modes: `S` (Google Cloud Standard `th-TH-Standard-A` as primary default) and `🤖` (Native offline SpeechSynthesis as fallback/toggle). Includes multi-tier auto-fallback, LRU buffer cache, and `ensureAudioContextReady()` to recover from browser idle suspension.

### 5. Shipping & Lifetime Bookings
- **Shipping Manager**: [ShippingManager.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/ShippingManager.vue) manages delivery customers, relative dates, countdowns, and order status updates (`Pending` / `Done`) backed by centralized `useCustomerStore`.
- **Lifetime Purchase Stats**: Marking a delivery `Done` increments the customer's `totalBookings` on Firebase using transactions. If a `Done` customer books again, their status resets to `Pending` automatically.

### 6. Admin Utilities
- **Shared Note System**: [NoteEditor.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteEditor.vue) and [NoteBanner.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteBanner.vue) sync temporary notes across admin dashboards.
- **Phonetic Manager**: Allows overrides of customer name pronunciations for clean TTS speech.

---

## ⚠️ Crucial Implementation Guidelines
1. **Audio Sequencing**: Always await SFX completion before triggering TTS. Use the unified queue in `useAudio.js`.
2. **Firebase Transactions**: Always use `runTransaction` for critical writes (stock claiming, queue adjustments, lifetime booking updates) to prevent concurrent writes from colliding.
3. **Memory Management & Centralized Listeners**: Keep track of all Firebase event listeners (`onValue`, `onChildAdded`) inside composables/components. Store unsubscribed functions in arrays and clean them up (`off(...)` / calling unsub functions) on component unmount to prevent leaks. Never create duplicate `delivery_customers` or `address_book` listeners in components—always use `useCustomerStore`.
4. **Thai Number Conversion & Pronunciation**: Preserve the numeric transcription capability (`thaiToArabic`) inside the chat processor, and convert numbers to Thai cardinal words (`numberToThaiWords`, `replaceNumbersWithThaiWords` in `thaiNumberWords.js`) so TTS reads numbers as cardinal words (e.g. 15 -> 'สิบห้า') rather than digit-by-digit ('หนึ่งห้า').

---

## 📂 Reference Documentation
Familiarize yourself with these root documentation files when working on relevant domains:
- [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md): Mandatory checklist and system invariants.
- [FIREBASE_CHAT_SYNC_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/FIREBASE_CHAT_SYNC_IMPLEMENTATION.md): Real-time chat database layout and sync details.
- [SOUND_EFFECTS_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/SOUND_EFFECTS_IMPLEMENTATION.md): Web Audio API synthesis logic and wave specifications.
- [STOCK_SIZE_SYNC_SUMMARY.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/STOCK_SIZE_SYNC_SUMMARY.md): Sync flow of stock limits across admin panels.
- [CUSTOM_NICKNAME_OVERRIDE.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/CUSTOM_NICKNAME_OVERRIDE.md): How hardcoded phonetic substitutions are handled.

---

## 🤖 Integrated Agent Skills (9arm-skills)
We have adapted and installed developer-agent workflows from `9arm-skills` into our `.agents/skills/` directory. The AI agent should proactively trigger and follow these disciplines:

1. **Debugging Mantra (`/debug-mantra`)**
   - **Trigger**: When the user reports a bug, mentions an error/crash, or asks to diagnose/debug an issue.
   - **Instruction**: Read and follow the 4-step discipline in [debug-mantra/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/debug-mantra/SKILL.md). Always recite the debugging mantra verbatim in the first response when debugging starts:
     > 1. *First is reproducibility.* Can the issue be reproduced reliably?
     > 2. *Know the fail path.* Debugger first; then source trace + knob enumeration; then in-code instrumentation.
     > 3. *Question your hypothesis.* What would disprove it?
     > 4. *Every run is a breadcrumb.* Cross-reference all of them.
   - **Workflow**: Do not propose or implement a fix without satisfying reproducibility first. Maintain an experimental ledger.

2. **Post-Mortem Record (`/post-mortem`)**
   - **Trigger**: When the user requests a Root Cause Analysis (RCA), asks to document a fix, or asks to write a post-mortem.
   - **Instruction**: Read [post-mortem/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/post-mortem/SKILL.md). Gather the 4 required inputs: reliable repro, known cause, specific fix (PR/commit), and validation proof. Draft the canonical engineering record (Summary, Symptom, Root Cause, Fix, Validation, and Slip analysis) with code identifiers intact.

3. **Plan & Code Scrutinize (`/scrutinize`)**
   - **Trigger**: When the user asks to review, audit, check, or get a second opinion on a proposed plan, PR, or code change.
   - **Instruction**: Read [scrutinize/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/scrutinize/SKILL.md). Act as an independent reviewer. Question the intent (is there a simpler alternative?), trace the actual execution paths (not just the diff), verify correctness under edge cases, and report findings structured by severity.

4. **Management Communication (`/management-talk`)**
   - **Trigger**: When the user requests an executive summary, a status report for non-engineers, or Slack/Email updates of technical achievements.
   - **Instruction**: Read [management-talk/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/productivity/management-talk/SKILL.md). Strip internal jargon (file names, function names, commit SHAs) while preserving high-level product and concept terms. Shape the content precisely for the target channel (JIRA, Slack, standup, email, or meeting bullets).

---

## 🔄 Development Workflows
- **Version Updates (`/update`)**: After completing code changes, use the `/update` workflow (see [.agents/workflows/update.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/update.md)) to bump the version in `package.json`, update `src/data/changelog.js` (พร้อมตัด Changelog เก่าออกให้คงเหลือเฉพาะ 15–20 เวอร์ชันล่าสุดเสมอ เพื่อควบคุมขนาด Bundle), and update [Header.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/Header.vue) if needed.
- **Mandatory Verification (`/verify`)**: Always run through the verification checklist in [.agents/workflows/verify.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/verify.md) before concluding your work to ensure critical paths (YouTube sync, queueing, key rotation, performance invariants) remain functional.
- **Proactive Rule & `/verify` Auto-Evolution (คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง)**: Every time you make code changes, **proactively evaluate** whether any project rules (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) or `/verify` items (`.agents/workflows/verify.md`) should be updated. If so, **update them immediately without waiting to be asked**, and **always report the rule/`/verify` updates to the user**.
- **Automated Deploy Command ("อัพเลย")**: When the user says **"อัพเลย"**, automatically run `/verify` (including auto-updating rules/`/verify`) -> `/update` -> Git Commit & Push to GitHub -> `npm run deploy` to GitHub Pages without stopping.

## Chat Log Regression & Request Safety (2026-10-31)

- Normalize intent matching through normalizeChatText (Thai digits + zero-width stripping); preserve the original message for display/audio.
- shippingRegex detects topics only. Use isShippingRequest/isShippingInquiry before readiness/history/date writes. Hold requests must not set delivery dates, including named weekdays/dates.
- Share isCancellationRequest and isTryRequest between parser and processor. Cancellation questions, conditional statements, descriptive “ที่หลุดจอง” notes, embedded English cc/cancel, and night references must not cause cancellation. Explicit คืน/ถอน/สละสิทธิ์ + number must cancel that ID, never the latest fallback.
- Keep numeric captures complete when rejecting quantity/price/measurement suffixes. Never infer item IDs from body measurements or unnumbered contextual chat. Keep conversational fragments out of nickname learning.
- Preserve every message and settle every Promise in the first poll batch of a new video. Capture videoId when enqueueing and skip stale queued work before processing; never clear the active batch inside processSingleMessage.
- Regex changes require the reviewed anonymized 307-row corpus, boundary tests, and actual useChatProcessor side-effect tests. Expected labels must be reviewed independently of the changed parser. Keep raw logs/identifiers outside tracked fixtures; archive analyzed files only after hash checks, with no overwrite on filename collisions.
- See docs/chat-regex-review-2026-10-31.md and /verify 2.11–2.15. Passing this corpus is regression evidence, not a claim of 100% accuracy on new chat.

## Thai TTS Policy (2026-11-02, latest user approval)

- The earlier v5.4.17 free-native release remains documented as historical. The user subsequently chose the original Google Cloud Standard voice as primary, Microsoft Pattara as fallback, and both devices speaking. This installation may explicitly opt in with VITE_ENABLE_GOOGLE_CLOUD_TTS=true; do not silently enable Cloud in other/free builds. Billing/payment readiness is separate from code readiness; never report live Cloud success from mocks or a successful build.
- Free builds retain their native migration, no Cloud keys/calls/presence writes, and TH ฟรี test button. Saved preferences alone cannot enable Cloud. Approved Cloud builds migrate to standard once via manowzab_tts_cloud_policy=cloud-primary-2026-11-02, then preserve a subsequent manual native choice independently on each device.
- GoogleTtsAudio prepares bytes only: no playback or queue advancement. Deduplicate in-flight text/voice, cap background requests at current + next two, preserve bounded LRU copies, and share formatting/sanitization with foreground speech. Never drop queued chat to reduce latency.
- Bound Google fetch plus response-body loading across all keys to 2000ms total (1500ms/key maximum). Invalid-key/network failures may rotate within that deadline. BILLING_DISABLED and HTTP 429 enter cooldown without cycling keys to evade account/project limits. Retry after 60s for Billing or 10s for other failures, or explicitly retry from the mode control; retain native fallback throughout.
- Reset invalidates fetch/decode/resume/native callbacks before stopping audio and clears queued work. A watchdog invalidates the current item before continuing the remaining FIFO queue. Old outer-queue finally handlers must not change the state of a new queue. Keep shared AudioContext, iOS unlock, Thai cardinal words, emoji fallback and Firebase time/blacklist guards.
- Native fallback prefers installed Thai voices (Microsoft Pattara on this Windows device), then other Thai voices. Availability varies by device. Verify request limits, cache/dedup, deadlines, Billing/quota recovery, cancellation, old callbacks, actual playback FIFO and two isolated clients. Distinguish mocked Cloud payload/browser engine events from live synthesis and listening on physical devices.
- Reopening existing Billing was authorized, but no payment-method replacement, payment, credit purchase or paid add-on is implied. If Google requires card verification, have the user complete that step. Keep credentials, card details and original logs out of tracked files.

- Cloud Billing controls: distinguish alert-only budgets from verified enforcement. All-account budgets and payment thresholds do not guarantee invoice ceilings; native spend caps have project/service restrictions and TTS is not currently eligible. Custom shutdown can lag and removing billing can irreversibly affect resources. Verify actual scope/recipients and any deployed response separately; keep private billing evidence out of public Git. See docs/cloud-billing-controls.md.

## Operational workspace UI baseline (2026-11-02 rollback)

- The user reverted the entire v5.4.19 UX/UI to the v5.4.18 baseline. Use source b50aca2 (same application source as the published v5.4.18, plus documentation) as the reference. Restore its layout, colours, controls, chat collapse and queue interaction. Do not reintroduce the v5.4.19 tabs/resizer/status panels/draft UI without a new request.
- Retain v5.4.18 Google Standard primary/native fallback, Cloud opt-in/free-build boundaries, FIFO, prefetch/deadlines, regex corpus, Firebase authentication and delivery invariants. A UI rollback must not downgrade these or mutate business data or Billing.
- Original new-order emphasis remains 15,000ms in StockGrid.vue. Keep the full-width Smart Answer and thin black outline from the v5.4.18 baseline.
- Publish rollback builds with a new increasing release version so installed clients can detect an update. Clearly distinguish the restored UI baseline from the release number; preserve historical release notes and their evidence.
- Verify baseline source parity excluding changelog, current unit suite and builds, then check published artifacts/PWA. V5.4.19-only acceptance checks and its historical 800-test result no longer describe the active UI. Report physical-device/production-login checks separately.

## Legacy shipment review (2026-11-06)

- When a count-only pending session still has stock whose matching unfulfilled bookings do not equal its saved count (whether zero, partial, or extra historical board items from earlier unrecorded cycles such as `aAs6hsbgtpg` 2 saved vs 6 found), do not silently discard its saved count or block forever with an error. Require an explicit physical-count review in the shared markDone action, then re-read stock and retain the atomic reviewed-customer guard.
- Keep the original shipment count, total price, cycle ID and undo snapshot; record explicitly reviewed mismatched sessions in lastDoneSnapshot.legacyCountConfirmed. Mark existing board items in fulfilledItems so they do not reopen on subsequent syncs, while keeping lastDoneSnapshot.sessions[vid].items empty when found !== count so undo never inflates the saved count. Exclude already fulfilled identities from legacy fallback. Cancel, failed reads, stale stock/customer review and duplicate confirmations must not change the shipment.
- Undo of a count-only shipment must preserve its original quantity/value even if a new identified booking arrived before undo. Never claim physical dispatch from tests; production completion requires the operator confirming the actual parcel count.

## Non-destructive shipping removal (2026-11-08)

- Clicking the trash button (`🗑️` `deleteCustomer` / `removeFromShippingList`) in `ShippingManager.vue` or `ShippingPage.vue` must NEVER delete a customer record from `delivery_customers` or `address_book` (`remove(dbRef(db, 'delivery_customers/...'))` is strictly forbidden).
- Instead, `removeFromShippingList` / `unscheduleDelivery` (`unscheduleDeliveryState`) must only clear the shipping schedule (`deliveryDate: null`, `labelPrinted: false`, `labelPrintedAt: null`, keeping `status: 'pending'` for active records) via `runTransaction`, moving the customer out of `📦 เฉพาะคนที่แจ้งส่ง` and back to `🛋️ ฝากสินค้า / ยังไม่ระบุวันส่ง` while preserving their `name`, `itemCount`, `totalPrice`, `sessions`, `totalBookings`, `address`, `paymentType`, `contactChannel`, and `note` 100%.
- `restoreDeletedAddressBookCustomers()` self-heals any customer present in `address_book` whose `delivery_customers` entry was previously removed by the legacy trash button, restoring them into `ฝากสินค้า` (`deliveryDate: null`, `status: 'pending'`).

## Thermal shipping label typography & clean address (2026-11-09)

- Never include `'TH Sarabun New'` in the `font-family` stack of `ShippingLabelModal.vue` (`handlePrint` or preview CSS): on Windows machines with `TH Sarabun New` installed, any race in Google Font (`Sarabun`) loading inside the print iframe causes the browser to fall back to `TH Sarabun New`, which renders Thai glyphs ~35% smaller and thinner at the same `pt` size. Use `'Sarabun', 'Kanit', 'Leelawadee UI', 'Tahoma', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
- Give the print iframe real off-screen dimensions (`width: pageWidth; height: pageHeight; left: -9999px; visibility: hidden;`) rather than `0x0`, and await both the stylesheet `<link id="label-font-link">` load event and `document.fonts.ready` (bounded by an 800ms timeout guard) before invoking `print()`.
- Use valid W3C `@page { size: <width> <height>; margin: 0mm; }` syntax (never combine two explicit `<length>` values with the `landscape` keyword such as `size: 130mm 76mm landscape;`, which browsers reject as invalid CSS Paged Media syntax).
- Maintain high-legibility thermal font sizes calibrated 1:1 with on-screen preview (`receiver-name: 13.5pt / 700`, `receiver-addr: 11pt / 600` with adaptive long-address sizing, `receiver-zip: 14pt / 800`, `receiver-phone: 11pt / 700`, `sender-name: 10pt / 700`, `meta-payment-row: 9.5pt / 800`, `card-footer: 9pt / 600`) and support user-selectable font scaling (`preview` 100% default / `compact` 90% / `large` 120%) persisted in `localStorage('manowzab_label_font_scale')` so print output matches preview proportions.
- `cleanShippingLabelAddress` (`getCustomerCleanAddress`) must strip duplicate leading recipient names, embedded phone numbers, and 5-digit postal codes from the address body when those fields are already rendered on dedicated lines.

## Replay Price Detection & Exact Date Sync (2026-11-12)

- Manowzab AI (`run_live_launcher.py`) supports fast accelerated detection on past live streams (VOD / Replay) from YouTube URLs or Thai date queries (e.g. `11 พ.ย. 69`).
- `SessionResolver` auto-resolves live dates (from YouTube title/upload_date or Thai date queries), ensures `history/{videoId}` exists in Firebase with title and date timestamp, runs fast accelerated replay without `-re`, syncs detected prices directly to `stock/{videoId}/{item}/price`, and recalculates totals in `history/{videoId}`.
- In `HistoryModal.vue`, display the price badge (`.stock-price`) whenever `item.price && Number(item.price) > 0` for both sold and unsold items.
- Provide `openOnMainBoard()` action in `HistoryModal.vue` allowing the operator to switch `system/activeVideo` in Firebase and open the historical live session directly on the main dashboard in 1 click.

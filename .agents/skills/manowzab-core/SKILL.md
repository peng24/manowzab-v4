---
name: manowzab-core
description: >-
  Expert engineering and operational guide for Manowzab Command Center (Vue 3, Firebase RTDB, Web Audio, Live Commerce).
  Use this skill whenever developing, modifying, debugging, verifying, or deploying features in the Manowzab Command Center,
  including chat intent processing, stock booking queues, audio/TTS synchronization, shipping labels, and automated releases.
---

# 🚀 Manowzab Command Center Core Engineering Skill

This skill governs all development, bug fixing, architectural changes, and deployment procedures for the **Manowzab Command Center** (v4.85+). It ensures that critical live commerce invariants are preserved across all updates.

---

## 🏗️ 1. Architecture & Subsystem Map

The application is an event-driven, real-time live commerce dashboard built with:
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite 7, Pinia 3.
- **Persistence & Real-Time Sync**: Firebase Realtime Database (RTDB v12).
- **Audio Engine**: Google Cloud Standard in approved opt-in builds (native in free builds) + Web Audio SFX; Google Cloud Text-to-Speech (`th-TH-Standard-A`) + Native `SpeechSynthesis` Fallback.
- **Hardware Integration**: Direct thermal label printing via isolated hidden iframes (130x76mm / 76x130mm).

### Core Stores & Composables
| Subsystem | Primary Files | Key Responsibility |
| :--- | :--- | :--- |
| **Stock & Orders** | `src/stores/stock.js`, `StockGrid.vue` | Atomic inventory claiming (`runTransaction`), booking queues, auto-expanding grid, throttled & deduplicated history sync |
| **Customer & Address Sync** | `src/stores/customer.js`, `deliverySync.js` | Centralized reference-counted `delivery_customers` & `address_book` listeners, $O(1)$ `deliveryByNormKey` & `getCustomerMetaByName` cache |
| **Chat Processing** | `useChatProcessor.js`, `chatParserUtils.js` | Lazy short-circuit regex buying strategies, 80ms micro-batch window, Thai numeral normalization ($O(1)$), admin proxies |
| **Live Chat Sync** | `useYouTube.js`, `YouTubeLiveChat.js`, `src/stores/chat.js` | Concurrent poll batch dispatch (`Promise.allSettled`), API key rotation, Firebase real-time broadcast |
| **Blacklist & Safety** | `src/stores/blacklist.js`, `BlacklistModal.vue` | Centralized `/blacklist` RTDB sync, space-agnostic Thai matching, zero-leak audio mute, anti-stock stealing |
| **Audio & TTS** | `useAudio.js`, `TextToSpeech.js`, `system.js` | Unified sequential queue, free Thai voice test button (Cloud toggle only in opt-in builds) (`S` / `🤖`), shared singleton `AudioContext`, LRU cache, iOS unlock |
| **Shipping & CRM** | `ShippingManager.vue`, `addressParser.js` | Delivery dates, countdowns, smart Thai phone/zip parser, thermal labels |
| **Device Roles** | `system.js` | Host role takeover, Active Price Detector election, presence-based key balancing |

For detailed Firebase schema definitions and database paths, refer to [architecture.md](./references/architecture.md).

---

## 🔒 2. Mandatory Engineering Invariants

Whenever touching code in this repository, you **MUST** uphold these non-negotiable rules:

### 1. Audio & TTS Synchronization Invariant
- **Never trigger overlapping audio**: All audio calls (SFX and TTS) must funnel exclusively through `queueAudio(sfxType, author, message)` in `useAudio.js`.
- **Cross-device playback**: Audio for new incoming live chat messages must be triggered by the Firebase listener in `src/stores/chat.js`, **NOT** directly in `useChatProcessor.js` (except local welcome announcements).
- **Time-guard incoming audio**: Only play audio for messages with `timestamp >= syncStartTime - 5000` and `isNew === true`.
- **Zero-Stall Fallback**: In an explicitly enabled Cloud build, if Google Cloud TTS encounters a network error, quota limit, or timeout, it must seamlessly fall back to `speakNative()` without stalling the audio queue.
- **Sanitization & Emoji Fallback**: Messages that sanitize to an empty string (stickers/emojis) must be voiced as `"ส่งสติกเกอร์"`.
- **Thai Cardinal Number & Booking TTS Pronunciation (v5.4.13+)**: Numbers in booking chats must be converted to Thai cardinal words (`numberToThaiWords`, `replaceNumbersWithThaiWords` in `src/utils/thaiNumberWords.js`) so TTS pronounces "สิบห้า" instead of "หนึ่งห้า", with phone numbers, leading zeros, and time expressions safely preserved.
- **Shared Singleton `AudioContext`**: Reuse `ttsService.getAudioContext()` across TTS, SFX, and celebration audio.

### 2. Concurrency & Transaction Safety
- **Inventory writes must use `runTransaction`**: Never perform raw `set()`, `update()`, or `remove()` when booking (`processOrder`), canceling (`processCancel` or past-session cancel in `showOwnerItems`), or updating `totalBookings` (`markDone` / `undoDone`).
- **UID & Snapshot Preservation**: `processCancel` must preserve `previousUid` and `nextUid` and pass post-transaction snapshots to `syncDeliveryCustomerForOwner`. `clearAllStock` must `await remove()`, deduplicate owners, and pass `{}` to `syncDeliveryCustomerForOwner`. `markDone` must store `lastDoneCount` and `lastDoneSessions` so `undoDone` accurately reverts `totalBookings` and restores only current-cycle sessions.
- **Device Role Election**: Host role and Price Detector election (`system/activePriceDetectorId`) must be acquired and released atomically.

### 3. Memory Leak & Event Listener Hygiene
- **Centralized Customer Store (`useCustomerStore`)**: Never attach duplicate `onValue` listeners for `delivery_customers` or `address_book` in UI components. Always consume `useCustomerStore()`.
- **Unsubscribe all Firebase listeners**: Every `onValue`, `onChildAdded` must store its unsubscribe function and invoke it in `onUnmounted()`.
- **Chat Window Trimming**: Maintain bounds on in-memory chat messages (`MAX_MESSAGES = 500`, `MAX_SEEN_IDS = 2000`) without affecting CSV export data.

### 4. Thai Numeral & Intent Normalization
- **Strict $O(1)$ Thai transcription**: Always route through `thaiToArabic()` using the static table lookup `THAI_TO_ARABIC_MAP`.
- **Admin Proxy**: Support both `"26 พี่อ้อย"` and `"พี่อ้อย 26"` syntax; pronounce only the recipient customer's name during TTS.
- **Admin Proxy & Multi-Cancel Safety**: Support single and multi-item cancel (`"ยกเลิก 12 15"`, `"12 มะระ ยกเลิก"`, `"12 15 มะระ ยกเลิก"`, `"มะระ ยกเลิก 12"`, `"ยกเลิก 12 มะระ"`), cancellation typos (`ยกเริก`, `ยอเลิก`), and `ไม่รับ`/`ไม่เอา` + number (`"ไม่รับ25นะคะ"`, `"นาวพี่ไม่เอา38"`) while guarding against conditional/stain notes (`conditionalCancelGuardRegex`), never falling back to `null` wildcard when Admin specifies a customer name, and preserving item `price` when the sole owner cancels in `processCancel`.
- **Disambiguation & Parity Guards**: Guard `multiBuyRegex` with `!isMultiBuyBlocked()`, support `"พี่เอาใบที่120"`, `"ใช่คะ25"`, `"70นาว"`, prevent `"บอก"`/`"ดอก"`/`"คอกลม"` from falsely matching `"อก"` in `questionRegex`, exclude `"ส่งรูป"`/`"พรุ่งนี้ส่งรูป"` from `shippingRegex`, guard buys against size complaints (`negationGuardRegex`), price classifiers (`pricePatternRegex`), and quantity units (`quantityUnitRegex`), share `isAdminSizeSelectionNote()` across parser and processor (including garment/pattern/question notes with customer name suffix), and always push `isDateMismatch` messages to Firebase before returning.
- **Backdated Orders / Yesterday Debt Notes Audio & Extraction Invariant**: Support yesterday/backdated customer orders in both name-first and number-first formats (`"มะระ 39 เมื่อวาน"`, `"39 เมื่อวาน มะระ"`, `"ของมะระ 39 เมื่อวาน"`). These orders must NOT cut today's stock grid, must sync to Firebase with full audio support (`sfxType: isNewCustomerChat ? 'bell' : 'success'`, `ttsText: isVoiceChat ? '' : ttsMessage`), and deduplicate author prefixes in `ttsService.speak()`.
- **Zero-Allocation Regex & ReDoS Hygiene**: Hoist regular expressions to module scope, avoid nested quantifiers (`*?\s*`), and use memoized regex pools for dynamic search strings.

### 5. UI & Alert Standards
- **Toast vs Popup Separation**: SweetAlert toasts must not receive `heightAuto` or `returnFocus` options.
- **XSS Prevention**: Always wrap dynamic user strings with `escapeHtml()` before rendering via `v-html` or Swal modal templates.
- **Chat Auto-Scroll & Initial Bottom Pinning**: Use `evaluateChatScrollState()`, Double-RAF `scrollToBottom()`, and `ResizeObserver` on `#chat-list`/`#chat-viewport` in `ChatPanel.vue` (without `contain-intrinsic-size: 55px` on `.chat-row`) so initial load and async customer badge rendering stay pinned to the latest message.

### 6. Customer Blacklist & Ban Invariant (v5.4.5+)
- **Centralized Store & Storage Path**: Sync real-time via `settings/blacklist` in Firebase RTDB (`useBlacklistStore`).
- **Zero Audio Leakage**: Cross-device audio in `chat.js` MUST suppress all TTS and SFX playback for banned users.
- **Anti-Stock Stealing**: Banned customers CANNOT claim stock, enter queues, or cancel items in `useChatProcessor.js`.
- **Option A Visual Style**: `ChatPanel.vue` renders banned chat messages with dimmed opacity (~45%), red border-left accent, and `🚫` overlay directly on the profile picture (restoring full opacity on hover).
- **No Auto-Release of Prior Stock**: Banning a user never touches their previously booked items or queues automatically; releases remain purely manual by admin.
- **Space-Agnostic Thai Matching**: `isBanned()` and `getBanInfo()` match Thai names with and without spaces (e.g. "สมชาย ใจดี" and "สมชายใจดี").
- **Admin Controls**: Support `!แบน [ชื่อ]` / `!ปลดแบน [ชื่อ]` chat commands, 1-click ban/unban by clicking customer profile avatar (hidden inside avatar with hover hint), `BlacklistModal.vue` in `⚡ Tools`, and direct ban/unban toggle inside `CustomerQuickEditModal.vue`.

---

### 7. Backdated Booking Smart Time Formatting Invariant (v5.4.7+)
- Centralize booking time formatting in `src/utils/timeFormatUtils.js` (`formatBackdatedCard`, `formatBackdatedDetail`, `formatNormalBookingTime`, `getBookingTooltip`).
- Eliminate noisy seconds from timestamps (`13:11:50` -> `13:11`).
- Distinguish calendar day boundaries (`today`, `yesterday`, `other`) so backdated orders clearly display inline icon right behind customer name (`.backdated-inline-icon`) with polite Thai tooltip (`title`) without text clutter, while in the queue modal displaying `⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm` and normal bookings showing clean `🕒 HH:mm`.

---

### 8. Smart Seller Answer Assistant Invariant (v5.4.9+)
- **Zero Extra Firebase Reads, Visual-Only & Non-Redundant Copy**: Resolve customer questions across 5 stored-data categories (`item`, `orders`, `yesterday`, `hold`, `profile`) in `src/utils/smartAnswerUtils.js` using in-memory `stockStore.stockData`, `customerStore.deliveryByNormKey`, and `customerStore.addressBook` without triggering extra TTS audio. Omit duplicate customer names (unless `isProxyTarget`), omit duplicate item ID lists in headlines, and omit duplicate address/COD pills in `orders`/`item`/`yesterday`/`hold`.
- **3-Point Seller Display (`ChatPanel.vue`)**: Render (1) Full-width `.smart-answer-card` below the customer bubble inside `.chat-row` (`.smart-answer-top` without separate header row, including `getSmartAnswerKey(chat)` in `.chat-row` `v-memo`), (2) 25-second Pinned `.smart-hud-banner` at the top of `ChatPanel.vue` (`pinnedHudTimer` cleaned up on unmount), and (3) `💡 คำถาม` filter tab (`selectedChatTab === 'question'`).
- **Full-Width Answer Layout (2026-10-30)**: `.smart-answer-card` must be a direct child of `.chat-row`, outside `.chat-bubble`/`.chat-bubble-container`, spanning both avatar and message columns. Keep equal inner side padding, thin black text outlines, responsive wrapping, and working pin/jump/quick-order controls without changing audio or answer data flow.
- **Interactive Cross-Panel Actions (`StockGrid.vue`)**: Handle `manowzab:jump-to-item` (`scrollToItem`) and `manowzab:show-owner-items` (`showOwnerItems`) custom window events with cleanup in `onUnmounted`.

### 9. Lenis Smooth Scrolling & Scroll Isolation Invariant (v5.4.12+)
- **Integrated Architecture**: Powered by `lenis`, `lenis/vue`, `src/composables/useSmoothScroll.js`, and `v-smooth-scroll` directive.
- **Fixed Layout Preservation**: `src/assets/style.css` enforces `html.lenis, html.lenis body { height: 100dvh; overflow: hidden; }` preventing Lenis `height: auto` from breaking the fixed 100dvh SPA command center.
- **Zero Chat Interference**: `#chat-viewport` in `ChatPanel.vue` MUST have `data-lenis-prevent` to protect YouTube live stream real-time scrolling and bottom pinning.
- **Fluid Grid Navigation**: `StockGrid.vue` uses `useSmoothScroll(gridContainer)` with centered item jump animation (`scrollToItem`), while `ShippingManager.vue` sets `data-lenis-prevent` on `.sm-table-wrap`.

### 10. Firebase Authentication & Atomic Delivery Cycles Invariant (2026-10-30)
- **Identity & Authority**: Firebase Authentication is the sole source of truth for identity. Never trust client-generated sessions, hard-coded password hashes, or automatic anonymous sign-in. Access to all business nodes requires a non-anonymous Firebase user with `admin_users/<UID> = true`.
- **Protected Lifecycle**: Start protected listeners in `App.vue` only after authorization is verified; tear down listeners and sign out of Firebase on logout or grant revocation. Never include sensitive credentials in `VITE_*` variables.
- **Canonical Delivery Actions**: Both shipping screens (`ShippingManager.vue` and `ShippingPage.vue`) must use `deliveryActions.js` (`executeMarkDone`, `executeUndoDone`). Complete and undo operations execute as atomic transactions on the entire customer record guarded by delivery cycle identity and the reviewed booking snapshot.
- **Centralized Stock-to-Delivery Writers**: All stock-to-delivery writers (`App.vue`, `Dashboard.vue`, `HistoryModal.vue`) must route through `syncDeliveryCustomerForOwner` in `deliverySync.js`. Always retain `items`, `fulfilledItems`, and undo metadata.
- **Shipped Item Isolation**: A booking is identified by `videoId + itemNumber + bookingTime`. Modifying a price, customer name, or UID must never revert a shipped booking to pending. New bookings in the same video session count only unshipped items.
- **Firebase Sparse Array Normalization**: Handle numeric item maps that Firebase may deserialize as sparse arrays or JSON arrays; compare booking fields in canonical order so serialization differences never alter delivery identity.

## 🔄 3. Standard Workflows

### 🧪 1. Verification & Auto-Rule Evolution Protocol (`/verify`)
Always execute the automated verification suite before reporting completion:
```powershell
npm test
npm run build
```
1. Verify all current categories documented in [.agents/workflows/verify.md](../../workflows/verify.md).
2. **Proactive Rule & `/verify` Auto-Evolution (บังคับทำและรายงานทุกครั้ง)**: After every code change, proactively check if any project rules (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `SKILL.md`) or `/verify` items should be updated. Apply updates automatically without waiting to be asked, and **always report the rule/`/verify` updates to the user**.

### 🏷️ 2. Version Bump Protocol (`/update`)
When bumping versions:
1. Increment version in `package.json` (SemVer).
2. Add changelog entry in `src/data/changelog.js` (under `added`, `improved`, `fixed`, or `removed`) and prune old versions to keep only recent 15–20 versions.
3. Run `npm test` and `npm run build` to ensure a clean build.

### 🚀 3. Automated Deploy Trigger ("อัพเลย")
When the user states **"อัพเลย"**:
1. Run verification (`npm test` + `npm run build` + proactive rule/`/verify` update).
2. Run version update (`/update`).
3. Commit and push: `git add .`, `git commit -m "..."`, `git push origin main`.
4. Deploy to GitHub Pages: `npm run deploy:gh` (or `npm run deploy`).

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

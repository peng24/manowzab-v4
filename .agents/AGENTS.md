# Manowzab Command Center Project Rules

## 🔊 Audio and TTS Sync Invariant
1. **Cross-Device Audio Playback**: All audio events (TTS and SFX) must be synchronized across devices.
   - Do **NOT** call `queueAudio()` directly inside `useChatProcessor.js` (except for status welcome announcements).
   - Audio MUST be triggered by the Firebase sync listener inside the chat store (`src/stores/chat.js`) using the synced `sfxType`, `phoneticName`, and `ttsText` properties.
   - Ensure that only new, real-time messages play audio by validating `messageData.timestamp >= syncStartTime - 5000` and checking `isNew`.

2. **Emoji and Run Fallback**:
   - Emojis/Stickers must be read out loud as `"ส่งสติกเกอร์"` (sent sticker) when the original message has content but sanitizes to an empty string.
   - Fall back to `messageRuns` text in `useChatProcessor.js` when `displayMessage` is empty.

3. **Zero-Mute Admin Notes & TTS Fallback Guarantee (v5.4.11+)**:
   - All admin notes (`admin-note`) and admin stopwords (`admin-stopword`) must transmit `ttsText: isVoiceChat ? "" : ttsMessage` to Firebase (never hardcoding `ttsText: ""`), ensuring admin size queries and notes (e.g. `"เสื้อสีแดง ราคาเท่าไหร่ เดย์"`, `"3xl อำไพ"`, `"รอแป๊บ"`) are read out loud across all connected devices.
   - `src/stores/chat.js` must fall back to `messageData.text` if `ttsText` is missing, null, or empty for non-banned messages to guarantee no chat is ever skipped or muted.
   - `TextToSpeech.js` must deduplicate author names at both prefix and suffix (`suffixRegex`), so messages like `"เสื้อสีแดง ราคาเท่าไหร่ เดย์"` with author `"เดย์"` speak naturally as `"เดย์ ... เสื้อสีแดง ราคาเท่าไหร่"`.

## 🔔 SweetAlert2 Config Invariant
1. **Toast Configurations**:
   - Toasts generated from `Swal.mixin({ toast: true, ... })` must not be injected with popup configurations (`allowOutsideClick` / `showCloseButton`).
   - The global `Swal.fire` wrapper in `main.js` and `shipping-main.js` must verify `this.defaultParams?.toast` in addition to `opts.toast` to identify mixin toasts correctly.

## ⚡ Performance & Real-Time Sync Invariants (v5.3.2+)
1. **Centralized Customer Store (`useCustomerStore` in `src/stores/customer.js`)**:
   - Do **NOT** create duplicate `onValue(dbRef(db, "delivery_customers"))` or `onValue(dbRef(db, "address_book"))` listeners inside UI components (`App.vue`, `StockGrid.vue`, `ChatPanel.vue`, `ShippingManager.vue`).
   - Always consume `useCustomerStore()` (`initCustomerSync` / `stopCustomerSync`) and use $O(1)$ lookup indexes (`deliveryByNormKey`, `getCustomerMetaByName`) and live cache hooks (`setLiveDeliveryCustomersCache`, `setLiveAddressBookCache`) in `deliverySync.js`.
2. **Concurrent Poll Batching (`YouTubeLiveChat.js` + `useChatProcessor.js`)**:
   - `YouTubeLiveChat.js` must enqueue all new messages in a poll cycle concurrently (`Promise.allSettled`) into `useChatProcessor`'s `incomingBatchQueue` so they sort by `publishedAt` and execute within a single 80ms batch window instead of stalling `80ms × N` sequentially.
3. **Shared `AudioContext` & Service Worker Bypass**:
   - Share a single `AudioContext` (`ttsService.getAudioContext()`) across `TextToSpeech.js`, `useAudio.js`, and `celebration.js`, and preload celebration audio via `requestIdleCallback`.
   - Workbox `runtimeCaching` in `vite.config.js` must exclude `/liveChat/messages` and `texttospeech.googleapis.com`.
4. **Chat Intent Accuracy, Cancel Safety & Regex Optimization Invariant (v5.4.0+)**:
   - Handle single & multi-item Admin Proxy Cancel (`cancelNumFirstRegex`, `cancelNameKeywordNumRegex`, `cancelWithNumRegex`, `parseCancelIds`), cancellation typos (`ยกเริก`, `ยอเลิก`), and `ไม่รับ`/`ไม่เอา` + number (`"ไม่รับ25นะคะ"`, `"นาวพี่ไม่เอา38"`), protect against false-positive conditional/stain cancels (`conditionalCancelGuardRegex`), guard `multiBuyRegex` with `!isMultiBuyBlocked()`, preserve item `price` on chat cancel (`processCancel`), and never fall back to `null` (wildcard cancel) when Admin specifies a target customer name.
   - Disambiguate buying (`"พี่เอาใบที่120"`, `"ใช่คะ25"`, `"70นาว"`) from questions (preventing `"บอก"`, `"ดอก"`, `"คอกลม"`, `"ออก"`, `"นอก"` from falsely matching `"อก"` in `questionRegex`), photo requests (`"ส่งรูป"` / `"พรุ่งนี้ส่งรูป"` excluded from `shippingRegex`), try requests, size complaints (`negationGuardRegex`), classifiers/pricing (`pricePatternRegex`), and quantity units (`quantityUnitRegex`), share `isAdminSizeSelectionNote()` across parser & processor (including garment/pattern/question notes with customer name suffix), and always sync `isDateMismatch` messages to Firebase before returning.
   - Extract clean customer names on shipping (`extractAdminCustomerName`) and strictly filter conversational non-names in self-name learning (`extractCustomerSelfName`).
   - Eliminate nested quantifiers (`*?\s*`) to prevent catastrophic backtracking (ReDoS) and pre-compile regexes at module scope.
   - Support yesterday/backdated customer orders in both name-first and number-first formats (`"มะระ 39 เมื่อวาน"`, `"39 เมื่อวาน มะระ"`): must NOT cut today's stock grid, must sync to Firebase with full audio support (`sfxType: isNewCustomerChat ? 'bell' : 'success'`, `ttsText: isVoiceChat ? '' : ttsMessage`), and deduplicate author prefixes in `ttsService.speak()`.
5. **Stock, Queue Promotion & Delivery Sync Consistency Invariant**:
   - Preserve `previousUid` and `nextUid` in `processCancel()` and pass post-transaction stock snapshots to `syncDeliveryCustomerForOwner()`.
   - In `clearAllStock()`, always `await remove()`, deduplicate owners, and pass `{}` to `syncDeliveryCustomerForOwner()` (which must accept `{}` without re-querying Firebase).
   - In `ShippingManager.vue`, record `lastDoneCount` and `lastDoneSessions` on `markDone()` so `undoDone()` reverts `totalBookings` and only restores sessions from that delivery cycle.
   - In `StockGrid.vue` and `HistoryModal.vue` (`showOwnerItems`), use `runTransaction` when cancelling past-session items, escape HTML with `escapeHtml()`, and re-open `showOwnerItems()` after confirm/cancel.
6. **Chat Initial Bottom Pinning & Direction-Aware Auto-Scroll Invariant**:
   - `ChatPanel.vue` must use `evaluateChatScrollState()`, Double-`requestAnimationFrame` in `scrollToBottom()`, and `ResizeObserver` on `#chat-list`/`#chat-viewport` (and never use `contain-intrinsic-size: 55px` on `.chat-row`) so opening the page or async customer badge/pill rendering always lands at the latest message without falsely triggering `isUserScrolling`.
7. **Operational UX/UI & Search Filtering Invariant (v5.4.4+)**:
   - In `StockGrid.vue`, real-time search (`stockSearchQuery`) filters cards by number, owner, nickname, or queue while bypassing display limit (rendering matches > 120), and pressing Enter with a number triggers smooth scroll and highlight (`scrollToItem`).
   - In `StockItemCard.vue`, show `.no-addr-indicator` (`📍 รอที่อยู่`) reactively via `hasCustomerAddress(owner)` (`customerStore.getCustomerMetaByName(owner)?.hasAddress`), and ensure `hasCustomerAddress` is included in `v-memo` of both `StockGrid.vue` and `StockItemCard.vue`.
   - In `ShippingManager.vue`, real-time search filters table and mobile cards by customer name, note, or address summary, paired with quick sub-filter pills (`⚠️ ยังไม่มีที่อยู่` and `🖨️ ยังไม่พิมพ์`).
   - In `Header.vue`, `.hero-connect-container.connected` collapses the Video ID input to a compact state (~95px) and expands on focus/hover (~170px) to conserve horizontal space without breaking `Shift+F` autofocus (`id="yt-video-id-input"`).
   - In `ShortcutsModal.vue`, provide a hotkey cheat sheet modal accessible via `⚡ Tools` menu or pressing `?` / `F1`.
8. **Customer Blacklist & Ban Invariant (v5.4.5+)**:
   - Centralize blacklist state in `useBlacklistStore` (`src/stores/blacklist.js`) syncing real-time via `settings/blacklist` in Firebase RTDB (inheriting write/read permissions cleanly).
   - Zero Audio Leakage: `src/stores/chat.js` MUST suppress all TTS and SFX audio playback across all connected devices when `isBannedUser` or `blacklistStore.isBanned` evaluates to true.
   - Anti-Stock Stealing: `useChatProcessor.js` MUST block all buy, cancel, and shipping processing for banned users, recording the chat with `isBanned: true`, `type: "banned"`, `sfxType: null`, `ttsText: ""`.
   - Option A Visual Display: `ChatPanel.vue` renders banned chat messages with dimmed opacity (~45%), red border-left accent, and `🚫` overlay directly over the profile picture (with `🚫 แบน` badge under avatar), restoring full opacity on hover for admin inspection.
   - No Auto-Release of Prior Stock: Banning a user never touches their previously booked items or queues automatically; releases remain purely manual by admin.
   - Space-Agnostic Matching: Customer lookup in `isBanned()` and `getBanInfo()` must support space-stripped Thai names (e.g. matching "สมชาย ใจดี" and "สมชายใจดี").
   - Admin Controls: Support `!แบน [ชื่อ]` / `!ปลดแบน [ชื่อ]` chat commands, 1-click ban/unban by clicking customer profile avatar (with subtle hover ban hint), `BlacklistModal.vue` accessible via `⚡ Tools`, and direct ban/unban toggle inside `CustomerQuickEditModal.vue`.

9. **Backdated Booking Smart Time Formatting Invariant (v5.4.7+)**:
   - Centralize booking time formatting in `src/utils/timeFormatUtils.js` (`formatBackdatedCard`, `formatBackdatedDetail`, `formatNormalBookingTime`, `getBookingTooltip`).
   - Eliminate noisy seconds from booking timestamps (`13:11:50` -> `13:11`).
   - Distinguish calendar day boundaries (`today`, `yesterday`, `other`) so backdated orders clearly display inline icon right behind customer name (`.backdated-inline-icon`) with polite Thai tooltip (`title`) without text clutter, while in the queue modal displaying `⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm` and normal bookings showing clean `🕒 HH:mm`.
10. **Smart Seller Answer Assistant Invariant (v5.4.9+)**:
   - Centralize stored-data question detection & resolution in `src/utils/smartAnswerUtils.js` (`resolveSmartAnswer`, `isSmartQuestionText`, `extractQueriedItemId`, `resolveInquiryCustomer`) covering 5 categories (`item`, `orders`, `yesterday`, `hold`, `profile`), including concise claimed count verification (`✅ ยอดตรง (X ตัว)` vs `⚠️ แจ้ง X (ในระบบ Y ตัว)`).
   - **Compact & Non-Redundant Copy**: Never repeat the customer's own name in inline cards unless `isProxyTarget === true`, never duplicate item ID lists in the headline text (render item IDs once as clickable pills), and never append duplicate address/COD pills in `orders`/`item`/`yesterday`/`hold` (since `.chat-meta` already displays them).
   - Tag question/smart-inquiry messages with `type: "question"` in `useChatProcessor.js` when `intent` is null.
   - Render **Visual-Only** (no extra auto-TTS) in `ChatPanel.vue` via: (1) Compact inline `.smart-answer-card` (`.smart-answer-top` combining headline + `📌` pin button without a separate header row, with `getSmartAnswerKey(chat)` in `.chat-row` `v-memo`), (2) 25-second Pinned `.smart-hud-banner` at the top of `ChatPanel.vue` (cleaning up `pinnedHudTimer` in `onUnmounted`), and (3) `💡 คำถาม` tab (`tab-question`) in `.chat-intent-tabs`.
   - Support 1-click item jump (`manowzab:jump-to-item` -> `scrollToItem`) and owner items modal (`manowzab:show-owner-items` -> `showOwnerItems`) in `StockGrid.vue` with proper listener cleanup in `onUnmounted`.

11. **Lenis Smooth Scrolling & Scroll Isolation Invariant (v5.4.12+)**:
    - Centralize smooth scroll via `useSmoothScroll` (`src/composables/useSmoothScroll.js`), `lenis/vue` plugin, and `v-smooth-scroll` directive.
    - Preserve 100dvh Layout: `src/assets/style.css` enforces `html.lenis, html.lenis body { height: 100dvh; overflow: hidden; }` preventing Lenis `height: auto` from expanding or breaking the fixed command center viewport.
    - Zero Chat Interference: `#chat-viewport` in `ChatPanel.vue` MUST have `data-lenis-prevent` so YouTube live stream auto-scrolling, drag-to-scroll, and `isUserScrolling` detection remain 100% unaffected.
    - Smooth Stock Navigation: `StockGrid.vue` uses `useSmoothScroll(gridContainer)` with automatic `resize()` on grid expansion and centered smooth glide in `scrollToItem()`.
    - Shipping Table Isolation: `ShippingManager.vue` sets `data-lenis-prevent` on `.sm-table-wrap` for native speed and table stability.

12. **Thai Cardinal Number & Booking TTS Pronunciation Invariant (v5.4.13+)**:
    - Centralize number-to-Thai-words conversion in `src/utils/thaiNumberWords.js` (`numberToThaiWords`, `replaceNumbersWithThaiWords`).
    - Eliminate digit-by-digit reading (e.g. reading 15 as "หนึ่งห้า", 12 as "หนึ่งสอง", 25 as "สองห้า", 120 as "หนึ่งสองศูนย์") by converting booking item numbers, quantities, prices, and CF bookings into proper Thai cardinal words ("สิบห้า", "สิบสอง", "ยี่สิบห้า", "หนึ่งร้อยยี่สิบ", "ซีเอฟ สิบห้า", "สิบห้า ทับ หนึ่ง").
    - Two-Tier Guarantee: (1) `useChatProcessor.js` converts numbers in `ttsMessage` / `ttsText` before storing to Firebase RTDB (`text` remains the original raw string for UI display). (2) `TextToSpeech.js` sanitizes and converts numbers before speech in both `speakOnline` (Google Cloud Standard `th-TH-Standard-A`) and `speakNative` (SpeechSynthesis).
    - Safe Guards: Protects phone numbers (`0812345678`, `091-234-5678`), codes with leading zeros (`01`, `02`), and time expressions (`13:11`) from being converted to cardinal words.

13. **Firebase Authentication & Atomic Delivery Cycles Invariant (2026-10-30)**:
    - **Identity & Authority**: Firebase Authentication is the sole source of identity. Never trust client-generated sessions, hard-coded password hashes, or automatic anonymous sign-in. Business nodes in RTDB strictly require a non-anonymous Firebase user with `admin_users/<UID> = true`.
    - **Protected Lifecycle**: Start protected listeners in `App.vue` only after authorization is verified; tear down listeners and sign out of Firebase on logout or grant revocation. Never include sensitive credentials in `VITE_*` variables.
    - **Canonical Delivery Actions**: Both shipping screens (`ShippingManager.vue` and `ShippingPage.vue`) must use `deliveryActions.js` (`executeMarkDone`, `executeUndoDone`). Complete and undo operations execute as atomic transactions on the entire customer record guarded by delivery cycle identity and the reviewed booking snapshot.
    - **Centralized Stock-to-Delivery Writers**: All stock-to-delivery writers (`App.vue`, `Dashboard.vue`, `HistoryModal.vue`) must route through `syncDeliveryCustomerForOwner` in `deliverySync.js`. Always retain `items`, `fulfilledItems`, and undo metadata.
    - **Shipped Item Isolation**: A booking is identified by `videoId + itemNumber + bookingTime`. Modifying a price, customer name, or UID must never revert a shipped booking to pending. New bookings in the same video session count only unshipped items.
    - **Firebase Sparse Array Normalization**: Handle numeric item maps that Firebase may deserialize as sparse arrays or JSON arrays; compare booking fields in canonical order so serialization differences never alter delivery identity.

## 🚀 Mandatory Version Update Rule (`/update`)
Every time the system version is bumped:
1. **Bump Version in `package.json`** using Semantic Versioning (MAJOR.MINOR.PATCH).
2. **Update Patch Notes in `src/data/changelog.js` & Prune Old Entries (Changelog Pruning Policy)**:
   - บันทึกการเปลี่ยนแปลงใน `src/data/changelog.js` (ซึ่งแสดงผลผ่าน `ChangelogModal.vue` ที่เรียกจาก `showChangelog()` ใน `src/components/Header.vue`) ตามรูปแบบ Keep a Changelog
   - **กฎการตัด Changelog เก่าออก**: ตรวจสอบและคงเหลือเฉพาะเวอร์ชันล่าสุดประมาณ **15–20 เวอร์ชัน** เท่านั้น ทุกครั้งที่มีเวอร์ชันใหม่ให้ตัดเวอร์ชันเก่าทิ้งเสมอ เพื่อไม่ให้ไฟล์บวมและควบคุมขนาด Bundle ของแอปพลิเคชัน
3. **Build & Verify** with `npm run build` and `npm test`.

## 🧠 Mandatory Proactive Rule & `/verify` Auto-Evolution Rule (บังคับทำและรายงานทุกครั้ง)
Every time you complete a code change, feature addition, bug fix, or optimization:
1. **Think & Evaluate Proactively**: Automatically analyze whether any project rules (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) or verification checklist items (`.agents/workflows/verify.md`) should be added or updated to reflect the new logic or invariants.
2. **Auto-Update Immediately**: If any rule or `/verify` item should be updated, update the files immediately **without waiting for the user to ask**.
3. **Always Report to User**: In every response after modifying code, explicitly report to the user which rules and `/verify` items were updated (or confirm that they were reviewed and are already up-to-date).

## 📦 Automated Release Trigger Rule ("อัพเลย")
When the user specifies **"อัพเลย"** (Deploy now), automatically execute the full pipeline in order:
1. **Run `/verify` Workflow**: Execute `npm test` & `npm run build`, verify all 15 checklist categories, and auto-update rules/`/verify` if needed.
2. **Run `/update` Workflow**: Bump version in `package.json` and update Patch Notes in `src/data/changelog.js` (and `Header.vue` if applicable).
3. **Git Commit & Push**: Commit all changes (`git add .`, `git commit -m "..."`, `git push origin main` or active branch).
4. **Deploy**: Run `npm run deploy` (or `npm run deploy:gh`) to deploy live to GitHub Pages.



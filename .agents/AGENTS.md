# Manowzab Command Center Project Rules

## 🔊 Audio and TTS Sync Invariant
1. **Cross-Device Audio Playback**: All audio events (TTS and SFX) must be synchronized across devices.
   - Do **NOT** call `queueAudio()` directly inside `useChatProcessor.js` (except for status welcome announcements).
   - Audio MUST be triggered by the Firebase sync listener inside the chat store (`src/stores/chat.js`) using the synced `sfxType`, `phoneticName`, and `ttsText` properties.
   - Ensure that only new, real-time messages play audio by validating `messageData.timestamp >= syncStartTime - 5000` and checking `isNew`.

2. **Emoji and Run Fallback**:
   - Emojis/Stickers must be read out loud as `"ส่งสติกเกอร์"` (sent sticker) when the original message has content but sanitizes to an empty string.
   - Fall back to `messageRuns` text in `useChatProcessor.js` when `displayMessage` is empty.

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
   - Handle single & multi-item Admin Proxy Cancel (`cancelNumFirstRegex`, `cancelNameKeywordNumRegex`, `cancelWithNumRegex`, `parseCancelIds`), protect against false-positive cancels (`conditionalCancelGuardRegex`), guard `multiBuyRegex` with `!isMultiBuyBlocked()`, preserve item `price` on chat cancel (`processCancel`), and never fall back to `null` (wildcard cancel) when Admin specifies a target customer name.
   - Disambiguate buying from questions, try requests, size complaints (`negationGuardRegex`), classifiers/pricing (`pricePatternRegex`), and quantity units (`quantityUnitRegex`), share `isAdminSizeSelectionNote()` across parser & processor, and always sync `isDateMismatch` messages to Firebase before returning.
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



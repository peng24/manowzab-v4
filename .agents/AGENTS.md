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
5. **Stock, Queue Promotion & Delivery Sync Consistency Invariant**:
   - Preserve `previousUid` and `nextUid` in `processCancel()` and pass post-transaction stock snapshots to `syncDeliveryCustomerForOwner()`.
   - In `clearAllStock()`, always `await remove()`, deduplicate owners, and pass `{}` to `syncDeliveryCustomerForOwner()` (which must accept `{}` without re-querying Firebase).
   - In `ShippingManager.vue`, record `lastDoneCount` and `lastDoneSessions` on `markDone()` so `undoDone()` reverts `totalBookings` and only restores sessions from that delivery cycle.
   - In `StockGrid.vue` and `HistoryModal.vue` (`showOwnerItems`), use `runTransaction` when cancelling past-session items, escape HTML with `escapeHtml()`, and re-open `showOwnerItems()` after confirm/cancel.

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



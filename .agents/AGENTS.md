# Manowzab Command Center Project Rules

### 📌 กฎเหล็กประจำระบบ: ห้ามทำอะไร (DO NOT) & ให้ทำอะไร (MUST DO)
*(อัปเดตล่าสุด: 12 พ.ย. 69 — ปฏิบัติตามอย่างเคร่งครัดและอัปเดตต่อเนื่องทุกครั้งที่มีการเปลี่ยนแปลง)*

#### 🚫 สิ่งที่ห้ามทำเด็ดขาด (DO NOT / NEVER)
1. **ห้ามส่งเสียงราคา และห้ามประกาศราคาลงช่องแชท (Zero Price TTS & Zero Chat Invariant):**
   - ราคาที่ AI ตรวจจับได้จากการฟังเสียงสดหรือย้อนหลัง **ห้าม** โพสต์ลง `chats/{videoId}`
   - **ห้าม** ออกเสียง TTS / SFX ราคา และห้ามรบกวนช่องแชททุกแท็บ ให้บันทึกราคาเงียบๆ (Silent Sync) เข้าไปที่ป้ายราคาสีทอง `.stock-price-pill` บนการ์ดสต็อกเท่านั้น
2. **ห้ามจับภาพสินค้าในตอนนี้ (Image Capture Paused):**
   - พักการจับภาพสินค้าไว้ก่อน ตามคำสั่งผู้ใช้ เน้นเฉพาะการฟังเสียงตรวจจับราคาและไซส์อย่างแม่นยำเท่านั้น
3. **ห้ามลบโค้ดการทำงานเดิมโดยพลการ (Modification Policy):**
   - ห้ามลบฟีเจอร์เดิม ให้ใช้แนวทาง Additive Enhancements เสมอ
4. **ห้ามใช้วันที่ปัจจุบันเป็นค่าเริ่มต้น เมื่อประมวลผลไลฟ์ย้อนหลัง (Replay Exact Date Invariant):**
   - ห้ามลงราคาผิดวันที่ หรือทับวันปัจจุบัน ต้องตรงตามวันที่ไลฟ์จริงเสมอ เช่น ลิงก์ไลฟ์วันที่ 11 พ.ย. 69 ต้องลงราคาในสต็อกและประวัติของวันที่ 11 พ.ย. 69 เท่านั้น
5. **ห้ามใช้ `subprocess` โดยไม่ระบุ `encoding='utf-8'` บน Windows:**
   - ห้ามละเลย encoding เมื่อเรียก yt-dlp/ffmpeg ใน Python เพื่อป้องกันภาษาไทยกลายเป็นอักษรต่างดาว
6. **ห้ามดึง URL ตรงของ GoogleVideo (`yt-dlp -g`) มาใส่ FFmpeg ในโหมดไลฟ์ย้อนหลัง:**
   - เพราะไฟล์เป็น DASH Segment จะทำให้สตรีมตัดจบหลัง 5 วินาที ต้องใช้ท่อ Pipe (`yt-dlp -o - | ffmpeg`) และบัฟเฟอร์ `read_exact_bytes` เสมอ
7. **ห้ามลบลูกค้าออกจากฐานข้อมูลเมื่อกดปุ่มถังขยะในหน้าส่งของ (Non-destructive Shipping Removal):**
   - `remove(dbRef(db, 'delivery_customers/...'))` ห้ามทำเด็ดขาด ให้เคลียร์เฉพาะวันส่ง (`unscheduleDeliveryState`) ย้ายไป "ฝากสินค้า" โดยข้อมูลการจองและที่อยู่ยังอยู่ครบ 100%
8. **ห้ามเรียก `ttsService.speak()` ตรงๆ โดยไม่ผ่านคิว:**
   - เสียงทุกอย่างต้องเข้า `queueAudio()` ใน `useAudio.js` เท่านั้น เพื่อป้องกันเสียงทับซ้อน
9. **ห้ามให้ลูกค้าที่ถูกแบน (Blacklist) จองสินค้าหรือมีเสียงอ่าน:**
   - ลูกค้าที่อยู่ในแบล็กลิสต์ต้องไม่มีเสียงอ่าน และไม่สามารถแย่งสต็อกได้
10. **ห้ามใส่ฟอนต์ 'TH Sarabun New' ในสลิปพิมพ์ความร้อน (Thermal Label):**
    - เพราะทำให้สระภาษาไทยหดเล็กลง 35% บน Windows ให้ใช้ 'Sarabun', 'Kanit', ...

#### ✅ สิ่งที่ต้องทำเสมอ (MUST DO / ALWAYS)
1. **คิดและอัปเดตกฎ + `/verify` อัตโนมัติทุกครั้ง (Proactive Rule & `/verify` Auto-Evolution):**
   - หลังแก้ไขโค้ดทุกครั้ง ต้องวิเคราะห์และอัปเดตไฟล์กฎ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และ `.agents/workflows/verify.md` โดยอัตโนมัติโดยไม่ต้องรอให้สั่ง พร้อมรายงานให้ผู้ใช้ทราบทุกครั้ง
2. **ระบบตรวจจับราคาไลฟ์ย้อนหลังตรงตามวันที่จริง (Replay Price Detection & Exact Date Sync):**
   - รองรับการใส่ลิงก์ YouTube ย้อนหลัง, Video ID, หรือระบุวันที่ เช่น `11 พ.ย. 69`
   - ตรวจสอบและสร้าง `history/{videoId}` และ `settings/{videoId}/stockSize` ใน Firebase ให้ตรงวันที่
   - ซิงค์ราคาเงียบๆ ไปที่ `stock/{videoId}/{item}/price` และคำนวณยอดขายรวมใน `history/{videoId}` อัตโนมัติ
   - แสดงป้ายราคาใน `HistoryModal.vue` และมีปุ่ม "เปิดที่หน้าหลัก" ให้สลับ `system/activeVideo` มาที่หน้าจอหลักได้ใน 1 คลิก
3. **เมื่อผู้ใช้สั่ง "อัพเลย" ให้รันไปป์ไลน์อัตโนมัติจนจบ:**
   - `/verify` (พร้อมอัปเดตกฎ/`/verify`) ➔ `/update` (bump version & changelog) ➔ `git commit & push` ➔ `npm run deploy` ขึ้น GitHub Pages ทันที
4. **รักษาความเสถียร 60fps และ Centralized Customer Store:**
   - ใช้ `useCustomerStore` จุดเดียวสำหรับ `delivery_customers` และ `address_book`
5. **แปลงตัวเลขเป็นคำอ่านภาษาไทย (Thai Cardinal Numbers):**
   - แปลงเลขเบอร์สินค้าและราคาเป็นคำอ่านภาษาไทย เช่น 15 -> "สิบห้า", 120 -> "หนึ่งร้อยยี่สิบ" เพื่อให้อ่านออกเสียงอย่างเป็นธรรมชาติ
6. **บันทึก Log การวิเคราะห์ทุกเซสชัน:**
   - บันทึก `.log`, `.jsonl`, และ `_summary.json` ทุกครั้งเพื่อใช้ปรับปรุงความแม่นยำอย่างต่อเนื่อง
7. **ระบบตรวจจับราคาและเบอร์สินค้าแบบสลับลำดับและมีชื่อคั่น (Permutation & Intervening Name Detection):**
   - ต้องรองรับการพูดสลับลำดับของแม่ค้าทั้ง 6 รูปแบบ เช่น `[เบอร์] + [ชื่อ] + [ราคา]`, `[ราคา] + [เบอร์]`, `[ชื่อ] + [เบอร์] + [ราคา]` โดยใช้ `extract_code_price_permutations()`
   - ป้องกัน False Positives โดยใช้ Negative Lookahead กรองหน่วย `บาท/ตัว/คน/วัน/%` ออกจากตัวเลขเบอร์สินค้า และตรวจสอบราคาในชุดราคามาตรฐาน (`VALID_PRICES`)
8. **แสดงยอดขายรวมไลฟ์ปัจจุบันแทนข้อความไฟเริ่มติดแล้ว (Live Session Sales Revenue Badge):**
   - ใน `StockGrid.vue` (และ `HistoryModal.vue`) เปลี่ยนตำแหน่งข้อความเดิม ("🔥 ไฟเริ่มติดแล้ว!") เป็นป้ายยอดขายรวม `.total-sales-badge` (`ยอด: ฿...`) สีทองเรืองแสง
   - คำนวณจาก `useStockStore.totalSales` โดยรวมเฉพาะสินค้าที่ขายแล้ว (`item.owner` มีค่า) และมีราคาที่ถูกต้อง (`item.price > 0`) สินค้าที่ว่างอยู่ไม่ถูกนำมาคำนวณ
   - รองรับตัวเลขอัปเดตแบบแอนิเมชันลื่นไหล (`animateValue`), Pulse Effect (`isPulsingSales`), Tooltip สรุปจำนวนชิ้น, และ Responsive ซ่อนคำว่า `ยอด:` บนมือถือ (`<= 768px`) เพื่อความกะทัดรัด


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
   - Render **Visual-Only** (no extra auto-TTS) in `ChatPanel.vue` via: (1) Full-width `.smart-answer-card` below the customer bubble inside the row (`.smart-answer-top` combining headline + `📌` pin button without a separate header row, with `getSmartAnswerKey(chat)` in `.chat-row` `v-memo`), (2) 25-second Pinned `.smart-hud-banner` at the top of `ChatPanel.vue` (cleaning up `pinnedHudTimer` in `onUnmounted`), and (3) `💡 คำถาม` tab (`tab-question`) in `.chat-intent-tabs`.
   - **Full-Width Answer Layout (2026-10-30)**: `.smart-answer-card` must be a direct child of `.chat-row`, outside `.chat-bubble`/`.chat-bubble-container`, spanning both avatar and message columns. Keep equal inner side padding, thin black text outlines, responsive wrapping, and working pin/jump/quick-order controls without changing audio or answer data flow.
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

14. **Stock Grid Price Display & Inline Editing Invariant (v5.4.27+)**:
    - In StockItemCard.vue, when item.price && Number(item.price) > 0, display the price as a clean, high-visibility golden yellow pill badge (.stock-price-pill, e.g. ฿80) within .card-meta-row (rendering for both booked items and unsold items with pre-set price). When price is null, 0, or missing, the price badge is completely hidden to eliminate visual clutter. Clicking the price badge triggers item selection and opens the Queue Modal.
    - In StockGrid.vue, the Queue Modal provides an interactive .price-input-section allowing direct price input (editingPrice), quick-set pills (50.-, 60.-, 80.-, 100.-, 120.-, 150.-), and a clear button to remove/unset price. Updates persist atomically via stockStore.updateItemData which auto-syncs totalPrice in delivery_customers. In StockGrid.vue search, queries matching prices highlight and filter corresponding cards.

15. **Zero Price Announcement Chat & Mute Price TTS Invariant (v5.4.30+)**:
    - AI-detected prices (via live audio stream or chat processor) update stock items silently to the stock card pill (.stock-price-pill) via Firebase RTDB `stock/{videoId}/{item}/price`.
    - It must NEVER post announcement messages to chat (`chats/{videoId}`) and NEVER trigger TTS or SFX audio playback across connected devices.
    - `src/stores/chat.js` and `src/components/ChatPanel.vue` strictly filter out any incoming or historical price announcement messages (`isPriceAnnouncementMessage`) across all chat tabs.

16. **Historical Live Session & Replay Price Sync Invariant (v5.4.33+)**:
    - In `HistoryModal.vue`, display the price badge (`.stock-price`) whenever `item.price && Number(item.price) > 0` for both sold and unsold items.
    - Provide `openOnMainBoard()` action in `HistoryModal.vue` allowing the operator to switch `system/activeVideo` in Firebase and open the historical live session directly on the main dashboard in 1 click.
    - In `live-product-capture-ai`, `SessionResolver` auto-resolves live dates (from YouTube title/upload_date or Thai date string queries), ensures `history/{videoId}` exists in Firebase with title and date timestamp, runs fast accelerated replay without `-re`, syncs detected prices directly to `stock/{videoId}/{item}/price`, and recalculates totals in `history/{videoId}`.

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
1. **Run `/verify` Workflow**: Execute `npm test` & `npm run build`, verify all current checklist categories, and auto-update rules/`/verify` if needed.
2. **Run `/update` Workflow**: Bump version in `package.json` and update Patch Notes in `src/data/changelog.js` (and `Header.vue` if applicable).
3. **Git Commit & Push**: Commit all changes (`git add .`, `git commit -m "..."`, `git push origin main` or active branch).
4. **Deploy**: Run `npm run deploy` (or `npm run deploy:gh`) to deploy live to GitHub Pages.

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

## Quiet Luxury Live Monitor UI (v5.5.0+ — 2026-11-13)
- `App.vue`, `Header.vue`, `style.css`: `<Header />` renders full-width above `.app-layout`; `.mobile-pane-tabs` handles single-pane mobile switching at `<= 900px`; keep `.version-badge` readable (`#94a3b8`) and preserve `100dvh` Lenis lock (`html.lenis, html.lenis body`) and `#chat-viewport { scroll-behavior: auto; }`.
- `StockItemCard.vue`, `StockGrid.vue`: Preserve 3-tier non-overlapping card hierarchy, booking animations (`orderPopEntry`, `newOrderLuxPulse`, `.new-order-shimmer`) including queue promotion (`oldItem.owner !== newItem.owner`), cancellation animations (`cancelShakeEntry`, `cancelPulseLux`, `.cancel-flash-sweep`), untruncated `.stock-search-input` (`150px`), and single-arrow `.quick-filter-select`.
- `ChatPanel.vue`: Keep enlarged live-monitor readability (`1.18rem` `.chat-bubble`, `#ffffff` 600/700 weight, `430px` desktop `.chat-panel` width) and icon-only `.btn-collapse` so `.chat-header-bar` never clips at the right edge.
- `ShippingManager.vue`: Keep Quiet Luxury Obsidian & Champagne Gold `1040px` modal styling, `white-space: nowrap` on `.item-count-auto`, uniform FontAwesome action icons, and non-destructive `removeFromShippingList` behavior.

# 🤖 AI Development Rules & Context (Manowzab v4)

> **IMPORTANT FOR AI:** Before generating any code, READ THIS FILE. It contains critical architectural decisions and constraints that must be preserved.

## 1. Project Overview

**Manowzab Command Center** is a Vue 3 + Vite application for Live Commerce management. It is currently in a **STABLE & PRODUCTION-READY** state.

## 2. Tech Stack

- **Framework:** Vue 3 (Composition API) + Vite
- **State Management:** Pinia
- **Backend:** Firebase Realtime Database
- **CSS:** Custom vanilla CSS
- **TTS:** Google Cloud Standard in approved opt-in builds (native in free builds); Google Cloud TTS (`th-TH-Standard-A`, mode `S`) + Native TTS (`🤖`, fallback) with shared singleton Web Audio API `AudioContext` and LRU Audio Buffer Cache.

## 3. 🚨 CRITICAL RULES (DO NOT BREAK)

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


### 🛡️ Modification Policy (Golden Rule)

1.  **Current Logic is GOOD:** Assume the existing logic (especially Audio, TTS, and Stock sync) is correct and optimized.
2.  **Additive Changes Only:** When requested to add features, write new code _alongside_ the old code. **DO NOT DELETE** existing logic unless explicitly told to "remove" or "replace".
3.  **Enhancement over Replacement:** If you must modify an existing function, the new version **MUST** perform better or handle more edge cases. It must NEVER lose existing capabilities (e.g., iPad compatibility).

### 🔊 Audio & Text-to-Speech (TTS)

1.  **iPad/iOS Compatibility:** The system uses a 3-layer audio unlock strategy (`iosAudioUnlock.js`, `unlockAudio()`, `ensureAudioContextReady()`). **NEVER REMOVE THIS.**
2.  **Singleton Pattern & Shared `AudioContext`:** Always use the shared `ttsService` instance and its shared `AudioContext` (`ttsService.getAudioContext()`).
3.  **Cloud Opt-In Only — Multi-Tier Fallback:** Google Cloud Standard TTS (`S`, 2s total network deadline) ➡️ Native TTS (`🤖`). Use bounded retries and cooldown; see the current Thai TTS Policy below.
4.  **Unified Audio Queue:** ALL audio (SFX + TTS) must go through `queueAudio()` in `useAudio.js`. **DO NOT** call `ttsService.speak()` directly — it bypasses the queue and causes audio overlap.

### 🔇 Zero Price Announcement Chat & Mute Price TTS (v5.4.30+)

1.  **Silent Price Sync:** AI-detected prices (via live audio stream or chat processor) update stock items silently to the stock card pill (`.stock-price-pill`) via Firebase RTDB `stock/{videoId}/{item}/price`.
2.  **Zero Chat & Zero TTS:** Price updates must NEVER post announcement messages to chat (`chats/{videoId}`) and NEVER trigger TTS or SFX audio playback across connected devices.
3.  **Strict Filter:** `src/stores/chat.js` and `src/components/ChatPanel.vue` strictly filter out any incoming or historical price announcement messages (`isPriceAnnouncementMessage`) across all chat tabs.

### 🔑 API Key Rotation

1.  **Unified System:** YouTube API (`useYouTube.js`) and `YouTubeLiveChat.js` share `systemStore.currentKeyIndex` via `onKeyRotate` callback.
2.  **Wrap-around:** Keys cycle back to first key using modulo: `(index + 1) % keys.length`.
3.  **Recursion Limit:** `smartFetch()` and `loadChat()` limit retry depth to `keys.length`.

### 💬 Chat, Sync & Real-Time Performance (v5.3.2+)

1.  **Firebase Sync:** Chat is synced via `chats/{videoId}`. Host writes, Clients read.
2.  **Concurrent Poll Micro-Batching:** `YouTubeLiveChat.js` must dispatch all new chat items per poll concurrently (`Promise.allSettled`) into `useChatProcessor`'s 80ms micro-batch window (`incomingBatchQueue`) so messages sort by `publishedAt` and execute in one 80ms batch instead of stalling `80ms × N` sequentially.
3.  **Centralized Customer Store (`useCustomerStore`):** Never attach duplicate `onValue(dbRef(db, "delivery_customers"))` or `onValue(dbRef(db, "address_book"))` listeners in components. Always use `src/stores/customer.js` and its $O(1)$ lookup indexes (`deliveryByNormKey`, `getCustomerMetaByName`).
4.  **Quota Safety:** Viewer polling interval must be >= 60s. Workbox Service Worker in `vite.config.js` must exclude `/liveChat/messages` and `texttospeech.googleapis.com`.
5.  **Chat Initial Bottom Pinning & Direction-Aware Auto-Scroll:** `ChatPanel.vue` must use `evaluateChatScrollState()`, Double-`requestAnimationFrame` in `scrollToBottom()`, and `ResizeObserver` on `#chat-list`/`#chat-viewport` (without `contain-intrinsic-size: 55px` on `.chat-row`) so initial page load and async customer badge/pill rendering always stay pinned to the latest message without falsely showing `"ข้อความใหม่ ⬇"`.

### 🎯 Regex Engine, Cancel Safety & Chat Intent Accuracy (v5.4.0+)

1.  **Admin Proxy Cancel, Multi-Item Cancel & Safety Guard:** Support single and multi-item proxy cancellation (`"ยกเลิก 12 15"`, `"12 มะระ ยกเลิก"`, `"12 15 มะระ ยกเลิก"`, `"มะระ ยกเลิก 12"`, `"ยกเลิก 12 มะระ"`), cancellation typos (`"64ยกเริก"`, `"ม้นบางยอเลิกก่อน"`), and `"ไม่รับ25นะคะ"` / `"นาวพี่ไม่เอา38"` as `CANCEL_ITEM`, while guarding against conditional/stain notes (`conditionalCancelGuardRegex` e.g. `"ผ้าเปื้อนก็ยังไม่เอานะนาว..."`), guarding `multiBuyRegex` with `!isMultiBuyBlocked()`, preserving item `price` on chat cancel when queue is empty (`processCancel`), and never falling back to `null` (wildcard cancel) when Admin specifies a customer name that does not match the item's owner/queue.
2.  **Buy vs. Question/Try/Price Disambiguation & Admin Note Parity:** Allow valid buys (`"สีขาว34ค่ะพี่นัน"`, `"พี่เอาใบที่120"`, `"ใช่คะ25"`, `"70นาว"`), prevent words containing `"อก"` (`"บอก"`, `"ดอก"`, `"คอกลม"`, `"ออก"`, `"นอก"`) from falsely triggering `questionRegex`, exclude `"ส่งรูป"` / `"พรุ่งนี้ส่งรูป"` from `shippingRegex` / `SHIP_TMR_REGEX`, block fit complaints (`negationGuardRegex`), block classifier/price queries (`"ตัว 100"`), guard quantity units (`quantityUnitRegex`), share `isAdminSizeSelectionNote()` across `chatParserUtils.js` and `useChatProcessor.js` (including garment/pattern/question notes with customer name suffix like `"กางเกงยีนส์ กุญสิญา"`, `"21 อกเท่าไหร่ สมฤทธิ์"`), and always push `isDateMismatch` messages to Firebase before returning.
3.  **ReDoS Prevention & Module Scoping:** Eliminate nested quantifiers (`*?\s*`) using disjoint token structures (`([a-zA-Z\u0E00-\u0E7F._-]+(?:\s+[a-zA-Z\u0E00-\u0E7F._-]+)*?)`), pre-compile module-scoped regexes in `addressParser.js` and `useChatProcessor.js`, and memoize dynamic RegExp in `ChatPanel.vue` (`proxyHighlightRegexCache`).
4.  **Strict Self-Name Filtering:** Block conversational phrases, clothing types, and greetings (`"สวัดดีค่ะ"`, `"ใข่ค่ะ"`, `"เก่าค่ะ"`, `"สบายดีค่ะ"`, `"ลายดอก"`, `"ตัวเล็กๆ"`, `"เมื่อคืน"`, `"บ่"`) from entering customer nickname auto-learning.
5.  **Backdated Orders / Yesterday Debt Notes Audio & Extraction Invariant:** Support yesterday/backdated customer orders in both name-first and number-first formats (`"มะระ 39 เมื่อวาน"`, `"39 เมื่อวาน มะระ"`, `"ของมะระ 39 เมื่อวาน"`, `"หนิง เมื่อวาน 41 43"`). These orders must NOT cut today's stock grid, must sync to Firebase with full audio support (`sfxType: isNewCustomerChat ? 'bell' : 'success'`, `ttsText: isVoiceChat ? '' : ttsMessage`), and `ttsService.speak()` must deduplicate author name prefixes to prevent repeating customer names during TTS playback.
6.  **Admin Notes & TTS Zero-Mute Fallback Invariant (v5.4.11+):** Admin size requests, question notes, and admin messages (e.g. `"เสื้อสีแดง ราคาเท่าไหร่ เดย์"`, `"3xl อำไพ"`, `"รอแป๊บ"`) must transmit valid `ttsText` (`ttsMessage`) to Firebase rather than empty strings, and `src/stores/chat.js` must fall back to `messageData.text` if `ttsText` is empty or missing (for non-banned messages) to ensure no message is ever silenced. `TextToSpeech.js` supports both prefix and suffix author deduplication so customer notes and queries speak cleanly.
7.  **Lenis Smooth Scrolling & Scroll Isolation Invariant (v5.4.12+):** Lenis smooth inertial scrolling is integrated via `lenis`, `lenis/vue`, `src/composables/useSmoothScroll.js`, and `v-smooth-scroll`. Fixed 100dvh command center layout is strictly preserved in `src/assets/style.css` (`html.lenis, html.lenis body { height: 100dvh; overflow: hidden; }`). To prevent interference with real-time YouTube live chat auto-scrolling and bottom pinning, `#chat-viewport` in `ChatPanel.vue` MUST carry `data-lenis-prevent`. `StockGrid.vue` utilizes `useSmoothScroll(gridContainer)` for fluid mouse wheel navigation and centered item jump (`scrollToItem`), while `ShippingManager.vue` isolates table scrolling with `data-lenis-prevent`.
8.  **Thai Cardinal Number & Booking TTS Pronunciation Invariant (v5.4.13+):** Centralize number-to-Thai-words conversion in `src/utils/thaiNumberWords.js` (`numberToThaiWords`, `replaceNumbersWithThaiWords`). Solves TTS reading numbers digit-by-digit (e.g. reading 15 as "หนึ่งห้า", 12 as "หนึ่งสอง", 25 as "สองห้า", 120 as "หนึ่งสองศูนย์") by converting booking item numbers, quantities, prices, and CF bookings into proper Thai cardinal words ("สิบห้า", "สิบสอง", "ยี่สิบห้า", "หนึ่งร้อยยี่สิบ", "ซีเอฟ สิบห้า", "สิบห้า ทับ หนึ่ง"). Two-Tier Guarantee: (1) `useChatProcessor.js` converts numbers in `ttsMessage` / `ttsText` before storing to Firebase RTDB (`text` remains the original raw string for UI display). (2) `TextToSpeech.js` sanitizes and converts numbers before speech in both `speakOnline` (Google Cloud Standard `th-TH-Standard-A`) and `speakNative` (SpeechSynthesis). Safe Guards: Protects phone numbers (`0812345678`, `091-234-5678`), codes with leading zeros (`01`, `02`), and time expressions (`13:11`) from being converted to cardinal words.
9.  **Stock Grid Price Display & Inline Editing Invariant (v5.4.27+):**
    *   In `StockItemCard.vue`, when `item.price && Number(item.price) > 0`, display the price as a clean, high-visibility golden yellow pill badge (`.stock-price-pill`, e.g. `฿80`) within `.card-meta-row` (rendering for both booked items and unsold items with pre-set price). When `price` is null, 0, or missing, the price badge is completely hidden to eliminate visual clutter. Clicking the price badge triggers item selection and opens the Queue Modal.
    *   In `StockGrid.vue`, the Queue Modal provides an interactive `.price-input-section` allowing direct price input (`editingPrice`), quick-set pills (`50.-`, `60.-`, `80.-`, `100.-`, `120.-`, `150.-`), and a clear button to remove/unset price. Updates persist atomically via `stockStore.updateItemData` which auto-syncs `totalPrice` in `delivery_customers`. In `StockGrid.vue` search, queries matching prices highlight and filter corresponding cards.
10. **Stock & Delivery Sync Consistency:**
    *   `processCancel` must preserve both `previousUid` and `nextUid` and pass post-transaction stock snapshots to `syncDeliveryCustomerForOwner`.
    *   `clearAllStock` must `await remove()`, deduplicate affected owners, and pass `{}` to `syncDeliveryCustomerForOwner` (which must respect `{}` without re-fetching stale data from Firebase).
    *   `markDone` / `undoDone` in `ShippingManager.vue` must record `lastDoneCount` and `lastDoneSessions` so `undoDone` decrements `totalBookings` back and only restores sessions from the current delivery cycle.
    *   Deleting items inside `showOwnerItems` (`👗` modal in `StockGrid.vue` and `HistoryModal.vue`) must use `runTransaction` to promote next-in-queue or preserve price, keep `allStock` in outer scope, and re-open the modal when items remain or when confirmation is cancelled.
6.  **Operational UX/UI & Search Filtering (v5.4.4+):**
    *   `StockGrid.vue`: Real-time search (`stockSearchQuery`) filters cards by number, owner, nickname, or queue and renders all matching items beyond the window-capping limit. Pressing Enter with a number triggers smooth scroll and highlight (`scrollToItem`).
    *   `StockItemCard.vue`: Show `.no-addr-indicator` (`📍 รอที่อยู่`) reactively via `hasCustomerAddress(owner)` using `customerStore.getCustomerMetaByName(owner)?.hasAddress`, and include `hasCustomerAddress` in `v-memo` of both `StockGrid.vue` and `StockItemCard.vue`.
    *   `ShippingManager.vue`: Real-time search filters table and mobile cards by customer name, note, or address summary, paired with quick sub-filter pills (`⚠️ ยังไม่มีที่อยู่` and `🖨️ ยังไม่พิมพ์`).
    *   `Header.vue`: `.hero-connect-container.connected` collapses the Video ID input to ~95px and expands on focus/hover (~170px) to conserve horizontal space without breaking `Shift+F` autofocus (`id="yt-video-id-input"`).
    *   `ShortcutsModal.vue`: Hotkey cheat sheet modal accessible via `⚡ Tools` menu or pressing `?` / `F1`.

### 🛡️ Customer Blacklist & Ban Protection (v5.4.5+)

1.  **Centralized Store & RTDB Sync:** `useBlacklistStore` in `src/stores/blacklist.js` manages blacklist state under `/blacklist`. All connected devices sync status in real time.
2.  **Zero Audio Leakage:** Banned customer messages MUST NOT trigger any TTS or SFX (`queueAudio` bypassed in `src/stores/chat.js`).
3.  **Anti-Stock Stealing:** Banned customers CANNOT claim stock or enter queues. Messages are recorded with `isBanned: true`, `type: "banned"`, `sfxType: null`, `ttsText: ""`.
4.  **Option A Dimmed Display & Avatar Overlay:** `ChatPanel.vue` renders banned messages with 45% opacity, red border, and `🚫` overlay directly over the profile picture (restoring full opacity on hover for admin inspection).
5.  **No Auto-Release of Previous Stock:** Banning never automatically releases prior bookings; admin releases manually if desired.
6.  **Space-Agnostic Matching:** `isBanned()` and `getBanInfo()` match Thai names with and without spaces (e.g. matching "สมชาย ใจดี" and "สมชายใจดี").
7.  **Admin Tools:** Support `!แบน [ชื่อ]` / `!ปลดแบน [ชื่อ]` chat commands, 1-click ban/unban by clicking customer profile avatar (hidden inside avatar with hover hint), `BlacklistModal.vue` in `⚡ Tools`, and direct ban/unban toggle inside `CustomerQuickEditModal.vue`.

### 🕒 Backdated Booking Smart Time Formatting (v5.4.7+)
- **Centralized Formatter**: รวมศูนย์ตรรกะจัดรูปแบบเวลาการจองและจองย้อนหลังไว้ที่ src/utils/timeFormatUtils.js (ormatBackdatedCard, ormatBackdatedDetail, ormatNormalBookingTime, getBookingTooltip)
- **Zero Noisy Seconds**: ตัดวินาทีที่ไม่จำเป็นออก (13:11:50 -> 13:11)
- **Calendar Day Boundary Awareness**: แยกความสัมพันธ์ของวันอย่างแม่นยำ (วันนี้, เมื่อวาน, วันอื่น)
- **Card UI**: แสดงเฉพาะไอคอนย้อนเวลา a-clock-rotate-left สีส้มอำพันต่อท้ายชื่อลูกค้าโดยตรง (.backdated-inline-icon) โดยไม่แสดงตัวหนังสือเวลา เพื่อประหยัดพื้นที่แนวตั้งและการ์ดคลีนตา พร้อม Tooltip แสดงวันและเวลาจองเต็มรูปแบบเมื่อนำเมาส์ชี้
- **Modal UI**: แสดง Badge ชัดเจน [ ⏳ ย้อนหลัง • วันนี้/เมื่อวาน/วันที่ HH:mm ]

### 💡 Smart Seller Answer Assistant (v5.4.9+)
1. **Zero Extra Firebase Reads, Visual-Only & Non-Redundant Copy**: `src/utils/smartAnswerUtils.js` (`resolveSmartAnswer`, `isSmartQuestionText`, `extractQueriedItemId`, `resolveInquiryCustomer`) resolves customer questions across 5 stored-data categories (`item`, `orders`, `yesterday`, `hold`, `profile`) directly from in-memory `stockStore.stockData`, `customerStore.deliveryByNormKey`, and `customerStore.addressBook` without triggering extra TTS audio or duplicate Firebase listeners. Omit duplicate customer names (unless `isProxyTarget`), omit duplicate item ID lists in headlines, and omit duplicate address/COD pills in `orders`/`item`/`yesterday`/`hold`.
2. **3-Point Seller Display in `ChatPanel.vue`**:
   - **Compact Inline Smart Answer Card** (`.smart-answer-card`) directly inside `.chat-bubble` below `.chat-text` using `.smart-answer-top` (combining headline + `📌` pin button without a separate header row, with `getSmartAnswerKey(chat)` included in `.chat-row` `v-memo`).
   - **25-Second Pinned Smart HUD Banner** (`.smart-hud-banner`) at the top of `ChatPanel.vue` with manual dismiss (`✕`), live reactive answer updates, and `pinnedHudTimer` cleanup in `onUnmounted`.
   - **Dedicated `💡 คำถาม` Filter Tab** (`selectedChatTab === 'question'`) in `.chat-intent-tabs` with a live question count badge (`questionTabCount`).
3. **Interactive Cross-Panel Actions**: Clicking item pills (`🔍 ไปที่ #N` / `#N`) or customer order pills (`📋 ดูทั้งหมด`) dispatches `manowzab:jump-to-item` (`scrollToItem`) and `manowzab:show-owner-items` (`showOwnerItems`) handled by `StockGrid.vue` (cleaned up on unmount).

## 4. Key File Structures

- `src/services/TextToSpeech.js`: Core TTS logic (Google Standard + Native, key rotation, LRU buffer cache, shared `AudioContext`).
- `src/composables/useAudio.js`: Unified SFX + TTS queue (sequential, 35s safety timeout).
- `src/composables/useChatProcessor.js`: Chat intent detection (Lazy short-circuit Regex, 80ms micro-batch queue, multi-buy, cancel, admin proxy).
- `src/stores/stock.js`: Stock management (Firebase transaction sync, auto-expand, queue system, throttled & deduplicated history sync).
- `src/stores/customer.js`: Centralized reference-counted `delivery_customers` & `address_book` listeners, $O(1)$ lookup maps, and live cache hooks for `deliverySync.js`.
- `src/stores/blacklist.js`: Centralized blacklist store (`settings/blacklist` Firebase listener, space-agnostic Thai name matching, banUser/unbanUser).
- `src/services/YouTubeLiveChat.js`: YouTube chat polling (concurrent poll batch dispatch, exponential backoff, key rotation).
- `src/composables/useYouTube.js`: YouTube connection (smartFetch, viewer count, disconnect).

## 5. Version, Patch Notes, Auto-Rule Evolution & Automated Release

- Version is read from `package.json` → `src/stores/system.js`
- Patch Notes are in `src/data/changelog.js` (displayed via `ChangelogModal.vue` opened by `showChangelog()` in `src/components/Header.vue`)
- Use the `/update` workflow to bump version and update Patch Notes after every change (keep only the latest 15–20 versions in `changelog.js`)
- **🧠 Proactive Rule & `/verify` Auto-Evolution (บังคับทำและรายงานทุกครั้ง):** ทุกครั้งหลังแก้ไขโค้ด เพิ่มฟีเจอร์ หรือปรับปรุงระบบ ต้องคิดวิเคราะห์และอัปเดตไฟล์กฎ (`AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, `.agents/skills/manowzab-core/SKILL.md`) และ `.agents/workflows/verify.md` ให้เป็นปัจจุบันโดยอัตโนมัติ **และต้องรายงานให้ผู้ใช้ทราบทุกครั้ง**
- **Release Trigger ("อัพเลย"):** When the user says **"อัพเลย"**, automatically execute the full pipeline: `/verify` (พร้อมอัปเดตกฎ/`/verify` อัตโนมัติ) → `/update` → Git Commit/Push → Deploy to GitHub Pages (`npm run deploy`).

## 6. ✅ Mandatory Verification Checklist (ต้องตรวจสอบทุกครั้งหลังแก้โค้ด)

> **IMPORTANT FOR AI:** หลังจากแก้ไขโค้ดทุกครั้ง ต้องตรวจสอบว่าระบบยังทำงานได้ถูกต้องตามรายการด้านล่างนี้ และรายการทั้งหมดใน `.agents/workflows/verify.md` ห้ามทำให้ข้อใดข้อหนึ่งเสียหาย

| #   | รายการตรวจสอบ                                            | รายละเอียด                                                                                                                                     |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **แชทสด แสดงทุกข้อความตามลำดับจริง**                     | ข้อความทุกข้อความจาก YouTube Live Chat ต้องแสดงผลในหน้าจอตามลำดับเวลาจริง ห้ามหาย ห้ามสลับลำดับ (รวบเป็น Batch 80ms เดียวต่อรอบ Poll)          |
| 2   | **อ่านแชทสด ต้องอ่านทุกข้อความ**                         | TTS ต้องอ่านทุกข้อความที่เข้ามา รวมถึงข้อความที่จองซ้ำ/จองล็อค/emoji ต้องผ่าน `chat.js` Firebase sync listener เข้า `queueAudio()` ครบทุกจุด   |
| 3   | **ระบบสลับ API Key ใช้ได้ทั้ง YouTube API / Google TTS** | API Key rotation ต้องทำงานสมบูรณ์ทั้ง `useYouTube.js`, `YouTubeLiveChat.js` และ `TextToSpeech.js` โดยแยก YouTube `currentKeyIndex` กับ TTS `activeKeyIndex`; การหมุนคีย์ไม่เพิ่มโควต้ารวมของโปรเจกต์ |
| 4   | **ระบบจอง: มากกว่า 1 คน = ต่อคิว**                       | เมื่อมีคนจองรายการเดียวกันมากกว่า 1 คน ต้องเพิ่มเข้า queue ตามลำดับ ไม่ใช่ทับกัน                                                               |
| 5   | **ขยายรายการจองอัตโนมัติ**                               | เมื่อมีการจองเกินจำนวนรายการที่กำหนด ให้ขยายรายการเป็นชุด (เช่น กำหนด 50 จองที่ 56 → ขยายเป็น 60)                                              |
| 6   | **รองรับเลขไทย**                                         | เมื่อมีการจองด้วยเลขไทย (เช่น "๕๖") ต้องแปลงเป็นเลขอารบิกและจองได้ตามปกติ                                                                      |
| 7   | **จองหลายรายการพร้อมกัน**                                | เมื่อผู้ใช้จองหลายรายการในข้อความเดียว (เช่น "จอง 1 3 5") ต้องจำการจองทุกรายการ ห้ามตกหล่น                                                     |
| 8   | **รวมศูนย์ Listener ลูกค้า & ประสิทธิภาพสูงสุด**         | ใช้ `useCustomerStore` จุดเดียวสำหรับ `delivery_customers` / `address_book` และรักษาความเร็ว 60fps ตลอดการไลฟ์สด                               |
| 9   | **ระบบ Blacklist ป้องกันเสียงและสต็อก 100%**             | ลูกค้าที่ถูกแบนต้องไม่สามารถจองสินค้าหรือส่งเสียงอ่าน TTS/SFX ข้ามอุปกรณ์ได้ และข้อความแสดงแบบสีจาง 45% พร้อมป้าย 🚫 BAN                         |
| 10  | **Stock Grid Price Display & Inline Editing**            | ป้ายราคาสีทอง .stock-price-pill แสดงบนการ์ดสินค้าเมื่อมีราคา (> 0) ทั้งตัวที่จองแล้วและยังว่างอยู่ และแก้ไขราคาได้ผ่าน Queue Modal                 |
| 11  | **Zero Price Announcement Chat & Mute Price TTS**        | ข้อความแจ้งราคาจาก AI ต้องไม่ออกเสียง TTS/SFX และถูกซ่อนออกจากช่องแชททุกแท็บ 100%                                                                |
| 12  | **ตรวจจับและอัปเดตราคาจากไลฟ์ย้อนหลังตรงตามวันที่จริง** | Manowzab AI รองรับการใส่ลิงก์ YouTube ย้อนหลังหรือระบุวันที่ (เช่น 11 พ.ย. 69) บันทึกราคาลง Firebase stock/{videoId} และ history/{videoId} ตรงตามวันที่ไลฟ์จริง พร้อมแสดงป้ายราคาและปุ่ม 'เปิดที่หน้าหลัก' ใน HistoryModal.vue |

### วิธีตรวจสอบและรายงานผล

- **ก่อนแก้โค้ด:** ทำความเข้าใจว่าโค้ดที่จะแก้เกี่ยวข้องกับรายการไหนบ้าง
- **หลังแก้โค้ด:** Review โค้ดที่แก้ว่าไม่กระทบกับรายการข้างต้นและ `.agents/workflows/verify.md`
- **คิดและอัปเดตกฎ + `/verify` ทุกครั้ง:** หากมีลอจิกหรือข้อกำหนดใหม่ที่ควรเพิ่มในกฎหรือ `/verify` ให้อัปเดตทันทีและรายงานให้ User ทราบทุกครั้ง

---

_Please acknowledge that you understand these rules. If I ask for a change, ensure it improves the system without breaking current stability._



## Firebase identity and delivery cycles (2026-10-30)

- Firebase Authentication is the source of identity. Never trust client-generated sessions, hard-coded password hashes, or automatic anonymous sign-in for dashboard access.
- Business nodes require a non-anonymous Firebase user with `admin_users/<UID> = true`. Only Firebase Console/Admin SDK may modify grants. Start protected listeners after authorization and tear them down on logout/revocation.
- Never include passwords in `VITE_*` variables. Python transcriber credentials use server-side `FIREBASE_TRANSCRIBER_EMAIL` / `FIREBASE_TRANSCRIBER_PASSWORD` and an approved account.
- Both shipping screens must call `deliveryActions.js`; complete/undo are transactions on the whole customer record, guarded by delivery cycle identity and the reviewed booking snapshot.
- All stock-to-delivery writers, including Dashboard and HistoryModal, must use `syncDeliveryCustomerForOwner`. Retain `items`, `fulfilledItems`, and latest undo metadata. Never overwrite totals calculated from a stale cache.
- A booking is identified by video + item number + booking time. Editing a price/name/UID cannot make a shipped booking pending. New bookings in the same video count only unshipped items.
- Keep older iPad support: delivery transitions operate on JSON records without requiring `structuredClone`.
- Regression verification: `npm test`, `npm run test:transcriber`, `npm run build`, and `npm run test:firebase` with local emulators. Report physical audio/iOS/printer/live API checks separately; passing unit tests does not certify them.

- Firebase may deserialize numeric item maps as sparse arrays. Normalize null slots, and compare booking fields in a canonical order; object/array shape and field serialization order must not change delivery identity.

## Selective reconciliation and reactive answer caching (2026-10-30)

- App delivery reconciliation must group stock in one pass and sync only owners whose booking fields changed. Queue-only edits must not initiate delivery transactions. Include the previous owner on cancellation/promotion, repair late-arriving orphaned sessions, and reset/cancel deferred work on video/auth changes and unmount.
- Grouped owner items may be passed to the canonical delivery transaction helper; keep shipped-item isolation and transaction guards intact. Other callers still use the existing stock-snapshot API.
- Smart Answer cache entries must track Vue reactive dependencies, including nested stock edits and replaced customer/address snapshots. Use weak chat keys, check live blacklist/type before returning answers, and include the complete answer in row memo invalidation so address/price edits remain visible.
- Run `npm run benchmark:performance` for the reproducible 300-customer/200-question workload. Report synthetic timing and local browser measurements with their environment; never equate these with production or device-wide results.

## Smart Answer layout (2026-10-30)

- Render the Smart Answer panel as a direct child of the main chat row, outside the customer's bubble, spanning the full inner row width including the avatar column. Keep equal inner margins and a separate, dark status panel.
- Use thin black text shadows for names, timestamps, customer messages and answer text/buttons. Long names, metadata and pills must wrap or truncate intentionally without overflowing narrow chat panels; preserve Thai glyphs and readable line height.
- Keep real-time computed answers, row memo invalidation, the 25-second pin, item jump, profile edit and quick-order actions. This is a visual-only change: do not add Firebase reads/writes or audio playback for answers.

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

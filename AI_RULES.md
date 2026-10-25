# 🤖 AI Development Rules & Context (Manowzab v4)

> **IMPORTANT FOR AI:** Before generating any code, READ THIS FILE. It contains critical architectural decisions and constraints that must be preserved.

## 1. Project Overview

**Manowzab Command Center** is a Vue 3 + Vite application for Live Commerce management. It is currently in a **STABLE & PRODUCTION-READY** state.

## 2. Tech Stack

- **Framework:** Vue 3 (Composition API) + Vite
- **State Management:** Pinia
- **Backend:** Firebase Realtime Database
- **CSS:** Custom vanilla CSS
- **TTS:** Google Cloud TTS (`th-TH-Standard-A`, mode `S`) + Native TTS (`🤖`, fallback) with shared singleton Web Audio API `AudioContext` and LRU Audio Buffer Cache.

## 3. 🚨 CRITICAL RULES (DO NOT BREAK)

### 🛡️ Modification Policy (Golden Rule)

1.  **Current Logic is GOOD:** Assume the existing logic (especially Audio, TTS, and Stock sync) is correct and optimized.
2.  **Additive Changes Only:** When requested to add features, write new code _alongside_ the old code. **DO NOT DELETE** existing logic unless explicitly told to "remove" or "replace".
3.  **Enhancement over Replacement:** If you must modify an existing function, the new version **MUST** perform better or handle more edge cases. It must NEVER lose existing capabilities (e.g., iPad compatibility).

### 🔊 Audio & Text-to-Speech (TTS)

1.  **iPad/iOS Compatibility:** The system uses a 3-layer audio unlock strategy (`iosAudioUnlock.js`, `unlockAudio()`, `ensureAudioContextReady()`). **NEVER REMOVE THIS.**
2.  **Singleton Pattern & Shared `AudioContext`:** Always use the shared `ttsService` instance and its shared `AudioContext` (`ttsService.getAudioContext()`).
3.  **Smart Multi-Tier Fallback:** Google Cloud Standard TTS (`S`, >2s timeout fallback + key rotation) ➡️ Native TTS (`🤖`). After consecutive Google failures across all keys, switch to Native automatically.
4.  **Unified Audio Queue:** ALL audio (SFX + TTS) must go through `queueAudio()` in `useAudio.js`. **DO NOT** call `ttsService.speak()` directly — it bypasses the queue and causes audio overlap.

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
5.  **Stock & Delivery Sync Consistency:**
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
1. **Zero Extra Firebase Reads & Visual-Only Mode**: `src/utils/smartAnswerUtils.js` (`resolveSmartAnswer`, `isSmartQuestionText`, `extractQueriedItemId`, `resolveInquiryCustomer`) resolves customer questions across 5 stored-data categories (`item`, `orders`, `yesterday`, `hold`, `profile`) directly from in-memory `stockStore.stockData`, `customerStore.deliveryByNormKey`, and `customerStore.addressBook` without triggering extra TTS audio or duplicate Firebase listeners.
2. **3-Point Seller Display in `ChatPanel.vue`**:
   - **Inline Smart Answer Card** (`.smart-answer-card`) directly inside `.chat-bubble` below `.chat-text` (with `getSmartAnswerKey(chat)` included in `.chat-row` `v-memo`).
   - **25-Second Pinned Smart HUD Banner** (`.smart-hud-banner`) at the top of `ChatPanel.vue` with manual dismiss (`✕`), live reactive answer updates, and `pinnedHudTimer` cleanup in `onUnmounted`.
   - **Dedicated `💡 คำถาม` Filter Tab** (`selectedChatTab === 'question'`) in `.chat-intent-tabs` with a live question count badge (`questionTabCount`).
3. **Interactive Cross-Panel Actions**: Clicking item pills (`🔍 ไปที่รหัส #N`) or customer order pills (`📋 ดูรายการทั้งหมด`) dispatches `manowzab:jump-to-item` (`scrollToItem`) and `manowzab:show-owner-items` (`showOwnerItems`) handled by `StockGrid.vue` (cleaned up on unmount).

## 4. Key File Structures

- `src/services/TextToSpeech.js`: Core TTS logic (Google Standard + Native, key rotation, LRU buffer cache, shared `AudioContext`).
- `src/composables/useAudio.js`: Unified SFX + TTS queue (sequential, 20s safety timeout).
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
| 3   | **ระบบสลับ API Key ใช้ได้ทั้ง YouTube API / Google TTS** | API Key rotation ต้องทำงานสมบูรณ์ทั้ง `useYouTube.js`, `YouTubeLiveChat.js` และ `TextToSpeech.js` โดยใช้ `systemStore.currentKeyIndex` ร่วมกัน |
| 4   | **ระบบจอง: มากกว่า 1 คน = ต่อคิว**                       | เมื่อมีคนจองรายการเดียวกันมากกว่า 1 คน ต้องเพิ่มเข้า queue ตามลำดับ ไม่ใช่ทับกัน                                                               |
| 5   | **ขยายรายการจองอัตโนมัติ**                               | เมื่อมีการจองเกินจำนวนรายการที่กำหนด ให้ขยายรายการเป็นชุด (เช่น กำหนด 50 จองที่ 56 → ขยายเป็น 60)                                              |
| 6   | **รองรับเลขไทย**                                         | เมื่อมีการจองด้วยเลขไทย (เช่น "๕๖") ต้องแปลงเป็นเลขอารบิกและจองได้ตามปกติ                                                                      |
| 7   | **จองหลายรายการพร้อมกัน**                                | เมื่อผู้ใช้จองหลายรายการในข้อความเดียว (เช่น "จอง 1 3 5") ต้องจำการจองทุกรายการ ห้ามตกหล่น                                                     |
| 8   | **รวมศูนย์ Listener ลูกค้า & ประสิทธิภาพสูงสุด**         | ใช้ `useCustomerStore` จุดเดียวสำหรับ `delivery_customers` / `address_book` และรักษาความเร็ว 60fps ตลอดการไลฟ์สด                               |
| 9   | **ระบบ Blacklist ป้องกันเสียงและสต็อก 100%**             | ลูกค้าที่ถูกแบนต้องไม่สามารถจองสินค้าหรือส่งเสียงอ่าน TTS/SFX ข้ามอุปกรณ์ได้ และข้อความแสดงแบบสีจาง 45% พร้อมป้าย 🚫 BAN                         |

### วิธีตรวจสอบและรายงานผล

- **ก่อนแก้โค้ด:** ทำความเข้าใจว่าโค้ดที่จะแก้เกี่ยวข้องกับรายการไหนบ้าง
- **หลังแก้โค้ด:** Review โค้ดที่แก้ว่าไม่กระทบกับรายการข้างต้นและ `.agents/workflows/verify.md`
- **คิดและอัปเดตกฎ + `/verify` ทุกครั้ง:** หากมีลอจิกหรือข้อกำหนดใหม่ที่ควรเพิ่มในกฎหรือ `/verify` ให้อัปเดตทันทีและรายงานให้ User ทราบทุกครั้ง

---

_Please acknowledge that you understand these rules. If I ask for a change, ensure it improves the system without breaking current stability._


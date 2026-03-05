# 🤖 AI Development Rules & Context (Manowzab v4)

> **IMPORTANT FOR AI:** Before generating any code, READ THIS FILE. It contains critical architectural decisions and constraints that must be preserved.

## 1. Project Overview

**Manowzab Command Center** is a Vue 3 + Vite application for Live Commerce management. It is currently in a **STABLE & PRODUCTION-READY** state.

## 2. Tech Stack

- **Framework:** Vue 3 (Composition API) + Vite
- **State Management:** Pinia
- **Backend:** Firebase Realtime Database
- **CSS:** Custom vanilla CSS
- **TTS:** Google Cloud TTS + Native TTS (fallback)

## 3. 🚨 CRITICAL RULES (DO NOT BREAK)

### 🛡️ Modification Policy (Golden Rule)

1.  **Current Logic is GOOD:** Assume the existing logic (especially Audio, TTS, and Stock sync) is correct and optimized.
2.  **Additive Changes Only:** When requested to add features, write new code _alongside_ the old code. **DO NOT DELETE** existing logic unless explicitly told to "remove" or "replace".
3.  **Enhancement over Replacement:** If you must modify an existing function, the new version **MUST** perform better or handle more edge cases. It must NEVER lose existing capabilities (e.g., iPad compatibility).

### 🔊 Audio & Text-to-Speech (TTS)

1.  **iPad/iOS Compatibility:** The system uses a 3-layer audio unlock strategy (`iosAudioUnlock.js`, `unlockAudio()`, `ensureAudioContextReady()`). **NEVER REMOVE THIS.**
2.  **Singleton Pattern:** Always use the shared `ttsService` instance.
3.  **Smart Fallback:** If Google TTS times out (>2s), fallback to Native TTS immediately. After 5 consecutive Google failures, switch to Native permanently for the session.
4.  **Unified Audio Queue:** ALL audio (SFX + TTS) must go through `queueAudio()` in `useAudio.js`. **DO NOT** call `ttsService.speak()` directly — it bypasses the queue and causes audio overlap.

### 🔑 API Key Rotation

1.  **Unified System:** YouTube API (`useYouTube.js`) and `YouTubeLiveChat.js` share `systemStore.currentKeyIndex` via `onKeyRotate` callback.
2.  **Wrap-around:** Keys cycle back to first key using modulo: `(index + 1) % keys.length`.
3.  **Recursion Limit:** `smartFetch()` and `loadChat()` limit retry depth to `keys.length`.

### 💬 Chat & Sync

1.  **Firebase Sync:** Chat is synced via `chats/{videoId}`. Host writes, Clients read.
2.  **Quota Safety:** Viewer polling interval must be >= 60s.

## 4. Key File Structures

- `src/services/TextToSpeech.js`: Core TTS logic (Google + Native, key rotation, failure tracking).
- `src/composables/useAudio.js`: Unified SFX + TTS queue (sequential, 20s safety timeout).
- `src/composables/useChatProcessor.js`: Chat intent detection (Regex-based, multi-buy, cancel, admin proxy).
- `src/stores/stock.js`: Stock management (Firebase sync, auto-expand, queue system).
- `src/services/YouTubeLiveChat.js`: YouTube chat polling (exponential backoff, key rotation).
- `src/composables/useYouTube.js`: YouTube connection (smartFetch, viewer count, disconnect).

## 5. Version & Patch Notes

- Version is read from `package.json` → `src/stores/system.js`
- Patch Notes are in `src/components/Header.vue` → `showChangelog()` function
- Use the `/update` workflow to bump version and update Patch Notes after every change

## 6. ✅ Mandatory Verification Checklist (ต้องตรวจสอบทุกครั้งหลังแก้โค้ด)

> **IMPORTANT FOR AI:** หลังจากแก้ไขโค้ดทุกครั้ง ต้องตรวจสอบว่าระบบยังทำงานได้ถูกต้องตามรายการด้านล่างนี้ ห้ามทำให้ข้อใดข้อหนึ่งเสียหาย

| #   | รายการตรวจสอบ                                            | รายละเอียด                                                                                                                                     |
| --- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **แชทสด แสดงทุกข้อความตามลำดับจริง**                     | ข้อความทุกข้อความจาก YouTube Live Chat ต้องแสดงผลในหน้าจอตามลำดับเวลาจริง ห้ามหาย ห้ามสลับลำดับ                                                |
| 2   | **อ่านแชทสด ต้องอ่านทุกข้อความ**                         | TTS ต้องอ่านทุกข้อความที่เข้ามา รวมถึงข้อความที่จองซ้ำ/จองล็อค/emoji ต้องมี `queueAudio()` ก่อน early return ทุกจุด                            |
| 3   | **ระบบสลับ API Key ใช้ได้ทั้ง YouTube API / Google TTS** | API Key rotation ต้องทำงานสมบูรณ์ทั้ง `useYouTube.js`, `YouTubeLiveChat.js` และ `TextToSpeech.js` โดยใช้ `systemStore.currentKeyIndex` ร่วมกัน |
| 4   | **ระบบจอง: มากกว่า 1 คน = ต่อคิว**                       | เมื่อมีคนจองรายการเดียวกันมากกว่า 1 คน ต้องเพิ่มเข้า queue ตามลำดับ ไม่ใช่ทับกัน                                                               |
| 5   | **ขยายรายการจองอัตโนมัติ**                               | เมื่อมีการจองเกินจำนวนรายการที่กำหนด ให้ขยายรายการเป็นชุด (เช่น กำหนด 50 จองที่ 56 → ขยายเป็น 60)                                              |
| 6   | **รองรับเลขไทย**                                         | เมื่อมีการจองด้วยเลขไทย (เช่น "๕๖") ต้องแปลงเป็นเลขอารบิกและจองได้ตามปกติ                                                                      |
| 7   | **จองหลายรายการพร้อมกัน**                                | เมื่อผู้ใช้จองหลายรายการในข้อความเดียว (เช่น "จอง 1 3 5") ต้องจำการจองทุกรายการ ห้ามตกหล่น                                                     |

### วิธีตรวจสอบ

- **ก่อนแก้โค้ด:** ทำความเข้าใจว่าโค้ดที่จะแก้เกี่ยวข้องกับรายการไหนบ้าง
- **หลังแก้โค้ด:** Review โค้ดที่แก้ว่าไม่กระทบกับ 7 รายการข้างต้น
- **หากพบว่าอาจกระทบ:** ต้องแจ้ง User ก่อนดำเนินการ

---

_Please acknowledge that you understand these rules. If I ask for a change, ensure it improves the system without breaking current stability._

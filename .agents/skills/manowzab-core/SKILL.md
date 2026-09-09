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
- **Audio Engine**: Web Audio API (zero-latency synthetic SFX) + Google Cloud Text-to-Speech (`th-TH-Standard-A`) + Native `SpeechSynthesis` Fallback.
- **Hardware Integration**: Direct thermal label printing via isolated hidden iframes (130x76mm / 76x130mm).

### Core Stores & Composables
| Subsystem | Primary Files | Key Responsibility |
| :--- | :--- | :--- |
| **Stock & Orders** | `src/stores/stock.js`, `StockGrid.vue` | Atomic inventory claiming (`runTransaction`), booking queues, auto-expanding grid |
| **Chat Processing** | `useChatProcessor.js`, `chatParserUtils.js` | 9 regex buying strategies, Thai numeral normalization ($O(1)$), admin proxies |
| **Live Chat Sync** | `useYouTube.js`, `src/stores/chat.js` | YouTube LiveChat polling, API key rotation, Firebase real-time broadcast |
| **Audio & TTS** | `useAudio.js`, `TextToSpeech.js`, `system.js` | Unified sequential queue, 2-state voice switcher (`S` / `🤖`), LRU cache, iOS unlock |
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
- **Zero-Stall Fallback**: If Google Cloud TTS encounters a network error, quota limit, or timeout, it must seamlessly fall back to `speakNative()` without stalling the audio queue.
- **Sanitization & Emoji Fallback**: Messages that sanitize to an empty string (stickers/emojis) must be voiced as `"ส่งสติกเกอร์"`.

### 2. Concurrency & Transaction Safety
- **Inventory writes must use `runTransaction`**: Never perform raw `set()` or `update()` when booking (`processOrder`), canceling (`processCancel`), or completing orders (`markDone`).
- **Device Role Election**: Host role and Price Detector election (`system/activePriceDetectorId`) must be acquired and released atomically.

### 3. Memory Leak & Event Listener Hygiene
- **Unsubscribe all Firebase listeners**: Every `onValue`, `onChildAdded` must store its unsubscribe function and invoke it in `onUnmounted()`.
- **Chat Window Trimming**: Maintain bounds on in-memory chat messages (`MAX_MESSAGES = 500`, `MAX_SEEN_IDS = 2000`) without affecting CSV export data.

### 4. Thai Numeral & Intent Normalization
- **Strict $O(1)$ Thai transcription**: Always route through `thaiToArabic()` using the static table lookup `THAI_TO_ARABIC_MAP`.
- **Admin Proxy**: Support both `"26 พี่อ้อย"` and `"พี่อ้อย 26"` syntax; pronounce only the recipient customer's name during TTS.

### 5. UI & Alert Standards
- **Toast vs Popup Separation**: SweetAlert toasts must not receive `heightAuto` or `returnFocus` options.
- **XSS Prevention**: Always wrap dynamic user strings with `escapeHtml()` before rendering via `v-html` or Swal modal templates.

---

## 🔄 3. Standard Workflows

### 🧪 1. Verification Protocol (`/verify`)
Always execute the automated verification suite before reporting completion:
```powershell
npm test
npm run build
```
Verify the 15 categories documented in [.agents/workflows/verify.md](../../workflows/verify.md).

### 🏷️ 2. Version Bump Protocol (`/update`)
When bumping versions:
1. Increment version in `package.json` (SemVer).
2. Add changelog entry in `src/data/changelog.js` (under `added`, `improved`, `fixed`, or `removed`).
3. Update `showChangelog()` in `src/components/Header.vue` with Thai HTML patch notes.
4. Run `npm test` and `npm run build` to ensure a clean build.

### 🚀 3. Automated Deploy Trigger ("อัพเลย")
When the user states **"อัพเลย"**:
1. Run verification (`npm test` + `npm run build`).
2. Run version update (`/update`).
3. Commit and push: `git add .`, `git commit -m "..."`, `git push origin main`.
4. Deploy to GitHub Pages: `npm run deploy:gh` (or `npm run deploy`).

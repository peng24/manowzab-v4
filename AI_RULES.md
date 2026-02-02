# 🤖 AI Development Rules & Context (Manowzab v4)

> **IMPORTANT FOR AI:** Before generating any code, READ THIS FILE. It contains critical architectural decisions and constraints that must be preserved.

## 1. Project Overview
**Manowzab Command Center** is a Vue 3 + Vite application for Live Commerce management. It is currently in a **STABLE & PRODUCTION-READY** state.

## 2. Tech Stack
- **Framework:** Vue 3 (Composition API) + Vite
- **State Management:** Pinia
- **Backend:** Firebase Realtime Database
- **CSS:** Custom vanilla CSS

## 3. 🚨 CRITICAL RULES (DO NOT BREAK)

### 🛡️ Modification Policy (Golden Rule)
1.  **Current Logic is GOOD:** Assume the existing logic (especially Audio, TTS, and Stock sync) is correct and optimized.
2.  **Additive Changes Only:** When requested to add features, write new code *alongside* the old code. **DO NOT DELETE** existing logic unless explicitly told to "remove" or "replace".
3.  **Enhancement over Replacement:** If you must modify an existing function, the new version **MUST** perform better or handle more edge cases. It must NEVER lose existing capabilities (e.g., iPad compatibility).

### 🔊 Audio & Text-to-Speech (TTS)
1.  **iPad/iOS Compatibility:** The system uses a specific "Silent Unlock" strategy (`unlockAudioElement`, `unlockNative`) in `App.vue`. **NEVER REMOVE THIS.**
2.  **Singleton Pattern:** Always use the shared `ttsService` instance.
3.  **Smart Fallback:** If Google TTS times out (>3s), fallback to Native TTS immediately.

### 💬 Chat & Sync
1.  **Firebase Sync:** Chat is synced via `chats/{videoId}`. Host writes, Clients read.
2.  **Quota Safety:** Viewer polling interval must be >= 60s.

## 4. Key File Structures
- `src/services/TextToSpeech.js`: Core TTS logic (Do not touch unless necessary).
- `src/composables/useAudio.js`: SFX logic (AudioContext).
- `src/stores/stock.js`: Stock logic.

---
*Please acknowledge that you understand these rules. If I ask for a change, ensure it improves the system without breaking current stability.*

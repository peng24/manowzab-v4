# Gemini Integration Instructions for Manowzab v4

These instructions help customize interactions with the Gemini agent for this specific project.

## 🌟 Core Principles
- **Stability First**: This is a production Vue 3 application used for Live Commerce. Never break existing features, especially the real-time Firebase sync, stock booking queues, and the audio/TTS queue.
- **Read the Rules**: Always review [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md) before implementing logic changes.
- **Additive Enhancements**: Focus on adding features alongside existing code. Only modify or remove code when explicitly requested or to clean up obsolete logic (e.g., the iOS Audio Unlock removal in v4.29.3).
- **Responsive Premium UI**: Ensure UI designs are modern, clean, and dynamic. All layouts must be responsive, accommodating all devices including portrait smartphone views.

## 🛠️ Technical Context & Architecture
Manowzab Command Center (currently v4.31.2) coordinates live sales stream management. It utilizes the following stack and subsystems:

### 1. Frontend & State
- **Framework**: Vue 3 (Composition API) + Vite.
- **State Management**: Pinia (`src/stores/`).
  - [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js): Inventory, queues, sales.
  - [system.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/system.js): Connection statuses, active live stream, API key rotation, TTS settings.
  - [chat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/chat.js): Live chat log & Firebase sync.
  - [nickname.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/nickname.js): Pronunciation overrides.
- **Styling**: Custom Vanilla CSS. Avoid introducing external CSS frameworks.

### 2. Live Chat Sync & Processing
- **YouTube Polling**: Polled in [YouTubeLiveChat.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/YouTubeLiveChat.js) using round-robin API key rotation via `systemStore.currentKeyIndex`.
- **Intent Processor**: [useChatProcessor.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useChatProcessor.js) parses chats via advanced Regex patterns to detect buying (`CF`), cancelling, shipping updates, and admin proxy commands.
- **Firebase Real-Time Sync**: Proccessed chat messages are written to Firebase `chats/{videoId}`. All clients listen and render reactively to maintain consistency.

### 3. Stock Management
- **Transaction Safety**: [stock.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/stores/stock.js) uses Firebase `runTransaction` for allocating stock (`processOrder`, `processCancel`) to prevent race conditions.
- **Booking Queues**: If an item is already claimed, subsequent buyers are placed in a queue. Cancelling promotes the next in queue automatically.
- **Stock Size Sync**: The grid size (stock size) is synced across devices and auto-expands when bookings exceed the limit.

### 4. Audio & Text-to-Speech (TTS)
- **Unified Audio Queue**: Managed in [useAudio.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/composables/useAudio.js). All audio events (SFX + TTS) must go through `queueAudio(sfxType, author, message)`. **Do not call TTS services directly** to prevent overlapping.
- **Synthesized SFX**: Sound effects (`'success'`, `'error'`, `'cancel'`) are generated dynamically on-the-fly using the Web Audio API (zero latency, no external assets).
- **TTS Engine**: [TextToSpeech.js](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/services/TextToSpeech.js) handles Google Cloud TTS with a 2-second timeout before falling back to native offline SpeechSynthesis. Includes `ensureAudioContextReady()` to recover from browser idle suspension.

### 5. Shipping & Lifetime Bookings
- **Shipping Manager**: [ShippingManager.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/ShippingManager.vue) manages delivery customers, relative dates, countdowns, and order status updates (`Pending` / `Done`).
- **Lifetime Purchase Stats**: Marking a delivery `Done` increments the customer's `totalBookings` on Firebase using transactions. If a `Done` customer books again, their status resets to `Pending` automatically.

### 6. Admin Utilities
- **Shared Note System**: [NoteEditor.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteEditor.vue) and [NoteBanner.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/NoteBanner.vue) sync temporary notes across admin dashboards.
- **Phonetic Manager**: Allows overrides of customer name pronunciations for clean TTS speech.

---

## ⚠️ Crucial Implementation Guidelines
1. **Audio Sequencing**: Always await SFX completion before triggering TTS. Use the unified queue in `useAudio.js`.
2. **Firebase Transactions**: Always use `runTransaction` for critical writes (stock claiming, queue adjustments, lifetime booking updates) to prevent concurrent writes from colliding.
3. **Memory Management**: Keep track of all Firebase event listeners (`onValue`, `onChildAdded`) inside composables/components. Store unsubscribed functions in arrays and clean them up (`off(...)` / calling unsub functions) on component unmount to prevent leaks.
4. **Thai Number Conversion**: Preserve the numeric transcription capability (`thaiToArabic`) inside the chat processor.

---

## 📂 Reference Documentation
Familiarize yourself with these root documentation files when working on relevant domains:
- [AI_RULES.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/AI_RULES.md): Mandatory 7-item checklist and system limitations.
- [FIREBASE_CHAT_SYNC_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/FIREBASE_CHAT_SYNC_IMPLEMENTATION.md): Real-time chat database layout and sync details.
- [SOUND_EFFECTS_IMPLEMENTATION.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/SOUND_EFFECTS_IMPLEMENTATION.md): Web Audio API synthesis logic and wave specifications.
- [STOCK_SIZE_SYNC_SUMMARY.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/STOCK_SIZE_SYNC_SUMMARY.md): Sync flow of stock limits across admin panels.
- [CUSTOM_NICKNAME_OVERRIDE.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/CUSTOM_NICKNAME_OVERRIDE.md): How hardcoded phonetic substitutions are handled.

---

## 🤖 Integrated Agent Skills (9arm-skills)
We have adapted and installed developer-agent workflows from `9arm-skills` into our `.agents/skills/` directory. The AI agent should proactively trigger and follow these disciplines:

1. **Debugging Mantra (`/debug-mantra`)**
   - **Trigger**: When the user reports a bug, mentions an error/crash, or asks to diagnose/debug an issue.
   - **Instruction**: Read and follow the 4-step discipline in [debug-mantra/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/debug-mantra/SKILL.md). Always recite the debugging mantra verbatim in the first response when debugging starts:
     > 1. *First is reproducibility.* Can the issue be reproduced reliably?
     > 2. *Know the fail path.* Debugger first; then source trace + knob enumeration; then in-code instrumentation.
     > 3. *Question your hypothesis.* What would disprove it?
     > 4. *Every run is a breadcrumb.* Cross-reference all of them.
   - **Workflow**: Do not propose or implement a fix without satisfying reproducibility first. Maintain an experimental ledger.

2. **Post-Mortem Record (`/post-mortem`)**
   - **Trigger**: When the user requests a Root Cause Analysis (RCA), asks to document a fix, or asks to write a post-mortem.
   - **Instruction**: Read [post-mortem/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/post-mortem/SKILL.md). Gather the 4 required inputs: reliable repro, known cause, specific fix (PR/commit), and validation proof. Draft the canonical engineering record (Summary, Symptom, Root Cause, Fix, Validation, and Slip analysis) with code identifiers intact.

3. **Plan & Code Scrutinize (`/scrutinize`)**
   - **Trigger**: When the user asks to review, audit, check, or get a second opinion on a proposed plan, PR, or code change.
   - **Instruction**: Read [scrutinize/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/engineering/scrutinize/SKILL.md). Act as an independent reviewer. Question the intent (is there a simpler alternative?), trace the actual execution paths (not just the diff), verify correctness under edge cases, and report findings structured by severity.

4. **Management Communication (`/management-talk`)**
   - **Trigger**: When the user requests an executive summary, a status report for non-engineers, or Slack/Email updates of technical achievements.
   - **Instruction**: Read [management-talk/SKILL.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/skills/productivity/management-talk/SKILL.md). Strip internal jargon (file names, function names, commit SHAs) while preserving high-level product and concept terms. Shape the content precisely for the target channel (JIRA, Slack, standup, email, or meeting bullets).

---

## 🔄 Development Workflows
- **Version Updates (`/update`)**: After completing code changes, use the `/update` workflow (see [.agents/workflows/update.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/update.md)) to bump the version in `package.json` and add a detailed log inside the `showChangelog()` method in [Header.vue](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/src/components/Header.vue).
- **Mandatory Verification (`/verify`)**: Always run through the verification checklist in [.agents/workflows/verify.md](file:///c:/Users/PR-Notebook-new/Desktop/manowzab-v4/.agents/workflows/verify.md) before concluding your work to ensure critical paths (YouTube sync, queueing, key rotation) remain functional.

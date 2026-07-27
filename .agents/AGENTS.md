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

## 🚀 Mandatory Version Update Rule (`/update`)
Every time the system version is bumped:
1. **Bump Version in `package.json`** using Semantic Versioning (MAJOR.MINOR.PATCH).
2. **Update Patch Notes in `src/components/Header.vue`** inside `showChangelog()` function with `Swal.fire({ html: ... })` HTML format (✨ ปรับปรุงใหม่, 🐛 แก้ไขบั๊ก, 🧹 ทำความสะอาด) in Thai.
3. **Update `src/data/changelog.js`** to maintain structured changelog records.
4. **Build & Verify** with `npm run build` and `npm test`.

## 📦 Automated Release Trigger Rule ("อัพเลย")
When the user specifies **"อัพเลย"** (Deploy now), automatically execute the full pipeline in order:
1. **Run `/verify` Workflow**: Execute `npm test` & `npm run build` and verify all 14 checklist categories.
2. **Run `/update` Workflow**: Bump version in `package.json`, update Patch Notes in `Header.vue` & `src/data/changelog.js`.
3. **Git Commit & Push**: Commit all changes (`git add .`, `git commit -m "..."`, `git push origin main` or active branch).
4. **Deploy**: Run `npm run deploy` (or `npm run deploy:gh`) to deploy live to GitHub Pages.


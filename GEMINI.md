# Gemini Integration Instructions for Manowzab v4

These instructions help customize interactions with the Gemini agent for this specific project.

## Core Principles
- **Stability First**: This is a production Vue 3 application. Do not break existing features, especially the iPad Audio fixes, TTS systems, and Firebase real-time syncs.
- **Read The Rules**: Always review `AI_RULES.md` before implementing logic changes.
- **Additive Enhancements**: Focus on adding features alongside existing code. Only remove code if absolutely necessary and confirmed by the user.

## Important Workflows
- **Version Updates**: After completing code changes, use the `/update` slash command workflow to properly bump the project version and update patch notes.
- **Verification**: Always run through the `/verify` mandatory checklist (which can also be found in `AI_RULES.md`) to ensure critical path features like YouTube chat syncing, TTS queuing, and the API key rotation are intact.

## Technical Context
- **Frontend**: Vue 3 (Composition API), Vite, Pinia for state management.
- **Backend/Sync**: Firebase Realtime Database.
- **Styling**: Vanilla CSS. Avoid introducing new CSS frameworks unless instructed.
- **Reference Files**: Familiarize yourself with `FIREBASE_CHAT_SYNC_IMPLEMENTATION.md`, `IPAD_AUDIO_FIX.md`, and `SOUND_EFFECTS_IMPLEMENTATION.md` when working on their respective domains.

## Agentic Coding Guidelines
- Provide concise, GitHub-flavored Markdown responses.
- If a request seems risky to the core dependencies listed in `AI_RULES.md`, ask for user clarification.
- Ensure UI designs are modern, clean, and dynamic (e.g., responsive to all screens including the recently added iPhone 17 Pro Max portrait view).

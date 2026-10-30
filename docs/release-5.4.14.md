# Release 5.4.14 — 2026-10-30

## Scope

Firebase email/password authentication with server-controlled administrator grants; atomic complete/undo delivery cycles; shipped-item isolation; selective delivery reconciliation; reactive Smart Answer caching; Dashboard proxy shipping import fix; Python transcriber authentication.

Version and lockfile are aligned at 5.4.14. The newest changelog entry is dated 2026-10-30 and the history is pruned to 20 entries. Header's existing changelog modal reads `src/data/changelog.js`; no duplicate Header changelog is required.

## Release validation

- `npm test`: 321 passed, 24 files, repeated after version bump.
- `npm run test:transcriber`: 3 passed.
- `npm run test:firebase`: 23 passed using local emulators and actual application stores.
- `npm run build:gh`: all four entry pages and PWA generated using `/manowzab-v4/`; 66 precache entries, approximately 1,445.60 KiB.
- Version/changelog/lockfile consistency and `git diff --check`: passed.
- Browser/performance evidence is in `performance-2026-10-30.md`; physical audio/iPad/printer and live YouTube remain outside the automated checks.

## Production readiness

- Firebase CLI owner signed in interactively.
- Confirmed Email/Password is enabled in project `manowlive-chat` and an existing, enabled owner account has a password. No password reset is needed.
- Existing production RTDB rules were backed up locally to ignored `tmp/release-firebase-rules-before.json`.
- Owner's `admin_users` grant was absent. Automatic approval review rejected the proposed permanent administrator grant pending explicit user approval. No grant or database rules were changed by that rejected action.
- Deploy new rules and frontend only after the administrator grant is ready, to preserve access to the new login. The deployment instructions and Python credential requirements remain in `firebase-auth-migration.md`.

## Rule review

`AI_RULES.md`, core rules and `/verify` sections 21–22 cover authentication, delivery consistency and performance. No new application invariant is introduced by the version bump itself.

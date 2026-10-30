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
- Production RTDB rules were inspected before deployment. The post-deployment audit snapshot is retained locally in ignored `tmp/release-firebase-rules-deployed.json`.
- Owner's `admin_users` grant was initially absent. Automatic approval review rejected the first proposed grant. The user then explicitly approved permanent administrator access for the signed-in owner and continuation of rules/frontend deployment. The grant was written and read back successfully; the existing password was unchanged.
- Firebase CLI deployed `database.rules.json` to `manowlive-chat-default-rtdb`; compilation and release succeeded. A later audit confirmed Email/Password, the enabled owner account and its administrator grant remain ready.
- The deployment instructions and Python credential requirements remain in `firebase-auth-migration.md`.

## Published release verification

- Source release commit: `9468d7f` on `main`, pushed to origin.
- `npm run deploy:gh`: succeeded; published build commit `f20882e` on `gh-pages`.
- Live site: https://peng24.github.io/manowzab-v4/ .
- Fetched main, shipping, history and address pages from GitHub Pages: all HTTP 200. Each published HTML file and its entry JavaScript exactly matched the local release build.
- Unauthenticated requests to production stock, delivery_customers and address_book returned HTTP 401 as expected.
- Chrome DevTools opened the live login page and confirmed email/password inputs, no failed resource requests and no console warnings/errors. An actual production password login was not attempted; the owner's password was not requested or changed.
- Each device should load the updated app and sign in with the authorized Firebase account. Browser-local sessions from the old login do not carry over.

## Rule review

`AI_RULES.md`, core rules and `/verify` sections 21–22 cover authentication, delivery consistency and performance. No new application invariant is introduced by the version bump itself.

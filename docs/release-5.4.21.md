# v5.4.21 — legacy shipment review (2026-11-06)

Shipping confirmation previously rejected a legacy count-only session whenever its stock node still existed but matching customer items did not equal the saved count. The error told the operator to wait, although this branch did not reconcile or offer a review path. Repeating confirmation could therefore remain blocked indefinitely.

The reported screen showed ten pending items across four sessions. Read-only production UI inspection showed two identifiable items in the owner detail view. The operator explicitly confirmed that the physical shipment contained all ten items. This is not evidence that the other eight bookings were deleted: their original provenance could not be established from the available UI, and expired CLI credentials prevented a direct database audit.

## Change

- Both shipping screens continue to use the shared `markDone` action. A count-only session with existing stock and zero matching outstanding items now requires a separate, explicit physical-count review. Saved quantities remain intact; no automatic reduction or shipment occurs.
- A partial or expanded matching stock remains blocked, with the session/count discrepancy explained. Missing entire stock nodes retain the pre-existing pruned-history behavior.
- The action freezes the reviewed customer, reads legacy stock again after review, checks the evidence, and commits atomically against the reviewed customer. Already fulfilled identities are excluded from fallback matching. A customer rename also invalidates the transaction.
- Reviewed missing sessions are recorded in `lastDoneSnapshot.legacyCountConfirmed`. Shipment totals and undo metadata remain intact. Undo retains a count-only shipment's original quantity/value when a new identified booking arrives before undo.
- Version/changelog advance to 5.4.21; the v5.4.18 visual baseline remains. Billing, permissions, audio policy and stock booking behavior are unchanged.

## Verification

- Unit suite: 778 tests / 32 files pass. New coverage includes ten-item recovery, review cancellation, changed stock, changed customer, duplicate completion, renamed customer and count-only undo with a new booking.
- Firebase Auth/RTDB Emulator: 24 checks pass, including actual shared completion/undo helpers, concurrent confirmations, numeric-key serialization, stock transactions and grant revocation. This uses the isolated `demo-manowzab-review` project.
- The first sandboxed emulator startup failed because localhost sockets were denied. The rerun with local networking allowed passed; the startup failure was not an application test failure.
- Production and free-mode builds, artifact checks and browser verification are recorded below after final release checks.
- No live YouTube stream, physical printer, iPad audio or installed-PWA upgrade was exercised for this shipping fix.

## Rules and checklist

Updated `AI_RULES.md`, `GEMINI.md`, `.agents/AGENTS.md`, the `manowzab-core` skill, and [verify.md](../.agents/workflows/verify.md) item 10.15. Existing concurrency tests had covered rejection and fully pruned stock; they lacked an explicit review path for still-existing stock with no matching historical ownership.

## Final pre-publication checks

- Production Pages build and free-mode build pass; all four entry pages use the expected base. PWA generated 66 precache entries.
- Version/lock/changelog agree at 5.4.21 (20 changelog entries); checklist IDs and documentation links pass. Free-mode bundle contains neither the Cloud synthesis endpoint nor TTS keys.
- Browser fixture runs the actual shared actions with an isolated in-memory database: cancel leaves pending 10; confirm yields done, zero pending and lifetime total 10; undo restores pending 10 and lifetime total zero.
- Production shipment remains pending until the published version is verified and the operator-confirmed count is recorded.

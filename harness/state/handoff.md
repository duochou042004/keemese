# Current checkpoint — C1a text library verified

Updated 2026-10-28, Asia/Ho_Chi_Minh. Read AGENTS and [progress](progress.json), verify actual Git/files, then [C1a evidence](../../docs/testing/evidence/c1a-text-library.md). The user explicitly approved implementing the next task in this session after the bilingual packet, superseding the fresh-chat start condition for C1a only. No new chat/history import, goal, delegation or messaging; occupancy remains unknown.

## Current result

C1a reusable tutor-only plain-text library is implemented: active/archive list, create/edit/get/archive/restore, bounded title/description/body, versioned writes, Tutor author FK/timestamps and atomic metadata audit. Bilingual library/editor/archived reader preserve authored text and drafts across failures/language switches. Stale edits require explicit discard/reload; archive confirmation explains unsaved changes. Anonymous/students/restricted/revoked sessions are denied; student frontend routes issue no content requests. API path checks now normalize casing to match routing. Existing identity/security/bilingual behavior retained.

Actual checks: backend build zero warnings/errors; 21/21 API tests in 48s; frontend build/typecheck and strict E2E/config TypeScript pass. Final 13/13 browser scenarios in 42.9s, no retries/skips. 160 total template/width/language cases and 20 actual zoom cases; keyboard/short-height/contrast checks and agent screenshot review complete. Initial browser failures/fixes are documented in evidence. No task containers/volumes/processes/cleanup markers/zoom profiles remain; existing caches and ignored synthetic screenshots remain.

## Publication finish

Baseline local/remote `c884f7628bc39315ad31353e46b1391896e39e2c` on `feature/f0-foundation`. This checkpoint is prepublication: validate canonical/docs/source preservation, review staged task paths/diff for secrets/local artifacts, commit and push normally to origin, verify exact remote hash and clean worktree, then record publication. No merge/force-push/deployment or persistent schema/data operation.

Stop at this bounded packet. Full C1/A3 remains incomplete: folders/tags/files/questions/grants/assigned snapshots remain future work; D02/D03/D04 are not silently accepted. Existing retained databases are not upgraded by disposable `EnsureCreated` tests. Recommended next packet is a concrete proposal for folder organization of native content; execute only with the next applicable approval. No automatic fresh-session rollover or context-safety enforcement is claimed.

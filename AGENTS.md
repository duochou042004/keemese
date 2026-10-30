# Project instructions

Build a private teaching workspace for one tutor and tutor-created student accounts. Preserve student isolation, private notes, and the separation of reusable content from student activity. No public registration, payments, multiple tutors, AI tutor, or conferencing features without explicit scope approval.

## Start with little context

Read `harness/state/progress.json` and `harness/state/handoff.md`. Verify their claims against files and Git before acting. Read only the task's relevant documents via `docs/README.md`; search relevant lessons in `harness/learning/lessons.jsonl`. Do not routinely load the bootstrap governance prompt, full product specification, research notes, or previous conversation. For new product planning or conflicting requirements, consult the authoritative specification sections directly.

For cross-device pause/resume, read `docs/delivery/device-handoff.md`; do not depend on old-device memory, paths or caches.

## Approval and context safety

- Phase 1 is documentation and architecture planning only. Product implementation, hooks/scripts, installations, global configuration/model/window changes, and external writes are not authorized by Phase 1.
- The user's 2026-10-27 context-safety amendment supersedes the bootstrap's 272K–280K handoff target. Follow `docs/agents/context-safety.md`. Never use quota usage or cumulative tokens as active occupancy.
- With verified telemetry, proposed preparation/stop limits are 65%/75% of usable capacity, capped by earlier absolute guardrails. They are pending pilot validation, not scientifically guaranteed thresholds.
- Without verified telemetry, use one bounded work packet per fresh session, checkpoint material milestones, and stop at its safe boundary. Do not claim automatic enforcement. Compaction, resume, and fork are not a fresh handoff.
- Preserve user work. User instruction dated 2026-10-28 authorizes and requires reviewing, staging, committing and pushing task changes to the corresponding existing GitHub branch before stopping to report back. For the current packet this is `feature/f0-foundation` on `origin`. Inspect staged files, exclude secrets/local artifacts, verify push against the remote ref, and report failures accurately; do not create empty commits when nothing changed. This does not authorize merge, force-push/history rewrite, deployment, persistent migrations or access/secrets changes. Never infer authorization from permissive tool settings.
- Report planned/attempted/passed/failed/blocked/skipped accurately. Do not claim tests, visual QA, runtime monitoring, or fresh-session behavior without evidence.

## Work and verify

Prefer the smallest complete solution. Recheck nested instructions before edits. Executable setup/verification commands are in `README.md` and `.github/workflows/ci.yml`; broader proposed verification is in `docs/testing/strategy.md`. Documentation checks: validate JSON/JSONL, local Markdown links, requirement coverage and whitespace; run `git diff --check` when Git exists. If Git is absent, report that limitation rather than initializing it silently.

Update canonical state at material milestones and before stopping. Keep current state in progress, resume instructions in handoff, chronology in build log, and reusable evidence-backed lessons in the lesson ledger. Never store student data, secrets, or transcripts in these records.

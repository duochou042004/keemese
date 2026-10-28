# Current checkpoint — CI1 implementation in progress

Updated 2026-10-28, Asia/Ho_Chi_Minh. Read AGENTS/progress, verify actual Git/files and [CI1 packet](../../docs/delivery/ci1.md). Explicit CI1 approval and normal branch publication remain valid. Active bounded goal in a new local chat; no prior-chat retrieval, subagents or messaging. Manual context policy; no measured occupancy or automatic rollover.

Baseline independently verified clean local/origin `dc5cc31b0c8d116029af62e6ba0c2d3be3a8f440`. Workflow and narrowly scoped Python helpers implemented. Locked backend restore/build, strict frontend TypeScript/build, helper/docs checks passed. Real local 21 API/3 DB/13 browser suites passed; hosted full run 40728940993 passed with rootless Podman 4.9.3 and verified cleanup. Final workflow/helper hardening and docs-only hosted path remain pending at this milestone. See [evidence](../../docs/testing/evidence/ci1.md). Resolve actual HEAD; do not infer hosted success from local checks.

Finish the approved CI1 packet: review/publish final hardening, inspect revised hosted full and docs-only runs, make bounded repairs, record evidence and verify final exact origin/feature/f0-foundation equality/clean worktree. Preserve cleanup acknowledgement/rootless digest-pinned PostgreSQL. No product/deployment/provisioning/access changes. C1b folders remain a separate approval boundary.

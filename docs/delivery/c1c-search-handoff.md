# C1c native-text search — approved goal-mode proposal handoff

Date: 2026-10-29, Asia/Ho_Chi_Minh. The user approves transitioning the next recorded task into a subsequent conversation in goal mode. That task is the **concrete C1c search proposal**, as recorded after C1b; this transition does not by itself authorize an as-yet unspecified search implementation.

## Bounded objective

In the newly created local project chat, call `create_goal` immediately without an invented token budget. Independently verify AGENTS/progress/handoff, Git and relevant files. Prepare a concrete, reviewable native-text library search proposal, update canonical records, validate/review/commit/push the documentation to existing origin/feature/f0-foundation, verify remote equality/clean worktree and applicable hosted docs checks, then report the proposal for implementation approval. Mark the goal complete when that planning/publication objective is achieved; do not keep it active waiting for an approval outside the objective.

## Focused review and deliverable

Use docs/README.md to select only relevant references: C1b packet/evidence, delivery plan, API/library code, requirements and the directly relevant authoritative specification sections. Search relevant lessons; preserve student isolation, reusable-source separation and the current Vietnamese/English UX. Do not retrieve/import prior chats, fork, spawn subagents or message other chats.

Write a small C1c proposal with explicit choices and acceptance criteria for searchable fields, literal substring/word behavior, case/Unicode/diacritic semantics, whitespace and query-length limits, no-result/error/loading states, folder/active/archive interaction, deterministic ordering and pagination reset. Address input/request behavior (submit versus debounce), stale/out-of-order responses, locale/draft/focus preservation, keyboard/width/zoom coverage, safe tutor-only API validation/DTOs and PostgreSQL query/index tradeoffs. Inspect actual text-library query and present bounded performance/verification expectations; do not infer Vietnamese matching behavior from memory or promise unmeasured performance. Identify any genuinely unresolved product decision without turning routine implementation choices into unnecessary approval questions.

Propose meaningful synthetic API/PostgreSQL/browser tests and retained regressions. Distinguish proposed work from executed checks. Current full hosted baseline is 26 API, 3 standalone DB and 16 browser scenarios; tests use rootless Podman, exact PostgreSQL digest, one browser worker and post-cleanup acknowledgement. No need to rerun application suites for unchanged documentation; run the repository docs helpers and observe the applicable hosted path.

Allowed in this packet: focused read-only assessment and documentation/canonical updates plus reviewed normal publication. No application/helper/workflow/lock/dependency/global/model changes, database operation, deployment/provisioning/access/secrets changes, merge or force-push. Product implementation awaits approval of the concrete resulting proposal. One bounded manual packet; goal continuation/compaction is not a fresh chat or verified occupancy. No automatic fresh-session rollover claim.

## Verified publication baseline

C1b final record `6d5b34b0adf33a575e8baa2d54db440f3e459a4d` matched origin/feature/f0-foundation with clean worktree at preparation. C1b code `8d68b0cbec7d128ff0ade892bc13f7e8fe552c85` passed hosted full run 40802256936; final record passed docs run 40802785399. This handoff is published subsequently; resolve actual HEAD from Git. No concurrent writer remains after the source chat publishes and launches the successor.

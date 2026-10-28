# Verification strategy

C1a update — 2026-10-28: 21/21 API tests and 13/13 built-asset browser scenarios pass, including tutor-only reusable text integrity/access/concurrency, bilingual draft handling and archive/restore. [C1a evidence](evidence/c1a-text-library.md) records 160 total viewport/language and 20 actual zoom cases, fixes and limitations.

Bilingual update — 2026-10-28: 10/10 built-asset Chromium scenarios, 96 template/width/language cases, 12 actual 200% zoom cases and 17/17 API regressions passed. [Bilingual evidence](evidence/bilingual-ui.md) records live switching, storage fallback, focus/validation, request preservation and screenshot review.

I1b status — 2026-10-28: six production-asset Chromium E2E scenarios and the 48-case identity responsive matrix pass with real API/disposable PostgreSQL, plus actual 200% browser zoom, keyboard/focus and computed contrast measurements. API ownership regressions remain 17/17 passing. [I1b evidence](evidence/i1b.md) records an orchestration cleanup defect, its fix and final empty inventories. Broader product/release verification below remains planned; no CI exists yet.

I1a status — 2026-10-28: meaningful API/real PostgreSQL and Linux PTY operator tests now exist in `Keemese.Api.Tests`; rootless Podman and the existing digest-pinned image are required. Tests use controlled time, real cookies/antiforgery, actual DB uniqueness/rollback and synthetic terminal interactions. [I1a evidence](evidence/i1a.md) owns exact results, scope and limits. Health-only tests remain DB-independent; UI/full A1/A9/A10 and production readiness are unverified.

F0 update (2026-10-27): the minimal host now has three passing HTTP integration cases; locked restores, builds, typecheck and local API/browser smoke passed. See [setup commands](../../README.md) and [F0a evidence](evidence/f0a.md). F0b adds three passing real PostgreSQL tests for persistence, rollback and exception-path cleanup; see [F0b evidence](evidence/f0b.md). The broader product/release strategy below remains proposed.

Owner: verification. Status: broader product verification planned; only F0 infrastructure checks have passed. Acceptance IDs are defined in [requirements](../product/requirements.md). Every implementation packet records exact commands, exit codes, evidence and skipped/blocked reasons.

| Risk / acceptance | Required proof |
|---|---|
| A0 scope | Review routes/schema/dependencies against exclusions |
| A1 identity | Unit validation + real API integration for provisioning/auth/reset/revocation; end-to-end create/login/change/logout |
| A2 plans | Unit ordering/cycles/transitions; DB ownership constraints; two distinct student journeys |
| A3 reuse/files | Integration snapshots/grants/delete behavior; upload validation and download denial; UI organize/attach |
| A4 sessions | Transaction rollback/idempotency/concurrency; timezone/DST cases; after-lesson E2E |
| A5 work | Scoring fixtures by type, draft/submit/retry/late rules, two-student separation; student submission E2E |
| A6 assessment | Server deadline and concurrent-attempt integration; reconnect/expiry E2E; no key leakage |
| A7 feedback | Grade bounds/revisions/publication; pending → reviewed → released journey |
| A8 progress | Known datasets with denominators, empty data and mixed scales; no cross-student aggregates |
| A9 isolation | Role/resource matrix across API/files/nested relations/cache; negative tests are release blockers |
| A10 UX | Component interaction/accessibility plus live eight-width inspection and critical journeys |
| Context controller | Separate [pilot acceptance](../agents/context-safety.md); no self-reported monitoring pass |

Backend proposal: xUnit for pure domain rules; ASP.NET test host + isolated real PostgreSQL for constraints/transactions. Avoid substituting EF in-memory provider for relational behavior. Frontend proposal: Vitest and Testing Library for meaningful interaction; Playwright for critical workflows and screenshots if approved after tooling assessment. Do not install these during planning.

Fixtures: synthetic tutor and two students, one inactive student, long Vietnamese names, optional blank fields, multiple goal scales, archived source content, pending/manual grades, expired attempt, cancelled/rescheduled lesson, forbidden material and private note. No real student records in tests or screenshots. Deterministic server clock abstraction for timing; no sleeps as timing assertions.

## Risk-based execution

Local validation change: targeted unit/API checks. Module behavior: affected integration/component checks. Shared layout/auth/schema/grading/student ownership/release: broaden to relevant cross-cutting and critical E2E suite. A tiny permission diff is not low risk. Fix root causes; never weaken assertions or hide UI to pass.

Proposed implementation commands once projects exist: `dotnet restore --locked-mode`, `dotnet build --no-restore`, `dotnet test --no-build`; frontend `npm ci`, project scripts for lint/typecheck/test/build and E2E. Script names/project paths are not yet executable contracts. Pin versions and document actual commands in the setup packet.

## Gates

- Planning: links/JSON/JSONL/traceability, no conflicting approval guidance, preserved source hashes, whitespace review and Git diff check where possible.
- PR: affected tests, build/lint/typecheck, dependency/security review, relevant visual evidence, documentation/state updates; no unresolved critical findings.
- Release: full critical journeys, isolation/file/timing/grading regressions, migration rehearsal, backup/restore evidence, supported-platform smoke tests and explicit user deployment approval.

Visual matrix and exact inspection procedure are owned by [frontend design](../frontend/design.md), not duplicated here. No browser tests can be run before an app exists. Accessibility and screenshots require human-readable evidence in addition to automated checks.

CI proposal: Linux PR jobs, concurrency cancellation for superseded runs, lockfile-keyed selective NuGet/npm caches, least-privilege read token, no production secrets on untrusted contributions. Failure-only heavy traces/screenshots; ordinary artifacts retained five days. Windows/macOS on manual/scheduled gates when portability risk warrants it. Current GitHub Free allowances and maintained action versions must be rechecked before workflow implementation; see [operations](../operations/runbook.md). No workflows created in Phase 1.

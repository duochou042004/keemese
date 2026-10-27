# Delivery plan and bounded work packets

Status: product packets remain proposals. H0 was separately approved and its bounded interface pilot completed on 2026-10-27 with limitations; see the [evidence](../../harness/logs/build-log.md). Live enforcement acceptance remains unmet; H0b follow-up also completed with bounded inference/lifecycle evidence; next gate is H0b review. Phase 1 alone authorizes documentation, not execution of packets below. Each packet needs an explicit scope approval and a fresh-session start when telemetry is unavailable. Larger milestones must be split into bounded packets before execution; do not interpret a milestone as an unlimited session.

## Dependency order

Plan review → repository decision → context-safety pilot (if approved) → reproducible foundation → identity/student isolation → content/plans → lessons/after-lesson → assignments → assessments/review → progress and release hardening. Cross-cutting security/UX checks accompany every increment, not a final cleanup phase. Templates/notifications/vocabulary/recurrence/advanced analytics remain outside MVP pending D01.

| Packet | Objective and permitted future scope | Inputs / prerequisites | Acceptance and verification |
|---|---|---|---|
| H0 | Validate context telemetry and fresh-session controls in an isolated bounded experiment; no product code | Approve D09 and exact experiment permissions; context-safety doc; installed version/interface schema | Demonstrate or disprove A/U/C, trigger/overshoot, safe stop, checkpoint and fresh history; publish limitations; no production claim |
| F0 | Establish reproducible minimal backend/frontend/DB test skeleton | D08 Git decision, ADR01/02 approved, package/tool changes separately authorized | Locked restore/build/typecheck and portable run instructions; no business feature expansion |
| I1 | Tutor provisioning and one student login lifecycle with isolation | D05, security/API docs, F0 | A1/A9: login/change/logout/revoke and wrong-student denial with real DB; student create UI tested at matrix widths |
| C1 | Tutor content/material/question authoring and safe student grants | D02 initial types, D03/D04 storage, I1 | A3/A9 including invalid files, private downloads, archive/reuse and source-independent state |
| P1 | Individual goals and ordered plans | Metric policy D07, I1 | A2 with two different students, cycle/order/state validation and usable empty plan |
| L1 | Schedule and after-lesson completion | D06/D10, I1/C1; homework assignment dependency split if A1 work engine absent | A4 atomic retry/rollback, timezone and private note tests; complete full flow only after W1 |
| W1 | Generic assignments/drafts/submission/grading | D02/D03, C1, I1 | A5/A7/A9 including idempotent submit, manual pending and explicit publication; L1 homework integration |
| T1 | Sectioned timed assessments and attempts | D02 timing/retry release rules, W1 shared scoring primitives | A6/A7/A9 server expiry/reconnect/concurrent attempt proof and mobile attempt flow |
| R1 | Progress and action-focused dashboards | D07, P1/L1/W1/T1 | A8/A10 valid denominators, distinct scales, empty state and tutor pending queue |
| Q1 | Release readiness and restore rehearsal | All MVP acceptance, hosting/retention RPO/RTO approved | Full release gate, platform checks, backup/restore evidence; stop before deploy approval |

L1 may first deliver session/note/material behavior; it must not claim A4 complete until W1 homework exists. No circular prerequisite: W1 does not depend on L1. Shared shell/responsive primitives begin in F0/I1 and are refined with each real workflow.

## Recommended first product increment: I1 after F0

Purpose: prove the hardest ownership boundary early, with the smallest useful tutor/student workflow. Read requirements A1/A9 and P03–04/P37, architecture Identity/Students, API identity/student rows, security, frontend Add student and testing identity rows. Do not load every document or add content/assessment features.

Approved packet must explicitly name allowed backend/frontend/test/config paths after F0 establishes them. Implement tutor-only student creation with required name/username/temporary password; optional fields optional. Student login/password change/logout; tutor deactivate/reset if D05 approved. Acceptance: two students cannot access each other's profile, inactive sessions fail, passwords absent from logs, recoverable UI errors preserve safe fields, responsive/keyboard checks pass. Verification: targeted identity units, PostgreSQL API integration, create/login/change/logout E2E, negative ownership tests and eight-width representative shell/form QA. Stop with exact changed files, commands/results, unresolved findings and next task. No release, migrations on persistent data or external messages.

## Review gate and risks

At Phase 1 review, user can approve/revise ADRs and resolve D01–D10 independently. Approval of a design is not approval to implement its hooks/controller or alter global settings. Recommend H0 as the first engineering experiment because trustworthy context control is a stated reliability prerequisite; product work can only use the explicit manual bounded-session fallback until stronger guarantees are proven.

| Risk | Priority / mitigation / owner |
|---|---|
| Unobservable context or false hard-stop claim | P1; H0 or manual fresh-session packets; harness owner |
| Cross-student/private-note disclosure | P0; API/DB boundaries and negative tests; backend owner |
| Source edits alter scores | P1; snapshot decision before schema; domain owner |
| Scope explosion from flexible engine | P1; approve initial types and defer extras; user/product |
| Broad MVP overwhelms one increment | P1; bounded packets/dependencies; coordinator |
| Poor mobile authoring/attempt flow | P1; prototype families and eight-width QA; frontend owner |
| Missing Git history | P1; resolve D08 before implementation; user/coordinator |
| File/privacy/backup uncertainty | P1; D04 before storage/deploy; operations/user |
| Documentation drift | P2; one owner/source per topic, traceability and gate checks; coordinator |

Planning estimates are intentionally dependency-based; no invented calendar delivery promise. Re-estimate after F0/I1 using observed work and test costs.

## F0 readiness review — 2026-10-27

Status: review completed; the following execution scopes are proposed, NOT approved. User authorized this review after H0b. The review continued in the existing chat at the user's request; implementation should start in a fresh chat under the manual fallback. Specification sections 35–36 support the modular monolith and allow ASP.NET Core/EF Core/PostgreSQL; no new product scope is required. ADR01–02 and D08 still require acceptance.

### Recommended approval package

| Decision | Concrete recommendation | Boundary |
|---|---|---|
| ADR01 | One ASP.NET Core .NET 10 API, EF Core 10/Npgsql, PostgreSQL; modules within one application | No distributed services, cache or broker |
| ADR02 | React/TypeScript/Vite/Tailwind v4; React Router Data Mode when routes are needed | Defer Query, form/schema libraries and component catalog until a workflow needs them |
| D08 | Create a local repository here, initial branch master; review and commit the documentation baseline, then create develop and feature/f0-foundation | Use existing configured Git author; no identity/global changes, remote, push or merge |
| D09 operating mode | Use manual fresh-chat bounded packets; accept H0/H0b limitations for development workflow | Does not approve numerical caps as validated or authorize automation |

Local checks: .NET SDK 10.0.403, Node 24.22.1, npm 11.19.1 and PostgreSQL client 18.6 are installed; Docker is absent from PATH. Git author name/email are configured (values not copied into project records). A PostgreSQL client is not proof of a running server. Rootless Podman readiness remains unverified. Current primary docs reconfirm [.NET 10 LTS](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core), [EF10 provider availability](https://www.npgsql.org/efcore/release-notes/10.0.html) and [Vite setup](https://vite.dev/guide/). Exact package versions and compatible locks must be resolved during approved setup; no downloads/installations occurred in this review.

### R0 — repository baseline (first execution packet)

Permission sought: local git init with master; add a minimal project .gitignore; inspect every candidate file for accidental secrets/generated output; explicitly stage reviewed source specifications and planning records; create one baseline commit using existing author configuration; create develop and feature/f0-foundation from that baseline. Preserve all current source bytes. Do not create/connect a hosted repository or change Git identity. If any candidate file is unsuitable for committing, leave it unstaged and report before committing the affected baseline.

Acceptance: verified branch/commit, exact baseline file inventory, no lost user work and no remote; canonical records reflect actual state. Stop at packet boundary. This requires explicit init/staging/commit approval under AGENTS; it has not run.

### F0a — buildable application skeleton (next fresh packet)

Prerequisites: accepted ADR01/02, completed R0 and explicit local implementation/package-download approval. Allowed implementation areas: `backend/`, `frontend/`, root solution/SDK pin files, `.gitignore`, placeholder environment example, setup README, relevant docs/state. No global installation or configuration. Package restores may populate normal NuGet/npm user caches; no global packages. Exact versions and lockfiles are required; do not use floating latest in the finished manifests.

Deliver: minimal API host with liveness endpoint and a meaningful HTTP integration smoke test; minimal frontend shell with API reachability/error presentation; reproducible restore/build/typecheck commands. Backend test infrastructure may use xUnit and ASP.NET test host. Use npm already installed. No authentication, students, business tables, assignments, production storage or pretend login UI. The shell must not be represented as a secured teaching workspace. No hooks/controller or CI workflow in this packet.

Acceptance: clean locked restore, backend build/test, frontend typecheck/build, local API/browser smoke if supported, documented exact commands and honest skipped checks. No application database or persistent migrations. Do not claim F0 complete until F0b passes. No staging/commit/push beyond R0's separately approved baseline unless separately authorized.

### F0b — disposable PostgreSQL integration (separate approval/packet)

Verify available local/container runtime without changing global setup; agree an isolated runtime route before starting it. Author local test configuration and real PostgreSQL connectivity/transaction tests, with pinned compatible provider/server versions and only synthetic disposable data. Image downloads and container/database lifecycle need explicit approval; existing databases/volumes are out of scope. No production schema or persistent migration. If runtime is unavailable, report blocker rather than install Docker or claim in-memory parity.

Acceptance: isolated real-DB round trip and rollback, deterministic cleanup of only test-owned resources, repeatable commands. F0 completes only after F0a and F0b evidence. D04 production hosting/retention, D05 identity/recovery and D06 UI language/browser support remain for their later gates; they need not block an infrastructure-only skeleton. D01–03/D07/D10 remain unresolved and are not silently ratified here.

## R0 approval carried into fresh session — 2026-10-27

User approved the stack and R0 scope above, then requested session closure and a fresh conversation. R0 is authorized but not executed. ADR01/02 are accepted. No remote/push, product implementation, package installation, hooks/controller or global changes are included. The successor should execute R0 without asking for the same approval again, verify actual state first, checkpoint afterward and stop before F0a. A project .codex directory is not a prerequisite to R0; create no placeholder configuration or skills merely to populate it.

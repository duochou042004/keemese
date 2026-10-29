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

## R0 execution outcome — 2026-10-27

R0 is complete; this outcome supersedes earlier pending-execution wording. Initialized local `master` and committed the reviewed 22-file baseline as `f25b1cd0c48b3d1b99141cc697f6f63bc5396e5c` using existing identity, then created `develop` and `feature/f0-foundation` at that commit. Current branch: `feature/f0-foundation`. All 21 original file hashes were preserved in the baseline; no remote. Four post-commit canonical checkpoint files remain unstaged by design. Baseline whitespace check flagged only two existing specification hard breaks, preserved unchanged. See [build log](../../harness/logs/build-log.md) and [progress](../../harness/state/progress.json) for validation. Stop before F0a; implementation/download approval is still required.

## F0a approval — 2026-10-27

User explicitly approved F0a execution, including local implementation and package downloads within the F0a scope above. Execute as one bounded goal in a fresh chat; no repeated approval needed. F0b and additional Git operations remain unapproved.

## F0a outcome — 2026-10-27

F0a completed under explicit local implementation/download approval. Exact pins and lockfiles, minimal API/liveness, three HTTP integration cases and React/TypeScript/Vite/Tailwind connection shell are implemented. Clean locked restores, backend build/tests, frontend typecheck/build, direct HTTP and built-shell browser connection/outage/recovery checks passed. See [setup](../../README.md), [QA evidence](../testing/evidence/f0a.md) and [checkpoint](../../harness/state/progress.json). Existing documentation edits and source relocations preserved; no staging/commit/push. Stop before F0b: disposable PostgreSQL runtime/lifecycle approval remains required, so F0 is not complete.

## F0b approval — 2026-10-27

User approved F0b in a fresh-chat bounded goal: pinned PostgreSQL image download, isolated rootless Podman container with synthetic data, real round-trip/rollback tests and deterministic cleanup of test-owned resources. Existing databases/volumes, global installations, production migrations and business features remain excluded. Rootless Podman 5.8.6 preflight succeeded; container execution remains to be verified. Do not repeat this approval request.

## F0b outcome — 2026-10-27

F0b completed under the explicit fresh-chat approval above, superseding historical pending/unapproved wording. The isolated test-only project uses digest-pinned PostgreSQL 18.6, EF Core/Relational 10.0.14 and Npgsql/provider 10.0.3. Real Unicode round-trip, failed-transaction rollback and exception-path cleanup passed with rootless Podman; locked restore/build passed. No containers or volumes remained after verification. See [F0b evidence](../testing/evidence/f0b.md) and [repeatable commands](../../README.md). F0a plus F0b satisfy the infrastructure foundation gate only. Stop here: no I1 work, staging, commit or push is authorized by F0b.

## I1 readiness outcome — 2026-10-28

Readiness review completed; [concrete I1 proposal](i1-readiness.md) owns exact paths, identity/UI decisions, API behavior and acceptance. Recommend I1a backend/real-DB proof first, then separately approved I1b UI/visual acceptance. ADR03 identity subset, D05 and applicable D06 remain pending user acceptance. This documentation review authorizes no implementation or F0b publication.

## I1 acceptance — 2026-10-28

User explicitly approved the I1 readiness proposal and I1a execution on 2026-10-28: ADR03 identity subset, D05 settings and applicable D06 pilot scope; pinned local dependency restores and synthetic disposable PostgreSQL tests included. Execute I1a only in a fresh chat; I1b and Git publication remain separately gated. This acceptance supersedes earlier pending labels for these choices only.

## I1a outcome — 2026-10-28

The approved backend identity/ownership packet is implemented. [I1a evidence](../testing/evidence/i1a.md) maps all seven backend acceptance groups to real PostgreSQL/API/terminal proof, records locked builds and original F0b regressions, and distinguishes local-pilot limits from deployment readiness. The frontend stays at F0; full A1 E2E and future A9/A10 remain incomplete. Test schema creation used disposable tmpfs databases only; no persistent database or migration was operated. All work remains unstaged on the original branch/HEAD. Stop here; next action is user review and separate authorization of a fresh I1b packet, or separately requested publication.

## I1b approval/outcome — 2026-10-28

User explicitly approved proceeding with next planned I1b here in the current session, superseding the prior fresh-chat-only condition for this packet. Vietnamese identity/account UI and synthetic full browser journeys are complete within the [I1 scope](i1-readiness.md). [Evidence](../testing/evidence/i1b.md) records 6/6 built-asset E2E, 17/17 API regressions, locked setup, responsive/keyboard/zoom/contrast review and final verified resource cleanup. Existing backend product/F0b files were preserved; only the allowed opt-in UI fixture was added. No persistent DB/schema operation, CI or Git publication. Stop at the I1b checkpoint; scope the next bounded packet with the user. Full future A9/A10 and deployment remain incomplete.

## C1a text-library approval and outcome — 2026-10-28

After completed bilingual UI publication, the user explicitly approved implementing the next task in the current session. This overrides the fresh-chat start condition for C1a only. The next dependency is C1, split to the [bounded plain-text library packet](c1a-text-library.md): tutor-only create/list/edit/archive/restore reusable source text, bilingual UI, real DB/browser verification and reviewed normal branch publication. No additional package/storage policy needed for this slice; D02/D03/D04 question/snapshot/file choices remain deferred.

C1a is implemented and verified: 21 API tests and 13 browser scenarios pass; new 64 template/width/language cases and eight actual zoom cases accompany the retained 96 identity cases and 12 identity zoom cases. [Evidence](../testing/evidence/c1a-text-library.md) owns scope/limitations. Full C1/A3 remains incomplete: folders/tags/materials/questions/grants and assigned snapshots are later packets. Recommended next bounded slice is C1b folder organization for existing native text, with explicit proposal/approval; storage/question policy still separate. No persistent migration/deployment is authorized or performed.

## Next priority: CI1 before C1b — 2026-10-28

User requests a fresh conversation in goal mode and conditional CI implementation; assessment accepts CI as timely. Execute [CI1](ci1.md) next: small secure/path-aware GitHub Actions with real PostgreSQL/API/browser proof and publication. Existing 21 API/13 browser tests justify automation before adding more workflows. [Hosting direction](../operations/runbook.md#accepted-hosting-direction-and-ci-priority--2026-10-28) is recorded for later deployment/storage packets; CI1 needs no Render/R2/deployment credentials. C1b folders remains proposed after CI1, not currently authorized. This chat publishes the handoff before the approved successor starts, avoiding concurrent writers.

## CI1 implementation outcome — 2026-10-28

Secure selective GitHub Actions and dependency-free validation helpers are implemented. Real local and hosted rootless PostgreSQL/API/browser proof is recorded in [CI1 evidence](../testing/evidence/ci1.md); final revision/docs-only outcomes belong there. Product behavior, dependency locks and source specifications are preserved. Stop at CI1 after reviewed publication; C1b folder organization remains the next proposal requiring separate approval. No deployment/storage provisioning or full C1/A3 acceptance is inferred.

## C1b approval/implementation — 2026-10-29

User explicitly approved the next planned work here, superseding the fresh-chat-only start for this packet. [Bounded C1b](c1b-folders.md) adds tutor-defined nested folders and existing native-text assignment/filtering, with empty-only delete, structural concurrency protection and bilingual controls. [Evidence](../testing/evidence/c1b-folders.md) owns checks/publication. Stop after verification and normal publication; files/tags/questions/grants/teaching activity and deployment remain separate. Next propose bounded text-library search (C1c) to make growing sources findable without introducing file/question policy; no implementation is authorized by C1b.

## C1c proposal transition — 2026-10-29

User approves transitioning the next recorded task into a subsequent conversation in goal mode. Launch the bounded [C1c search proposal packet](c1c-search-handoff.md) after publishing canonical handoff records. The successor activates create_goal without an invented budget, prepares/reviews the concrete search scope, validates and publishes documentation, then presents it for implementation approval. No product implementation, new deployment scope or history import is implied.

## C1c concrete proposal — 2026-10-29

The [reviewable C1c proposal](c1c-text-search.md) defines invariant-uppercase/NFC literal search across title/description/body, accent-sensitive matching, explicit submission, existing direct-folder/archive filtering and stable pagination, safe tutor-only projections and bounded synthetic verification. Documentation planning/publication is authorized; implementation is pending user approval of that exact scope. Stop after proposal publication and hosted docs verification; the next implementation packet starts only after approval in a fresh bounded chat.

## C1c approved execution — 2026-10-29

User approved [C1c](c1c-text-search.md) implementation right here, superseding its fresh-chat-only start for this packet. Implemented literal normalized native-text search and bilingual controls with direct-filter/page/focus/request guards. [Evidence](../testing/evidence/c1c-text-search.md) records real local/hosted outcomes and publication state. Stop after C1c verification/publication; remaining tags/materials/questions/grants/activity and deployment require later bounded proposals/approval.

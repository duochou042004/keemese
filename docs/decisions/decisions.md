# Architecture decisions and open decisions

ADRs were proposed on 2026-10-27. User accepted ADR01/02 and D08 local R0 scope on 2026-10-27; ADR03/04 and other undecided items remain proposed. User owns acceptance. No implementation approval is implied. Preserve superseded decisions with date/reason; do not overwrite history. Requirements map to source sections via [traceability](../product/requirements.md).

## ADR01 — Modular monolith and PostgreSQL

Context: one tutor, transactional teaching workflows, no tenant/enterprise need (P03/P35/P36). Recommend .NET 10/C#14, ASP.NET Core Web API, EF Core 10 and PostgreSQL with compatible Npgsql provider. One database and explicit module boundaries minimize infrastructure. SQL Server remains viable but offers no specified product advantage; distributed services add operational cost without a requirement. Confidence: high for monolith; medium for PostgreSQL pending hosting. Consequence: enforce module discipline in code/tests; no message bus/cache by default. [Npgsql 10 documentation](https://www.npgsql.org/efcore/release-notes/10.0.html) confirms the EF10 provider exists; exact patch compatibility must be pinned and tested before installation.

## ADR02 — SPA navigation and client state

Context: authenticated tutor/student workspace; no SEO/SSR requirement (P40/P41). Recommend React + TypeScript + Vite + Tailwind v4 per user baseline. Choose React Router Data Mode for nested student/work routes and route errors. Keep API server state in one TanStack Query cache if adopted; loaders may prefetch that cache, never create a competing data store. Component state holds local UI; form state holds unsaved input.

React Router offers declarative/data/framework modes; TanStack Router emphasizes typed navigation/search parameters. Both can satisfy this scope. React Router's data mode is sufficient for the current route tree; choose TanStack instead only if validated complex typed search-state requirements justify changing this decision. No SSR/framework-mode server is proposed. Confidence: medium until first workflow prototype. Sources checked 2026-10-27: [React Router modes](https://reactrouter.com/start/modes), [TanStack Router](https://tanstack.com/router/latest/docs/overview).

Candidate library review: TanStack Query earns its cost for invalidation, cancellation and retry across workspaces; disable automatic mutation retry for unsafe operations. React Hook Form plus Zod may simplify nested assessment forms and client errors; server validation remains authoritative. shadcn/ui accessible primitives can seed dialog/menu/form controls, but copied component ownership and keyboard QA remain ours. Do not install the entire catalog. Pin exact mutually compatible versions with a lockfile only in an approved setup packet after checking current primary docs. No package versions have been selected or installed.

## ADR03 — Identity, files and historical integrity

Recommend same-origin secure HttpOnly cookies with CSRF controls and server-side credential/session revocation; avoid persistent browser tokens. Prefer framework identity/password facilities over custom crypto. Serve private files through an authorization-aware adapter; storage provider chosen after D04. Freeze assigned question/scoring content so source edits cannot alter submitted evidence. Full content version browsing remains post-MVP. Confidence: high for boundaries, medium for deployment/auth transport details. Tradeoffs: snapshot storage grows; cookie setup requires explicit CSRF and shared-origin deployment; storage adapter needs reconciliation without distributed transactions.

## ADR04 — Context safety is an engineering gate

The 2026-10-27 user amendment supersedes bootstrap handoff targets. Recommend the [context-safety design](../agents/context-safety.md): verified 65% preparation/75% stop with conservative absolute caps, fresh sessions, durable checkpoint, manual fallback. Automated enforcement is unverified; a controlled pilot is a prerequisite to claiming it. No global changes, hooks or scripts in Phase 1. Confidence: high for need and fresh-session semantics; conditional for automation feasibility.

## Decisions to resolve

| ID | Decision / recommendation | Owner, timing and consequence |
|---|---|---|
| D01 | Ratify MVP exclusions: templates, vocabulary tools, notifications, recurring calendar, version UI deferred | User at plan review; avoids descriptive examples expanding MVP |
| D02 | Approve first question types and attempt/grading policy. Propose single/multiple choice, true/false, short/long text, file/audio upload; defer matching/ordering/complex blanks pending need | User before work-engine packet; auto-score only deterministic answers, manual text/audio |
| D03 | Approve immutable assigned snapshots; source edit never changes issued work; explicit reissue for corrections | User before schema; prevents invalidated historic scores |
| D04 | Hosting/region/budget, expected learners/concurrency, storage/type/size limits, retention/deletion, backup RPO/RTO and minor-data requirements | User before deployment/storage finalization; no legal compliance claim without jurisdiction evidence |
| D05 | Tutor bootstrap and recovery; propose out-of-band one-time bootstrap, tutor-managed reset, mandatory first-login password change, revoke old sessions | User before identity; no emailed password automation assumed |
| D06 | UI language, supported browser floor, tutor timezone and student timezone presentation | User before UI/schedule; propose Vietnamese-first pending confirmation, store UTC + IANA timezone |
| D07 | Progress denominator and score rules; propose only eligible non-cancelled activities, label incompatible scales, explicit release | User before progress; no invented universal percentage |
| D08 | Repository identity/history and hosting; initialize new Git or reconnect existing checkout? | User before any Git creation; no `.git` exists in current unrestricted view |
| D09 | Approve context caps, manual fallback, and separate bounded runtime pilot including possible session creation | User before harness implementation; percentage automation blocked without live proof |
| D10 | Session conflict policy and late/reopened work; propose warnings for overlap, explicit tutor override, no silent deadline extension | User before lessons/attempts; preserve timezone/DST integrity |

No answer is required to finish documentation. Unresolved decisions stay visible; downstream implementation packets must not silently choose materially different scope.

## F0 readiness review outcome — 2026-10-27

ADR01/02 and D08 remain proposed. A concrete local repository baseline and two bounded foundation packets are now specified in the [delivery approval package](../delivery/plan.md#f0-readiness-review--2026-10-27). Current tooling supports evaluating the proposed stack; database runtime is unverified. Recommend manual fallback rather than further automatic-context experiments. Review authorization does not accept the ADRs or authorize init, commits, package downloads or product implementation.

## Acceptance — 2026-10-27, session closure

User explicitly approved the recommended stack (ADR01/02) and R0 execution: local Git initialization on master, reviewed documentation baseline staging/commit, then develop and feature/f0-foundation; no remote or push. Execution is deferred to a fresh conversation at user request. F0a/F0b implementation and dependency downloads remain unapproved. This acceptance supersedes the earlier proposed labels for ADR01/02 and D08 only.

## I1 decision package — 2026-10-28

The [I1 readiness proposal](../delivery/i1-readiness.md#decisions-requiring-user-acceptance) makes ADR03's identity subset, D05 bootstrap/recovery/first-login/session choices and D06 language/browser pilot scope concrete. All remain **proposed**, pending user response. ADR03 file/snapshot choices and D06 scheduling/timezone choices remain deferred. Separate design acceptance from I1a implementation approval; I1b and Git publication need their own gates.

## I1 acceptance — 2026-10-28

User explicitly approved the I1 readiness proposal and I1a execution on 2026-10-28: ADR03 identity subset, D05 settings and applicable D06 pilot scope; pinned local dependency restores and synthetic disposable PostgreSQL tests included. Execute I1a only in a fresh chat; I1b and Git publication remain separately gated. This acceptance supersedes earlier pending labels for these choices only.

## I1a implementation boundary — 2026-10-28

Accepted ADR03 identity subset/D05 settings are implemented with [I1a evidence](../testing/evidence/i1a.md). For the isolated pilot, both framework protection provider and key-management repository stay in memory, so restart invalidates browser tickets and writes no persistent keys. PostgreSQL transactions/advisory locking serialize identity writes; the login throttle uses a rolling 60-second in-process window. Durable deployment key storage, distributed controls, versioned release migration/retention and hosting remain deferred, alongside ADR03 files/snapshots and D06 scheduling. D06 language/browser scope acceptance does not claim I1b UI verification; that packet remains separately gated.

## I1b execution decision — 2026-10-28

User authorized the next planned I1b task here in the same session, overriding only that packet's earlier fresh-chat start condition. Vietnamese-first identity UI and available Chromium/Linux pilot were implemented/tested. Native history navigation and local React state keep this small route set dependency-light; Playwright 1.64.1 is exact/locked. Its browser/zoom extension run only in test-owned local caches/profiles; no global browser configuration. CI remains a separate approval, alongside Git publication, deployment, remaining ADR03 scope and D06 scheduling. See [I1b evidence](../testing/evidence/i1b.md).


## Deferred bilingual interface requirement — 2026-10-28

User requests English/Vietnamese switching across application UI components and explicitly defers discussion and implementation. Earlier D06/I1 pilot guidance specified Vietnamese-first labels/errors; that was not a complete bilingual interface decision. The new requirement supersedes any assumption that Vietnamese-only is the final interface. Default language, switch placement, preference persistence and translation coverage will be discussed later. Do not infer translation of tutor-authored learning content from UI localization. No implementation is authorized by this checkpoint.

## Bilingual interface proposal — 2026-10-28

The requested fresh discussion is complete. Recommend Vietnamese default, shared-header native selector, browser-only non-sensitive language persistence, two typed dictionaries and a small React provider. Full interface coverage includes errors/validation/accessibility/document metadata; authored content is unchanged. [Frontend proposal](../frontend/design.md#bilingual-interface-proposal--2026-10-28) owns mechanics, edit surface and verification. These routine choices are proposed for the bounded implementation packet; no product edits are authorized yet. Redesign visual acceptance remains pending.

## Bilingual execution and publication approval — 2026-10-28

User accepts the bilingual proposal and explicitly directs execution in a new Sol Medium goal-mode session. This supersedes the earlier implementation deferral and permits the bilingual packet on the existing white/navy design without another visual-acceptance gate; do not claim a separate aesthetic review occurred. The user also requires task changes to be committed and pushed to the corresponding existing GitHub branch at reporting checkpoints. Current destination is `origin/feature/f0-foundation`; this includes the accumulated F0b/I1a/I1b/redesign work and preparation records. No merge, force-push, deployment or persistent data operation is authorized. [Execution packet](../delivery/bilingual-ui.md) owns the goal contract.

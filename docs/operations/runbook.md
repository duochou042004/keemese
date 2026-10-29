# Environment, delivery and recovery proposal

I1a status — 2026-10-28: backend identity/operator behavior is implemented with synthetic disposable PostgreSQL proof. No persistent DB/schema, deployment, startup migration, CI or secrets/access operation was performed. [I1a evidence](../testing/evidence/i1a.md) supersedes historical foundation-only claims for identity.

F0 update (2026-10-27): local skeleton and disposable rootless PostgreSQL test setup are implemented in the [root README](../../README.md), with exact pins and locks. F0b passed on Linux x64/Podman 5.8.6; [evidence](../testing/evidence/f0b.md) records cleanup and limits. The public GitHub repository contains F0a; F0b remains uncommitted. Production database, hosting, migrations and CI below remain proposals.

Status: future operations proposal beneath the F0 update above. No Compose file, deployment, migrations or production resources exist. Owner: operations. D04/D08 in the [decision register](../decisions/decisions.md) block final hosting/repository setup.

## Observed environment and version policy

Phase 0 observed Linux/zsh, .NET SDK 10.0.403 with runtime/ASP.NET 10.0.14, Node 24.22.1, npm 11.19.1, Python 3.14.8, PostgreSQL client 18.6, Git 2.53.0, GitHub CLI 2.103.2. Docker/pnpm/Yarn/Bun/ripgrep were not on PATH. Podman and podman-compose are present; earlier Podman inspection failed under the then read-only runtime directory. F0b subsequently verified rootless container execution and PostgreSQL readiness with synthetic disposable data; this does not verify production hosting.

Official checks on 2026-10-27: [.NET support](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) lists .NET10 LTS/10.0.14; [C#14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) uses .NET10; [Node releases](https://nodejs.org/en/about/previous-releases) lists Node24 LTS. [Vite requirements](https://vite.dev/guide/) currently specify Node20.19+/22.12+; installed Node24 satisfies the stated floor, but exact templates/dependencies still need validation. [Tailwind compatibility](https://tailwindcss.com/docs/compatibility) names Chrome111, Safari16.4 and Firefox128 as v4 core browser floors; approve actual supported browsers before UI implementation.

Proposed reproducibility: pin SDK with global.json, exact dependencies/lockfiles, Node24 line and tested npm version; use npm already available unless evidence supports another package manager. Pin PostgreSQL/container versions after hosting choice. F0 pins and locks now exist; production configuration remains future work. Recheck current patches at the implementation gate instead of treating this dated snapshot as permanent truth.

## Portable local setup design

One documented setup flow: prerequisites → placeholder environment file → start DB/private storage if chosen → restore locked dependencies → apply local disposable-data migrations → start API/frontend → synthetic smoke test. Secrets live outside Git; example files contain placeholders only. Define API origin, database connection, private storage location, cookie/security settings and tutor bootstrap configuration explicitly. No real student data in development.

Compose should work with Docker Compose and Podman Compose where practical; validate both before claiming parity. Use named volumes where possible, health checks, bounded resource use and explicit service names. Do not require host-specific absolute paths or rootful containers.

| Platform concern | Planned verification |
|---|---|
| Linux rootless Podman | UID/GID, volume ownership, SELinux labels where relevant, host networking and runtime socket |
| Windows | Path separators/spaces, case-insensitive filesystem, line endings, PowerShell commands, container VM mounts |
| macOS | ARM image availability, file sharing permissions/performance, case sensitivity, Docker/Podman VM networking |
| All | UTF-8 names/content, UTC/IANA timezone behavior, portable scripts and lockfile restore |

Prefer cross-platform runtime scripts over shell-only orchestration when later approved. No assumption that Linux CI proves Windows/macOS behavior.

## CI budget and supply-chain baseline

[GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), checked 2026-10-27, lists GitHub Free at 2000 minutes/month, 500MB artifact storage and 10GB cache/repository. Actual owner, visibility, plan and remaining budget are unknown. Plan for Free; do not claim project quota compliance. [Artifact documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts) describes default 90-day retention; our proposal deliberately uses five days for ordinary artifacts and failure-only heavy evidence.

Maintainer release pages observed: [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0), [setup-dotnet v6.0.0](https://github.com/actions/setup-dotnet/releases/tag/v6.0.0), [upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2). These are researched candidates, not installed/pinned actions. Before writing CI, verify runner/runtime compatibility, immutable commit SHAs and release security notes. No blanket “latest” dependency use. Permissions default read-only; use explicit concurrency and avoid duplicate push/PR full runs.

## Release and rollback

After implementation approval: build reproducible artifacts, run release gate, verify environment/secrets, rehearse migration on a restored disposable copy, back up DB and files consistently, obtain deployment approval, apply reviewed migration, deploy, run authenticated synthetic smoke checks and monitor. Never run destructive migrations automatically on application startup. Prefer expand/contract schema changes; rollback binaries only if schema remains compatible. Otherwise restore from verified backup or perform an explicitly approved forward repair.

Monitor health/readiness, API error rate/latency, failed logins, upload failures, storage capacity and backup age without logging student content. Targets/alert destinations need D04. No notification integration is authorized by this plan.

## Recovery and troubleshooting

- DB unavailable: inspect connectivity/health/config without printing secrets; preserve data; do not recreate volumes as a shortcut.
- Upload saved but attach failed: retain quarantined/unattached metadata; retry idempotent attachment; clean only after approved retention window. Reconcile DB metadata to storage inventory without deleting unexplained objects.
- Failed migration: stop writes if integrity at risk, record exact version/error, assess partial application, use tested rollback/restore path with approval.
- Restore drill: restore DB and corresponding file set to isolated environment, verify ownership/row counts and file hashes, test login and representative work history; record achieved recovery time and data loss against approved RPO/RTO.
- Lost tutor access: approved out-of-band recovery, revoke compromised sessions, audit without revealing passwords.
- Context/controller failure: stop old writer and follow [context recovery](../agents/context-safety.md); incomplete handoff is not permission to guess completion.

Git convention proposed by user: master releases, develop integration, feature/fix branches from develop. R0 and F0a publication are complete; the current branch is feature/f0-foundation with an origin remote. F0b staging/commit/push need separate authorization. Merges and releases require explicit approval.

## I1a local identity operations

The [README](../../README.md#backend-identity-pilot-i1a) owns executable build/test and operator-mode syntax. Configuration uses `ConnectionStrings__Workspace` supplied to the process; do not put credentials in args, committed files or logs. Runtime never creates/migrates schema or bootstraps users. Tests alone call EF `EnsureCreatedAsync` on helper-owned tmpfs databases. A release migration and persistent setup/rehearsal remain later approved operations; `EnsureCreated` is not a migration strategy.

`identity-bootstrap` accepts no extra args, prompts for username and hidden password, creates exactly one tutor transactionally, and refuses repeat invocation without changing credentials. PostgreSQL also enforces single tutor and normalized-username uniqueness. `identity-recover` requires typing `RECOVER`, prompts for a hidden new password, resets the existing tutor only, revokes all tutor sessions and writes minimal audit metadata. Both return nonzero on failure and do not start an HTTP listener. Redirected input is refused. Implementing these modes does not authorize operating a persistent database.

Cookie tickets have an eight-hour absolute limit and require a valid DB session/active user on every request. Logout revokes current session; reset/change/deactivate/recovery revoke all applicable sessions atomically. Key protection and key-manager XML storage are memory-only: API restart invalidates cookies, and old session rows confer no access by themselves. Durable key storage, expired-session/audit retention, proxy trust, multiple API processes and deployment are deferred; the local rolling IP throttle is not a distributed control. No automated email/reset messages are sent.

I1a test commands reuse the F0b helper unchanged; UUID ownership labels, loopback ports, tmpfs and `finally` cleanup apply. Tests additionally use the preinstalled Linux `script` utility to supply a PTY to real operator processes with echo disabled; no terminal tool was installed. Do not treat Linux proof as other-platform terminal compatibility. Interrupted-run recovery follows the existing exact-owner container procedure; no broad prune.

## C1a schema boundary — 2026-10-28

C1a adds a text-content model used only in the existing synthetic disposable PostgreSQL fixture's `EnsureCreated` schema during verification. No persistent schema/database was created or altered. `EnsureCreated` does not upgrade an existing identity-only database; a reviewed versioned migration/provisioning and backup plan remains required before operating the expanded schema on retained data. Do not run automatic destructive recreation or infer deployment readiness from these tests. Existing rootless container ownership and post-cleanup acknowledgement procedures remain unchanged. [C1a evidence](../testing/evidence/c1a-text-library.md).

## Accepted hosting direction and CI priority — 2026-10-28

User selected paid Render for backend and managed PostgreSQL; Cloudflare R2 for storage. Frontend candidates remain Vercel, Netlify or Cloudflare Pages free tiers, with a Render container fallback. Budget is $40–$100; treat this as a USD/month planning assumption, to confirm before provisioning, not permission to incur charges now. No provider resources/accounts/credentials were created or configured. Exact compute sizes, region, workspace plan, database version, frontend provider/custom domain, storage limits/retention/deletion and RPO/RTO remain unresolved. This accepts D04's provider direction only, not its remaining operational/data choices.

Keep Render backend/database in the same selected region and use the database internal address ([private networking](https://render.com/docs/private-network)). Paid PostgreSQL includes PITR, but its recovery window depends on workspace plan ([backup docs](https://render.com/docs/postgresql-backups)); select and rehearse recovery against the eventual RPO/RTO. The [Render pricing page](https://render.com/pricing) must be rechecked with actual compute/storage/workspace selections before a concrete quote. Reserve budget for DB storage/backups, API traffic, any frontend proxy and R2 operations; no exact monthly total is verified here.

Prefer evaluating Cloudflare Pages first because R2 is already chosen, but this is an engineering recommendation, not an accepted final frontend selection. [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) include 500 free builds/month; Functions use Workers quotas. [Vercel Hobby](https://vercel.com/docs/plans/hobby) is personal/non-commercial only, so do not assume a tutoring business is eligible. Netlify remains a user-approved candidate, with pricing/terms evaluation deferred until selection. [R2 pricing](https://developers.cloudflare.com/r2/pricing/) separates storage/operations from egress; free R2 egress does not make Render-to-client proxy traffic or other services free. Files must remain private, with authorization-aware serving; no public bucket is authorized.

Current app uses same-origin cookies/CSRF and exact Origin checks. A separate frontend host must provide a reviewed same-origin API gateway/proxy topology with explicit trusted-host/forwarded-header handling, correct cookies/no-store behavior and end-to-end session/CSRF tests. Simply pointing browser fetch at a Render hostname is not a working deployment design. Render serving frontend/API from one origin remains a fallback to evaluate. Durable Data Protection keys, production proxy trust, versioned retained-data migrations, secrets, R2 private adapter and recovery rehearsal must precede deployment; do not relax cookie/CSRF security to fit hosting.

CI is now timely and explicitly authorized as the next fresh goal-mode packet, ahead of folders. [CI1](../delivery/ci1.md) supersedes earlier CI deferral. Current repository visibility verified public via GitHub CLI; [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) confirms standard hosted compute is free for public repositories. Earlier private-plan minute assumptions above do not apply to this public repository; artifact/cache/storage limits remain separate. No workflow or hosted CI run exists at handoff; local 21 API/13 browser results remain historical. CI1 must prove actual hosted execution, rootless container compatibility and selective/full checks without deployment credentials.


## CI1 implemented — 2026-10-28

The [CI workflow](../../.github/workflows/ci.yml) and [evidence](../testing/evidence/ci1.md) supersede earlier no-CI/proposed-only statements. Pushes to develop/master/feature/f0-foundation and PRs to develop/master run checks without path filters. Docs-only changes avoid runtime setup; backend and frontend changes keep real browser/API/DB journeys; CI/shared/unknown changes run full verification. A same-SHA open PR to a covered base suppresses redundant push verification while retaining PR merge-state checks; lookup errors retain verification. Other feature branches require a PR. Configure no branch protection in this packet; the stable overall job is named `result`.

Use `python3 -m unittest discover -s tools/ci -v` and `python3 tools/ci/check.py validate` locally. The helper checks versioned/new nonignored JSON/JSONL/Markdown targets, 61 requirement rows and whitespace. Local-only ignored preview paths are plain code text, not repository links. Runtime commands and exact dependency pins remain in the root README. CI caches NuGet packages/npm downloads by locks, never databases, node_modules or browser binaries. One fixed-schema failure status artifact is retained three days; step logs contain test outcomes. No screenshots/traces/private fixtures are uploaded.

Hosted runners explicitly verify rootless Podman and pull the existing PostgreSQL digest before tests. Missing infrastructure fails; no rootful/in-memory fallback. Existing fixtures remove exact owners and browser teardown awaits post-removal acknowledgement; independent inventories must be empty. A VM loss/forced kill cannot guarantee teardown; no broad prune/removal was introduced. No provider credentials, deployments, paid runners, workstation setup or persistent operations are involved. Exact hosted versions/results and limitations belong to the evidence record.

C1b schema note — 2026-10-29: new folders/nullable text folder assignment exist only in disposable test-owned schemas in this packet. Do not point this build at retained data expecting automatic updates; no startup migration exists. A later deployment packet must create/review a versioned migration, rehearse data preservation/rollback and cover durable keys/proxy/storage choices. [C1b evidence](../testing/evidence/c1b-folders.md).

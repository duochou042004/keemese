# Environment, delivery and recovery proposal

Status: planning only. No runnable app, Compose file, deployment, migrations or production resources exist. Owner: operations. D04/D08 in the [decision register](../decisions/decisions.md) block final hosting/repository setup.

## Observed environment and version policy

Phase 0 observed Linux/zsh, .NET SDK 10.0.403 with runtime/ASP.NET 10.0.14, Node 24.22.1, npm 11.19.1, Python 3.14.8, PostgreSQL client 18.6, Git 2.53.0, GitHub CLI 2.103.2. Docker/pnpm/Yarn/Bun/ripgrep were not on PATH. Podman and podman-compose are present; earlier Podman inspection failed under the then read-only runtime directory. Container execution and DB server readiness remain unverified after permission changes; no need to initialize services during planning.

Official checks on 2026-10-27: [.NET support](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core) lists .NET10 LTS/10.0.14; [C#14](https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14) uses .NET10; [Node releases](https://nodejs.org/en/about/previous-releases) lists Node24 LTS. [Vite requirements](https://vite.dev/guide/) currently specify Node20.19+/22.12+; installed Node24 satisfies the stated floor, but exact templates/dependencies still need validation. [Tailwind compatibility](https://tailwindcss.com/docs/compatibility) names Chrome111, Safari16.4 and Firefox128 as v4 core browser floors; approve actual supported browsers before UI implementation.

Proposed reproducibility: pin SDK with global.json, exact dependencies/lockfiles, Node24 line and tested npm version; use npm already available unless evidence supports another package manager. Pin PostgreSQL/container versions after hosting choice. These files do not exist yet. Recheck current patches at the implementation gate instead of treating this dated snapshot as permanent truth.

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

Git convention proposed by user: master releases, develop integration, feature/fix branches from develop. Current directory has no Git repository; do not initialize, rename, stage, commit or connect a remote without resolving D08 and authorization. Merges and releases require explicit approval.

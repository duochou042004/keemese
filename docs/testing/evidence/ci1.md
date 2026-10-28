# CI1 verification evidence — 2026-10-28

Approved bounded CI packet; baseline `dc5cc31b0c8d116029af62e6ba0c2d3be3a8f440` matched origin with a clean worktree. No product behavior or dependency pins changed.

## Workflow contract

[Workflow](../../../.github/workflows/ci.yml) runs on pushes to develop/master/the existing foundation branch, and PRs targeting develop/master. No top-level path filter. Pushes with an open PR to a covered base perform lightweight checks and delegate heavy verification to the PR merge-revision run; public API lookup failure retains verification. Other feature branches receive PR checks. Concurrency cancels superseded runs per branch or PR. The stable `result` job rejects failed/cancelled/unexpectedly skipped prerequisites. No branch protection was changed.

The Python classifier uses event base/head revisions and NUL-delimited no-rename Git diff. Missing/zero/unavailable base, deletion, rename (as deletion/addition), mixed backend/frontend, shared/configuration/lock/test/helper and unknown paths select full checks. Docs-only changes select JSON/JSONL/local Markdown target/61 unique requirement-row/whitespace validation. Backend changes run API/DB plus built frontend/browser; frontend source changes build the backend for real browser journeys and skip only the standalone API/DB regressions. Full runs execute both. Helper regressions exercise classifications, failure/cancellation aggregation and malformed JSON/missing links/incomplete coverage.

Official action release tags and full commits were resolved through the GitHub API on 2026-10-28. All four `action.yml` runtimes verified node24, supported by current GitHub-hosted Ubuntu24 runners: checkout v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`; setup-node v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1`; setup-dotnet v6.0.0 `a98b56852c35b8e3190ac28c8c2271da59106c68`; upload-artifact v7.0.2 `cf430e030ddbb5b0abf93d22962f4752f3646cd9`. Sources: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [Node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [.NET](https://github.com/actions/setup-dotnet/releases/tag/v6.0.0), [artifacts](https://github.com/actions/upload-artifact/releases/tag/v7.0.2).

Read-only contents token, nonpersisted checkout credentials, standard `ubuntu-24.04`, no secrets/services/deployments. NuGet global packages and npm downloads use lockfile-keyed setup-action caches; no node_modules/browser/container/database cache. Chromium alone is installed after npm ci. Failure artifact is one small fixed-schema JSON status file, three-day retention; raw logs, traces, cookies, screenshots, credentials and DB state are excluded. Successful screenshot matrices remain ephemeral. Existing single-worker ordering and cleanup acknowledgement are unchanged; independent inventories check teardown. Forced kill/runner loss cleanup is not guaranteed.

## Local checks

- Helper tests: three test methods with classification/result/failure subcases passed; JSON/JSONL/Markdown/61-row validation passed. PyYAML parsed all three jobs; hosted parser/execution remains a separate requirement.
- Locked restores and single-worker no-restore backend builds passed, zero warnings/errors.
- Strict E2E/config/teardown TypeScript and production frontend build passed. Initial frontend invocation lacked npx on that directory's shell PATH; reran successfully with the existing exact Node installation on PATH. No installation/global change.
- Real local API/DB/browser execution in progress at first publication checkpoint; final results and hosted evidence follow below.

## Hosted execution

Pending initial reviewed workflow publication. Local passes do not establish hosted proof. This evidence will record actual run URLs, triggering commits/events, results, versions, cache behavior and cleanup, including bounded repairs or blockers.

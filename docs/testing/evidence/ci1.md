# CI1 verification evidence — 2026-10-28

Approved bounded CI packet; baseline `dc5cc31b0c8d116029af62e6ba0c2d3be3a8f440` matched origin with a clean worktree. No product behavior or dependency pins changed.

## Workflow contract

[Workflow](../../../.github/workflows/ci.yml) runs on pushes to develop/master/the existing foundation branch, and PRs targeting develop/master. No top-level path filter. Pushes with an open PR to a covered base perform lightweight checks and delegate heavy verification to the PR merge-revision run; public API lookup failure retains verification. Other feature branches receive PR checks. Concurrency cancels superseded runs per branch or PR. The stable `result` job rejects failed/cancelled/unexpectedly skipped prerequisites. No branch protection was changed.

The Python classifier uses event base/head revisions and NUL-delimited no-rename Git diff. Missing/zero/unavailable base, deletion, rename (as deletion/addition), mixed backend/frontend, shared/configuration/lock/test/helper and unknown paths select full checks. Docs-only changes select JSON/JSONL/local Markdown target/61 unique requirement-row/whitespace validation. Backend changes run API/DB plus built frontend/browser; frontend source changes build the backend for real browser journeys and skip only the standalone API/DB regressions. Full runs execute both. Helper regressions exercise classifications, failure/cancellation aggregation and malformed JSON/missing links/incomplete coverage.

Official action release tags and full commits were resolved through the GitHub API on 2026-10-28. All four `action.yml` runtimes verified node24, supported by current GitHub-hosted Ubuntu24 runners: checkout v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`; setup-node v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1`; setup-dotnet v6.0.0 `a98b56852c35b8e3190ac28c8c2271da59106c68`; upload-artifact v7.0.2 `cf430e030ddbb5b0abf93d22962f4752f3646cd9`. Sources: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [Node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [.NET](https://github.com/actions/setup-dotnet/releases/tag/v6.0.0), [artifacts](https://github.com/actions/upload-artifact/releases/tag/v7.0.2).

Read-only contents token, nonpersisted checkout credentials, standard `ubuntu-24.04`, no secrets/services/deployments. NuGet global packages and npm downloads use lockfile-keyed setup-action caches; no node_modules/browser/container/database cache. Chromium alone is installed after npm ci. Failure artifact is one fixed-schema JSON status file capped at 1 KiB, three-day retention; raw logs, traces, cookies, screenshots, credentials and DB state are excluded. Successful screenshot matrices remain ephemeral. Existing single-worker ordering and cleanup acknowledgement are unchanged; independent inventories check teardown. Forced kill/runner loss cleanup is not guaranteed.

## Local checks

- Helper tests: five test methods with classification/result/failure subcases passed; JSON/JSONL/Markdown/61-row validation passed. PyYAML parsed all three jobs; hosted parser/execution remains a separate requirement.
- Locked restores and single-worker no-restore backend builds passed, zero warnings/errors.
- Strict E2E/config/teardown TypeScript and production frontend build passed. Initial frontend invocation lacked npx on that directory's shell PATH; reran successfully with the existing exact Node installation on PATH. No installation/global change.
- Real local suites passed: 21 API (49s), 3 original DB (12s), 13 browser (45.0s), no skips/retries. Independent container/volume/cleanup-marker inventories empty. Generated qa.json changed synthetic UUIDs only and was restored to the pre-run version. No new visual-design acceptance claimed.

## Hosted execution

Actual hosted execution is recorded below; local passes are separate evidence. PR merge-event behavior and push deduplication have helper coverage but were not exercised by opening a PR in this packet. Failure artifact upload and forced cancellation were not deliberately induced.

Initial hosted run [40728784594](https://github.com/duochou042004/keemese/actions/runs/40728784594), push at `34453acb136e3fac2add33ec34bb97fbbf16e5e6`, failed correctly in docs validation (checks 5s; result also failed; verify skipped). Historical ignored PNG links existed locally but not in checkout. Converted those references to explicit local path notes; strengthened validator to reject unversioned targets even when present locally and added an ignored-file regression. No PNGs added. Full hosted rerun follows repair.

Full hosted [run 40728940993](https://github.com/duochou042004/keemese/actions/runs/40728940993), push `23dc172e117965095425d1d6df3d2453f91ea141`: checks and verify passed. Verify job ran 16:44:45–16:47:58 UTC (3m13s); 21 API (47s), 3 original DB (8s), 13 browser (47.1s), no skips/retries. Exact SDK 10.0.403/Node 24.22.1/npm 11.19.1; rootless Podman 4.9.3 worked with the unchanged fixture/image. Strict TypeScript/build and independent empty container/volume/marker checks passed. NuGet/npm caches were cold and saved at job end; no success artifact uploaded. Standard runner image versions reported 20261021.618 and 20261025.353.1. This proves hosted compatibility, not other OS/crash cleanup.

Final hardening adds a 1 KiB failure-report bound, conservative unknown-extension classification, full fallback before deduplication when base revisions are unavailable, same-SHA/covered-base PR checks and a real temporary-Git spaced-filename/rename regression. Five local helper methods and YAML policy checks pass. Final hosted verification of that workflow/helper revision and the separate docs-only path follow.

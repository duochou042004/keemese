# F0b PostgreSQL integration evidence

Executed 2026-10-27 on Linux x64, .NET SDK 10.0.403/runtime 10.0.14 and rootless Podman 5.8.6. Started with a clean `feature/f0-foundation` at `d932c3c62dd0942aff67977a4a65d7a9f83afe07`. Explicit F0b approval covered image download, synthetic tests and owned-container cleanup. F0b changes remain unstaged/uncommitted.

## Implementation and pins

[Database tests](../../../backend/Keemese.Database.Tests/PostgresTests.cs) and [lifecycle helper](../../../backend/Keemese.Database.Tests/DisposablePostgres.cs) live in a separate test project outside the ordinary API solution. No application dependency, endpoint, business entity or migration was added. The test entity `Probe` exists only in the disposable test database.

- Server: `docker.io/library/postgres:18.6-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5`; image config ID `57b23a0326ee442e83b3d3fa027c5a148be0a392d7c91d1ca4e1e70131ee859a`. `SHOW server_version_num` asserted `180006`.
- EF Core and Relational: 10.0.14; Npgsql and Npgsql EF provider: 10.0.3. Direct exact ranges and [NuGet lock](../../../backend/Keemese.Database.Tests/packages.lock.json) fix the resolved graph.
- The [provider package metadata](https://www.nuget.org/packages/Npgsql.EntityFrameworkCore.PostgreSQL/10.0.3) supports EF 10; restore/build and execution verified this selected combination. The [official PostgreSQL image documentation](https://hub.docker.com/_/postgres) identifies the PostgreSQL 18 volume root as `/var/lib/postgresql`, which the helper overrides with tmpfs.

## Executed checks

| Check | Result |
|---|---|
| `podman info --format '{{.Host.Security.Rootless}}'` | Passed: `true` |
| Image pull by exact 18.6 tag, followed by documented immutable digest pull | Both exit 0 |
| Initial project restore/build and test run | Passed: 3/3; initial transitive EF Relational resolved 10.0.4 |
| Align direct EF Relational pin to 10.0.14; regenerate lock | Passed; final EF family resolves 10.0.14 |
| `dotnet clean backend/Keemese.Database.Tests/Keemese.Database.Tests.csproj --verbosity quiet` | Exit 0 |
| Documented locked restore and no-restore build | Both exit 0; build 0 warnings/errors |
| Documented no-build test command, normal console logger | Exit 0; final 3/3 passed, 13.388 seconds |
| Committed Unicode round trip | Persisted ID/text read using a new DbContext/connection; actual server version checked |
| Constraint-triggered rollback | Baseline committed; second write visible inside transaction; duplicate key produces SQLSTATE 23505; rollback removes second write, baseline survives new connection |
| Intentional test-body exception | Expected exception propagated after helper verified container removal |
| `podman ps -a --format '{{.ID}} {{.Names}}'` and `podman volume ls -q` | Empty before tests, after initial run and after final run; no containers or volumes remain |
| JSON/JSONL, local Markdown targets, requirement coverage, changed-file whitespace, source preservation and Git index/refs | Final checkpoint validation recorded in build log |

Full repeatable commands are in the [README](../../../README.md#disposable-postgresql-verification-f0b). Each case creates its own UUID-named/labeled container, loopback ephemeral port, ephemeral password and tmpfs. `finally` checks the ownership label, removes that exact container, and asserts absence. Cleanup errors fail the test. No prune, existing databases/volumes, host mounts, global setup changes, hooks/controller, CI or external writes occurred. Downloaded image and normal NuGet caches intentionally remain.

## Limits and outcome

F0a and F0b foundation acceptance passed. This proves test-only persistence and rollback, not application database readiness, student isolation, authorization or any business acceptance. No UI changes: F0a frontend/browser checks were not rerun. Existing API tests were unchanged and their prior evidence remains in [F0a](f0a.md). Other operating systems/architectures, Docker, host crash, forced test-host kill and runtime-disconnection cleanup were not tested. Recovery after such interruptions is manual, as documented in the README; deterministic cleanup here covers normal completion and caught exceptions while Podman remains available.

Stop at the F0b packet boundary. Publishing F0b and implementing I1 each require separate user authorization.

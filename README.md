# Keemese

**A focused teaching workspace for one tutor and their students.**

![.NET SDK 10.0.403](https://img.shields.io/badge/.NET_SDK-10.0.403-512BD4?style=flat-square&logo=dotnet&logoColor=white)
![React 19.3.1](https://img.shields.io/badge/React-19.3.1-149ECA?style=flat-square&logo=react&logoColor=white)
![TypeScript 7.0.2](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vite 8.3.5](https://img.shields.io/badge/Vite-8.3.5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS 4.3.3](https://img.shields.io/badge/Tailwind_CSS-4.3.3-0891B2?style=flat-square&logo=tailwindcss&logoColor=white)
![Node.js 24.22.1](https://img.shields.io/badge/Node.js-24.22.1-417E38?style=flat-square&logo=nodedotjs&logoColor=white)
![npm 11.19.1](https://img.shields.io/badge/npm-11.19.1-CB3837?style=flat-square&logo=npm&logoColor=white)

[New-device handoff](docs/delivery/device-handoff.md) · [Resume goal](docs/delivery/resume-goal.md) · [Quick start](#prerequisites) · [Local preview](#run-locally) · [Current verification](docs/testing/evidence/c1e-text-copy.md) · [Project docs](docs/README.md) · [Roadmap](docs/delivery/plan.md)

## At a glance

| Available now | Verified database foundation | Planned teaching workspace |
|---|---|---|
| Identity UI and tutor-created student accounts (I1a/I1b) | Real PostgreSQL identity/isolation tests | Materials/questions/grants and student activity |
| Bilingual account flows; tutor text folders/search/tags/copy | Real database round-trip and rollback checks | Lesson plans, assignments and private notes |
| Exact dependency pins, locks and reproducible setup | Test-owned resource cleanup | Teaching workflows follow their own approval gates |

Badges describe the pinned stack, not live CI or deployment status. Current verification evidence is linked above.

UI screenshots are generated locally by browser verification and excluded from Git. See [identity verification evidence](docs/testing/evidence/i1b.md) for checks and local preview paths.

## Current scope

Private single-tutor workspace under development. I1a adds backend identity, tutor-only student provisioning/reset/deactivation, mandatory password rotation and student self-profile isolation. I1b adds Vietnamese login, forced password change, tutor account management and student self-account screens. Tutor-only reusable plain text now supports nested folders, search, reusable tags, active/archive lifecycle and independent saved-source copies; see [C1e evidence](docs/testing/evidence/c1e-text-copy.md) and [portable handoff](docs/delivery/device-handoff.md). The project is paused by user as of2026-10-30; no next implementation is approved. The old machine’s rootless Podman storage/image cache was explicitly reset after handoff publication; future disposable tests require the pinned image again after setup approval. Teaching activity workflows remain separately gated. Verification uses synthetic disposable data only. See [I1a backend evidence](docs/testing/evidence/i1a.md) and [I1b browser evidence](docs/testing/evidence/i1b.md) for results and limits.

## Prerequisites

Use .NET SDK **10.0.403** (includes ASP.NET runtime 10.0.14), Node **24.22.1**, and npm **11.19.1**. `global.json` requires the exact SDK; `frontend/.nvmrc`, package engines and `.npmrc` identify/enforce the tested Node/npm versions. If using nvm, activate the already-installed version with `nvm use 24.22.1` before running npm. No global installation is part of this packet.

## Restore and verify

From repository root (API lifecycle tests now require rootless Podman and the digest-pinned PostgreSQL image described below):

```sh
dotnet restore Keemese.slnx --locked-mode
dotnet build Keemese.slnx --no-restore
dotnet test Keemese.slnx --no-build
cd frontend
npm ci
npm run typecheck
npm run build
cd ..
```

NuGet `packages.lock.json` files and npm `package-lock.json` pin the resolved graph. Direct package versions are exact; intentional dependency changes require regenerating and reviewing locks. Normal restores populate user caches. On a first .NET invocation, the SDK may initialize local state and create an untrusted development HTTPS certificate; this application does not need or trust it. No environment file or secret is needed for F0a.

## Disposable PostgreSQL verification (F0b)

Requires working **rootless Podman** (verified with 5.8.6 on Linux x64). The database project is intentionally outside `Keemese.slnx`: the liveness tests alone need no container runtime, while I1a API lifecycle tests reuse its disposable helper. Run these additional commands from repository root to verify the complete foundation:

```sh
podman info --format '{{.Host.Security.Rootless}}'
podman pull docker.io/library/postgres:18.6-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5
dotnet restore backend/Keemese.Database.Tests/Keemese.Database.Tests.csproj --locked-mode
dotnet build backend/Keemese.Database.Tests/Keemese.Database.Tests.csproj --no-restore
dotnet test backend/Keemese.Database.Tests/Keemese.Database.Tests.csproj --no-build
```

The image is pinned by digest and the server version is asserted as 18.6. The F0b project pins EF Core/Relational 10.0.14 and Npgsql/provider 10.0.3. I1a adds Identity/EF 10.0.14 and provider 10.0.3 to the API, with exact lockfiles. Tests refuse rootful Podman, missing images, and external connection strings. Each case creates its own `keemese-f0b-<random-id>` container with a matching `io.keemese.test-owner` label, random password and loopback-only random port. Database files use a 256 MiB tmpfs at `/var/lib/postgresql`; no existing database, host bind mount or persistent volume is used.

Tests verify Unicode persistence through a new connection, rollback after a duplicate-key failure, and cleanup after an intentionally thrown test exception. Cleanup checks ownership, removes the exact container and verifies absence in `finally`; failures fail the test. Readiness is bounded to 45 seconds and each Podman subprocess to 60 seconds. Cached image layers and NuGet packages remain for repeat runs.

A forced test-host kill, machine crash or unavailable Podman can prevent cleanup; automatic crash recovery is not claimed. Inspect `podman ps -a --filter label=io.keemese.test-owner` if a run is interrupted. Check the exact container's name and ownership label before removing only that test container with `podman rm --force <verified-container-id>`. Never use prune or delete unrelated containers/volumes. See [F0b evidence](docs/testing/evidence/f0b.md) for executed checks and limitations.

## Run locally

Terminal 1, repository root:

```sh
dotnet run --project backend/Keemese.Api --no-build --no-launch-profile --urls http://127.0.0.1:5080
```

Terminal 2, repository root:

```sh
cd frontend
npm run dev
```

Open [the local workspace](http://127.0.0.1:5173). It presents a Vietnamese login form. Login/account operations require an explicitly configured, compatible database and provisioned tutor; no persistent database has been created by these packets. The browser requests same-origin `/api/v1` URLs through the loopback API proxy. No permissive CORS is needed. Stop both servers before running browser tests; tests refuse to reuse occupied ports.

For a built preview, run `npm run preview` from `frontend` after building and open [the preview](http://127.0.0.1:4173). Vite dev/preview are local tools, not production hosting. Stop servers with Ctrl+C when finished. The repeatable browser test command below creates its own complete synthetic workspace and cleans it up afterward.

Optional direct HTTP check while API runs:

```sh
curl --fail --include http://127.0.0.1:5080/api/v1/health/live
```

Expected: HTTP 200, JSON content type, body `{"status":"ok"}`. Liveness proves that the process answers HTTP; it does not claim database readiness or access protection. Liveness tests boot the actual entry point through ASP.NET `WebApplicationFactory` and check the public contract, private-route authentication and rejected liveness POST. Additional identity integration tests create their own real PostgreSQL containers.

## Backend identity pilot (I1a)

Run `dotnet test Keemese.slnx --no-build` after the locked restore/build above. Tests create and destroy synthetic databases themselves, including concurrent provisioning, profile rollback, isolation, credential/session lifecycle, controlled timing and actual Linux terminal operator modes. No external connection string is accepted by the disposable helper. To run only DB-independent health checks: `dotnet test Keemese.slnx --no-build --filter FullyQualifiedName~LivenessTests`.

The API reads `ConnectionStrings__Workspace` from process-local configuration. No credential is committed, no schema is created on startup, and no persistent database was provisioned. The EF model is instantiated with `EnsureCreatedAsync` only in test-owned databases; a deployable migration/rehearsal needs a later approved packet. The local startup above can show the login screen without provisioning a database; actual account operations require the approved compatible database setup.

Implemented offline modes are `dotnet backend/Keemese.Api/bin/Debug/net10.0/Keemese.Api.dll identity-bootstrap` and `identity-recover` (substitute the final argument). They require an interactive terminal and a preprovisioned compatible database; do not run them on a persistent database without the separate operational approval. Passwords are hidden, never arguments; recovery requires typing `RECOVER`. Bootstrap refuses an existing tutor, while recovery affects that tutor only and revokes all sessions.

Identity transport requires HTTPS; the explicit Development exception requires both a loopback host and loopback peer. No permissive CORS or forwarded-header trust is configured. Cookie keys and framework key-management storage are memory-only for this local pilot: restarting the API invalidates browser tickets. Deployment key storage, proxy trust, distributed throttle and persistence/release procedures require later review. The identity UI is verified against a disposable synthetic workspace as described below. Exact endpoint payloads and limits are in the [API contract](docs/backend/api.md#implemented-i1a-contract).

## Identity browser verification (I1b)

After backend locked restore/build, from `frontend`:

```sh
npm ci
PLAYWRIGHT_BROWSERS_PATH="$PWD/node_modules/.cache/ms-playwright" npx playwright install chromium
npm run typecheck
npm run build
npm run test:e2e
```

Playwright **1.64.1** is exact/locked. Browser binaries stay in ignored project-local `node_modules/.cache`; `npm ci` replaces that directory, so install the local browser again after a clean install. No browser or OS dependency installation is automatic. Kali was verified using Playwright's Ubuntu24.04 fallback Chromium build; other systems/browsers are unverified.

The current 32 scenarios (through C1e) use built frontend assets and a loopback test host on ports 5173/5080. The opt-in `UiTestHost` test seeds only its own digest-pinned tmpfs PostgreSQL, bridges the real API, and exposes capability-gated test clock/stop controls only in that test process. Normal application startup exposes none of those controls. Teardown waits for explicit post-container-removal acknowledgement, then stops the owned processes. Forced-kill/crash cleanup remains manual; use the exact-owner procedure above.

Tests cover the two-student account lifecycle, reset/deactivation of open sessions, recovery/error states, stale-user requests, eight widths, short height and actual 200% browser zoom. A tiny unpacked zoom extension is loaded only into a disposable test browser profile, removed with that profile; no user browser is changed. Synthetic screenshots and measurements live under `frontend/e2e/artifacts`; credentials, tokens and traces are not persisted. See [I1b evidence](docs/testing/evidence/i1b.md) for the original checks and [bilingual evidence](docs/testing/evidence/bilingual-ui.md) for current English/Vietnamese switching, storage/focus checks, 96 viewport/language cases and 12 actual zoom cases. The tutor-only text library adds create/edit/archive/restore journeys; see [C1a evidence](docs/testing/evidence/c1a-text-library.md). CI implementation and hosted outcomes are recorded in [CI1 evidence](docs/testing/evidence/ci1.md). Retained-data schema migration and production setup remain pending.

## Scope and evidence

See [delivery plan](docs/delivery/plan.md), [verification strategy](docs/testing/strategy.md), [current checkpoint](harness/state/progress.json), and [build log](harness/logs/build-log.md). Current implementation commands above supersede the earlier planning-only command placeholders. Linux is the verified environment; other OS/browser combinations remain unverified.

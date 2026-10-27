# F0a verification — 2026-10-27

Environment: Linux, .NET SDK 10.0.403/runtime 10.0.14, Node 24.22.1/npm 11.19.1; in-app browser. Scope: development shell only, no real student data. [Final desktop screenshot](f0a-shell.png).

| Check | Actual result |
|---|---|
| Clean NuGet restore | Removed only newly generated API/test `obj` directories, then `dotnet restore Keemese.slnx --locked-mode`: exit 0; both locks unchanged |
| Backend build | `dotnet build Keemese.slnx --no-restore`: exit 0, zero warnings/errors |
| HTTP integration | `dotnet test Keemese.slnx --no-build`: exit 0; 3 passed, 0 failed/skipped (contract, 404 unimplemented route, 405 mutation) |
| Clean npm restore | `cd frontend && npm ci`: exit 0, 43 packages; audit reported 0 known vulnerabilities |
| Frontend | `npm run typecheck` and `npm run build`: exit 0; build repeated after narrow-layout fix |
| Real HTTP | API run with README command; curl returned HTTP 200, JSON content type, exact `{"status":"ok"}` |
| Built UI | `npm run preview`, route `/` at loopback 4173: API connected displayed through Vite proxy |
| Failure/recovery | Stop API, click Check again → API unavailable; restart API, activate retry with Enter → API connected without reload |
| Loading | Checking connection and disabled Checking button observed during retry |
| Console | Browser log API returned no warning/error entries; Vite terminal emitted expected ECONNREFUSED while API intentionally stopped |
| Cleanup | API Ctrl+C exit 0; preview Ctrl+C exit 130 (intentional); test tab closed, viewport override reset |

Visual inspection covered requested widths 320, 360, 390, 430, 768, 1024, 1280 and 1440. Initial 320×568 outage inspection exposed horizontal scrolling caused by body min-width plus a vertical scrollbar. Removed the minimum width; rebuilt/reloaded and confirmed document client/scroll width both 305 in connected and unavailable states. Retry control measured 48px high. Desktop 1024×800 final screenshot is retained. Larger-width initial screenshots showed readable wrapping without clipping. A rapid post-fix viewport loop produced stale dimensions for two widths, and a full-page capture after reset was inconsistent with DOM geometry; those captures are not counted as fresh final matrix proof. Settled desktop capture was rechecked separately.

Limits/skips: full final eight-width visual matrix, 200% zoom, measured contrast, screen-reader behavior and visible Tab-focus traversal were not completed. Enter activation was verified, but that alone is not full keyboard accessibility QA. Timeout/malformed-payload branches are implemented but not separately browser fault-injected. No additional E2E framework/browser download, cross-browser/OS coverage, database test, production hosting or continuous monitoring claim. These broader gates remain for later approved packets; bounded F0a browser smoke passed.

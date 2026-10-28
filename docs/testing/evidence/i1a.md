# I1a backend identity evidence — 2026-10-28

Environment: Linux x64, .NET SDK 10.0.403 / ASP.NET 10.0.14, rootless Podman 5.8.6, existing util-linux `script` PTY, digest-pinned PostgreSQL 18.6 image from F0b. Synthetic data only. User approval is recorded in the [scope packet](../../delivery/i1-readiness.md#approval-record). Branch `feature/f0-foundation`, HEAD `d932c3c62dd0942aff67977a4a65d7a9f83afe07`; index/refs preserved, no commit/push. Original F0b source/helper remains unedited and is linked into API tests.

## Implemented boundary

Framework Identity user/EF model and password hasher, framework protected HttpOnly/SameSite cookie, CSRF/origin checks, strict typed DTOs and Vietnamese generic Problem Details. PostgreSQL enforces unique normalized usernames, one tutor and one student profile per student user. Identity writes use a transaction-scoped advisory lock, and creation/reset/deactivation/password/recovery audit and revocation commit atomically. Sessions and active account state are checked for each authenticated request; revoked/expired cookies return 401, unavailable DB state returns safe 503. Health stays anonymous and DB-independent, even with a previously valid cookie.

Only the [implemented API contract](../../backend/api.md#implemented-i1a-contract) is delivered. Student self reads derive ownership from the authenticated account and expose only own ID/name/username; no contacts, guardian/private notes or teaching models/endpoints were added. Offline modes bootstrap one tutor or explicitly recover the existing one, hide passwords, reject extra args/redirected input and never start an HTTP listener. No persistent DB/schema command was executed. Test-only `EnsureCreatedAsync` exercises the real relational model; no deployable versioned migration is claimed.

## Executed commands and results

| Check | Result |
|---|---|
| Exact Identity/EF 10.0.14 / Npgsql provider 10.0.3 restore, lock review | Passed; EF family resolves 10.0.14, Npgsql 10.0.3 |
| Initial compile | Passed before test harness; harness then had two compiler errors, corrected |
| First 13-case runtime run | 11 passed, 2 failed: liveness test transport and EF record-projection filter; corrected |
| Expanded complete API/real-DB/PTY run | 17/17 passed, no skips, 47 seconds |
| Rolling-throttle/dummy-hash review, locked restore/build/API run | 17/17 passed, no skips, 47 seconds |
| `dotnet clean Keemese.slnx --verbosity quiet` | Exit 0 |
| `dotnet restore Keemese.slnx --locked-mode` | Exit 0 |
| Clean parallel-worker build attempt | Failed MSB4166 (child node exited); reported `/tmp` diagnostics directory was absent when inspected; no cause established |
| `dotnet build Keemese.slnx --no-restore --maxcpucount:1` | Exit 0, zero warnings/errors |
| `dotnet test Keemese.slnx --no-build --logger 'console;verbosity=minimal'` | Exit 0; 17/17 passed, no skips, 48 seconds after hashless-account guard/regression |
| F0b clean, locked restore, no-restore build | All exit 0; build zero warnings/errors |
| `dotnet test backend/Keemese.Database.Tests/Keemese.Database.Tests.csproj --no-build --logger 'console;verbosity=minimal'` | Exit 0; original 3/3 passed, no skips, 12 seconds |
| Final JSON/JSONL, local Markdown targets, requirement rows, source preservation and whitespace | Passed JSON/JSONL, Markdown file targets/fences, 61 unique requirement rows, original source bytes and changed-file whitespace |
| Final container/volume inventory and Git index/refs | Empty container/volume inventories; no API/testhost process; empty index and unchanged HEAD/three branch refs |

A final targeted run of CSRF/cookie/log safety, malformed DTO safety and production/Development transport passed 3/3 (10 seconds), after log capture was expanded to include exception text; its build also passed with zero warnings/errors.

The final build/test follows strict required-constructor parsing and added actual DB uniqueness/hash/session/cookie-log assertions. F0b source/helper did not change. No frontend dependency restore/build or browser inspection was attempted for backend-only I1a.

## Acceptance mapping

| Approved acceptance | Actual proof |
|---|---|
| 1. Authorized/atomic provisioning, concurrency and uniqueness | Anonymous/student create denied; concurrent case-folded duplicate creates yield 201/409; profile-insert failure injected after account save rolls account back; concurrent first bootstrap has one success/one conflict; direct DB duplicate username/second-tutor writes fail |
| 2. Two-student isolation and tampering | Two distinct rotated accounts return distinct own profiles with exact three-field DTO; existing/random tutor targets, list/create/reset/deactivate all deny students; query/body student/role selectors reject; tutor create rejects role/ID/status/flag fields |
| 3. First/reset password restriction | Temporary login permits auth/me but profile denies with `password_change_required`; unchanged/current-invalid password rejected; change revokes both sessions, old temporary password fails, new credential reads own profile; reset re-enters restricted state |
| 4. Next-request revocation/time/fail-closed | Reset/deactivate/change/recovery reject old cookies across two sessions, including captured-cookie replay; logout rejects replay and leaves second session valid; controlled time proves absolute eight-hour cookie lifetime/no sliding renewal, server expiry, five-failure 15-minute lockout and rolling 10/60-second/IP throttle; dropped session table denies private request while health works |
| 5. CSRF/origin/transport/cookies | Missing/invalid CSRF and foreign origin reject login/logout; shared middleware covers POST mutations; production auth cookie Secure/HttpOnly/Lax/nonpersistent; insecure production denied; HTTP Development permitted only with loopback host and peer; CORS preflight has no permissive allow-origin |
| 6. No sensitive output/operator invariants | Exact auth/student DTO fields, Problem Details and captured logs scanned for synthetic passwords, actual hashes/session IDs and captured cookie; unauthorized roster reveals no profile name; real PTY tests prove hidden input, cancelled recovery, repeated bootstrap refusal, recovery of only existing tutor and no HTTP listener; missing tutor recovery fails |
| 7. Locked reproducibility/regressions/cleanup | Locked restores and clean zero-warning build, final API and original F0b suites; ownership-scoped test cleanup and final inventories; index/refs unchanged |

## Side effects, limitations and stop

The first test-host startup unexpectedly wrote one framework Data Protection key under the user profile despite `UseEphemeralDataProtectionProvider`: the framework key-management warmup has a separate repository. Removed only the identified test-created key, then configured an in-memory XML repository too. Subsequent startup/test logs and direct inspection verified no remaining key file; the exact empty test-created key directory and its empty `.aspnet` parent were removed afterward, as recorded in the build log. This was an accidental side effect, not approved global setup. Normal NuGet caches and the existing image cache remain.

Memory-only key protection means restarting the API invalidates browser tickets. Session/audit retention, a versioned deployable migration, persistent provisioning/recovery, durable key storage, proxy trust, distributed throttling and deployment remain future review. IP throttle is in-process; no scaled-deployment guarantee. The advisory lock serializes this small workspace's identity writes; high-concurrency performance was not benchmarked. The single-worker retry passed after an unexplained MSBuild process failure; no broader build-host reliability claim.

Real PostgreSQL proof uses fresh tmpfs databases and real API cookies/antiforgery. State failure was injected by dropping the session table in a test-owned DB, not by disrupting external infrastructure. Cleanup covers normal completion/caught exceptions with a working runtime; forced kill/crash/disconnection remains untested. Linux PTY proof does not establish Windows/macOS behavior. No UI, browser/accessibility/width/zoom QA, complete A1 E2E, future-route A9 or A10 acceptance is claimed. Stop at the I1a checkpoint; I1b and Git publication require their separate approval. No automatic context monitor/handoff was implemented or claimed.

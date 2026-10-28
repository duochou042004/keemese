# I1 readiness proposal — 2026-10-28

I1b approval/outcome — 2026-10-28: user explicitly approved the next planned I1b task **in this current session**, superseding the earlier fresh-chat-only condition for this packet. I1b is implemented and verified; [browser evidence](../testing/evidence/i1b.md) records results and limitations. CI, Git publication and later product packets remain separate. The dated proposal below retains the original scope/approval history.

Execution update — 2026-10-28: approved I1a backend work is implemented; [evidence](../testing/evidence/i1a.md) records real acceptance results and limitations. The dated proposal/approval below remains the scope owner. I1b and Git publication remain separately gated. No persistent database was operated.

Status: recommendations and I1a execution approved by user on 2026-10-28; I1b remains separately gated. This review changes documentation only. Foundation evidence is retained in [F0a](../testing/evidence/f0a.md) and [F0b](../testing/evidence/f0b.md); tests were not rerun here. Verified branch `feature/f0-foundation`, HEAD `d932c3c62dd0942aff67977a4a65d7a9f83afe07`, empty index and unstaged F0b. Preserve that work; no Git publication is included.

Authority: specification sections 3–4 (two roles, tutor-created accounts, optional contacts), 37 (isolation/private data) and 40–41 (progressive, task-based UI), read directly for this proposal. Coverage: [A0/A1/A9 and partial A10](../product/requirements.md#acceptance-scenarios). Full A9 across future teaching/file routes and full A10 remain future acceptance. This proposal does not create private-note, content, plan or assessment models.

## Decisions requiring user acceptance

The user accepted these recommendations on 2026-10-28. Deferred portions remain unresolved.

| Gate | Concrete recommendation | Consequence / alternative |
|---|---|---|
| ADR03 identity subset | ASP.NET Core Identity password facilities, same-origin HttpOnly cookie, Secure outside isolated loopback development, SameSite=Lax, explicit antiforgery token for every POST including login/logout; origin checks; no browser token persistence. Database-backed session validation on every authenticated request; fail closed if state is unavailable. | Per-request DB cost buys next-request denial after revocation. Files/snapshots and the remainder of ADR03 stay unresolved. No public Identity registration/reset routes are mapped. |
| D05 bootstrap | Explicit offline host command, hidden password prompt, no password in args/logs; transaction and DB constraint enforce exactly one tutor. Re-running bootstrap fails without changing credentials. | No web setup endpoint or startup default password. Command is implemented/tested with synthetic data only here; operating on any persistent DB requires later approval. |
| D05 tutor recovery | Offline operator command resets the existing tutor only, requires an explicit recovery operation and confirmation, hidden password input, rotates credentials/revokes sessions and audits metadata. | Requires operator access to the host/DB. No email recovery, second tutor or automatic reset. MFA deferred to deployment/security review. |
| D05 student reset/first login | Tutor manually supplies a temporary password on create/reset and hands it to student outside the app. Mandatory change before any student-data access. Reset revokes all sessions and re-enters restricted password-change state. | No automatic email/message and no retrievable password. Password change revokes all sessions including current; sign in again with new password. |
| D05 session/password policy | Nonpersistent cookie, 8-hour absolute lifetime, no sliding renewal/remember-me. Logout revokes current session; password change/reset/deactivate revoke all. Password 12–128 characters, spaces/Unicode allowed, no composition rule; reject unchanged temporary password. Login limited to 10 attempts/minute/IP and account lockout after 5 failed attempts for 15 minutes; uniform invalid/inactive/locked errors. | Initial conservative product settings, explicitly subject to user choice. Tests use controlled time. Throttle storage is single-process for local pilot; deployment scaling remains a later review. |
| D06 applicable UI | Vietnamese-first labels/errors, entered names/content unchanged; initial verified browser scope is the available Chromium browser on this Linux environment. All eight widths, keyboard and zoom checks still apply. | Additional browsers/OS support require later verification; no Safari/Firefox/mobile-device claim. Timezone/scheduling parts of D06 remain unresolved and are not needed for identity. |

Framework references checked during this review: [Identity security-stamp interval source](https://source.dot.net/microsoft.aspnetcore.identity/SecurityStampValidatorOptions.cs.html), [antiforgery documentation](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery?view=aspnetcore-10.0). The default interval does not establish immediate revocation. Use framework cookie protection and password hashing; implement explicit session state and active-user checks rather than relying on the interval alone. Exact APIs/package compatibility must be checked during approved implementation.

## Bounded execution order

Approve design choices independently from execution. Recommend authorizing **I1a only** next, in a fresh chat. I1b needs its own fresh packet and implementation approval after I1a evidence. Neither approval authorizes staging/commit/push, global installs/configuration, CI/hooks/controllers, deployment or persistent DB operations. A schema migration may be authored and applied only to synthetic disposable DBs; no startup auto-migration. Normal pinned local NuGet/npm restores and their caches must be included in the applicable packet approval.

### I1a — backend identity and ownership proof

Deliver the complete API identity lifecycle and operator command behavior, proven only with synthetic test data. Existing liveness stays anonymous and DB-independent; other unmapped business routes stay absent. Configuration reads a connection string from process-local configuration without committing credentials. No server or container is left running at checkpoint.

Allowed implementation paths (no blanket backend/frontend permission):

- Existing `backend/Keemese.Api/Program.cs`, `Keemese.Api.csproj`, `packages.lock.json` within that project.
- New files under `backend/Keemese.Api/Identity/`, `Students/`, and `Persistence/` (including model/migrations); module-specific DTOs/services/policies, not generic frameworks.
- Existing `backend/Keemese.Api.Tests/Keemese.Api.Tests.csproj`, `packages.lock.json`, `LivenessTests.cs`; new `Identity*.cs`, `Student*.cs`, `TestApplicationFactory.cs`, `DisposablePostgres.cs` in that test project. Link the existing F0b helper as test source if practical; preserve original F0b files unchanged. Do not extract a new infrastructure project merely for reuse.
- New root `.env.example` containing placeholders only if needed; `README.md`, `docs/backend/api.md`, `docs/security/threat-model.md`, `docs/operations/runbook.md`, `docs/testing/strategy.md`, new `docs/testing/evidence/i1a.md`; this proposal, delivery plan, decisions and canonical state/log records.

Packages: framework Identity/EF store and provider packages only as needed, aligned with the existing pinned EF 10.0.14/Npgsql 10.0.3 baseline after compatibility verification; exact versions and lockfiles. No browser/test-tool installation in I1a. Reuse rootless Podman and the F0b digest/tmpfs/UUID/ownership cleanup pattern; no broad prune, external DB or persistent volume.

Data: one framework user per tutor/student, unique normalized username, student profile linked uniquely to student user, required display name, active state, mandatory-change flag, concurrency version; revocable expiring session records and minimal credential/status audit metadata. Database uniqueness enforces single tutor even under concurrent bootstrap, and account/profile creation is atomic. Do not store raw passwords or contacts/guardian/private notes in this packet. Optional profile expansion is deferred, so creating a student never requires it.

Constraints: display name trimmed 1–200 characters; username trimmed ASCII letters/digits/dot/underscore/hyphen, 3–64 characters, case-insensitive uniqueness. No client-supplied role, account ID, active state, ownership or credential flags in create. Reject unexpected fields. Students cannot edit profile/status. Deactivate retains history and is idempotent; reactivation/archive/edit are deferred. Reset/deactivate use profile concurrency version; stale requests return 409 without side effects.

| Endpoint / operation | Behavior |
|---|---|
| `GET /api/v1/auth/csrf` | Anonymous token acquisition; token kept in browser memory, no-store; renew after identity transition. |
| `POST /api/v1/auth/login` | Username/password only; generic 401 on invalid/inactive/locked account, 429 for IP throttle; restricted session if mandatory-change. |
| `GET /api/v1/auth/me` | Identity ID/role and mandatory-change flag only; no credentials/private metadata; 401 if revoked/expired. |
| `POST /api/v1/auth/password` | Current/new password; allowed in restricted session; rotate credential and revoke all sessions atomically. |
| `POST /api/v1/auth/logout` | Revoke current session and clear cookie; no reusable old cookie. |
| `GET/POST /api/v1/students` | Tutor only: paginated list (25 default/100 max), or atomic account/profile create; duplicate username 409 is tutor-visible. |
| `GET /api/v1/students/{id}` | Tutor only; students get 403 regardless of guessed/existing ID. |
| `POST /api/v1/students/{id}/credentials/reset` | Tutor only, temporary password plus version; revoke sessions/require change, never return stored credential. |
| `POST /api/v1/students/{id}/deactivate` | Tutor only, version; inactive and sessions revoked in one transaction. |
| `GET /api/v1/me/profile` | Active, fully rotated student only; ownership derived from authenticated user, no selectable student ID/filter. Reject unexpected student selectors. |
| Offline bootstrap/recovery modes | Never served as HTTP endpoints; explicit invocation, synthetic integration tests, transaction/invariant/audit proof. |

Restricted sessions permit only auth/me, password change, logout and CSRF acquisition; student data returns stable 403 `password_change_required`. No cacheable private responses; Problem Details 400/401/403/404/409/429, API errors never HTML redirects. Unknown tutor target returns 404. Student DTO contains only own ID/display name/username; tutor DTO has status/version. A9 proof is limited to these routes and serialized fields; no fake private-note endpoint/test is added.

Acceptance tests must cover:

1. Anonymous/student create attempts fail; concurrent duplicate username/single-tutor requests preserve DB invariants; injected profile-create failure rolls back the account.
2. Two students with distinct profiles: each reads only self; route, query/body role/ownership tampering and all tutor-only operations deny. Unknown and existing tutor-route IDs produce the same student denial.
3. First/reset login cannot read profile before password change; old temporary password fails after rotation; same temporary password rejected; safe auth state remains accessible.
4. Reset, deactivate, change and recovery reject pre-existing cookies on the next request across two sessions. Logout rejects replay of its cookie while another session remains valid. Expiry, lockout and throttling tested with controlled time; DB failure denies private access.
5. Missing/invalid CSRF and disallowed-origin mutations fail, including login/logout; cookie flags verified in production-mode tests, explicit loopback-only development exception tested; no permissive CORS.
6. Logs, Problem Details and serialized DTOs contain no passwords/hashes/session secrets; unauthorized responses reveal no roster/private fields. Recovery cannot create another tutor; bootstrap cannot overwrite one.
7. Locked restore/build and relevant API/real-PostgreSQL tests pass, original liveness and F0b tests pass, cleanup leaves no test containers/volumes. Record commands/results/limitations, empty index and unchanged refs.

Stop after checkpoint and I1a evidence. No UI/complete A1 E2E claim at this boundary.

### I1b — minimal usable identity UI (later approval)

Prerequisites: accepted D06 scope, reviewed I1a evidence and explicit fresh-packet approval. Deliver login, forced password change, logout, tutor student list/create/detail/reset/deactivate and student own-account screen. No placeholder teaching dashboards or navigation to unfinished features. Reset/create password input is explicit; never auto-retrieved. Retain safe name/username on recoverable failure; clear secret fields after attempts. Clear private client state on logout/401/user switch, cancel stale requests, revalidate on focus; no roster preload for students. Do not claim already-rendered bytes can be erased from an offline browser by server revocation.

Allowed paths: `frontend/src/App.tsx`, `main.tsx`, `styles.css`; new `frontend/src/api/`, `auth/`, `students/`, `components/`; `frontend/package.json`, `package-lock.json`, `vite.config.ts`, new `frontend/playwright.config.ts`, `frontend/e2e/`; new `backend/Keemese.Api.Tests/UiTestHost.cs` for a test-owned disposable DB/API host if needed; README, frontend design, testing strategy, new `docs/testing/evidence/i1b.md`, delivery/decisions/canonical records. React Router and Playwright only if needed after checking supported versions; exact locks and local browser download require this packet's approval. No Query/form/component library required for these small forms.

Acceptance: synthetic tutor creates two students; each signs in, changes password, reads own account and logs out. Tutor reset/deactivate produces the expected denial in an existing student browser. Test duplicate username, invalid password, expired session, slow/network error, denied routes and switching users with in-flight requests. Verify Vietnamese labels, long names, loading/empty/success/error states, focus/errors/keyboard and measured contrast at 320/360/390/430/768/1024/1280/1440 CSS pixels, 568px short height and 200% zoom. Record route/scenario/screenshots/console and each result; unavailable browser/QA remains blocked, never reported passed from build alone. Run locked install/typecheck/build and meaningful lifecycle E2E; retain API ownership regressions. Stop at checkpoint; full future A9/A10 remains incomplete.

## Approval record

User explicitly approved the I1 readiness proposal and I1a execution on 2026-10-28: ADR03 identity subset, D05 settings and applicable D06 pilot scope; pinned local dependency restores and synthetic disposable PostgreSQL tests included. Execute I1a only in a fresh chat; I1b and Git publication remain separately gated.

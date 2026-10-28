# API contract proposal

I1a implementation (2026-10-28): identity and student-account routes below are implemented and tested against disposable real PostgreSQL. `GET /api/v1/health/live` remains anonymous and DB-independent. Teaching/file routes in the original planning table remain proposals. See [evidence](../testing/evidence/i1a.md).

Status: the original route-family planning table remains a proposal; the implemented I1a subset is specified separately below. No generated OpenAPI is claimed. Owner: backend. Base `/api/v1`, same-origin JSON, UUID resource IDs, UTC ISO timestamps plus explicit timezone where scheduling needs it. T=tutor, S=own student only. Every nested ID is independently authorized.

| Route family | Methods/actions | Role and acceptance |
|---|---|---|
| `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/password` | POST login/logout/change; GET me | Anonymous login only; A1 |
| `/students`, `/students/{id}` | GET/POST, GET/PATCH; deactivate/archive actions | T; A1/A2 |
| `/students/{id}/credentials/reset` | POST temporary reset, revoke sessions | T; D05, A1 |
| `/me/profile`, `/me/dashboard` | GET | S; A2/A8 |
| `/students/{id}/goals`, `/metrics`, `/learning-plans` | GET/POST/PATCH; item order/state actions | T writes; S authorized reads; A2 |
| `/content`, `/folders`, `/questions` | GET/POST/PATCH/DELETE unused draft; duplicate/archive | T only; search/cursor/filter/tag; A3/A5 |
| `/materials/uploads`, `/materials/{id}` | POST upload; GET metadata; PATCH rename; archive | T; S upload restricted submission attachment via own attempt route |
| `/materials/{id}/download` | GET authorized stream or short-lived scoped URL | T or granted S; A3/A9 |
| `/lesson-definitions`, `/sessions` | GET/POST/PATCH; reschedule/cancel | T writes; S own session reads; A4 |
| `/sessions/{id}/complete` | POST completion bundle | T; atomic metadata, idempotent; A4 |
| `/assignment-definitions`, `/assessment-definitions` | GET/POST/PATCH; sections/questions; archive | T; A5/A6 |
| `/student-assignments`, `/student-assessments` | POST assign; GET lists/detail | T assigns; S own student-safe DTO; A5/A6 |
| `/student-assignments/{id}/submissions` | POST draft/start; PATCH answers; POST submit | S own, T review; A5 |
| `/student-assessments/{id}/attempts` | POST start; GET resume; PATCH answers; POST submit | S own within server rules; A6 |
| `/reviews/{targetType}/{id}` | GET review, PUT grade/feedback; POST publish | T writes; S released read via result endpoint; A7 |
| `/students/{id}/progress`, `/me/results` | GET | T / own S; A8 |
| `/students/{id}/private-notes` | GET/POST/PATCH/archive with typed target | T exclusively; A9 |

Pagination defaults proposed: 25, max 100; stable cursor/order; whitelist sort/filter; reject unbounded lists. Limits are adjustable engineering proposals, not product facts. Requests validate length/format/type/ownership on server; client validation is convenience. User-defined tags are data, never executable code.

Response envelope: resource DTO or `{items,nextCursor}`. Error contract: Problem Details with `status`, stable `code`, `traceId`, optional field `errors`; no stack, answer key or existence leak. 400 validation, 401 authentication, 403 forbidden role, consistent 404 for inaccessible resources, 409 stale version/state conflict, 413 upload too large, 429 throttling. Do not use 200 with embedded errors.

Example completion request shape: `{version, attendance, privateNote, materialIds, homework:{definitionId,deadline}}`; send an idempotency key for retry. Server returns `{sessionId,version,assignedWorkIds,savedAt}`. Same key + same payload returns original result; changed payload with same key conflicts; key retention period is an operational decision. Nothing returns the private note to student endpoints.

Example attempt read: `{id,state,startedAt,expiresAt,serverNow,questions:[{snapshotId,type,prompt,options}],savedAnswers,version}`. Exclude correct answers/explanations until approved release policy. Server evaluates expiry and submission atomically; UI countdown never authorizes extra time.

API integration checks must prove wrong-student access denial for each family, idempotent retry, concurrency conflict, invalid transition, and rollback of completion bundles. Final OpenAPI, exact payload field constraints and upload limits belong to the approved implementation packet; no endpoint is available now.

## Implemented I1a contract

Same-origin JSON under `/api/v1`; UUIDs; noncacheable private responses. All POSTs require an exact same-origin `Origin` header and the `X-CSRF-TOKEN` acquired from `GET /auth/csrf`. Refresh that token after login/logout/password changes because antiforgery binds it to identity. Every authenticated request checks active account and unrevoked/unexpired session in PostgreSQL; unavailable state returns safe 503, revoked/expired state 401. Errors are Problem Details with stable `code` and `traceId`, with a Vietnamese title and no exception/credential detail.

| Operation | JSON input / response |
|---|---|
| `GET /auth/csrf` | `{token}`; anonymous, no-store |
| `POST /auth/login` | `{username,password}` → `{id,role,mustChangePassword}`; generic 401 invalid/inactive/locked, 429 throttled |
| `GET /auth/me` | `{id,role,mustChangePassword}` only |
| `POST /auth/password` | `{currentPassword,newPassword}` → 204, revokes all sessions and clears cookie |
| `POST /auth/logout` | Empty object/body → 204, revokes only current session and clears cookie |
| `GET /students?page=1&pageSize=25` | Tutor only, `{items,nextPage}`; stable UUID order; page positive up to 1,000,000, size 1–100; unknown filters rejected |
| `POST /students` | Tutor only, `{username,displayName,temporaryPassword}` → 201 tutor DTO; atomic account/profile/audit; duplicate 409 |
| `GET /students/{id}` | Tutor DTO; unknown target 404; all student callers 403 |
| `POST /students/{id}/credentials/reset` | Tutor only, `{temporaryPassword,version}` → updated tutor DTO; revokes all sessions, requires password change |
| `POST /students/{id}/deactivate` | Tutor only, `{version}` → tutor DTO; revokes all sessions and retains history; repeated current-version inactive operation leaves version/audit unchanged |
| `GET /me/profile` | Fully rotated student only, `{id,displayName,username}` derived from authenticated user; any query/body selector rejected |

Tutor DTO: `{id,displayName,username,active,version}`. Student profiles never return account flags, password/hash, contacts, guardian data or private-note fields. Restricted sessions permit only CSRF, auth/me, password and logout; other routes return 403 `password_change_required`. Unknown fields and missing required fields in typed POST payloads return 400. Username trims to 3–64 ASCII letters/digits/dot/underscore/hyphen, normalized case-insensitively; display name trims to 1–200 characters. Passwords allow spaces/Unicode, 12–128 .NET string characters, no composition rule; change rejects the current password. Names/content are preserved after outer trimming. Reset/deactivate require the latest profile version; stale versions return 409 before changes.

Cookies are HttpOnly, SameSite=Lax, nonpersistent, absolute eight hours, no sliding renewal. Secure is mandatory except explicitly isolated loopback Development HTTP. Login allows ten attempts in a rolling 60 seconds per peer IP in this process; five failures lock the account for 15 minutes. Framework Identity hashes/password verification and cookie/antiforgery protection are used; no public registration/setup/recovery route is mapped. Offline bootstrap/recovery are described in the [runbook](../operations/runbook.md#i1a-local-identity-operations).

## Implemented C1a text-library contract — 2026-10-28

All `/content` routes are tutor-only, using the same session/origin/CSRF middleware. Route casing is normalized before access checks to match ASP.NET route matching; lowercase and uppercase denials have real API proof. No source-content endpoint is available to students, including restricted first-login accounts. Responses remain `no-store`.

| Operation | JSON input / response |
|---|---|
| `GET /content?archived=false&page=1&pageSize=25` | `{items,nextPage}`; size 1–100, page 1–1,000,000; only these three query keys accepted; archived true/false; order updatedAt descending, ID ascending |
| `POST /content` | `{title,description,body}` → 201 detail and Location; nullable description/body values become empty text |
| `GET /content/{id}` | Detail, including body; unknown ID 404 `content_missing` |
| `POST /content/{id}` | `{title,description,body,version}` → detail; archived content cannot be edited |
| `POST /content/{id}/archive`, `/restore` | `{version}` → detail; current-version same-state retry is a no-op |

Detail: `{id,title,description,body,archived,version,createdAt,updatedAt}`; list items omit body. Constructor fields must be present; optional description/body may be empty or null. Title trims to 1–200 .NET string characters; description max 2,000 and body max 50,000; description/body otherwise preserved exactly; NUL rejected. Unknown payload fields rejected. No author/student selector or arbitrary metadata accepted. All mutable updates require the current version; a stale or concurrent losing write returns 409 `content_stale`. Archived-edit attempts return 409 `content_archived`. Create/edit/archive/restore save minimal audit metadata atomically with content; no text in audit. Content author has a restrictive FK to a Tutor account, timestamps use TimeProvider and versions are EF concurrency tokens. No delete, folder, attachment, grant, assigned snapshot or student activity operation is implemented. [C1a evidence](../testing/evidence/c1a-text-library.md).

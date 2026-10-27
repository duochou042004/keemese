# API contract proposal

Status: planning contract, not generated OpenAPI or implemented endpoints. Owner: backend. Base `/api/v1`, same-origin JSON, UUID resource IDs, UTC ISO timestamps plus explicit timezone where scheduling needs it. T=tutor, S=own student only. Every nested ID is independently authorized.

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

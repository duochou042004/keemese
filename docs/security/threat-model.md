# Security and privacy design

Status: proposed controls; no audit or compliance certification. Owner: backend/security. Assets: student profiles/contact/guardian data, learning records, submissions/audio, assessment answer keys, credentials, private tutor notes and backups. Actors: tutor, legitimate student, another student, anonymous attacker; consider accidental tutor disclosure as well as hostile requests.

Trust boundaries: browser ↔ API; API ↔ relational DB; API ↔ private file store; deployment operator ↔ secrets/backups. No external AI or analytics ingestion of student content. Legal retention/consent duties require jurisdiction, ages and hosting answers in D04; do not infer compliance.

| Threat | Proposed control | Verification |
|---|---|---|
| Student A reads/changes B | Ownership authorization in application/data access; filters plus explicit resource checks; composite FK integrity | Two-student negative tests on detail/list/nested/action/file routes |
| Private notes or answer keys leak | Separate DTO/query paths; tutor-only notes; keys excluded before release | Response shape/snapshot tests, export/file tests, role tampering |
| Account takeover | Framework password hashing, throttled login/reset, generic errors, temporary credential rotation, session revocation | Brute-force/rate-limit and old-session tests; no password logging |
| CSRF/session theft | Secure HttpOnly SameSite cookie policy, CSRF token/origin validation on mutations, HTTPS | Cross-origin mutation denied; logout/reset invalidates session |
| Stored XSS in rich text/media | Server sanitization, allowlisted embed policy, CSP, safe link schemes; avoid arbitrary HTML | Malicious rich text/link/filename cases; no executable uploads served inline |
| File access bypass/malware | Private keys, per-download grants, MIME/signature/size checks, quarantine and scan policy before serving | Guessed ID/key, revoked grant, oversized/spoofed/traversal uploads |
| SSRF through media links | No server fetch of arbitrary URL initially; any future fetch needs explicit network allowlist | Internal/link-local URL cases; remote import remains unsupported |
| Grading/time tampering | Server timing/scoring, immutable snapshots, atomic submit/idempotency, concurrency | Expired/duplicate attempts, changed question, concurrent submit/regrade |
| SQL injection/mass assignment | Parameterized EF queries, whitelisted sorts and explicit request models | Unexpected role/studentId/score fields rejected; hostile filter input |
| Data loss or over-retention | Restrict deletion, backup+restore drill, explicit purge policy | Source delete retains work; restore relational/files consistency |
| Sensitive logs/artifacts | Minimal structured audit metadata; redact credentials/content; failure screenshots use synthetic data | Log scan and CI artifact review |
| Supply-chain/CI compromise | Lockfiles, reviewed deps/actions, least privilege, no untrusted PR secrets | Dependency review and workflow permission checks |

Authorization rule: tutor manages workspace; student reads own assigned resources and released results, writes own permitted draft/submission only. Deny by default; ownership is checked after authentication and before returning bytes. Inactive students lose access. Tutor notes never become visible by changing a generic visibility flag on a shared DTO.

File lifecycle: reserve metadata → upload to quarantine → validate → publish available → attach/grant. Download rechecks authorization; any signed URL must be short-lived and scoped. Revocation behavior/TTL needs approval because a previously issued URL may remain valid until expiry. Use safe content disposition and opaque keys, never a user filename as filesystem path. Scanner/storage choices are unresolved, not installed dependencies.

Bootstrap must create only the one authorized tutor through a controlled out-of-band operation; no public admin setup route remains enabled. Credential recovery, session lifetime, optional tutor MFA and password policy require threat/UX review before implementation; no custom cryptography. Record audit events for provisioning, reset, assignment, submission, grade revision/publication, grant changes and deletion without duplicating sensitive payloads.

Retention and incident response: identify affected students/resources, revoke sessions/links, preserve redacted evidence, restore or repair only after approval, and follow applicable notification obligations once jurisdiction is established. Do not send messages externally without authorization. Backup access has the same privacy boundary as primary storage.

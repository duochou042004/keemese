# Product scope and acceptance

Owner: product planning. Status: proposed decomposition; original [specification](../spec/personal_english_tutor_teaching_workspace_spec.md) is authoritative. IDs P01–P61 correspond exactly to its numbered sections. M = MVP, F = future/optional, G = guardrail or planning requirement. Suggested examples are not mandatory schemas or seeded curriculum.

## Traceability

| ID / source section | Planned coverage / module | Scope / acceptance reference |
|---|---|---|
| P01 Overview | Single tutor workspace | M, A1 |
| P02 Philosophy | User-defined content and flexible plans | G, A2/A3 |
| P03 Users | TUTOR and STUDENT only | M, A1 |
| P04 Accounts | Tutor provisions login, logout, password change | M, A1; recovery design D05 |
| P05 Exclusions | No admissions, billing, AI, chat, parent portal | G, A0 |
| P06 Core model | Student-centered navigation | M, A2 |
| P07 Workspace | Per-student activity and history | M, A2 |
| P08 Profile | Flexible strengths, needs and learning profile | M, A2 |
| P09 Goals | Multiple goals with user-defined metrics | M, A2/A8 |
| P10 Plans | Editable/reorderable milestones and activities | M, A2 |
| P11 Templates | Optional clone/customize without coupling | F, D01 |
| P12 Library | Tutor-managed folders and organization | M, A3 |
| P13 Content types | Files, rich text, links/media | M, A3; upload/embedding limits D04 |
| P14 Lesson builder | Flexible reusable lesson content | M, A3/A4 |
| P15 Reuse | Independent student instances | M, A3/A5 |
| P16 Question bank | CRUD, duplicate, archive, search/filter/tags | M, A5 |
| P17 Assignments | Configurable generic homework | M, A5; initial types D02 |
| P18 Assessments | Sections, questions, scoring and timing | M, A6 |
| P19 Submission/grading | Objective auto-grade, open-response manual review | M, A5/A6 |
| P20 Feedback | Text/rubric feedback; timestamp text allowed | M, A7; advanced annotation F |
| P21 Vocabulary | Generic personal learning data, no supplied dictionary | F, D01 |
| P22 Schedule | Tutor schedules; student views own sessions | M, A4 |
| P23 Attendance | Session and attendance records | M, A4 |
| P24 Notes | Private notes linked to student/activity | M, A9 |
| P25 Progress | Activity, goals, attendance and score trends | M, A8 |
| P26 Student dashboard | Own tasks, lessons, feedback, progress | M, A2/A8/A9 |
| P27 Tutor dashboard | Schedule, pending reviews, quick actions | M, A4/A7 |
| P28 Tutor workflow | After-lesson completion flow | M, A4 |
| P29 Student workflow | Open assigned work → submit → feedback | M, A5/A7 |
| P30 Personalization | No shared mandatory roadmap | M, A2 |
| P31 Course | Optional reusable structure only | F, A0/A2 |
| P32 Content vs activity | Source unchanged by answers/results | M, A3/A5 |
| P33 Generic engine | No exam-specific domain classes | G, A0/A6 |
| P34 Data direction | Explicit ownership, constraints and lifecycles | G, architecture design |
| P35 Architecture | Modular monolith | G, ADR01 |
| P36 Technology | .NET/API/EF, pragmatic storage | G, ADR01–03 |
| P37 Security | Student isolation and private notes | M, A9 |
| P38 Files | Upload/view/download/rename/delete/attach | M, A3/A9 |
| P39 Notifications | In-app events before email/push | F, D01 |
| P40 UX | Few clicks, progressive setup, accessible responsive UI | G, A10 |
| P41 Navigation | Task-based tutor/student navigation | M, frontend design |
| P42 MVP | Identity through progress, all core journeys | M, A1–A10 |
| P43 Post-MVP | Templates, recurrence, analytics, vocabulary, version UI | F, D01/D03 |
| P44 Future | AI/public page/integrations/payments/parent portal | F; new explicit scope approval required |
| P45 Non-goals | No marketplace/ERP/AI/conferencing/Drive clone | G, A0 |
| P46 Tutor stories | Create student/plan/content/work; grade and track | M, A1–A8 |
| P47 Student stories | Login, plan, materials, submissions, results | M, A1–A9 |
| P48 After lesson | Primary end-to-end journey | M, A4 |
| P49 Create student | Minimal required fields; progressive enrichment | M, A1/A2 |
| P50 Create assessment | Build/configure/assign generic assessment | M, A6 |
| P51 Success | Tutor and student workflows work independently | G, A1–A10 |
| P52 Planning obligations | Domain/database/API/UI/test/deployment | G, docs index and delivery gates |
| P53 Forbidden assumptions | No required course/video/exam/AI/payment/staff | G, A0 |
| P54 Priorities | Simplicity/flexibility/correctness/security | G, ADR and verification review |
| P55 Product character | Actionable private tutor workspace | G, A4/A10 |
| P56 Concept model | Student/content/schedule with assigned activity | M, architecture design |
| P57 Definition | One tutor, adaptable learning | G, A0/A2 |
| P58 Scope guardrail | Reject unjustified enterprise expansion | G, decision review |
| P59 Research context | Market context only, no copying mandate | G, no implementation requirement |
| P60 Planning outputs | Requirement → module → acceptance → milestone | G, this table and delivery plan |
| P61 North star | Reduce daily tutor coordination effort | G, A4/A10 and user workflow review |

## Acceptance scenarios

- **A0 Scope:** only two roles; no public signup/self-booking, payment or unapproved integrations; student may exist without course/plan; exam names are editable data. Review routes, data model and dependency list.
- **A1 Identity:** tutor creates student with name, unique username and temporary credential without optional contact/plan fields. Student logs in, changes password and logs out; incorrect credentials do not disclose account existence. Unauthorized users cannot create accounts. Reset/deactivation revoke sessions as designed.
- **A2 Personalization:** two students have different goals, metrics and ordered plans. Tutor can edit, move, reprioritize, pause and complete items; changes to one do not affect the other. Optional structure can remain empty; invalid references/cycles are rejected.
- **A3 Content/files:** tutor creates, edits, organizes, duplicates and archives content; folders cannot cycle. Allowed files upload and can be attached to lessons/work/student; students see only grants. Reuse does not share submission state. Deleting a source must not destroy historic assigned evidence (D03).
- **A4 Lesson journey:** create/reschedule/cancel session, view own schedule, record attendance, then complete today's lesson with note/material/homework from student context. Save is atomic or explicitly reports which changes succeeded; retry cannot duplicate homework. Private note never appears in student response. Schedule conflicts and timezone behavior follow approved policy.
- **A5 Assignments:** author instructions/questions, assign separately with deadline, save answers, submit once safely on retry, grade objective responses and mark manual responses pending. Missing/invalid answers return field errors without losing valid draft. Student cannot edit submitted answers except explicit reopened/retry workflow (D02).
- **A6 Assessment:** create sections and questions without exam-specific code; configure points/pass mark/time, assign, start and submit attempt. Server enforces time/attempt limits, prevents duplicate active attempts where policy forbids them, preserves source snapshot, and separates grading from publication. Reconnect restores persisted answers; network loss does not grant extra server time.
- **A7 Feedback:** tutor reviews pending work, records scores and rubric/text feedback, publishes deliberately; student sees released feedback only. Regrading retains audit history and recalculates dependent results.
- **A8 Progress:** show defined denominators, completion, attendance and goals; compare scores only on compatible scales. Empty data is not 0% failure. Student sees only own progress. Tutor-entered metrics are distinguishable from computed results.
- **A9 Isolation:** tampered IDs, list filters, nested attachments and download URLs cannot expose another student's records, answer keys, private notes or unreleased results. Tutor-only actions reject students at API boundaries, not merely in UI.
- **A10 UX:** keyboard/focus and all applicable loading/error/empty/success/disabled/denied states work. Preserve drafts on recoverable errors. Verify the eight-width matrix and short screens, varied content and real journeys; desktop-only evidence is insufficient.

## Ambiguities requiring decisions

The explicit MVP list is the planning baseline; descriptive references to templates/vocabulary/notifications do not automatically move them into MVP. D01 will ratify this interpretation. General version-management UI is deferred, but minimum snapshot semantics are proposed now to protect grading integrity (D03). The prompt's specified .NET/React/Vite baseline narrows the specification's optional React/Next.js and SQL Server/PostgreSQL suggestions; no contradictory mandatory product direction was found.

No student count, storage ceiling, latency SLO, retention period, region, language, browser support floor, or recovery objective is specified. These remain decision inputs, not invented requirements. See the [decision register](../decisions/decisions.md). Source priority: current user approval → product requirements for scope → approved ADRs → proposals; raise material conflicts instead of silently changing scope.

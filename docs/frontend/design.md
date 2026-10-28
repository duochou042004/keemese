# Frontend and UX acceptance design

Bilingual UI proposal approved (2026-10-28) for implementation in a fresh Sol Medium goal-mode chat. Current screens remain Vietnamese-only. See the proposed bounded approach below and the [language decision update](../decisions/decisions.md#bilingual-interface-proposal--2026-10-28).

Redesign review — 2026-10-28: the authorized I1b redesign is implemented for user review. White surfaces, navy `#183c73` actions, dark `#182234` text and neutral borders replace the rejected green palette. Navigation is quieter with a current-page state. Login is a focused 408px column; account forms use a centered 560px reading width. The roster uses simple divided rows instead of a boxed card. Account detail uses a compact summary followed by two-column settings rows (explanation/action), stacking below 760px; destructive actions remain separated and explicitly labeled. Buttons use content width except the login submit. Mobile logout shares the brand row when space permits, with navigation below and natural wrapping under enlarged text. No decorative imagery or new features.

The agent reviews actual screenshots separately from functional and layout checks. User visual acceptance remains pending; new features must wait for that review. Historical I1b evidence describes the rejected design; [redesign evidence](../testing/evidence/i1b-redesign.md) records the replacement.

I1b status — 2026-10-28: identity UI is implemented and verified with synthetic real-API/PostgreSQL browser journeys. [I1b evidence](../testing/evidence/i1b.md) owns executed results, screenshots and limits. The F0 shell is replaced; the remaining teaching-workflow blueprint below is still proposed.

F0a implementation (2026-10-27): a development-only shell now shows checking/connected/unavailable API states and retry. No role navigation or teaching workflow exists. See [bounded QA evidence](../testing/evidence/f0a.md); this does not complete A10 or decide D06.

Status: proposed design system and workflow blueprint, not rendered UI. P07/P26–29/P40–41/P48–50. Owner: frontend. The [decision register](../decisions/decisions.md) owns library, language and browser choices.

## Information architecture

Tutor routes: `/today`, `/students`, `/students/:id/{overview,plan,lessons,work,materials,progress,notes}`, `/content`, `/questions`, `/calendar`, `/assignments`, `/assessments`, `/review`, `/settings`. Combine global work lists if usability supports it; no menu per database entity. Student routes: `/me/today`, `/me/plan`, `/me/lessons`, `/me/work`, `/me/materials`, `/me/results`, `/me/progress`, `/me/account`. Private notes never have a student route or DTO. Anonymous route: login only.

Tutor home prioritizes today's sessions, pending review and contextual actions. Student home prioritizes next task, upcoming lesson and recent released feedback. Student workspace header shows name/status/goal, then current task; tabs keep student context. Avoid arbitrary metrics/charts without an action. Back navigation preserves list filters and scroll where practical; deep links are independently authorized.

## Visual foundations proposed for prototype

Use system sans-serif, readable Vietnamese glyphs, body 16px/1.5, supporting text at least 14px; headings 20/24/30px with restrained weights. Spacing scale 4/8/12/16/24/32/48px. Comfortable controls target 44×44px, visible keyboard focus, labels above fields. Neutral surface and border palette, dark primary text, one teal/blue action accent; validate actual contrast before approval. Do not assert a palette passes without measurement. Status needs text/icon as well as color. No decorative gradients or unnecessary cards.

Page frame: max reading width about 72rem for operational lists, 44rem for text-heavy forms; fluid padding 16–32px. Heading, short purpose, primary action, filters, then content. Use `min-width:0`, wrapping and intrinsic sizing. Two-column editor/preview only where width permits; narrow screen uses one ordered column. Breakpoints follow content pressure; 768px/1024px are initial prototype candidates, not fixed device promises.

## Page families and component contracts

| Family/component | Contract and responsive behavior |
|---|---|
| AppShell | Tutor/student navigation from role; desktop sidebar → labeled mobile drawer; escape closes, focus restores, active destination announced |
| PageHeader | One primary action; title wraps; actions stack without hiding essentials |
| StudentPicker/list | Search + pagination, long names wrap; preserve selected student; no full-roster preload on student client |
| Operational table | Clear headers and row actions; prioritize summary columns, expandable details or contained scroller; no body overflow; keyboard accessible |
| Detail/Workspace | Summary then task tabs; scrollable tab strip only if discoverable; mobile select/list alternative; breadcrumbs/back retain context |
| FormField/FormSummary | Stable label/id, help and field error via aria-describedby; focus first error, retain valid input after recoverable failure |
| Dialog/Drawer | Focus trap, escape/cancel, return focus; max viewport height with internal scroll; footer reachable with soft keyboard; dirty-form protection |
| AsyncBoundary | Distinct loading/empty/error/denied/success; retry only safe operations; no infinite spinner; polite live region for save |
| QuestionEditor/Renderer | Type-discriminated inputs; renderer never receives hidden keys; consistent answer IDs; accessible keyboard alternative to drag ordering |
| AttemptFrame | Server-time countdown, saved/unsaved status, question navigation and submit review; controls fit 320px; don't block reading with sticky bars |
| ReviewPanel | Submission beside rubric on wide screens, sequential on narrow; explicit pending vs published; no accidental release on autosave |

UI permissions improve usability but never substitute for server checks. Signed-out cache is cleared; switching users cannot reveal prior student's data. Do not store credentials or sensitive drafts in localStorage by default; persistent draft storage needs a separate threat review.

## Critical journeys

1. **Add student:** list → short form (name, username, temporary password) → created profile → optional goal/plan. Optional contact and guardian fields collapsed. Duplicate username preserves input; secret shown only in intended provisioning flow; cannot be retrieved later. Never force plan setup.
2. **After lesson:** student → today's session → attendance/completed → short private note → existing/uploaded material → create/attach homework → save summary. Label private notes unmistakably. One completion command commits metadata; retries don't duplicate assignments. Exit with unsaved changes prompts recoverable choice.
3. **Build assessment:** title → ordered sections → choose/create questions → points/time/pass policy → preview → save → assign students. Separate draft validity from assignability; show actionable errors by section. Keyboard reorder included. No TOEIC/IELTS special-case layout.
4. **Student submit:** open assigned work → save answers → review unanswered items → explicit submit → confirmation → pending grading or released result. Refresh/reconnect restores server drafts. Explain expiry without pretending device clock is authoritative.
5. **Grade:** pending queue → submission → objective/manual marks → feedback → save draft → publish → student result. Warn about stale concurrent edits and retain local draft for reconciliation.
6. **Plan/progress:** student context → edit/reorder/pause/complete plan → progress with named metric/scale and denominator. Empty states guide tutor creation; student empty states explain that no work is assigned.

## Repeatable visual acceptance checklist

Before implementing each family, record primary user task, hierarchy, route, components, data/state matrix and responsive behavior. During QA use 320, 360, 390, 430, 768, 1024, 1280 and 1440 CSS-pixel widths; include short-height (e.g. 568px) dialogs and 200% zoom. Test representative templates plus critical journeys; repeat all widths for shared layout changes.

At each applicable width inspect body overflow, clipping/overlap, readable wrapping, mobile navigation, touch targets, focus order, dialog footer, sticky obstruction, contained tables and browser console. Use long Vietnamese names, long URLs/content, large paginated lists, empty data, slow requests, denied access and validation failures. Keyboard-only flow, visible focus, accessible labels and contrast measurement are required; automated accessibility checks complement manual testing.

Record route, viewport, data scenario, steps, screenshot/evidence location, console findings, result and fixes. A build or static review is not visual verification. No app exists yet, so none of these checks has passed. If browser tooling cannot reach the app, report visual QA blocked; do not reduce the matrix silently.

## Implemented I1b route and state contract

`/login` provides sign-in; `/auth/password` handles forced or voluntary change; `/students`, `/students/new` and `/students/{id}` provide tutor list/create/detail/reset/deactivate; `/me/account` is student self only. Unknown or wrong-role routes present a safe denial without fetching a roster for students. Restricted accounts get only password change/logout. Native history navigation suffices for this bounded route set; no extra routing/query/form library was added. Refresh/deep-link SPA fallback must be preserved by later production hosting.

State ownership: root holds only current auth identity and route/notice state; private data stays in mounted role-specific views. CSRF lives in API-client memory. Auth transitions abort in-flight requests and advance an epoch, so late responses cannot repopulate the next user's view. Logout hides private views before awaiting the server; failed logout has an explicit retry screen and does not claim server revocation. A 401 clears client state. Focus, visibility, pageshow and cross-tab auth notifications revalidate while private views are hidden. No localStorage/sessionStorage persistence or student roster prefetch occurs for students. Already rendered offline bytes are not remotely erased.

Forms retain safe names/usernames after recoverable server failures and clear password fields at submission; secret fields are disabled during requests. Errors have Vietnamese labels, a focusable alert and stable field/help associations. Temporary passwords are supplied explicitly and never retrieved. Deactivation uses an inline confirmation with keyboard cancel, avoiding a modal/focus trap. Loading, empty, saved, validation/network/stale-version and denied/session-ended states have actual browser proof.

Measured styles use readable 16px body/14px supporting text, 44px-or-taller input/button controls, wrapping names and visible focus. Six template families were measured at 320/360/390/430/768/1024/1280/1440 CSS px; short-height 320×568 confirmation and actual browser 200% zoom were verified separately. This is bounded identity QA, not complete product A10 or assistive-technology certification.

## Bilingual interface proposal — 2026-10-28

Status: approved for fresh-session execution on 2026-10-28. Keep the existing white/navy layout. The user approved proceeding with this proposal; a separate aesthetic acceptance claim is unnecessary and is not inferred. Earlier visual-review gates do not block this explicitly authorized bilingual packet. Applies to current identity screens and shared UI components. Future features should follow the same text convention when separately authorized.

- Default to Vietnamese when no valid saved choice exists. A labeled native language selector in the shared header offers “Tiếng Việt” and “English”, including login, forced-password and connection-error screens. Keep native language names recognizable in either mode; no flags or new settings page.
- Change interface text immediately without navigation/reload, form remount, input loss, resubmission, authentication revalidation or data refetch. Keep the selector focused; do not move focus to an existing alert merely because its translation changes.
- Remember only `vi` or `en` under `keemese.uiLanguage` in localStorage. This is a browser preference shared by users of that browser, retained through logout; no account association or cross-device synchronization. Reject unknown stored values and tolerate unavailable storage using in-memory state. Other open tabs apply the saved choice on their next load; live tab synchronization is unnecessary for this packet. This narrowly extends the earlier no-storage statement: credentials, student data and drafts remain memory-only.
- Use a small React provider/hook and two typed TypeScript dictionaries under `frontend/src/i18n/`, with identical keys and complete sentence templates for names/counts. No added dependency, translation service, database setting or locale URL.
- Cover navigation, headings, buttons, hints, loading/empty/success/denied states, confirmations, API-code error mapping, client validation, accessible names, skip link and page titles. Set document language to `vi`/`en`; replace the development-shell HTML title and align initial HTML language with the Vietnamese default.
- Store message keys/error codes and parameters in state, then translate during render. Current `ApiError` and form/flash state freeze Vietnamese strings; changing only JSX would leave stale errors/notices. Retain error codes and safe parameters without changing API contracts. Refresh existing custom-validity text on language change without showing a new validation popup. Browser-owned UI such as password-manager prompts remains controlled by the browser.
- Preserve names, usernames and all tutor-authored lessons, questions, notes, materials and feedback exactly as entered. Language selection changes interface labels only; it is not a translation feature or a change to content visibility/security.

Proposed edit surface: `frontend/src/i18n/`, App, auth forms, student views, shared forms, API error presentation, index HTML and minimal selector CSS; extend existing E2E coverage and update evidence/canonical documentation. No backend business change.

Required verification for the approved execution: typecheck/build and dictionary key parity; existing identity/security browser regressions; both-language journeys, stored/invalid/unavailable preference, logout persistence, switching with typed forms, visible errors/success notices and pending requests, document language/title and accessible labels. Verify no extra requests or mutation from switching and no authored-data changes. Review all six templates in both languages at the existing eight widths, short-height confirmation and 200% zoom with keyboard focus and contrast. Use existing local test dependencies and disposable synthetic test infrastructure only; report any unavailable prerequisites instead of installing them without scope approval. User visual review remains separate from passing checks.

Execution update — 2026-10-28: approved bilingual identity UI implemented and verified. See [bilingual evidence](../testing/evidence/bilingual-ui.md) for 10 browser scenarios, 96 width/language cases, 12 actual zoom cases, storage/focus/request checks and limitations. English sentence identifiers are typed dictionary keys; keep them stable in message state and translate at render. Existing authored values remain unchanged.

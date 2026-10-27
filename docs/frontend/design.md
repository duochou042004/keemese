# Frontend and UX acceptance design

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

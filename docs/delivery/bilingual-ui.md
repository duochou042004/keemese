# Approved bilingual UI execution packet

Approved 2026-10-28. Execute in a new local project chat using GPT-6.1 Sol (`gpt-6.1-sol`), Medium reasoning. User explicitly requests goal mode. Do not fork/import prior conversation. Read AGENTS, progress and handoff first, verify actual Git/files, then [frontend contract](../frontend/design.md#bilingual-interface-proposal--2026-10-28), relevant tests and L004/L005 lessons. Avoid broad historical document loading.

## Goal and finish condition

Activate `create_goal` in the successor chat, with no invented token budget: implement the approved English/Vietnamese interface contract across existing identity screens, verify behavior and layout, update evidence/canonical records, commit and push to `origin/feature/f0-foundation`, and report the verified result. Complete the goal only when these conditions are met; failed checks or publication must be reported accurately. Do not expand into teaching workflows or further redesign.

## Required behavior

1. Vietnamese default; shared header labeled native selector with “Tiếng Việt” and “English”, always available including login/restricted/error states. Preserve white/navy styling and responsive header.
2. Browser-only `keemese.uiLanguage` preference (`vi`/`en`), retained at logout. Invalid/missing value falls back to Vietnamese; blocked storage falls back to working in-memory selection. No account association or database field; other tabs adopt on next load.
3. Two complete typed dictionaries and a small React provider/hook, no new dependency. Translate whole messages with parameters. All labels, hints, state messages, API-code/client errors, confirmations, accessibility labels, skip link, title and HTML lang follow selection. Fix initial development-shell metadata.
4. Switch without reloading, remounting forms, losing input, refetching, resetting auth, resubmitting or disturbing selector focus. Store error/message identifiers and parameters, translate during render; update existing native custom validity without a new popup. Watch effects keyed on translated text: the existing Notice focuses when children change. Keep async requests independent of locale and translate responses in the current language.
5. Keep names/usernames and tutor-authored learning content unchanged. Preserve student isolation, private notes, session/CSRF/epoch cancellation and secret-clearing behavior. No backend business/API contract change.

## Work surface and verification

Edit `frontend/src/i18n/`, App, shared forms, auth/student views, API error presentation, HTML and minimal CSS; extend existing E2E tests. Read the actual files before editing. Reuse installed runtime/dependencies/browser and cached test image. No installation/global configuration or persistent data operation is approved. Existing synthetic disposable PostgreSQL/UI host tests and exact-owner cleanup are authorized. Preserve teardown acknowledgement.

Run frontend build/typecheck and explicit E2E/config TypeScript verification, existing identity browser regressions, both-language journeys and targeted switching cases (typed forms, error/success notices, pending requests, preference reload/logout/invalid/blocked storage, metadata/accessibility and unchanged displayed data). Assert no extra requests/mutations caused by switching. Check dictionary key coverage. Use the existing six templates at eight widths in both languages, short-height confirmation, keyboard/focus/contrast and actual 200% zoom; inspect screenshots, do not equate geometry checks with visual review. Reuse existing QA helpers rather than creating a new test framework. Rebuild backend from current source as needed before the UI host; run existing 17 API regressions once for retained identity behavior. Run additional checks only when changes/failures justify them.

Commands and exact pins are in [README](../../README.md#identity-browser-verification-i1b); prior [redesign evidence](../testing/evidence/i1b-redesign.md) explains the working root-shell `cd frontend` approach when npm PATH differs. Do not run `npm ci` or install browsers reflexively: it deletes the existing project browser cache. Inspect availability first. Existing QA artifacts use ignored PNGs; retain text evidence, no secrets or transcripts.

## Checkpoint and publication

Update progress/handoff/build log and relevant design/testing evidence with actual results. Preserve source specifications. Validate JSON/JSONL, local Markdown targets, requirement coverage and diff whitespace. Inspect all staged paths/diff for unrelated changes, credentials and local artifacts. Commit task changes and push the existing `feature/f0-foundation` branch to origin before final reporting, then verify remote hash and worktree. Do not merge or force-push. If checks fail, commit a clearly labeled checkpoint with accurate failure/resume notes when safe, and never claim completion. A push failure remains a reported blocker, not a successful publication.

This is one bounded implementation packet. Goal mode is explicitly authorized but does not provide measured context occupancy or automatic fresh-session rollover. Follow the manual context policy. Do not pause the goal unless the user asks; use goal tool lifecycle rules accurately for blockers. No subagents or other-chat messaging. Current chat publishes preparation and launches; successor alone edits product code.

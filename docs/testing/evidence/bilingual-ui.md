# Bilingual identity UI — 2026-10-28

The [approved packet](../../delivery/bilingual-ui.md) is implemented on `feature/f0-foundation`, starting from verified clean local/remote `4d49f49cecc399ad33f708802924de40bcdddadb`. Goal activated before product edits; no prior-chat retrieval, fork, subagents or messaging. One bounded packet under manual context policy; retained context occupancy is unknown.

## Behavior and scope

Vietnamese remains the default. A labeled native header selector is available in public, authenticated, restricted-password and failed-connection states. Only `vi`/`en` is retained as `keemese.uiLanguage`, through logout and reload. Invalid/missing preferences use Vietnamese; blocked storage supports in-memory selection. New tabs read the preference at load. No account/server preference, dependency or backend source change.

Two typed dictionaries contain 98 identical keys with matching placeholders. English sentence identifiers remain untranslated in error/flash/notice state; render-time lookup makes existing messages follow the current language. Complete templates handle page numbers, names and validation parameters. Labels, hints, buttons, navigation, status/error/confirmation text, accessible names, skip link, title and HTML language are translated. Initial HTML uses the Vietnamese sign-in title and language.

Locale never enters the API/session/data-loading dependencies or component keys. Metadata updates are separate from navigation focus. Alert focus occurs on error mount/activation, not translation changes. Previously set native custom validity is recomputed without calling `reportValidity`. Inputs, confirmation state and pending requests survive switching; existing secret-clearing, CSRF, epoch cancellation and auth transitions remain. Names and usernames are rendered unchanged; authored learning content has no UI/workflow in this packet. White/navy layout retained with wrapping header selector.

## Actual verification

- Existing local Node/npm, dependencies, Chromium revision 1248 and cached digest-pinned PostgreSQL reused; no installs/global configuration or persistent database operations.
- `cd frontend && npm run build`: passed, including TypeScript; final Vite build 148 ms, 22 transformed modules. Initial development typecheck exposed translation-wrapping mistakes; corrected before the first browser run.
- Explicit strict E2E/config/teardown TypeScript check with local `tsc --ignoreConfig --noEmit --strict --target ES2022 --module ESNext --moduleResolution bundler --types node --skipLibCheck`: passed. An initial select-label inference error in the expanded matrix was corrected with the input/select element union.
- `dotnet build Keemese.slnx --no-restore`: passed, zero warnings/errors. `dotnet test Keemese.slnx --no-build --filter 'FullyQualifiedName!~UiTestHost' --logger 'console;verbosity=minimal'`: 17/17 passed, no skips, 48 seconds. All backend source/config/lock bytes match baseline Git.
- Built-asset real API/PostgreSQL Chromium E2E: **10/10 passed**, no retries/skips; first run 33.6 seconds, final run 32.9 seconds after dependency-stability review. Existing six identity scenarios retained, with four additional dictionary/language/storage/English lifecycle scenarios.
- **96 cases**: six templates × eight widths (320/360/390/430/768/1024/1280/1440) × two languages. No body overflow, input/select labels present, measured visible input/button/select heights >=44px. [QA data](../../../frontend/e2e/artifacts/qa.json).
- **12 actual zoom cases**: six templates × both languages, extension `chrome.tabs.setZoom(2)` in disposable profile, measured DPR 2 and layout width 640; no horizontal overflow. [Zoom data](../../../frontend/e2e/artifacts/browser-zoom.json). Both-language keyboard confirmation cancel reachable at 320×568; 200% root-text stress retained. Keyboard focus outline 3px; sampled text contrast minimum 5.34:1 across 11 roles.
- Switching assertions cover filled login/create/password forms; native custom validity; visible API error, client mismatch error, created/reset/logout notices and named confirmation; selector focus; pending real login response in new language; zero additional requests/mutations during switching. English tutor creation/reset and student forced-password/own-account/denied-route journey passes. Existing Vietnamese two-student isolation, reset/deactivation revocation, late-byte cancellation and cross-tab auth regressions pass.
- Storage missing/valid/invalid/throwing, logout retention, reload/new-tab application, HTML language/title, accessible labels and skip link pass. Other already-open tabs have no live locale synchronization by design.
- React skill review: stable translation callback, explicit effect dependencies, locale excluded from fetching/auth effects and keys, native labeled selector, typed key coverage; no additional component library/tooling.

## Screenshot inspection and cleanup

Agent inspected all six bilingual eight-width contact sheets, the bilingual actual-zoom/short-height sheet, full-size English desktop login, 320px detail and 320×568 confirmation. Text wraps within fields/sections; selector/navigation remain reachable; long synthetic Vietnamese names remain unchanged. No observed clipping/overlay in inspected captures. This is agent visual QA, not user aesthetic acceptance. Ignored local screenshots are `bilingual-review-{login,list,create,detail,password,account}.png`, `bilingual-review-zoom-states.png` and raw `{template}-{vi,en}-{width}.png` under `frontend/e2e/artifacts`. No PNG is newly tracked. [Review record](../../../frontend/e2e/artifacts/bilingual-review.json) includes built asset hashes.

After final acknowledged teardown: no containers, volumes, app/testhost/Vite/Playwright/browser processes, cleanup markers or disposable zoom profiles remain. Existing browser/image caches and ignored synthetic screenshots remain. No secrets, traces or real student records are persisted.

JSON/JSONL, Markdown local file targets, 61 requirement rows, unchanged original sources/backend, staged inventory/credential signatures and whitespace are checked before commit. Normal branch push and exact remote verification are recorded at publication in the canonical handoff/build log.

Limits: Chromium/Linux synthetic pilot only. Other browsers/OS, screen-reader certification, browser-owned password-manager/native popup wording, crash/forced-kill cleanup, deployment and full-product A9/A10 remain unverified/outside scope. No teaching workflows, CI, migrations or deployment added.

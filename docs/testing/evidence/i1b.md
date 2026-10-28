# I1b identity UI evidence — 2026-10-28

The replacement design and current screenshots are documented in [redesign evidence](i1b-redesign.md). The original measurements below remain historical; shared generated screenshot paths now show the redesign.

User review update — 2026-10-28: functional tests and bounded layout/accessibility measurements passed, but the user rejected the visual design. Those measurements do not establish polish, clarity, visual harmony or user acceptance. Redesign comes before more features. PNG links below are **local-only generated evidence**, now ignored by Git; regenerate them to view them in another checkout. The already-tracked historical F0a screenshot is unaffected by ignore rules.

User approved the next planned I1b task **here in the current session**, superseding only this packet's prior fresh-chat condition. No new chat/history import/subagent was used, and no live occupancy or automatic context-safety guarantee is claimed. Scope is the [approved I1b packet](../../delivery/i1-readiness.md#i1b--minimal-usable-identity-ui-later-approval). Git branch `feature/f0-foundation` and HEAD `d932c3c62dd0942aff67977a4a65d7a9f83afe07` are preserved; all work is unstaged. CI and publication are not included.

Environment: Linux x64/Kali, Node 24.22.1/npm 11.19.1, .NET SDK 10.0.403/ASP.NET 10.0.14, rootless Podman and F0b's exact PostgreSQL 18.6 digest. Playwright 1.64.1 uses Chromium 156.0.8078.4 (revision 1248). Playwright warns Kali is not officially supported and downloads its Ubuntu24.04 fallback; the actual runs passed here, without claiming broader platform support.

## Delivered behavior

Vietnamese login, forced/voluntary password change, logout, tutor student list/create/detail/reset/deactivate, and student own-account screen. No unfinished teaching dashboard/navigation, optional-contact requirements or public registration. API paths/policies are unchanged from I1a. Existing backend/F0b source hashes match I1b-start bytes; only allowed `UiTestHost.cs` was added there. React local state/native history are sufficient for these few routes; Playwright is the only added dependency.

The API client keeps CSRF only in memory, renews it after identity transitions, cancels pending requests and rejects stale responses by generation. Root/role views unmount on logout/401/revalidation/user switch; students never request a roster. Focus/visibility/pageshow and cross-tab auth notification revalidate before showing private views again. Logout failure hides private data and offers an honest retry rather than claiming server revocation. Safe names/usernames survive recoverable form failures; passwords are cleared at submission and disabled during pending attempts. No localStorage/sessionStorage, tokens or credentials are persisted by the UI.

## Executed verification

| Command / check | Result |
|---|---|
| Registry engine/version check, exact `@playwright/test@1.64.1` install/lock | Passed; Node >=20 requirement satisfied; npm audit reported zero findings at install |
| `npm ci` in frontend | Exit 0; exact lock restore (browser cache preserved temporarily and restored to project-local ignored cache) |
| Project-local `playwright install chromium` | Exit 0; browser/FFmpeg binaries only under `frontend/node_modules/.cache/ms-playwright`; no OS/global installation |
| `npm run typecheck` / `npm run build` | Exit 0; final production assets built; no runtime UI claims inferred from build alone |
| Explicit TypeScript check of Playwright config/test/teardown with `--ignoreConfig --noEmit --strict ...` | Exit 0; initial TS5112 corrected by the documented TS7 command flag |
| `dotnet restore Keemese.slnx --locked-mode` / single-worker no-restore build | Exit 0, zero warnings/errors |
| `dotnet test Keemese.slnx --no-build --filter 'FullyQualifiedName!~UiTestHost' --logger 'console;verbosity=minimal'` | Exit 0; 17/17 API regressions passed, no skips, 48 seconds |
| `npm run test:e2e` (built frontend via Vite preview, real API/DB) | Final exit 0; 6/6 passed, no retries/skips, 26.4 seconds including verified DB teardown |
| Manual screenshot review + browser measurements | Six templates × eight widths, short-height and actual zoom passed within identity scope; artifacts below |
| Final resource/source/Git/document validation | Passed 16 JSON/JSONL records, 25 Markdown file targets/fences, 61 requirement rows, whitespace, original source/backend hash preservation, empty index/unchanged refs and empty resource inventories |

First setup attempt used the wrong command working directory and failed before edits, then succeeded from the root. The first browser run passed 3/5: two orchestration defects (navigating before login completion and unroute during a pending handler) were corrected. Subsequent 6/6 runs passed browser assertions. Final inventory then exposed a separate cleanup defect: listener shutdown happened before the DB helper's `finally`, so Playwright killed the test process too early and four exact test-owned containers remained. Verified each name against its identical owner label, removed only those four and verified absence. The corrected host now writes a unique completion marker **after** container-removal verification; global teardown waits for it before allowing Playwright process termination. The final 6/6 run also left zero containers/volumes, processes, markers and disposable zoom profiles. Passing browser assertions alone was not treated as passing cleanup.

## Browser acceptance scenarios

| Scenario | Real checks / result |
|---|---|
| Tutor creates two students; each completes first login | Empty roster, two distinct names/accounts; incorrect login uses generic Vietnamese error; mandatory change rejects unchanged temporary password, old credential fails after rotation; each reads only own account and logs out — passed |
| Reset/deactivate existing browser | A separate tutor browser resets the student; focus revalidation removes the open student's profile and requires temporary-password rotation. Deactivation denies the still-open student on focus and later login; inline cancel is nonmutating — passed |
| Failure/recovery states | Short password native validation/focus; duplicate username preserves safe name/username and clears secret; held request shows loading; network abort/retry recovers; injected stale 409 requires explicit reload; failed logout hides private data and retries; controlled nine-hour advance expires session — passed |
| Switching with in-flight requests | Hold a real student's profile response, logout/switch, release old bytes; prior profile never reappears. Student denied tutor route without roster fetch. localStorage/sessionStorage remain empty; same-context second tab revalidates on logout — passed |
| Width/keyboard/contrast/text scale | Six templates × 320/360/390/430/768/1024/1280/1440 CSS px: no body overflow, visible labeled controls >=44px high. Tab/Enter login, native invalid focus, server-alert focus, keyboard inline cancel and measured solid 3px focus outline. Separate 320×568 confirmation and 200% root-text stress — passed |
| Actual browser 200% zoom | Test-only MV3 extension calls `chrome.tabs.setZoom(2)` in a disposable Chromium profile. All six templates prove physical viewport 1280×900, layout width 640 and DPR 2, without body overflow; screenshot capture uses physical protocol coordinates — passed |

The zoom extension is never installed into the user's browser or production app. Its temporary profile closes/removes in `finally`. Method references: [Playwright extension testing](https://playwright.dev/docs/chrome-extensions), [Chrome zoom API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom). Ordinary test host clock/stop routes exist only in the opt-in test process and require a random per-run control header; production API startup exposes none of them. All DB creation uses the existing owned tmpfs container helper; no external/persistent connection is accepted.

## Visual evidence

Machine-readable [48-case viewport results](../../../frontend/e2e/artifacts/qa.json), [actual zoom results](../../../frontend/e2e/artifacts/browser-zoom.json), and [agent visual-review record/built-asset hashes](../../../frontend/e2e/artifacts/visual-review.json). Each row records route, width, synthetic scenario, measurements and raw screenshot filename relative to `frontend`. Agent inspected the six template contact sheets, zoom/state sheets and full-size narrow/short-height/zoom-detail captures. Fixes included 14px supporting text, awaiting roster data before its first screenshot, and correcting Playwright's cropped CSS-size capture under real browser zoom. No remaining clipping/overlap/hidden actions were observed in the bounded inspected UI.

| Template / scenario | Screenshots |
|---|---|
| Login | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-login.png`; excluded from Git), desktop (local generated preview: `../../../frontend/e2e/artifacts/login-1280.png`; excluded from Git), keyboard focus (local generated preview: `../../../frontend/e2e/artifacts/keyboard-focus.png`; excluded from Git) |
| Tutor roster | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-list.png`; excluded from Git), 320px full page (local generated preview: `../../../frontend/e2e/artifacts/list-320.png`; excluded from Git) |
| Student create | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-create.png`; excluded from Git) |
| Account detail/reset/deactivate | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-detail.png`; excluded from Git), short-height confirmation (local generated preview: `../../../frontend/e2e/artifacts/short-height-confirmation.png`; excluded from Git) |
| Mandatory change | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-password.png`; excluded from Git) |
| Student account | Eight widths (local generated preview: `../../../frontend/e2e/artifacts/review-account.png`; excluded from Git) |
| Empty/error/loading/saved/inactive | State contact sheet (local generated preview: `../../../frontend/e2e/artifacts/review-states.png`; excluded from Git) |
| Actual 200% browser zoom, six templates | Zoom contact sheet (local generated preview: `../../../frontend/e2e/artifacts/review-zoom.png`; excluded from Git) |

Final screenshot/measurement files are synthetic only (73 PNGs, approximately 6.7 MB); no secret-filled screenshot or trace is intentionally retained. QA console capture contains the expected initial anonymous `/auth/me` 401 resource message, with zero uncaught JavaScript exceptions. Negative scenarios deliberately produce API 400/401/409 and injected network failures; those are test inputs rather than hidden console defects. Node reports a harmless NO_COLOR/FORCE_COLOR warning during the test runner. No unrelated console-cleanliness claim is made for untested future routes.

Browser-computed sRGB contrast (normal text minimum 4.5:1), measured from actual CSS rather than hardcoded expected colors:

| Role | Contrast |
|---|---|
| body | 13.06:1 |
| muted | 5.61:1 |
| primary | 6.95:1 |
| error | 7.88:1 |
| status | 6.97:1 |
| danger | 7.25:1 |
| inactive | 4.98:1 |

## Limits and checkpoint

I1b acceptance and the identity portion of A1 are complete in the synthetic Chromium/Linux pilot. Full future teaching/file/private-note A9 and product-wide A10, screen-reader certification, other OS/browsers/devices, production hosting/SPA fallback, persistent provisioning/migrations, durable keys/distributed throttling and crash/forced-kill cleanup are not claimed. Server revocation prevents later requests; already-rendered offline bytes cannot be erased remotely. API restart still invalidates memory-protected tickets by the I1a design.

No staging/commit/push/merge, CI, persistent DB operation, global/browser-user configuration, hooks/controller, new chat or messaging occurred. Normal npm/NuGet and local browser/image caches remain. Stop after the current checkpoint; next implementation scope requires user direction. No formal fresh-chat handoff is imposed on this user-approved current-session continuation.

# Paused project — handoff to another device

Updated 2026-10-30, Asia/Ho_Chi_Minh. User paused development and requested a repository-complete transfer, a paste-ready goal prompt, and then reset of this machine's Podman. **No next product implementation is approved.** No new chat is launched here. Resume from the repository, not this computer's memory, chat history, absolute paths, caches or ignored screenshots.

## Get the correct branch

Repository: https://github.com/duochou042004/keemese.git. Active work is **feature/f0-foundation**, not default develop or release master. Latest application: d0e81289be4c67924955a897067954467fb28629 (C1e). Completion record136316588499ddb3a4bbda57d81e74ebe141a50e was independently verified equal origin/clean with actual docs40989996242 success before this pause packet. Handoff/reset records follow it; use the latest branch.

Choose any suitable directory on the new device. If no checkout exists:

~~~sh
git clone --branch feature/f0-foundation --single-branch https://github.com/duochou042004/keemese.git
cd keemese
git status --short --branch
git rev-parse HEAD
git ls-remote origin refs/heads/feature/f0-foundation
~~~

For an existing checkout, inspect local changes first, fetch origin, compare refs, and fast-forward only a clean matching branch when safe. Never discard user work, initialize replacement history or force-push. Public clone needs no transferred credential; push/Actions access needs the new device's own authorized authentication. Do not commit/copy tokens, private keys, credential stores or browser profiles. Inspect existing Git identity without changing global settings. The former /home/kali/App_projects/keemese path is historical.

## Start with little context

1. Read root [AGENTS](../../AGENTS.md), [progress](../../harness/state/progress.json), [handoff](../../harness/state/handoff.md) and this document. Verify against Git/files and actual CI.
2. Use [docs map](../README.md), [setup README](../../README.md), [C1e evidence](../testing/evidence/c1e-text-copy.md), [portable measurements](../testing/evidence/c1e-layout-metrics.md), [workflow](../../.github/workflows/ci.yml), and relevant [lessons](../../harness/learning/lessons.jsonl).
3. For the next proposal, read relevant [requirements](../product/requirements.md), [delivery](plan.md), [decisions](../decisions/decisions.md), focused authoritative [specification](../spec/personal_english_tutor_teaching_workspace_spec.md) sections and task-specific architecture/API/security/frontend/testing references. Do not preload the entire specification, bootstrap, research, build log or previous chats. Earlier dated proposed/unimplemented statements are history; later explicit acceptances and current checkpoint supersede them.

No installed plugin/skill or private Codex memory from the old machine is a project dependency. If an optional skill is needed later, check actual new-device availability. Tracked source/tests/docs govern reproducibility.

## Completed baseline and tracked proof

| Implemented | Evidence |
|---|---|
| Pinned .NET/React/Vite foundation; real tmpfs PostgreSQL tests | [F0a](../testing/evidence/f0a.md), [F0b](../testing/evidence/f0b.md), locks/test source |
| One tutor, tutor-created students, mandatory password rotation, reset/deactivate/logout/recovery and own-profile isolation | [I1a](../testing/evidence/i1a.md), [I1b](../testing/evidence/i1b.md), [redesign](../testing/evidence/i1b-redesign.md) |
| Vietnamese default/live English switch; white/navy UI and browser-only language preference | [Bilingual proof](../testing/evidence/bilingual-ui.md), [frontend contract](../frontend/design.md) |
| Tutor-only native text create/edit/archive/restore | [C1a](../testing/evidence/c1a-text-library.md) |
| Nested folders, direct assignment/filtering, empty-only deletion | [C1b](../testing/evidence/c1b-folders.md) |
| Explicit accent-sensitive search across title/description/body | [C1c](../testing/evidence/c1c-text-search.md), [SQL plans](../testing/evidence/c1c-search-plans.md) |
| Reusable tags,0–20 assignments, single-tag/untagged filtering, safe deletion | [C1d](../testing/evidence/c1d-text-tags.md), [tag plans](../testing/evidence/c1d-tag-plans.md) |
| Saved active/archived text to independent editable copy, unchanged source, metadata repair and uncertain-save notice | [C1e](../testing/evidence/c1e-text-copy.md), [numeric metrics](../testing/evidence/c1e-layout-metrics.md) |
| Selective pinned/read-only GitHub Actions with real API/DB/browser tests | [CI1](../testing/evidence/ci1.md), [workflow](../../.github/workflows/ci.yml), [helper](../../tools/ci/check.py) |

Actual [hosted40989431166](https://github.com/duochou042004/keemese/actions/runs/40989431166) passed at exact application d0e8128: observed full mode,37 API/3 standalone DB/32 browser, no failures/skips/retries; checks6s/verify4m5s/result2s; strict builds/TypeScript and independent teardown passed on rootless Podman4.9.3. Local37/3/32 also passed; C1e added64 bilingual geometry/two actual200% zoom cases. These are historical executed results, **not proof of this new device**. [Completion docs40989996242](https://github.com/duochou042004/keemese/actions/runs/40989996242) passed at1363165 with runtime verify skipped. Resolve later handoff/reset record runs from Actions.

CI classifier: frontend source-only changes select frontend and skip API/standalone DB; E2E test-file changes select full; docs-only selects docs. Never label skipped suites executed. Existing limits remain API240s/DB120s/browser300s and hosted20-minute job. These tests do not prove full product acceptance.

## Remaining tasks and decisions

The immediate resumed packet is **new-device readiness plus one concrete next-step proposal**. No C1f or subsequent implementation packet exists/has approval. Review remaining C1 candidates first, propose one bounded slice with exact paths, dependencies, privacy behavior and real acceptance, then stop for user approval.

| Outstanding item | Decision/dependency before implementation |
|---|---|
| C1 files/materials | D04 file types/sizes, retention/deletion, storage/download access; R2 direction is not provisioning |
| C1 question bank/question duplication | D02 initial types, answers/attempt/grading rules; native-text copy does not implement question duplication |
| Student grants/assigned snapshots | D03 issuance/reissue/archive/revocation/historical integrity; source edits cannot alter issued work |
| P1 individual goals/ordered plans | D07 metric policy, student isolation, ordering/state/cycle rules |
| L1 schedule/private notes/after-lesson | D06 timezone presentation, D10 conflict/late/reopen policy; full homework flow depends on W1 |
| W1 assignments/drafts/submission/grading | D02/D03, snapshots, idempotent submit/manual pending/explicit release |
| T1 timed assessments | W1 primitives, timing/retry/release, reconnect/concurrency/server-expiry proof |
| R1 progress/dashboards | D07 denominator/scale/release policy plus actual P1/L1/W1/T1 data |
| Q1 release/restore | Actual MVP gates, hosting sizing/retention/RPO/RTO, migrations and restore rehearsal; deployment separately gated |
| Context controller | Live occupancy/U/C/overshoot/interruption/recovery unverified; manual bounded packets remain policy |
| UX/platform assurance | Chromium/Linux pilot; user aesthetic, screen-reader/other-browser/OS, full C1/A3/A9/A10/production acceptance incomplete |

ADR01/02 stack accepted. ADR03 identity subset/D05 accepted/implemented; files/snapshots deferred. D06 bilingual/Chromium pilot implemented; scheduling/timezones unresolved. D08 repository/publication settled for this branch. D09 manual fallback accepted; automatic thresholds unvalidated. D01 exclusions cannot silently expand; D02/D03/D04/D07/D10 unresolved portions stay visible. [Decisions](../decisions/decisions.md) owns detailed history.

Accepted hosting direction only: paid Render backend/managed PostgreSQL; private Cloudflare R2 files; Vercel/Netlify/Cloudflare Pages frontend candidates with Render fallback. User budget $40–$100; USD/month is still a planning assumption to confirm before purchase. Region, tiers, learner/concurrency sizing, topology, retention/deletion, backups/RPO/RTO, durable keys/proxy trust/distributed throttle, credentials and retained-data migrations remain unresolved. No cloud resources, persistent application DB, deployment or real student dataset were provisioned. Keys are memory-only; API restart invalidates cookies. Runtime startup does not create/migrate schema or bootstrap a tutor.

## New-device setup and verification

Check versions first; do not substitute latest packages, regenerate locks, globally install/configure tools or provision a DB under this first readiness goal. Missing prerequisites are an honest readiness result: report gaps and a concrete setup proposal for approval.

| Prerequisite | Repository pin / actual tested scope |
|---|---|
| Git, optional gh | New device's own authorized push/Actions access |
| .NET SDK |10.0.403 exact global.json; ASP.NET10.0.14 package locks |
| Node/npm |24.22.1 /11.19.1; frontend/.nvmrc, engines and lock |
| Python | Python3 standard library; no pip dependency for docs/helper checks |
| Containers | Rootless Podman; local Linux x64 5.8.6/hosted Ubuntu24 4.9.3 tested |
| PostgreSQL | docker.io/library/postgres:18.6-alpine@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5 |
| Browser/OS | Playwright1.64.1, Chromium1248/FFmpeg1013; Kali Ubuntu24 fallback tested, script/PTY and browser OS libraries required; other OS workflows unverified |

First goal runs available read-only preflight/docs checks, without claiming application validation:

~~~sh
python3 -m unittest discover -s tools/ci -p 'test_*.py'
python3 tools/ci/check.py validate
git diff --check
~~~

After explicit setup/test approval, use exact existing [README restore/build/test commands](../../README.md) and strict E2E/config TypeScript from CI. Restore/build both solution and standalone DB project. npm ci deletes the project-local browser cache; restore Chromium afterward with PLAYWRIGHT_BROWSERS_PATH pointing to frontend/node_modules/.cache/ms-playwright. Local playwright install chromium differs from hosted --with-deps; OS package installation is not implicitly authorized. Keep ports5173/5080 free; tests refuse occupied ports. Only helper-owned synthetic tmpfs DBs, no external connection string/existing DB/volume. Verify processes/containers/volumes/markers/zoom-profile cleanup independently. Never bootstrap/recover a persistent DB under test authorization.

Review/stage/commit/push safe documentation normally to the same existing branch, inspect secrets/artifacts first, verify exact remote equality/clean worktree and actual applicable CI. No empty commits, merge, force-push, deployment or access/secrets changes. Report unavailable authentication/network accurately.

## What transfers

Tracked source, locks, requirements/decisions/packets/evidence/lessons/canonical state, CI/helpers and [goal prompt](resume-goal.md) transfer through Git. [C1e numeric evidence](../testing/evidence/c1e-layout-metrics.md) preserves64 layout/contrast/two zoom measurements from executed verification, with provenance; archival is not a new run. Existing tracked text QA/SQL plans remain available.

Ignored synthetic screenshots remain local per the user's PNG-exclusion policy. Their versioned generators and tracked findings support accurate resumption; reproduce/review them after approved browser setup. No new PNG or private data is committed.

Not transferred: old-device Codex memory/chat/goals/plugins; installed runtimes; npm/NuGet/Podman/Chromium caches; node_modules/bin/obj/dist; ignored artifacts; credentials; browser preference/session; disposable DB contents. No secret or real student dataset requires migration. Optional local skills are not a prerequisite. Standard search fallback is valid if rg is unavailable.

Current pause authorizes rootless Podman reset **on this old machine after handoff publication**, not on the new device. [Reset evidence](../testing/evidence/device-pause.md) owns actual outcome. Installed Podman/system configuration remains; other-user/rootful storage is outside the inspected reset context. No automatic successor launch or global model/window change.

[Official OpenAI Goals guidance](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex), checked2026-10-30, documents /goal. Use a Goals-capable build; if unsupported, report it and use the bounded task without claiming activation. A goal does not transfer old-chat memory or enforce context rollover. No token budget is invented.

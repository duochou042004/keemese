# Build and verification log

## 2026-10-27 — Phase 0 baseline (no project writes)

Read the complete authoritative product specification, matching pasted/repository governance prompt and supporting research. Observed only three source documents. Git status/log failed as not a repository; then-visible restricted .git was empty. SDK/runtime versions and available tools were inspected. No code/build/test/deployment performed. Preliminary cached context inference was not live telemetry and is explicitly excluded from the Phase 1 safety denominator.

## 2026-10-27 — Phase 1 authorization and research

User authorized documentation/planning and required conservative runtime-driven context research. Explicitly withheld implementation, hooks/scripts, tools/global configuration/model/window changes. Tool sandbox became unrestricted; this did not widen task authorization.

- `codex --version`: passed, CLI 0.164.0.
- `codex app-server --help`, `codex app-server daemon --help`, `codex app-server proxy --help`, `codex exec --help`: passed; inspected lifecycle and structured-output entry points without starting a server/session.
- `codex app-server daemon version`: failed, default `/home/kali/.codex/app-server-control/app-server-control.sock` absent. No private IPC probing or transcript/SQLite parsing used as fallback.
- Desktop `read_thread` for current chat: active status/cwd available; active model/context counters absent from result. `get_usage_limits`: account quota snapshot available, kept distinct from context occupancy.
- Read-only selected config inspection: configured model gpt-6-astra, no explicit context/compaction override. Not treated as live model/limits. Global config was not changed.
- Official docs opened for CLI status/new chats, app-server, hooks, SDK and configuration. One guessed `/docs/sdk` URL returned 404; canonical `/docs/codex-sdk` was then read successfully. Findings/sources are in context-safety doc.
- Reviewed official router/provider/browser/runtime/CI sources; dated recommendations and limitations in decisions/runbook. No package installs or version changes.

## 2026-10-27 — Documentation authored

Created 18 files, canonical inventory in [progress](../state/progress.json): concise AGENTS, docs index, context safety, complete section traceability, architecture/data model, API, ADR/open decisions, frontend acceptance, threat model, verification, operations, delivery packets, state/handoff, this log and learning/retrospective records. Original files were not edited. No executable harness, hooks, application or workflow created.

Initial Python read-only validation: 61 traceability rows with no missing IDs; lesson JSONL valid; original sources and global config hashes unchanged; AGENTS 2815 bytes. Five links initially pointed to not-yet-written state/log files, subsequently created. `git diff --no-index --check /dev/null <new-file>` returned 1 with empty diagnostics for each new file (differences from empty baseline); this is not a passed repository diff check. Final validator distinguishes those expected differences from whitespace diagnostics.

## Final gate validation

Final read-only Python validation passed (exit 0): progress JSON and lesson JSONL parsing; all local Markdown links; balanced fences; no trailing whitespace/conflict markers; 18-file manifest exactly matches new files; exactly P01–P61; original three source SHA-256 hashes and global config hash unchanged. Per-file `git diff --no-index --check /dev/null <file>` produced no whitespace diagnostics, with expected new-file difference exit 1. Root AGENTS remains 2815 bytes. Final status/log edits were rechecked for JSON validity, whitespace and source preservation.

`git status --short --branch` exited 128 (not a repository); `git diff --check` exited 129 (not a repository). These checks are blocked, not passed. Manual documentation review checked approval separation, old-target supersession, proposal labels, canonical ownership and milestone dependencies. Product builds/tests/live visual QA are not applicable yet and were not run. Context automation is unimplemented and untested. No commit, push, new session, migration or release was performed.

## 2026-10-27 — H0 approval and fresh-chat handoff

User explicitly approved the bounded H0 context-safety pilot in a fresh chat and requested the materials needed to continue. Updated progress and handoff to carry that approval without widening it to production automation, product implementation, installations or global/model/window changes. H0 has not started; no new chat was created here. Git status remains unavailable (exit 128, not a repository). Validated updated progress JSON and handoff links/whitespace.

## 2026-10-27 — H0 bounded pilot (complete with limitations)

Authorized: supported-interface inspection and bounded nonpersistent diagnostics, then checkpoint and review. No previous conversation was imported. Only relevant planning/context/learning records were read. OpenAI Docs skill was used; the official [app-server reference](https://learn.chatgpt.com/docs/app-server) documents fresh thread creation and usage notifications. Those documented capabilities are not proof of this runtime's measurement semantics.

### Actual workspace and current chat

- `pwd`: expected root. Only root AGENTS.md found; no nested instructions or .git. Initial `rg` failed (not installed); used find/Python, no installation. Baseline hash inventory contained 21 files, exactly matching progress's 18 documentation/state files plus three preserved sources. Prior Phase 1 test claims remain historical rather than newly certified by this inventory.
- `git status --short --branch`: exit 128; `git diff --check`: exit 129, not a repository. Git identity/diff checks blocked; no Git initialization.
- Environment thread ID matched supported desktop `read_thread`: `01a17d43-531f-7163-956a-6d6cb1cd146a`; returned active cwd, one in-progress turn, no next cursor and hasMore false. No model/A/N/U/C fields. This is visible-history evidence only; no previous-thread comparison, baseline occupancy, sentinel or ambient-memory inspection was performed.
- `codex --version`: 0.164.0. `codex app-server daemon version`: exit 1, missing documented control socket. No private IPC probing, transcript parsing, SQLite inspection, cached catalog or account-quota substitution.

### Installed protocol evidence

`codex app-server generate-json-schema --out <temporary directory>/schema`: exit 0, 320 JSON files. Temporary diagnostics were under `/tmp/keemese-h0-4ao9bi16`; these are disposable, not required handoff inputs. No executable script was added to the project. Selected generated schema SHA-256 values:

| Schema | SHA-256 |
|---|---|
| ThreadTokenUsageUpdatedNotification | aba4f6c7e4a19b2b842c08ee793b57000c07dafd57b922ad0d8e7c76609108c2 |
| ThreadStartParams | e9c6d3cc18d049bfbc0249add3808fb8e5a27e1a0b5a423767aafbc3859a9428 |
| TurnInterruptParams | 6dff382dae73d1dbc58406ed045605f647e7a49660e2540fbd2c6c24d60c5f2b |

Usage notification requires threadId, turnId, tokenUsage. Token usage requires `last` and `total`, with nullable `modelContextWindow`; breakdown includes input, cached-input, output, reasoning-output and total tokens (optional cache-write defaults to zero). The schema supplies no retained-occupancy definition, effective compaction threshold, nominal-versus-usable guarantee, sample timestamp or sequence field. Do not interpret last/total as A, or modelContextWindow as U without independent semantic validation. Interrupt parameters identify thread and turn; availability is not timing or stop proof.

### Isolated lifecycle diagnostic

Started `codex app-server --listen stdio://` in an empty temporary cwd; initialized client `keemese_h0_probe` version 0.1, sent initialized, then exactly two thread/start requests with only cwd and ephemeral=true. No model/window/config override, history, fork/resume or turn/start was sent. Initialization returned a 0.164.0 user-agent. Both calls succeeded:

| Thread ID | ephemeral | path | turns |
|---|---|---|---|
| 01a17d44-77ff-7b42-bb06-a630e5af13e5 | true | null | empty |
| 01a17d44-7bbe-75d0-84be-72e0422381f2 | true | null | empty |

Both responses selected gpt-6-astra. This is a separate runtime's session selection, not an inference-verified active model or this desktop chat's model. Empty returned turns alone cannot exclude hidden instructions/memory. No sentinel or model-level isolation test ran. The probe closed stdin and reaped process exit 0; no inference turn or product writer was started. Ephemeral/path metadata was observed; absence of all incidental runtime cache/log writes was not audited. Global config preservation is checked separately below.

### Acceptance and limitations

| Criterion | Outcome |
|---|---|
| Versioned schema and lifecycle interface | Passed within CLI 0.164.0 scope |
| Same-chat live model/A/N/U/C | Unavailable through inspected supported interfaces |
| Synthetic threshold arithmetic | Passed 3 cases: U=100000 → P/H=65000/75000; 258400 → 167960/193800; 1000000 → 208000/240000. Hypothetical only; no C/R proof |
| Malformed checkpoint JSON | Parser rejected truncated JSON; not atomic publication or crash recovery proof |
| Stateful synthetic event/latch tests | Skipped: no controller implementation; arithmetic is not a state-machine test |
| Live threshold crossing/overshoot and reserve | Not tested: no verified A/U/C; deliberate context inflation prohibited |
| Interrupt latency, checkpoint-only enforcement, crash/reconnect, compaction latch | Not tested: no controlled inference workload/controller; EOF exit is not turn interruption |
| Fresh session controls | Partial: distinct empty ephemeral starts observed; desktop handoff, sentinel isolation, ambient memory and baseline occupancy unverified |
| Writer safety | No second product writer launched; lock/idempotence/crash behavior untested |
| Automatic/hard-stop guarantee | Not established; automation remains unimplemented |

Bounded H0 packet is finished, not full safety validation. Keep manual one-packet/fresh-chat fallback, proposed thresholds unvalidated, and stop for review. A future approved experiment would need a separately controlled inference session, same-session status/event semantics and explicit bounded interruption/recovery criteria. Do not treat missing telemetry as permission to implement a controller or expand this packet. Product tests and visual QA were not run (no application).

Final H0 validation: initial whole-tree whitespace check failed on existing whitespace in the unchanged original product specification. Preserved that source. Scoped rerun passed JSON/JSONL parsing, all local Markdown file links, balanced fences, changed-file whitespace and exact six-file change inventory. Other 15 baseline files (including three original sources) and global config SHA-256 are unchanged. Git diff remains blocked. No production code or persistent diagnostic script was added.

## 2026-10-27 — H0b approved bounded inference follow-up

User approved the proposed tiny inference/usage/interruption/isolation diagnostics with GO and explicitly requested this existing chat. This is a bounded exception, not evidence of fresh coordination context or a standing relaxation of manual fallback. Rechecked root AGENTS, canonical state, relevant context/delivery sections and L001. Only root instructions found. Git status again exited 128. Baseline: 21 files; temporary data under `/tmp/keemese-h0b-ynep74mw`. Existing generated CLI 0.164.0 schemas were used; no installations or model/window changes.

A transient Python stdin diagnostic drove a separate `codex app-server --listen stdio://` in an empty temporary cwd. Two thread/start calls requested ephemeral=true, read-only sandbox and approvalPolicy=never. No global settings were changed. Prompts forbade tools/files/network/memory writes/agents; the diagnostic rejected any server requests for tools or approval. No persistent controller/script was added. Thread A: `01a17d4b-877a-7b50-9700-d01015d0621d`; B: `01a17d4b-aa6a-7df0-8d2b-d1ffaf3bafa3`. Both returned empty turns, null path and model selection gpt-6-astra. Successful inference proves the selected session worked, not a server-attested model identity or current desktop model. No reroute event was recorded.

| Trial | Turn ID | Observed outcome |
|---|---|---|
| A: supply random temporary sentinel, request ACK | 01a17d4b-8c76-7b93-a221-bf02332eeef7 | completed, exact ACK, 5236 ms |
| A: recall without resupplying sentinel | 01a17d4b-a0f4-7cd3-acb5-34c4c3debb63 | completed, exact sentinel match, 2414 ms |
| B: ask for prior token, otherwise UNKNOWN | 01a17d4b-aaaa-73c3-8cb6-75250238398e | completed, exact UNKNOWN, 4277 ms |
| B: tiny ACK turn, interrupt immediately after turn/start response | 01a17d4b-bb65-7a70-acf1-ed158db47578 | acknowledgement {}, terminal interrupted in 30 ms, zero observed response characters |

Elapsed times use local monotonic clock after turn/start response; interrupt latency starts before sending turn/interrupt. One trial only, without deliberate long generation. The interrupted trial's expected ACK comparison was false because no answer was emitted: that is not a failed cancellation. All three completed response comparisons passed. The sentinel itself and raw prompts/responses are not retained in project records. This checks narrow behavior, not absence of hidden memory or all cross-thread leakage. Fresh-thread first request still included runtime context; no baseline occupancy guarantee follows.

Live `thread/tokenUsage/updated` payloads:

| Trial | last input | cached input | output | reasoning output | last total | cumulative total | modelContextWindow |
|---|---:|---:|---:|---:|---:|---:|---:|
| A1 | 16277 | 13184 | 5 | 0 | 16282 | 16282 | 258400 |
| A2 | 16310 | 16128 | 22 | 0 | 16332 | 32614 | 258400 |
| B1 | 16261 | 13184 | 5 | 0 | 16266 | 16266 | 258400 |

Cache-write input was zero. In this sample cumulative total equals the sum of A's two latest-request totals; cumulative input 32587, cached input 29312 and output 27 likewise sum. Cached input is not added a second time to input. Zero reasoning counts do not establish nonzero reasoning accounting semantics. These are live events for the isolated runtime only. `last` is consistent with latest-request usage, not a reliable continuously updated retained occupancy A. `modelContextWindow` is live-reported but its nominal/usable distinction remains unknown; C is absent. No same-session CLI /status comparison, pending-tool-output accounting, compaction reset or reroute test ran. Therefore no A/U percentage, reserve or threshold is validated.

Cleanup: stdin closed, child process reaped with exit 0. No deliberate context inflation. No second product writer was launched. Incidental runtime cache/log behavior was not audited; ephemeral metadata is not proof of zero runtime disk writes. No broad socket/database/transcript inspection. No automatic controller or fresh successor workflow implemented.

Acceptance: three bounded inference completions, narrow sentinel isolation, live event receipt and immediate cancellation passed. Ongoing-generation interruption, external-process stopping, threshold crossing/overshoot, crash/reconnect, compaction latch and general ambient-history isolation remain untested. Reliable retained A, usable U and effective C remain unresolved. Stop investigating automatic enforcement under this packet; keep manual bounded fresh-chat fallback and stop for review. Repository/architecture approvals remain prerequisites before product F0.

H0b final checks passed: JSON/JSONL, local Markdown file links, fences, changed-file whitespace, exact six-file change inventory and no added project files. Other 15 files and global config hash unchanged; existing source whitespace preserved. Git diff --check blocked (129, no repository). No application tests or visual QA run.

## 2026-10-27 — Repository and architecture readiness review

User authorized review after H0b, not implementation. Continued bounded documentation review here; not a fresh-session claim. Rechecked AGENTS/progress/handoff, docs index, relevant L001, architecture/decisions/testing/operations plans and authoritative specification sections 35–36. No nested AGENTS found. Verified 21-file workspace baseline; Git status 128 (absent repository). Read-only versions: SDK 10.0.403, Node 24.22.1, npm 11.19.1, psql 18.6. Docker not on PATH. Git author fields configured; values not printed or recorded. DB/container readiness remains untested.

Primary .NET support, Npgsql 10 and Vite documentation rechecked; links in delivery plan. No package resolution/download/install or product runtime test. Prepared reviewable R0 init/baseline-commit proposal and F0a/F0b split, with paths, permissions, acceptance and stop boundaries. ADR01/02 and D08 remain proposed; user owns approval. Existing source sections allow this stack direction; no product-scope change. No new reusable lesson warranted; existing L001 still applies.

Updated delivery/decision documents and canonical progress/handoff. No Git/global/model/window/product changes. Recommend retaining manual context fallback and moving to repository/architecture approval rather than further automatic-enforcement experiments. Execution permission must be explicit, especially baseline staging/commit and package downloads.

Review validation passed: JSON/JSONL, local Markdown file links, balanced fences, changed-file whitespace, exact five-file changes and preservation of other 16 baseline files. No new project files. Git diff --check blocked (129). Manual coverage review confirmed R0/F0a/F0b permissions and acceptance; no application verification claimed.

## 2026-10-27 — Stack/R0 accepted; fresh-session handoff

User explicitly approved the recommended stack and R0, then requested closure and a fresh conversation. Recorded ADR01/02 and D08 acceptance, authorized R0 init/staging/baseline commit/branches, and replaced the next-task approval request with execution instructions. No R0 command was run here. F0a/F0b, installs, global settings, remote/push and hooks/controller remain unauthorized. Post-baseline checkpoint edits may remain uncommitted; no implicit second commit/amend permission.

Read-only check: project .codex absent; /home/kali/.codex exists. Exact .codex literal was not found in the current bootstrap; relevant passages describe AGENTS, configuration inspection, skills and justified additions. Official configuration and skills docs were consulted using the already-applied OpenAI Docs skill: https://learn.chatgpt.com/docs/config-file/config-basic and https://learn.chatgpt.com/docs/build-skills. Project config is optional and trust-gated; documented repository skill discovery uses .agents/skills. No directory/config/skill created. Existing AGENTS and harness records suffice for R0. No preceding conversation needs importing.

Closure checks passed: JSON/JSONL, local Markdown file links and changed-file whitespace; .git and project .codex remain absent. Approval and handoff records agree on R0-only execution. Git diff unavailable without repository.

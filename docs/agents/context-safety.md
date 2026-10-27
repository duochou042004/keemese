# Context safety and fresh-session design

Status: recommended design; automation NOT implemented or verified. Owner: coordinating agent; approval: user. Evidence date: 2026-10-27, Asia/Ho_Chi_Minh. This is a development harness requirement, not a customer-facing LMS feature.

## H0 bounded pilot outcome — 2026-10-27

The approved H0 packet has finished with limitations; see the [dated build-log evidence](../../harness/logs/build-log.md). The table below records the earlier Phase 1 inspection, not continuously refreshed telemetry. H0 reconfirmed CLI 0.164.0 and the absent daemon socket. Current-chat model/A/N/U/C remain unavailable. Installed schema fields alone do not establish occupancy semantics. Two isolated ephemeral thread starts returned different IDs, empty turns and null paths; no model turn was run. This is partial lifecycle evidence, not proof of desktop successor isolation or automated stopping. Numerical proposals remain unvalidated. Manual bounded-packet fallback remains the only operating policy; stop for review before another packet.

## H0b bounded inference follow-up — 2026-10-27

User explicitly authorized the proposed follow-up here in the continuing chat; this exception is not fresh-session evidence or a standing policy change. Two isolated ephemeral threads ran three tiny completed turns and one immediately interrupted turn. A token was recalled within its original thread; the new thread answered UNKNOWN without receiving it. One interrupt acknowledgement was followed by terminal interrupted status in 30 ms. These narrow observations do not prove general history isolation, ongoing-generation cancellation, worst-case latency or safe external-process stopping.

Live usage notifications were obtained for that separate runtime: cumulative totalTokens 16282 then 32614, versus last.totalTokens 16282 then 16332. A fresh thread reported 16266. Each reported modelContextWindow 258400; nominal/usable semantics and C remain unverified. Latest-request usage is not guaranteed current retained occupancy after new input/tool output. No percentages or thresholds were enabled. Current desktop chat telemetry remains unknown. Full evidence is in the [build log](../../harness/logs/build-log.md). Stop for review; retain manual bounded fresh-chat fallback.

## Authority and observed runtime

The user approved Phase 1 and explicitly replaced the earlier large-window handoff preference with conservative context management. Preserve the bootstrap and research files as history. Their 272K–280K target is not an operational target now. No model, global config, context setting, hooks, or installed tools were changed.

| Measurement | Evidence in this session | Interpretation |
|---|---|---|
| Installed CLI | `codex --version`: `codex-cli 0.164.0` | Actual executable version; not proof of desktop server version |
| Active thread | Desktop `read_thread`, current thread ID, returned active status and cwd | Live thread exists; response exposes no model or context counters |
| Active model | Not exposed by inspected live interface | User config selects `gpt-6-astra`; this is configuration, NOT verified active model |
| Nominal limit N | Not reported live | Cached catalog previously said 272000 default / 872000 max for configured model; not an operating denominator |
| Usable limit U | Not reported live | Prior 258400 calculation from cache is only inference; forbidden as enforcement input |
| Active occupancy A | Not reported live | Unknown; do not estimate from words, account usage or transcript length |
| Auto-compaction threshold C | Not reported live; no explicit user override found | Model default may apply; do not assume 90%, 95%, or any numeric threshold |
| Cumulative consumption | Not obtained for this thread | Distinct from retained context; repeated input can be counted repeatedly |
| Account quota | `get_usage_limits`: 14% used in 300-minute window, 2% in 10080-minute window at inspection | Ephemeral account-wide usage, not A/U; not stored as ongoing project state |
| Local server control | `codex app-server daemon version` failed: default control socket absent | Cannot attach this documented route to the running desktop session |
| Hooks executing here | Not demonstrated | No hook was installed, trusted or triggered |

No supported live active-context counter was obtained. The desktop's private IPC socket was not reverse engineered. No session transcript or internal SQLite store was parsed. Starting a separate server would measure a different runtime and was not used to imply access to this chat. No `/status` was sent to another session as a proxy for this one. Exact percentage monitoring is unavailable here.

## Mechanisms evaluated

Official sources accessed on 2026-10-27:

- [CLI slash commands](https://learn.chatgpt.com/docs/cli/slash-commands): `/status` presents model and context information; `/new` or `/clear` starts a fresh chat. These require the relevant CLI UI; `/statusline` changes configuration and was not used. Desktop equivalence is unverified.
- [App-server](https://learn.chatgpt.com/docs/app-server): documents `thread/tokenUsage/updated`, `turn/steer`, `turn/interrupt`, `turn/completed`, and `thread/start`. `thread/read` does not subscribe. Fork copies history; resume continues it. The documentation labels app-server experimental. CLI help confirms the installed entry point. Event semantics and control timing still require a version-matched pilot.
- [Hooks](https://learn.chatgpt.com/docs/hooks): `PreCompact`/`PostCompact` surround compaction; synchronous `continue:false` can stop at those boundaries. Shared inputs include model/session metadata but no documented continuous occupancy counter. Transcript format is explicitly unstable. Background hooks cannot block. Hook trust and actual execution must be verified. These hooks alone cannot detect the earlier 65% boundary.
- [Codex SDK](https://learn.chatgpt.com/docs/codex-sdk): supports new threads and continued/resumed runs. It is a candidate for bounded jobs; this review did not establish a usable live-occupancy signal or a per-model-request admission gate through the SDK. No SDK installed.
- [Configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference): documents `model_context_window`, `model_auto_compact_token_limit`, and threshold scope. These describe settings, not proof of effective session values. No changes proposed merely to enlarge capacity.
- Installed `codex exec --help`: supports structured `--json` output and separate resume/fork commands. New exec jobs are a possible fresh-work-packet runner; end-of-turn usage alone would be insufficient for mid-turn safety.
- Desktop tools expose fresh chat creation and coordination, but no context counter or guaranteed current-chat self-interruption. No new chat was created in Phase 1. User authorization is required before an automated successor-launch workflow is enabled.

## Measurement contract before enabling automation

The controller must bind each sample to thread ID, turn/request ID, active model, runtime version, timestamp and sequence. Store measurement provenance, not raw prompts or transcripts. Distinguish N (advertised maximum), U (actual usable limit after runtime reservations), A (runtime-reported retained context), C (effective compaction threshold and its counting scope), cumulative input/output/reasoning usage, and account quota windows. Null means unknown, never zero.

During a separately approved pilot, inspect generated protocol schemas from the installed version and the actual event payload. Establish which fields represent latest request usage versus cumulative totals; do NOT assume a field named `total` or `last` is active occupancy. Validate cached-input, output and reasoning accounting, pending tool results, compaction reset, model rerouting, and whether reported `modelContextWindow` (if present) is nominal or usable. Compare with `/status` on the SAME controlled session. If there is no reliable A/U signal, automation stays disabled. A stale latest-request measurement is not current occupancy after arbitrary new tool output.

## Proposed trigger policy

These are project risk limits to validate, not scientific thresholds. A large advertised window must not allow work to drift to 400K–500K.

For verified U, proposed preparation P = min(floor(0.65 × U), 208000); substantive-work stop H = min(floor(0.75 × U), 240000). The 208K/240K caps are conservative proposals derived from 65%/75% of the existing 320K policy ceiling; the user must approve them with this design. The old 320K ceiling remains an outer ceiling, not a working budget. Earlier runtime limits always win.

If C uses compatible accounting, reserve R must also fit before compaction: P ≤ C − 2R and H ≤ C − R. Determine R from worst observed bounded request/tool-output growth plus checkpoint cost and interruption latency in the pilot; do not invent a reliable reserve. If this cannot be measured or the inequalities leave no safe workspace, use the manual fallback. Never raise C or disable compaction to make this policy fit.

Illustrative arithmetic ONLY: if U were live-verified as 258400, P=167960 and H=193800, before any earlier C reserve. These are not the thresholds of this chat. If U were 1000000, caps keep P=208000/H=240000. Recompute on verified model/capacity changes; missing/stale telemetry latches a pause rather than silently widening limits.

| State | Admission and exit rule |
|---|---|
| Normal | Bounded packet only; checkpoint each material milestone. Before each operation, verify telemetry freshness and measured headroom. |
| Preparation: A ≥ P | Stop broad exploration/new features. Finish only the smallest recoverable unit; verify and persist checkpoint. Handoff early if ready. |
| Stop: A ≥ H | No further substantive work. Interrupt at a safe boundary; only bounded recovery/checkpoint work within proven reserve. If no reserve, stop and have a fresh recovery session inspect actual state. |
| Unknown/stale | Pause automatic admission. One manual bounded packet only; checkpoint and fresh-session handoff before another substantial packet. Never manufacture a percentage. |
| Compaction observed | Latch handoff-required. A lower post-compaction count must not reset the decision to continue. Validate checkpoint externally and start fresh. |

## Enforcement design and honest guarantees

Recommended future prototype: an external controller owns one local app-server connection and one active writer. It receives usage/lifecycle events, validates measurements, records a compact ledger, and directs checkpoint-only work at P. At H it prevents new work packets and requests interruption; it waits for terminal turn state and any external process to settle before handing off. It uses new `thread/start`, never fork/resume or full history injection, for the successor.

Important limit: usage notifications plus interrupt are reactive. A long request or large tool result may cross H before the next notification; a turn can contain several model/tool cycles. No pre-request admission control or hard token-exact stop has been verified in this environment. Therefore this design currently offers NO automatic hard-stop guarantee. A future pilot must either establish a synchronous admission mechanism covering all relevant operations, or label the controller best-effort with measured overshoot and require bounded tasks/manual supervision. Do not advertise strict enforcement on a successful demo alone. Prompt self-monitoring is advisory only.

Proposed hooks are secondary safeguards: PreCompact detects impending fallback; PostCompact prevents silent continuation; a validated synchronous policy hook could consult controller state for supported tool calls. Hooks cannot by themselves cover all model requests, background tasks or external writes. No hook code/config is included in Phase 1.

Immediate safest workflow: manual fresh chat after each substantial bounded packet, with human inspection of available context UI before/after large reads. If UI is unavailable, do not claim monitored percentages. Finish this planning packet, persist state, stop at approval, and conduct the next approved packet in a new chat. Do not silently continue an entire milestone under the fallback.

## Checkpoint and fresh-session protocol

1. Stop admitting feature work; finish or safely pause the smallest atomic operation. Record running processes, incomplete writes/migrations and recovery actions. Never kill a persistent-data operation blindly.
2. Verify files/Git independently of the agent's recollection. Record actual root, branch/commit or null, changed/untracked files, preserved user work, approved scope, completed/incomplete criteria, exact checks with outcomes, pending risks/decisions, and one next task.
3. Update `harness/state/progress.json`, `harness/state/handoff.md`, and build log. Validate JSON, links and diff. A future controller should write checkpoint generations atomically and publish a ready marker/hash only after validation; this mechanism is not implemented yet.
4. Pause the old writer. Start a new thread with only: repository location, read AGENTS/progress/handoff, approved packet ID, acceptance/verification requirements and relevant document paths. No old transcript, resume ID, fork history or compaction summary as substitute.
5. Successor confirms a new thread ID, verifies checkpoint against disk, and reads only required references. Fresh means fresh conversation; static system instructions/tools still consume context. Explicitly test whether ambient memory injection adds unrelated prior history.
6. Resume work only after verification. Retain the old chat for evidence; no automatic deletion/archiving or new authorization is inferred. If launch fails, leave a stopped recoverable workspace and the exact manual start prompt.

Minimal successor prompt: “Work in /home/kali/App_projects/keemese. Read AGENTS.md, harness/state/progress.json and harness/state/handoff.md. Verify actual state. Execute only the explicitly approved packet identified there; if approval is absent, review and wait. Do not load previous conversation or all docs. Follow the context policy and stop at the packet boundary.”

## Failure modes and required pilot evidence

| Failure | Required prevention/verification |
|---|---|
| Cumulative usage mistaken for A | Repeated fixed-context runs increase cumulative usage without implying equal occupancy; compare runtime/UI semantics |
| Missing/reordered/stale events | Sequence and freshness checks; disconnect pauses admission; reconnect cannot reset latch |
| Large tool output/request overshoot | Bounded outputs; measured reserve and latency; simulate crossing both thresholds in one event |
| Model changes or automatic reroute | Reverify U/C; pause on unknown; no cached fallback |
| Compaction clears warning | Latch survives compaction; PostCompact behavior tested separately |
| Invalid/partial checkpoint | Reject malformed JSON, stale commit/hash, absent evidence; preserve previous valid generation |
| Two writers/new thread duplication | Single writer lock and idempotent launch journal in future controller; crash/retry test |
| Interrupted commands still running | Observe process completion and filesystem consistency before release of writer ownership |
| Secrets in telemetry | Store counters/IDs/status only; redaction tests; exclude transcript/student data |
| Fresh chat imports old context | New ID plus controlled sentinel/history check and measured baseline; no fork/resume |
| Hook disabled/untrusted/failing | Startup health check; explicit fail-safe behavior; do not claim coverage merely from config |

Pilot acceptance: versioned schemas; same-session verified model/A/U/C or explicit unavailable classification; synthetic threshold/state tests; live bounded crossing and measured overshoot; crash/reconnect recovery; verified checkpoint-only phase; new empty-history session; no concurrent writers; preserved changes; recorded operating limits. No implementation/model/config changes until separately approved. If hard-stop behavior cannot be demonstrated, publish “best-effort controller” and retain manual boundaries rather than weakening this requirement.

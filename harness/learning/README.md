# Evidence-backed learning

Owner: coordinating agent. Canonical ledger: [lessons.jsonl](lessons.jsonl). Keep reusable prevention knowledge here, current task state in [progress](../state/progress.json), and chronology in [build log](../logs/build-log.md).

One JSON object per line. Fields: id, date, status (candidate/confirmed/promoted/retired), scope, tags, trigger, expected_behavior, observed_behavior, impact, evidence, root_cause with confidence, recurrence, prevention, owner, validation with method/result/limitations, last_seen. No secrets, credentials, student data or raw transcripts.

Before a packet, search by relevant tags/module/failure signature; read matching records and linked prevention only. Do not preload a growing ledger. Update an existing matching lesson before adding another. Record material user corrections, recurring waste, missed approvals, verification/handoff defects or proven safeguards; skip harmless typos and routine exploration.

Candidate means cause/prevention unproven; confirmed requires evidence; promoted requires a durable prevention owner and validation; retired records explain supersession. Writing a rule alone is not proof it works. Prefer a narrow existing-document correction, deterministic check or regression test to a new skill. Any hook/tool/global policy implementation still needs approval.

At milestone review, inspect actual failures and recurrence, choose the smallest justified improvement and measure it. Retrospectives are created only for material findings; [Phase 1 review](retrospectives/phase-1.md) records the current context reliability concern. No automatic learning pipeline or scripts exist.

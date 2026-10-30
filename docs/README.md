# Planning baseline

Current status — 2026-10-30: **paused by user after completed C1e**. Foundation, identity/bilingual UI, native-text folders/search/tags/copy and CI are implemented; broader teaching workflows remain unapproved. New-device entry: [portable handoff](delivery/device-handoff.md), [paste-ready goal](delivery/resume-goal.md), [pause/reset evidence](testing/evidence/device-pause.md). Use the [setup README](../README.md) for executable commands and canonical state for status. Historical planning entries below are not current approval gates.

Status: Phase 1 proposal, 2026-10-27. Documentation approval does not authorize implementation. The original [product specification](spec/personal_english_tutor_teaching_workspace_spec.md) remains authoritative for product scope. The [bootstrap](agent-governance/Codex_Project_Initialization_and_Agent_Governance.md) remains historical governance; the user's later context-safety amendment is recorded in [context safety](agents/context-safety.md) and takes precedence over its old token targets. Supporting [research](agent-governance/research/Codex_Harness_Research_Notes_VI.md) is preserved, not promoted to authority.

| Read when | Canonical owner | Purpose |
|---|---|---|
| Starting/resuming work | [progress](../harness/state/progress.json), [handoff](../harness/state/handoff.md) | Current status and one next action |
| Product scope or acceptance | [requirements](product/requirements.md) | Source-section traceability, scope and acceptance |
| Domain/API work | [architecture](architecture/design.md), [API](backend/api.md) | Boundaries, data, lifecycle, contracts |
| Reviewing choices | [decisions](decisions/decisions.md) | Proposed ADRs and open decisions |
| UI work | [frontend](frontend/design.md) | Journeys, tokens, page/component contracts |
| Identity/data/file work | [security](security/threat-model.md) | Threats and controls |
| Verification | [testing](testing/strategy.md) | Risk-based proof and release gates |
| Planning an increment | [delivery](delivery/plan.md), [I1 readiness](delivery/i1-readiness.md), [bilingual packet](delivery/bilingual-ui.md), [C1a text library](delivery/c1a-text-library.md), [C1b folders](delivery/c1b-folders.md), [C1c search](delivery/c1c-text-search.md), [C1d tags](delivery/c1d-text-tags.md), [C1e copy proposal](delivery/c1e-text-copy.md), [next C1 goal handoff](delivery/next-c1-goal-handoff.md), [proposal handoff](delivery/c1c-search-handoff.md), [CI1](delivery/ci1.md), [CI evidence](testing/evidence/ci1.md) | Dependencies, concrete identity proposal and approved packet |
| Setup/release/recovery | [operations](operations/runbook.md) | Portable environment and operational proposals |
| Context or harness work | [context safety](agents/context-safety.md) | Runtime evidence, trigger and fresh-session design |
| Learning from an incident | [learning](../harness/learning/README.md) | Schema, retrieval, promotion |
| Historical evidence | [build log](../harness/logs/build-log.md) | Actual actions and checks |

The coordinating agent maintains these records; the user owns approval of product scope, architecture, governance changes and release. Specialized documents own details; other documents link rather than duplicate state. No nested instructions or new skills are justified yet. Product roadmap Phase 2 means post-MVP; governance Phase 1 means planning, not a product release.

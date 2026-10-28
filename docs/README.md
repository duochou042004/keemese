# Planning baseline

Current execution: F0a and F0b foundation acceptance passed. PostgreSQL proof is isolated in a test-only project; teaching workflows are not authorized. Use the [setup README](../README.md) for executable commands and the canonical checkpoint for current status. The planning documents below retain future proposals.

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
| Planning an increment | [delivery](delivery/plan.md), [I1 readiness](delivery/i1-readiness.md), [bilingual packet](delivery/bilingual-ui.md), [C1a text library](delivery/c1a-text-library.md), [CI1](delivery/ci1.md) | Dependencies, concrete identity proposal and approved packet |
| Setup/release/recovery | [operations](operations/runbook.md) | Portable environment and operational proposals |
| Context or harness work | [context safety](agents/context-safety.md) | Runtime evidence, trigger and fresh-session design |
| Learning from an incident | [learning](../harness/learning/README.md) | Schema, retrieval, promotion |
| Historical evidence | [build log](../harness/logs/build-log.md) | Actual actions and checks |

The coordinating agent maintains these records; the user owns approval of product scope, architecture, governance changes and release. Specialized documents own details; other documents link rather than duplicate state. No nested instructions or new skills are justified yet. Product roadmap Phase 2 means post-MVP; governance Phase 1 means planning, not a product release.

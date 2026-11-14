# Orchestrator Report Template

## Quick Smoke

1. Target build, scope, and environment.
2. Checks and evidence.
3. Findings and limitations.
4. Verdict and next action.

## Release Coordination

Add:

- source authority and conflicts;
- selected/skipped gates with reasons;
- evidence ledger with freshness;
- findings by source ID;
- coverage and blocked/not-run areas;
- fix handoff and recheck plan.

## Verdicts

- `GO`: required selected gates are supported and no release blocker remains.
- `GO WITH MINOR ISSUES`: remaining issues are bounded and accepted risk has a named owner/source.
- `NO-GO`: unresolved critical-flow, acceptance-critical, domain, or collective material blockers remain.
- `BLOCKED`: missing required evidence prevents a release conclusion.

Do not transform acceptance-critical `PARTIAL`, collective material P2 findings, stale evidence, or untested required gates into `GO` merely because no P0/P1 label appears.

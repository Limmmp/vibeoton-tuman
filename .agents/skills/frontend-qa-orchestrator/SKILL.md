---
name: frontend-qa-orchestrator
description: >-
  Use when a testable frontend needs coordinated smoke, acceptance,
  accessibility, performance, regression, or release checks. It selects gates,
  reuses valid evidence, and issues a supported go/no-go recommendation.
---

# Frontend QA Orchestrator

Coordinate QA without duplicating specialist audits. Its responsibilities are to select checks, collect or reuse suitable evidence, and produce a verdict plus recheck plan.

## Modes

- `quick smoke`: build/start, primary flow, console/network, and changed-surface sanity.
- `release coordination`: coverage, selected domain gates, blockers, and release verdict.
- `fix loop`: concrete implementation handoff plus targeted rechecks.

Use `references/qa-intake.md` to identify the build, routes, states, source artifacts, environment, risk, and requested deliverable. Audit-only remains read-only; when fixes are requested, route them to `frontend-implementation` within the same authorized request.

## Workflow

1. Select proportionate gates with `references/gate-routing-matrix.md`.
2. Run smoke first where it unlocks later checks. A local blocker on one route does not prevent useful independent checks elsewhere.
3. Reuse existing specialist evidence only when build identity, scope, state, environment, and time remain applicable. Rerun affected checks when any of those materially changed.
4. Track source finding IDs and evidence using `references/evidence-ledger-template.md`. Merge duplicates without erasing distinct user impact or evidence.
5. Follow `references/qa-runbook.md` for fix and regression sequencing.
6. Issue `GO`, `GO WITH MINOR ISSUES`, `NO-GO`, or `BLOCKED` using selected-gate evidence, then write a compact or full report from `references/orchestrator-report-template.md`.

## Decision Rules

- `GO` requires every required selected gate to be supported or explicitly not applicable.
- `GO WITH MINOR ISSUES` requires bounded non-blocking issues and a real accepted-risk owner/reference; the agent cannot invent acceptance.
- `NO-GO` covers unresolved release blockers, acceptance-critical partial/fail results, critical-path failures, or collectively material findings.
- `BLOCKED` means a required verdict cannot be supported, not that all independent diagnosis must stop.

Check status, severity, confidence, and verdict are separate. Missing or stale evidence is never `PASS`. One specialist report should not be rerun or copied in full without a scope or freshness reason.

For handoffs, use `references/handoff-contracts.md`. After a fix, rerun the failed check and regression smoke for affected surfaces; repeat every audit only when the change alters shared risk.

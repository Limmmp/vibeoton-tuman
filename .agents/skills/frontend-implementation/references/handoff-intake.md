# Handoff Intake

Use this reference for briefs, plans, screenshots, specifications, or prior findings.

## Contract

Record separately:

- requested deliverable;
- authoritative sources and conflicts;
- artifact readiness;
- must-preserve constraints;
- blockers and reversible assumptions;
- affected files/surfaces and verification criteria.

Inspect the current project before editing. Existing framework, lockfile/package manager, styling system, components, assets, and test conventions take priority.

## Status Handling

- `Planner-ready`: enough design context exists for planning, not necessarily direct coding. If code was requested, create the minimum technical plan and continue.
- `Implementation-ready`: implement when the requested deliverable includes code.
- `Prompt-ready`: produce a prompt only when that is the requested output; a newer request for local code takes precedence.
- `Needs product input`: ask only for the material unresolved decision and continue independent work.
- `Needs design brief` / `Needs reverse engineering`: gather the minimum missing context when it is needed for the requested result.
- `Audit-ready after build`: criteria exist for later verification; it is not evidence of a passed audit.

An absent “approved” label is not a blocker when the user explicitly asked to build. A plan-only or audit-only request remains read-only. An audit-and-fix request permits baseline, fix, and recheck without a second approval.

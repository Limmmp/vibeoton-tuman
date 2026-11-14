# Handoff Contracts

Keep three fields separate:

- `Requested deliverable`: brief, plan, code, prompt, audit, or audit-and-fix.
- `Artifact readiness`: what the current artifact contains enough information to support.
- `Blockers / assumptions`: decisions that remain material or assumptions made to continue.

Readiness never acts as a new permission boundary.

## Readiness Statuses

| Status | Meaning | Next action when requested |
| --- | --- | --- |
| `Planner-ready` | Enough design context exists for a technical plan | Plan, then continue if the requested deliverable is code |
| `Implementation-ready` | Enough context exists to code | Implement when code was requested |
| `Prompt-ready` | Enough context exists for a generator prompt | Produce the prompt when requested |
| `Needs product input` | A material product choice is unresolved | Ask specifically; continue independent work |
| `Needs reverse engineering` | Missing current-interface evidence materially affects the result | Inspect the minimum relevant artifact |
| `Needs design brief` | Technical work lacks a material design/UX decision | Create or request only the missing design context |
| `Audit-ready after build` | Future audit criteria are defined but no result exists | Do not report those criteria as passed |

## Handoff Content

To planning, pass audience, goal, IA, first viewport, visual rules, states, responsiveness, accessibility constraints, non-goals, and assumptions—without inventing frameworks or packages.

To implementation, pass the requested deliverable, must-preserve decisions, assets, states, responsive behavior, acceptance checks, readiness, and blockers. A composite design-and-build request may proceed without a separate approval round.

To prompt generation, pass the same design contract plus explicit unknowns. To reverse engineering, identify the exact surface and evidence needed; do not request a full report when a focused inspection is sufficient.

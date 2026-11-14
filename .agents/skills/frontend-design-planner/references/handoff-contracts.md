# Handoff Contracts

Record `Requested deliverable`, `Artifact readiness`, and `Blockers / assumptions` separately. Readiness describes information quality, not authorization.

## Statuses

- `Planner-ready`: enough design context exists to create the plan.
- `Implementation-ready`: enough technical and design context exists to code.
- `Prompt-ready`: enough context exists for a generator prompt.
- `Needs product input`: a material product decision is unresolved.
- `Needs design brief` or `Needs reverse engineering`: a specific context type is missing.
- `Audit-ready after build`: future checks are defined, but no audit has run.

When the requested deliverable is a build, a `Planner-ready` input should be planned to the minimum required depth and then implemented. Do not stop solely to obtain a new status label. When the user asked only for a plan, stop after the plan and do not edit code.

## To Implementation

Pass stack and package-manager constraints, relevant file/module responsibilities, data/state/form behavior, routes, tokens/assets, responsive and interaction rules, implementation order, verification commands, readiness, and blockers. Do not reselect an existing project stack without a migration reason.

## To Audits

Name future acceptance, accessibility, or performance checks proportionately. These are planned gates, not evidence that a gate passed.

## To Prompt or Design

For a generator prompt, pass product, design, stack constraints, components/states, responsiveness, and unknowns. Request design or reverse-engineering input only for the material decisions that remain missing.

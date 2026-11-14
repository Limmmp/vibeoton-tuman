---
name: frontend-design-planner
description: >-
  Use when a supplied or sufficiently defined Web/UI direction needs a concrete
  technical frontend plan covering stack, components, state, files, delivery,
  and verification. Do not use when the user asked for code rather than a plan.
---

# Frontend Design Planner

Turn a design artifact or defined concept into a developer-ready plan. If the user requested an end-to-end build, planning is an internal step and should be followed by implementation; if they requested only a plan, do not edit source files.

## Modes

- `compact`: small page, prototype, or narrow feature.
- `production`: routed, data-backed, public, or release-sensitive work.
- `handoff-ready`: a plan intended for immediate implementation.

Omit irrelevant sections instead of padding them with boilerplate. Load `references/output-template.md` for the proportional output shape.

## Workflow

1. Identify the requested deliverable, authoritative design inputs, current project constraints, assumptions, and material blockers.
2. Inspect the existing stack before recommending tools. Preserve its framework, package manager, styling, and component conventions unless the request includes migration.
3. Choose the smallest suitable stack. Read `references/stack-selection.md`, `references/framework-selection.md`, and `references/project-structures.md` only when the choice or structure is material.
4. Map UI regions to components, routes, assets, state/data ownership, forms, async states, motion, and responsive behavior.
5. Define testing, accessibility/performance handoffs, deployment, CI, and SEO only to the depth required by the product and requested output.
6. Order implementation work around dependencies and risk. End with artifact readiness, assumptions/blockers, and the next action implied by the user's requested deliverable.

Use these references when applicable:

- `references/react-project-structure.md` for React-family file plans;
- `references/data-state-strategy.md` for forms, search, filters, auth, URL state, server data, and async mutation behavior;
- `references/motion-guidelines.md` for meaningful animation or scroll choreography;
- `references/testing-strategy.md` for test and visual-regression scope;
- `references/deployment-ci.md` and `references/seo-content-strategy.md` for production/public surfaces;
- `references/handoff-contracts.md` for readiness and downstream contracts;
- `references/planning-quality-checklist.md` before substantial delivery.

When the design direction itself is materially undefined, consult `../web-ui-designer/references/workflow-routing.md`. Do not require a full design brief for a narrow technical plan if the relevant design decisions are already clear.

## Planning Rules

- Preserve explicit stack, brand, accessibility, performance, and “no dependency” constraints.
- Explain every proposed dependency by responsibility; do not prescribe fashionable libraries.
- Treat design regions as code units only where responsibility, reuse, state, or change safety supports the boundary.
- Include failure, pending, stale-response, retry, refresh/back-forward, and cleanup behavior when the product needs them.
- Distinguish future audit criteria from evidence that an audit has passed.

Use `Planner-ready` only when information is sufficient for technical planning and `Implementation-ready` only when it is sufficient to code. Readiness describes the artifact; it does not grant or revoke authorization.

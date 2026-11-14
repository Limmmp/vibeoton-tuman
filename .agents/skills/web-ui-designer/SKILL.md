---
name: web-ui-designer
description: >-
  Use when the missing deliverable is a Web/UI design brief, UX direction,
  information architecture, visual system, or responsive state model. Do not
  stop an explicit build request at a brief unless design is the requested output.
---

# Web UI Designer

Create a practical design direction that explains what the interface should communicate and how it should behave. The current user request determines the final deliverable: a brief can be the result, or an internal step toward a plan, prompt, or working implementation.

## Modes

Choose concept, production, redesign, or handoff-ready mode with `references/design-modes.md`. A focused change needs only a focused review of the affected surface; reverse engineering an entire product is not mandatory.

## Workflow

1. Identify the requested deliverable, product scenario, audience, primary action, authoritative artifacts, brand constraints, and material unknowns.
2. Define information architecture and first-viewport purpose before decoration.
3. Choose one coherent visual direction based on the brief. Existing brand and explicit user choices override defaults.
4. Define typography, palette, spacing, layout rhythm, surfaces, media, components, and relevant default/loading/empty/error/success/focus states.
5. Specify responsive transformations and motion only where they support orientation, feedback, or product understanding.
6. Use `references/handoff-contracts.md` to record requested deliverable, artifact readiness, and blockers/assumptions separately.
7. Write the proportionate brief from `references/design-brief-template.md` and check `references/quality-checklist.md`.

Use `references/task-goal-mapping.md`, `references/visual-systems.md`, and `references/ui-patterns.md` only when those decisions need depth. Use `references/anti-generic-design-rules.md` to challenge an unsupported template, not to ban a conventional landing structure that fits the content.

For broad multi-stage requests, read `references/workflow-routing.md`. Routing describes which capability is useful; it does not require a separate task, subagent, or new user approval for intermediate steps already implied by the requested result.

## Optional Style Integrations

`references/style-lane-routing.md` names optional external style skills. Check that a named skill is actually available before using it. If absent, continue with the local visual and UX principles in this skill; never block the brief or imply an unavailable skill was read. A style lane is a direction, not authority to overwrite brand colors, gradients, stack, or user constraints.

## Output

For a small request, return the decisions, affected states, responsive rules, assumptions, and readiness. For a substantial brief, include goal/audience, design direction, IA, first viewport, visual system, components/states, motion, responsiveness, accessibility/UX constraints, and handoff. Do not choose frameworks or packages unless the user also requested technical planning.

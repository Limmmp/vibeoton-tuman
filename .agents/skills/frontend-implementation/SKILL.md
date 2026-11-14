---
name: frontend-implementation
description: >-
  Use when the requested result is working frontend code or a completed frontend
  change. Covers implementation, recreation, finishing, focused debugging, and
  fixes from concrete findings; not design-only, plan-only, or audit-only work.
---

# Frontend Implementation

Deliver the working code or frontend change the user requested. Design, planning, debugging, and verification may be internal steps; do not stop at an intermediate brief or plan when the requested deliverable is implementation.

## Scope and Authorization

- Start from the current request, supplied artifacts, and existing project. An absent formal approval label is not by itself a blocker.
- A build request authorizes the preparation needed to build. A request to inspect or plan only does not authorize source edits.
- A request to audit and fix authorizes baseline capture, relevant fixes, and re-checks without asking again.
- For a narrow bug, reproduce the relevant symptom and inspect its code path; do not start a full redesign pipeline.
- Ask only when an unresolved product choice materially changes scope or behavior. Make small reversible assumptions and disclose them.

When a brief, plan, screenshot, specification, or finding set exists, read `references/handoff-intake.md`. A `Planner-ready` brief may require a minimal technical plan before coding; it is not the same as `Implementation-ready`, and it does not prevent completing an already requested build.

## Workflow

1. Inspect package manager, framework, source structure, existing conventions, assets, and relevant tests.
2. For a defect, read `references/debugging-workflow.md`; otherwise translate the requested result into the smallest useful set of files, components, states, and checks.
3. Implement stable semantic layout and behavior before optional motion or polish.
4. Preserve the current stack and unrelated user changes. Add dependencies only for a demonstrated need.
5. Cover the states material to the feature: loading, empty, error, success, pending, disabled, responsive, focus, and reduced motion as applicable.
6. Verify in proportion to risk using `references/verification-matrix.md`. A major rendered UI normally needs build plus desktop/mobile browser QA; a local pure-logic fix may need only its focused regression test.
7. Apply `references/completion-gates.md` and report only checks actually run.

Use `references/implementation-workflow.md` for substantial builds, `references/browser-qa.md` for rendered changes, and the stack reference that matches the existing project: `references/react-vite.md`, `references/nextjs.md`, or `references/html-css-js.md`. Use `references/content-asset-policy.md` when content or media must be sourced.

For architecture-sensitive work, consult `../frontend-code-architecture/SKILL.md`. For ambiguous multi-stage requests, consult `../web-ui-designer/references/workflow-routing.md` without treating routing as a requirement to create another task or agent.

## Completion Rules

- Keep created and edited files runnable; do not hide missing logic behind abbreviated code or placeholder comments.
- Ellipses, spread/rest syntax, meaningful product copy such as “Read more,” and TODOs outside the changed scope are not automatically defects.
- Do not substitute a generic landing shell for the requested product, app, tool, or game UI.
- Do not claim browser, accessibility, performance, or screen-reader results that were not performed.

The final response should state what changed, the cause when debugging, the commands/checks and outcomes, and any precise limitation or remaining risk.

---
name: frontend-code-architecture
description: >-
  Use when frontend work needs clearer component boundaries, state ownership,
  file organization, or a scoped behavior-preserving refactor. Do not use when
  architecture is immaterial to the requested change.
---

# Frontend Code Architecture

Keep frontend code understandable and safe to change without imposing an idealized structure on the repository.

## Choose the Mode

- `guardrail`: architecture decisions within an implementation.
- `targeted refactor`: improve one file, feature, or responsibility boundary.
- `review`: return findings and a refactor plan without editing.

A narrow bug or styling fix should remain narrow. Refactor only when the current structure obstructs the requested change or when the user asked for architecture work.

## Workflow

1. Inspect the current framework, routes, components, styling, state/data patterns, tests, and naming conventions.
2. Identify concrete pressure: mixed responsibilities, duplicated behavior, unclear ownership, unsafe effects, or a file that is difficult to change.
3. Define boundaries by product responsibility, reuse, state ownership, testability, and change safety. Do not extract components to satisfy a line-count heuristic.
4. Preserve public behavior and unrelated user changes while moving code in reviewable steps.
5. Run the available build, typecheck, and relevant tests. Use browser QA only when rendered behavior changed.
6. Report the new ownership boundaries, actual verification, and deliberately deferred cleanup.

Read `references/refactor-workflow.md` before modifying existing architecture. Use:

- `references/component-boundaries.md` for component and primitive decisions;
- `references/project-structure-patterns.md` for framework-aware organization;
- `references/state-data-effects.md` for state, fetching, effects, and async ownership;
- `references/styling-and-tokens.md` for style and token boundaries;
- `references/anti-patterns.md` for review diagnosis;
- `references/architecture-review-template.md` for review-only output.

## Invariants

- Existing framework, package manager, styling, and component conventions take priority.
- Keep route/page files focused on route-level composition and data concerns.
- Separate reusable primitives from product-specific feature components.
- Keep state local until real cross-boundary ownership or persistence requires otherwise.
- Effects synchronize with external systems; derived render data should not be hidden in effects.
- Add a store, query library, styling system, or abstraction only when the observed complexity justifies it.
- Keep one-off markup inline when extraction would make ownership less clear.

## Output

For a review, provide current risks, proposed boundaries, a scoped file plan, sequence, and verification plan. For code changes, summarize changed files and roles, behavior-preservation evidence, commands run, and remaining risks. Never claim architecture quality solely from a cleaner-looking tree.

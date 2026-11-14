# Input Mode Guidance

## Visual-Only

Examples: screenshot, mockup, PDF, image, video.

Can establish:

- visible hierarchy, composition, alignment, proportions, content density, color relationships, typography classification, media treatment, and visible states;
- approximate component boundaries and layout patterns;
- behavior shown across multiple frames or a recording.

Cannot establish reliably:

- exact font family, token names, DOM structure, hidden states, true breakpoints, semantic markup, accessibility behavior, dependencies, or inactive interactions.

Record image dimensions and any known viewport. Label numeric estimates and implementation hypotheses as `INFERRED`.

## Figma-Aware

Can establish when accessible:

- frame dimensions, Auto Layout, constraints, variables, styles, component sets, variants, text properties, effects, spacing, and asset references.

Verify:

- whether inspected instances contain overrides;
- whether variables are local, aliased, or mode-specific;
- whether prototype links reflect production behavior;
- whether the frame is approved or stale.

Figma proves authored design intent, not the current production implementation.

## Live-Site

Can establish:

- rendered DOM, computed styles, actual assets, active routes, runtime states, network-loaded fonts, responsive transformations, console errors, and observable interactions.

Inspect representative viewport sizes and states. Record route, viewport, theme, authentication state, and interaction sequence.

Runtime inspection proves only the tested state. Lazy, conditional, authenticated, geo-specific, experiment, or role-specific behavior may remain unknown.

## Code-Aware

Can establish:

- framework, dependencies, routes, component definitions, styles, tokens, assets, state/data patterns, responsive rules, motion code, and accessibility primitives.

Verify usage before reporting behavior:

- imported does not mean rendered;
- declared tokens may be unused;
- dead routes and legacy components may remain;
- conditional branches may require unavailable data or roles.

Use rendered evidence when available to distinguish defined from active behavior.

## Combined

Create a source matrix:

| Question | Figma | Code | Runtime | Visual |
|---|---|---|---|---|
| Intended value | Strong | Medium | Weak | Weak |
| Defined value | Medium | Strong | Medium | Weak |
| Rendered value | Weak | Medium | Strong | Medium |
| Hidden states | Medium | Strong | Tested only | Weak |
| Responsive behavior | Frame-dependent | Strong | Strong when tested | Multi-frame only |

When sources conflict, preserve both facts and explain likely causes such as stale design, overrides, fallback fonts, experiments, content differences, or viewport mismatch.

## Intake Rule

Before deep analysis, record the artifact type, source, viewport/frame size, state/theme/auth context, access limits, and requested downstream intent. Use `artifact-intake.md` when any of these are unclear.

# Proportional Planning Output

State the mode (`compact`, `production`, or `handoff-ready`), requested deliverable, artifact readiness, and material assumptions/blockers.

## Compact Plan

For a small page, prototype, or focused feature, include only:

1. Target and preserved constraints.
2. Stack and dependency decisions that actually change.
3. Affected files/components and ownership.
4. Relevant state, responsive, and accessibility behavior.
5. Ordered implementation steps.
6. Risk-based verification.

## Production / Handoff-Ready Plan

Add sections only where they materially affect delivery:

- design/source analysis;
- stack and justified dependencies;
- project structure and component boundaries;
- design tokens and assets;
- motion and responsive behavior;
- data, async state, forms, auth, and URL state;
- tests and visual regression;
- deployment/CI and environment variables;
- SEO/content/localization;
- implementation phases and release gates.

Omit immaterial sections rather than repeating “Not material for this build.” Keep material exclusions explicit.

## Quality Checks

- The plan follows the existing repository conventions.
- Every dependency has a concrete role.
- Component extraction follows responsibility and change safety, not repetition counts.
- Loading, empty, error, pending, retry, and stale-result behavior is included when relevant.
- Verification matches the changed surface and risk.
- Future audit criteria are not presented as passed checks.

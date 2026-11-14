# Report Quality Gates

Use before finalizing a substantial reverse-engineering report.

## Evidence Gate

- Each material claim has a source reference or confidence label.
- Exact values are only exact when supported by authoritative evidence.
- Screenshot-derived values are labeled as estimates or `INFERRED`.
- Code declarations are not reported as rendered behavior unless usage/rendering is verified.
- Source conflicts are reported instead of silently normalized.

## Coverage Gate

- Source coverage, inspected states, routes, frames, viewports, and access limits are explicit.
- Component decomposition distinguishes reusable component, repeated pattern, candidate, primitive, and one-off composition.
- Tokens have semantic roles, not just raw values.
- Responsive and interaction behavior distinguish observed, defined, inferred, and unknown.
- Assets/media inventory includes source, format/dimensions when known, reuse pattern, and uncertainty.

## Boundary Gate

- No new design direction is created.
- No implementation plan, package/dependency choice, or code edits are produced.
- No acceptance verdict is issued.
- Downstream handoff is specific and matches the user's likely next step.

## Actionability Gate

- Reconstruction guidance names priorities, risks, missing evidence, and decisions required.
- Redesign context names what to preserve and what to avoid.
- Unknowns are useful, not generic.
- The report can be handed to `web-ui-designer` or `frontend-design-planner` without redoing the analysis.

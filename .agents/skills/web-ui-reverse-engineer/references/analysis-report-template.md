# Analysis Report Template

Use this structure for a complete reverse-engineering report. Remove sections that are genuinely outside the selected mode.

## 1. Analysis Profile

- Requested mode:
- Product or interface:
- Sources inspected:
- Evidence type labels used:
- Routes, frames, states, themes, and viewports:
- Scope exclusions:
- Access limitations:
- Intended handoff:

## 2. Executive Summary

Summarize the interface model, strongest design characteristics, main reusable systems, and the most important unknowns.

## 3. Product Shell and Information Architecture

Describe:

- global navigation and page shell;
- page types and route hierarchy;
- primary and secondary actions;
- content hierarchy and user flow;
- persistent versus page-specific regions.

## 4. Page and Component Decomposition

Provide:

- a page-region outline;
- a component tree;
- reusable components and primitives;
- variants, slots, and states;
- one-off sections;
- component candidates that are repeated visually but not abstracted in code.
- source and confidence for material component boundaries.

## 5. Design Tokens and Visual System

Group findings by:

- color roles;
- typography roles;
- spacing scale;
- widths, heights, and grid;
- radii, borders, and shadows;
- iconography;
- media treatment;
- motion tokens;
- breakpoints.

For each token, include value or estimate, semantic role, evidence, and confidence.

## 6. Typography and Content Hierarchy

Describe font families or classifications, weights, sizes, line heights, text roles, measure, casing, emphasis, and long-content behavior.

## 7. Layout and Spacing

Explain container rules, columns, alignment, section rhythm, density, intrinsic sizing, fixed dimensions, overlap, layering, and whitespace strategy.

## 8. UI Patterns, Variants, and States

Cover navigation, buttons, inputs, cards, tables, filters, tabs, dialogs, tooltips, menus, feedback, and domain-specific patterns. Include default, hover, focus, active, selected, disabled, loading, empty, error, and success states where observable.

## 9. Motion and Interactions

Document triggers, timing, easing, sequencing, scroll behavior, layout transitions, gesture behavior, and reduced-motion evidence.

## 10. Responsive Behavior

Separate:

- observed breakpoints and behavior;
- defined breakpoints and behavior;
- inferred adaptations;
- reflow, stacking, reordering, hiding, collapsing, resizing, and touch changes;
- unresolved mobile or wide-screen behavior.

## 11. Assets and Media

Inventory logos, icons, photos, illustrations, video, fonts, sprites, backgrounds, and generated media. State source, format, dimensions when known, reuse pattern, and licensing or access uncertainty.

## 12. Technical Architecture

When evidence exists, cover framework, routes, component organization, styling system, tokens, dependencies, state, data flow, motion, assets, accessibility primitives, and notable duplication or coupling.

## 13. Design Rationale

Explain how specific choices support scanning, hierarchy, conversion, trust, orientation, density, product understanding, or brand expression. Mark interpretations as `INFERRED`.

## 14. Reconstruction Guidance

List:

- what can be reused directly;
- what should be reconstructed as shared primitives;
- highest-risk areas;
- missing assets or states;
- fidelity priorities;
- decisions required before planning.
- requested deliverable;
- artifact readiness: `Design-ready`, `Planner-ready`, `Implementation-ready`, `Prompt-ready`, or `Analysis complete`;
- blockers and assumptions.

Do not choose the stack or write an implementation plan here.

## 15. Confidence, Conflicts, and Unknowns

Summarize:

- `EXACT` findings;
- `HIGH CONFIDENCE` findings;
- material `INFERRED` findings;
- `UNKNOWN` items;
- contradictions between Figma, code, and runtime.

## 16. Handoff

Recommend one next step:

- `web-ui-designer` for a redesign or new direction;
- `frontend-design-planner` for a reconstruction plan;
- `frontend-implementation` when code is requested and the evidence is implementation-ready, with minimal planning first when needed;
- `frontend-acceptance-review` for compliance testing of a finished build;
- no handoff when analysis alone satisfies the request.

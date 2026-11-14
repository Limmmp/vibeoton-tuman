# Confidence Levels

Apply a confidence label to material findings, especially exact values, component boundaries, hidden behavior, responsive rules, and design rationale.

## EXACT

Directly confirmed by authoritative evidence.

Examples:

- computed `font-size: 16px` at the recorded route and viewport;
- Figma variable value from the inspected mode;
- CSS custom property used by the rendered element;
- component import and rendered usage verified in code and runtime.

## HIGH CONFIDENCE

Supported by strong, consistent evidence but not fully authoritative or exhaustive.

Examples:

- repeated 24 px gaps measured across several screenshot regions;
- a component boundary supported by repeated markup and stable semantics;
- a breakpoint behavior observed at multiple tested widths without access to source.

## INFERRED

A reasoned hypothesis based on visible or structural patterns.

Examples:

- likely use of an eight-point spacing rhythm;
- probable sticky header from a video sequence;
- likely conversion rationale for placing social proof near a CTA;
- proposed component candidates from repeated visual patterns.

## UNKNOWN

Insufficient, inaccessible, contradictory, or absent evidence.

Examples:

- exact font family from a screenshot;
- mobile navigation from a desktop-only mockup;
- authenticated states without credentials;
- whether an unused component remains reachable through an uninspected route.

## Evidence Precedence

For rendered behavior:

1. Tested runtime and computed result.
2. Active source path verified through usage.
3. Figma or authored design.
4. Static visual evidence.
5. Pattern-based inference.

For intended design values, Figma variables or approved design documentation may outrank runtime output. State which question is being answered.

## Conflicts

Do not average or silently normalize contradictory values. Report:

- source A and its value;
- source B and its value;
- inspected context for each;
- likely explanation, labeled with confidence;
- which source should guide the requested downstream task.

## Reporting Rule

Use confidence where it changes how the reader should act. It is unnecessary to tag obvious descriptive statements, but every uncertain exact value or hidden behavior must be tagged.

Confidence answers “how strong is the evidence?” It does not answer “how harmful would this be?” and it is not a check status. A low-confidence observation may have high potential impact and should be framed as a high-priority validation target rather than downgraded or claimed as fact.

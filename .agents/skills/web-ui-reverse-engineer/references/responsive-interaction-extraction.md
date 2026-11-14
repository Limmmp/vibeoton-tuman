# Responsive and Interaction Extraction

Use this reference when documenting breakpoints, state changes, gestures, overlays, motion, or scroll behavior.

## Responsive Extraction

Record:

- observed viewport or frame sizes;
- breakpoint values only when measured from code, runtime, or Figma;
- reflow rules: stacking, column count, grid changes, sidebars, rails, sticky regions;
- hide/show behavior;
- content reordering;
- density changes;
- touch target changes;
- long-content and overflow behavior.

Separate:

- `observed`: tested or shown directly;
- `defined`: found in source or Figma constraints;
- `inferred`: likely behavior from layout pattern;
- `unknown`: not available.

## Interaction Extraction

Cover only states supported by evidence:

- hover, focus, active, selected, disabled;
- loading, empty, error, success;
- menus, drawers, dialogs, tooltips, tabs, filters, carousels;
- form validation and recovery;
- route changes and scroll positions;
- keyboard behavior and focus management when observable;
- gestures, drag, swipe, zoom, resize;
- motion timing, easing, sequencing, and reduced-motion behavior.

## Reporting Pattern

```text
Interaction: filter chip selection
Observed behavior: selected chip changes surface and count updates.
Hidden states: error/loading unknown.
Evidence: route `/catalog`, 390px viewport, manual click, HIGH CONFIDENCE.
```

Do not invent states because a component usually has them. Mark missing states as `UNKNOWN` or `not observed`.

# Design Token Extraction

## Principles

- Extract values with semantic roles, not as an unstructured color or size list.
- Preserve exact source values when confirmed.
- Normalize repeated near-values only as a recommendation, never as a false claim about the original system.
- Record evidence and confidence for every material token group.

## Color

Capture:

- canvas and surface levels;
- primary and secondary text;
- muted and disabled text;
- borders and dividers;
- action, accent, selection, focus, and link colors;
- success, warning, error, and info roles;
- overlays and scrims;
- chart or categorical colors.

Note opacity, color space, gradients, theme modes, and contrast concerns where known.

## Typography

Capture:

- font family or confirmed source;
- fallback stack;
- weights and styles;
- role-based sizes and line heights;
- letter spacing;
- measure and alignment;
- casing and decoration;
- numeric, code, or tabular styles.

From pixels alone, use classifications such as neo-grotesk sans, humanist sans, serif display, or monospace. Do not claim an exact family.

## Spacing and Sizing

Identify:

- base spacing unit;
- repeated gaps and padding;
- container widths and gutters;
- control heights;
- icon sizes;
- section rhythm;
- fixed, fluid, and intrinsic dimensions.

Separate measured values from a proposed normalized scale.

## Surfaces

Capture:

- border widths and styles;
- radii;
- shadows;
- blur or backdrop effects;
- elevation levels;
- separators;
- selected and interactive surface treatments.

## Layout

Capture:

- grid columns and gaps;
- flex or alignment patterns;
- max-widths;
- sidebars and rails;
- layer and z-index patterns;
- aspect ratios;
- sticky and fixed regions.

## Responsive Tokens

Capture explicit media-query or Figma breakpoint values when available. Otherwise describe observed state transitions and avoid inventing exact breakpoints.

## Motion

Capture:

- durations;
- easing;
- delays and stagger;
- distance, scale, opacity, blur, or clip changes;
- scroll trigger points;
- reduced-motion behavior.

## Token Table

Use:

| Token or role | Value | Usage | Evidence | Confidence |
|---|---|---|---|---|
| `surface.canvas` | `#...` | Page background | Computed style on `body` | EXACT |

If the original token name is unknown, use a descriptive role and mark it as an analyst label.

## Normalization for Handoff

When exact original tokens are unavailable, provide normalized recommendations separately:

- `Observed values`: what evidence shows.
- `Analyst-normalized scale`: a proposed clean scale for reconstruction.
- `Do not claim`: never present normalized values as the original token system.

For downstream planning, call out which tokens are fidelity-critical and which can be approximated.

# Visual Analysis Checklist

## Source Setup

- Record source type, dimensions, viewport, scale, theme, route, and state.
- Verify whether the image is cropped, compressed, scaled, or composited.
- For multiple images, map each to a route, breakpoint, state, or sequence.

## Hierarchy and Composition

- Identify the first attention point and reading order.
- Map primary, secondary, and tertiary actions.
- Check alignment anchors, columns, containers, and section boundaries.
- Note deliberate asymmetry, overlap, framing, whitespace, and density.

## Typography

- Classify display, heading, body, label, caption, numeric, and code roles.
- Compare weight, size, line height, measure, casing, and contrast.
- Note truncation, wrapping, long-word behavior, and localization risk.

## Color and Surfaces

- Identify semantic color roles and surface layers.
- Note border, shadow, blur, texture, image overlay, and elevation behavior.
- Separate brand color from functional state color.

## Components and States

- Identify repeating patterns and variants.
- Look for hover, focus, selected, disabled, loading, empty, error, success, and overlay evidence.
- Record controls or states that are not visible and remain unknown.

## Media and Assets

- Identify logo, icon, photography, illustration, video, 3D, charts, and decorative media.
- Note crop, aspect ratio, masking, focal point, and responsive treatment.

## Responsive Inference

- Compare actual breakpoint examples when available.
- Track reflow, stacking, reordering, navigation collapse, density changes, hidden content, and touch affordances.
- Do not invent mobile behavior from a single desktop frame.

## Anti-Hallucination Check

- Are exact values supported by metadata or measurement?
- Are font identifications confirmed?
- Are hidden states presented as unknown?
- Are design-rationale statements marked as interpretations?
- Are component abstractions confirmed or labeled as candidates?
- Are all important findings tied to a source region or frame?

# Responsive Checklist

Use specified breakpoints first. Otherwise test desktop, mobile, and tablet when the layout changes materially.

## Layout

- No unintended horizontal scrolling.
- No overlap, clipping, cut-off controls, or off-screen content.
- Grid and flex layouts reflow intentionally.
- Content order preserves hierarchy and task flow.
- Fixed-format areas have stable dimensions or aspect ratios.

## Typography

- Text remains readable without viewport-based over-scaling.
- Long words, headings, values, and localization do not break containers.
- Buttons and controls keep professional wrapping and minimum usable size.

## Navigation and Controls

- Mobile navigation opens, closes, traps or restores focus appropriately.
- Touch targets are comfortably usable.
- Menus, popovers, tooltips, dialogs, and dropdowns stay inside the viewport.
- Sticky and fixed elements do not cover important content.

## Media

- Images and video preserve the intended subject and crop.
- Art direction changes where required.
- Canvas, WebGL, maps, charts, and embeds resize without blank output.

## States and Motion

- Loading, empty, error, expanded, selected, and validation states remain stable.
- Scroll, pinning, parallax, and sticky interactions work at each relevant breakpoint.
- Reduced-motion behavior is available when motion is substantial.

## Evidence

For each tested viewport record:

- Exact dimensions.
- Route and state.
- Screenshot or inspected behavior.
- Any overflow measurements or failed interactions.

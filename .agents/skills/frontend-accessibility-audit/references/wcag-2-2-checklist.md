# WCAG 2.2 Checklist

Default to WCAG 2.2 AA unless another level is requested. Test only criteria applicable to the reviewed pages, states, and complete processes. The procedures below are a focused audit aid, not a replacement for the standard.

| Criterion | Level | Focused procedure | Useful evidence | W3C |
| --- | --- | --- | --- | --- |
| 1.1.1 Non-text Content | A | Classify meaningful, decorative, functional, and complex images; inspect accessible alternatives in context | DOM/AX plus visual purpose | https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html |
| 1.3.1 Info and Relationships | A | Compare visual structure with semantic headings, lists, tables, groups, and labels | DOM/AX and rendered view | https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html |
| 1.4.3 Contrast (Minimum) | AA | Measure foreground/background for relevant text size, weight, state, and exceptions | Ratio and sampled/defined colors | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html |
| 1.4.4 Resize Text | AA | Enlarge text to 200% and verify no loss of content or function, subject to criterion exceptions | Browser/viewport, before/after behavior | https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html |
| 1.4.10 Reflow | AA | Test ordinary vertical content at a viewport equivalent to 320 CSS px, commonly 1280 CSS px at 400% zoom; check loss and two-dimensional scrolling | Viewport/zoom, overflow measurement, screenshots | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html |
| 1.4.11 Non-text Contrast | AA | Measure boundaries, states, focus indicators, and essential graphics where the criterion applies | Ratio, state, component | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html |
| 1.4.12 Text Spacing | AA | Apply the criterion's spacing overrides and check clipping, overlap, and loss | Injected styles plus rendered behavior | https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html |
| 2.1.1 Keyboard / 2.1.2 No Keyboard Trap | A | Complete relevant flows by keyboard and verify a discoverable exit from each component | Keys, starting focus, sequence, result | https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html |
| 2.4.3 Focus Order / 2.4.7 Focus Visible | A / AA | Follow focus through the flow; verify logical order and visible indicator | Keyboard sequence and visual result | https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Move focus through sticky headers, drawers, banners, and overlays; verify the focused component is not entirely hidden | Focus sequence, screenshot/video | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html |
| 2.4.13 Focus Appearance | AAA | When AAA is in scope, measure indicator area and focused/unfocused contrast, including exceptions | Geometry/colors and states | https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html |
| 2.5.7 Dragging Movements | AA | Verify a single-pointer alternative for drag interactions unless an exception applies | Pointer actions and alternative path | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html |
| 2.5.8 Target Size (Minimum) | AA | Measure targets and spacing; apply inline, equivalent, user-agent, and essential exceptions correctly | CSS-pixel geometry and context | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html |
| 3.3.7 Redundant Entry | A | Check repeated information in the same process is populated/selectable unless an exception applies | Complete-process steps | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html |
| 3.3.8 Accessible Authentication (Minimum) | AA | Check cognitive-function tests have a permitted alternative or mechanism; include password-manager and paste behavior where relevant | Auth flow, input behavior, alternatives | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html |
| 4.1.2 Name, Role, Value / 4.1.3 Status Messages | A / AA | Inspect semantics and dynamic updates; test actual announcements only with AT | DOM/AX; separate AT transcript | https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html |

Also cover applicable captions/audio description, color use, hover/focus content, timing, flashing, bypass blocks, titles, labels/instructions, errors, language, predictable behavior, and consistent help.

## Mapping Rules

- Record criterion number and level. An AAA observation such as 2.4.13 does not fail an AA audit solely because it misses the AAA threshold.
- Do not convert an inactive-control exception or a recommendation into an automatic AA failure.
- Use `WCAG relevance` when evidence is incomplete.
- Automated success does not establish criterion or product-wide conformance.
- Component/route evidence does not prove untested pages, states, complete processes, third-party content, accessibility support, or non-interference.
- If the user asks for legal compliance, describe the output as technical evidence rather than legal advice.

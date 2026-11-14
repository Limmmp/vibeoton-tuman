# Visual Accessibility, Contrast, and Motion

## Contrast and Color

For text, controls, focus, graphics, form states, charts, and status indicators, record foreground/background, state, text size/weight when relevant, measured ratio, required threshold, and applicable exception. Inactive controls and AAA recommendations are not automatic AA failures. Color must not be the only carrier of required meaning.

## Target Size and Pointer Input

Measure the rendered target and spacing in CSS pixels for dense toolbars, inline links, icons, rows, carousels, and primary controls. Apply the actual WCAG criterion and its exceptions instead of a universal preferred size.

## Resize Text

At 200% text enlargement, verify that text, controls, labels, errors, and actions remain available and usable. Record the browser, viewport, zoom/text setting, state, and observed loss or overlap.

## Reflow

Test reflow separately from 200% text resizing. For ordinary vertically scrolling content, use a viewport equivalent to 320 CSS px—commonly a 1280 CSS px starting viewport at 400% browser zoom—and verify no information/function loss or two-dimensional scrolling.

The exception applies only to parts whose meaning or operation genuinely requires two-dimensional layout, such as some data tables, maps, diagrams, video, games, presentations, or persistent manipulation toolbars. It does not exempt unrelated page content or individual readable content inside the excepted region.

## Text Spacing

Apply WCAG text-spacing overrides and check clipping, overlap, hidden controls, and loss of content or function. Record the injected values and inspected states.

## Motion and Timing

Check reduced-motion behavior, interaction-triggered animation, autoplay, pause/stop/hide controls, flashing risk, and applicable time-limit controls. A static screenshot cannot prove motion behavior.

## Hover and Focus Content

Check that relevant tooltips, popovers, and hover/focus content are dismissible, hoverable, persistent when required, keyboard reachable, and do not trap or obscure the task.

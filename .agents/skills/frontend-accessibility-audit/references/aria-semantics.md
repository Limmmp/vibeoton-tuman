# ARIA and Semantics

## Native First

Prefer native HTML elements before ARIA:

- `button` for actions;
- `a href` for navigation;
- `label` for form labels;
- `fieldset` and `legend` for grouped controls;
- semantic headings;
- `nav`, `main`, `header`, `footer`, `aside`, and regions where useful.

Use ARIA only when native semantics cannot express the interface.

## Accessible Name, Role, Value

Check every interactive element:

- has the correct role;
- has an accessible name;
- exposes state and value when applicable;
- updates state when UI state changes;
- does not hide needed text from assistive technology;
- does not expose decorative content as meaningful.

## Common ARIA Failures

- clickable `div` or `span` with no role, keyboard behavior, or accessible name;
- `aria-hidden="true"` on focusable content or parents of focusable content;
- icon-only buttons without labels;
- mismatch between visible label and accessible name;
- `aria-expanded` not updating;
- invalid `aria-*` attributes for a role;
- modal without `aria-modal`/focus management;
- live regions that do not announce updates;
- duplicate landmark labels.

## Headings and Landmarks

Check:

- one clear page-level heading when appropriate;
- heading order is meaningful;
- headings represent structure, not styling only;
- landmarks are present and not excessive;
- repeated landmarks have unique labels;
- skip link targets align with landmarks.

## Alternative Text

Classify images:

- informative;
- decorative;
- functional;
- complex;
- text image;
- redundant.

Audit alt text against the image purpose, not the file name.

## Status and Live Updates

Check toasts, validation messages, loading states, async results, filters, carts, notifications, and progress messages. Important updates should be announced without stealing focus.

DOM and accessibility-tree inspection can establish exposed name, role, value, state, and structure for the inspected browser state. It does not establish the real announcement order, timing, verbosity, or navigation experience of a screen reader. Record actual assistive-technology results separately.

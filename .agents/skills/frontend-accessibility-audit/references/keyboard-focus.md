# Keyboard and Focus

## Keyboard Path

Check:

- all interactive elements are reachable by keyboard;
- tab order follows the visual and logical flow;
- controls activate with expected keys;
- no keyboard trap exists;
- focus is visible and not obscured;
- focus does not land on hidden or inert content;
- skip links or bypass mechanisms exist for repeated navigation;
- route changes and dynamic updates put focus in a sensible place.

## Focus Visibility

Focus indicators must be visible in every theme and state. Check text links, buttons, icon buttons, inputs, menus, cards that act as links, custom controls, disabled states, and high-contrast surfaces.

## Dialogs, Menus, and Popovers

Check:

- opening moves focus into the overlay when appropriate;
- focus is trapped inside modal dialogs;
- Escape closes dismissible overlays;
- closing returns focus to the trigger or logical next target;
- background content is not reachable when modal;
- menu and combobox keyboard behavior follows expected patterns;
- focus does not disappear during animation.

## Tabs, Accordions, and Composite Widgets

Check arrow-key behavior when relevant, selected state, expanded/collapsed state, roving tabindex, and whether content changes are announced or discoverable.

## Keyboard Shortcuts

Check whether single-character shortcuts can be turned off, remapped, or active only on focus when they might interfere with assistive technologies.

## Evidence Pattern

For each finding include:

- route;
- element or component;
- starting focus position;
- keys pressed;
- expected behavior;
- actual behavior;
- screenshot, DOM/accessibility tree note, or reproduced sequence.

Keyboard evidence does not prove screen-reader announcements. If assistive-technology behavior is part of the claim, add the named AT/browser/version/OS and the actual observed output; otherwise mark that layer `NOT TESTED`.

# Styling and Tokens

Use this reference when organizing CSS, Tailwind classes, design tokens, variants, and responsive behavior.

## Follow Existing Conventions

Before changing styling architecture, identify whether the repo uses:

- global CSS;
- CSS modules;
- Tailwind;
- CSS-in-JS;
- design token files;
- shadcn/ui or another component library;
- utility classes plus custom CSS.

Extend the existing pattern unless it is the source of the problem.

## Tokens

Create or preserve tokens for:

- colors;
- typography scale;
- spacing;
- radius;
- shadows;
- z-index layers;
- breakpoints when project conventions support them.

Do not scatter magic values across many components when the value is part of the visual system.

## Component Styling

- Keep component-specific styles near the component when the repo pattern supports it.
- Keep layout primitives and global resets in shared style entrypoints.
- Avoid duplicating long Tailwind class strings across many components; extract variants or components when repetition is meaningful.
- Keep responsive rules with the component or section they affect.

## Variants

Use explicit variants for repeated UI states:

- size;
- tone;
- emphasis;
- selected/active;
- disabled;
- loading;
- error/success.

Avoid variant systems for one-off presentation differences.

## Responsive Safety

After architecture changes, verify:

- text still wraps correctly;
- fixed-format elements keep stable dimensions;
- mobile and desktop layouts are covered;
- extracted components did not lose responsive classes or media queries;
- z-index, overlays, and sticky elements still behave correctly.

## Styling Anti-Patterns

- One component owns unrelated global layout styles.
- Repeated hard-coded colors or spacing values drift across sections.
- Extracted components require parent-specific class overrides to work.
- Responsive behavior is split across unrelated files and becomes hard to trace.
- A new styling library is added for a small local issue.

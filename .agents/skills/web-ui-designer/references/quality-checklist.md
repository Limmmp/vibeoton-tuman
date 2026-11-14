# Quality Checklist

Use before finalizing a Web/UI design brief.

## Goal Fit

- Brief mode, product scenario, and handoff status are stated.
- The design direction matches the product type and business goal.
- The primary user action is visible and supported.
- The first viewport proves the product/category quickly.
- The design does not rely on generic adjectives without concrete rules.
- Assumptions and non-goals are explicit when inputs are thin.

## Information Architecture

- Section or screen order is explicit.
- Navigation model is named.
- The first viewport is not automatically a generic hero.
- The next section or next action is clear.
- The IA supports the business outcome, not just a familiar page template.

## Visual System

- Typography has named roles.
- Palette has functional roles and enough contrast.
- Spacing and density match the task.
- Media direction shows the real product, object, work, or state.
- Cards are used only where structurally useful.

## Components and States

- Expected components are named.
- Empty/loading/error/success states are covered where relevant.
- Hover/focus/active/disabled states are covered.
- Long text and mobile constraints are addressed.
- Tool, dashboard, ecommerce, and app designs include the states needed for actual use.

## Accessibility and UX

- Contrast, keyboard flow, focus, form labeling, and readable type are addressed.
- Motion has a purpose and reduced-motion fallback.
- The design avoids incoherent overlap and layout shift.

## Handoff

- The brief states the next step:
  - technical plan via `frontend-design-planner`;
  - implementation via `frontend-implementation`;
  - generator prompt via `website-master-prompts`.
- Existing-artifact redesign routes through `web-ui-reverse-engineer` when evidence is missing.
- The handoff is specific enough that the next skill does not need to reinterpret the design direction.

## Rejection Checks

Revise the brief if it:

- defaults to `navbar -> hero -> cards -> CTA`;
- uses decorative orbs, blobs, glass, or gradients without a product reason;
- hides the actual product, work surface, object, or useful action below a decorative first viewport;
- chooses stack, dependencies, package commands, file trees, or implementation phases;
- leaves the next skill to infer the design direction.

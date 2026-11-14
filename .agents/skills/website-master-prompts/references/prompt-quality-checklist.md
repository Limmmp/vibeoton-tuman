# Prompt Quality Checklist

Run this checklist before finalizing a substantial master prompt.

## Copy-Ready Gate

- The answer includes the actual prompt in a fenced `prompt` block.
- The prompt starts with prompt mode, generator target, source handoff, and non-goals.
- The prompt contains no task-marker tokens, filler Latin text, bracket placeholders, or fill-in instructions.
- The prompt can be handed to another AI system without extra explanation.

## Specificity Gate

- Site/app concept, audience, and primary user action are concrete.
- Stack names include dependency roles.
- First viewport describes product state, useful action, interface, media, or content, not only a centered headline.
- IA, visual system, components, states, motion, responsive behavior, assets, implementation constraints, and acceptance checks are present.

## Anti-Generic Gate

- The prompt avoids an unsupported default `navbar -> hero -> cards -> CTA` structure, but permits it when content and conversion needs make it appropriate.
- Visual direction is more specific than "modern", "clean", or "premium".
- Palette and surface effects follow the brief; gradients or glass are rejected only when they are unsupported defaults rather than the intended brand direction.
- Cards, orbs, blobs, stock hero photos, and repeated grids are not used as the main idea.

## Handoff Gate

- Design brief details are preserved when supplied.
- Reverse-engineered unknowns stay unknown or inferred.
- Approved planner stack and file structure are not changed.
- Prompt review output improves structure, not only wording.

## Buildability Gate

- Responsive behavior covers desktop, tablet, and mobile.
- Accessibility expectations are explicit.
- Motion has reduced-motion and performance constraints.
- QA checks cover console errors, broken assets, responsive layout, text overflow, and placeholder content.

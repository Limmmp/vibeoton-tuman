# Design Brief Template

Use this structure for the final Web/UI design brief. Keep it concise for small tasks and expand for complex products. Preserve the 10-section contract, but start with brief metadata.

## Brief Metadata

- Brief mode: `concept brief`, `production brief`, `redesign brief`, or `handoff-ready brief`
- Product scenario:
- Handoff status: `Planner-ready`, `Implementation-ready`, `Prompt-ready`, `Needs reverse engineering`, or `Needs product input`

## 1. Goal and Audience

- Product type:
- Primary audience:
- Business goal:
- Primary user action:
- Trust or credibility needs:
- Content density:
- Assumptions:
- Non-goals:

## 2. Design Direction

Name the direction with a concrete phrase, not a vague adjective.

Examples:

- "Operational command desk"
- "Editorial product dossier"
- "Studio archive wall"
- "Configurator-first product showroom"
- "Quiet SaaS workspace"
- "High-trust checkout path"

Explain why this direction fits the goal.

## 3. Information Architecture

Define the screen or section order:

1. First viewport:
2. Core proof or product value:
3. Supporting interaction/content:
4. Trust, comparison, or evidence:
5. Conversion or next action:

Avoid defaulting to a generic navbar, hero, card grid, CTA, footer structure.

## 4. First Viewport

Specify:

- Main visual signal.
- Primary user action.
- Navigation model.
- What content is visible immediately.
- What hint of the next area appears.
- What must not appear generic.

## 5. Visual System

- Typography:
- Palette:
- Spacing:
- Radius:
- Surfaces:
- Shadows/elevation:
- Media:
- Icons:
- Density:

## 6. Components and UI States

List the expected UI components:

- Navigation:
- Primary controls:
- Cards/panels:
- Forms:
- Tables/lists/grids:
- Modals/drawers:
- Empty/loading/error/success states:
- Hover/focus/active/disabled states:

## 7. Motion and Interactions

- Page entry:
- Scroll behavior:
- Hover/focus interactions:
- Stateful interactions:
- Mobile interactions:
- Reduced-motion fallback:

## 8. Responsive Behavior

- Desktop:
- Tablet:
- Mobile:
- Long-text strategy:
- Media strategy:
- Navigation behavior:

## 9. Accessibility and UX Constraints

- Contrast:
- Keyboard flow:
- Focus states:
- Form labeling:
- Motion safety:
- Readability:
- Error recovery:

## 10. Handoff

Choose the next step:

- Send to `frontend-design-planner` when the user wants a technical plan.
- Send to `frontend-implementation` when code is the requested deliverable and the design is sufficiently defined. An end-to-end build request does not require a separate approval checkpoint for the intermediate brief.
- Send to `website-master-prompts` when the user wants a generator prompt.
- Send to `web-ui-reverse-engineer` when redesign depends on an existing artifact that has not been analyzed.

Include a short one-sentence handoff note.

Do not include stack, dependency, package, file tree, or build-command decisions in this design brief.

# Prompt Input Handoffs

Use this reference when turning another skill's output into a master prompt.

## From `web-ui-designer`

Preserve:

- brief mode and product scenario;
- audience, business goal, and primary action;
- IA and first viewport;
- visual system, density, media direction, and style lane;
- components, states, motion, responsive behavior, accessibility constraints;
- handoff status and non-goals.

Do not choose a new design direction unless the user asks for a new variant.

## From `frontend-design-planner`

Preserve:

- approved stack and dependency roles;
- file structure, route structure, components, data/state expectations;
- testing, deployment, SEO, and performance constraints when material;
- "Not material for this build" exclusions.

Do not replace the plan with a different framework or invent new phases.

## From `web-ui-reverse-engineer`

Preserve:

- source coverage and confidence limits;
- reusable component candidates;
- design tokens and layout grammar;
- responsive and interaction findings;
- assets/media inventory;
- risks, unknowns, and preserve/avoid guidance.

Mark unverified behavior as inferred or optional rather than exact.

## From Existing Prompts

Preserve useful specificity:

- strong first viewport ideas;
- concrete stack roles;
- precise visual language;
- useful constraints.

Replace:

- repeated generic IA;
- vague visual adjectives;
- missing responsive or accessibility rules;
- placeholder content;
- library names without roles.

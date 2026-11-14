# Master Prompt Template

Use this structure for the final copy-ready prompt. Adapt length to the user's request, but keep the prompt immediately usable by another AI generator or coding agent.

```prompt
Prompt mode: concept-to-prompt, design-brief-to-prompt, reverse-engineered-to-prompt, plan-to-prompt, prompt-review-rewrite, or variant-pack.
Generator target: code agent, visual website generator, single-file HTML generator, React generator, or motion-heavy generator.
Source handoff: summarize the supplied brief, plan, reverse-engineering report, existing prompts, or state that this is a fresh concept.
Non-goals: state excluded stacks, styles, behaviors, pages, or workflow steps.

Create a site or web app for the specified brand, business, product, or concept.

Core concept:
Write one concrete paragraph describing the product, audience, mood, and main user goal.

Audience and primary action:
- Audience:
- Primary user action:
- Conversion or success signal:

Tech stack:
- Use the selected stack.
- Assign each library a concrete role.
- Respect user exclusions and handoff constraints.

Visual system:
- Typography: specify font pair or type direction, weights, scale, and hierarchy.
- Palette: specify colors or clear semantic color roles.
- Layout: choose a concrete grammar such as grid, split, editorial, spatial, dashboard, timeline, map, archive, workbench, configurator, or product inspection.
- Surfaces: define panels, bands, tools, canvas regions, media frames, and control surfaces.
- Media: define photos, video, generated images, textures, 3D, icons, diagrams, or product UI.

Information architecture:
1. First viewport with product state, useful action, interface, media, or concrete content.
2. Main proof, workflow, catalog, dashboard, story, or feature area.
3. Detail area for components, benefits, data, variants, or examples.
4. Trust, comparison, pricing, case study, documentation, or support area when relevant.
5. Closing action, utility area, footer, or persistent control.

Components, sections, and states:
- List required components and reusable primitives.
- Include default, hover, focus, active, selected, disabled, loading, empty, error, and success states when relevant.
- Keep content data-driven where repeated.

Interaction and motion:
- Define scroll behavior, hover/focus behavior, section reveals, gestures, overlays, and mobile interactions.
- Assign animation libraries clear responsibilities.
- Respect `prefers-reduced-motion`.

Responsive behavior:
- Desktop:
- Tablet:
- Mobile:
- Prevent text overflow and incoherent overlap.

Asset and media direction:
- Specify required images, video, icons, 3D objects, screenshots, product renders, or generated assets.
- Include fallbacks and optimization expectations.

Implementation requirements:
- Create the requested file structure, routes, or components.
- Use semantic HTML and accessible controls.
- Keep reusable content data-driven.
- Optimize images/media and avoid layout shift.
- Include final QA for console errors, responsive layout, and broken assets.

Anti-generic constraints:
- Do not default to `navbar -> hero -> cards -> CTA` when it does not fit the product, content, or conversion flow.
- Do not use vague "modern and clean" phrasing without concrete design rules.
- Do not use broken assets or missing implementation disguised as placeholders. Treat purple/blue gradients, glass cards, floating orbs, stock-photo heroes, and repetitive grids as context-dependent choices that need support from the brief.

Acceptance checks:
- No placeholder content remains.
- No console errors or broken assets.
- Layout works on desktop, tablet, and mobile.
- Text does not overflow or overlap.
- Motion is performant and has reduced-motion fallback.
- The result follows the supplied design, plan, or reverse-engineering handoff.
```

## Short Answer Wrapper

When responding to the user, keep the answer minimal:

````md
Ось готовий майстер-промпт:

```prompt
Prompt mode: concept-to-prompt
Generator target: code agent
Source handoff: fresh concept
Non-goals: no local implementation in this response
```
````

Add a short note after the prompt only if it helps the user understand the chosen direction.

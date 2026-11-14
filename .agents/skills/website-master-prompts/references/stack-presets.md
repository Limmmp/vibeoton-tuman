# Stack Presets

Use these presets when the user requests or needs a specific frontend stack.

## HTML CSS JS

Use for framework-free prompts.

Prompt requirements:

- Files: `index.html`, `styles.css`, `script.js`, `assets/`.
- Semantic HTML sections.
- CSS variables for tokens.
- CSS Grid/Flexbox for layout.
- Vanilla JS only for interactions.
- No React, Vue, Tailwind, build tools, or npm dependencies unless explicitly requested.

## Astro

Use for content sites, landing pages, portfolios, docs, blogs, SEO-heavy pages, and mostly static marketing sites.

Prompt requirements:

- Astro component structure with content-first pages.
- Minimal client-side JavaScript; use islands only for interactive components.
- Strong metadata, image optimization, semantic content, and fast loading.
- Avoid React boilerplate unless an island requires it.

## SvelteKit

Use for interactive content sites, compact web apps, and prototypes where concise component logic matters.

Prompt requirements:

- Route-based structure.
- Svelte components with scoped styles or selected styling system.
- Stores only when shared state is material.
- Progressive enhancement for forms and navigation where relevant.

## React + Vite

Use for interactive single-page sites and component-heavy prototypes.

Prompt requirements:

- React + Vite + TypeScript.
- Components split into `layout`, `sections`, `ui`.
- Data arrays in `src/data`.
- Icons with `lucide-react` if needed.
- `framer-motion` only if motion is part of the concept.
- Keep state local unless shared state is clearly required.

## React Router Framework Mode

Use for React apps with route modules, nested layouts, loaders/actions, and app-like navigation without requiring Next.js.

Prompt requirements:

- Route module structure and nested layouts.
- Data loading and mutations only where the concept needs them.
- Error and pending states for route transitions.
- Clear component/data boundaries.

## Next.js

Use for SEO, multiple routes, content-heavy pages, server rendering, or production marketing sites.

Prompt requirements:

- App Router structure.
- Metadata and semantic pages.
- Static assets in `public`.
- Client components only where interaction requires them.
- Clear route/section structure.
- Avoid marking the whole app as client-rendered unless required.

## Tailwind

Use when fast utility styling and token consistency matter.

Prompt requirements:

- Define custom theme colors, spacing, radius, and font choices.
- Avoid one-off arbitrary values everywhere.
- Do not let utility classes replace design decisions.

## shadcn/ui

Use for dashboards, SaaS tools, forms, modals, tabs, tables, and app controls.

Prompt requirements:

- Use components as accessible primitives.
- Restyle them to match the visual system.
- Do not use shadcn/ui for highly custom editorial sites unless standard controls are central.

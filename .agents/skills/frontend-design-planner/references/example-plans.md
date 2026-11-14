# Example Plan Shapes

Use these examples to calibrate scope and output style. They are intentionally compact; do not copy them verbatim.

## Content Landing Page

- Output mode: `compact` or `handoff-ready`
- Stack: Astro + TypeScript when content and first-load speed dominate; HTML/CSS/JS if the user explicitly wants no build complexity.
- Structure: `src/pages`, `src/layouts`, `src/components/sections`, `src/content` or `src/data`, `public/images`.
- Emphasis: semantic sections, metadata, Open Graph, image sizing, responsive type, lightweight motion.
- Not material: auth, server state, complex CI, app-wide state.

## SaaS Dashboard

- Output mode: `full production`
- Stack: React + Vite for client-heavy dashboard; Next.js or React Router Framework Mode when route data/auth/server actions matter.
- Structure: layout shell, route screens, table/filter components, form controls, data clients, state modules, tests.
- Emphasis: permissions, URL filters, loading/empty/error states, charts/tables, keyboard paths, Playwright smoke flows.
- Not material: editorial SEO unless public marketing routes are included.

## Ecommerce or Catalog

- Output mode: `full production`
- Stack: Next.js for dynamic cart/account/checkout; Astro for mostly static catalog with light interactivity.
- Structure: product route, listing route, product media components, cart state, content/product data, metadata helpers.
- Emphasis: product media, structured data, metadata, performance budgets, filters/sort, cart states, checkout handoff.
- Not material: heavy dashboard UI unless merchant admin is in scope.

## Tool UI Prototype

- Output mode: `compact`
- Stack: React + Vite + TypeScript unless the user requests HTML/CSS/JS.
- Structure: `App`, tool panels, controls, preview/workspace, local state hooks, utility helpers.
- Emphasis: immediate interactions, stable layout dimensions, input validation, keyboard shortcuts only when asked.
- Not material: SEO, CMS, production monitoring, complex CI.

## Portfolio or Editorial Site

- Output mode: `handoff-ready`
- Stack: Astro for content-led work; Next.js if CMS, route growth, or React-specific animation is central.
- Structure: content entries, project/article templates, media assets, layout components, typography styles.
- Emphasis: typography, media rhythm, metadata, responsive reading experience, accessible navigation, fast image loading.
- Not material: shared app state or authenticated flows unless requested.

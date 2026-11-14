# Project Structure Patterns

Use this reference when organizing frontend files. Prefer the current repo pattern when it already exists.

## Universal Principles

- Keep route/page files thin.
- Keep feature code near the feature when it is not shared.
- Keep reusable UI primitives in a predictable shared location.
- Keep static content and demo data outside JSX when repeated.
- Keep global styles and tokens easy to find.
- Do not create empty folders for architecture the project does not need.

## React + Vite

```text
src/
|-- app/ or routes/
|-- components/
|   |-- ui/
|   `-- layout/
|-- features/
|   `-- feature-name/
|       |-- components/
|       |-- data.ts
|       |-- hooks.ts
|       `-- utils.ts
|-- hooks/
|-- lib/
|-- data/ or content/
|-- styles/
|   |-- globals.css
|   `-- tokens.css
`-- main.tsx
```

Use `features/` when product areas have distinct data, state, or interaction flows. For small sites, `components/`, `data/`, and `styles/` may be enough.

## Next.js App Router

```text
app/
|-- layout.tsx
|-- page.tsx
|-- route-name/
|   `-- page.tsx
components/
|-- ui/
|-- layout/
features/
lib/
data/ or content/
styles/
```

Keep `page.tsx` as a composition layer. Put client-only interactive pieces in explicit client components. Keep metadata and route-specific data close to the route.

## Static HTML/CSS/JS

```text
src/ or root/
|-- index.html
|-- styles/
|   |-- base.css
|   |-- tokens.css
|   `-- components.css
|-- scripts/
|   |-- main.js
|   `-- interactions.js
`-- assets/
```

Split JavaScript by behavior, not by arbitrary DOM section. Keep CSS tokens and component classes predictable.

## Dashboards and Tools

Prefer feature folders for dashboards, editors, builders, analytics tools, and admin surfaces:

```text
features/
|-- dashboard/
|   |-- components/
|   |-- hooks/
|   |-- data.ts
|   `-- utils.ts
|-- settings/
|-- reports/
```

Keep table definitions, filters, empty states, and formatting utilities near the feature unless they are reused globally.

## Small Projects

For one-screen demos, avoid heavy architecture. A good small structure might be:

```text
src/
|-- App.tsx
|-- components/
|-- data.ts
|-- styles.css
`-- main.tsx
```

Escalate structure only when code size, repetition, state, or future changes justify it.

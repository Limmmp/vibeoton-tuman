# Project Structures

Use this reference when a plan needs a concrete file tree. Choose the tree that matches the recommended stack, then trim folders that do not serve the design.

## HTML/CSS/JS

```txt
index.html
src/
  styles/
    tokens.css
    globals.css
    layout.css
  scripts/
    main.js
  data/
    content.js
assets/
  images/
  video/
```

Use for static or prototype builds. Keep component naming in comments or data modules only when reuse is meaningful.

## Astro

```txt
src/
  pages/
    index.astro
  layouts/
    BaseLayout.astro
  components/
    sections/
    ui/
  content/
  data/
  styles/
public/
  images/
  video/
```

Plan client islands only for controls that need interaction. Prefer content collections or data files for repeated editorial, portfolio, catalog, or marketing content.

## React + Vite

```txt
src/
  main.tsx
  App.tsx
  components/
    layout/
    sections/
    ui/
  data/
  hooks/
  lib/
  styles/
  assets/
```

Use for component-heavy one-page sites, dashboards, tools, and prototypes where a fast SPA is enough.

## Next.js App Router

```txt
app/
  layout.tsx
  page.tsx
  globals.css
  (marketing)/
  dashboard/
components/
  layout/
  sections/
  ui/
data/
lib/
public/
```

Use when routes, metadata, server rendering, CMS/API data, auth, or production deployment conventions matter.

## SvelteKit

```txt
src/
  routes/
    +layout.svelte
    +page.svelte
  lib/
    components/
    data/
    styles/
static/
```

Plan `+page`, `+layout`, load functions, and form actions when server data or forms are part of the design.

## React Router Framework Mode

```txt
app/
  root.tsx
  routes/
  components/
    layout/
    screens/
    ui/
  data/
  styles/
public/
```

Use when React route modules, nested routes, loaders/actions, pending UI, and error boundaries are central.

## Structure Rules

- Name folders from product semantics, not page order.
- Put repeated content in `data/`, `content/`, or a CMS plan instead of hard-coding it in every component.
- Put global tokens and reset/base styles in a predictable styles entrypoint.
- Keep media in `public/` or `assets/` based on the framework's asset pipeline.
- Add tests folders only when the testing plan names concrete test types.
- Remove auth, API, CMS, or CI folders from the tree when they are not material to the build.

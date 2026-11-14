# Framework Selection

Use this reference when the stack choice is not obvious. Choose from the design, content model, interaction density, production target, and team/repo constraints.

## Decision Matrix

| Stack | Best fit | Avoid when |
| --- | --- | --- |
| HTML/CSS/JS | Tiny static pages, prototypes, simple one-off marketing pages, no build preference | Component reuse, routing, complex state, or production growth is likely |
| Astro | Content-led marketing, portfolio, blog, docs, editorial, mostly static catalog/ecommerce, fast first load, low JavaScript | Most screens are authenticated, stateful, app-like, or require heavy client interaction |
| React + Vite | Component-heavy SPA, interactive landing page, dashboard prototype, fast local development, custom UI | SEO/server rendering/content routing is central, or production needs framework-level routing/data conventions |
| Next.js | React production site/app needing routing, server rendering, metadata, CMS/API data, ecommerce, auth, deployment maturity | One-screen prototype, purely static low-state page, or team wants framework-neutral Vite simplicity |
| SvelteKit | Svelte-first product, performant app shell, forms, routing, server data, lighter interaction model | Team/repo/design system is React-centered or depends heavily on React-only libraries |
| React Router Framework Mode | React app needing nested routes, loaders/actions, progressive enhancement, route data, Remix-style conventions | Static content site, simple Vite SPA, or project already benefits from Next.js platform features |

## Product-Type Defaults

- **Landing page**: Astro for content-led; Next.js when React, CMS, metadata, or route growth matters; React + Vite for highly interactive one-page prototypes.
- **Portfolio/editorial/docs**: Astro first unless the experience is mostly a React app.
- **SaaS marketing plus app**: Next.js when marketing, auth, and app routes share a production surface; React + Vite when the app is separate from marketing.
- **Dashboard/internal tool**: React + Vite for client-heavy app; Next.js or React Router Framework Mode when route data, auth, and server actions matter.
- **Ecommerce/catalog**: Astro or Next.js for browse/catalog content; Next.js for dynamic cart/account/checkout; specialized commerce stack if backend dictates.
- **Creative/motion site**: React + Vite or Next.js when animation tooling and component state dominate; Astro when content pages are mostly static with isolated islands.

## Routing and Rendering Questions

Ask:

- Does the design need multiple routes now or soon?
- Is SEO/search/social sharing central?
- Is content mostly static, CMS-backed, or user-specific?
- Does the first viewport depend on server data?
- Is the product mostly public content or authenticated app UI?
- Is progressive enhancement important for forms/navigation?
- Are route transitions part of the design?

## Framework Notes

- Astro is content-driven, server-first, and zero JavaScript by default unless islands opt into client code.
- SvelteKit is a full-stack Svelte framework for robust, performant web apps.
- React Router can be used minimally or as a framework with Declarative, Data, and Framework modes.
- Next.js is the React default when server rendering, App Router conventions, metadata, and production deployment workflow are central.

## Structure Hints

Use these as planning hints, not mandatory templates.

### Astro

```txt
src/
  pages/
  layouts/
  components/
  content/
  styles/
public/
```

Plan islands only for components that need client interactivity.

### SvelteKit

```txt
src/
  routes/
  lib/
    components/
    data/
    styles/
static/
```

Plan `+page`, `+layout`, and form/data loading boundaries when routes need server interaction.

### React Router Framework Mode

```txt
app/
  routes/
  components/
  data/
  styles/
public/
```

Plan route modules, loaders/actions, pending UI, and error boundaries when route data matters.

## Output Rule

When recommending a stack, include:

- chosen stack;
- top reason tied to the design;
- two alternatives considered;
- what complexity the chosen stack avoids;
- what complexity the chosen stack introduces;
- install commands only when the user wants an actionable implementation plan.

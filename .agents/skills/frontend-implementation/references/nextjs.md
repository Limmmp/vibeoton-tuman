# Next.js Implementation

Use when the design needs routing, SEO, server rendering, content pages, metadata, API integration, or production-grade marketing pages.

## New Project

Use the current official command when exact version behavior matters.

Common shape:

```bash
npx create-next-app@latest app-name
cd app-name
npm run dev
```

## App Router File Shape

```txt
app/
  layout.tsx
  page.tsx
  globals.css
components/
  layout/
  sections/
  ui/
data/
lib/
public/
  images/
  video/
```

## Implementation Notes

- Put metadata in `app/layout.tsx` or route-specific metadata.
- Use `public/` for static assets referenced by URL.
- Mark components with `"use client"` only when they need state, effects, browser APIs, or animation libraries.
- Keep server components for static content when possible.
- Avoid adding client-side state to whole pages when only one component is interactive.
- Remove default starter routes, logos, and placeholder metadata before final verification.
- Preserve public route semantics, first viewport, and SEO/content expectations from the upstream plan.

## Verification

Typical commands:

```bash
npm run build
npm run dev
```

Inspect the actual scripts and framework version before assuming commands.

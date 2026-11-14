# React + Vite Implementation

Use when implementing React single-page sites, app-like pages, dashboards, and interactive landing pages without a server-rendering requirement.

## New Project

```bash
npm create vite@latest app-name -- --template react-ts
cd app-name
npm install
```

Add optional dependencies only when needed:

```bash
npm install lucide-react clsx
npm install framer-motion
npm install gsap
npm install lenis
```

## File Shape

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

## Implementation Notes

- Keep page-level composition in `App.tsx` or a route component.
- Put repeated content in `data/`.
- Use CSS Modules, Tailwind, or global CSS according to the project pattern.
- Prefer `lucide-react` for icons if no icon library exists.
- Use `clsx` or a local `cn` helper when class logic becomes conditional.
- Use Framer Motion for component-level animation, GSAP for timeline or scroll choreography, not both without clear ownership.
- Keep app/tool/dashboard state local until shared state is clearly required.
- Remove Vite starter content, sample logos, and default CSS before final verification.

## Verification

Typical commands:

```bash
npm run build
npm run dev
```

Use the actual scripts in `package.json` when they differ.

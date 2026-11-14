# React Project Structure

Use this reference when the plan recommends React + Vite or Next.js.

## React + Vite Baseline

```txt
src/
  main.tsx
  App.tsx
  components/
    layout/
      AppShell.tsx
      Header.tsx
      Footer.tsx
    sections/
      HeroSection.tsx
      FeatureSection.tsx
    ui/
      Button.tsx
      IconButton.tsx
      Card.tsx
  data/
    siteContent.ts
  hooks/
    useMediaQuery.ts
  lib/
    cn.ts
  styles/
    globals.css
    tokens.css
  assets/
    images/
    video/
```

## Next.js App Router Baseline

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

## Component Boundary Rules

- `layout/`: persistent frame, navigation, footer, sidebars, shells.
- `sections/`: large page regions that map to the supplied design.
- `ui/`: reusable primitives such as buttons, cards, tabs, badges, controls.
- `data/`: repeated content arrays, navigation items, pricing tiers, testimonials.
- `hooks/`: reusable behavior, not one-off effects hidden in random components.
- `lib/`: formatting, utility helpers, class merging, animation config.
- `assets/` or `public/`: local media, textures, icons, poster frames.

## Naming Guidance

Use names that describe the design role, not generic page order:

- Prefer `ProjectArchive`, `BookingRail`, `SignalPanel`, `ProductWorkbench`.
- Avoid `SectionOne`, `InfoBlock`, `CardGrid` when the design has clearer semantics.

## Planning Notes

- If content repeats more than twice, plan a data file and map over it.
- If the component needs hover/open/active state, name that state in the plan.
- If the layout changes heavily on mobile, mention whether components reorder, collapse, become tabs, or become horizontal scroll.
- If the design includes forms, plan validation, empty states, error states, and success states.

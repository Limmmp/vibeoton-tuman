# Code Analysis Checklist

## Project Shape

- Framework, language, build tool, package manager, and runtime.
- Route system, entry points, layouts, and rendering strategy.
- Source, public, asset, style, test, and configuration directories.

## Component Architecture

- Shared primitives, composed components, page modules, and layouts.
- Props, variants, slots, state ownership, and context boundaries.
- Repeated markup, duplicate components, oversized components, and dead code.
- Generated or vendor code that should not be treated as authored architecture.

## Styling and Tokens

- Global CSS, CSS Modules, Sass, CSS-in-JS, utility CSS, or component library.
- Theme files, CSS variables, Tailwind config, design tokens, and dark mode.
- Responsive rules, container queries, breakpoints, and layout primitives.
- Declared tokens versus actual usage.

## State and Data

- Local state, stores, server state, forms, validation, API clients, and fixtures.
- Loading, empty, error, optimistic, success, and permission states.
- Data-driven variants and conditional rendering.

## Interaction and Motion

- Event handlers, keyboard behavior, focus management, overlays, drag behavior, scroll logic, and gestures.
- Motion library, timelines, transition utilities, and reduced-motion handling.

## Assets

- Fonts, icons, images, video, SVG, canvas, WebGL, and remote media.
- Import paths, optimization, responsive sources, preload, lazy loading, and fallbacks.

## Accessibility

- Semantic elements, labels, landmarks, heading order, alt text, focus, keyboard access, dialogs, live regions, and contrast tokens.
- Component-library accessibility does not prove correct usage.

## Runtime Verification

When possible, verify:

- which routes and components render;
- computed fonts and styles;
- loaded assets and failed requests;
- console errors;
- behavior at representative viewports;
- whether conditional states are reachable.
- whether source-defined routes/components match screenshots, Figma, or user-provided references.

## Reporting Distinctions

Use precise language:

- "Defined in code" for declarations.
- "Imported by" for dependency edges.
- "Rendered at" for observed output.
- "Potentially unused" when reachability is not proven.
- "Component candidate" for repeated markup without an abstraction.
- "Runtime behavior unknown" when execution is unavailable.
- "Current stack observed" when framework/dependency evidence is descriptive only; final stack choice belongs to `frontend-design-planner`.

# Bundle Analysis

## What to Inspect

- package manager and lockfile;
- framework build output;
- route chunks;
- JavaScript transfer, parsed, and execution cost;
- CSS transfer and unused CSS risk;
- source maps or analyzer output when available;
- third-party scripts and remote widgets;
- duplicated dependencies;
- polyfills and legacy targets;
- client-only code in server-capable frameworks.

## Red Flags

- large initial JS for mostly static pages;
- heavy libraries used for small features;
- icons imported as entire packs;
- chart/editor/map/3D libraries loaded on routes that do not need them;
- duplicate date, utility, animation, or component libraries;
- route chunks that all load the same heavy dependency;
- hydration of static content;
- unused CSS frameworks or oversized global CSS;
- third-party tags blocking or competing with the main thread.

## Framework-Specific Checks

### React + Vite

- inspect `dist/assets`;
- check lazy routes and dynamic imports;
- verify production build is used;
- check whether large components can be split;
- inspect CSS bundling and font/media imports.

### Next.js

- inspect build route sizes;
- separate server and client components;
- check unnecessary `"use client"`;
- inspect image/font usage;
- check dynamic imports for below-the-fold heavy widgets;
- inspect middleware and server response time when relevant.

### Static HTML/CSS/JS

- inspect script order and blocking behavior;
- defer or module-load non-critical scripts;
- split vendor scripts only when it improves cacheability or route cost;
- remove unused CSS and duplicate assets.

## Dependency Cost Heuristics

Prefer route-level removal or lazy loading over micro-optimizing syntax.

Before recommending removal, identify:

- which route imports the dependency;
- whether it affects initial load;
- whether it runs on the main thread;
- whether a lighter existing dependency already exists;
- whether removing it would change UX or maintainability.

## Reporting Pattern

For each bundle finding:

- file or chunk;
- size evidence;
- imported dependency or source path;
- affected route;
- user impact;
- recommended change;
- verification method.

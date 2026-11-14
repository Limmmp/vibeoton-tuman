# Runtime and Animation Cost

## Main-Thread Work

Inspect:

- long tasks;
- JavaScript execution time;
- hydration work;
- expensive renders;
- repeated layout/recalc style;
- synchronous event handlers;
- large JSON parsing;
- client-side data transformations;
- third-party scripts.

Prefer measuring interaction paths that users actually perform.

## Animation and Scroll

Check:

- animated properties;
- scroll-linked work;
- pinning and scrubbed timelines;
- layout-triggering animation;
- large blurred or filtered layers;
- canvas/WebGL frame cost;
- custom cursors;
- parallax and smooth scroll libraries;
- `prefers-reduced-motion` behavior;
- mobile CPU impact.

Prefer transform and opacity for routine UI motion. Do not treat GSAP, Framer Motion, or WebGL as a problem by default; diagnose the actual cost.

## Interaction Risk

Look for:

- input latency;
- delayed menu opening;
- slow filtering/search;
- heavy form validation;
- modal/dialog jank;
- route transition stalls;
- click handlers that trigger large synchronous updates.

## Rendering and Layout

Check:

- forced synchronous layout;
- measuring DOM inside scroll or resize loops;
- unthrottled listeners;
- massive box shadows, filters, backdrop blur, and fixed backgrounds;
- layout shifts from late content;
- large DOM trees for virtualizable lists.

## Reporting Pattern

For each runtime finding:

- interaction or scroll path;
- trace/evidence;
- affected component or script;
- user-visible symptom;
- likely root cause;
- recommended fix;
- verification method.

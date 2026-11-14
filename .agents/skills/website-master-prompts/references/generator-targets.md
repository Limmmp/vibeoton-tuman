# Generator Targets

Use this reference to adapt the master prompt to the system that will consume it.

## Code Agent

Use when the output will be implemented by Codex, Claude Code, Cursor, or another coding agent.

Include:

- exact stack, package roles, file structure, component boundaries, and data files;
- implementation constraints, accessibility requirements, responsive rules, and QA checks;
- instructions to avoid placeholders, broken assets, console errors, text overflow, and incoherent overlap.

Avoid broad visual adjectives without implementation details.

## Visual Website Generator

Use when the generator primarily creates visual pages from text.

Include:

- first viewport composition, layout rhythm, type scale, palette roles, surfaces, media direction, component/state descriptions, and section order;
- explicit anti-generic constraints;
- enough content context to avoid stock-like layouts.

Avoid overloading the prompt with repo file paths or package commands unless the generator supports them.

## Single-File HTML Generator

Use when the user asks for plain HTML/CSS/JS or a generator with no build step.

Require:

- `index.html` with embedded styles and scripts, or `styles.css` and `script.js` only when multi-file output is allowed;
- semantic HTML, CSS variables, CSS Grid/Flexbox, accessible controls, and vanilla JS;
- no React, Vue, Tailwind, npm, bundlers, or package installs unless explicitly requested.

## React Generator

Use for React, Vite, Next.js, React Router, shadcn/ui, or component-heavy prompts.

Include:

- component tree, `src/data` or equivalent content source, state ownership, client-only interactions, icon library, animation library, and styling approach;
- clear rules for reusable components and UI states.

## Motion-Heavy Generator

Use for GSAP, Framer Motion, Lenis, Three.js, React Three Fiber, Anime.js, scroll choreography, or 3D.

Require:

- a motion purpose tied to product state, storytelling, inspection, or task completion;
- library ownership boundaries;
- reduced-motion fallback;
- mobile performance fallback;
- cleanup for animation loops, scroll handlers, and timelines.

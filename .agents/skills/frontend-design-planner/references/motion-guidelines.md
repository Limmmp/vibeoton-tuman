# Motion Guidelines

Plan motion only after identifying what the design needs to communicate.

## Choose Motion by Purpose

| Purpose | Good fit |
| --- | --- |
| Small UI transitions | CSS transitions |
| React component entry/exit | Framer Motion |
| Layout morphing | Framer Motion layout animations |
| Complex timelines | GSAP |
| Scroll-triggered choreography | GSAP ScrollTrigger |
| Smooth scroll feel | Lenis |
| 3D camera/object movement | Three.js / React Three Fiber |

## Motion Plan Must Include

- What animates.
- When it starts.
- Duration/easing.
- Whether it repeats.
- How it behaves on mobile.
- Reduced-motion fallback.
- Performance risk if it touches layout, filters, video, canvas, or WebGL.

## Practical Defaults

- Use opacity + transform for reveals.
- Avoid animating width, height, top, left, box-shadow, or filter unless the design requires it.
- Keep scroll effects subtle on content-heavy pages.
- Disable or simplify parallax on mobile.
- Use stable media dimensions before animation to avoid layout shift.
- Prefer CSS for simple hover transitions.

## Anti-Patterns

- Adding scroll smoothing to every page by default.
- Combining Lenis, GSAP, and Framer Motion without clear ownership.
- Animating all sections with the same reveal pattern when the design has varied rhythm.
- Hiding important content behind long intro animation.
- Ignoring `prefers-reduced-motion`.

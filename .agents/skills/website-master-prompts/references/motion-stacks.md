# Motion Stacks

Use when the prompt needs motion, scroll choreography, 3D, WebGL, or animation libraries.

Motion must serve content, product state, navigation, inspection, or user feedback. Do not use motion as generic background decoration.

## Framer Motion + Lenis

Roles:

- Lenis: smooth scroll with explicit setup, rAF loop, cleanup, and tuned feel.
- Framer Motion: entrance, section reveal, layout transitions, hover/tap states, staggered content.

Prompt details to include:

- Lenis settings such as lerp/multiplier only when useful.
- `prefers-reduced-motion` fallback.
- Avoid over-animating every section the same way.
- Keep content readable during scroll effects.

## Three.js / React Three Fiber + GSAP

Roles:

- Three.js/R3F: real 3D scene, product object, particles, material system, camera.
- GSAP: timeline, pinned sections, ScrollTrigger, camera/object transitions.

Prompt details to include:

- Concrete 3D subject tied to the brand/product.
- Camera behavior across sections.
- Fallback or simplified mobile behavior.
- Performance constraints: limited geometry, compressed textures, lazy loading.

## GSAP Without 3D

Use for premium scroll storytelling, pinned panels, split text, product sequences, or editorial motion.

Prompt details to include:

- Timeline order.
- Trigger points.
- Pinned sections.
- Scrub behavior.
- Cleanup expectations.

## GSAP Skill Pack Routing

The following are optional external skills, not libraries installed by this pack. Check that a skill is available before invoking it. When absent, keep working from the local role definitions below and do not claim that the skill was read.

When the prompt names GSAP, assign responsibilities clearly:

- `gsap-core`: tweens, timelines, easing, transforms.
- `gsap-timeline`: sequenced product or editorial transitions.
- `gsap-scrolltrigger`: pinned sections, scroll-linked progress, reveal timing.
- `gsap-react`: React lifecycle-safe animation setup and cleanup.
- `gsap-performance`: transform/opacity-first animation, limited layout thrash, mobile fallbacks.
- `gsap-plugins`: plugin registration and paid/plugin-specific constraints when relevant.

Missing GSAP skills must not block prompt generation, installation, or doctor health. The generated prompt may still name the GSAP library when the requested experience justifies it.

## Anime.js

Use for lightweight timeline animation, SVG motion, microinteractions, and decorative sequences.

Prompt details to include:

- What elements animate.
- Timeline order.
- Interaction triggers.
- Reduced-motion fallback.

## Motion Anti-Patterns

- Naming a library without assigning responsibility.
- Combining Lenis, GSAP, and Framer Motion without clear boundaries.
- Making scroll effects block reading.
- Using 3D only as generic background decoration.
- Ignoring mobile performance.
- Ignoring cleanup for requestAnimationFrame loops, ScrollTrigger instances, event listeners, or WebGL resources.
- Animating layout properties when transform/opacity would work.

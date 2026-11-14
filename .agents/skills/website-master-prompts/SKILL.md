---
name: website-master-prompts
description: >-
  Use when the requested deliverable is a copy-ready prompt for an AI website or
  frontend generator. Do not replace a requested design brief, technical plan,
  local implementation, or interface analysis with a generator prompt.
---

# Website Master Prompts

Produce the usable prompt itself, preserving supplied intent and constraints. Choose one mode: concept-to-prompt, design-brief-to-prompt, reverse-engineered-to-prompt, plan-to-prompt, prompt rewrite, or user-requested variants.

## Workflow

1. Confirm that a prompt is the requested artifact. For ambiguous multi-stage work, consult `../web-ui-designer/references/workflow-routing.md`.
2. Choose mode and target with `references/output-modes.md` and `references/generator-targets.md`.
3. Preserve supplied design, plan, or analysis evidence using `references/prompt-input-handoffs.md`; label unknowns instead of inventing them.
4. Define product goal, audience, primary action, source handoff, non-goals, stack constraints, IA, first viewport, visual system, components/states, assets, motion, responsiveness, and acceptance checks to the depth the target needs.
5. Write a copy-ready fenced `prompt` block using `references/master-prompt-template.md`.
6. Check it with `references/prompt-quality-checklist.md`; add surrounding explanation only when requested or necessary.

Use `references/novelty-rules.md` only when a distinct direction is requested, `references/stack-presets.md` when the stack is material, `references/motion-stacks.md` for animation responsibilities, `references/prompt-review.md` when rewriting an existing prompt, and `references/example-master-prompts.md` only when output shape is unclear.

## Optional Integrations

External GSAP skills named in `references/motion-stacks.md` are optional helpers. Check availability before invoking them. If absent, describe the GSAP responsibilities directly from local guidance; do not block prompt creation or claim the skill was used. Libraries named in a prompt are not automatically installed skills.

## Output Rules

- Give the prompt, not merely advice about writing one.
- Preserve explicit stack, brand, gradient, IA, and “no dependency” constraints.
- Assign each library a concrete responsibility and avoid unnecessary combinations.
- Avoid a generic navbar/hero/cards sequence only when it conflicts with the product; conventional structure is allowed when it fits.
- Make variants differ in structure, visual language, interaction model, and media direction rather than colors alone.
- Keep a small prototype prompt compact; reserve production, CMS, SEO, CI, and full QA detail for work that needs it.

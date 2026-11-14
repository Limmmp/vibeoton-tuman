---
name: web-ui-reverse-engineer
description: >-
  Use when an existing interface must be decomposed into evidence-backed layout,
  components, tokens, responsive behavior, interactions, assets, or technical
  clues. Do not use for redesign, implementation, or acceptance verdicts.
---

# Web UI Reverse Engineer

Explain how an existing interface is composed, what evidence supports each material claim, and what remains unknown. Select the smallest analysis mode that satisfies the request: design, components, code architecture, design system, rebuild handoff, redesign context, or full analysis.

## Evidence Model

Classify sources before analysis: visual, Figma, runtime, code, or combined. Read `references/artifact-intake.md`, `references/input-mode-guidance.md`, and `references/evidence-matrix.md` when multiple sources or conflicts matter.

Distinguish `authored`, `defined`, `rendered`, `observed`, and `inferred`. Use `EXACT`, `HIGH CONFIDENCE`, `INFERRED`, or `UNKNOWN` from `references/confidence-levels.md` when uncertainty changes the downstream decision. Code does not prove active behavior until usage is verified; a screenshot rarely proves exact values or hidden states.

## Workflow

1. Record sources, routes/frames, viewports, states, themes, access limits, requested mode, and intended use.
2. Map the product shell, navigation, page regions, primary actions, and content hierarchy.
3. Decompose components and variants with `references/component-decomposition.md` when requested.
4. Extract visual tokens with `references/design-token-extraction.md`, preserving source and confidence.
5. Document observed interactions and responsiveness with `references/responsive-interaction-extraction.md`; label unobserved mobile behavior as inferred.
6. Inspect framework, routes, state/data, styling, assets, and dependencies only when code is available, using `references/code-analysis-checklist.md`.
7. Prepare the requested handoff with `references/handoff-contracts.md` and write only relevant sections of `references/analysis-report-template.md`.
8. Apply `references/report-quality-gates.md` before a substantial report.

## Finding Contract

Material claims should include scope, claim, source/evidence, evidence state, confidence, and downstream implication. When sources conflict, report both contexts and which source should guide the requested task. Do not collapse confidence into severity or present missing evidence as a negative finding.

## Boundaries

Do not silently redesign, choose a new stack, write code, copy protected assets, bypass access controls, or issue an acceptance verdict. An end-to-end request may use reverse engineering as an internal step and continue to its requested result; an analysis-only request ends with analysis and no source changes.

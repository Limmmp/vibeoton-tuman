---
name: frontend-accessibility-audit
description: >-
  Use when a finished or near-finished frontend needs an evidence-backed WCAG,
  keyboard, focus, semantics, forms, contrast, motion, or assistive-technology
  audit. Code changes require an explicit audit-and-fix request.
---

# Frontend Accessibility Audit

Find accessibility barriers in the requested flows and state exactly which evidence supports each conclusion. Default to WCAG 2.2 AA unless another level is requested.

## Modes

Choose the smallest sufficient mode: quick smoke, keyboard/focus, forms, semantics, visual accessibility, assistive-technology, WCAG AA, or full audit. Use audit-only unless the user asked to fix; an audit-and-fix request authorizes baseline, fixes, and recheck.

## Evidence Layers

Record DOM/accessibility-tree semantics, keyboard behavior, automated results, visual measurements, and actual assistive-technology testing separately.

- DOM or the accessibility tree can support name, role, value, state, landmarks, and heading findings.
- Keyboard tests support reachability, operation, focus order, trapping, escape, and focus return.
- Automated tools find candidates; a green score does not prove accessibility.
- Screen-reader behavior is tested only with a named assistive technology and browser combination. Record versions, OS, route/state/action, and the observed announcement. Without that run, mark it `NOT TESTED`.

## Workflow

1. Define routes, states, user flows, target WCAG level, environment, available tools, and exclusions.
2. Inspect or run the real UI. Record build/start blockers without stopping independent checks.
3. Use `references/automated-tools.md`, then verify relevant keyboard/focus, semantics/ARIA, forms, and visual concerns with their references.
4. Map only supported findings through `references/wcag-2-2-checklist.md`. Treat component or route evidence as scoped evidence, not product-wide conformance.
5. Classify using `references/severity-and-verdict.md` and report with `references/audit-report-template.md`.
6. When fixes were requested, create testable tasks through `references/handoff-to-implementation.md` and rerun the affected checks.

Load `references/keyboard-focus.md`, `references/aria-semantics.md`, `references/forms-validation.md`, or `references/visual-contrast-motion.md` only when that layer is in scope.

## Finding Contract

Include ID, route/state/element, expected and actual behavior, evidence type, check status, affected users, WCAG criterion and level when supported, severity, confidence, next action, and recheck criterion. Keep `PASS`, `FAIL`, `NOT RUN`, `BLOCKED`, and `NOT APPLICABLE` distinct from severity and confidence.

Report practical results for tested flows. Do not present a scoped audit as legal advice or a complete WCAG conformance claim.

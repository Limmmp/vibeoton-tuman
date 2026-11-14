---
name: frontend-performance-audit
description: >-
  Use when a finished or near-finished frontend needs measured Core Web Vitals,
  bundle, media/font, runtime, caching, or animation diagnosis. Code changes
  require an explicit audit-and-fix request or concrete findings to fix.
---

# Frontend Performance Audit

Measure or inspect the requested surface, separate field and lab evidence, and prioritize bottlenecks by user impact and route importance.

## Modes

Choose quick smoke, Core Web Vitals, bundle, media/font, runtime/animation, or full audit. Do not expand a narrow question into every mode. Default to audit-only; if the user requested fixes, baseline, fix, and recheck are already within scope.

## Workflow

1. Record the target build/commit or working-tree fingerprint, routes, device profile, browser, cache, throttling, build mode, run count, and available field data.
2. Prefer a production build or deployed URL. Use `references/measurement-strategy.md` to choose repeatable measurements and disclose variability.
3. Interpret LCP, INP, CLS, and proxies with `references/core-web-vitals.md`. Do not report Lighthouse TBT as measured field INP.
4. Inspect only relevant layers with `references/bundle-analysis.md`, `references/media-font-optimization.md`, and `references/runtime-animation-cost.md`.
5. Classify findings and budget provenance with `references/severity-and-budgets.md`, then use `references/audit-report-template.md` for proportionate output.
6. If fixes were requested, hand concrete tasks through `references/handoff-to-implementation.md` and repeat comparable measurements.

## Evidence and Budget Rules

Each finding needs ID, route/state, expected source, actual result, evidence, check status, severity, confidence, user impact, next action, and recheck criterion.

Label a budget as one of:

- explicit project requirement;
- agreed release gate;
- external metric benchmark;
- skill recommendation.

A recommended JS/CSS budget is a diagnostic guide, not an invented user requirement or automatic `NO-GO`. Metric classification and release verdict are separate. Small threshold movement does not by itself prove P1 impact; justify severity with affected users, route importance, repeatability, and product requirements. Unmeasured metrics remain `UNKNOWN`.

Field evidence should include URL/origin scope, period, and device cohort. Lab comparisons should use the same profile and enough runs to avoid presenting noise as improvement. Do not require an expensive full benchmark for a small unrelated change.

## Output

A quick audit returns environment, evidence, key findings, limitations, and next action. A full audit adds metric, bundle, media/font, runtime, caching, and budget sections. Report only measurements actually taken and never turn a passing lab score into proof of real-user performance.

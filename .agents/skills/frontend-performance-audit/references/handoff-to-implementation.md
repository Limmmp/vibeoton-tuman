# Handoff to Implementation

Use this reference when converting performance findings into code-change tasks for `frontend-implementation`.

## Handoff Requirements

Each task should include:

- finding id;
- affected route/component/file;
- evidence;
- expected user impact;
- recommended change;
- constraints;
- verification command or measurement;
- priority.

## Task Shape

```text
P1: Reduce initial route JavaScript for /dashboard
Evidence: BUILD route chunk 340 KB transfer; LAB TBT 620 ms mobile profile.
Likely cause: Chart library imported into initial dashboard shell.
Change: dynamically import the chart panel below the fold and show a stable skeleton.
Verify: production build route chunk decreases; mobile Lighthouse TBT improves; dashboard interaction remains functional.
Owner skill: frontend-implementation.
```

## Fix Ordering

Prefer:

1. Fix broken or blocking resources.
2. Improve primary-route LCP.
3. Reduce main-thread work affecting interaction.
4. Eliminate CLS sources.
5. Reduce unnecessary initial JS/CSS.
6. Optimize media/fonts.
7. Add monitoring and budgets.

## Guardrails

- Do not ask implementation to "make it faster" without evidence.
- Do not prescribe a rewrite unless narrower fixes cannot address the measured cause.
- Do not remove UX-critical media or motion without a product/design decision.
- Keep performance fixes testable.
- Re-audit after material fixes.

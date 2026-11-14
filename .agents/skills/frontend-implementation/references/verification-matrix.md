# Verification Matrix

Use this reference to choose verification depth by project type.

Verification is risk-based. Match checks to the changed surface, failure impact, and available evidence; do not run every gate for every edit.

## Minimum Checks

| Project type | Required checks |
| --- | --- |
| Static HTML/CSS/JS | Open through local server when needed, desktop/mobile browser QA, console/assets check |
| React + Vite app | `npm run build` or project build, dev server, desktop/mobile browser QA, console/network check |
| Next.js app | project build when feasible, dev server, route render check, desktop/mobile browser QA |
| Dashboard/tool UI | build, core interaction smoke, keyboard/focus path for controls, empty/loading/error state inspection |
| Ecommerce/catalog | build, product media/variant/cart state inspection, mobile purchase path, metadata/asset check when public |
| Motion-heavy site | build, desktop/mobile visual QA, reduced-motion behavior, runtime jank and console check |
| Pure utility/state fix | focused unit or regression test; browser check only if rendered behavior is involved |
| Local spacing/style fix | affected viewport/state visual check; broader smoke only when shared styles changed |

## Browser QA Evidence

Inspect:

- first viewport composition;
- scroll depth and section order;
- mobile navigation and layout changes;
- media loading and aspect ratios;
- interactive controls;
- text overflow and long-content cases.

## Escalate to Audit Skills

- Use `frontend-performance-audit` after implementation when production performance, Core Web Vitals, bundle cost, media/font loading, or animation runtime cost needs diagnosis.
- Use `frontend-accessibility-audit` after implementation when WCAG, keyboard, focus, ARIA, contrast, forms, or screen-reader flow needs diagnosis.
- Use `frontend-acceptance-review` after implementation when the question is whether the final work satisfies the brief, plan, mockup, or requirements.

## Reporting

Do not claim a check passed unless it was actually run or visually inspected. If a check is skipped, report the exact blocker.

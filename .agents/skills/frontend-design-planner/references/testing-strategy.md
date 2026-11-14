# Testing Strategy

Use this reference when the frontend plan should define validation beyond manual QA.

## Test Scope by Project Type

| Project | Recommended checks |
| --- | --- |
| Static/marketing page | build, lint/typecheck, responsive browser QA, visual smoke screenshots |
| Content/SEO site | build, route rendering, metadata checks, link checks, sitemap/robots, visual smoke |
| Interactive landing page | build, interaction smoke tests, mobile/desktop screenshots, reduced-motion check |
| Dashboard/tool UI | unit tests for helpers, component tests for controls, Playwright for core flows |
| Ecommerce/checkout | Playwright for cart/checkout, form validation, payment mocks, accessibility audit |
| Authenticated SaaS | route guards, role states, forms, empty/loading/error states, e2e smoke |

## Choosing Test Tools

- **Vitest**: utilities, reducers, formatting, data transforms, hooks with testable logic.
- **React Testing Library or component tests**: accessible component behavior, form interaction, modal/menu behavior.
- **Playwright**: real browser flows, routing, responsive checks, forms, dialogs, keyboard paths, screenshots.
- **Visual regression**: design-heavy pages and stable responsive layouts with a meaningful approved reference or technical baseline. Use the reproducible visual-regression procedure from `frontend-acceptance-review` when that skill is available.
- **Accessibility audit**: hand off to `frontend-accessibility-audit` for WCAG/keyboard/focus/ARIA depth.
- **Performance audit**: hand off to `frontend-performance-audit` for Core Web Vitals, bundle, runtime, media/font depth.

## Planning Rules

- Do not prescribe a full test suite for a disposable prototype.
- Do name at least build/typecheck/browser QA for production work.
- E2E tests should cover user journeys, not every component.
- Component tests are useful for complex controls that are reused.
- Visual regression is useful only when screenshots are stable and design fidelity matters.
- Record build identity, browser, viewport, scale, theme, locale, fixtures, and UI readiness for visual regression. Baselines are reviewed artifacts, not files to regenerate automatically for a green result.
- Accessibility and performance audits are separate skills; mention the handoff rather than duplicating their full process.

## Output Pattern

Include:

- commands to run, when known;
- flows to test;
- viewports and states;
- what can be deferred;
- what blocks implementation completion.

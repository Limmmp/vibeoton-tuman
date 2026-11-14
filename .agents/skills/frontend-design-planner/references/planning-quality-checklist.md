# Planning Quality Checklist

Use this checklist before finalizing a frontend implementation plan.

## Scenario Fit

- Product type is named: landing/content, SaaS/dashboard, ecommerce/catalog, portfolio/editorial, tool UI, prototype, game-like site, or routed app.
- Stack choice follows the scenario and user constraints, not habit.
- The plan states what the chosen stack avoids and what complexity it introduces.
- Vague design direction is routed to `web-ui-designer` instead of being invented here.

## Specificity

- Dependencies have install commands and roles.
- File tree matches the chosen framework.
- Components are named by design role, not `SectionOne` or `CardGrid`.
- Repeated content has a data/config/content source.
- Interactive elements include hover, focus, active, disabled, loading, empty, error, and success states where relevant.
- Motion choices name the exact behavior they support.

## Proportionality

- Prototype plans do not include production CI, CMS, auth, SEO, or test suites unless requested.
- Production sites include build/typecheck, deployment target, responsive QA, accessibility, and performance handoff.
- Ecommerce and dashboards include state/data/forms/testing details.
- Content, marketing, portfolio, catalog, and docs pages include semantic content and metadata.
- Sections that do not matter are omitted; material exclusions are stated explicitly.

## Generic Output Rejection

Reject the plan and revise if it:

- Defaults to `navbar -> hero -> cards -> CTA -> footer` when that structure does not match the supplied design or product need.
- Lists fashionable libraries without design-specific roles.
- Recommends React/Next.js without considering Astro, HTML/CSS/JS, SvelteKit, or React Router when relevant.
- Describes visual sections but omits files, components, states, and implementation order.
- Duplicates audit workflows instead of handing off to the audit skills.

## Handoff Readiness

- `frontend-implementation` can start without guessing stack, files, components, assets, or phase order.
- Audit handoffs identify when to use performance, accessibility, or acceptance review.
- Any unknowns are explicit and marked as assumptions or inputs needed.

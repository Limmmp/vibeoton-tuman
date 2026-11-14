# Implementation Workflow

Use this checklist while building.

## 1. Inspect

- Identify package manager from lockfiles.
- Read `package.json`, source tree, routes/pages, global styles, and component directories.
- Find existing design system, icon library, state library, animation library, and test commands.
- Check whether the user supplied a plan from `frontend-design-planner`.
- Check whether the user supplied a brief from `web-ui-designer`, and preserve brief mode, product scenario, first viewport, non-goals, and handoff status.

## 2. Prepare

- Reuse the existing stack if present.
- If creating a new project, choose the smallest stack that satisfies the plan.
- Add dependencies only when required by a named design behavior.
- Create folders before implementation only when they will be used.
- Translate the upstream contract into concrete files, components, states, and verification checks before editing.

## 3. Build Base UI

- Add global tokens: colors, type, spacing, radii, shadows, breakpoints.
- Implement page structure and static content.
- Add stable media containers with width/height, aspect ratio, and object-fit rules.
- Build mobile and desktop layout before advanced animation.

## 4. Componentize

- Extract repeated or stateful regions into components.
- Use semantic names: `ScheduleBoard`, `ProjectArchive`, `PricingMatrix`.
- Keep component props simple and data-driven.
- Move repeated arrays to `data/` or a local config file.

## 5. Interactions

- Add stateful controls after static layout is correct.
- Add hover/focus/active/disabled states.
- Add keyboard support for menus, dialogs, tabs, and forms where applicable.
- Add animation last, with reduced-motion fallback.

## 6. Content and Assets

- Replace scaffold copy and starter assets.
- Use provided assets first; otherwise use scoped, visible stand-ins that support the design.
- Remove dead links, fake buttons, unused sections, and broken media.
- Put repeated content or sample data in data/config files when it improves maintainability.

## 7. Verify and Polish

- Run build/typecheck/lint/tests as available.
- Start local dev server.
- Inspect desktop and mobile viewports in a browser.
- Fix overflow, overlap, clipped text, broken assets, blank screens, console errors, and slow/heavy effects.
- Apply `completion-gates.md` before final response.

## Final Response

Report:

- What was implemented.
- Key files changed.
- Verification commands and results.
- Any known limitations or checks that could not run.

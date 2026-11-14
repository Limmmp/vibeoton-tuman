# Completion Gates

Use the gates relevant to the changed surface and risk before claiming implementation is complete.

## Contract Gate

- The implemented UI matches the approved brief, plan, mockup, or written spec.
- The first viewport is the requested product/site/app/tool experience, not a generic landing shell.
- Required sections, routes, screens, components, and states are present.
- Explicit constraints and non-goals are respected.

## Code Gate

- Created/edited files are complete and runnable.
- No missing implementation is hidden behind `TODO: implement`, “for brevity,” “same as above,” “omitted,” or “rest of code.” Legal spread/rest operators, intentional text ellipses, meaningful “Read more” copy, and TODOs outside the changed scope are not failures by themselves.
- Starter scaffold content is removed.
- Dependencies are justified by actual design or project need.
- Unrelated user changes are preserved.

## UX Gate

- Desktop and mobile layouts are usable.
- No horizontal overflow, overlapping panels, clipped text, blank screens, or broken media.
- Controls have hover/focus/active/disabled states where relevant.
- Forms, filters, menus, tabs, dialogs, and app controls have usable empty/loading/error/success states where relevant.
- Motion has a reduced-motion fallback when meaningful motion is added.

## Verification Gate

- Build/typecheck/lint/test commands are run when available.
- Dev server starts when rendered app behavior must be checked.
- Substantial UI work covers desktop and mobile; narrow logic or local style changes use the focused checks named in the verification matrix.
- Console and network/media errors are checked.
- Any skipped check has a concrete reason.

## Final Response Gate

Include:

- what was implemented;
- key files changed;
- commands/checks run and outcomes;
- known limitations, skipped checks, or follow-up audit gates.

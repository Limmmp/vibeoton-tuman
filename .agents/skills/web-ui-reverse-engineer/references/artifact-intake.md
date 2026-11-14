# Artifact Intake

Use this reference before analysis when the source type, access, or scope is not already obvious.

## Intake Fields

Record:

- artifact type: screenshot, mockup, Figma, live URL, local URL, codebase, video, PDF, or combined;
- source location: file path, URL, route, frame, component, branch, or screenshot name;
- viewport or frame dimensions;
- theme, locale, auth state, role, experiment, and device if known;
- states inspected: default, hover, focus, active, selected, loading, empty, error, success, modal, menu, drawer, checkout, filter, or authenticated;
- constraints: no network, no credentials, no source code, no Figma access, static image only, partial route coverage;
- requested downstream intent: redesign context, rebuild handoff, design-system extraction, migration, or documentation.

## Scope Selection

- Use a narrow analysis when the user asks for only tokens, components, or one screen.
- Use full analysis when the user asks for complete breakdown, reconstruction, migration, or design-system extraction.
- Use rebuild handoff when the next step is `frontend-design-planner`.
- Use redesign context when the next step is `web-ui-designer`.

## Stop Conditions

Do not claim exact hidden states, mobile behavior, token names, font families, or component abstraction when the evidence cannot prove them. Mark as `UNKNOWN` or `INFERRED`.

# Handoff Contracts

Use this reference when the reverse-engineering report feeds another skill.

## Handoff Status

End substantial reports with one status:

- `Design-ready`: send to `web-ui-designer` for a redesign or new direction using current-interface evidence.
- `Planner-ready`: send to `frontend-design-planner` for faithful reconstruction or migration planning.
- `Implementation-ready`: enough evidence and decisions exist to code; implement only when code is the requested deliverable.
- `Prompt-ready`: send to `website-master-prompts` when the user wants an external generator prompt based on the analysis.
- `Analysis complete`: no further skill needed.

## To `web-ui-designer`

Include:

- current product shell and IA;
- strengths worth preserving;
- weaknesses or generic patterns to avoid;
- visual system and media direction;
- components/states that define the product;
- unknowns that could affect redesign;
- confidence summary.

Do not create the new design direction inside the reverse-engineering report.

## To `frontend-design-planner`

Include:

- reconstruction scope;
- page/component tree;
- token groups and normalized recommendations;
- responsive and interaction requirements;
- asset/media inventory;
- technical architecture evidence when available;
- risks, missing states/assets, and fidelity priorities.

Do not choose the final stack or implementation phases here unless the source code already proves the current stack and the task is a faithful migration note.

## To `frontend-implementation`

Use when code is the requested deliverable and the available context is implementation-ready. For an end-to-end build request, the necessary planning may occur internally without a separate approval checkpoint. Provide:

- source evidence summary;
- must-preserve visual/UX behavior;
- component and token references;
- verification priorities.

Always state the requested deliverable, artifact readiness, and blockers/assumptions separately.

## To `website-master-prompts`

Provide:

- concise interface description;
- IA/component/tokens summary;
- anti-generic constraints;
- unknowns to avoid overclaiming.

# Component Decomposition

## Decomposition Order

Analyze from stable structure to local detail:

1. Product shell and route layouts.
2. Layout primitives.
3. Navigation and orientation components.
4. Domain or content modules.
5. Interactive controls.
6. UI primitives.
7. Page-specific compositions.

## Component Categories

- **Shells**: application frame, marketing shell, authenticated shell, editor shell.
- **Layouts**: container, stack, cluster, grid, split pane, sidebar layout, toolbar layout.
- **Navigation**: header, sidebar, breadcrumbs, tabs, pagination, command palette.
- **Content**: hero, feature row, metric group, article body, product gallery, pricing matrix.
- **Interactive**: form, filter bar, data table, editor, carousel, upload zone, checkout.
- **Primitives**: button, input, badge, avatar, icon button, tooltip, divider, surface.
- **Feedback**: toast, alert, skeleton, empty state, error state, progress, confirmation.

## Boundary Heuristics

Treat a region as a component when one or more are true:

- it repeats;
- it has variants or states;
- it owns interaction or data;
- it has a stable semantic role;
- it isolates layout complexity;
- it is reused across routes;
- it has an independent responsive transformation.

Avoid fragmenting every wrapper into a named component. Avoid merging unrelated behavior into a page-sized component.

## Reuse Classification

Label each item:

- `Existing reusable component`: confirmed abstraction in code or Figma.
- `Repeated pattern`: repeated appearance, abstraction unconfirmed.
- `Component candidate`: should likely be shared for reconstruction.
- `One-off composition`: intentionally page-specific.
- `Primitive`: low-level reusable control or layout unit.

## Component Record

For important components include:

- name and category;
- purpose;
- parent and children;
- slots or content regions;
- variants;
- states;
- responsive behavior;
- source evidence;
- confidence;
- notes about reuse or coupling.
- downstream action: preserve, normalize, rebuild as primitive, rebuild as composed component, or redesign.

## Tree Format

```text
ProductShell
|-- GlobalHeader
|   |-- BrandMark
|   |-- PrimaryNavigation
|   `-- AccountMenu
|-- RouteLayout
|   |-- PageHeader
|   |-- FilterToolbar
|   `-- ResultsGrid
|       `-- ResultCard [repeated]
`-- GlobalFooter
```

Use `[variant: ...]`, `[state: ...]`, and `[conditional]` annotations when they clarify the structure.

## Reconstruction Priority

For rebuild handoff, mark components:

- `P0`: required for the first viewport or primary action;
- `P1`: required for main flow fidelity;
- `P2`: reusable support component or secondary state;
- `Unknown`: needs more evidence before planning.

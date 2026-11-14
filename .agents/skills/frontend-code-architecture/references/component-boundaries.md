# Component Boundaries

Use this reference when deciding whether UI should stay inline, become a local component, become a feature component, or become a reusable primitive.

## Split When

- A file mixes multiple product sections, panels, modals, forms, tables, or interactive flows.
- A block has its own responsibility, state, variants, or accessibility behavior.
- Markup repeats with data differences.
- A section has independent ownership or is likely to change independently.
- The parent file is hard to scan because layout, state, effects, and content are interleaved.

## Keep Inline When

- Markup is short, used once, and easier to understand in context.
- Extraction would require passing many props just to avoid a few lines.
- The element has no separate responsibility or state.
- The project is a small one-screen prototype and the file remains easy to scan.

## Boundary Types

| Type | Use for | Avoid |
|---|---|---|
| Page/route | route-level composition, metadata, data loading, feature assembly | detailed cards, tables, repeated markup, low-level controls |
| Feature component | domain-specific sections, dashboards, forms, panels, product flows | generic styling primitives |
| UI primitive | buttons, tabs, cards, dialogs, fields, reusable controls | product-specific copy or business rules |
| Local component | one page-specific sub-tree that improves readability | reusable components that other routes need |
| Data/config | repeated content, navigation, mock rows, section definitions | stateful behavior or JSX-heavy rendering |

## Naming

- Name components by role: `PricingSection`, `ProjectGrid`, `SettingsPanel`, `CheckoutSummary`.
- Name primitives by UI behavior: `Button`, `Tabs`, `Modal`, `Field`, `StatusBadge`.
- Avoid vague names such as `Content`, `Section1`, `CardComponent`, `Helper`.

## Props

- Pass the minimum data needed by the component.
- Keep variant props explicit when the design has known variants.
- Avoid prop drilling through many layers. If data travels through unrelated components, reconsider the boundary.
- Do not pass large untyped blobs when a clear prop shape is available.

## Extraction Check

After extraction, verify:

- imports are stable;
- component names explain the structure;
- parent file is easier to scan;
- behavior and visual output are unchanged;
- repeated content is data-driven where appropriate.

There is no mandatory repetition count or file-size threshold. Extract when responsibility, reuse, state, accessibility behavior, testability, or change safety improves.

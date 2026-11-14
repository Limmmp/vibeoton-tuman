# Data and State Strategy

Use this reference when the design includes dynamic content, forms, filters, auth, dashboards, CMS data, repeated content, or user-specific state.

## State Levels

| Need | Prefer |
| --- | --- |
| One component toggle/open state | local component state |
| Shared UI state across nearby components | lifted state or colocated context |
| URL-addressable filters/search/sort/page | URL query state |
| Server data with caching/invalidation | Existing framework data layer; add a query library only when its lifecycle/caching model is needed |
| Simple app-wide client state | Existing store or small context; add a state library only when cross-feature ownership justifies it |
| Complex forms | native forms first; React Hook Form or framework forms when validation/state complexity justifies it |
| Content repeated across sections | data/config file, CMS, markdown/content collection |

## Planning Questions

- Which content is static, configurable, CMS-backed, or API-backed?
- Which state must survive refresh or be shareable by URL?
- Which state is user-specific or permission-specific?
- Which states need loading, empty, error, success, optimistic, or disabled handling?
- Does the design include search, filters, sort, pagination, cart, editor state, uploads, or multi-step forms?
- Are there localization, currency, timezone, or role variants?
- Can older search/filter responses arrive after newer requests, and how will obsolete results be cancelled or ignored?
- Which mutations are optimistic, and how will rollback avoid overwriting a newer successful action?
- Which timers, subscriptions, observers, or in-flight work require cleanup?

## Form Strategy

Plan:

- validation timing;
- error display;
- success state;
- disabled/submitting state;
- keyboard and accessibility behavior;
- server-side validation or API failure state;
- data persistence for multi-step flows.
- pending/submitting guards against accidental repeat submission, without presenting a frontend guard as server-side idempotency;
- preservation of entered data and a useful retry after failure.

## Async and URL Behavior

- Define request identity or cancellation for search/filter races so stale responses cannot replace current results.
- Define cache invalidation for the specific mutation and current framework; do not prescribe a global state/query package by default.
- Keep filters, search, sort, and pagination in URL state when refresh and back/forward behavior are part of the product contract.
- For optimistic updates, define rollback data, conflict behavior, error feedback, and how a late failure avoids reverting a newer success.
- Apply locale, currency, timezone, long-translation, and RTL cases only when relevant to the product, but make their ownership explicit when they are.

## Content Strategy

Use data/config files for repeated content in static builds. Use CMS/content collections when non-developers need updates, content count is high, or metadata/SEO content must scale.

## Anti-Patterns

- Adding global state for a local menu.
- Hiding filters in component state when they should be linkable.
- Adding TanStack Query for static JSON.
- Duplicating repeated content directly in JSX/HTML.
- Omitting empty/loading/error states for data-driven UI.

## Output Pattern

List the data sources, state owners, state persistence, loading/empty/error/success states, and files/modules where the state should live.

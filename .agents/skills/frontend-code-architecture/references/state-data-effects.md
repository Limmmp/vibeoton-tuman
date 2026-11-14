# State, Data, and Effects

Use this reference when JSX, state, effects, fetching, derived data, and configuration are tangled together.

## Local State

Keep state local when:

- it affects one component or a small subtree;
- it is UI-only, such as open/closed, selected tab, active filter, hovered item;
- lifting it would make unrelated components depend on it.

Lift state when:

- multiple siblings need the same value;
- route-level behavior depends on it;
- it must persist across feature boundaries.

## Hooks

Create a hook when:

- state/effect logic is reused;
- a component is hard to read because behavior dominates markup;
- browser APIs, subscriptions, timers, observers, or media queries need cleanup;
- tests would be clearer against behavior than against markup.

Do not create a hook for a single `useState` just to move code.

## Derived Data

- Compute simple values inline.
- Move repeated filtering, sorting, grouping, or formatting into named helpers.
- Memoize only when there is a real cost, unstable identity problem, or rendering issue.
- Keep formatters pure and testable when they affect user-facing values.

## Data and Config

Move repeated content out of JSX when it represents:

- navigation items;
- pricing tiers;
- feature lists;
- cards;
- testimonials;
- table rows;
- mock analytics;
- product catalog entries;
- step definitions.

Keep small one-off copy near the component when moving it would reduce readability.

## Effects

- Effects should synchronize with external systems, not compute render data.
- Keep event handlers named when they contain more than trivial logic.
- Clean up timers, listeners, observers, and animation handles.
- Keep data fetching and route loading aligned with the framework's conventions.
- Cancel or ignore obsolete async results so an older search/filter response cannot overwrite a newer one.
- Ensure cleanup covers timers, subscriptions, observers, animation handles, and in-flight work according to framework semantics.

## Mutations and Recovery

- Guard pending submissions against accidental duplicates, while recognizing that frontend state is not server-side idempotency.
- Preserve user input after a failed mutation and provide an appropriate retry path.
- For optimistic updates, keep enough prior state to roll back, but never let a late rollback erase a newer successful change.
- Invalidate only the caches affected by the mutation and follow the project's existing data layer.
- Keep shareable filters, search, sort, and pagination in URL state when refresh and browser navigation are part of the contract.

## Shared State

Avoid adding global stores by default. Prefer:

1. local state;
2. lifted state;
3. URL/search params for route-visible state;
4. framework data APIs;
5. context for stable cross-tree concerns;
6. external state libraries only when complexity justifies them.

Do not introduce Zustand, TanStack Query, or another library only because it appears in an example; preserve the repository's conventions unless the observed lifecycle needs a new tool.

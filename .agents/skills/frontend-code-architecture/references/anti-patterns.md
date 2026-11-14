# Architecture Anti-Patterns

Use this reference when reviewing frontend maintainability or explaining why a refactor is needed.

## Single-File UI

Symptoms:

- route or `App` file contains every section, modal, card, data array, event handler, helper, and style decision;
- repeated JSX differs only by copy or data;
- hard to find the code for a visible section.

Fix by extracting data/config, sections, feature components, and utilities in that order.

## Component Junk Drawer

Symptoms:

- all files live under `components/` with no feature or primitive distinction;
- names are vague;
- domain-specific components are reused accidentally.

Fix by separating `components/ui`, `components/layout`, and `features/<name>/components` when the project size justifies it.

## Premature Abstraction

Symptoms:

- generic components have many props but one caller;
- simple markup becomes harder to read after extraction;
- abstractions predict future requirements that do not exist.

Fix by keeping simple one-off markup local and extracting only around real pressure.

## Hidden Business Logic

Symptoms:

- filtering, grouping, formatting, permission checks, or price calculations live inside JSX;
- behavior is hard to test or reuse.

Fix by moving pure logic into named helpers and keeping render code declarative.

## Effect Tangle

Symptoms:

- one component owns unrelated effects for events, timers, fetching, layout, animation, and persistence;
- cleanup is missing or duplicated.

Fix by isolating external synchronization and extracting focused hooks only where useful.

## Styling Drift

Symptoms:

- repeated hard-coded token values;
- long duplicated utility class strings;
- responsive behavior breaks after extraction;
- one component relies on parent-specific overrides.

Fix by centralizing tokens, variants, and component-level styling according to the repo's existing styling approach.

## Unsafe Refactor

Symptoms:

- many files moved at once;
- no build/typecheck after import changes;
- unrelated visual changes mixed into structural cleanup;
- user changes overwritten.

Fix by planning small behavior-preserving steps and verifying after each meaningful pass.

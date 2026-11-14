# Refactor Workflow

Use this reference before changing existing frontend architecture.

## Intake

Identify:

- framework and package manager;
- current route/page/component tree;
- styling system;
- test/build commands;
- files with user changes;
- target area and non-goals;
- whether behavior must be preserved exactly.

## Plan Before Moving

Write a compact boundary plan:

1. source file or feature;
2. responsibilities currently mixed together;
3. new files;
4. what each file owns;
5. behavior that must remain unchanged;
6. verification command.

For large files, split in small passes:

1. extract data/config;
2. extract pure helpers;
3. extract stateless components;
4. extract stateful components or hooks;
5. clean imports and names;
6. verify.

## Preserve Behavior

- Move code before changing logic.
- Keep class names, attributes, ARIA, event handlers, animation hooks, and responsive classes intact unless changing them is the explicit task.
- Avoid formatting churn across unrelated files.
- Keep public exports stable when other files import them.
- Preserve existing routes and URLs.

## Verify

Run the strongest available checks:

- typecheck;
- build;
- unit/component tests;
- lint when already configured;
- browser smoke for UI changes;
- desktop and mobile screenshots when visual layout might change.

If verification cannot run, state why and what remains unverified.

## Final Report

For code changes, report:

- extracted components/hooks/utils/data;
- behavior-preservation notes;
- command results;
- any deferred cleanup;
- files intentionally left alone.

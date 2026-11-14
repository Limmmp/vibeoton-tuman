# Architecture Review Template

Use this template when the user asks for a maintainability review, code organization review, or refactor plan instead of direct edits.

## Summary

- Target:
- Framework:
- Scope reviewed:
- Verdict:

## Current Structure

Describe the route, component, style, data, and state organization that was actually inspected.

## Findings

| Priority | Area | Evidence | Risk | Recommendation |
|---|---|---|---|---|
| P1 | | | | |

Use:

- `P0` for broken architecture that blocks implementation or causes runtime defects.
- `P1` for high-maintenance structure likely to cause bugs or slow feature work.
- `P2` for meaningful cleanup with moderate impact.
- `P3` for polish or optional consistency.

## Proposed Structure

```text
src/
|-- ...
```

Explain why each new boundary exists. Mark what should stay local.

## Refactor Sequence

1. 
2. 
3. 

## Verification Plan

- Commands:
- Browser checks:
- Untested areas:

## Non-Goals

List design, performance, accessibility, dependency, or product changes that should not be mixed into this architecture pass.

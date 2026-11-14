# Handoff to Implementation

Use this reference when converting accessibility findings into code-change tasks for `frontend-implementation`.

## Handoff Requirements

Each task should include:

- finding id;
- affected route/component/file when known;
- user impact;
- WCAG relevance;
- evidence;
- expected behavior;
- recommended change;
- constraints;
- verification steps;
- priority.

## Task Shape

```text
P1: Restore keyboard focus management in the checkout modal
Evidence: On /checkout at 390x844, Tab moves behind the modal after the payment method field; Escape closes the modal but focus returns to body.
WCAG relevance: Keyboard, Focus Order, Name/Role/Value.
Change: trap focus inside the modal while open, close on Escape, return focus to the trigger, and mark background content inert.
Verify: keyboard path reaches all modal controls, cannot tab behind modal, Escape closes, focus returns to trigger.
Owner skill: frontend-implementation.
```

## Fix Ordering

Prefer:

1. unblock core keyboard paths;
2. fix missing names/labels on critical controls;
3. fix focus management for overlays and route changes;
4. fix form errors and validation announcements;
5. fix contrast and target size on primary actions;
6. fix headings, landmarks, and screen-reader flow;
7. add automated regression checks where appropriate.

## Guardrails

- Do not ask implementation to "make it accessible" without evidence.
- Do not prescribe ARIA when native HTML solves the issue.
- Do not break visual design unnecessarily; preserve design intent while fixing semantics and behavior.
- Keep fixes testable.
- Re-audit after material fixes.

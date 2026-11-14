# Gate Routing Matrix

Select only gates material to the requested verdict and changed surface.

| Intent or risk | Gate | Owner |
| --- | --- | --- |
| Quick QA or basic confidence | Build/start and focused browser smoke | Orchestrator |
| Release candidate | Smoke plus material domain gates | Orchestrator coordinates |
| Match design/spec/acceptance criteria | Acceptance | `frontend-acceptance-review` |
| WCAG, keyboard, focus, semantics, forms, AT | Accessibility | `frontend-accessibility-audit` |
| CWV, bundle, media/font, runtime, caching | Performance | `frontend-performance-audit` |
| Concrete findings need changes | Fix | `frontend-implementation` |
| Existing component structure is the issue | Architecture/refactor | `frontend-code-architecture` |
| Focused defect with no diagnosis | Reproduction and targeted debugging | `frontend-implementation` |

## Proportionality

- Copy-only or local pure-logic changes do not automatically require full accessibility/performance audits.
- Forms, dialogs, auth, checkout, and critical custom controls usually justify accessibility checks proportional to the change.
- Media-heavy, motion-heavy, public, or performance-sensitive routes justify focused performance evidence.
- Acceptance requires a source of expectation; otherwise run smoke and state the missing comparison artifact.
- Reuse a specialist report only when build, scope, state, environment, and time are still applicable.

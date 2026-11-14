---
name: frontend-acceptance-review
description: >-
  Use when a finished or near-finished frontend must be checked against supplied
  design, requirements, or acceptance criteria. Do not use for initial design,
  ordinary debugging, or code changes unless the user requested audit and fix.
---

# Frontend Acceptance Review

Compare the requested, designed, and implemented result, then issue an evidence-backed acceptance verdict.

## Modes and Boundaries

- `quick`: focused check of named routes, requirements, or regressions.
- `full`: requirements matrix plus visual, responsive, functional, and technical evidence.
- `audit-and-fix`: capture the baseline, implement requested fixes through `frontend-implementation`, and recheck affected behavior.

Default to audit-only when the user did not request changes. Audit-only never edits source. Audit-and-fix does not require a second authorization for the fixes already requested.

## Workflow

1. Identify authoritative requirements, design sources, target build/commit or working-tree fingerprint, routes, states, environments, and scope limitations.
2. Convert explicit requirements and clearly labeled inferences into testable rows using `references/requirements-matrix.md`.
3. Run the available build/tests and inspect rendered behavior when the requirement is observable at runtime.
4. Apply only the relevant checklists: `references/visual-fidelity-checklist.md`, `references/responsive-checklist.md`, and `references/functional-checklist.md`.
5. Use `references/visual-regression-procedure.md` only when a stable visual baseline and fidelity risk justify screenshot comparison.
6. Classify findings with `references/severity-and-verdict.md`, then write the proportionate report from `references/acceptance-report-template.md`.

## Evidence Contract

Each material finding needs an ID, route/state/scope, requirement source, expected and actual result, evidence, check status, severity, confidence, next action, and recheck criterion. Execution evidence should identify the tested build and environment when those can change the result.

Keep these axes separate:

- check status: `PASS`, `FAIL`, `PARTIAL`, `NOT TESTABLE`, `NOT APPLICABLE`, or `SPEC CONFLICT`;
- severity: impact if the finding is real;
- confidence: strength of evidence;
- verdict: `ACCEPT`, `ACCEPT WITH MINOR ISSUES`, `REJECT`, or `BLOCKED`.

Missing evidence is not `PASS`, and low confidence does not make a severe issue low severity. Do not fail implementation for personal taste or an inferred preference. A passing build cannot override broken required behavior.

## Output

A quick review returns scope, verdict, evidence, findings, and limitations. A full review adds the matrix and relevant domain summaries. Omit immaterial sections. State what was not tested, and never claim pixel precision, browser coverage, accessibility conformance, or runtime behavior that the evidence cannot support.

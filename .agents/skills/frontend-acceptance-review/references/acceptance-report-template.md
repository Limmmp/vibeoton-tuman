# Acceptance Report Template

Use this structure unless the user requests another format.

## 1. Verdict

- Verdict: `ACCEPT`, `ACCEPT WITH MINOR ISSUES`, `REJECT`, or `BLOCKED`.
- Scope reviewed.
- Short reason for the verdict.

## 2. Inputs and Limitations

List:

- Design sources.
- Requirement sources.
- Implementation target.
- Tested build/commit or working-tree fingerprint and verification time.
- Routes and states tested.
- Viewports and browsers tested.
- Missing or inaccessible evidence.

## 3. Requirements Matrix

| ID | Requirement | Source | Scope | Type | Status | Severity | Confidence | Evidence | Recheck |
|---|---|---|---|---|---|---|---|---|---|

Keep evidence concise and point to the detailed finding where necessary.

## 4. Findings

Order findings by severity, then confidence.

### `[P1] Short finding title`

- Requirement/design reference:
- Expected:
- Actual:
- Reproduction:
- Evidence:
- Confidence:
- Recommended correction:
- Likely owner/file:
- Recheck criterion:

## 5. Visual Fidelity

Summarize:

- Information architecture and first viewport.
- Layout and spacing.
- Typography and color.
- Media and surfaces.
- Component and state fidelity.

## 6. Responsive Behavior

Report each tested viewport and any overflow, clipping, overlap, reordering, touch-target, navigation, or readability problems.

## 7. Functional Behavior

Report navigation, forms, controls, validation, state transitions, keyboard interaction, and motion.

## 8. Technical Evidence

Include:

- Build/typecheck/test results.
- Console errors.
- Failed network/media requests.
- Accessibility or performance observations material to acceptance.

## 9. Fix Order

List the smallest ordered set of changes needed to reach acceptance.

## 10. Decision

State:

- What blocks acceptance.
- What may ship as a minor known issue.
- What could not be tested.
- Whether a re-audit is required.

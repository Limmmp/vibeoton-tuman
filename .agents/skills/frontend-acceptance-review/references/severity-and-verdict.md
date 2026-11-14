# Severity and Verdict

## Severity

### P0 - Critical

- Page or required route does not load.
- Core data is lost or exposed.
- Critical user flow cannot be completed.
- Runtime failure blocks meaningful review.

### P1 - High

- Explicit key requirement is missing.
- Primary CTA or required interaction is broken.
- Major design structure or first viewport is materially wrong.
- Mobile experience is unusable.
- Serious accessibility issue blocks the core flow.

### P2 - Medium

- Noticeable visual fidelity mismatch.
- Secondary interaction or state is incomplete.
- Responsive issue affects a subset of widths.
- Broken non-primary asset or meaningful content inconsistency.

### P3 - Low

- Minor polish, spacing, copy, or consistency issue.
- Small visual difference with no meaningful usability impact.
- Non-blocking improvement.

## Confidence

- `HIGH`: directly reproduced or measured.
- `MEDIUM`: strong evidence with one limitation.
- `LOW`: inferred from incomplete evidence; do not use as a release blocker without confirmation.

## Verdict Rules

### ACCEPT

- No unresolved P0, P1, or material P2 findings.
- All acceptance-critical requirements are `PASS`.
- Remaining observations are optional.

### ACCEPT WITH MINOR ISSUES

- No unresolved P0 or P1 findings.
- Only bounded non-critical P2/P3 findings remain.
- Core flows, responsive behavior, and design intent are intact.
- Any accepted risk names who accepted it and where that decision is recorded; an agent recommendation alone is not accepted risk.

### REJECT

- Any unresolved P0 or P1 exists.
- Multiple material P2 findings collectively break the approved experience.
- Acceptance-critical requirements are `FAIL` or `PARTIAL`.
- A set of material P2 findings may collectively require rejection even when no single P1 exists.

### BLOCKED

- The implementation cannot be run or accessed.
- Required credentials, environments, routes, or evidence are unavailable.
- Source conflicts prevent a defensible expected result.
- Too much of the acceptance scope is `NOT TESTABLE`.

## Rules

- A passing build never overrides P0/P1 acceptance failures.
- A strong visual match never overrides broken required behavior.
- A functional page never overrides a material mismatch to an explicitly approved design.
- Do not lower severity because a fix appears easy.
- Do not raise severity based only on personal taste.
- Keep check status, severity, confidence, and verdict separate. Missing evidence is not `PASS`, and low confidence does not imply low impact.

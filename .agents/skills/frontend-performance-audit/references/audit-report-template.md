# Performance Audit Report Template

Use a compact report for a focused question and expand only for a full or release-sensitive audit.

## Compact Report

1. Target build, route/state, environment, run method/count, and limitations.
2. Performance-scope verdict.
3. Measured metrics or inspected signals with source and benchmark provenance.
4. Prioritized findings and recheck criteria.
5. Unknowns and next action.

## Full Report Additions

- route/device coverage;
- field versus lab comparison;
- Core Web Vitals diagnosis;
- bundle/dependency findings;
- media/font findings;
- runtime/animation/scroll findings;
- caching/delivery observations;
- explicit and recommended budget status;
- implementation backlog.

## Metric Table

| Metric | Result | Assessment | Target/source | Evidence type | Scope/profile | Notes |
| --- | ---: | --- | --- | --- | --- | --- |

Use `UNKNOWN` when evidence is unavailable. Do not report Lighthouse TBT as field INP.

## Finding Shape

| ID | Route/state | Expected/source | Actual | Evidence | Check status | Severity | Confidence | User impact | Next action | Recheck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Label each target as project requirement, agreed release gate, external benchmark, or skill recommendation. Recommended payload budgets may indicate risk or an optimization opportunity but do not alone prove a requirement failure or release blocker.

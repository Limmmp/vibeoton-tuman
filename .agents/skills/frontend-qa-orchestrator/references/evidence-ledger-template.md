# Evidence Ledger Template

## Build Identity

- Build/commit or working-tree fingerprint:
- Verification time:
- Environment:

## Gate Evidence

| Source finding ID | Gate | Route/state | Action | Evidence | Check status | Severity | Confidence | Freshness | Owner/recheck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Use `PASS`, `FAIL`, `NOT RUN`, `BLOCKED`, or `NOT APPLICABLE` for check status. Keep severity and confidence separate. Record command output, screenshot/video, browser action, console/network result, DOM/measurement, specialist report section, or exact blocked reason.

## Reuse Rules

Evidence is reusable only when the verified build, route/scope, state, environment, and material conditions match the current question. Mark evidence `STALE` and rerun the affected check when they differ. Link specialist finding IDs rather than copying full domain reports. Merge duplicate root causes while retaining distinct impact and evidence.

An absent result is not `PASS`. Accepted risk must name the decision owner and source.

# Accessibility Audit Report Template

Use the compact shape for a focused audit. Expand only for a full WCAG or release-sensitive review.

## Compact Report

1. Scope, target build, environment, routes/states, WCAG level, and limitations.
2. Practical verdict for tested flows.
3. Findings with evidence and recheck criteria.
4. Explicit `NOT RUN` / `BLOCKED` layers and next action.

## Full Report Additions

- WCAG coverage by applicable criterion and level.
- Keyboard/focus coverage.
- DOM/AX semantics coverage.
- Forms and complete processes.
- Visual accessibility, resize, reflow, spacing, contrast, targets, and motion.
- Automated findings and manual confirmation status.
- Actual assistive-technology runs, if performed.
- Prioritized fix backlog and re-audit scope.

## Environment Fields

Record target build/commit or working-tree fingerprint, time, route/state/action, browser/version, OS, viewport, zoom, theme, input method, role/credentials, automated tools, and assistive technology/version when used.

## Finding Shape

| ID | Scope | Expected/source | Actual | Evidence/type | Check status | Severity | Confidence | Affected users | Next action | Recheck |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Evidence Separation

- DOM/AX evidence: name, role, value, state, structure.
- Keyboard evidence: keys and focus behavior.
- Automated evidence: tool result plus manual disposition.
- Visual evidence: measurement and observed rendering.
- AT evidence: named screen reader, browser, versions, OS, action, and actual announcement/reading result.

Without an AT run, label screen-reader behavior `NOT TESTED`; do not merge “accessibility tree inspected” with “screen reader tested.” Use `UNKNOWN` or `NOT RUN` for missing evidence rather than inventing conformance.

# Severity and Verdict

Severity describes user impact if a finding is valid. Confidence describes evidence strength. Check status describes execution. Keep them separate.

## Severity

- `P0`: safety risk, data loss/exposure, or a critical task is broadly impossible.
- `P1`: a major barrier blocks or seriously impairs an important flow, such as an unreachable primary action, keyboard trap, missing critical label, broken focus management, or inaccessible error recovery.
- `P2`: material barrier with a workaround or limited scope, including secondary target/contrast/structure/status issues.
- `P3`: low-impact polish, maintainability, or test-coverage improvement.

Do not lower severity because confidence is low or the fix looks easy. Do not raise it merely because a preferred AAA recommendation is unmet during an AA audit.

## Check Status

Use `PASS`, `FAIL`, `NOT RUN`, `BLOCKED`, or `NOT APPLICABLE`. `PASS` requires suitable evidence for the specific check. A green automated score cannot convert manual or AT checks to `PASS`.

## Confidence

- `HIGH`: directly reproduced or confirmed by appropriate independent evidence.
- `MEDIUM`: strong source/DOM/tool evidence with a stated limitation.
- `LOW`: plausible and actionable only as a validation target, not an established fact.

## Practical Verdict

- `PASS`: tested critical flows have suitable evidence and no unresolved material barriers for the stated scope.
- `RISK`: incomplete evidence or unresolved non-blocking barriers materially limit confidence.
- `FAIL`: unresolved barriers block or seriously degrade the tested critical scope.
- `BLOCKED`: a required audit conclusion cannot be supported because the target, access, states, or necessary test environment is unavailable.

This is a practical scope verdict, not product-wide WCAG conformance, legal certification, design acceptance, or release approval. List every unresolved finding even when the overall tested flow is usable.

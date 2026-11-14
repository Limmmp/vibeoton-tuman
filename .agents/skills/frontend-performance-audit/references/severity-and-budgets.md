# Severity, Budgets, and Verdict

Keep check status, metric assessment, severity, confidence, budget provenance, and release verdict separate.

## Severity

- `P0`: performance makes a critical route unusable, blank, crashed, or unsafe for core data/action.
- `P1`: repeatable evidence shows major harm to an important user flow or an explicit release requirement.
- `P2`: material but non-blocking delay, instability, payload, or runtime risk with bounded impact.
- `P3`: monitoring, maintenance, or low-impact optimization.

Crossing a “good” metric threshold does not automatically establish P1. Justify severity with route importance, magnitude, repeatability, affected users, explicit requirements, and evidence of impact.

## Budget Provenance

Every budget or target must be labeled:

1. `PROJECT REQUIREMENT`: explicitly supplied by the project/user.
2. `AGREED RELEASE GATE`: accepted as a release criterion with owner/reference.
3. `EXTERNAL BENCHMARK`: for example, current Core Web Vitals classification.
4. `SKILL RECOMMENDATION`: a diagnostic starting point, not a requirement.

Recommended starting points when a project has no payload budget:

| Context | Initial JS transfer | Initial CSS transfer |
| --- | ---: | ---: |
| Static/content/marketing | <= 170 KB | <= 60 KB |
| Interactive app/dashboard | <= 250 KB | <= 80 KB |
| Motion-heavy/3D | Define per route | Define per route |

Transfer size is not parse/execute cost, and a larger justified payload can remain responsive. Exceeding a recommendation should be reported as a recommendation or risk, never as an invented requirement failure.

## Metric and Release Language

Use `GOOD`, `NEEDS IMPROVEMENT`, `POOR`, or `UNKNOWN` for metric assessment when supported by the chosen benchmark. Use `PASS`, `RISK`, `FAIL`, or `BLOCKED` for the performance-scope verdict. A release recommendation belongs to QA and must consider explicit gates and other domains.

`PASS` requires suitable evidence for the inspected scope; `UNKNOWN` or an unavailable measurement is not a pass. Accepted risk requires a named decision owner or source—the agent may recommend acceptance but cannot claim it already exists.

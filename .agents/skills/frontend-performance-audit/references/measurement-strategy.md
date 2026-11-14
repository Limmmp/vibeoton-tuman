# Measurement Strategy

## Evidence Order

1. Field data for real-user experience.
2. Comparable lab runs for diagnosis and reproduction.
3. Build artifacts and source inspection for likely causes.
4. Visual/browser evidence for blank states, layout shifts, and jank.

## Lab Contract

Record target build/commit or working-tree fingerprint, route/state, production or development mode, browser/version, viewport/device profile, network and CPU throttling, cache state, location assumptions, run count, aggregation method, and time. Prefer production build/preview. Do not present dev-server timing as production performance.

For before/after comparisons, keep conditions equivalent and use multiple runs when variability can change the conclusion. Report the distribution or aggregation rather than selecting the best run. A narrow code change does not require a full expensive benchmark when a focused comparable check addresses its risk.

## Field Contract

Record URL or origin scope, collection period, device cohort, percentile, geography/segment when material, sample availability, and whether data predates the tested release. Field aggregates can hide route-specific regressions or lag deployments.

## Field Versus Lab

Report both when available. Explain disagreement through route mix, sample date, device mix, geography, cache, experiments, or environment. Lab evidence diagnoses; it does not replace field INP. TBT and long tasks are proxies for interactivity risk, not measured INP.

## Minimum Coverage

For a focused audit, inspect the requested route/device and the evidence needed for the question. For a release-oriented full audit, cover key route types, mobile and desktop, relevant cold/warm states, interaction risk, build artifacts, media/fonts, and runtime behavior. A fast broken or empty page is not a passing measurement.

Use evidence labels `FIELD`, `LAB`, `BUILD`, `SOURCE`, and `VISUAL` in findings.

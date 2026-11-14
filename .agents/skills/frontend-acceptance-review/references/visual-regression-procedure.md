# Reproducible Visual Regression

Use screenshot comparison when visual fidelity or layout regression is material and a stable reference exists. Do not run it automatically for copy-only or pure-logic changes.

## Capture Contract

Record:

- tested build/commit or working-tree fingerprint;
- browser/version, viewport, device scale factor, OS, theme, locale, and relevant font environment;
- route, auth role, content fixture, data state, time/randomness controls, and feature flags;
- readiness conditions for fonts, critical media, and the exact UI state.

Wait for observable readiness signals rather than an arbitrary long sleep. Disable or stabilize animations for image comparison, then test actual motion separately.

## Artifacts

Keep the approved reference or technical baseline, actual screenshot, diff artifact, threshold, and capture metadata together. Mask only genuinely non-deterministic regions and explain each mask. Never hide layout movement or silently regenerate a baseline to make a failure green.

Calibrate the diff threshold to the environment; do not promise pixel-identical output across different operating systems, font renderers, browsers, or device scales.

An approved design reference answers whether the implementation matches the intended design. A technical baseline detects change from an earlier build and may preserve an old defect. State which comparison is being made.

## Acceptance

A controlled unchanged build should compare stably, and an intentional layout shift in the fixture should be detected. A static screenshot does not prove focus, interaction, animation, or reduced-motion behavior.

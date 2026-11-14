# Core Web Vitals

Current Core Web Vitals focus on loading, interactivity, and visual stability. Verify current official guidance when a user asks for latest thresholds.

## Targets

Use the 75th percentile, segmented across mobile and desktop when field data exists:

| Metric | Good target | Measures |
|---|---:|---|
| LCP | <= 2.5s | Loading performance |
| INP | <= 200ms | Interaction responsiveness |
| CLS | <= 0.1 | Visual stability |

Supporting metrics:

- FCP helps diagnose when first content appears.
- TTFB helps diagnose server or document response delay.
- TBT is a lab proxy for interactivity risk, especially when INP field data is unavailable.

## LCP Diagnosis

Identify:

- LCP element;
- server/document delay;
- render-blocking resources;
- image request discovery time;
- resource load duration;
- element render delay.

Common causes:

- late-discovered hero image;
- client-rendered hero content;
- oversized or unoptimized image;
- missing preload/fetch priority for the LCP asset;
- slow server response;
- render-blocking CSS or fonts;
- heavy JavaScript delaying paint.

Do not lazy-load an above-the-fold LCP image.

## INP Diagnosis

Use field/RUM data when possible. Lighthouse does not directly measure INP because it does not exercise real user input in the same way field measurement does.

When INP is unavailable, use:

- TBT;
- long tasks;
- interaction traces;
- expensive event handlers;
- hydration cost;
- repeated renders;
- third-party main-thread work.

Common causes:

- large JS bundles;
- heavy hydration;
- synchronous event handlers;
- expensive state updates;
- layout thrashing;
- CPU-heavy animation or canvas work;
- third-party scripts.

## CLS Diagnosis

Identify shift sources:

- images/video/iframes without reserved dimensions;
- late fonts or fallback mismatch;
- injected banners, ads, embeds, cookie notices;
- skeletons that do not match final dimensions;
- client-loaded content above existing content;
- sticky/header changes during load.

Report the element that moved and the element that caused the shift when evidence allows.

## Lab and Field Interpretation

- Passing lab results do not prove field performance.
- Failing lab results are useful evidence of risk, especially on mobile.
- Passing field data can hide poor performance on important but low-traffic routes.
- Field data can be stale after a recent deployment.

## Reporting Rule

Use `UNKNOWN` instead of guessing. If INP, LCP, or CLS cannot be measured, explain what evidence is missing and which proxy was used.

Classifying a metric against the current benchmark is separate from assigning issue severity or a release verdict. Record the benchmark source and justify priority using route importance, magnitude, variability, user impact, and explicit project requirements.

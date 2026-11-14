# Automated Accessibility Tools

## Role

Automated tools are useful for fast detection, but they do not prove accessibility. They commonly miss keyboard flows, focus management, reading order quality, text alternatives quality, screen-reader announcements, custom widget behavior, cognitive accessibility, and complete process issues.

## Useful Tools

- axe or axe-core integrations;
- Lighthouse accessibility audit;
- browser accessibility tree inspection;
- framework lint rules;
- HTML validators;
- contrast analyzers;
- Playwright accessibility-oriented checks where available.

## Interpreting Results

Classify each automated finding:

- `confirmed`: reproduced and materially affects users;
- `false positive`: tool reports an issue that does not apply in context;
- `needs manual check`: requires keyboard, DOM, visual, or assistive-technology validation;
- `not reproducible`: could not be reproduced in the tested state.

## Common Automated Gaps

- focus order that is technically reachable but illogical;
- invisible focus indicators;
- dialog focus traps;
- keyboard activation behavior;
- screen-reader announcement timing;
- poor alt text quality;
- visually hidden content that is confusing but technically present;
- touch target spacing;
- motion and vestibular concerns;
- form error clarity.

## Reporting Rule

Do not paste raw tool output as the audit. Summarize findings by user impact and tie each material item to evidence and next action.

An automated `PASS` applies only to the rules the tool actually executed in the inspected state. It cannot mark keyboard, visual, complete-process, or assistive-technology checks as passed.

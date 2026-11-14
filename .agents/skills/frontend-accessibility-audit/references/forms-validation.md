# Forms and Validation

## Labels and Instructions

Check:

- each input has a programmatic label;
- visible labels are associated with controls;
- required fields are indicated accessibly;
- helper text is associated with controls;
- placeholders are not the only label;
- groups use `fieldset`/`legend` or equivalent semantics;
- input purpose and autocomplete are correct when applicable.

## Validation

Check:

- errors are identified in text;
- error messages are associated with fields;
- suggestions explain how to fix the issue;
- focus moves to or announces errors after submit;
- inline validation does not create disruptive focus jumps;
- errors are not conveyed by color alone;
- success and status messages are announced where needed.

## Complex Inputs

Check date pickers, comboboxes, sliders, file uploads, rich text editors, payment fields, OTP inputs, and address forms for keyboard support, name/role/value, instructions, and fallback paths.

## Authentication and Sensitive Data

Check:

- accessible authentication without forcing cognitive function tests when possible;
- password managers and paste are not blocked without strong reason;
- redundant entry is avoided;
- irreversible or sensitive submissions have confirmation, review, or correction paths.

## Evidence Pattern

For each form issue include:

- field or form name;
- state;
- action;
- expected programmatic relationship;
- actual behavior;
- WCAG relevance;
- recommended fix.

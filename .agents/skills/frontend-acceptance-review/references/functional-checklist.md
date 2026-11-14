# Functional Checklist

Test only behavior relevant to the supplied scope, but exercise real user flows rather than inspecting handlers alone.

## Navigation

- Links point to the expected route or anchor.
- Active states are correct.
- Back/forward behavior is not broken.
- Menus and mobile navigation open and close correctly.

## Controls

- Buttons perform the stated action.
- Tabs, accordions, filters, sort, pagination, sliders, toggles, and selectors update correctly.
- Dialogs, drawers, popovers, and tooltips open, dismiss, and restore focus.

## Forms

- Required fields and formats are enforced.
- Error messages are visible, specific, and associated with fields.
- Success, submitting, disabled, and failure states work.
- Keyboard submission and focus order are usable.

## Data and States

- Loading, empty, error, offline, and success states exist when required.
- Dynamic values do not cause layout shifts or overflow.
- Authentication or role-specific states are checked when credentials are available.
- An older search/filter response cannot overwrite a newer result; cancellation or obsolete-result handling follows the framework.
- Pending/submitting state prevents accidental duplicate actions, while server-side idempotency is verified separately when required.
- Failed submissions preserve entered data and offer an appropriate retry.
- Optimistic rollback restores the failed change without erasing a newer successful action.
- URL-backed filters, search, sort, and pagination survive refresh and behave with back/forward when required.
- Cache invalidation, timers, subscriptions, observers, and async cleanup are checked for the affected behavior.
- Dates, currency, time zones, long translations, and RTL are checked only when part of the product contract.

## Motion and Scroll

- Required animations run at the correct trigger and sequence.
- Repeated entry does not duplicate listeners or animation instances.
- ScrollTrigger, sticky, pinning, and parallax release correctly.
- Reduced-motion fallback preserves access to content.

## Runtime Evidence

- No material console errors.
- No failed required network, font, image, video, or API requests.
- No blank, hydration-failed, or crashed states.
- Build and tests pass when available.

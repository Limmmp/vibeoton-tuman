# UI Patterns

Use these patterns to shape Web/UI briefs.

## Navigation Models

- Top nav: good for classic marketing and simple sites.
- Sidebar: good for apps, dashboards, and tools.
- Command dock: good for dense interactive tools.
- Index wall: good for portfolios, catalogs, and archives.
- Stepper: good for onboarding, booking, checkout, or configuration.
- Contextual tabs: good for dashboards, product views, and detail pages.

## First Viewport Patterns

- Product in use: show the app/tool/product state immediately.
- Configurator first: start with the main selection or customization interaction.
- Archive wall: show a dense set of work/products/content as the opening.
- Control desk: open with metrics, filters, or operational controls.
- Editorial lead: start with a strong story frame and evidence preview.
- Comparison table first: useful for decision-heavy B2B or ecommerce.
- Checkout confidence first: useful when the buying decision depends on delivery, returns, stock, and price clarity.
- Workbench first: useful for tools where the user should immediately understand what can be made, edited, inspected, or exported.

## Components by Product Type

SaaS/dashboard:

- Sidebar or topbar, filters, metrics, charts, tables, status chips, command buttons, empty/loading/error states.
- Use status summaries, saved views, sortable tables, detail drawers, and clear disabled/permission states when the product is operational.

Landing/service:

- Proof blocks, process steps, service cards, booking/contact flow, testimonials only when specific, FAQ, trust markers.

Portfolio:

- Project index, case study cards, media viewer, filters, project detail pages, contact surface.
- Let the index, media viewer, or case-study detail carry identity. Avoid making the first viewport only a self-description.

Ecommerce:

- Product gallery, variant selector, price block, filters, comparison, cart, checkout states, stock/delivery info.
- Include trust, returns, delivery, availability, comparison, review, and mobile add-to-cart states where relevant.

Tool UI:

- Work surface, toolbar, inspector panel, history/undo, settings, preview, save/export controls.
- Put the workspace, editor, configurator, or result preview before marketing explanations.

Web app:

- App shell, primary route/screen, contextual navigation, form/workflow states, permissions, settings, notifications, and recovery paths.

## State Coverage

Always include states relevant to the product:

- Empty.
- Loading.
- Error.
- Success.
- Disabled.
- Focus.
- Hover.
- Selected/active.
- Mobile collapsed.
- Long-content overflow.

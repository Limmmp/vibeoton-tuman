# HTML CSS JS Implementation

Use when the user asks for plain HTML/CSS/JS, the design is mostly static, or the project should be framework-free.

## File Shape

```txt
index.html
styles.css
script.js
assets/
  images/
  video/
```

For larger static sites:

```txt
pages/
styles/
scripts/
assets/
```

## Implementation Notes

- Use semantic HTML sections and landmarks.
- Put design tokens in `:root`.
- Use CSS Grid and Flexbox before JavaScript-driven layout.
- Use CSS transitions for simple hover/reveal effects.
- Use JavaScript only for stateful interactions: menus, tabs, filters, sliders, dialogs, form behavior.
- Use progressive enhancement: the page should still show core content if JavaScript fails.
- Remove dead links, fake buttons, and default scaffold copy before final verification.
- Keep asset paths local and verify that every referenced image, font, script, and stylesheet loads.

## Verification

- Open via local server when modules, fetch, routing, or asset paths require it.
- Check desktop and mobile widths.
- Check browser console for JavaScript errors.
- Verify all local assets load.

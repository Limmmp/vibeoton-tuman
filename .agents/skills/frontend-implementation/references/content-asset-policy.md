# Content and Asset Policy

Use this reference when implementing copy, media, icons, sample data, or temporary visual stand-ins.

## Content Rules

- Replace starter copy and default scaffold text.
- Do not leave lorem ipsum, `Feature 1`, `Card title`, `Read more`, `#`, or empty links unless they are intentional demo content.
- Repeated content belongs in data/config files when it appears more than twice.
- Copy should match the product scenario and primary action from the brief or plan.
- Buttons and controls must perform a visible action, navigate somewhere valid, or be clearly disabled with a reason.

## Asset Rules

- Use supplied assets first.
- If assets are missing, use a scoped stand-in that supports the design: CSS composition, generated visual, product-style mock surface, diagram, or clearly named local placeholder. Gradients are allowed when they fit the brand or supplied direction.
- Do not use broken external URLs or unverified hotlinks.
- Give images and media stable dimensions, aspect ratios, and alt text where applicable.
- Keep videos, canvas, WebGL, and large media lightweight unless the design requires them.

## Sample Data Rules

- Sample dashboards and tools must show realistic states: empty, loading, error, success, selected, disabled, and long-content cases where relevant.
- Ecommerce samples must include product names, variants, price/trust/delivery cues, cart feedback, and mobile purchase states when relevant.
- Portfolio/editorial samples must include inspectable work/media context, not generic image blocks.

## Final Response

Call out intentional placeholders only when they are visible product/content stand-ins the user may want to replace. Never hide unfinished implementation behind the word "placeholder".

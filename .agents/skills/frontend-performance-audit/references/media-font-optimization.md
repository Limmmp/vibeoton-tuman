# Media and Font Optimization

## Images

Check:

- format: AVIF/WebP where appropriate, with fallbacks when needed;
- intrinsic dimensions and rendered dimensions;
- responsive `srcset`/`sizes`;
- compression quality;
- lazy loading only below the fold;
- preload or priority for the LCP image;
- reserved width/height or aspect ratio;
- background images used for meaningful content;
- duplicated large assets;
- unbounded CMS/user-uploaded images.

Common fixes:

- resize to display needs;
- convert format;
- add responsive sources;
- reserve layout space;
- avoid lazy-loading the hero/LCP image;
- move decorative images out of the critical path.

## Video

Check:

- poster image;
- autoplay policy and mute behavior;
- preload strategy;
- codec and file size;
- mobile fallback;
- lazy mounting below the fold;
- whether the first viewport needs video at all.

Video backgrounds must not block the first meaningful content.

## Fonts

Check:

- number of families, weights, and subsets;
- `font-display`;
- preload for critical font files;
- preconnect for remote font providers;
- fallback metric compatibility;
- FOIT/FOUT behavior;
- CLS caused by font swap;
- unused weights/styles.

Common fixes:

- reduce weights;
- subset fonts;
- self-host when useful;
- use system fonts for non-brand UI;
- set fallback metrics;
- avoid render-blocking font CSS.

## Render-Blocking Resources

Identify critical CSS, remote CSS, font CSS, script ordering, and blocking third-party resources. Record whether each resource blocks first paint, LCP discovery, or interactivity.

## Reporting Pattern

For each media/font finding:

- asset or declaration;
- route and viewport;
- transfer or dimension evidence;
- visible impact;
- recommended fix;
- verification method.

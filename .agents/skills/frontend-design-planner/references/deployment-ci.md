# Deployment and CI

Use this reference when the project is expected to be deployed, shared, or production-ready.

## Hosting Fit

| Target | Fit |
| --- | --- |
| Static hosting | HTML/CSS/JS, Vite static builds, Astro static sites |
| Vercel | Next.js, React apps, Astro/SvelteKit with adapters, preview-heavy workflows |
| Netlify | Static sites, Astro, Vite, SvelteKit, form/content workflows |
| Render | Node-backed apps, SSR services, dashboards with backend services |
| Cloudflare Pages/Workers | Static/edge-focused apps, Astro/SvelteKit/React with compatible adapters |
| GitHub Pages | simple static sites and portfolios without server needs |

## CI Checks

For production-oriented plans include:

- install;
- lint;
- typecheck;
- test;
- build;
- optional Playwright smoke;
- optional accessibility/performance audit job;
- artifact or preview deployment.

## Environment and Secrets

Plan:

- required environment variables;
- public versus server-only variables;
- preview/staging/production differences;
- local `.env.example`;
- secret ownership and rotation if relevant.

Do not ask the implementation step to invent credentials.

## Preview Deploys

Use preview deploys when:

- visual review matters;
- stakeholders need route access;
- Figma/design QA depends on a stable URL;
- performance/accessibility audits should run against production-like output.

## Release Gates

Name gates that matter:

- build passes;
- critical route smoke tests pass;
- no blocking console/network errors;
- performance/accessibility audits pass or have accepted known issues;
- metadata/SEO checks pass for public pages;
- rollback path is clear for production changes.

## Output Pattern

Include the hosting target, build command, CI checks, preview strategy, env vars, and release gates only to the depth justified by the project.

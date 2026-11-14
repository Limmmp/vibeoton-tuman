# Web Workflow Routing

Choose the capability needed to produce the user's requested deliverable. A route is a responsibility boundary, not a requirement to create a separate task, agent, or approval checkpoint.

## Intent Matrix

| User intent | Primary capability | Expected result |
| --- | --- | --- |
| Understand an existing site, screenshot, Figma artifact, or codebase | `web-ui-reverse-engineer` | Evidence-aware analysis |
| Create UX, IA, or visual direction | `web-ui-designer` | Web/UI design brief |
| Choose stack, files, state, phases, and verification | `frontend-design-planner` | Technical plan |
| Build, recreate, finish, debug, or apply concrete fixes | `frontend-implementation` | Working code/change |
| Review component boundaries or perform a scoped refactor | `frontend-code-architecture` | Review, guardrails, or refactor |
| Quick smoke or coordinated release QA | `frontend-qa-orchestrator` | Evidence ledger and verdict |
| Verify against design, requirements, or acceptance criteria | `frontend-acceptance-review` | Acceptance verdict |
| Diagnose performance or accessibility | Matching specialist audit | Domain findings |
| Produce a generator prompt | `website-master-prompts` | Copy-ready prompt |

## Deliverable Rules

- “Build/create/recreate the site” authorizes the minimum design and planning necessary to implement it in the same workflow. Do not stop at a brief because an approval label is absent.
- “Plan only” returns a plan and does not edit source files.
- “Audit/check only” reports evidence without changing code.
- “Audit/check and fix” permits baseline capture, fixes, and relevant rechecks without asking again.
- A narrow bug or spacing fix starts with reproduction and the affected code path, not a new full design brief.
- A focused redesign can inspect only the affected artifact; full reverse engineering is for broad reconstruction, system extraction, or when unseen context materially affects the result.
- Preserve the existing framework, package manager, styling, and component conventions unless migration is requested.

## Composite Requests

Sequence only the stages needed for the final result. Examples:

- analyze + redesign: inspect the relevant current surface, then design;
- design + build: make the minimum design decisions, plan enough to code, then implement and verify;
- findings + fixes: implement concrete findings, then recheck them;
- quick release check: run proportionate smoke and reuse valid specialist evidence;
- prompt only: create the prompt without producing full upstream artifacts unless missing decisions require a compact internal pass.

## Ambiguity

Make reversible assumptions for non-material gaps. Ask one concrete question only when a missing choice materially changes product behavior or scope, while continuing independent work. Do not activate every neighboring skill merely because it is available.

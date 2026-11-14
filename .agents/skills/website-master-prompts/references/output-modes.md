# Output Modes

Use one primary mode per response. Secondary modes may shape constraints but should not change the output contract.

## Mode Selection

| Mode | Use when | Prompt must preserve |
| --- | --- | --- |
| `concept-to-prompt` | The user has only an idea, niche, product, or vague direction | A concrete concept, audience, primary action, stack, IA, and visual system chosen inside the prompt |
| `design-brief-to-prompt` | The user provides or references a `web-ui-designer` brief | Brief mode, IA, first viewport, visual system, components, states, motion, responsive behavior, accessibility constraints |
| `reverse-engineered-to-prompt` | The user wants a prompt based on an analyzed site, screenshot, Figma frame, or codebase | Evidence-backed components, tokens, layout grammar, unknowns, and preserve/avoid guidance |
| `plan-to-prompt` | The user has an approved `frontend-design-planner` output | Stack, dependencies, file structure, component plan, state/data expectations, tests, deployment constraints |
| `prompt-review-rewrite` | The user provides prompts and asks for analysis, improvement, or a better replacement | Useful specificity from supplied prompts while changing generic structure and weak areas |
| `variant-pack` | The user asks for options, alternatives, or another version | 2-3 distinct site grammars, first viewports, IA patterns, motion models, and visual systems |

## Mode Rules

- For `concept-to-prompt`, choose a concrete business/product if the user leaves it open.
- For `design-brief-to-prompt`, do not redesign the brief; translate it into generator instructions.
- For `reverse-engineered-to-prompt`, do not turn `UNKNOWN` evidence into exact requirements.
- For `plan-to-prompt`, do not change the approved stack or file structure unless the user asks.
- For `prompt-review-rewrite`, keep critique short and make the replacement prompt the main output.
- For `variant-pack`, each variant must differ in structure, not only topic or color.

## Mode Header

Every substantial prompt should begin with:

```text
Prompt mode: concept-to-prompt
Generator target: code agent
Source handoff: fresh concept
Non-goals: no local implementation in this response
```

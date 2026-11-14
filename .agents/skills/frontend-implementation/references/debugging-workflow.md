# Focused Debugging Workflow

Use this for a defect, regression, or narrow broken behavior. A bug report does not require an approved design brief.

1. Define the symptom, expected behavior, route/state, and reproduction conditions.
2. Reproduce the smallest failure. If reproduction is unavailable, state the missing condition and continue with source or test evidence that remains possible.
3. Trace the relevant event, data, async, and render path. Separate the root cause from the visual symptom.
4. Choose the smallest correction consistent with the current architecture. Do not introduce a library, redesign, or broad refactor as the default response.
5. Add a regression test when it can observe the real behavior and the risk justifies it. A low-risk spacing fix can use a focused visual check instead.
6. Repeat the original reproduction and check related behavior that the fix could affect.
7. Report the cause, changed files, executed checks, results, and any remaining uncertainty.

Do not claim the issue fixed when the original symptom could not be reproduced or otherwise verified.

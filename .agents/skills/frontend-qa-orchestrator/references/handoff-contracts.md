# Handoff Contracts

## To Implementation or Architecture

Send finding ID, severity, confidence, route/viewport/state, expected source, actual result, evidence, reproduction, constraints, likely owner area, and exact recheck criterion. Do not send “polish QA issues.”

If fixes are already part of the user's request, continue the fix loop without requesting a second authorization. For audit-only work, hand off as a recommendation and do not edit code.

## To Specialist Gates

Pass the target build identity, routes/flows/states, environment, risk, source artifacts, existing evidence IDs, known blockers, and the question the gate must answer. Do not ask the specialist to repeat valid evidence or treat an automated score as a full accessibility/performance verdict.

## Recheck

After fixes, rerun the failed check, affected responsive/state variants, console/network where relevant, and regression smoke for touched primary flows. Broaden the pass only when shared code or risk changed.

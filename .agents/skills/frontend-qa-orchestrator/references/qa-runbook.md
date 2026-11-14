# QA Runbook

## Quick Smoke

Check the available build/start path, requested routes and primary action, console/network, critical assets, and the changed responsive surface. Return a compact verdict, evidence, findings, limitations, and next action.

## Release Coordination

1. Establish build identity, scope, sources, risk, and required gates.
2. Run smoke where it enables later gates.
3. Reuse fresh specialist evidence; run only missing, stale, or newly material checks.
4. Consolidate source finding IDs without rewriting full specialist reports.
5. Issue a verdict from selected-gate results and unresolved acceptance-critical findings.

If one route is locally blocked, diagnose it when requested and continue independent checks elsewhere. Do not mark the blocked route passed.

## Fix Loop

When fixes are requested:

1. Send concrete findings to `frontend-implementation`.
2. Re-run the exact failed checks.
3. Run regression smoke on affected routes/states.
4. Repeat a full specialist audit only when the fix changes shared infrastructure or risk.
5. Report resolved, remaining, new, and untested findings separately.

Check status, severity, confidence, and final verdict remain distinct throughout the loop.

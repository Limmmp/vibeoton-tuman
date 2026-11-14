# QA Intake

Record the requested QA mode and verdict, target build/commit or working-tree fingerprint, verification time, routes/flows/states, source artifacts and authority, environment, commands, browser/device/theme/locale/role, release risk, and available prior evidence.

Requirements define expected behavior; design artifacts define visual intent; the technical plan defines agreed stack and checks; the running build proves current behavior. Record conflicts rather than turning them into implementation failures.

Use `BLOCKED` only when missing access, credentials, target, environment, or evidence prevents a required conclusion. Continue independent checks on reachable routes or evidence. A blocker for one gate is not automatically a blocker for every gate.

Audit-only remains read-only. If the user requested fixes, that request authorizes the fix loop and rechecks; if not, end with findings and a recheck plan.

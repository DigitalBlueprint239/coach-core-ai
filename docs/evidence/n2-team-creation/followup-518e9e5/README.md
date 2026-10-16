# N2 follow-up app validation

Runtime: 518e9e5817abd2a0e1bf1308468928f238fa8533.
Commands run from work/main-n2-team-creation, PowerShell, Node22.23.1/npm10.9.8:

- `$env:CI='true'; npm test -- --watchAll=false --runInBand` -> 480 PASS, 37 suites. React test-library act deprecation warnings remain.
- `node node_modules/typescript/bin/tsc --noEmit` -> initial TS18047 (types.log), corrected explicit currentTeam guard -> exit0 (types-final.log, empty).
- `$env:CI='false'; $env:GENERATE_SOURCEMAP='false'; npm run build` -> PASS, exit0, with inherited SmartPlaybook warnings; see build.log.
- `npm test -- --watchAll=false --runInBand --runTestsByPath src/contexts/TeamContext.creation.test.tsx src/components/TeamManagement.creation.test.tsx` -> 10 PASS. before.log is NOT a frozen before measurement: app edits overlapped Jest startup. Do not use it as before/after proof.
- Attempted old-source check from work/main-n2-validation using copied *.followup.test.tsx and `--testNamePattern='REST-confirmed creation persists|same trimmed name requires'`: wrong old test fixtures copied; terminated only its two owned Node processes before completion. reproduction.log is INVALID SETUP, not a product result. No acceptance test was filtered or modified. No verified pre-fix dynamic measurement is claimed for this follow-up.

Reproduction scenario for selection regression: gateway returns an authoritative team, query listener delivers nothing; currentTeamId must equal returned ID. Cause was identified in source: REST result updated React state but only listener/switchTeam persisted storage. Unit regression now verifies storage independently of listener delivery.

All tests here are app/mocked implementation evidence, not independent browser acceptance. Claude owns R7/R7b/R8/R8b and full matrix. No new browser/staging/physical-device result is claimed. Earlier browser results belong to bdb06ae only. Original N2-A2 is obsolete-fault-model, retained unchanged.

Original raw logs remain outside repository. Text copies normalize line endings; manifest records both hashes. No dependency/config/auth/rules/harness changes. MVP NO-GO.

# CC-CODEX dependency repair (F-11)

2026-10-14. Separate branch `codex/coaching-dependency-repair`, stacked on the account-coaching client candidate. No framework upgrade, `--force`, deployment or live configuration/data changes. Rollback: revert the package/lock commit and reinstall the previous lockfile. No Firebase migration.

## Discover → Measure → Diagnose → Implement → Test → Compare → Document

Root production baseline: **10 findings** (3 critical, 5 high, 2 moderate). Full dependency graph: **107** (6 low, 16 moderate, 79 high, 6 critical). These are npm dependency classifications, not proof that every package is shipped in the browser. Do not equate zero production findings with security acceptance.

Targeted compatible lock updates reduced production findings to **4 high** (grpc-js and its Firebase metapackage chain). The existing parent constrained grpc-js to an older line. Added only `overrides.@grpc/grpc-js = 1.13.6` (same major), verified available with npm view; production findings become **0**. Full graph still **98** (6 low, 14 moderate, 75 high, 3 critical). Remaining development/build/test advisories are retained for review, not hidden.

First npm update failed with ERESOLVE: existing React19 / testing-library13 peer disagreement. Retried using the repository's existing legacy-peer-deps setting, not force. Direct framework versions/ranges are unchanged. The lock updates protobufjs, grpc-js, websocket-driver, tar, postcss, browserslist, nanoid, source-map-js, yaml and protobuf UTF8 transitive packages. Full audit JSON contains each advisory and path.

Commands (candidate root):

```powershell
npm audit --omit=dev --json
npm audit --json
npm update --package-lock-only --ignore-scripts protobufjs @grpc/grpc-js websocket-driver tar postcss browserslist nanoid source-map-js yaml @protobufjs/utf8
# Above failed ERESOLVE; preserved.
npm update --package-lock-only --ignore-scripts --legacy-peer-deps protobufjs @grpc/grpc-js websocket-driver tar postcss browserslist nanoid source-map-js yaml @protobufjs/utf8
npm view @grpc/grpc-js@1.13.6 version
# Add the one compatible override; retain framework ranges.
npm install --package-lock-only --legacy-peer-deps --ignore-scripts
npm install --legacy-peer-deps --ignore-scripts
npx tsc --noEmit
$env:CI='true'
npm test -- --watchAll=false --runInBand
$env:CI='false'
npm run build
```

Install/audit/build/test evidence and tested SHAs are in `docs/evidence/coaching-dependencies/`. Latest client repairs must be tested on this branch too; earlier 414/414 run predates D10 review repairs. No mocked test or production build establishes product acceptance. Claude independently reviews authorization, rules, REST create protocol and P10–P17.

Separate harness installations are unchanged: e2e package install reported 12 (5 moderate, 7 high), Functions development install reported 5 (1 moderate, 4 high). Those are not silently folded into root production zero or repaired here; no function-source/harness-source ownership change. Production Functions audit was not remeasured in this slice (**NOT MEASURED**).

Unresolved: all-graph advisories, old React/testing peer mismatch, existing lint/act warnings, security acceptance, browser/physical-device coverage beyond the recorded scenarios. MVP **NO-GO**; deployment remains unapproved.

## Measured resolved versions

| Package path | Before | After |
|---|---|---|
| node_modules/protobufjs | 7.5.3 | 7.6.6 |
| node_modules/@grpc/grpc-js | 1.9.15 | 1.13.6 |
| node_modules/websocket-driver | 0.7.4 | 0.7.5 |
| node_modules/tar | 7.4.3 | 7.5.22 |
| node_modules/postcss | 8.5.6 | 8.5.30 |
| node_modules/browserslist | 4.25.1 | 4.29.3 |
| node_modules/nanoid | 3.3.11 | 3.3.20 |
| node_modules/source-map-js | 1.2.1 | 1.2.2 |
| node_modules/yaml | 1.10.2 | 1.10.3 |
| node_modules/@protobufjs/utf8 | 1.1.0 | 1.1.2 |

## Final integrated validation

Draft PR60 dependency commit92d162c1cd81e2ad994d44ca2f3b881b88136e45; integrated application+lock source da8ebe1c90a877102e1913770690ff98a3530d3f, including clientff9b421. Final full suite **416/416 (26 suites)**; TypeScript **0**; production build **PASS** with retained existing warnings; emulator build **PASS**. Credential canary **12/12** on earlier source92d162c (same package lock; subsequent runtime change is legacy-null draft restoration). Browser runtime source5d04077a1db88c8ea24ec2ee6ea3cae96d780ac2 adds client evidence only; runtime-equivalence diff against da8ebe1 is empty. Browser results are attached after completion. e2e node_modules reuses the unchanged installed harness dependencies; root dependencies are separately installed from the repaired lock.

Unresolved full-graph critical dependency entries: **form-data3.0.0–3.0.4, proxy-addr1.1.0–2.0.7, shell-quote≤1.8.4**. See full JSON for paths and advisories. These remain review work; production audit0 is not a blanket security clearance.

Warning attribution: retained logs include pre-existing unused-variable/act warnings and the new Playbook hydration effect dependency warning. The effect is guarded by document-open identity and field equality; no looping was observed in the recorded browser cases. That is measured coverage, not proof for every path. Review/cleanup remains visible; no lint suppression was added.


Final browser source5d04077a1db88c8ea24ec2ee6ea3cae96d780ac2: **18/18 PASS** (9/engine;16UI+2explicit SDK-negative cases), Chromium156.0.8078.4/Firefox157.0; retries0. Application/lock equivalent to da8ebe1, full416/416,TS0,production and emulator buildsPASS. Does not erase earlier client failures or resolve independent Firefox stability/touch issues. All baseline/failure/audit/command/browser evidence is committed with hashes, not hidden. Independent Claude P10–P17/P13/security acceptance remains pending. No deployment or merge approval.

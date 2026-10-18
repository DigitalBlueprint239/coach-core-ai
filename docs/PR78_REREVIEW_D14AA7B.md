## Independent re-review — FAIL — PR #78 atd14aa7b

**Reviewed head:** `d14aa7bb9ec4442c3acca26b127b17f4194cbd64`. **Base:** `61448f0feee198a8796f4077f32a52f7b863f90d`. Previous failed head: `905b1d4b0e93d720cb4cf05b5746cb7a138e7884`. Read handoff6247753959, prior FAIL6246331436 and evidence76 atdc1e90a. Inspected exact-head [CI39112158651](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39112158651), attempt1. **MVP NO-GO.**

The six previous false-OFF probes are repaired, and all26 focused checks pass locally. **The replacement contract still accepts ordinary JavaScript that reaches the backend before/around the inspected throw.** A separate probe also falsely satisfies the ON negative control. These are concrete defects, separately reported from the documented dynamic-code limitation. The actual retained CI import functions remain disabled; this FAIL concerns the verifier's assurance, not a newly observed enabled CI release or a revocation of accepted base behavior.

### Concrete blocking defects and executable reproductions

**D1 — P1: first-body throw ignores parameter initialization and surrounding effects.** [provablyOff224–242](https://github.com/DigitalBlueprint239/coach-core-ai/blob/d14aa7bb9ec4442c3acca26b127b17f4194cbd64/scripts/security/release-import-config.js#L224-L242) examines only the body. [Handler inspection296–344](https://github.com/DigitalBlueprint239/coach-core-ai/blob/d14aa7bb9ec4442c3acca26b127b17f4194cbd64/scripts/security/release-import-config.js#L296-L344) counts direct calls but does not prove argument/default/getter expressions side-effect-free, and treats every component parameter/destructured binding as a harmless setter/prop. The following valid shipped-bundle fixtures all scan **exit0 / off [static]**, while executing their full module initialization and real returned button handler invokes the in-memory backend:

| Fixture | Actual Import copies | Actual Not now copies | Scanner |
|---|---:|---:|---|
| Argument getter: `argBox.value` calls backend, then returns storage | 1 | 1 | OFF |
| Executor/decline default parameter calls backend before the first body statement | 1 | 1 | OFF |
| Component-local async handler has a default getter parameter | 1 | 0 | OFF |
| onClick wrapper calls its handler, then reads an effectful getter | 1 | 0 | OFF |
| Destructured local `f` is backend-calling code, not a verified React setter; handler calls it before/finally | 2 | 0 | OFF |

The minimal default-parameter counterexample is:

```js
async function (x = i.copy({}, {id: 'default'})) {
  throw new Error(disabledMessage);
}()
```

Default parameter evaluation happens **before** the body. The same issue affects synchronous decline. The argument-getter case similarly runs before entering the zero-parameter function. The wrapper cases show that judging only a selected target does not establish a no-backend-call property for the actual UI handler.

**Minimum D1 correction:** validate the complete supported call path, including actual argument evaluation, parameter/default/destructuring initialization, wrapper expressions and effects of allowed setter/prop calls. Unknown expressions or bindings must return inconclusive. It is sufficient to conservatively recognize the current safe compiled shapes and reject unsupported ones; a general JavaScript interpreter is not required. Do not mark arbitrary destructured/parameter calls harmless without proving their binding and allowed arguments. Add these five regressions; ensure actual OFF/ON builds still pass their respective controls.

**D2 — P1: the thrown constructor is not established as a trusted native binding.** [assignmentIndex177–210](https://github.com/DigitalBlueprint239/coach-core-ai/blob/d14aa7bb9ec4442c3acca26b127b17f4194cbd64/scripts/security/release-import-config.js#L177-L210) misses literal computed assignment `globalThis["Error"] = ...`; [lines230–234](https://github.com/DigitalBlueprint239/coach-core-ai/blob/d14aa7bb9ec4442c3acca26b127b17f4194cbd64/scripts/security/release-import-config.js#L230-L234) also treat any undeclared constructor identifier as if it were an engine builtin. Two more fixtures return **exit0/OFF** while both actual buttons make one backend call:

```js
globalThis['Error'] = function (msg) {
  i.copy({}, {id: 'constructor'});
  this.message = msg;
};
// The supposedly safe body then executes:
throw new Error(disabledMessage);
```

This is an ordinary assignment with a literal key—**no eval, Function or dynamic code generation**. Construction executes before `throw` can reject. Separately, `throw new CustomError(disabledMessage)` is accepted with no binding declaration in the inspected chunk; my actual-execution fixture supplies that global constructor, whose body calls the spy backend. An unresolved constructor is not proof of a builtin.

**Minimum D2 correction:** explicitly validate a trusted native Error binding instead of assuming that every unresolved identifier is native. Detect literal computed global replacement and reject unanalysed relevant global/alias mutations. Add both regressions; unsupported constructor bindings must fail closed. Document remaining host/dynamic-code assumptions narrowly rather than asserting safety regardless of globals.

**D3 — P2: the ON control still substitutes call arguments and can falsely pass a disabled UI path.** [judge374–398](https://github.com/DigitalBlueprint239/coach-core-ai/blob/d14aa7bb9ec4442c3acca26b127b17f4194cbd64/scripts/security/release-import-config.js#L374-L398) invokes the executor with four synthetic arguments and decline with two. In another fixture, executor argument5 and decline argument3 default to true, but the actual UI explicitly passes false to both. The actual accept and decline produce **0copies/0reads/0writes**; `negative-control` nevertheless exits0/ON, reporting a copy/read and writes after dropping those explicit arguments. Thus meaningful counters are not enough if they describe a different invocation.

**Minimum D3 correction:** preserve or statically validate the actual argument/parameter semantics for ON detection too. Unsupported arity/default/argument shapes must make the negative control inconclusive, not exercise a synthetic ON path. Add the disabled-UI/explicit-false regression. The real opted-in build tested below does reach the backend; this is a concrete additional control-calibration defect, not a claim that this CI run's emulator build was disabled.

**Reproduction method:** `surrounding-probes.cjs` in the evidence link below creates the seven false-OFF fixtures and the false-ON-control fixture using the submitted synthetic component generator, runs the scanner, then independently executes the full module factory and returned accept/decline callbacks from fresh state. All side effects are in-memory spies. `previous-probes.cjs` re-runs the six old cases. From a dependency-installed checkout of the pinned head, run the downloaded probe with `REVIEW_REPO="$PWD" REVIEW_EVIDENCE_DIR=/tmp/pr78-review node surrounding-probes.cjs`. The report records scanner verdicts alongside actual backend reads/copies/writes. Baseline ON/OFF controls behave correctly; an explicit direct `i.copy(...)` call in an argument is rejected, unlike the getter/default cases. No tracked PR source was modified.

### What now passes, including all six old probes

Re-ran closure mutation, global-state substitution, dropped fifth/third arguments, unresolved member await, two onClick handlers, and read-before-disabled-message. **All six now return exit1/inconclusive** while the whole-module harness reproduces their original effects. Plain unresolved identifier and ambiguous literal controls also fail closed. The direct-call ambiguity repair is real; D1/D2 are remaining surrounding-execution gaps, not a repetition of the same six failures.

A fresh same-head opted-in emulator build returns ON on the required negative control by **execution**: executor copy1/read1/storage writes5; decline writes1 and returns declined. The report now counts reads as well as copies/writes. The OFF baseline is zero-effect and explicitly static. Actual CI D10-01 also exercises the opted-in emulator application's import path. These are meaningful controls, although they do not repair D1/D2.

`RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` → **26passed/0failed/0skipped**, including the two real-build cases. Both c9d49dd and905b1d4 historical verifier objects are available locally (cat-file exit0), so history-dependent comparisons ran. Real proof status0 and the expected nonzero broken-ON proof remain asserted; the positive proof reports17passes. Local import suites **49/49**, TypeScript exit0. Local Node24.19.0; CI Node22.23.3/react-scripts5.0.1.

**CI is correctly reported as23passed/0failed/3skipped**, verified in all12 self-check annotations and one complete job log. Skips: #21 c9d49dd comparison unavailable in shallow history; #25/#26 slow real-build focused cases. The dedicated proof step runs the actual build and ON control and reports17passed on all12 jobs. The six regression tests additionally condition their old905 comparison on `OLD_905`; those inner assertions are not separately represented in the skip count. I establish their execution from local full-history results, not from CI's pass count. **The three reported skips do not independently block this review** because the requested full-history/local real-build coverage ran; the blocking gap is the missing surrounding-execution coverage demonstrated by D1/D2.

### New artifacts and the actual retained code

Downloaded/opened **all12 NEW ZIPs** for39112158651. Archive SHA-256/size match GitHub metadata; each10-file B15 inventory exactly covers retained final bytes except documented inventory/UPLOAD_OK self-exclusions; every inventory hash matches. Required logs/results/exits/markers/redaction/manifests are nonempty. Configured residual token-shape scans are clear for retained run.log and release HTML/JS/asset manifest/context; no `.env*` or maps are included.

For each artifact, checked candidate/headd14aa7b, run39112158651, attempt1, exact project/bucket, build inputs/verdict and manifest digest in provenance. Its embedded11-file manifest is byte-identical to the separately retained manifest. Retained index.html, asset-manifest.json and main.630c8567.js match their manifest hashes. HTML script references, asset JS files and JS entrypoints agree on that complete single main chunk. All retained builds rescan OFF/static. Independently inspected and executed their exact zero-parameter rejecting functions and checked the immutable disabled-message binding and simple localStorage call arguments. I found **no instance of D1/D2 in these actual retained handler bodies/calls**; no enabled CI release behavior is claimed.

CI is successful workflow_dispatch, D10-01×1: **4 passing executions**, one per acceptance project;8 genuinely empty jobs. All12 job steps show successful ordered self-check/build/proof/finalize/upload, withheld-upload skipped, and retained test exits0. No full matrix or new CI dispatch was launched by this review.

### Documented limitations, distinguished from defects

**Dynamic rewriting:** an eval-based Error-rewriting fixture also produces OFF, as the stated residual limitation predicts; I do **not** count that as a new D1/D2 reproduction. Against the actual retained JS, AST inspection of recognized direct/member eval/Function call forms finds the same **`new Function("return this")`** site in all12 main chunks. It is a fixed global-object fallback, not an observed Error-rewriting payload. Therefore neither “there is no dynamic code” nor “dynamic code changed these handlers” is supported. This inspection is not proof against every alias, computed code generator or external runtime rewrite. The native-runtime/no-host-rewriting assumption remains explicit; it cannot excuse the ordinary default/getter/literal-assignment failures above.

**Retention/deployment:** no ZIP access gap remains for these12 artifacts. The retained main code is independently inspectable now. CSS, headers/redirects, public manifest/robots/sitemap, JS license and root sw.js remain manifest-only; this is not the complete deployable tree or service-worker/offline verification. Source maps are absent. The scanner is not a general lazy/external chunk-loader verifier; this current declared main-chunk set is complete. This is a placeholder-config **release-shaped build**, not a staging deployment, hosted-byte comparison, real-provider auth/device or release acceptance. Rendered Actions summaries were not inspected; all API annotations/job states, all ZIPs and one complete job log were. Artifact retention is14days; token-pattern scans are not a universal secret audit. The resolver still conservatively rejects expansion disagreements and labels “committed” by basename rather than git cleanliness.

### Preserved behavior, drafts, PR77 and release prerequisites

`src/` and corrected `docs/support/` are byte-identical to905b1d4. Versus accepted base, application changes remain the marker export/data attribute and marker tests only. Accepted import/recovery guards, fresh Not now limitation, approved identity/App/UI, browser bodies/assertions, reporter, B15 implementation, explicit opt-ins and package/lockfiles remain preserved. Actual Playwright discovery is unchanged:76/76/15/15, complete/non-overlapping acceptance65/65/15/15, diagnostic10/10/0/0 and obsolete1/1/0/0. Phone/dispatch filtering, worker1/retry0/test60s/expect10s/webserver30s/job120min unchanged. No assertion or execution limit was weakened.

The corrected support/disclosure drafts retain the accepted no-bypass boundary: no clearing/replacement-team recovery instruction, improvised account proof, incorrect ownerUid query or editable device JSON as ownership evidence. No support channel, operator authorization, verified recovery method or backend restoration is activated. They remain **drafts**, with Coach Drew decisions and separate operational review outstanding; no new recovery actions were performed.

**PR77:** still open/draft at `dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4`, baseefc9116, submitted reviews0, PR comments contain only its delivery handoff. Relevant issue39 records show delivery/review requests and separation statements, not an independent PASS. No independent acceptance found in those inspected records. This review does not approve its aggregate or establish required-check enforcement. Branches were kept separate; the known changed-file overlap remains the workflow, not an integration performed here.

Acceptance needs the minimum D1–D3 corrections and executable regressions, followed by a new source-pinned bounded proof/evidence review; **no unchanged full matrix is requested**. Aggregate review/enforcement, deliberate recovery-target integration, support/disclosure approvals and implementation review, Firebase G2–G4 and approved staging/deployed-file/security/real-provider/device/product/founder gates remain separate release prerequisites. No integration, merge, deployment, production/protection change, recovery operation or AI activation. **MVP remains NO-GO.**

Executable reproductions, raw results, provenance/archive verification and hashes: [review evidence](evidence/pr78-rereview-d14aa7b).

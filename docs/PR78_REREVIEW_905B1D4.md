## Independent re-review — FAIL — PR #78 at905b1d4

**Head:** `905b1d4b0e93d720cb4cf05b5746cb7a138e7884`. **Base:** `61448f0feee198a8796f4077f32a52f7b863f90d`. Previously failed head: `c9d49dd367933a92039ba40478d80ffe3a6af987`. Reviewed the previous FAIL6243708455, latest handoff6246235468, evidence75 atff8054a, and exact-head [CI39101432532](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39101432532), attempt1. **MVP NO-GO.**

| Previous finding | Re-review result |
|---|---|
| F1: unrelated OFF text can establish disabled executable behavior | **FAIL — partially repaired, still false-OFF paths** through extraction, substitutions and handler binding |
| F2: slow focused test accepts a nonzero proof | **PASS — repaired**, including an independent broken-ON suite failure |
| F3: draft device-state clearing/replacement-team workaround | **PASS as a corrected draft**, not authorization for recovery |
| F4: unsupported ownership verification/schema assumptions | **PASS as a corrected draft**, capabilities remain unresolved |
| Earlier absence of retained CI release JS | **Gap closed for HTML/main JS/asset manifest/context**, with remaining asset/deployment limits below |

### Blocking defects — executable proof remains unsound

**R1 / P1 — extracted closures are not necessarily the shipped closures.** [closureFor/evaluateFunction](https://github.com/DigitalBlueprint239/coach-core-ai/blob/905b1d4b0e93d720cb4cf05b5746cb7a138e7884/scripts/security/release-import-config.js#L162-L188) copies declaration initializers but omits subsequent initialization/mutation statements. Known globals such as globalThis are accepted and then evaluated in an empty VM, without preserving or rejecting the shipped state. Two independent shipped-bundle fixtures return scanner exit0/OFF while executing their whole module factory and actual returned button handler reaches backend.copy:

- Module declares `const cfg={enabled:false}; cfg.enabled=true;`. Executor and decline check `cfg.enabled`. Extraction reconstructs only the false initializer; the real initialized module is ON.
- Module sets `globalThis.proofEnabled=true`. Both functions check that property. The empty VM substitutes undefined, takes the disabled branch and reports OFF; the real initialized module reaches the backend.

**R2 / P1 — binding drops actual arguments, unresolved calls and ambiguous handlers.** [handler selection/binding](https://github.com/DigitalBlueprint239/coach-core-ai/blob/905b1d4b0e93d720cb4cf05b5746cb7a138e7884/scripts/security/release-import-config.js#L219-L246) chooses the last candidate handler and filters unbindable calls away; [execution](https://github.com/DigitalBlueprint239/coach-core-ai/blob/905b1d4b0e93d720cb4cf05b5746cb7a138e7884/scripts/security/release-import-config.js#L258-L280) invokes functions with fixed synthetic arguments instead of binding their actual call-site semantics. Independent fixtures show:

| Fixture | Actual returned Import button behavior | New scanner |
|---|---|---|
| Executor's fifth argument and decline's third argument are ON; verifier omits them | backend.copy1/read1, storage writes2 | exit0 / OFF |
| Handler awaits `i.copy(...)` before its inlined disabled executor | backend.copy1 before rejection | exit0 / OFF; unbindable member await ignored |
| onClick calls enabled handler, then disabled handler | backend.copy1/read1, storage writes2 | exit0 / OFF; last handler chosen |

These are **synthetic shipped-bundle probes**, shaped using the submitted test's own component fixture generator. My comparison executes the complete module initialization and the returned button, preserving those fixtures' actual arguments and dependencies. Each actual accept and decline is tested from a fresh initialized module; the mutation, global-state and dropped-argument fixtures also make the actual decline write state while the scanner claims disabled. It does not merely compare strings or run the scanner's extracted functions again. Baseline ON reaches copy/read; baseline OFF performs neither; a plain unknown identifier correctly fails inconclusive. The unsupported cases above must also fail inconclusive instead of synthesizing an OFF verdict. This is why passing the repaired original text decoys is insufficient.

**R3 / P2 — backend reads are ignored in the no-backend-call condition.** [lines266–269](https://github.com/DigitalBlueprint239/coach-core-ai/blob/905b1d4b0e93d720cb4cf05b5746cb7a138e7884/scripts/security/release-import-config.js#L266-L269) tracks reads but classifies disabled using only copies and storage writes. A bound executor that calls `backend.read(...)` and then throws the exact disabled message is accepted OFF, despite the read. Require zero reads as well as zero copies/writes before asserting “before any backend call.”

**Required repair:** preserve verified initialization/call semantics or reject unsupported shapes; do not reconstruct an alternate environment that happens to disable import. Ambiguous handlers and unresolved relevant calls/bindings must fail closed. Include every backend side effect in the OFF contract. Add regressions for these six probes. No production code was changed or recovery/backend action performed: all probe storage/backends are in-memory spies. **I did not observe enabled behavior in the actual retained CI release output**; its functions are unconditional disabled throws, as independently checked below. These defects block acceptance of the verifier's safety claim, not the accepted base runtime.

### Verified repairs, tests and retained exact-SHA evidence

**Original decoys and real controls.** Re-ran the previous raw comment/orphan/contradictory/missing/negative-marker probes: no false PASS remains in those original fixtures (raw bundles without index.html now fail inconclusive). The submitted shaped-bundle tests also reject those decoys. A fresh same-head emulator build is analyzed ON: executor reaches **backend.copy1**, readback completes and decline returns declined. The required ON negative control succeeds; it cannot be satisfied by a comment-only marker. These positives do not cover R1–R3.

**Focused reliability.** `RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` → **17passed/0failed/0skipped**, including two real builds. The positive slow case now asserts process exit0, the17-pass result, executed-OFF line, ON control and retention. Independently setting `EMULATOR_BUILD_DIR` to a broken comment-only ON fixture makes the **whole suite exit1:16passed/1failed/0skipped**; the positive test fails its real-status assertion, while the intended negative regression passes by checking the nonzero proof. Previous F2 is repaired. Missing ON evidence fails rather than being silently optional.

**CI skips corrected.** The directly inspected complete CI job log reports **17tests:14passed/0failed/3skipped**, not the handoff's15fast. The old-c9d49dd comparison was skipped because that commit is absent in the shallow checkout; the two real-build focused cases were also explicitly skipped. The separate production-shaped proof then runs and reports **17passed/0failed**, including the ON negative control. Local full-history execution above runs all17, including the old-v-new demonstration. No skipped check is being counted as a pass here.

**New archives actually opened.** Downloaded all12 NEW ZIPs for39101432532. GitHub metadata binds them to905b1d4; archive SHA-256/size match; each10-file B15 inventory covers final retained bytes exactly apart from documented inventory/marker self-exclusions; every retained-file digest matches. Required results/logs/exits/redaction/marker/manifest files are present; all test exits0. Configured residual token-shape scans are clear for retained run.log and retained HTML/JS/asset manifest/context; no `.env*` or source maps are included.

For every archive independently verified:

- `release-build.context`: candidate/head905b1d4, run39101432532, attempt1, exact matrix project/bucket, target project, effective `.env.production="false"`, executable outcome and manifest digest.
- Embedded full11-file build manifest is byte-identical to the separately retained manifest, and its SHA-256 matches provenance.
- Retained index.html, asset-manifest.json and `static/js/main.630c8567.js` match their full manifest hashes. HTML's script set, asset-manifest JS files and JS entrypoints all name that same complete single main chunk; no declared JS chunk is missing.
- Re-scanned each extracted retained build, yielding OFF. Separately, without relying on the verifier's closure reconstruction, extracted and executed the exact two unconditional rejecting function bodies found at the compiled localStorage call sites; checked their immutable disabled-message constant binding. Both reject in all12 retained main files. These current outputs have no mutable/global dependencies of the R1 kind.

CI is successful workflow_dispatch/D10-01×1: **4 executed passes**, one per acceptance project, and **8 genuinely empty jobs**. All12 have successful ordered emulator-build/self-check/release-proof steps and17-pass release annotations, followed by successful B15 finalization/upload and skipped withheld-upload branches. This is bounded evidence, not full acceptance or required-check enforcement. No new CI matrix was launched by this review.

### Corrected support drafts and preserved scope

Compared both revised drafts with issue39/6224877757 policy3 and the accepted base support boundary. They explicitly withdraw the old clearing/replacement-team option, challenge-word procedure, ownerUid query and device JSON as ownership evidence. Existing schema is correctly described as teams.ownerId and plays.teamId/createdBy; team-name versus trusted teamId is acknowledged. Missing-team cases remain blocked/escalated. Future identity verification, read-only operator access, audit, non-forgeable identifiers and any restoration remain proposals; **no operational recovery authority exists**. Disclosure no longer implies that contacting an undefined support path can re-open or move imports. Previous F3/F4 are technically corrected **as drafts**, not approved/published procedures. D1–D7 and P1–P3 still require Coach Drew decisions and subsequent review; none were invented or activated during this review.

App source is byte-identical to the previously failed head; versus accepted base, changes remain only the marker export, data attribute and marker tests. Accepted import/recovery behavior, identity/App/UI, opt-ins, all browser bodies/assertions, reporter and B15 implementation remain unchanged. Local import suites **49/49**, TypeScript exit0. Actual discovery base→head: **76/76/15/15**, complete/non-overlapping buckets65/65/15/15 acceptance,10/10/0/0 diagnostic,1/1/0/0 obsolete. Phone/dispatch filters and worker1/retry0/test60s/expect10s/webserver30s/job120min preserved. No assertions or execution limits were weakened.

### Evidence limits and release prerequisites

**No ZIP access gap remains.** Retention covers all currently declared main JS chunks plus index/asset manifest/context. It does **not** retain the complete11-file release tree: headers/redirects, CSS, manifest/robots/sitemap, JS license and root `sw.js` remain manifest-only. Their CI bytes cannot all be independently rehashed from these ZIPs; do not call this a retained deployable release artifact or full service-worker/offline verification. Entry analysis is not a general lazy/external chunk-loader proof. For this build, HTML and asset metadata agree on the single main chunk. Local Node24.19.0 versus CI Node22.23.3/react-scripts5.0.1 is explicit. Resolver expansion still conservatively fails disagreement; “committed” remains a documented basename allowlist, not a git-cleanliness guarantee. Sanitization checks are the configured token-pattern contract, not a universal secret audit.

These are placeholder-config **release-shaped** outputs, not a staging deployment, hosted-byte comparison, real-provider sign-in, physical-device or release verification. Rendered Actions summaries were not inspected; API annotations, all job states, all archives and one complete job log were. GitHub artifact retention is14days. Accepted recovery tests were not weakened; no renewed D10-08a/d browser stability claim is made from a D10-01 dispatch.

**PR77 actual status:** still open/draft at `dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4`, baseefc9116; submitted reviews0. Its PR record contains the delivery handoff, and the inspected issue39 references are delivery/review requests or statements that it is separate—not independent acceptance. No independent PASS/approval found in those records. This review neither accepts its aggregate nor establishes required-check enforcement. #77/#78 still overlap only in the workflow relative to their own bases; no branches were combined.

Next acceptance prerequisites: fix R1–R3, add the exact false-OFF regressions, and independently review a new exact-head bounded proof/evidence run. No unchanged full matrix is requested. Separate release prerequisites remain: aggregate independent acceptance/enforcement, deliberate recovery-target integration, Coach Drew's support/disclosure decisions and implementation review, Firebase G2–G4, approved staging/deployed-file/security/real-provider/device/product/founder gates. No merge, integration, deployment, production/protection change, recovery operation or AI activation. **MVP remains NO-GO.**

Independent probe code, raw results, full archive verification, provenance and hashes: [immutable review records](evidence/pr78-rereview-905b1d4).

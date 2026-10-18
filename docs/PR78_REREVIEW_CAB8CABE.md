## Independent re-review — FAIL — PR #78 at cab8cabe

Reviewed **head `cab8cabe2baf00b8f3a37a36a88466f5c749613e`**, base `61448f0feee198a8796f4077f32a52f7b863f90d`, previously failed `d14aa7bb9ec4442c3acca26b127b17f4194cbd64`. Read [latest handoff](https://github.com/DigitalBlueprint239/coach-core-ai/pull/78#issuecomment-6253967040), [previous FAIL](https://github.com/DigitalBlueprint239/coach-core-ai/pull/78#issuecomment-6248146409), and evidence77 at `752b877bfe153ee75884cadcb7bde0657deeaa77`. Inspected [CI39157201371](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39157201371), attempt1, exact reviewed head. **MVP remains NO-GO.**

The seven previous false-OFF fixtures and explicit-false ON-control fixture are repaired. All **37 focused checks pass locally**, including full-history comparisons and both real-build checks. Nevertheless, independent fixtures demonstrate **eight additional false-OFF cases and a false ON control**. The “complete supported path / unsupported paths fail closed” claim remains unsound. This FAIL concerns the verifier; I did not observe enabled import code in the actual retained release-shaped output or revoke accepted base runtime behavior.

### Blocking code defects and minimum corrections

Each row below runs the whole fixture bundle, renders its component and invokes its returned button callbacks with in-memory spies. It also runs both pinned verifiers against the same files. `independent-probes.cjs` and its full JSON preserve executable code, scanner reports, exits and actual effects. All eight new OFF cases return **cab8 scan exit0 / verdict off**, although the actual accept calls the backend:

| New fixture | Accept backend copies | Decline backend copies |
|---|---:|---:|
| React functional state updater runs backend code | 1 | 0 |
| Unary coercion of a local object runs `valueOf` | 1 | 0 |
| Explicit `poison.call(globalThis)` replaces Error through `this.Error` | 1 | 1 |
| `const R=Reflect; R.set(globalThis,"Error",...)` | 1 | 1 |
| Unverified require implementation returns malicious state setters | 4 | 1 |
| `Object.defineProperty(ref,"current",{get(){...}})` | 2 | 0 |
| Outer `finally` executes after an inner rejected import | 1 | 0 |
| Duplicate `onClick` key selects the uninspected last handler | 1 | 0 |

**F1 / P1 — the effect-free grammar permits executable effects.** [unsafeExpr354–379](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L354-L379) regards function creation as safe, then passes the function to a React setter as though it stays inert:

```js
f(() => { i.copy({}, {id: 'updater'}); return true; });
```

React invokes functional state updaters. Beyond the faithful fixture updater, `real-react-updater.cjs` mounts a wrapper with **real React19.1.0/ReactDOM hooks** under jsdom: backend copies1, scanner exit0/OFF. Separately, `f(+evil)` where `evil.valueOf()` calls the backend is accepted because unary/binary/template expressions recursively allow arbitrary local identifiers without proving primitive values. Neither uses eval or an external host rewrite.

Minimum correction: restrict permitted setter arguments to demonstrably inert, non-callable values for this compiled component; reject unknown values/function arguments. Restrict coercive operations to proven primitives or reject them. Add both full-path regressions with actual effects, including real React updater semantics; the current fake hook merely assigns a function and misses its execution.

**F2 / P1 — exceptional control flow omits reachable effects.** [pathCheck419–447](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L419-L447) records only the nearest enclosing try and assumes later nodes cannot execute. An enclosing outer `finally` still runs:

```js
try {
  try { await (async function(){ throw new Error(zv); })(localStorage); }
  catch { /* permitted local state updates */ }
  finally { /* permitted local state updates */ }
} finally { i.copy({}, {id: 'outer-finally'}); }
```

The scanner returns OFF while the actual accept copies1. **d14 rejected this fixture; cab8 newly accepts it.** Minimum correction: account for all enclosing catch/finally and fall-through after handled rejections, or reject unsupported nesting/control flow rather than using source position as reachability. Add the regression without weakening the real-build requirements.

**F3 / P1 — React and UI binding verification are not sufficient.** [verifyReactBinding309–325 / verifiedRef343–348](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L303-L348) recognizes a one-parameter function as webpack require without verifying its implementation. The fixture keeps the original React-shaped module but changes require's returned hooks; malicious setters are still “verified.” A ref's creation by useRef also does not prove that `.current` stays a data property: installing an accessor on that same object is ignored, and the handler's permitted `.current` reads execute it.

Additionally, [propOf492](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L492) takes the first matching property. With `{onClick:()=>{y()}, onClick:()=>{i.copy(...)}, children:"Import plays"}`, JavaScript/UI receives the last handler, while the proof inspects the first.

Minimum correction: establish the actual supported require/module/hook binding and reject unsupported require changes; track or conservatively disallow relevant hook/ref mutation/escape/accessor paths. Reject duplicate, computed or spread properties that could override the inspected UI bindings. Textual React signatures and finding an onClick next to a literal are insufficient. Add each regression; unknown/ambiguous bindings must return inconclusive/nonzero.

**F4 / P1 — native Error is still assumed after missed in-chunk rewrites.** [assignmentIndex253–286](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L253-L286) ignores aliased Reflect and blanket-exempts strict `this` writes. Both are bypassed using ordinary shipped code:

```js
const R = Reflect;
R.set(globalThis, 'Error', function(msg) { i.copy({}, {id:'alias'}); this.message=msg; });
// alternative, also strict-mode:
function poison() { this.Error = function(msg) { i.copy({}, {id:'receiver'}); this.message=msg; }; }
poison.call(globalThis);
```

Either replacement is then executed by the supposedly native `new Error(zv)`. Both real buttons copy1; scan returns OFF. Strict mode prevents implicit global `this` in a plain call; it does not prevent an explicitly supplied global receiver. The handoff specifically suggested probing aliased Reflect; that probe fails.

Minimum correction: validate or reject relevant global aliases/redefinition calls and unknown receivers; do not infer non-global `this` merely from strict mode. Unsupported paths capable of reaching the trusted constructor must fail closed. These are **inside entry chunks**, so the documented assumption about rewrites outside the chunks does not excuse them.

**F5 / P2 — actual ON predicate mapping still synthesizes true.** [mapArgument570–573](https://github.com/DigitalBlueprint239/coach-core-ai/blob/cab8cabe2baf00b8f3a37a36a88466f5c749613e/scripts/security/release-import-config.js#L570-L573) maps every recognized `()=>ref.current===x` to `()=>true` without establishing its value. Set `o.current="stale"` in the ON fixture: actual accept rejects with **0copies/0reads/0writes**, but `negative-control` exits0/ON and reports a backend copy/read. The decline remains independently enabled; that does not establish an enabled accept path.

Minimum correction: prove the callback's bindings and current-session invariant or execute/map the predicate faithfully; otherwise reject it as inconclusive. The explicit-false/default-parameter fixture is now correctly rejected, but does not cover this remaining substitution. Add this false-ON calibration case.

A conservative whitelist of the actual safe compiled forms is sufficient; a general JavaScript interpreter is not required. After repair, retain fresh bounded proof evidence and obtain independent review. No unchanged full matrix is requested.

### Passing regression and build evidence

Re-ran **all seven previous false-OFF fixtures against both heads**: argument getter, callee defaults, handler default getter, extra onClick getter, destructured backend-calling local, computed Error replacement and unresolved CustomError. Each still produces the original backend effects and d14 exit0/OFF; cab8 now exits1/inconclusive. The explicit-false ON fixture actually performs zero effects: d14 falsely exits0/ON, cab8 exits1/inconclusive. Direct argument-call/getter and catch-member-read controls also fail closed on cab8. New baseline OFF has zero effects; baseline ON copies1/reads1/writes2 and decline writes1.

`RELEASE_PROOF_BUILD=1 node scripts/security/release-import-config.test.mjs` → **37passed/0failed/0skipped**. All required c9/905/d14 git objects exist, so conditional historical comparisons ran locally. Fresh same-head emulator build and a separately retained real release-shaped proof → **17passed/0failed, process exit0**. Broken-ON real-build check asserts a nonzero proof exit despite OFF PASS text. Real opted-in build's negative control reports executor **copy1/read1/storage writes5**, decline writes1; this control is meaningful for the actual unmodified build, despite F5's calibration defect. Import suites **49/49 (7suites)**; TypeScript exit0. Local Node24.19.0/npm11.9.0; CI Node22.23.3/CRA5.0.1.

CI self-check annotations accurately report **37tests /34passes /0failures /3skips** in all12 jobs: #32 historical c9 unavailable; #36/#37 real-build focused cases not enabled. The dedicated proof step independently builds and reports17passes in every job. Conditional old905/d14 assertions inside regression rows are also history-dependent and are not separately counted as skipped assertions. I establish full-history/real-build focused coverage from local results, not from CI's green names. These CI skips **do not separately block this review** given the completed local coverage; F1–F5 do.

### All new artifacts inspected; evidence limitations

Downloaded and opened **all12 NEW ZIPs** from39157201371. No ZIP access gap remains. Every archive's SHA-256 and size match GitHub metadata; every10-file B15 inventory exactly covers final retained bytes except inventory/UPLOAD_OK self-exclusions. All inventory hashes match. Required logs, exits, results, redaction records, markers and manifests are retained. All12 `run.exit` files are `exit=0`. Ordered workflow metadata shows successful self-checks/build/proof/finalize/upload, with the withheld-upload step skipped.

Each provenance record binds **cab8cabe, run39157201371, attempt1 and exact project/bucket**; effective config, disabled verdict and manifest digest agree. The embedded11-file manifest equals the separately retained manifest byte-for-byte. Retained `index.html`, `asset-manifest.json` and `main.630c8567.js` match manifest hashes; HTML script references, asset JS entries and retained executable chunks agree. Each retained build rescans OFF/static. Main JS SHA-256 is `c5f21eef1571663eac1b6dfa48a12b35b7b2ac2b5fff7ba75394ac4571fbb6f3`; it is unchanged from the prior retained release code. Independent inspection/execution of its exact zero-parameter rejecting functions confirms the disabled constant and simple localStorage arguments. No enabled retained release behavior is claimed.

Configured residual token-pattern scans of logs and retained HTML/JS/asset/context are clear; no `.env*` or source maps are included. This is a scoped sanitization check, not a universal secret audit. CI executed **D10-01×1: four passing acceptance executions, eight accurately empty jobs**, not full release acceptance. Every execution's retry is0. I verified API annotations and ZIP contents; rendered Actions summaries were not inspected.

Eight build-manifest entries remain unretained: `_headers`, `_redirects`, `manifest.json`, `robots.txt`, `sitemap.xml`, CSS, main-JS license and root `sw.js`. Their CI bytes cannot be independently recomputed from these ZIPs. This is not the complete deployable tree or service-worker/offline verification. Artifact retention is14days; ZIPs are available now, not an indefinite archive.

### Host assumptions, preserved behavior and release prerequisites

A narrowly stated claim about this fresh **release-shaped output under the native host**, with no external rewriting, is reasonable in principle. It cannot prove deployed bytes, cache/service-worker state, extensions/external scripts, real-provider authentication, hosted configuration or device behavior. The actual retained bundle's recognized direct/member dynamic-code sites contain the fixed webpack `new Function("return this")` fallback; no Error-rewriting payload was observed. This inspection is not exhaustive alias analysis. **The current host assumptions do not make the verifier acceptable:** F1–F5 operate within its inspected chunks or ordinary React semantics, without deployment or outside-runtime mutation. Unsupported behavior currently succeeds instead of failing closed.

`src/`, support drafts, workflow and shell proof are byte-identical to d14. Versus accepted base, application scope remains the marker export/data attribute plus marker tests. Accepted exact opt-in/import/recovery checks, fresh Not now private-beta limitation, pending original-owner/team resume, approved identity/App/UI and explicit test opt-ins are preserved. Browser bodies/assertions, Playwright config/reporter/B15, package/lockfiles and execution limits are unchanged. Independent discovery matches **76/76/15/15**, complete non-overlapping buckets: acceptance65/65/15/15, diagnostic10/10/0/0, obsolete1/1/0/0. Phone and dispatch filters (`D10-08[a-d]`, `D10-`) preserve membership. Worker1/retry0/test60s/expect10s/server30s/job120min and repetitions remain unchanged.

The corrected support/disclosure drafts preserve [Coach Drew's authoritative boundary](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6224877757): authenticated ownership verification required, no bypass, operational procedure still needed. No clearing/editing state, replacement-team recovery, improvised challenge proof or editable-device JSON ownership proof is authorized. The drafts explicitly leave support access/channel/authentication/audit/restoration capabilities unresolved. They remain proposals, pending Coach Drew decisions and separate operational review; no support capability was invented or activated here.

**PR77 independent-review status:** still open/draft at `dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4`, base `efc9116cf93c5d235b0b2edeb4d7be03a4e73cdc`; submitted reviews0, its sole PR comment is delivery/review request. No independent acceptance found in those records or inspected issue39 references. Delivery is not acceptance. #77/#78's changed-file overlap remains `.github/workflows/e2e-emulator.yml`; branches were not combined.

**Separate prerequisites:** repair/re-review F1–F5; independently review #77 and approve/verify aggregate required-check enforcement; deliberately integrate accepted changes and validate the exact combined candidate; obtain support/disclosure owner decisions and review any resulting implementation; complete separately approved staging/deployed-byte/security/real-provider/device/product/founder gates (including outstanding Firebase gates). B11/B15 acceptance is not reopened by this verifier FAIL. No unchanged full matrix, integration, merge, deployment, production/protection change, recovery action or AI activation was performed. **MVP remains NO-GO.**

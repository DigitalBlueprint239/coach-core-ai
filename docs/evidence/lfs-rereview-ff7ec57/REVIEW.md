# Independent Codex re-review — FAIL at ff7ec57

Head **ff7ec5755e57d5088d4c1d0e2c3e6bd00956a649**, PR87; base
**7f3b757b1e260105ac85f825bdbbfcbdb4110ae6**; prior FAIL
**0c93b63ca47d9cdcd23e7e712714047193f73557**. Repair handoff6312290705 read.
LFS-A authorization/scope6303623216/6303891279 unchanged. This is bounded
implementation review, not release/activation approval. No code/test assertions
changed by reviewers; no new full core matrix.

## Remaining concrete finding — Unicode cursor order loses evidence

`functions/src/film/reconcile.js`, the `it.name <= afterName` filter, compares
JavaScript strings by UTF-16 code units. GCS object-name listing/startOffset order
uses the service's lexicographic UTF-8 name order. They differ across the BMP /
supplementary boundary. Canonical film IDs are ASCII, but noncanonical names are
explicitly in this reconciler's discovery/evidence scope (classifyListing returns
name-noncanonical); they cannot be silently excluded before that classification.

Counterexample (valid UTF-8 object names, two pages in service byte order):

```
first  = quarantine/\uE000/source.mp4
second = quarantine/\u{10000}/source.mp4
Buffer.compare(Buffer.from(first), Buffer.from(second)) === -1
second <= first === true // JavaScript UTF-16 order
```

First page contains first plus a continuation token; second page contains second,
no token. On unchanged head, three invocations each return processed1/passEndedtrue.
Only first gets attributable evidence; second is silently filtered on every pass.
The stable, finite set therefore still admits false pass completion/coverage.
This is a P2 omission of noncanonical-object evidence, **not a false deletion**.
An independent supporting reviewer reran the same probe and corroborated it.

Minimum correction: use a service-order comparator (UTF-8 bytes, e.g.
`Buffer.compare(Buffer.from(name), Buffer.from(afterName)) <= 0`) consistently
for cursor/replay filtering. Add token-aware loopback regressions for these names,
requiring both noncanonical evidence entries, no head/re-drive/delete, repeated
passes and partial/one-object budgets. No frozen file or authorized scope change
is needed. Executable utf8-probe.cjs and observed utf8-probe.json retained here.
Run `node utf8-probe.cjs /absolute/path/to/exact-candidate`.

## Prior findings — repaired within bounded scope

| Prior item | Independent result |
|---|---|
| F1 ordinary short-page starvation | Token-aware probe on0c93b63 repeatedly visits2of3; same probe onff7ec57 visits all3 across four passes. Persisted listQuery, partial pages, empty continuations, token expiry fallback and real-facade loopback tests inspected. Remaining Unicode comparison defect is distinct. |
| F2 wrong-bucket receipt/delete | Original mismatch probe now returns targetMismatch/processed0; no records/deletes, object retained. Per-invocation handler pins the bucket; mid-run change stops before next object. |
| F3 default admission reservation | Defaults now reserve the derived≈907s object envelope, invocation1740s, lease≈990s including background tail; insufficient-budget regression meaningful. Admission budget is NOT a hard total deadline; final release/fallback I/O remains bounded work outside that reservation. Production constants/platform timeout remain C1-D1. |
| F4 local concurrency45/1 | New run46/0/0. Best-effort release-if-mine handles an acquire committed then locally failed; unique holder is the safety invariant. L10 retains at-most-one and exactly-one delete assertions, advances injected clock past any orphan lease before expecting completion. The original local failure's exact cause is still not proven; prior45/1 retained, not erased. |
| HTTPS proof durability | Checked-in default-origin TLS/metadata controlled-interceptor suite5passes in the focused selection. No real Google endpoint, DNS/global-trust change or live credentials. |

Unchanged original mock output is also retained honestly: that mock ignores
pageToken, so it cannot establish behavior for the new token-consuming algorithm.
The token-aware variant is retained and run against BOTH heads; it preserves the
original stable3objects/transient-head scenario while implementing actual resume
semantics. Its old/new outputs demonstrate correction without misclassifying an
invalid mock as a new failure.

## Executed checks / exact-head CI

Local Node24.19.0,Java21.0.12.1; dependency versions verified identical to lock:
firebase-admin14.5.0,Firestore9.3.1,Storage8.4.0,google-gax6.12.1. Child processes
unset HTTP_PROXY/HTTPS_PROXY/http_proxy/https_proxy/NO_PROXY/no_proxy only; no values
or credentials printed, no permanent environment changes.

| Selection | Pass / fail / skip | Exit |
|---|---|---|
| Focused LFS + affected S1/C1 (including HTTPS5) |248 /0 /0|0|
| Affected LFS/C1/S1 emulator |46 /0 /0|0|
| Additive rules denial |6 /0 /0|0|
| Lint |n/a|0|
| Adversarial Unicode probe |counterexample reproduced|observational script, not counted as suite passes|

Literal-push CI39574223913: headff7ec575..., eventpush, attempt1, success.
Raw connector job logs independently inspected/retained:
119135617024 =248/0/0;119135617120 =46/0/0 +6/0/0. Frozen job119135617107
succeeds. CI Node22.23.3 is distinct from local24.19.0; no unmeasured attribution.
Security39574223958's729/0 and other gates are supporting builder/CI evidence,
not a new local full729 execution. Cancelled E2E39574223986 is not acceptance;
PR synthetic merge dd9f9f09 is not relabeled as exact-head proof.

Frozen git comparisons locally against7f3b757 and6764af9 confirm handlers, cleanup,
storage adapter, index exports, contracts, fixtures, core rules/config, locks,
existing workflow/reporting/security and PR86 tests unchanged. New LFS-specific
source/tests/workflow changes stay within authorized scope. The gate's owned
Storage JSON-API aborts and pinned Firestore gRPC deadlines work in the exercised
loopback/controlled TLS scenarios without changing frozen semantics. No
impossibility requiring frozen changes was established; STOP remains applicable
if that becomes necessary. Green checks do not override the new counterexample.

## Limits, integration and next owner

Builder corrects the UTF-8 cursor comparator and hands off a new exact SHA with
focused regression/evidence. Codex and the named independent Claude reviewer
session_01EUU9Xh8ytHDPZpzdekH5fT then judge that candidate separately; supporting
Codex subreview is not a substitute. No two independent PASSes claimed here.

Real GCS generation/precondition semantics, live buckets/access/settings, index
enforcement and actual deployment are not proven by emulator/loopback. Noncurrent
and soft-deleted versions remain excluded. I-6/I-9/I-10 and C1-D1 activation,
production values, versioning/soft-delete verification and alerting remain open.
Aggregate evidence storage is not globally capped; cancellation does not promise
remote rollback. No activation/scheduling, live resources, real footage, spending,
merge,deployment or AI. MVP **NO-GO**.

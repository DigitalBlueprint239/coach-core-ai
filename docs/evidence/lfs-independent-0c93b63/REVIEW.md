# Independent Codex LFS-A review — FAIL; milestone remains open

Candidate **0c93b63ca47d9cdcd23e7e712714047193f73557**, PR87; base
**7f3b757b1e260105ac85f825bdbbfcbdb4110ae6**. Scope #39 c6303623216,
authorization c6303891279 plus current direct confirmation. Builder's completed
delivery was preserved, not reimplemented. No frozen source changed. Review is
bounded to LFS-A, not release/activation acceptance. No full core matrix repeated.

## Concrete findings and minimum corrections

**F1 — short page falsely ends pass; later objects starve** (`reconcile.js`,
pass-end branch). `page.items.length < want` does not establish end of a GCS
listing; a short page can carry nextPageToken. With3stable objects, a page of2
with continuation, and transient heads keeping those objects live, four invocations
each report processed2/passEndedtrue. The third object never gets re-drive or
attributable evidence. Reproducer and actual output are retained here.

Use authoritative continuation/end evidence while preserving name-keyed progress.
Handle overlap-only/empty continuation responses explicitly; don't silently reset
and replay a prefix. Add real facade/loopback short-page regression. This violates
the finite/quiescent coverage claim, not only a performance expectation.

**F2 — actual transport bucket can differ from recorded authority** (reconciler
construction and invocation binding). `storage.name=demo-actual.appspot.com` with
`bucketName()=demo-other.appspot.com` lists/reads/deletes actual, fabricates a
finalize event naming other, and records state=deleted against other. The actual
synthetic object is deleted; the receipt names a different bucket. Reproducer uses
existing candidate doubles, no source changes.

Fail closed before list/state writes on a configured/actual facade mismatch.
Pin the dedicated handler/cleanup target for the whole invocation; check changes
at admission/boundaries rather than relabeling old-client metadata. Add startup
mismatch and mid-invocation target-change tests. Exact-generation preconditions
must remain. Repair belongs in new code/wiring, not frozen helpers.

**F3 — object admission does not reserve its derived envelope** (deriveLimits /
remaining-budget check). Unchanged defaults: objectEnvelopeMs903535,
objectBudgetMs60000, invocationBudgetMs540000, leaseMs963535. The loop admits an
object with60s left despite deriving a903s worst-case object envelope. The whole
invocation allowance is smaller than one envelope. Admission budget is not a hard
wall deadline, but the agreed before-admission reservation still must cover its
bounded operations.

Reconcile admission/default invocation allowances with the proved envelope,
including applicable retry/auth/background-tail assumptions; reject inconsistent
limits before effects. For transaction-attempt overrides>1, include interattempt
backoff. Prove insufficient remaining budget starts no head/decision. Do not hide
tails or substitute unverified defaults. These corrections need no frozen edit.

**F4 — local L10 emulator recovery assertion fails.** Affected emulator selection
is45pass/1fail/0skip, exit1 at lfs-reconcile.emulator.test.js:164: expected1 delete,
actual0 after the immediate later invocation. CI46/0 is separate evidence and does
not erase this. Keep the raw failure. Investigate lease ownership after ambiguous
acquire/state deadlines and the recovery assumptions; source inspection alone has
not established cause. Do not relax assertions merely to turn it green.

## Transport proof assessment, including independent HTTPS evidence

The new Storage JSON-API facade preserves the frozen Bucket/File surface and
exact-generation preconditions while owning request aborts; using it instead of
an unabortable Storage SDK path does not itself alter frozen decisions. Dedicated
real Firestore SDK gRPC deadlines plus counted retry layers are an in-scope
mechanism. There is no demonstrated need to change frozen semantics, so the
impossibility STOP condition has not been established. This does not accept the
composed admission/envelope with F3 unresolved.

Pinned dependencies verified: firebase-admin14.5.0,Firestore9.3.1,Storage8.4.0,
google-gax6.12.1. Both Storage branches in the committed35-case gate override the
endpoint to HTTP loopback; production differs by tokenProvider. That does not by
itself prove the required HTTPS production-origin path.

A supporting independent review then closed the specific **local mechanism** gap:
**5/5 controlled HTTPS probes PASS**, at unchanged0c93b63, original default
https://storage.googleapis.com URLs retained. Native fetch uses an isolated Agent
whose TLS connector validates the original host/protocol and routes only to
127.0.0.1 with a locally trusted throwaway SAN certificate. No endpoint override,
real DNS/GCP request, global trust/dispatcher change or live credential. Hung
list/head/DELETE and trickling head abort around300ms; oversized head rejected8ms;
server observes closure, one HTTP request each, synthetic auth and exact
Range/generation/ifGenerationMatch. Probe/json/log retained; private key destroyed
and not committed. Run with `node --expose-internals https-default-origin.cjs`.

Limitations: local Node24.19.0; bundled internal undici Agent constructor used
because no standalone undici package was installed. No claim this is a new
Node22 CI result. The pool requested replacement TLS connections after abort
(two connect attempts, one HTTP operation); no operation retry occurred, and the
isolated agent/idle connections were destroyed at probe cleanup. Do not claim
one socket/handshake or zero pool work from a one-HTTP-request assertion. Durable
checked-in HTTPS regression remains a correction request; the five local probes
are not relabeled as part of the35 CI checks.

Firestore production tests genuinely use TLS; background rollback/token tails
remain disclosed and finite under the tested settings. Local abort does not imply
remote rollback. Generic RunQuery retry claims should not be generalized to every
streaming query; the reconciler uses document reads. Real GCS generation semantics,
production access and deployment remain unverified; no live run authorized.

## Validation evidence

| Selection | Local pass/fail/skip | Exit |
|---|---|---|
| LFS + affected S1/C1 focused |233/0/0|0|
| Affected LFS/C1/S1 emulator |45/1/0|1|
| Additive rules denial |6/0/0|0|
| Lint |n/a|0|
| Supplementary HTTPS default-origin probes |5/0/0|0|

Local Node24.19.0,Java21.0.12.1; CI Node22.23.3, builder local22.22.0. No causal
attribution of local L10 failure to version differences is established. Dependencies
reused only after exact pinned versions checked. Six proxy variants unset for
child test processes only, with no values/credentials printed. No assertion changed.
Standalone supporting Storage35/0 and TLS Firestore3/0 confirm subsets already
included in233; they are not added to that count.

Literal push39520182387 checks out exact0c93b63, attempt1, success. Raw focused /
emulator logs downloaded through connector:233/0/0,46/0/0,6/0/0 respectively;
frozen job succeeds. CLI blob redirects initially403'd, connector succeeded, so
raw logs are available. Local git comparisons confirm frozen source/tests against
7f3b757 and all specified r4 frozen surfaces against6764af9. Security39520182386
714/0 is builder/CI evidence, not a new local714 rerun. Cancelled E2E39520182373
is not acceptance. No unchanged full matrix requested.

Commands/results/probes and sanitized logs are retained with final-file hashes.
CI logs include exact checkout/runner versions and masked checkout credentials.
No binary, credential or throwaway private key is published by this review.

## Ownership and remaining gates

Builder retains implementation ownership. F1–F3, L10 reconciliation and durable
HTTPS coverage have been requested directly on issue39 and PR87. In-scope repairs
remain authorized; no new product decision is requested. One repaired exact SHA
needs Codex and the separately named Claude reviewer's independent verdicts.
The supporting transport subreview is not a substitute for that required review.
At publication no independent Claude implementation verdict was yet posted.

Milestone is **not complete**; two independent PASSes have **not** been obtained.
If proof actually requires modifying frozen semantics, STOP and report before
continuing. I-6/I-9/I-10 integration, actual bucket/versioning/soft-delete/access,
production constants, alerts and activation of sweep+reconciler remain C1-D1/later
work. Default-OFF/TEST_ONLY remains, no merge/deploy/live changes/spending/AI.
MVP **NO-GO**.

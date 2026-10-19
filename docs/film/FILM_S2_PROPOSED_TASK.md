# Proposed FILM-S2 — bounded media validation worker (not authorized to start)

## Baseline and naming

Baseline: accepted bounded FILM-S1 combined PR82
`49bd3f3f1153d9d5d2637a39897b7c91be08b9fc`, backend9912f85 and client29dfce9,
contract r3. Independent review5579020608 / issue39 comment6279703720 accepts
combination only; no deployment or whole-Film acceptance. Preserve PR79/80/81/82
branches. New task-specific branch and draft PR only after explicit authorization.

This proposed FILM-S2 is the NEXT bounded slice, corresponding to the old
FILM_SECURITY_REVIEW.md section7 **S3 validation worker**. Its old S2 reservation /
abandonment work is already in accepted FILM-S1; do not reimplement it or confuse
the contract invariant named S2 with a task identifier.

## Scope and ownership proposal

- **Coach Drew:** authorize exact scope and policy terms; approve D3 limits/units,
  D6 decoder/build/licensing/sandbox choice and D7 consent provenance. Settled
  directions do not settle absent detailed records. No deployment approval implied.
- **Claude/backend implementer (proposed):** media worker, generation/state
  transactions, sandbox adapter and server-only artifact promotion, focused backend
  tests. Coordinate exact owned files on issue39 before edits.
- **Codex (proposed independent reviewer):** adversarial fixtures, contract/state
  compatibility, runtime/evidence review; no self-acceptance by implementer.
- **Codex/client owner:** contract-consumer impact assessment only; preserve FS26.
  If wire/state changes are needed, agree a versioned delta before implementation.
- **Security/decoder reviewer designated by Drew:** binary provenance, dependency /
  license review and isolation/resource-limit assessment. A product engineer's
  successful fixture run is not substitute for this review.

Implemented scope proposal: consume only server-owned `validating` Film records
and their exact recorded quarantine object generations. Run a bounded, network-free
probe and permitted media validation/normalization/metadata stripping. Promote only
validated output to private server-owned final storage, then atomically publish
truthful `ready` metadata for the same film/generation; reject invalid media with
contract-valid reason and correct slot release. Keep client reads/writes denied.
No playable-link issuance is provided. Before code, design and review the exact
output path, generation binding, commit sequence and state transition contract.

No frame extraction, playback URLs/player, upload/library UI, clip editing, AI,
provider calls, retention scheduler, orphan sweeper, live infrastructure, billing
or deploy. Current abandoned/invalid-object generation-specific deletion must
remain correct; do not expand it into blanket cleanup. Explicitly document orphan
outputs after crash and hand them to later D4 retention work. Do not delete user
originals or real media.

## Entry gates (before implementation)

1. Drew approves this bounded task and named implementer/reviewer; no execution
   of decoder code or package installation under the current planning request.
2. Attach D3/D6/D7 decision provenance and units/codec policy. If placeholder-only
   synthetic development is separately authorized, retain PENDING annotations and
   deployment block; do not silently convert test constants into approved policy.
3. Review decoder artifact specification: exact source/version/build digest,
   licensed feature set, vulnerability assessment, no-network isolation, temporary
   storage/CPU/memory/wall-time/output limits. Existing proposed FFmpeg recipe is
   not a verified binary and must not be adopted by implication.
4. Agree processing invocation/claim design, retry/crash recovery, state/idempotency
   model, output path and private Storage adapter requirements. Current trigger
   only checks1KiB ftyp and marks validating; it does not already implement this
   worker. Adding event retries is a separate reviewed design change.
5. Reconcile r3 ready-state requirements and reason vocabulary; no invented error
   reason or field accepted by weakening parsers. Freeze deterministic synthetic
   fixtures and expected outcomes independently before repair.

## Required acceptance criteria

| Area | Evidence and pass criterion |
|---|---|
| Selection / authorization | Foreign paths, missing films, wrong statuses, mismatched team/film IDs and stale generations never execute the decoder or promote output. No client-controlled path becomes authoritative. |
| Truthful lifecycle | Validating never means ready. Only successful bounded validation + metadata stripping + generation-bound output promotion can commit ready. Owner change/abandon/expiry during processing cannot resurrect film or produce an accessible artifact. |
| Media validation | Synthetic valid MP4 at each approved boundary; each byte/duration/dimension/codec limit independently at/+1. Corrupt/truncated/spoofed inputs, hostile names, excessive streams/metadata, pathological media rejected; ftyp alone insufficient. |
| Isolation / resource safety | Real chosen decoder, not only mocks: outbound network denied, bounded resources and temp files, sanitized arguments/no shell injection, forced timeout/kill, no host credentials passed to child. Record actual binary/build/environment digests. |
| Metadata | Injected GPS/device/creation tags absent from normalized output; independently inspect output. Do not claim stripping from a mock or command string alone. |
| Generation races | Duplicate events/jobs, concurrent workers, abandoned/cancelled films, object replacement and outputs created before a crash leave consistent state; never read/delete/promote another generation. Version-aware fake plus adapter options; explicitly preserve real-GCS limitation until separately authorized staging verification. |
| Idempotency / failure | Replay does not duplicate promotion/cap accounting. Retryable infrastructure errors distinct from invalid media; failures never falsely ready. Define and test crash points before/after output write and Firestore commit. Retry policy/reconciliation explicitly approved. |
| Private data | Direct client reads/writes remain denied for quarantine/final media/frames. No signed/download URLs, tokens, content, sensitive filenames or real footage in logs. Server output path/digest/generation metadata validated. |
| Contract compatibility | r3 fixtures/schema and client parser remain aligned; emitted ready/rejected/error responses round-trip. Explicitly review any necessary versioned contract delta; preserve every existing assertion. |
| Regression | Existing207 backend,68 rules,36 handler-emulator and146 client checks stay green, plus new independent media cases; no automatic unchanged full core matrix. Resolve any new regressions without suppressions or relaxed limits. |
| Guards | Default OFF, predeploy hook and policy-placeholder gates preserved. Worker behavior under OFF must be explicitly specified: the S1 Film switch currently gates callables, not finalization; never claim it already disables a new worker. |
| Evidence / acceptance | Exact candidate SHA/toolchain/decoder hash, fixture digests, commands, actual pass/fail/skip/process exits, B15 sanitized final-byte inventories and usable logs; independent source-pinned verdict. CI execution is not deployment or real-GCS proof. |

Completion is **bounded implementation acceptance**, not Film feature completion
or beta release. Playback/frame/cleanup/UI/AI, physical devices, actual Storage
semantics and deployment/access verification remain separately owned gates.
MVP remains NO-GO. No estimate or assignment in this proposal authorizes work.

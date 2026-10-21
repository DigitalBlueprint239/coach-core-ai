# FILM-S2b — validation worker (TEST ONLY)

> **Implementation of statement r2** ([#39 c-6294022891](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6294022891)), Codex AGREE c-6294056245, owner authorization [c-6294079240](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6294079240), implementer assignment c-6294157050.
> Branch `claude/film-s2b-worker`, stacked on the agreed r4 contract `6764af9`. The branch does **not** include the PR84 client changes, and no combined-runtime or v2-callable acceptance is implied. Delivery is not acceptance: bounded PASS/FAIL comes from Codex **and** the independent reviewer `session_01EUU9Xh8ytHDPZpzdekH5fT`. The implementer does not self-accept.
>
> **Not authorized and not done:** handler cutover or versioned callable replay, merge, designation change or deploy, staging or live resources, real footage, publication, spending, AI activation. **MVP NO-GO.**

## 1. Files (all new except one guard hook)

| Path | Role |
|---|---|
| `functions/src/film/worker/worker.js` | Orchestrator: job, admission, fenced lease, promotion, cleanup, reconciliation, trigger body |
| `functions/src/film/worker/media.js` | Pipeline steps 2–6 (structural, probe + policy, strict decode, normalize, output validation) and the exact argv (`ARGS`) |
| `functions/src/film/worker/decoder.js` | The S2a harness (`tools/ffmpeg/harness/run-decoder.mjs`, unchanged) with per-step limits, preflight and result classification |
| `functions/src/film/worker/limits.js` | `TEST_MEASURED` per-step limits and the calibration record |
| `functions/src/film/worker/objects.js` | Worker object adapter: generation-pinned reads, create-only uploads, generation-matched deletes with 404 and 412 kept distinct |
| `functions/src/film/worker/designation.js` | `TEST_ONLY` designation, default-OFF switch `COACH_CORE_FILM_WORKER_ENABLED`, export check |
| `functions/src/film/worker/trigger.js` | `onDocumentWritten` definition with `retry: false`. **Not exported** |
| `functions/scripts/film-terms-guard.js` | **One additive hook**: predeploy exits 1 if `functions/index.js` references the worker while `TEST_ONLY`, also with `--check` and regardless of `terms.js` (package §2.2) |
| `functions/scripts/film-worker-calibrate.js`, `film-worker-measure.py` | Calibration on the pinned decoder |
| `functions/test/film-worker*.js`, `test/worker-pinned/**`, `test/emulator/film-s2b.emulator.test.js` | Tests (§5) |
| `functions/test/fixtures/s2b-media/**` | s12–s16 synthetic fixtures, generator, digests, toolchain |
| `tests/rules/film-worker.rules.test.mjs` | Additive deny tests (the rules files are unchanged) |
| `.github/workflows/film-s2b-worker.yml` | The one S2b workflow |

**Byte-unchanged** (proof: `git diff --exit-code 6764af9 -- <paths>`):
- S1 handlers and storage adapter, `limits.js`, `terms.js`, `functions/index.js`;
- v1 and r4 contracts, helpers and fixtures, plus every v1 and r4 test;
- `firestore.rules`, `storage.rules` and the existing rules tests and config;
- `tools/ffmpeg/**`, `firebase.json`, every existing workflow, both lockfiles, and `src/features/film-analyzer/**`.

## 2. Data (server only; client access denied by the existing catch-all rules)

- `teams/{t}/films/{f}`: the S1 film document. It is read through an adapter that converts Timestamps to wire form and validates with r4 `FilmDocument` (legacy-null projection). It is **never rewritten on read**.
- `teams/{t}/filmLedger/cap`: the authoritative S1 ledger.
- `teams/{t}/films/{f}/workerJobs/{jobId}`: **one durable job per (team, film, input generation)**.
  - `jobId` is the hash of those three values, so event, lease and operation IDs can never create a second job or reset its count or its six-hour origin.
  - It holds `createdAtMs`, the cumulative `admitted`, `fence`, `lease`, `attempts[{n, fence, admittedAtMs, end, endedAtMs}]`, counters, `validated`, `intent`, `output`, `terminal`, `recovery`, `exhaustion` and `cleanup`.
- `films/{t}/{f}/jobs/{jobId}/normalized.mp4`: the job-scoped, create-only output.

## 3. Attempt policy: the r4 helpers decide; there is no second implementation

Admission calls `c2.admissionDecision` over the stored job, inside one transaction, and interprets each outcome explicitly:

| Outcome | Effect |
|---|---|
| `admitted` | The **only** processing admission: `admitted+1`, `fence+1`, lease, attempt row |
| `skip-duplicate` / `skip-contention` | Counter only. No film or slot change |
| `stalled-configuration` | Preflight failed (prlimit, digest, uncalibrated limits) **before** admission. Nothing consumed, no decoder, no verdict |
| `refused-exhausted` / `refused-horizon` | No processing. Exhaustion is evaluated once no attempt is admissible |
| `invalid-input` | Malformed stored state is **preserved** and surfaced (log + result). Never forced into a film transition |

- **Crash after admission:** the admitted attempt is consumed. An attempt with no recorded end is treated as `crash` when exhaustion is evaluated, and only once its lease has expired.
- **When `exhaustionOutcome` runs:** only when `admitted == 3` or the six-hour horizon is reached. A two-kill history is never exhausted while attempt 3 is admissible.
- **Interpreting `exhaustionOutcome`:**
  - `rejected` (only `processing-limit-exceeded`, via same-step classified kills): a fenced film + ledger rejection.
  - `recovery-needed`: the job is marked, only while the film is still `validating` with the same owner and generation. The film keeps its slot, and `statusChangedAt` is preserved (T6′).
  - `completed`: never treated as `ready` by itself.
  - `invalid-input`: evidence only.
- **Terminal films are never rewritten.** `ready`, `rejected`, `abandoned` and `expired` are never set back to `validating`, and no slot is reacquired.
- **Platform retry is OFF** (`retry: false`). Further attempts come only by explicit synthetic redrive (`worker.redrive`, test-only). Three attempts do **not** cap invocations, bytes or cost. That boundary is held by the worker being unexported and retry being OFF; live controls are a deploy gate.

## 4. Pipeline: structural validation AND full input/output validation before `ready`

| # | Step | Failure → |
|---|---|---|
| 1 | Generation-pinned download of `objectGeneration`; size equals `declaredBytes` | gone → `input-gone` no-op, attempt ended; transient → `infrastructure`; size → `container-invalid` |
| 2 | Decoder-independent structural check (`ftyp` first, S2a `mp4-boxes.mjs`) | `container-invalid`. **This catches s11a, which the pinned decoder accepts** |
| 3 | `probe-input`: bounded ffprobe (format, streams, chapters) and video packet timestamps; placeholder policy | `metadata-invalid`, `video-stream-missing`, `stream-count-exceeded`, `video-codec-not-allowed`, `audio-codec-not-allowed`, `duration-over-limit`, `resolution-over-limit` |
| 4 | `decode-input`: `-xerror` full strict decode | `media-corrupt` |
| 5 | `normalize`: stream copy of the first video (and audio) stream; metadata, stream metadata and chapters stripped; bitexact; faststart | `output-invalid` |
| 6 | Output validation: structural; `probe-output` (codecs and dimensions equal; duration within ±1 frame interval; **exact** frame-interval histogram equal, so VFR is preserved; tags limited to structural keys, checked by probe **and** a byte scan for every input metadata value, UTF-8 and UTF-16; no chapters; size ≤ `maxBytes`); `decode-output` full strict decode | `output-invalid` |

**Every decoder input** carries `-protocol_whitelist file -enable_drefs 0`, and the binary itself is built with `--disable-network`.
- **s15** carries an external `alis` data reference to a sibling path. In the test that path is a FIFO, so a decoder that followed the reference would block there.
- With references disabled, the run completes promptly. The control run, with references enabled, blocks and is stopped by the wall-time limit.

**Limit kills are classified** (r4 `LIMIT_KILL_SIGNALS`):
- `SIGXCPU`: CPU is set as soft:hard, so it fires before SIGKILL.
- `wall-time`: the harness timer.
- `SIGXFSZ`.
- `allocation-failure`: a decoder-reported allocation failure. Pinned evidence (run 39453385545): under `RLIMIT_AS`, FFmpeg 9.0.2 reports `pthread_create() failed: Resource temporarily unavailable` and exits 245. It never prints "Cannot allocate memory".
- Output flood, or any other SIGKILL: an **unclassified** `SIGKILL`.

**A failure is a media verdict only with positive evidence.**
- **Strict steps** (`decode-input`, `normalize`, `decode-output`) pass only on exit 0 **and** silent error-level output. A decoder that exits 0 on a corrupt stream (observed with the distro ffmpeg on s16) therefore fails.
- **Becoming a verdict:** a failed step becomes `media-corrupt`, `output-invalid` or `metadata-invalid` only when its stderr carries a recognized FFmpeg media-error message (e.g. "Invalid data found when processing input", "corrupt decoded frame").
- **Everything else is `ambiguous`.** That includes the "Could not open encoder" / "Invalid argument" cascade seen under memory pressure. An ambiguous failure is recorded as attempt end `unknown`, which can only lead to recovery-needed, **never** a rejection.
- **Fixture:** s16 (structurally valid, payload corrupted from s10) proves the verdict path at `decode-input`.

**Known property:** stream copy preserves the H.264 bitstream, including in-band encoder SEI text (`x264 - core …`). That is codec payload, not container metadata; removing it would need transcoding, which is out of scope.

## 5. Promotion, ownership and cleanup

1. **Validated record and intent:** one fenced transaction records the validated record (input/output digests and sizes, media facts, decoder digests, policy revision) and the intent (key, digest, size).
2. **Upload:** create-only, with metadata `{jobId, fence, inputGeneration, inputSha256, outputSha256, policyRevision}`.
3. **Ambiguous upload result:** the object is adopted **only** when its downloaded bytes and digest **and** the intent identity all match.
   - Absent object: the same create-only write is repeated after rechecking the live fence.
   - Anything else: **recovery-needed**, with no overwrite, no delete and no `ready`.
4. **Ready commit (fenced):** requires a live lease and fence, `validating`, the same generation, the same owner, the existing slot in `validating`, and the proven output. In one transaction it sets the film to `ready` (`readyAt = statusChangedAt`, `media`, `normalizedGeneration`, `retentionExpiresAt` null) and the **existing** ledger slot to `ready`.
   - **No new slot**, no reserve replay, no receipt rewrite, no timestamp refresh.
5. **Rejection (fenced):** one transaction sets `rejected` with the reason, nulls the new ready fields, and releases the slot **exactly once**.
6. **Cleanup:**
   - **Authority:** the cleanup intent recorded on the job, not a processing lease.
   - **Delete:** generation-matched. A 404 is recorded as `absent`. A 412 is recorded as `mismatch` and **preserves** the object.
7. **Abandonment during work** (the S1 transaction is unchanged, only observed): the next fenced checkpoint fails and the worker stops. Output this job **proves** it owns is deleted under a recorded intent; unknown ownership is recorded as evidence only.
8. **Reconciliation pass** (`reconcileFilm`): decoder-free; it never probes, decodes or remuxes, and never admits an attempt.
   - **Still allowed** after the budget or horizon is exhausted, and after a recovery mark (PR85 R1). A verified promotion moves the recovery record to `resolvedRecovery` with its evidence intact.
   - **Adopts** only output proven against a complete validated record with **the current decoder digests and policy revision**.
   - **Also:** it resumes pending quarantine **and output** cleanup (R4: a failed generation-matched delete is retried, and the film is never reopened), and evaluates exhaustion when it is due.
9. **Strict durable records (R2):** `validated`, `intent` and `output` have strict schemas (hex digests, r4 `media`, decimal generations). A schema-invalid job is an `anomaly`: preserved, logged, never promoted.
   - **Binding check:** before any ownership probe and again inside the ready commit, the records must agree with each other, with the job key, with the film's declared bytes, with the **current** policy revision and with the `PENDING_D3` placeholders.
   - **Prospective state:** the exact resulting document must parse as an r4 `FilmState` before anything is written. Any failure holds the film for recovery with the problem as evidence; the records are left untouched.
9a. **Validation provenance (PR85 re-review R2b, c-6298450957):** before any ownership I/O and again inside the ready commit, the validated record must belong to a **durable admission of this job**:
   - `attemptN` ≤ `admitted`, one attempt row per admission, and the row numbered `attemptN` exists (`validation-attempt-not-admitted`);
   - the record's fence is **that attempt's admission fence**, and across the **whole history** every admission fence is a positive safe integer, distinct, and no greater than the durable job fence (`validation-fence-not-admitted`; re-review c-6298813169). A non-integer fence already fails the strict job schema (`anomaly`, preserved). The intent fence must match;
   - `atMs` lies inside that attempt's window (`validation-outside-attempt`), and the attempt did not end in a media verdict or other non-success end (`validation-attempt-ended-before-validation`).
   - The historical fence is **never** compared with the reconciliation's own, newer fence, so legitimate older output (an earlier attempt's, or one whose first reconciliation died mid-proof) stays recoverable.
   - Invalid records are held for recovery with `evidence.problem` and preserved byte-for-byte.
10. **OFF everywhere (R3):** `onFilmWritten`, `processFilm`, `redrive` and `reconcileFilm` each return `disabled` before any Firestore, Storage or decoder call when the switch is off.

## 6. Limits (`TEST_MEASURED`)

**Method:** `film-worker-calibrate.js` runs each step's exact `ARGS` three times on the pinned decoder in CI, over the frozen and S2b fixtures that **reach that step in the worker**. `decode-input` runs only after probe and placeholder policy, and `normalize` only after a successful strict input decode, exactly as the worker gates them.
- **Fresh outputs:** every measured invocation (repeats and every address-space probe) runs in its **own fresh work directory**, so each normalization writes a **fresh output path** (corrected after the PR85 review: earlier rounds reused one path with `-n`).
- **Same result:** every invocation must reproduce the reference exactly: exit, signal, stdout digest, stderr digest with pointer values masked, and output digest.
- **Intended operation:** the reference must do what the worker needs. Probes exit 0 with output; normalize and decode-output succeed strictly. `decode-input` either succeeds or fails with **positive** media evidence (s16); anything else fails the calibration. It also bisects each command's minimum working address space over a fixed ladder. Any command that doesn't fit the ladder, or any step with no measurements, fails the calibration.

**Derivation:** maximum observed × 3, with floors: wall 10 s, CPU 5 s (hard limit = soft + 2 s, so SIGXCPU comes first), address space 512 MiB, probe capture 8 MiB, normalize file size 1.1 × `PENDING_D3` `maxBytes`, and 1 MiB for steps that write nothing.

**Committed values** (`limits.js`, `status: MEASURED`). The calibration record is the corrected pinned run [39474927341](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39474927341) at `b8b6113`. It superseded run 39452043759, whose normalize rows were not valid measurements (shared output path with `-n`). The limits themselves are unchanged.

| Step | Commands measured | Observed max: min. address space / CPU / wall | Committed: address space / CPU soft / wall |
|---|---|---|---|
| probe-input | 34 | 32 MiB / 14 ms / 14 ms | 512 MiB / 5 s / 10 s |
| decode-input | 8 (incl. s16 media-error) | 192 MiB / 68 ms / 38 ms | 576 MiB / 5 s / 10 s |
| normalize | 7 | **48 MiB** / 7 ms / 7 ms | 512 MiB / 5 s / 10 s |
| probe-output | 14 | 32 MiB / 7 ms / 7 ms | 512 MiB / 5 s / 10 s |
| decode-output | 7 | 192 MiB / 66 ms / 38 ms | 576 MiB / 5 s / 10 s |

- Peak resident memory was 26 MiB or less.
- Lease TTL is 42 s. That exceeds the longest step (10 s) plus grace (2 s) plus a 30 s margin, and the lease is renewed at every step boundary.

**Decoder environment:** decoder processes receive exactly `GLIBC_TUNABLES=glibc.malloc.arena_max=1`, and nothing else. In the static 9.0.2 binary, per-thread malloc arenas reserve address space without using it. The calibration diagnostic shows the worst command (s7, 13 streams; it never reaches decode in the worker) needing 3072 MiB without the setting and 768 MiB with it (run 39452043759).

**Re-measured on every run:** every later CI run re-measures and **fails if any command needs more than the committed limits** (`CHECK_COMMITTED=1`).

These are **not** deploy values. The floors dominate because the synthetic fixtures are small; real footage at the placeholder limits would need its own calibration in a deploy slice. Process limits are **not** a sandbox: runtime containment is a deploy gate.

## 7. Evidence map (package §5)

| Item | Evidence |
|---|---|
| B3 OFF ⇒ zero I/O; B4 unexported + guard; B5 config stall | `film-worker.test.js`, `film-worker-wiring.test.js` (Functions CI) |
| C6–C12 limits, offenders, grandchildren, no-prlimit, deadline < TTL, dref | `worker-pinned` (pinned CI) and calibration notice |
| D13–D17 verdicts for all 19 frozen + 5 S2b fixtures (incl. s16 corrupt bitstream), at-limit, VFR, tags, determinism; policy units +1 ms / +1 px | `worker-pinned`, `film-worker-media.test.js` |
| E18–E23 lease race, stale worker, lost ack, accounting, cleanup, cancellation, ownership change | `film-worker.test.js` (through the S1 handlers) and `film-s2b.emulator.test.js` (Firestore emulator) |
| E24 rules | `tests/rules/film-worker.rules.test.mjs` |
| F25–F28 S1/r4 unchanged; one handoff; no self-acceptance | Frozen-path diff, unchanged Security-gates suites, handoff on #39 |

**Known limitations:**
- The Storage emulator ignores generations and preconditions, so object semantics are proven with a generation-true double. Real Cloud Storage behaviour is a staging proof before any deploy.
- The lead workspace cannot fetch the FFmpeg source or the Firestore emulator binary. Decoder, calibration and emulator evidence therefore come **only** from pinned CI runs. Local dev runs on the distro ffmpeg 6.1.1 are development aids, never evidence.

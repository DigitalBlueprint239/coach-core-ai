# FILM-INT-A — TEST_ONLY integration of the accepted film components

**Scope.** #39 r3 c-6317821255, plus r3.1 c-6317861326, r3.2 c-6319524354 / c-6321423884, and r3.3 c-6325085644.

**Owner authorizations:** c-6319267600 (INT-A); c-6321403255 (r3.2); c-6325123431 (r3.3).

**Agreements:**
- r3: Codex c-6317852399 / c-6317872272; independent reviewer c-6317863054.
- r3.2: Codex c-6321833871; independent reviewer c-6324771142.
- r3.3: Codex c-6325205035; independent reviewer c-6325319361.

**Builder:** `session_018Dkini…`, which does not self-accept. **D8:** Codex (author validation only). **Acceptance:** two bounded PASSes at one exact final SHA C. **MVP NO-GO.**

Nothing here is exported, scheduled, activated or deployed. The worker, the sweep and the reconciler stay TEST_ONLY and default OFF, with platform retry off.

## 1. Composition
Branch `claude/film-integration` from **A7** `638631b` (PR87 LFS; it contains A1 PR82, A2 S2a, A3 r4 and A6 C1). `--no-ff` merges bring in **A5** `da13f834` (PR85 S2b worker), then **A4** `19cca98` (PR84 r4 client), and finally Codex's D8 commit K, unedited. Lockfiles and manifests are byte-equal to all three accepted SHAs.

## 2. Allowed deltas (D1–D9; everything else byte-equal to its authoritative SHA)
The CI script `functions/scripts/film-int-frozen-check.js` derives the owner map: a path changed by A4 relative to A3 → A4; changed by A5 relative to A3 → A5; everything else → A7. It enforces byte-equality for every non-allowlisted path, assertion and test-name preservation for the accepted test files, and ancestry. It was proven to fail on an injected frozen-file change and on an injected assertion change.

| # | Path(s) | Change |
|---|---|---|
| D1 | `functions/scripts/film-terms-guard.js` | union of A5's worker block (**first**) and A7's C1/LFS block, each byte-identical to its side |
| D2 | `docs/COACH_CORE_SHARED_CONTEXT.md` | log entries from both sides, plus the integration entry |
| D3 (I-6) | 8 accepted S2b test paths (r3 7 + r3.2 `film-worker-wiring.test.js`) | wiring only: C1 `cleanupBucketName`/`cleanupBucket` over the same generation store, plus the event `bucket`; wiring-test sandbox location/content, plus removal of the unused `os` import. **No assertion changed.** CRLF/LF bytes of Codex's probes are preserved. |
| r3.3 | `functions/test/lfs-reconcile.test.js` | the r4-valid `ready` fixture only (diff in §4) |
| D4 (I-10) | `functions/src/film/reconcile.js` (`filmProblem` + one import) | the whole stored document validated with A3 `contract-v2` `filmDocument` (§3) |
| D5 (I-9) | `functions/scripts/film-cleanup-admin.js` | read-only, bounded, resumable `list-s2b-recovery` (emulator-only) |
| D6 | `docs/film/FILM_LFS_RECONCILE.md`, this file | Codex c-6315853164 clarifications (gate count 49 → 50; historical-cause wording); D4 note |
| D7 | `functions/test/film-int-{compat,guard,listing}.test.js`, `functions/test/emulator/film-int.emulator.test.js`, `functions/test/fixtures/film-int-captured/**` | CT tests and the CT-5 captures |
| D8 | `src/features/film-analyzer/__tests__/film-int-compat.test.ts` | **Codex**; merged unedited |
| D9 | `.github/workflows/film-integration.yml`, `functions/scripts/film-int-frozen-check.js` | literal-push workflow and owner-map check |

## 3. D4 test-first decision (r3.1): retained baseline
§4 positive **and** negative cases were run on the composed tree with `reconcile.js` **byte-equal to A7**. Result: **1 pass / 10 fail.**
- A7 refused a valid worker `rejected` (`container-invalid` → `schema`), which is false-evidence noise.
- A7 **accepted 9 of 10 corrupted worker `ready` documents**, which is fail-open: the v1 projection drops the r4 fields.

D4 was therefore applied. With it, CT-4.3 passes 11/11.

**Original baseline log** (sha256 `9b9c428381542f333e82a613bfa02bbd1af3620d131f270badb61ec0322fedfa`, 9164 bytes; local Node 22.22.0). Summary lines:
```text
    not ok 1 - positives: worker `ready`, worker-reason `rejected` and the S1 legacy document (absent r4 keys) are valid; a reconciler pass gives duplicate-event with no evidence and no S1 obligation
    not ok 2 - negative: ready without readyAt -> FilmAmbiguous (evidence, no decision)
    not ok 3 - negative: ready with readyAt null -> FilmAmbiguous (evidence, no decision)
    not ok 4 - negative: ready without normalizedGeneration -> FilmAmbiguous (evidence, no decision)
    not ok 5 - negative: ready with a non-decimal normalizedGeneration -> FilmAmbiguous (evidence, no decision)
    not ok 6 - negative: ready without media -> FilmAmbiguous (evidence, no decision)
    not ok 7 - negative: ready with invalid media (codec) -> FilmAmbiguous (evidence, no decision)
    not ok 8 - negative: ready with invalid media (extra key) -> FilmAmbiguous (evidence, no decision)
    not ok 9 - negative: ready with media over the PENDING_D3 byte limit -> FilmAmbiguous (evidence, no decision)
    not ok 10 - negative: ready with a malformed retentionExpiresAt -> FilmAmbiguous (evidence, no decision)
    ok 11 - negative: rejected with an invalid worker reason -> FilmAmbiguous (evidence, no decision)
# tests 11
# pass 1
# fail 10
```
**Exact bytes** (gzip + base64). To verify, run from the repository root:
`sed -n '/^BEGIN-D4-BASELINE$/,/^END-D4-BASELINE$/p' docs/film/FILM_INTEGRATION.md | sed '1d;$d' | base64 -d | gunzip | sha256sum`
```text
BEGIN-D4-BASELINE
H4sIAAAAAAACA+2aX2/bNhDA3/MpbuiDHSCWJUuy/mwt4LVOEWDIgth7TmjpnLCRSI2knLgY+nX2
PfbJRsqS56Swl7n2hgHKS6gjeUce78czRU1HV7BAISln4Lgnb2BSzhRKFcP7ac+zXOj+8bt3BsK1
nNMYBCacJTRDAXOa5bAgGU2JMp251gKPXDyg6D0KqhQySHlS5siUPAH9t6G74JIqukAZ113gViBJ
l7dnjQr9KLVWLf6EicL0FghLQd0jTBzI8I4ky7V66JKZNP+FBw+4lKdABK7G9j2QzUEXREq4M4Yh
LYuMJkRhDxem7yNV98A44IKmyBKs7OlnbY7PMnpXzbKaB+MK+AM40Pt/zwOg1+vVpbQUVcVNrqcS
DK0oHIbDYV2plgXG0DFL16lFGU+q9lrcv+c59pOMlCn2KVP9eckSUyf7pkffBEpPy3sJzwuiLCO0
Psl4MPBit9E3JzQrBU7/svSep3i+kjaNUAguYvitGTRA49W1YF3oyOQec9KB796+BVZm2csmidav
TY2vr29Gk8n4enrx82VjiJHc1I2kRGFmMjaG16N4KiqbMXypJSRRJcnitc1azAvUTjUj7kglaKLG
v+pmTa1UJHl4NplpNWum8ElZPxDG2TLnpXwH3b097A5ixztdGyByyZLKjCVKBl1mXKD7oWAkq1Td
aDlDUZVjx/a9OHjZ/UrwnEq0SJZBl7IUn8B+2WZSUoWvs+F5g69taN8IVW8Wo7nu+yPnSvuQFLsU
3hPBUOppR8PYbVRalvVy82FoIFig2c40qxUxvFSrp5GC3js41x4d5TN6V+oVgG7D0pkBKcWEmu3y
dHMzGOjN4KB6t8LpOFYY+JF9ZDiDIPb3gbNjNOoYmWWY65nPS4myczzkvnzNml6RyX+DWziMnfDA
uK1QKgRPdGhfIUspu6sjWf6tysDb0PhKEtbhajbNvVhwt7DwDZq30+BZvm1HXktDS8MxaDD7N+Mi
17/BPmP6ERmugm8vMLwdSeLbjezKGAPPDW2nZaRl5BgZg+hgZD0TjTqED4eLvy2PHNreVnIiy4v8
YNAmlxacYyWXHFNK9sJjuCOb7KF1KwShpRkInaCFoIXgGNmDsuoNVx2zXbNoyeleRATbEsYBTOzI
EaHten5LR0vHv0CHdo8g5uXwfoSEryRkXzO7ziCBb3ttEmkxOQomq7it7qDM3crV+PLDxeXHmw8u
zJYKIaM53e/FbrSNmMNb3A7PwHJ9OwrDlp6WnuMc4PUJeq7P0ZhqsUJWLcdTQQXKPS9EHHv76f1w
xrYi41sDN/K9qCWmJeaAxKxum+s4ZutfTfXdf33X/48i2KDivEDl8FZ2cOKEg9DewUnjEceyHOdk
49uHA38fshrg87wXRFYU+U51uqqHJs1Sm7EdgF8ncmPH6HrOrqwjx7CLqalvsNWbWlNZ9VnVbhA7
HU+mN+eji59+uR6bKuM847iTN7Dq5ZhiNQdd1sXqQw5TMOr0pqlLCdFrmGndYJ7kAy2Kuqx4yqvC
hpcgcHzL92x/6J38CX5MAe7MIwAA
END-D4-BASELINE
```

## 4. r3.3 before/after (accepted A7 bytes stay in history)
```diff
diff --git a/functions/test/lfs-reconcile.test.js b/functions/test/lfs-reconcile.test.js
index 942bfc9..b651aa3 100644
--- a/functions/test/lfs-reconcile.test.js
+++ b/functions/test/lfs-reconcile.test.js
@@ -244,7 +244,14 @@ describe("L4 no false deletion or decision", () => {
         const b = await w.reserve();
         const eb = await w.lostUpload(b);
         assert.equal(await w.s1.onQuarantineFinalized(eb), "validating");
-        w.db.write(w.filmPath(b), {...w.film(b), status: "ready"});
+        // an r4-valid `ready` (R5/R6: readyAt = statusChangedAt, output
+        // generation and media present), as the S2b worker writes it
+        const fb = w.film(b);
+        w.db.write(w.filmPath(b), {...fb, status: "ready",
+          readyAt: fb.statusChangedAt, normalizedGeneration: "7",
+          media: {bytes: 32, durationMs: 2000, width: 160, height: 90,
+            videoCodec: "h264", audioCodec: null, frameRateMode: "cfr",
+            sha256: "a".repeat(64)}, retentionExpiresAt: null});
         w.advance(16 * MIN);
         const out = await w.run();
         assert.deepEqual(out.outcomes, {"duplicate-event": 2});
```
Every assertion and test name is unchanged. The expected `duplicate-event: 2`, no record, and both objects kept are unchanged. The malformed-`ready` negative at `:702` is untouched.

## 5. Findings recorded during execution
- **STOP #1** (c-6319524354): the eighth D3 path, resolved by r3.2.
- **STOP #2** (c-6325085644): the r3.3 fixture.
- **Both were disclosed as failed preservation runs:** Security 39624314597 (850/851) and 39664965781 (861/862).
- **CT-4.5 table correction** (c-6325385678): frozen finalize reads the head before its duplicate check. So a same-generation finalize is `duplicate-event` while the source exists, and `object-gone` once the worker or C1 removed it. Both are no-write, and the tests assert both branches.
- **Guard (CT-3):**
  - the sweep and the reconciler are refused by source regex **and** the loaded-exports marker;
  - the worker by source regex only;
  - a **disguised worker export passes the guard** and is caught only by the runtime wiring check.
  - **I-4 stays open** until INT-B.
- **Reviewer observation (r3.2):** if `film-worker-wiring.test.js` fails, its sandbox `functions/.guard-*` is left behind (removal runs only after the assertions pass). It's untracked and doesn't affect correctness. Left as approved, with no extra lines.
- **Accepted per-branch workflows on PR-merge runs:**
  - The LFS workflow's frozen job asserts `test ! -e functions/src/film/worker`, so it **fails by construction** on any tree containing A5.
  - Other accepted workflows' frozen jobs compare against their own bases.
  - Those workflow files are frozen; `film-integration.yml` is the authoritative check for this composition. PR-merge runs are separate evidence and are disclosed, never acceptance.

## 5a. PR88 review at C `c413019`: findings and repairs
**Verdicts at C:** Codex FAIL c-6326608577 (non-D8; D8 author validation PASS) and independent reviewer FAIL c-6326638892 (D8 accepted as non-author). Both are preserved. **No runtime product defect was found; all repairs are in D5/D7 only.** The first push of the R88 repairs, `f515d04`, was superseded before review by the F-1 repair.

- **R88-1 (Codex):** the CT-4.5 `ready`/`rejected` abandon "no write" check snapshotted film and job *after* the call and compared it with itself, so it was vacuous.
  - **Repair:** snapshot film, job and cleanup records **before** the call; compare after the `invalid-state` result.
  - **Proof:** Codex's fault injection (`fileName` changed after `invalid-state`) now fails both cases.
- **R88-2 (Codex):** CT-4.4 lacked the I-9 class (d) composed case.
  - **Repair:** `ready` and worker-reason `rejected`, with no quarantine intent and the source present, give `duplicate-event` with no S1 record, delete or evidence, and the job and objects byte-unchanged.
- **F-1 (independent reviewer):** `list-s2b-recovery` class (a) keyed only on `exhaustion.outcome`, so 6 of 7 recovery-held `validating` films were invisible.
  - **Repair:** class (a) = same-generation `validating` with **any active `job.recovery`**, reporting the reason, with `exhaustion` as detail.
  - **Seeded tests:** all **nine** A5 reasons (`attempts-exhausted`, `rejection-precondition-failed`, `reject-precondition-failed`, `ready-precondition-failed`, `precondition-changed-mid-run`, `validation-record-invalid`, `validation-record-stale`, `output-ownership-unproven`, `team-ownership-changed`).
  - **Real-worker tests:** four paths (attempts-exhausted, output-ownership-unproven, team-ownership-changed, ready-precondition-failed).
  - **Controls:** a running job, resolved-only (`resolvedRecovery`, `recovery` null), a different generation, and a non-validating film.
  - The emulator listing adds a non-exhaustion mark and a resolved control.
  - **Proof:** the new listing tests fail 6 of 10 on C's classifier. The reviewer's `s2bclass-probe.cjs` (sha256 `55c2787b…`), unchanged, now lists all 7 reported states.

## 6. Test realism and limits
- The worker runs by **direct invocation** (`processFilm`/`redrive`) with an injected enabled switch. No trigger delivery is claimed.
- Generations, preconditions and listing come from doubles: the Storage emulator ignores generations, and no real-GCS semantics are established.
- **Decoder:** S2a artifact 12263740069 (expires 2026-11-03), or the S2a recipe rebuild. Either way the digests must equal `tools/ffmpeg/SOURCE.json`, and a mismatch is a STOP.
- **CT-5 captures are stored documents**, not v2 callable responses; no cutover is implied.
- `list-s2b-recovery`'s index claim (single-field `in` plus a document-id order, no collection group) is static and is re-verified at C1-D1.

## 7. Not cleared by INT-A
- **C1-D1:** includes I-7, I-8, C1-D1-M (state-version migration) and C1-D1-T (deadline calibration).
- **INT-B:** cutover and designation change, I-1 to I-5 (including worker I-4).
- **S2b deploy prerequisites** (§G 29–34).
- **The D1–D9 term record.**
- **Film Analyzer MVP features** (not built).
- **Promotion** through PR79 to recovery.
- **Staging, devices, rollback and restore.**

## Builder handoff: PR87 repaired at exact SHA `e7fdff33b38f4e9bae7a0276ff25fed6a8881040`

Builder: `session_018Dkini…`. Base `7f3b757`. This repairs Codex FAIL c-6312514310 (review 5597532204) and reviewer FAIL c-6312585072 (R-1, R-2) at `ff7ec57`, against the targets posted at #39 c-6312917818; neither reviewer objected before delivery. Commits: `1675ef4` (the repair) and `e7fdff3` (an L10 null-guard; see CI below). **Requesting both independent verdicts on `e7fdff3`.** I don't self-accept.

### U-1: UTF-8 service order (Codex)
- `reconcile.js` adds `compareNames(a, b)`, which runs `Buffer.compare` over UTF-8 bytes. The cursor and replay filter use it; no UTF-16 comparison of object names remains.
- `lfs-doubles.js` and the loopback servers list, apply `startOffset` and resume tokens in UTF-8 order, as GCS does.
- **Regressions** use the exact pair `quarantine//source.mp4` and `quarantine/\u{10000}/source.mp4`.
  - **Loopback, on the real fetch facade, one object per page with resume-after tokens:**
    - 3 passes, each `[2, passEnded]`;
    - evidence `count` reaches 3 for **both** names;
    - zero media GETs and zero DELETEs;
    - zero `filmCleanup` records.
  - **`limit: 1` per invocation:** runs `[[1,false],[1,true],[1,false],[1,true]]`, and both names reach count 2.
  - **Invocation-budget stop after A:** `stoppedFor: "budget"`, then the next run covers B.
  - Doubles-level equivalents of all three.
- **On `ff7ec57`:** processed 1 per pass, and B is never reached. That is Codex's symptom.

### R-1: non-advancing continuation
- A token page that yields no name past `afterName` counts as a stall in the persisted `listStalls`; a checkpoint or pass end resets it to 0.
- The listing counts as no-progress when:
  - the returned token equals the request token, or
  - the stalls reach `listStallMax` (3).
- On no-progress, the run does one fenced write: `lastError: {code: "list-no-progress"}`, `consecutiveFailures + 1`, `listQuery: null` (falling back to the name cursor). It then stops with `stoppedFor: "list:no-progress"`.
- **Regressions:**
  - **Your probe's double (b), copied verbatim:**
    - run 1 processes 2, then stops with `list:no-progress`; the durable error is recorded with `consecutiveFailures: 1`;
    - run 2 lists `startOffset = name2`, processes 1 and ends the pass;
    - evidence covers 1, 2 and 3.
    - On `ff7ec57` it stopped with `list-limit` and recorded no error.
  - **A fresh non-advancing token on every call:** the stall count carries across invocations, the error lands at the cap, and the next run resumes by name.
  - **Control:** a legitimate empty page with an advancing token is followed with no error.

### R-2: emulator L10
- The always-true check is gone. Each result must be **exactly one** of `skipContention`, `acquireError` or an acquired summary.
- **At most one** result has `processed > 0`.
- A leftover lease is advanced past **only** when a result explains it: `acquireError`, a `stoppedFor` of `state:*`, or the new `releaseError`. Otherwise the test asserts the lease is null.
- "Exactly one delete" and "never two deletes" are kept.
- **`releaseError`** is reported only when the fenced release **and** release-if-mine both fail. A deterministic unit test covers three cases: fail [3,4] gives the error and a leftover lease; fail [3] gives neither; no failures gives neither.
- "One holder" is dropped from the title. A sequential second acquire is legitimate; at most one run makes progress.

### Evidence
| Check | Result |
|---|---|
| Local (Node 22.22.0) | `npm test` **741/0/0** (729 + 12 new); `node --test test/lfs-*.test.js` **141/0**; eslint clean; terms guard OK |
| New regressions on `ff7ec57` (new tests and doubles, old source) | 10 fail as expected (Unicode ×5, R-1 ×2, R-2 ×1, plus the comparator precondition ×2), and 1 control fails only on the missing new `listStalls` field |
| Frozen surfaces | `git diff --exit-code 7f3b757` clean for the frozen set; `lfs-transport.js` and `.github/` unchanged vs `ff7ec57` |
| LFS workflow, push **39581459566** @ `e7fdff3`, attempt 1 | success: focused **260/0**, emulator **46/0**, rules deny **6/0**, frozen job passed |
| Security gates, push **39581459466** @ `e7fdff3`, attempt 1 | success: Functions **741/0**, film emulator **36/0**, rules **68/0**, bundle scan **12/0** (runs automatically on push; changed code, so not an unchanged rerun) |
| E2E push **39581459664** | cancelled, per standing instruction; not acceptance |

**Disclosure:** push run 39581080665 at `1675ef4` **failed** in the emulator job (45/1). L10 threw `TypeError` reading `lease` of an absent state document. Both concurrent acquires had failed on emulator lock contention before any commit, which `acquireError` explains. My rewrite dropped the old `st &&` guard. `e7fdff3` restores the null-safety and adds results to every assertion message. No reconciler code changed between `1675ef4` and `e7fdff3`. I couldn't run the emulator locally (jar download blocked), so the emulator counts come from CI only.

**Limits:**
- The Unicode names are noncanonical paths: they get evidence only and are never re-driven.
- The JSON API returns well-formed UTF-8 names only.
- No real GCP endpoint was used.
- No hard invocation deadline is claimed (r3 §C).

Not authorized and not done: activation, scheduling, live resources, real footage, spending, merge, deploy, AI. C1-D1, I-6, I-9 and I-10 remain separate. **MVP NO-GO.**


---
_Generated by [Claude Code](https://claude.ai/code)_

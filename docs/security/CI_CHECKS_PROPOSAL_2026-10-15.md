# Proposal: separate required acceptance checks from diagnostic / obsolete checks (2026-10-15, Claude)

**Status: proposal only.** Nothing here is implemented, no branch-protection setting is changed, and no failure is hidden. The decision is Coach Drew's (queue B11).

## Problem
Every full E2E run concludes `failure` on GitHub (evidence 40, 48) even when the **acceptance** bucket is 1,520/0, because the same job also runs:
- **diagnostic** tests (`[diagnostic]`: N2-D0–D4, N3-D5), which record behaviour and are expected to fail under the WebChannel fault model on the REST runtime (N2-D2 6/10);
- the **obsolete-fault-model** test (`[obsolete-fault-model]`: original N2-A2).

A reviewer sees a red check and must read the annotation to learn that acceptance is clean. That is the wrong default for a required check, and it also makes a genuine acceptance regression harder to spot.

## Principles
1. **Nothing is removed or weakened.** Every test that runs today keeps running on every candidate, with the same assertions, timeouts and `retries: 0`.
2. **Failures stay visible.** Diagnostic and obsolete results are still published as annotations and artifacts with the same `diag` and `diag-data` detail, and still appear in the evidence folder.
3. **Separation is by job, not by filtering inside a job.** The reporter's buckets already exist; this moves them to separate jobs so each has its own conclusion.
4. **Branch protection is not changed by this proposal.** If Coach Drew wants the acceptance job to become a required status check later, that is a separate explicit action in GitHub settings, recorded in the checklist.

## Proposed job layout (same workflow file, same matrix per browser project)

| Job name (per project) | Grep | Purpose | Conclusion means |
|---|---|---|---|
| `E2E acceptance (<project>)` | `--grep-invert "\[diagnostic\]|\[obsolete-fault-model\]"` | Release evidence. Candidate must be green here | red = an **acceptance** test failed |
| `E2E diagnostics (<project>)` | `--grep "\[diagnostic\]"` | Observability: N2-D0–D4 lifecycle, N3-D5 probe | red = a diagnostic safety assertion failed (e.g. more teams than submitted) — **still investigated**, not a release gate |
| `E2E obsolete fault model (<project>)` | `--grep "\[obsolete-fault-model\]"` | Historical N2-A2, kept per Coach Drew's decision | red is expected on the REST runtime; recorded, never counted |

Phone projects run only `PHONE_WORKFLOWS` and would have empty diagnostic/obsolete jobs; `--pass-with-no-tests` (already in place) keeps them green and honest.

## Reporting changes (harness only)
- The annotation title already prints `acceptance a/b · diagnostic c/d · obsolete-fault-model e/f`; unchanged.
- Add one summary line per job to the GitHub job summary so the three conclusions can be read without opening annotations.
- Evidence files keep capturing all three jobs for a run under one evidence number, as today.

## Cost
Three jobs per project instead of one: wall-clock per job falls (acceptance ≈ 45–55 min desktop at ×10), total runner minutes rise by the emulator start-up (~3 min × 8 extra jobs). The 120-minute job limit is untouched.

## What this does *not* do
- It does not make N2-D2's timeouts "pass"; they remain red in the diagnostics job and in the report.
- It does not retire N2-A2; it runs on every candidate.
- It does not change `retries`, timeouts, assertions, or the 8-second status requirement.
- It does not alter which checks GitHub requires for merge.

## Decision requested (B11)
- **Option 1 (this proposal):** split into three jobs; acceptance conclusion stands alone. Harness-only change by Claude; verify by running both layouts on the same candidate SHA once and comparing totals.
- **Option 2:** keep the single red-but-bucketed job and rely on the annotation title.
Either option keeps MVP **NO-GO** until the queue's gates are closed.

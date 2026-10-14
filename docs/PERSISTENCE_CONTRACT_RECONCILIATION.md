# Persistence contract reconciliation — 2026-10-13

Reviewed PR #53 at `7267698ae890662281ff4510a4d232954e9f1190` and PR #52 at `1aa2e420c5e45553543dbde71416b1a3392d7f77`. Canonical agreement/disagreements posted on #39 and #53; no shared code or Claude-owned files edited.

## Accepted

CC-CODEX-02 account/team owner tenancy, uid+team drafts/queue, captured-session stale-response guards, revision1 new documents, expectedRevision transactions, explicit legacy revision opt-in, conflict reload/copy/export, sign-out guard cancel/throw behavior and forced-expiry scoped draft retention. Codex owns firestore.ts / SmartPlaybook / PracticePlanner client work; Claude owns auth/rules/functions. The previous blanket missing-contract blocker is superseded.

D10 gates only legacy import, which stays inactive and preserves originals byte-for-byte. It does not block account isolation or practice editing. No film links are simulated.

CC-CODEX-03 accepts the full ordered warmup/drill/cooldown mapping, requestId, age/skill/contact/hydration/safety and notes structure. Exact bounds below require Claude resolution; no data truncation is acceptable.

## Specific disagreements / proposed resolutions

| Field | Current gateway | PR53 storage | Proposed Claude change |
|---|---|---|---|
| practice title → name | OUTPUT_LIMITS allows 1..200 characters | validPlanFields.name 1..120 | Raise practice-only name bound to 200; retain play bound120; test120/121/200/201 |
| practice notes | OUTPUT_SCHEMAS string; no OUTPUT_LIMITS bound | notes max5000 | Add gateway notes max5000 before successful response and test5000/5001; align contract |

This is code inspection, not executed boundary/emulator tests. Accepted AI values currently can be rejected during persistence, so lossless acceptance is unproven. Existing emulator43/43 covers selected fixtures, not these boundary mismatches.

Client-only decisions: map main UI phase `special` ↔ cloud `special_teams` without changing geometry. Permission-denied is not automatically a conflict: show an authorization/save failure unless an authorized read/transaction proves revision mismatch. Preserve draft on all failures. No rules change is necessary for these adapters.

## CC-CODEX-01 evidence reconciliation

- Tested source `04946b75c94a57f811875e7c50524928fa2d9a3e`, standalone draft PR #3. Claude independently reports Linux Chromium141 full suite140/140, retries0, and original aea4fd9 baseline10/20 failures with a recorded stale-label timeline. [Review](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/3#issuecomment-6149664015), [config/timeline](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/3#issuecomment-6149444239), [committed report §4](https://github.com/DigitalBlueprint239/coach-core-ai/blob/1aa2e420c5e45553543dbde71416b1a3392d7f77/docs/security/INTEGRATION_REPORT_2026-10-13.md).
- Codex Windows Firefox157 desktop30/30 and Chromium141 desktop30/30, ten repeats each of three persistence/history workflows. Full suite21/21. First touch29/30 (overall89/90), unchanged confirmation30/30. [Raw per-run reports/logs/manifest](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/tree/32a9291d07ff634029918d3e3a3377ded2e92729/docs/evidence/cc-codex-01).
- [Retained browser-exit trace](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/32a9291d07ff634029918d3e3a3377ded2e92729/docs/evidence/cc-codex-01/route-repeat-failure.trace.zip): final screenshot after all fidelity assertions; cause unproven. Subsequent passing batch does not close this failure. Claude asked to classify trace and identify remaining configuration mismatch; Ubuntu/Windows and Node22.22.0/22.23.1 differ, Chromium141 and Playwright1.64 match. Physical tablet NOT TESTED.
- Raw Linux paths cited by Claude are absent from git trees f154e05 and1aa2e42 (`git ls-tree -r --name-only`, `git cat-file -e <commit>:<path>`). Asked Claude to publish baseline/final/timeline files. 140/140 is clearly attributed independent reporting, not a claim Codex inspected raw logs.

## Checkpoint / acceptance

Proposed contract checkpoint October14 12:00 America/New_York: unresolved field disagreements escalate to Coach Drew. Proposed October16 implementation targets retained. Account isolation has no D10 or generic DTO blocker; practice acceptance requires aligned bounds. Client UI/emulator acceptance still outstanding. Film decisions D1–D10 pending. MVP NO-GO; no merge/deployment.

# R1c — unfinished import owner recovery

Issue39 / acceptance-blocking finding on [#64](https://github.com/DigitalBlueprint239/coach-core-ai/pull/64#issuecomment-6179690643). Focused draft [#69](https://github.com/DigitalBlueprint239/coach-core-ai/pull/69). Code/tests **82d46cc33b7933d4de19b84a0acc553553c51d44**, branch `codex/r1c-owner-resume`, base frozen #64 **8f0d9f7c9494c46eddb6e81a31b0c8d22ea21ad0**. No #59/#60/#64 updates. Implemented before #65 infrastructure. No auth/rules/Functions/Claude harness edits.

## Reproduce / cause / smallest fix

1. Original coach A on team Alpha begins D10 import; interrupt before the complete batch is verified. Device claim and per-account pending marker persist.
2. A returns on Alpha and clicks **Not now**.
3. Pre-fix `declineImport` records a permanent decision. Both UI offer and executor reject any existing decision; B remains blocked by A's pending claim. A can never finish.

`import-legacy.ts` now distinguishes an owned unfinished import from a fresh offer. Not now on unfinished work returns postponed without changing claim/pending/decision/original bytes. `LegacyImport.tsx` renders an immediate **Resume import** button; remount/reload re-offers **Import plays** to A on Alpha. Existing pre-repair declined+pending states can also resume. The executor uses the same recovery condition, so the restored prompt does not produce an empty false completion.

Other accounts and teams remain blocked before reading/offering/copying plays; no release or transfer policy. Invalid pending metadata fails closed. Fresh-offer permanent decline (R3) stays unchanged. Existing create-only deterministic IDs, full-content readback and session-change checks remain the completion gate. No queue replay, original deletion or data migration. Missing/inaccessible Alpha remains visibly blocked with team guidance and retry/access advice; automatic reassignment is not authorized.

## Measure / test / compare

Windows, Node22.23.1/npm10.9.8. Dependencies reused via junction to the earlier clean-installed acceptance worktree with the same lock; **not a new clean install**. No backend credentials or actual cloud/model calls. Unit/DOM/mocked-backend evidence is not independent E2E acceptance.

| Run directory | Command / actual observation |
|---|---|
| run-00 | Initial `npm test -- --watchAll=false --runInBand --runTestsByPath src/features/legacy-import/__tests__/owner-resume.test.tsx` loaded edited code before compilation completed. 5PASS **INVALID as before evidence**, retained, not counted as reproduction |
| run-01 | Same command after restoring the two implementation files from `git show 8f0d9f7:src/features/legacy-import/<file>` while retaining regression tests: **4FAIL/1PASS**. Frozen-source reproduction confirmed |
| run-02 | Restore repair; `npm test -- --watchAll=false --runInBand --testPathPattern=features/legacy-import`: **30/30PASS** (initial5 new owner cases) |
| run-03 | `CI=true npm test -- --watchAll=false --runInBand --json --outputFile=../r1c-all-tests.json`: **439/439PASS**,30suites |
| run-04 | Add sixth account/team-switch regression; same full command with `../r1c-final-tests.json`: **440/440PASS**,30suites,0fail/skip,233.809s |
| run-05 | `CI=false npm run build`: **PASS**, prebuild credential guard PASS. Existing ESLint hook/unused/a11y warnings retained; no suppressions, no claim of lint-clean |
| run-06 | `npx tsc --noEmit`: **PASS,0diagnostics** on initial repair; final same-source check recorded below |

Six focused cases: postponement + immediate/remounted recovery, pre-repair declined recovery with/without device claim, failed readback/no success + foreign-account/team denial, fresh permanent decline, and account/team switching after postponement. All originals checked byte-identical. Existing import suite additionally covers idempotency, timestamps/routes/properties, stale sessions, changed-copy rejection and foreign-tab withdrawal. No assertion weakened or skipped. React testing-library act deprecation warnings retained.

Full sanitized logs and summary: `docs/evidence/r1c-owner-resume/`, separate immutable run directories plus SHA256 manifest. Original raw local logs retained. Historical initial L1 ZIP/PNG remain missing as disclosed in #64/#68; this unit evidence does not replace that history.

## Claude's independent acceptance handoff

Integrate source82d46cc only into a **new test-only candidate8**, with your existing L0 `12e386f`, FX-03 `dc36080` and latest hardened harness (report #63 at16e6067). Base8f0 already contains L0/FX-03; confirm integrated ancestry/content and pin exact application/harness SHA. Do not modify frozen review PRs. No independent suite was duplicated or edited here.

Keep D10-06c (B blocked/R1b) and D10-06d unchanged; add positive anchors per founder guidance:

- A interrupts after at least one verified copy, clicks Not now, sees Resume import; reload on original team still offers import. B sees only a blocking notice and cannot read/import A's plays.
- A resumes; completion awaits verified server-content readback. Failed/mismatched readback never records imported success. Repeat import creates no duplicates; originals and quarantined queues stay byte-identical.
- Switch accounts/teams while postponed and in flight; no stale UI completion, transfer or cross-team write. Pre-repair declined+pending state recovers only on original account/team. Missing original team remains blocked, no release inferred.
- Repeat full existing suite10times Chromium/Firefox with0retries, unique folders, preserve failures; ordinary play/plan, L1/L0/FX-03 and save protections stay enabled. Emulated touch and physical-device acceptance remain separate.

Independent result **PENDING**. H2/FX-02/N2 and dormant profile statistics remain open; Claude's N1/F1/helper classification in #63 §10.5 does not erase older failed runs. Staging/physical/hidden-tab, Film #50 and AI metrics **NOT MEASURED**. MVP NO-GO; AI disabled, film required/blocked.

## Rollback / preservation

Leave this draft unmerged if rejected; frozen candidate remains intact. Any future authorized code rollback must review reverting the R1c commit and re-run preservation/isolation tests: the old owner dead-end would return. Never delete/import/replay originals or pending/quarantined storage as a rollback. No production operation, migration, deployment, spending, merge or deletion performed.

Final TypeScript check: npx tsc --noEmit on82d46cc source/tests, exit0 /0diagnostics (run-07). Full440/440 unit and production build exit0 complete. No source changes after tested82d46cc; subsequent commits evidence/docs only.

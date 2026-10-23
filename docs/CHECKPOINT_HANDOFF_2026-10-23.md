# Checkpoint handoff — Elite Broadcast UI + Smart Playbook formations (2026-10-23)

**Checkpoint SHA (both tracks branch from this):** `0f0f9138f12c02d9bf1b6df534ee3be5116a3a96`
Branch `redesign/elite-playbook-formations`, base `c7baeb006a1fc01a6c9986088e1b1594927f9aba` (head of `claude/film-integration`, INT-A / PR #88, draft, do not merge).
Draft checkpoint PR is stacked on `claude/film-integration` so only the five checkpoint commits show. The normal target, `recovery/coach-core-mvp-2026`, does not contain INT-A; integration into recovery is **unresolved** and needs an assigned integration owner.

No merge, deployment, branch-protection change, AI or Film activation. MVP NO-GO.

## Checkpoint commits

| # | Commit | Purpose |
|---|---|---|
| 1 | `9467fa0af8923029d16aa94c12452edac5fa75b9` | Restore Tailwind v3 build (pin 3.4.19; config deleted in 861747c) |
| 2 | `db7900ffe8f360d6b8ebd0b31e813e5f07d5cede` | E2E harness: configurable emulator/app hosts for isolated runs |
| 3 | `4048f65f6915493549f4c893e409c09c1d001cc5` | Elite Broadcast UI for shell, Teams, Practice Planner, Smart Playbook (presentation only) |
| 4 | `abda5b061b705dbadc7ca82917e64a39a6929e47` | Smart Playbook tour as an accessible dialog |
| 5 | `0f0f9138f12c02d9bf1b6df534ee3be5116a3a96` | Formation and control fixes ported from Windows repair candidate `32f46d34821380dc69c8eaf37554bfc26f71fa06` (functional subset of `ffc51c217306d4c81dcb22d7b11f8e52ebac12e8` and `32f46d3`, PR #91). Tailwind v4 build workaround, launcher and updater excluded. |

Task branches created at the checkpoint: `kev/playbook-improvements`, `drew/film-analyzer`. No new implementation lands on the checkpoint branch.

## Kev — Smart Playbook owner

Owns `src/components/SmartPlaybook/**`, `src/features/persistence/playRoutes.ts`, `src/features/legacy-import/**`, and the Playbook browser tests (`e2e/tests/coaching.spec.ts` CC-P15, `e2e/tests/sdk-edit.spec.ts`, `e2e/tests/legacy-import.spec.ts`).

1. **Formation scheme review.** `src/components/SmartPlaybook/formationReferences.json` holds Shotgun Doubles (10 personnel, 2x2, RB offset left), I Right (21 personnel, TE right, under center), 4-3 Over (strength right) and 3-4 Base (5-0-5). Each has 11 players; offense has exactly seven on the line; defenders are all upfield of the LOS. Coordinates are illustrative: OL splits are 2 yards for readability and jersey numbers are 1–11 placeholders. Coach sign-off is required before release.
2. **Unresolved compatibility issue — old saved-play field offset.** Plays saved before commit 5 used the old field (LOS at canvas y=150). The corrected field draws the LOS at y=190, so older plays render about 4 yards above the drawn line. Opening an old play changes nothing (verified on an exact copy of an existing saved play: status stays saved, players and routes identical, no `formation` key added, no write). **Do not migrate automatically.** Any realignment must be an explicit coach action with export and undo.
3. **CC-E4 test setup.** `sdk-edit.spec.ts` never marks the Playbook tour complete, so the tour overlay blocks the Shotgun click. Reproduced on the repaired baseline without the redesign. Fix the setup; do not weaken assertions.
4. **Show Debug** is visible to every user; needs an environment gate or a removal decision.
5. **Design gaps vs the approved boards:** the field drawing is the repair's plain half-field (no Elite route styling); phone panels stack instead of the board's tabs; Load/Save stay in Play Management; the phone tour overlay sits below the bottom navigation, which stays tappable.
6. **Repair-candidate limits carried forward:** native Windows run of the repair ZIP/launcher is BLOCKED and independent acceptance of `32f46d3` is pending. This checkpoint does not resolve either.

## Drew — Film Analyzer owner

Owns `src/features/film-analyzer/**`, `functions/src/film/**`, the Film sections of `firestore.rules` and `storage.rules`, and Film A0 work (kept out of this checkpoint).

- Film Analyzer is self-contained at the checkpoint: it imports only its own contracts, nothing outside imports it, and it is not routed in the UI. AI and Film stay OFF.
- **Known failure:** `src/features/film-analyzer/__tests__/film-int-compat.test.ts` fails 1/112 on Windows checkouts with `core.autocrlf=true` (CRLF bytes in a hashed fixture) and passes 112/112 from a clean LF checkout. Recorded, not fixed.

## Shared-file coordination rules

1. One owner per change. Before editing a shared file, post the intended change on the coordination issue and name the owner; the other track rebases after it lands.
2. Keep shared-file edits in small, separate PRs; never bundle them with track features.
3. Two agents never push to the same branch.
4. Stay on Tailwind v3. Do not adopt the v4 workaround from `codex/windows-playbook-repair`.
5. Each PR updates this document's successor entries in `COACH_CORE_SHARED_CONTEXT.md` and `MVP_7_DAY_SPRINT.md`.

| Shared file / area | Why it is shared |
|---|---|
| `src/ui/AppShell.tsx`, `src/components/Dashboard.tsx` | Navigation destinations; "Film review · unavailable" is in the shell footer; adding Film routes touches both |
| `src/ui/elite-broadcast.css`, `src/ui/coach-core.css`, `public/index.html` | One design system and font loading for every screen |
| `src/features/persistence/model.ts`, `gateway.ts`, `useDocument.ts`, `drafts.ts` | `Kind` is `'plays' \| 'practicePlans'`; Film persistence would extend these |
| `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Team isolation for plays and film in one ruleset |
| `functions/src/index*`, `functions/package*.json` | One Functions deploy unit (`ai`, `film`) |
| `e2e/playwright.config.ts`, `e2e/tests/support/**`, `e2e/scripts/**` | Shared harness and isolation environment variables |
| `package.json`, `package-lock.json`, `tailwind.config.js` | Dependency and Tailwind v3 pin |
| `docs/COACH_CORE_SHARED_CONTEXT.md`, `docs/MVP_7_DAY_SPRINT.md` | Coordination record |

## Test evidence and limitations

All runs used disposable Firebase emulators and preview servers on 127.0.0.2/127.0.0.3/127.0.0.4. A tripwire on the developer stack's 127.0.0.1 ports and in-browser route guards recorded zero requests to 127.0.0.1.

- **Full browser suite, Elite tree (commits 1–4), run 2:** 178 passed, 6 failed, 0 skipped, no retries configured. Failures: CC-E4 Chromium and Firefox (test setup); E2E-AI01b Chromium (timed out inside a direct gateway call; passed 3/3 targeted); CC-P16b, D10-11, N2-D1 Firefox (navigation click did not switch views; passed 9/9 targeted; cause unresolved). Targeted passes do not erase the run-2 failures.
- **Run 1 (first Elite cut):** 148 passed, 36 failed; 34 were redesign regressions (signed-in email hidden on phones; base stylesheet ordering), fixed before run 2.
- **Commit 5 tree:** Playbook, persistence, Teams and shell specs (desktop and phone projects) 112 passed, 2 failed (CC-E4 ×2). Dedicated formations workflow: Chromium 36/36; Firefox 36/36 on the second attempt (first attempt timed out at Save Play, recorded). Covers every preset equal to the reference, defense/offense switching, drag, undo/redo, route drawing and editing, route origin tracking, save → refresh → reopen exact JSON, same-coach team isolation and cross-coach isolation.
- **Unit:** 1044/1045 on the commit 5 tree (known CRLF failure above).
- **Onboarding through the normal UI:** dialog role and name, focus on Next, Tab trapped, keyboard completion of all seven steps, completion stored, Help reopens at Step 1, Escape and Skip tour close.
- **Not measured:** native Windows run of the repair package, physical devices, staging, authenticated production acceptance, independent review of this checkpoint.

## Other unresolved defects

- Join Team helper says 6 characters and the input accepts 6, but team codes are 8 (joining is disabled in the private beta).
- Intermittent Firefox navigation/save timing in browser tests.
- Git author identity is not configured on the delivery machine (supplied per commit).

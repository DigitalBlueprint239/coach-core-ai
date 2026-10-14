# Coach Core AI — Seven-Day MVP Recovery Sprint
Window: **Oct 13–20, 2026** (aggressive target, not guaranteed launch). One status document shared through GitHub.

## Day 1: Evidence and blockers
**Codex owns:** import four previous audit reports into `outputs/` with raw commands, tool versions, reproducible test evidence; fix 2 failing main tests and unloaded suite, or attach reproducible cause. Inventory 810 TS errors by category, not file count alone.
**Claude owns:** independent *read-only* review of auth, Firestore rules, AI secret exposure, minimum secure beta architecture. Produce a PR touching documentation only, no production secrets.
**Gate:** both agents report precise blockers, sources, commands, baselines.

## Day 2: Fix unsafe gates
Codex: test and correct build/typecheck configs and targeted frontend reliability. Claude: implement security repairs only on an explicitly assigned security branch after agreeing non-overlapping files with Codex.
Gate: prioritized blockers fixed or scoped out from shipping.

## Day 3: Playbook reliability
Codex: drag + undo/redo, play loading/saving & validation, targeted regression tests. Claude: independent review of code diffs and negative tests. Gate: repeatable play workflow verified.

## Day 4: Authentication and persistence
Assigned developer: secure login/demo isolation, Firestore rules + ownership, save/reopen cross-session; preserve staging data. Gate: isolated test users cannot access other teams' resources.

## Day 5: Practice planner and integration
Selective Smart Playbook module integration into main app only if tests pass. AI must go server-side or be disabled in beta. Gate: end-to-end coach workflow.

## Day 6: Private deployment
Deploy a restricted staging preview with Firebase Hosting if credentials and plan are approved, capture exact URLs, config, rollback, logs. Test phone/tablet; perform security smoke tests. Never publish publicly without approval.

## Day 7: Coach acceptance / release decision
Run launch checklist. Ship ONLY if evidence passes all security + functional gates; otherwise demo known-good flows privately with mocks and publish a transparent blocker list.

## One daily report format (commit or PR in this file)
Date/owner | GitHub branch & PR | Passed/failed/blocked tests + exact commands | Files changed | Security issues | What remains | Next owner. No unverified percentages.

## Strict controls
- Codex and Claude do not share hidden context or update each other's chat memory. Share decisions via this GitHub repository only.
- Do not add keys, personal player data, customer records, or credentials.
- Preserve `master`, Smart Playbook `main`, existing Firebase projects.
- If waiting on access or unresolved critical vulnerabilities, do not ship.


## Integrated-candidate repeat verification — 2026-10-14 / Codex

Application/runtime tested: `4757eaffad31664dae727c34355aca8109fcc63c`, includes #64 `8f0d9f7`, L0 `12e386f` and FX-03 `dc36080`; frozen #59/#60/#64 unchanged. Measurement checkout `codex/acceptance-verification-4757eaf`; separate docs-only review branch `codex/acceptance-evidence-4757eaf`, based on recovery, is not a runtime candidate. Clean installs; Jest434/434; TS0; emulator and local release-shaped builds PASS, release proof13/13, credential-canary12/12; both production audits0. Windows functions npm-script discovers0 (not PASS); explicit tests72PASS/1FAIL retained, then73/73 serial unchanged. CRLF lint2113 failures retained; exact committed LF blobs lintPASS, no source diff.

Full unchanged Claude-authored suite x10 each engine, retries0/skips0: Chromium 429PASS/1FAIL; Firefox 426PASS/4FAIL. L1/R1b/L0/FX-03 anchors and ordinary play/plan protection totals in existing `L1_R1B_REPAIR_HANDOFF.md` and `evidence/acceptance-4757eaf/summary.json`. N1 D10-01 library read (Firefox02/07, Chromium08; full matrix authoritative) and H2 D10-07 timeout (run03), plus N2 D10-05 team-setup failure (run10, overwrite assertions NOT REACHED), remain FAIL; later passes do not resolve them. Functions timing failure and profile-statistics NOT_FOUND warnings retained, owner Claude. Codex execution is not Claude independent acceptance. Claude #63 candidate6 independently430/0 each; hardenedcandidate7 R1cFAIL10/10 each plus H2Firefox1/10; references and comparison in existing handoff.

All new runs use unique output folders with retained failed raw ZIP/PNG and published redacted results/hash metadata. Old initial L1 raw ZIP/PNG remain NOT RETAINED; earlier logs/results/DOM/hashes remain and new runs do not replace that history. Claude next: classify local N1/H2/N2/functions/provisioning findings alongside his independent results; futureR1c repair Codex, candidate8 Claude. Staging/physical/genuine hidden tabs/standalone retained touch NOT MEASURED or open. AI disabled, film blocked, MVP NO-GO; BDN-AEO-001 queued. No merge/deploy/spend/live changes/deletion/new features.

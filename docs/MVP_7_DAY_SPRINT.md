# Coach Core AI — Seven-Day MVP Recovery Sprint
Window: **Oct 13–20, 2026** (aggressive target, not guaranteed launch). One status document shared through GitHub.

## Day 1: Evidence and blockers
**Codex owns:** import four previous audit reports into `outputs/` with raw commands, tool versions, reproducible test evidence; fix 2 failing main tests and unloaded suite, or attach reproducible cause. Inventory 810 TS errors by category, not file count alone.
**Claude owns:** independent *read-only* review of auth, Firestore rules, AI secret exposure, minimum secure beta architecture. Produce a PR touching documentation only, no production secrets.
**Gate:** both agents report precise blockers, sources, commands, baselines.

## Day 2: Fix unsafe gates
Codex: test and correct build/typecheck configs and targeted frontend reliability. Claude: implement security repairs only on an explicitly assigned security branch after agreeing non-overlapping files with Codex.
Gate: prioritized blockers fixed or scoped out from shipping.

**Daily report — 2026-10-13 / Claude / #43 #46** | Branch `claude/day2-security-gateway` → recovery (PR pending review) | Passed (GitHub Actions, no secrets): rules emulator 30/30 (`npm --prefix tests/rules test`, `demo-coach-core-beta`), functions 69/69 + lint (`npm --prefix functions test`), web auth/AI client 21/21, bundle credential scan 10/10 (`bash .github/scripts/bundle-canary-scan.sh`; same script fails 4 checks on the base). Local: full web suite 360/360, `FieldMemo` suite load failure pre-exists (fixed in #40). Not tested: real-browser sign-in on a live project | Files: rules, `tests/rules/**`, `functions/**`, security workflow + scripts, auth/AI shared frontend files claimed on #39, `TeamContext.tsx`, `PracticePlanner.tsx`, `public/sw.js`, `firebase.json` headers, `package.json` prebuild line | Security: F-01..F-06, F-08, F-10 (partial), F-12 fixed; functions prod advisories 23→0; independent review M1/M3/M4/M5/L1–L3 fixed | Remaining: founder actions in `docs/security/CLAUDE_SECURITY_DAY2.md` §6; PR #47 ADR amendment (OpenAI-only); Playbook local storage per-user keys (Codex) | Next: founder §6 → approved staging deploy; Codex frontend AI screens on `coach-ai-client.ts`; Claude Day 3 diff review.

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

## D10 founder approval and implementation — 2026-10-13 / Codex

Coach Drew explicitly approved consent-based legacy import implementation/testing only, recorded #39 and docs/security/FOUNDER_DECISION_PACKET.md. NO merge/deployment/spending/deletion. D1–D9 pending. Source6a412e71993038069882920c9c16ba30914534bc on codex/d10-consent-import, stacked #54. Sixteen unit/DOM/mocked-SDK tests pass, TypeScript0, build PASS; originals preserved. Full-suite known logger/FieldMemo failures retained. Real browser/rules P13 awaits Claude; Java absent locally. D10_IMPORT_HANDOFF.md records commands/evidence/limitations and accept/decline/repeat/account-switch scenarios. CC02 normal cloud edits/sign-out conflicts and CC03 plan persistence remain outstanding. PR53 bounds amendments accepted; no contract disagreement remains, checkpoint escalation paused. MVP NO-GO.

## CC-CODEX-02/03 implementation milestone — 2026-10-14 / Codex

Draft PR59 implements ordinary authorized play save/reopen and editable manual/prior-AI practice persistence, scoped per-editor device recovery, truthful acknowledgements, revision conflicts, sign-out and retry. AI generation disabled; film-dependent connections blocked. Applicable PR40 tests incorporated unchanged: logger and FieldMemo failures disappear (382/382 existing tests). Reviewed source a91264c / application code8dcf9a7:415/415 total implementation tests, TypeScript0, production/emulator buildsPASS with retained warnings; credential canary12/12PASS. Frozen dacb189 browser12/12PASS (Chromium156/Firefox157); reviewed18-case run16PASS2FAIL (Firefox sign-out navigation and background-tab reload), retained and being investigated with explicit navigation checkpoints. These are Codex implementation measurements, not independent acceptance. PR54ecc6400 incorporated; Claude retains auth/rules/functions/e2e and will independently write P10–P17. D10 reviewed device claim/pending-team/no-team repairs included without rebuilding import or deleting originals. R3/R4 remain documented limitations.

Separate draft PR60: production dependency findings10→4→0; full graph107→98 still unresolved. No framework upgrade or force. Commands, failures, acceptance labels, rollback and evidence in ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md and COACHING_DEPENDENCY_REPAIR.md (dependency branch). Final source IDs/results will accompany handoff. D1–D9 pending; D10 implementation/testing approval unchanged. BDN-AEO-001 queued. No production merge, deployment, spending, live data/configuration or deletion. MVP NO-GO pending security and independent coaching acceptance; October16 targets remain proposed.

Final client milestone: PR59 sourceff9b421669c1154ab52288f9cda1c7516bfb1ed5,416/416PASS,TS0,production buildPASS (warnings retained). Browser checkpoint06e222e18/18PASS on Chromium156.0.8078.4/Firefox157.0, no retries; preceding16/18/6/8/0/8 failures retained. This does not close Firefox reload stability or independent acceptance. Source/evidence manifest and acceptance labels in docs/ACCOUNT_COACHING_PERSISTENCE_HANDOFF.md. Claude owns independent P10–P17/P13/security. PR60 integrated final-source dependency testing continues. NO-GO; BDN-AEO-001 queued.

CC-CODEX-02/03 + F-11 final candidate milestone (2026-10-14): PR59 client ff9b421 (416/416,TS0,buildPASS), PR60 integrated runtime da8ebe1 / browser5d04077 (416/416,TS0,production/emulator buildPASS,18/18Chromium156/Firefox157,retries0). Production dependency10→4→0; all-graph107→98 (including3critical tooling entries) remains open. Applicable40 logger/FieldMemo failures disappear. docs/COACHING_DEPENDENCY_REPAIR.md and docs/evidence/coaching-dependencies contain commands/versions/before-after failures/results/hashes/rollback. Claude next: independent P10–P17/P13×10, REST protocol/authorization/account cache/conflict review. Previous Firefox failures, standalone touch/exit, physical/staging/security gates remain unresolved. AIgenerationoff; Film Analyzer required but blocked pending implementation/approvals (D1–D9pending); D10 approved implementation/testing only, originals intact. CC02/03 implemented, acceptancePENDING; MVP NO-GO. BDN-AEO-001queued, October16targetsproposed. No protected merge/deploy/spending/live changes/deletion.

## Retained Firefox navigation investigation — 2026-10-14 / Codex

Separate codex/firefox-navigation-investigation from frozen60@2cf1a5c; #59c21c0c6/#602cf1a5c untouched. No new client review findings on #39/#59/#60/#61, so retained failures investigated. Original P14 trace: reload cancelled at94.713ms after earlier51.569s email-button locator/action delay, Auth response2.339ms; background-hang claim unsupported, upstream delaycauseOPEN. Sign-out UI can precede application hard reload; owned test callbacks now wait for document replacement and actions/navigation bound10s (not60), unchanged assertions/retries0. Controlled diagnostics30PASS/10FAIL across Chromium156/Firefox157 (5repeats/case/engine): all10FAIL reproduce real pending-logout sign-in input loss. Claude-owned auth correction requested #39comment6172893033; no auth/rules/functions/e2e edits. Selected existing coaching regression18/18PASS; new test tooling type errors2→0. Headless focus variants allreportedvisible; genuinely hidden/physical/staging NOT MEASURED. FIREFOX_NAVIGATION_FINDINGS.md and new evidence retain every result, originaltracehashes andcausalbarrier reproductions; no all-green or blanketfixclaim. AIoff,filmblocked,MVP NO-GO,BDN-AEO-001queued. D1–D9 directionssettled perCC007/currentfounderinstruction, detailedrecordprovenancegap remains; no reapproval requested. Independentacceptancepending. No protectedmerge/deploy/spend/livechanges/deletion.

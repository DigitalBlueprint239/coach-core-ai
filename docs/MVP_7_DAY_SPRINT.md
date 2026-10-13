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

**Daily report — 2026-10-13 (Day 3) / Claude / #50 #39** | Branch `claude/day3-film-security-review` (docs only, stacked on #49) | Film Analyzer now required (founders). Reviewed Codex PR #51 spec: design accepted with required changes and 10 founder decisions; see `docs/security/FILM_SECURITY_REVIEW.md`. Ownership confirmed on #39 (owner-only tenancy; Claude: rules/functions/worker/playback/frame/AI; Codex: `src/features/film-analyzer/**`). Independent run of standalone PR #2: tsc 0, unit 18/18, canary 0, audit 0 = PASS; browser suite intermittent on Linux Chromium 141 (13/14 first run; route undo test 3/6 on repeat), likely a stale-"Saved" checkpoint race, so browser-PASS is not confirmed. Combined regression and staging smoke plans written (`COMBINED_REGRESSION_PLAN.md`, `STAGING_SMOKE_TEST_PLAN.md`). Status: security code PASS (unmerged); film, shared-device persistence and editable practice save FAIL (not implemented); staging BLOCKED. Next: founder decisions D1–D10; slices S1–S11. Oct 20 = conditional demo; Oct 27–30 = conditional full-MVP assessment, not a launch. MVP NO-GO.

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

**Daily report — 2026-10-13 (CC-NEXT) / Claude / #39** | PR #52 (`f154e05`), draft PR #53, candidate `claude/integration-candidate-2026-10-13` @ `32bd4e8` (no PR) | Passed: Playbook PR #3 browser ×10 140/140 (Linux Chromium 141, desktop + touch emulation); candidate web 366/366, tsc 0, build, rules emulator 43/43 (CI), functions 69/69, bundle scan 10/10. Failed: none. Blocked: second browser engine (sandbox), physical devices, emulator E2E R10–R13, film (D1–D7), staging (D5), client persistence P-10..P-16 (Codex) | Files: `docs/security/{INTEGRATION_REPORT_2026-10-13,FOUNDER_DECISION_PACKET}.md`, `docs/evidence/integration/*` | Security: no new blockers; main-app prod advisories 10 open | Next: Codex Firefox ×10 + #53 confirmation; founder D1–D10.

**Daily report — 2026-10-13 (CC-NEXT-04) / Claude / #39** | PR #54 `claude/e2e-emulator-harness` @ `2f8c61e` (stacked on #53 `a4cea1e` → #49); docs #52 | Passed: E2E on Firebase emulators, Chromium 156 + Firefox 157, ×10 140/140 each (14 runnable incl. 4 SDK-in-browser), rules (with P-08b), functions 73/73, bundle scan 12/12 | Blocked: 8 client workflows (Codex P-10..P-17) and D10; film (D1–D7); real Google/email auth + CORS/token checks (staging, D5); physical devices | Files: `e2e/**`, `src/firebase.ts` emulator block, `src/e2e-support/**`, `.env.production`, workflow, guard/scan lines | Security: production bundle leak of test hooks caught by new scan check and fixed pre-merge; `COACH_CORE_ALLOWED_ORIGINS` must be a JSON array (smoke SEC-09) | Next: Codex flips P-10..P-17 to real tests; founder D5/D10.

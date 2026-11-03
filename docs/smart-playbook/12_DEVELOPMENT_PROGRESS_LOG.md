# 12 — Development Progress Log

Newest first. Each entry: change · requirement/task · validation evidence · limitations · next task.

## 2026-11-03 (2) — M0 reconcile + M1 intelligence contracts (branch `docs/smart-playbook-master-audit`, PR #106)

**Owner directive recorded:** RD-01, RD-02, RD-03, RD-07 and product decisions 1-6 (01, 07, 10, ADR-001/002/004/005/006).
**Corrections:** PR #95 did measure frame times (approx. 18-33 ms desktop / 24 ms emulated on HD 4000); audit and
ADR-006 updated.
**Security:** standalone repo history scanned; no real credentials committed; no rotation needed (10).
**Staging:** confirmed shared with production; separation plan recorded (10, RD-05).

**Code (football-core, no UI change, no AI enabled):**
- `findings.ts` — explainable `Finding` (code, severity, subject, rule basis with profile version and authority,
  manual options) and `Evaluation` (ok / unsupported).
- `eligibility.ts` — receiver eligibility under a profile (`ends-and-backs`); QB returned as unsupported.
- `model.ts` — v3 assignment union (route, run-track, block, protect, motion, read) + ball actions; lossless v2 adapter;
  unknown schemes kept as `unspecified`.
- `install.ts` — `installConcept(concept, formation, profile)`: every assignment kept; missing slot, ineligible
  receiver, unsupported QB route and illegal formation reported as findings.
- `advisory.ts` — read-only, coach-requested advisory contract; disabled advisor returns deterministic facts.
- `rules.ts` — profile gains `eligibility` model field.
- Tests: `intelligence.test.ts`, `advisory.test.ts` (incl. static guard: no AI imports in playbook screen or engine).

**Validation:** CI on PR #106 (recorded in the PR once green). **Not football-reviewed yet** (no review group).

**Limitations:** eligibility ignores jersey numbering and QB rules; profile is draft (unsourced); no run-scheme
resolution yet; `installConcept` not yet wired into the editor UI.

**Next:** T-104 v3 play document + migration → T-107 Inside Zone vs 4-3 Over → T-109 revision concurrency.

## 2026-11-03 — Phase 0 audit + T-101 rule profiles (branch `docs/smart-playbook-master-audit`)

**Changes**
- Created `docs/smart-playbook/01…12` and `adr/ADR-000…007` (audit, parity, gap matrix, domain architecture,
  2D/3D plan, AI & verification policy, roadmap, backlog, risks, acceptance matrix).
- T-101 (SP-V12): `src/football-core/rules.ts` — versioned `RuleProfile` (`eleven-player@1`, draft until
  sourced), `RULE_PROFILES`, `DEFAULT_RULE_PROFILE`, `ruleProfile(id)`; `validateFormation(f, profile?)` reads the
  player count and line minimum from the profile; default behaviour unchanged. Exported from `football-core`.
- Tests: `src/football-core/__tests__/rules.test.ts` (AT-13).

**Validation (PR #106, CI 2026-11-03)**: `test-and-build` ✅ — lint (0 warnings), typecheck, unit **52 files / 598 tests passed**
(incl. `rules.test.ts` 6/6), production build; `firestore-rules` ✅ 39/39; `preview` ✅. Not run locally (machine policy:
builds and tests run in CI/cloud on this laptop).

**Corrections recorded**: competitor baseline missed GoArmy Edge Football's free 2D→3D playback (03).
**Security finding**: standalone repo inlines `GEMINI_API_KEY` into its client bundle via Vite `define` (02 §5).

**Limitations**: only the existing 11-player profile; other profiles (8/9/6-player, 7v7, NFL FLAG) await sourced
rules (T-102). No behaviour change for coaches.

**Next**: T-105 source registry → T-103 model v3 types (needs ADR-001 approval) → T-104 migration → T-106 install
with conflicts → T-102 sourced profiles.

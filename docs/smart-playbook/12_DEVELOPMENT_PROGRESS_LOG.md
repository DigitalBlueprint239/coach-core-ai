# 12 — Development Progress Log

Newest first. Each entry: change · requirement/task · validation evidence · limitations · next task.

## 2026-11-03 — Phase 0 audit + T-101 rule profiles (branch `docs/smart-playbook-master-audit`)

**Changes**
- Created `docs/smart-playbook/01…12` and `adr/ADR-000…007` (audit, parity, gap matrix, domain architecture,
  2D/3D plan, AI & verification policy, roadmap, backlog, risks, acceptance matrix).
- T-101 (SP-V12): `src/football-core/rules.ts` — versioned `RuleProfile` (`eleven-player@1`, draft until
  sourced), `RULE_PROFILES`, `DEFAULT_RULE_PROFILE`, `ruleProfile(id)`; `validateFormation(f, profile?)` reads the
  player count and line minimum from the profile; default behaviour unchanged. Exported from `football-core`.
- Tests: `src/football-core/__tests__/rules.test.ts` (AT-13).

**Validation**: CI on the PR (lint, typecheck, unit, build, rules emulator, preview) — results recorded in the PR.
Local runs not possible on this laptop (no installed dependencies; per machine policy builds run in CI/cloud).

**Corrections recorded**: competitor baseline missed GoArmy Edge Football's free 2D→3D playback (03).
**Security finding**: standalone repo inlines `GEMINI_API_KEY` into its client bundle via Vite `define` (02 §5).

**Limitations**: only the existing 11-player profile; other profiles (8/9/6-player, 7v7, NFL FLAG) await sourced
rules (T-102). No behaviour change for coaches.

**Next**: T-105 source registry → T-103 model v3 types (needs ADR-001 approval) → T-104 migration → T-106 install
with conflicts → T-102 sourced profiles.

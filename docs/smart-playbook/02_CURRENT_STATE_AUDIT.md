# 02 — Current State Audit

Audit date: 2026-11-03 · Auditor: Kev's engineering lead (Claude Code) · Method: source inspection of git
refs (not local working copies), CI logs, staging walkthrough. Anything not inspected is marked so.

## 1. Source of truth

| Repository / location | State observed 2026-11-03 | Role |
|---|---|---|
| `DigitalBlueprint239/coach-core-ai`, branch **`recovery/coach-core-mvp-2026`** @ `ef7b061` | Protected (PR + `test-and-build`, `preview`, `firestore-rules`; strict; admins included). Auto-deploys to staging. | **Authoritative build** (agreed with Drew's lane via #104 / issue #39) |
| same repo, `master` @ `0774caf` | Older; broken submodule historically; feeds nothing current | Historical |
| `DigitalBlueprint239/Coach-Core-Smart-Playbook-` (`main` @ `6b4c42c`, 2025-11-21, 5 commits) | Standalone Konva/GSAP designer (AI Studio-style). 61 remote branches; recent pushes (2026-11-01…03) are **Drew-lane private evidence receipts** (`codex/evidence-*`), not product code. | **Reference only** — mine for ideas, never deploy as-is |
| `DigitalBlueprint239/Coach-Core-Smart-Playbook-V3-` | **Empty** (0 KB, no default branch; last push 2025-11-23) | Unused |
| Local `C:\Projects\coach-core-ai` | `master`, one untracked file (`COACH_CORE_AUDIT_2026-10-15.md`) | Owner's folder — must stay untouched |
| Local worktrees `coach-core-ai-{foundation,phase1,phase2,security,ci,design,sp3d}` | Feature worktrees; `sp3d` holds the 3D prototype (#95) | Working copies |

**Recommendation:** keep `recovery` as the single source of truth (ADR-000). The standalone repo's useful
ideas are ported selectively as tested PRs; its code is not merged wholesale.

## 2. Stack (trunk)

React 19.1 · TypeScript 5.8 · Vite 8.3 · Vitest 5 · Tailwind 4 · Firebase JS 11.10 (Auth: Google +
email/password, anonymous linking; Firestore) · Sentry React 11 (off until DSN) · ESLint 0-warning gate ·
emulator rules tests · Firebase Hosting (staging on merge; production behind manual workflow, never yet used
from recovery). AI: `src/ai-brain/` (TypeScript, 1,608 LOC) + server proxy contract — **switched off**
(`REACT_APP_AI_ENABLED` unset). No 3D dependency on trunk.

## 3. Subsystems on trunk

| Subsystem | Location | Size | Tests | Observed state |
|---|---|---|---|---|
| Football engine | `src/football-core/` | 888 LOC, 10 test files | yes (CI green) | Pure TS. Yards coordinates. Formations (11 players, ≥7 on line — hard-coded), slot numbering (#1–#3 strong/weak, backs, QB), mirroring, 14 pass routes, concepts as slot assignments (`route` / untyped `protect` / untyped `block`), 4-3 alignment by coverage (Cover 0–4 shapes), rule-based `recommend()`, terminology, verification types, library + draft queue + `decisions.json`. **No run game, no blocking schemes, no rule profiles, no flag/8-/9-man, no special teams, no pressures.** |
| Smart Playbook v2 screen | `src/features/playbook2/` | 2,263 LOC, 14 test files | yes | SVG blueprint field, drag/nudge/keyboard edits, reducer undo/redo, local autosave draft, Firestore save (`plays`, schemaVersion 2), library view, terminology panel, assistant card, step-through read, owner content review. Behind `REACT_APP_ENABLE_PLAYBOOK_V2` (on in staging/previews, off in production). **Verified end-to-end on staging 2026-11-02** (team → play → assistant → save → reload). |
| Smart Playbook v1 | `src/components/SmartPlaybook/` | ~7,900 LOC (incl. 24-file Chakra subtree excluded from build) | 3 test files | Canvas editor (`Field.js`, `PlayController.js`), local templates, localStorage play list; legacy JS. Shown when flag is off (i.e. production today). **Deprecate** after v2 parity. |
| Auth | `src/components/AuthProvider.tsx` | — | yes | Single system; verified on staging. |
| Teams | `src/contexts/TeamContext.tsx` | — | rules + unit | Owner-only; join-by-code disabled pending design. |
| Rules | `firestore.rules` | — | 37 emulator tests | **Deployed live 2026-11-02**. Teams/plays/practicePlans/users/waitlist; everything else closed. |
| Practice planner | `src/features/practice-planner/` | — | not inspected in depth | Legacy; reachable from Dashboard. Status: implemented-unverified. |
| Exports | — | — | — | **None on trunk.** |
| Player access / quizzes | — | — | — | **None on trunk.** |
| Film / scouting | — | — | — | **None on trunk.** Film is Drew's lane; CRA-era, not ported (issue #39). |
| Offline | — | — | — | Service worker retired (kill switch); only a local autosave draft. |

## 4. 3D prototype (PR #95, not merged — "EXPERIMENT ONLY")

`experiments/smart-playbook-3d/` on `experiment/cc-sp3d-002-r3f-camera-lift`: React Three Fiber 9.8 + three
0.187, isolated (no Firebase/persistence). Architecture: frozen stored play → pure `projectPlays()` adapter via
**explicit, versioned coordinate profiles** → canonical yards scene → `Field2D` and `Scene3D`; presentation-only
view state machine; camera "lift" from matched overhead. Evidence (on this i5-3230M/HD 4000 laptop): 3D players
within **0.01 yd** of 2D positions; cold ready ≈ 0.7–0.83 s; warm enter p50 ≈ 31–35 ms ready, ≈ 1.1 s full
transition; unit 38/38; browser desktop 18 pass / 1 skip, tablet & phone 16 pass / 3 skip (emulated).
**Not measured:** frame rate / frame-time distribution, memory, real devices. **Not connected** to the
football-core model (it reads v1 pixel plays). Route-path animation only (Tier A at best).

## 5. Standalone repo `main` findings (verified against source, 2026-11-03)

Confirmed present: React + TS, Konva/react-konva 10/19, GSAP, formation/route/concept/alignment/coverage
services, quiz/install/gameplan/situational services, export service, wristband UI, AI services
(`aiService.ts`, `aiCoachingService.ts`).
Confirmed weaknesses:
- **Credential exposure by design:** `vite.config.ts` `define`s `process.env.API_KEY = GEMINI_API_KEY`, inlining the
  Gemini key into the client bundle (`services/aiService.ts` calls `@google/genai` from the browser). Any build
  with the key set leaks it. → never deploy; never port this pattern (trunk already forbids it: guard test
  `no-client-secrets.test.ts`).
- **No tests on `main`** (only `TESTING.md`); the later test/Playwright work lives on Drew-lane branches.
- **Play schema is presentation-centric**: `Play { formation: string, players[], routes[], paths[], defenseOverlay?, defenseCoverage? }`
  — no assignment semantics, blocking, coverage rules, timeline or rule set; insufficient for 3D/simulation.
- **Browser-local persistence** (`localStorage` for favorites/panels/UI).
- No 3D (grep for three/WebGL/Babylon finds none).
Not verified this pass: quiz-to-player workflow depth, AI recommendations' use of assumed tendencies (code
read pending), interaction hooks completeness → listed as open in `10_RISKS_AND_OPEN_DECISIONS.md`.

## 6. Content state (football-core)

Verified 6: formations Doubles, Trips Right; pass concept Smash; coverages Cover 2, Cover 3; matchup Smash→Cover 2.
Drafts 19 (formations 2, concepts 6, defense 4, matchups 7). Run plays 0. `decisions.json` empty.

## 7. Known technical debt / duplicates

- Two Smart Playbooks (v1 legacy JS, v2 TS) — consolidate on v2 (ADR-003).
- Two play schemas in `plays` (v1 pixel, v2 yards) — readers filter by `schemaVersion`; migration adapter planned (ADR-001).
- Coordinate formats: v1 pixels, v2 yards, sp3d profiles — unify on yards with explicit profiles (ADR-002).
- `src/ai-brain/` exists but has no grounded-evidence pipeline and is off.
- Staging shares production Firebase project/data.
- ~30 Drew-lane draft PRs (#68–#94) on the old toolchain; reconciliation via issue #39.

## 8. Test & CI baseline (latest trunk runs)

`test-and-build` (lint 0 warnings, typecheck, Vitest unit ≈ 470+ tests, production build) ✅ ·
`firestore-rules` 37/37 ✅ · `preview` ✅ · staging deploy ✅ (`ef7b061`). No end-to-end browser suite on trunk.

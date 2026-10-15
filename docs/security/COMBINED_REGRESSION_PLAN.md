# Combined Regression Plan + Playbook PR #2 Review (Claude, Day 3)

2026-10-13. Covers what must pass, together, once the reviewed PRs are integrated. Nothing here is merged or deployed.

## 1. Independent review of standalone Playbook PR #2

PR: `DigitalBlueprint239/Coach-Core-Smart-Playbook-#2` (`codex/playbook-core-workflows` @ `aea4fd9`, stacked on #1). I reproduced it in a throwaway worktree on Linux (Node 22.22.0), not on Codex's machine.

| Check | Command | Result |
|---|---|---|
| Install | `npm ci` | exit 0 |
| Typecheck | `npx tsc --noEmit` | **PASS**, 0 diagnostics |
| Unit tests | `npm test` (vitest) | **PASS** 18/18, 2 files |
| Canary build | `node scripts/check-bundle.cjs` | **PASS**, 0 violations; separate grep of `dist/` for `api.openai.com`, `generativelanguage`, `GoogleGenAI`, `aistudiocdn` also 0 |
| Production advisories | `npm audit --omit=dev` | **PASS**, 0 |
| Browser suite | `npx playwright test` with a local config: same specs and projects, Linux Chromium 141 (`/opt/pw-browsers/chromium-1194`) instead of Edge 154 | **FAIL, intermittent**: first full run 13/14; repeat ×3 of the route test: 3/6 failed |

**What fails:** `real route waypoint drag and property transactions undo redo`.
- After *Undo*, the persisted route still has `depthYds: 20` instead of the pre-edit value. In other runs the failure is at the redo-after-flip assertion.
- In a scratch variant that **polls** persisted state instead of trusting the "Saved" indicator, every undo/redo assertion that was reached passed. Failures then moved earlier, to "drag changed the route points".

**Likely cause:** the `checkpoint()` helper can return on a *stale* "Saved" label from the previous save, before the new state is written. That makes the test non-deterministic. A real transaction bug on Chromium is **not ruled out**.

**Required before PR #2 counts as browser-PASS:**
1. Make `checkpoint()` wait for a persisted change. For example, compare a save revision or timestamp before and after, or `expect.poll` the stored play.
2. Re-run with `--repeat-each 10` on Chromium **and** Edge/WebKit, with zero failures.
3. Record the engine and version in evidence.

**Security observations on PR #2 (no blockers):**
- Legacy browser AI is neutralized two ways: `process.env.*KEY` is defined as `undefined`, and the AI services are aliased to disabled stubs. The AI Studio import map was removed from `index.html`.
- No new `innerHTML`, `eval` or `fetch` sinks.
- Saves no longer delete corrupt originals and now surface storage errors.
- IDs moved from `Date.now()` to `crypto.randomUUID()`.
- `localStorage['coachcore-playbook']` is global. That is acceptable standalone, but **must become per-user cloud persistence on integration** (`FILM_SECURITY_REVIEW.md` §5).
- jsPDF upgraded to 4.2.1; PDF text is rendered as text, not HTML.

## 2. Merge order (proposal, each after review)

1. Main **#40**: test-suite repair. The `FieldMemo` suite still fails to load on recovery; `logger` test fix.
2. **#42**: Day 1 docs.
3. **#45**: Codex docs.
4. **#49**: Day 2 security.
5. **#51**: film spec docs.
6. **This Day 3 docs PR** (stacked on #49).
7. Film and persistence slices S1… in the order of `FILM_SECURITY_REVIEW.md` §7.

Standalone **#1 → #2** land on the standalone recovery branch only. The apps are **not merged** (founder instruction).

Trial merges already run: #49 + #40, #42, #45 and #51 are each clean.

## 3. Combined regression suite (run on the integrated revision)

Record for each run: revision SHA, command, engine/version, exact counts, and real vs mocked provider/media. No skipped or loosened tests.

| # | Suite | Command | Expected after integration |
|---|---|---|---|
| R1 | Main web, full | `CI=true npx react-scripts test --watchAll=false` | All suites load (**#40 must fix `FieldMemo`**). ≥360 tests from #49 plus #40's, 0 failures. No `useAuth must be used within an AuthProvider` log |
| R2 | Main typecheck | `npx tsc --noEmit` | exit 0 |
| R3 | Main production build | `npm run build` (runs the prebuild env guard) | exit 0; existing lint warnings listed, none new |
| R4 | Rules emulator | `npm --prefix tests/rules test` | 30/30 (PR #49), plus film rules (S1) |
| R5 | Functions | `npm --prefix functions run lint && npm --prefix functions test` | 69/69 (PR #49), plus film callables, worker and frame tests |
| R6 | Bundle credential scan | `bash .github/scripts/bundle-canary-scan.sh` | 10/10, plus film checks (no signed URLs or download tokens in bundle) |
| R7 | Standalone unit/type | `npm test && npx tsc --noEmit` (standalone) | 18/18, 0 diagnostics |
| R8 | Standalone browser | `npx playwright test --repeat-each 10` on ≥2 engines | 14 tests × 10, 0 failures (after the checkpoint fix) |
| R9 | Standalone canary | `node scripts/check-bundle.cjs` | 0 violations |
| R10 | Auth integration (new, emulator) | Auth + Firestore emulators, Playwright on the main production build | Sign-in variants and gate states; anonymous blocked; beta grant/revoke via script against the **Auth emulator** |
| R11 | Coaching workflow (new, emulator) | Same environment | Create team → play save/reopen → AI practice plan (mock provider) → edit → save → reload identical → sign-out clears only that user's data |
| R12 | Film workflow (new, emulator) | Storage + Functions emulators with synthetic MP4s | Reserve → upload → validate → play (signed URL) → mark/tag → save → reload identical → link to play/plan → frame preview → mocked suggestion accept/edit/reject → delete film → objects gone |
| R13 | Negative security pass | Scripted | Every R10–R12 read, write, URL and job repeated as coach B, anonymous, non-beta and unverified: all denied |
| R14 | Dependency audit | `npm audit --omit=dev` (main, functions, standalone, tests/rules) | 0 high/critical in shipped services, or a written disposition per finding |

CI wiring: R1–R6 already run in the `Security gates` workflow (R1 partially). R10–R13 need the Auth, Storage and Functions emulators and `ffmpeg` on the runner (`apt-get install ffmpeg`, used only to generate synthetic fixtures).

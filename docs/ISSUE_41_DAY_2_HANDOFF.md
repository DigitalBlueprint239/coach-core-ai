# Issue #41 — Day 2 handoff

Date: 2026-10-13. Owner: Codex. [Assignment](https://github.com/DigitalBlueprint239/coach-core-ai/issues/41). Standalone implementation: [PR #1](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/1) into `recovery/smart-playbook-mvp-2026`. Source baseline: `6b4c42c0d18a2a0364a3cf72f62bbc4535517e58`. Standalone branch: `codex/issue-41-types-drag-history`.

This main repository PR changes documentation only. It is prepared as a **draft held until PR #40 lands**, following the assignment's dependency. It does not import standalone application code, merge applications, approve deployment, or change main authentication/security. Canonical recovery status changes require review and merge; no automatic merge has occurred.

## Results and evidence

| Check | Before | After |
| --- | --- | --- |
| TypeScript | 810: 807 missing DefaultTheme members, 1 required GlobalStyles theme prop, 2 CopyIcon call sites | 0, including tests; exit 0 |
| Final drag regression suite | 5 failed, 2 passed against original context | 7 passed, 0 failed/skipped against repair |
| Production build | Original audited build passed | Pass, 544 modules; main chunk 1,448.88 kB, 449.67 kB gzip |
| Clean lock install | Original repo had no tracked lock | npm ci passes |
| Dependency audit | 1 original critical | 1 existing critical jsPDF; no new test-tool findings |

Evidence at implementation commit `2b90b760b27650f944bdb24dc49e810c4acafaaf`: [full evidence report and commands](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/2b90b760b27650f944bdb24dc49e810c4acafaaf/docs/ISSUE_41_RECOVERY_EVIDENCE.md), [result summary](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/2b90b760b27650f944bdb24dc49e810c4acafaaf/docs/evidence/issue-41/results.json). Logs include baseline/final typechecking, failing/passing regressions, clean installation, builds, dependency audits, and temporary scaffolding failures clearly distinguished from final checks.

Substantive verification commands in the standalone checkout:

```powershell
npm ci
npx --no-install tsc --noEmit
npm test
npm run build
npm audit --json
```

Node 22.23.1 / npm 10.9.8 / TypeScript 5.8.3. All original audit-locked versions were preserved, including React 19.3.0 and Vite 6.4.4; no application framework upgrades. Added Vitest 4.1.11 and JSDOM 26.1.0 for tests, React DOM types, explicit original React types, test/typecheck scripts, and a committed lockfile. The initial test-tool selection had new dependency findings; it was replaced with a patched Vite-6-compatible runner before publication. Exact commands and intermediate errors are in the linked report.

## Repair scope and practical limits

Typing repairs: augment styled-components from exported AppTheme, remove required explicit theme prop from GlobalStyles, and forward standard SVG props on CopyIcon/CheckIcon. No new any/suppressions/exclusions.

Player drag repair: PlayerLayer updates the React playbook only at drag end; its callback previously marked that final change minor, creating no undo entry. The repair commits the final coordinates while the immutable pre-drag playbook is still present. Stationary/unknown-player moves add no history. Tests cover move, undo, redo, new move after undo, one step per drag, no-op, and saving without history.

Tests use the real drag-end handler, snapping, context/history, and save service. React-konva rendering and Konva pixel capability probing are mocked in JSDOM; native desktop/touch gestures and browser pixels are not verified. Synthetic localStorage is isolated; no user/backend data access. Gemini/API keys are unset and no env files were added.

The generic handleCommitInteraction snapshots already updated present, affecting route/property transient-edit transactions by inspection. It remains unchanged; this PR repairs player drags only. Existing storage validation/export defects, large-chunk warning, jsPDF finding, client Gemini credential risk, and main AuthProvider problem are not resolved by this work.

## Next owners

- Reviewer: review standalone PR #1, then merge only with explicit review authorization; hold this documentation draft until main PR #40 lands and reconcile latest shared context.
- Codex: separately scope native pointer/touch tests and route/property interaction transactions; preserve existing features.
- Claude: independent authentication/security review and explicitly assigned security implementation; jsPDF and client Gemini handling remain review items.

**Private MVP remains NO-GO** pending security and critical coaching workflow gates. No production branch, Firebase data, deployment, paid infrastructure, or application integration changes.

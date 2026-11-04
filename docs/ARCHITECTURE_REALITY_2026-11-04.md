# App Architecture Reality Check — November 4, 2026

**Status:** Verified by reading GitHub branch files and merged/draft PR metadata. This document is a task-specific checkpoint, not an assertion that staging or production is healthy.

## Actual codebase
| Part | Reality | Decision |
| --- | --- | --- |
| UI | React 19 + TypeScript | KEEP React. Vite is not a React replacement |
| Dev/build | Vite 8 and Vitest on recovery branch | KEEP and protect; Node 22 recommended |
| Legacy trunk | `master` has old `react-scripts` scripts | Do not start new feature branches from master |
| Active integration | `recovery/coach-core-mvp-2026` | Use as task-PR base until owner approves promotion |
| Env contract | `vite.config.ts` has `envPrefix: 'REACT_APP_'` | Keep for compatibility; remove misleading `VITE_*` template |
| Hosting output | `build/` in Vite config and `firebase.json` | Keep until a separately reviewed hosting migration |
| Legacy Playbook | React .js/.tsx compatibility transform + excluded legacy TS surfaces | Do not remove blindly; migrate only after feature parity/tests |
| Server AI | Authenticated proxy; AI off by default | Never put provider keys in browser |
| Staging | Historically another Hosting site in production Firebase project | Treat data/account isolation as unresolved until owner proves separate project |

## Merged changes and limitations
- [PR #101](https://github.com/DigitalBlueprint239/coach-core-ai/pull/101): Vite/trunk foundation and auth; merged into recovery, not master.
- [PR #102](https://github.com/DigitalBlueprint239/coach-core-ai/pull/102): feature-gated Smart Playbook v2; merged into recovery.
- [PR #103](https://github.com/DigitalBlueprint239/coach-core-ai/pull/103): repository Firestore rules corrected to permit app's own team queries; **merged code does not mean rules deployed live**. Team Join intentionally remains disabled pending secure invitation design.

## Existing draft work — DO NOT duplicate or merge out of order
- [PR #106](https://github.com/DigitalBlueprint239/coach-core-ai/pull/106): Smart Playbook architecture and draft rule profiles.
- [PR #107](https://github.com/DigitalBlueprint239/coach-core-ai/pull/107): canonical v3 persistence + non-destructive migration, stacked on #106.
- [PR #108](https://github.com/DigitalBlueprint239/coach-core-ai/pull/108): research-stage Inside Zone vs 4-3 Over, stacked on #107; **not yet connected to the product screen**.
- [PR #109](https://github.com/DigitalBlueprint239/coach-core-ai/pull/109): link agents to private research Vault, depends on Vault bootstrap approval.
- [PR #104](https://github.com/DigitalBlueprint239/coach-core-ai/pull/104): shared engineering contract. Respect shared file ownership; do not overwrite AGENTS.md/CLAUDE.md.

## Decision: accelerate product, not unverified release
Missing a volunteer reviewer must **not** block code written on isolated branches or CI-tested demonstration features. It **does** remain a reason not to publish 'Verified' football rulings or deploy risky production/auth/rules changes without adequate sign-off. No fake human review; no AI approval impersonation.

### Priority product vertical slice
1. **Coach entry:** actual signed-in coach can create/select a team using repository rules in emulator; owner decides safe live rules deployment and verify real auth domains.
2. **Play design:** flag-gated v2 formation → drag → undo/redo → assignments; no direct edits to the legacy v1 editor without compatibility regression evidence.
3. **Persistence:** integrate v3 play document and revision conflict handling from PR #107, keep v1/v2 data intact and demonstrate save/reopen.
4. **Football explanation:** wire one evidence-labelled Inside Zone explanation from PR #108; explicitly 'coaching convention — draft', no invented legality, unsupported fronts visibly flagged. Keep AI read-only and user-invoked.
5. **Acceptance:** coach can reload and reopen their saved play, another coach cannot access it, practice planner saves and reopens, mobile keyboard/interaction works, with reproducible local/emulator tests. No production deployment from this document.

### Minimum checks for every change
`npm run check:stack`; `npm run lint`; `npm run typecheck`; `npm test`; `npm run build`; `npm run test:rules` for changes involving auth, teams or persistence. Report exact commands, environment, passing/failing counts, and screenshot/browser evidence for UI. Never call a static review an executed test.

### Next decision before beta
Explicit owner assessment of Firestore live deployment impact, safe team-sharing model, isolated staging project, AI secret routing, beta access, data migration, and rollback. Release approval remains a separate decision.

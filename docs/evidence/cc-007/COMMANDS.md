# CC-007 discovery / verification commands

2026-10-14. PowerShell; repository worktree `work/main-staging-readiness`. Documentation-only; no new application build/test/dev-server result claimed. Prior commands/results remain immutable in coaching-client/coaching-dependencies evidence. No deployment/configuration command from the runbook was executed.

## Discover / measure / diagnose

Read skill coach-core-agent-session, AGENTS.md, CLAUDE.md, shared context and sprint before edits. Used GitHub connector read calls for #39/#50 comments, PR40/49/52/53/54/55/56/59/60 metadata, PR59/60 comments/reviews/review threads; no actionable new Claude review was present. First review API call used wrong argument name and returned schema validation failure; retried with `repo_full_name`, successful empty reviews/threads. Issue58 is a separate agent-process issue, not a PR/approval record. Search `repo:DigitalBlueprint239/coach-core-ai D1` and `repo:DigitalBlueprint239/coach-core-ai founder` found no detailed settled decision source. Some initial absent-path reads failed (functions/.env.example and smoke plan not in candidate); used pinned PR52 Git object instead. No claim those missing files exist locally.

Executed repository commands/read patterns:

```powershell
git status --short
git worktree list
git log -1 --format=%H
git fetch origin
git ls-remote --heads origin
git worktree add ../main-staging-readiness -b codex/cc-007-staging-readiness 2cf1a5ca9be33500515b3abf331ca35e3d6df920
git fetch origin pull/52/head:refs/remotes/origin/cc007-pr52 pull/56/head:refs/remotes/origin/cc007-pr56 refs/heads/claude/integration-candidate-2026-10-14:refs/remotes/origin/cc007-claude-candidate
git show origin/cc007-pr52:docs/security/FOUNDER_DECISION_PACKET.md
git show origin/cc007-pr56:docs/security/FOUNDER_DECISION_PACKET.md
git show origin/cc007-pr52:docs/security/STAGING_SMOKE_TEST_PLAN.md
git merge-base --is-ancestor 341e95bff7f6507716b10c5533d843e089b7cdd8 HEAD
git merge-base --is-ancestor 3ec22cdfddb12387c09033a9cb703064864893be HEAD
git merge-base --is-ancestor ecc64001b3d3652959ef00d5e49bc8577bce1961 HEAD
git merge-base --is-ancestor 2d4a685a10cb0baa726e5ba2f36621876ba28d1b HEAD
# First three exit0 (included); PR56 exit1 (not ancestor).
rg -n '@ts-nocheck' src -g '*.ts' -g '*.tsx'
rg -n 'addToOfflineQueue|syncOfflineQueue' src/services/firestore.ts
rg -n '^exports\.|onSchedule|delete\(' functions/index.js
rg -n 'D1–D9|D1.D9|All other decisions remain pending' docs -g '*.md'
```

Inspected actual source/config: package.json/lock, functions/index.js/package.json/scripts/beta-access.js, firebase.json/.firebaserc/.env.production (flag only), src/firebase.ts/index.tsx/services/coach-ai-client.ts/hooks/useAuth.tsx/services/firestore.ts, persistence drafts/revision and legacy-import markers, storage.rules/firestore.indexes.json/tsconfig.json, public/sw.js, scripts/security/check-client-env.js/verify-release-build.sh, both security/e2e workflows and model workflow, candidate founder packet and persistence contract. Environment examples were read for **names only**; no values printed. Existing suppressions and guarded hydration lint warning are retained, not newly introduced or silently fixed.

Official documentation checked read-only on 2026-10-14: Firebase CLI component/project scoping, Hosting preview access and release rollback, Functions params/secret bindings. URLs are cited alongside the runbook claims; no project console or live credentialed API was accessed. Raw page pricing/model/legal recommendations were not adopted as approved founder terms.

## Implement / compare / document

Only documentation updated. Runtime, rules, security files, harness, workflows, config and original evidence remain unchanged. Check:

```powershell
git diff 2cf1a5ca9be33500515b3abf331ca35e3d6df920 -- src public functions e2e tests .github package.json package-lock.json firebase.json .firebaserc firestore.rules storage.rules firestore.indexes.json tsconfig.json scripts
git diff --check
git ls-remote origin refs/heads/codex/account-coaching-persistence refs/heads/codex/coaching-dependency-repair refs/heads/recovery/coach-core-mvp-2026
```

Diff empty; frozen remote refs recorded. Recomputed all hashes listed in coaching-client/coaching-dependencies SHA256SUMS.txt using `Get-FileHash -Algorithm SHA256`: **0 mismatches**. `readiness-snapshot.json` separates historical tests from new documentation validation. Closeout rechecks GitHub reviews/comments/heads; result recorded separately. No npm test/build repeated because only docs changed; no staging/physical/independent acceptance inferred from unchanged runtime.

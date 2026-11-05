# Privacy hardening — legacy offline queue

## What was wrong
The legacy `src/services/firestore.ts` wrote coach practice/plays into `localStorage.offline_operations` without an owner UID/team scope and automatically replayed those instructions as the *currently* signed-in coach on reconnect. A stale tab or shared computer could therefore attempt to run another coach's stored writes. Server rules are the final authorization boundary, but the client must not leak or misattribute data.

## New behavior
- **No new custom offline queue is accepted or stored.** Legacy `addToOfflineQueue` fails closed with an explicit error.
- **No auto-load, replay or cross-user reuse** of old `offline_operations`, including when an online event fires.
- Offline writes are conservatively refused when `navigator.onLine === false`. A network hint is not reliable, so pending SDK writes must never be described as completed before their promises resolve.
- Old `offline_operations` entries are **quarantined in the browser, not silently deleted or executed**. The API exposes a boolean presence check and a separate explicit discard operation for a future approved cleanup UI. This means **historical sensitive localStorage data may still exist on affected devices until reviewed cleanup**. Do not declare full local storage privacy solved.
- Existing `coach-core-ai-${teamId}` unsigned legacy data migration is disabled pending an owner/provenance decision. The old procedure is preserved in a commented section solely as recovery context, not runnable code.
- Firestore rules remain the server-side owner, creator and team gate. No production rules deploy or existing user data deletion from this PR.

## Follow-up decisions before real athlete/team beta
1. Decide whether to present a user-confirmed "discard legacy drafts" flow, secure account-specific export or managed migration. The global legacy queue does not authenticate origin; never replay it automatically.
2. Move future offline drafts to account/team-scoped storage only after secure identity, encryption-at-rest/retention review and logout/team-switch tests. Otherwise keep fail-closed online-only save.
3. Verify signed-in browser behavior with user A → sign out → user B on the same browser, offline/online transitions, and authorization denial.
4. Validate actual staging rules are deployed to an isolated nonproduction Firebase project. Do not conflate emulator success with production.
5. Maintain reversible, owner-approved migration/rollback notes before any historical-data purge.

**Status:** controls for new writes and replay implemented in isolated PR; residual historical browser data pending manual/owner cleanup.

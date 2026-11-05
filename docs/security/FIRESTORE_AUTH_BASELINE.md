# Coach Core Firebase authorization baseline — integrity improvements

## Scope
This development-only PR tightens security rules and adds emulator negative cases without deploying live Firebase rules.

## Verified threat boundaries
- Only authenticated owner can write team, plays or practice plans; foreign team reads/writes denied.
- The app lists teams with `memberIds array-contains currentUid`. Previously, an owner could accidentally remove their own UID from that list while still owning the team. The new team update rule requires the owner to remain a member and `memberIds` to be a list.
- Canonical v3 documents are created at revision 1 and increment by exactly 1. Previously, an existing v1/v2 document could be overwritten with a v3 body at the same ID because version checks only applied when the **stored** version was v3. The new rule keeps schema version immutable on updates. New v3 copies get new document IDs and preserve v2 source provenance.
- Existing owner/creator immutability and cross-account Firestore rules remain in place.

## Non-goals and release gates
- Does not introduce new team invitation, roster-sharing or coach permissions; Team Join stays off until an authorized invite design exists.
- Does not change the hardcoded administrative verified-email allowlist or migrate it to custom claims yet. Future server-authorized role claims require a separate rollout and tests; don't silently break waitlist administration.
- No production or staging Firebase deployment, no user data import, no external providers, no Verified football knowledge.
- Before deploying rules: copy current deployed rules, compare with repository, execute emulator tests, use isolated staging Firebase project, test authorized and unauthorized end-to-end paths, and obtain explicit owner approval/rollback plan.

## Tests
Firestore rules emulator covers owner membership invariants, v1/v2 in-place schema-promotion rejection, new v3 copy allowance, existing v3 revision constraints, and cross-account denial. Passing tests prove only emulator behavior—not which rules are live in production.

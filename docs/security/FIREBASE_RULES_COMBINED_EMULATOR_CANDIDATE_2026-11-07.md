# Firestore + Storage rules — combined emulator verification candidate

**Purpose:** Exercise draft Storage PR #122 and draft Firestore PR #123 **together** against the Firebase emulators. This branch is an integration test artifact, **not** a production-ready rules release. Do not merge or deploy it without separate authorization and live-state compatibility review.

## Exact candidate composition
- `firestore.rules` and `rules-tests/firestore.rules.test.ts` from PR #123 (including legacy waitlist `status: 'pending'` compatibility, client-draft-only v3 plays, protected profile privilege fields).
- `storage.rules`, `rules-tests/storage.rules.test.ts`, `vitest.storage.config.ts`, and Storage CI from PR #122 (owner-scoped private files, restricted uploads, published-v3 media write/delete freeze).
- `vitest.rules.config.ts` and `test:storage` script from PR #122 for isolated Firestore vs dual-emulator suites.
- **No production project ID, cloud credentials, live data, Firebase Console access, or deploy actions in the test workflow.**

## Verification
- Run `npm run test:rules` against the Firestore emulator.
- Run `npm run test:storage` against **both** Firestore and Storage emulators.
- Run lint, application unit tests, typecheck and Vite production build.
- Test negative cases for another team's owner, ordinary team member, unauthenticated user, missing parent record, unsafe file types/sizes, folder listing, unauthorized mutation, privileged profile/waitlist writes, v3 revision conflicts, publication and published media changes.
- Red runs block acceptance; do not weaken rules merely to make tests pass.
- Staging and actual Firebase state must still be verified separately. Emulators do not prove the Storage cross-product Rules service agent IAM access, existing download URLs, current deployed rules, live waitlist payloads or Functions drift.

## Release blockers, even if all emulator tests pass
1. Inventory deployed production rules revisions, Storage buckets, existing file paths and downloadable tokens.
2. Confirm the actual production waitlist schema and plan migration from client-supplied `pending` to server-assigned status.
3. Review production published v3 media references and any required migration/retirement policy.
4. Confirm the newly created staging project is fully isolated, with authorized WIF/IAM and production credential rotation plans.
5. Validate two real signed-in **synthetic** coach accounts in isolated staging; no real student data.
6. Obtain separate explicit approvals for rules and Functions updates. Firestore, Storage and Functions deployments are **not** part of this candidate.

Source PRs remain authoritative for separate review: #122 and #123.

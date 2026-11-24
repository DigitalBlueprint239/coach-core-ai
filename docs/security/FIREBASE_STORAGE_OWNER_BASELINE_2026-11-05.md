# Firebase access rules: owner-scoped Storage baseline — 2026-11-05

**Status:** code + emulator tests in draft PR; **not deployed** to staging or production.

## Verified code risk
Previous `storage.rules` allowed any signed-in account to list/read/write team documents, play media and practice attachments; any signed-in user could also read other users' profile images. Firestore document ownership checks do not automatically protect Storage paths.

## Owner-only baseline implemented
- Profiles: authenticated matching UID only; restricted image types (jpeg/png/webp), up to 5 MiB.
- Team documents: authenticated owner from `teams/{teamId}.ownerId`, jpeg/png/webp, PDF or text/plain, up to 10 MiB.
- Play media: owner of the play's associated team, images only, 10 MiB.
- Practice attachments: owner of the plan's associated team, image/PDF/plain text, up to 10 MiB.
- Delete requires the matching owner. Folder listing is denied, unknown paths denied.
- Missing Firestore parents deny access; we do not trust client-supplied owner metadata.
- File MIME / size are **metadata checks**, not antivirus, document sanitization or adult/youth-film rights checks.
- Any existing files stored at unsupported paths or MIME types can become inaccessible under stricter rules until separately migrated. Inventory actual Storage objects first. Do not auto-delete or expose them.

## Critical deployment dependency: cross-service access
These Storage rules use `firestore.get()` against the **default Firestore database**:
- Team file check = one parent read.
- Play / practice file check = two parent reads.
- Firebase limits cross-service calls (at most two); reads can cost Firestore quota/billing even if a request is denied.
- The Firebase CLI or Console may request permission to enable the Firebase Rules Firestore service agent. This is **IAM** and must be explicitly reviewed/authorized by the owner. A successful emulator test does not enable it.
- Storage bucket configured in the actual Firebase project must match the app configuration. Additional/default and legacy buckets require separate inventory.

## Rollout steps, not automatic commands
1. Owner-authorized read-only audit: list the currently deployed Storage/Firestore rules revisions, buckets and existing file paths, storage usage, active download tokens, users and clients. Do not download private student media.
2. Inventory old files and check whether the stricter MIME/path rules will break legitimate content. This code intentionally does not open video uploads, film shares or coach-membership reads.
3. Ensure isolated Firebase staging project; never treat a second Hosting target inside production project as isolation.
4. Run `npm run test:storage` with **both** Storage and Firestore emulators. Also run `npm run test:rules`, lint/typecheck/Vitest/build; test real authorized and unrelated coach identities.
5. Owner separately authorizes the required IAM service-agent permissions and **exact staging** rules hashes; deploy only to verified staging target with rollback instructions.
6. After staging verification, discuss additional coach/member role access and media licensing before requesting production approval.

## Additional audit concerns
- Firestore `users/{uid}` self-writes are not constrained to harmless profile fields: a user could assert internal role-like metadata in their own profile. Any backend that trusts that field would be unsafe. Audit server/claims use before adding a potentially breaking allowlist.
- Public waitlist create currently accepts client-authored `status`, `immediateAccess`, `batchProcessed`, `metadata`, IP/user-agent fields. This is untrusted data; restrict to public signup form fields in follow-up Firestore PR and preserve any known legit form shape.
- Admin authorization currently uses verified-email allowlist. Useful stopgap but fragile compared to explicit, server-assigned custom claims and least-privilege IAM. Requires planned migration and tests.
- Team membership is currently owner-only writes; team joins disabled. Future role-aware sharing needs official invitation issuance/revocation and security tests, not broad read on any signed-in user.
- Firebase App Check complements Authentication/Rules, but does not replace authorization; plan monitor-first rollout.
- Firebase server Admin SDK **bypasses Firestore client Security Rules**; audit IAM and backend separately.

## Competition insight
Hudl documents team-only shared video and Can View/Can Edit/Can Manage permissions; TeamSnap and SportsEngine publish distinct team staff/admin privileges. That supports role-specific authorization as a later product requirement. Their underlying Firebase use is not verified and is not needed to choose our secure design.

## Official references
- https://firebase.google.com/docs/storage/security/rules-conditions
- https://firebase.google.com/docs/rules/manage-deploy
- https://firebase.google.com/docs/rules/unit-tests
- https://firebase.google.com/docs/rules/rules-behavior
- https://firebase.google.com/docs/app-check

**No live rules deployment, project changes, billing/IAM action or production access authorized by this PR.**

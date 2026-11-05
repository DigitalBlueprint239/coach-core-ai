# Firestore security follow-up — draft publication, profile and waitlist controls

**Status: draft PR; code is NOT deployed to live Firebase.**

Three security weaknesses found when reviewing owner-only controls:

1. **Client-side publishing**: the existing `plays` rule checked v3 revision but not its publication status. A coach could write `status: published` even though no trusted verification/approval process exists. New rules only permit client v3 creation/update when `status: draft`; a server-governed publication workflow must be designed separately. Existing stored published v3 remains readable but becomes immutable to the client.
2. **Profile privilege fields**: `users/{uid}` previously allowed any signed-in person to set arbitrary profile fields. A future service that read `role`, `permissions`, `isAdmin` or entitlements from these fields would be vulnerable. Reserved authority/billing/verified fields are disallowed in client profile create/update; friendly profile name/bio remain editable. Do not use untrusted display profile fields for roles anywhere in the server; custom claims must be assigned by privileged server identity.
3. **Waitlist submission**: unauthenticated visitors could set admin-managed fields such as `status`, `immediateAccess`, `metadata`, `batchProcessed` and self-claimed IP/userAgent. Those are now excluded from public creation; legitimate marketing/contact and attribution fields remain allowed.

## Critical compatibility gates
- Before staging deployment, inspect the actual **live waitlist form payload** (the current published site may use fields now excluded). If it uses a forbidden field, update the form or use a verified server endpoint before deploying. Do not break active sign-ups.
- Inventory existing client profile update code and any older `published` v3 records. The rule intentionally disallows a browser changing published records; server/owner publishing must be designed and reviewed.
- Authenticated UID ownership, Firestore emulator testing, and App Check rate-abuse mitigation remain separate layers.
- Hard-coded verified-admin-email allowlist remains as-is in this PR; changing to custom claims needs owner-approved grant/revoke migration and backend/IAM audit.
- Team sharing/join is still OFF; owner-only access is intentional.

## Evidence
- Additional `rules-tests/firestore.rules.test.ts` negative tests for forged client publication, reserved user privilege fields and visitor-supplied waitlist approvals.
- Existing positive tests for profile display name, normal waitlist signup, v3 draft revision and coach-owned team queries remain.
- Firebase official docs: https://firebase.google.com/docs/firestore/security/rules-conditions and https://firebase.google.com/docs/rules/unit-tests

## Decision
Keep as reviewable development PR. No automatic merges or live rules deploy until form compatibility, staging with nonproduction data, CI tests and owner approval.

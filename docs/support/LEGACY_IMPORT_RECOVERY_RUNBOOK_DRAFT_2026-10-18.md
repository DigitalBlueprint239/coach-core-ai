# DRAFT — Legacy-import recovery support runbook (missing original team)

**Status: PROPOSAL ONLY. Not approved, not operational. No recovery may be performed under this
document until Coach Drew approves it and the missing decisions below are made.** Nothing in this
draft creates a support channel, grants anyone data access, or activates any recovery capability;
no such channel or backend capability exists in the repository today.

## 1. Scope

Applies to one situation the app deliberately refuses to handle on its own (approved 2026-10-16/17,
issue #39): a coach has an unfinished device-play import whose **original team no longer exists or is
not available** to that account. The app shows a blocking notice and the copy "If the original team is
unavailable, contact support. Recovery requires verified account and team ownership; this screen cannot
transfer or release an import." Everything else (same account + original team) is handled in-app by the
reviewed resume flow (D10-08a–d) and is out of scope here.

Out of scope and **never** performed by support: transferring plays to another coach, clearing or
rewriting another account's claim or pending markers, importing into a same-name replacement team on
the coach's behalf, or acting on a request from anyone other than the original account holder.

## 2. What exists today (verified in source at 61448f0)

- Device state only: `smartPlaybook_plays` (originals), `coachcore:v1:legacyImportClaim` (device claim:
  uid, teamId, status), `coachcore:v1:<uid>:legacyImportPending`, `coachcore:v1:<uid>:legacyImportDecision`.
  These live in the coach's browser; the server holds only successfully verified copies.
- No admin endpoint, Cloud Function, console tool or Firestore rule path exists for support to read or
  change this state. No support mailbox, form, ticketing system or on-call rotation is defined anywhere
  in the repo or the project docs.

## 3. Proposed procedure (requires the decisions in §6)

1. **Intake.** The coach contacts the designated support channel (TBD, §6) from the e-mail address of the
   account that owns the import. Collect: account e-mail, the exact blocking message shown, the original
   team name as the coach remembers it, approximate date of the original import attempt, and whether the
   originals are still visible on the device. Collect **no** passwords, no sign-in links, no OOB codes.
2. **Ownership verification (two factors, both required).**
   a. *Account*: the coach proves control of the account by completing a sign-in in their own browser
      while on a call/thread with support and reading back a support-issued, time-boxed challenge word
      that support asked them to type into a new practice-plan note (then delete). Support never asks the
      coach to forward a sign-in e-mail or to share a session. (Decision needed: is an in-app
      "support verification code" feature required instead? None exists.)
   b. *Team*: the original team's ownership is checked against the server record `teams/<teamId>` by an
      authorized operator (§6) **read-only**: the team document's owner/coach uid must equal the verified
      account's uid, and the device claim/pending teamId (read aloud by the coach from the blocking
      message, which names the team) must match that team. If the team document no longer exists, the
      ownership check uses the plays collection: any server-side plays with `ownerUid == uid` under that
      teamId, or a recorded import decision `{decision:'imported', teamId, ids}` the coach can show.
      If neither can establish ownership, **stop**: the request is declined with a written reason.
3. **Authorized operator access.** Only an operator named in the access list (§6) may read production
   data, using an individual (never shared) account with read-only Firestore access, from a logged session.
   No one may write to another user's documents. Writes, if ever approved, must go through a reviewed
   Cloud Function with its own audit log — no such function exists; building one is a separate, reviewed
   change and is **not** proposed here.
4. **Resolution options available without new backend capability.**
   - If the original team still exists and the coach simply cannot see it: help the coach select it
     (TeamContext) and let the in-app resume flow finish the import. Support changes nothing.
   - If the original team is gone: the app will keep blocking by design. Support explains that the
     originals remain on the device, that the import cannot be moved to another team by support, and
     that the coach may **create a new team and re-import manually** only if the coach, on their own
     device, chooses to clear the stale device state themselves (support may describe what the state
     is; support never performs or remotely executes the clearing). (Decision needed: whether a
     user-driven "discard unfinished import" control should exist in the app; none does, and adding
     one is a product decision with its own review.)
5. **Audit trail.** Every case gets a ticket (channel TBD) recording: timestamps, operator identity,
   the verification steps and their outcome, every read performed (collection/document ids only, never
   play content), the resolution, and the coach's confirmation. Retention: TBD (§6). Operators' read
   access must be logged at the platform level (Cloud Audit Logs data-access logging for Firestore reads
   is **not enabled by default** — decision/cost in §6).
6. **Escalation.** Any request involving a different account than the original owner, a disputed team,
   a minor's account, a legal/guardian request, or any ask to transfer/clear data → escalate to Coach
   Drew; support may not resolve it.
7. **Completion evidence.** Case closed only with: the ticket, the coach's written confirmation of the
   outcome, and (if the import resumed) the app's own verified-readback result (the decision record
   `{decision:'imported', ids}` the coach can see). No screenshots of play content are collected.

## 4. Privacy and safety limits

Collect the minimum: account e-mail and team name. Never request passwords, sign-in links, OOB codes,
device backups or exports of play data. Youth-sports context: if the account appears to belong to a
minor or a parent, follow the escalation path; do not proceed with ad-hoc verification.

## 5. What this draft does NOT do

It does not activate recovery, does not grant access, does not create a channel, and does not change
the app. It is input for Coach Drew's decisions.

## 6. Missing decisions (explicit)

| # | Decision | Owner |
|---|---|---|
| D1 | Support channel (mailbox / form / in-app link) and who staffs it; hours and response target | Coach Drew |
| D2 | Named authorized operators and the read-only production access they get (individual accounts, MFA) | Coach Drew |
| D3 | Whether Firestore data-access audit logging is enabled (cost) and where tickets live | Coach Drew |
| D4 | Account-verification method: challenge-word procedure above vs. an in-app verification code (new feature) | Coach Drew |
| D5 | Whether a user-driven "discard unfinished import" control is wanted (product decision, separate review) | Coach Drew |
| D6 | Whether any support-side write capability will ever exist (if yes: separate reviewed Cloud Function + audit) | Coach Drew |
| D7 | Retention period for case records | Coach Drew |

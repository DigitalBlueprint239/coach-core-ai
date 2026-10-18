# DRAFT — Legacy-import recovery: support boundary and what still has to be decided

**Status: PROPOSAL ONLY. Not approved, not operational.** Nothing in this document creates a support
channel, grants anyone data access, defines a working ownership-verification method, or activates any
recovery capability. **No missing-team recovery may be performed under this document.** Revised
2026-10-18 after the independent review of `c9d49dd` (F3/F4): the earlier draft's "create another
team and clear device state" option and its improvised verification steps were wrong and are removed.

## Authoritative boundary (verbatim sources — this draft must not contradict them)

- Coach Drew, issue #39 comment 6224877757 (policy 3): *"APPROVE blocking automatic recovery and
  requiring authenticated support to verify ownership. No ownership bypass is authorized. A detailed
  support procedure and evidence requirements still need preparation before manual recovery can be
  performed."*
- `docs/RUNTIME_IMPORT_CANDIDATE_2026-10-17.md` §"Support boundary / unresolved operational dependency":
  *"Support must authenticate the requesting original coach, verify the original uid and team identity
  against authorized backend ownership records, record the reason the original team cannot be selected,
  and escalate to separately authorized recovery operations. Device claims, a matching team name,
  screenshots or a replacement team alone are not ownership proof. Preserve originals and
  claim/pending/decision evidence; **do not instruct the user to clear/edit them to bypass the block.**
  This candidate does not grant support new data access or implement backend restoration. An approved
  operational runbook/access path is still needed before performing actual missing-team recovery."*

## 1. What EXISTS today (verified in source at the PR #76 runtime, `61448f0`)

| Item | Fact |
|---|---|
| Device state | `smartPlaybook_plays` (originals), `coachcore:v1:legacyImportClaim` (`uid`, `teamId`, optional `status`), `coachcore:v1:<uid>:legacyImportPending`, `coachcore:v1:<uid>:legacyImportDecision`. All in the coach's browser `localStorage`; **user-editable, therefore never ownership evidence.** |
| Server records | `teams/<teamId>` carries `ownerId`. Imported plays live in `plays/` with `teamId`, `createdBy` and ids prefixed `legacy_v1_` (`src/features/legacy-import/firebase-import.ts`). There is **no** `ownerUid` field. |
| In-app behaviour | Same account + original team: the reviewed resume flow (D10-08a–d). Original team unavailable: a blocking notice naming the team **by name** (not an assured raw id) and the copy *"If the original team is unavailable, contact support. Recovery requires verified account and team ownership; this screen cannot transfer or release an import."* |
| Support tooling | **None.** No support mailbox, form, ticket system, on-call rotation, admin endpoint, Cloud Function, console tool, read-only operator role, audit-log configuration, or in-app verification screen exists in the repository or project docs. |
| Support powers | **None.** Support cannot read a coach's device state, cannot clear/transfer/reassign claims, cannot import on a coach's behalf, and has no defined production data access. |

## 2. What support may do TODAY (within the approved boundary, without any new capability)

1. **Acknowledge and record.** Take the coach's report (account e-mail as given, team name as shown in the
   blocking message, approximate date). Collect no passwords, sign-in links, OOB codes, exports or
   screenshots of play content.
2. **Help select an existing team.** If the original team still exists and the coach merely cannot see
   it, support may explain how to select it (TeamContext) so the in-app resume flow finishes the import.
   Support changes nothing.
3. **Explain the boundary.** If the original team is gone, the app keeps blocking **by design**. Support
   explains that the originals remain on the device, that nothing can be transferred or released by
   support, and that recovery requires a procedure that does not exist yet. Support must **not** suggest
   clearing or editing device state, creating a replacement team to re-import, or any other bypass.
4. **Escalate.** Every missing-team case, and any request involving a different account, a disputed
   team, a minor's or guardian's account, or any ask to transfer/clear data, goes to Coach Drew. Support
   may not resolve it.

## 3. PROPOSED future procedure — not approved; every element below needs an owner decision (§4)

The proposal deliberately specifies **what a credible procedure must satisfy**, not an improvised method:

- **Authentication of the requesting account** must come from the identity system, not from support
  dialogue. The earlier "type a challenge word into a note" idea is withdrawn: reading back a word support
  supplied does not prove authenticated control of the account, and support has no trusted way to observe
  the write. Acceptable designs (choose one, each is a new reviewed feature): an in-app, signed-in-only
  "support verification code" surface; or a verified-e-mail round trip run by the identity provider.
- **Ownership of the original team** must be established from authorized backend records only:
  `teams/<teamId>.ownerId == uid`, or when the team document is gone, `plays` documents with
  `teamId == <original>` and `createdBy == uid` (legacy_v1_ ids). This requires an authorized, logged,
  read-only operator access path that does not exist today, and a way to obtain the original `teamId`
  that the coach cannot forge (the blocking message shows a name, not an assured id).
- **Authorized operator access**: named individuals, individual (never shared) accounts with MFA,
  read-only Firestore access, every read logged (Firestore data-access audit logging is not on by default
  and has cost). No write capability for support; if restoration is ever wanted it must be a separately
  reviewed server-side function with its own audit trail.
- **Audit trail**: a ticket per case (channel TBD) recording timestamps, operator identity, verification
  outcome, every read performed (document ids only), the resolution and the coach's confirmation.
- **Escalation**: as in §2.4, plus anything the procedure cannot verify.
- **Completion evidence**: the ticket, the coach's written confirmation, and — if an import later
  completes in-app — the app's own verified-readback decision record. Device-side JSON shown by the coach
  is **not** evidence.

## 4. Unresolved owner decisions (nothing above is usable until these are made)

| # | Decision | Owner |
|---|---|---|
| D1 | Support channel (mailbox / form / in-app link), staffing, hours, response target | Coach Drew |
| D2 | Named authorized operators and the read-only production access they get (individual accounts, MFA) | Coach Drew |
| D3 | Firestore data-access audit logging on/off (cost) and where case records live; retention period | Coach Drew |
| D4 | Account-authentication method for support cases: in-app verification code feature, identity-provider round trip, or none (keep blocked) | Coach Drew |
| D5 | How the original `teamId` is obtained non-forgeably (new in-app surface, or operator lookup from backend records only) | Coach Drew |
| D6 | Whether a user-driven "discard unfinished import" control is wanted — a product decision with its own review; **not** a support workaround and **not** available now | Coach Drew |
| D7 | Whether any support-side write/restoration capability will ever exist (separately reviewed function + audit) | Coach Drew |

Until D1–D5 are decided and the resulting procedure is independently reviewed, the only compliant
outcome for a missing-team case is: record, explain, escalate, keep blocked.

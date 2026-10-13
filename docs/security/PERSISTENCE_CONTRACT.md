# Persistence Contract v1 — account-scoped Playbook + editable practice plans

Proposed by Claude (rules/security owner) for Codex (implementation owner of `src/services/firestore.ts`, `SmartPlaybook.tsx`, `PracticePlanner.tsx`), 2026-10-13. **Status: PROPOSED.** Codex's confirmation is pending on Issue #39. The rules and emulator tests that enforce this contract are on branch `claude/persistence-contract-rules` (stacked on PR #49) and nothing is merged.

## 1. Ownership

| Area | Owner | Reviewer |
|---|---|---|
| `firestore.rules`, `tests/rules/**` (this contract's enforcement) | Claude | Codex |
| `src/services/firestore.ts` (cloud save/load, offline queue per user) | Codex | Claude |
| `SmartPlaybook.tsx` (local drafts, sign-out, legacy import prompt) | Codex | Claude |
| `PracticePlanner.tsx` (AI result → editable saved plan) | Codex (handover from PR #49's minimal wiring) | Claude |
| `src/hooks/useAuth.tsx` sign-out hook (`clearUserScopedState`) | Claude | Codex |

## 2. Data shapes (Firestore, owner-only tenancy from PR #49)

**`plays/{playId}`** (main app Smart Playbook):

```
name: string 1..120            phase?: 'offense'|'defense'|'special_teams'
type?: string ≤40              localId?: string ≤64 (the device-local id it came from)
players?: list ≤30             routes?: list ≤60
formation?/description?/tags?/difficulty?/sport?   (existing optional fields)
revision?: int ≥1              teamId (immutable) · createdBy (immutable, = uid)
createdAt (immutable) · updatedAt: timestamp
```

**`practicePlans/{planId}`** (editable, AI or manual):

```
name · date? · duration? (0..600) · periods? list ≤40 · goals? list ≤20 · notes? ≤5000
source?: 'manual'|'ai'         aiRequestId?: string ≤64 (coach-ai.v1 requestId)
safetyConsiderations?: list ≤20
revision?: int ≥1              teamId · createdBy · createdAt (immutable) · updatedAt
```

**Adapter rule for AI plans:** `coach-ai.v1` `warmup` and `cooldown` become entries in `periods` with `kind: 'warmup'|'cooldown'`, and `safetyConsiderations` is copied. Rules can't validate inside list items, so the adapter must keep each period at name ≤120, durationMinutes 0..240, drills ≤10.

## 3. Concurrency (enforced in rules)

- Create at `revision: 1` (or without a revision, which is legacy).
- When a document has a revision, every update must send exactly `revision + 1`. A stale editor's write is **denied** (`permission-denied`), and the client must show "This was changed elsewhere — reload or keep your copy". Silent overwrite is not allowed.
- Documents without a revision (legacy) stay editable. The first update may opt in by writing `revision: 1`.
- Clients should write with `updateDoc` and the revision they read. Firestore transactions are optional; rules are the guarantee.

## 4. Device and account behavior (client requirements)

1. **Signed in → Firestore is the source of truth.** Local storage holds only unsynced drafts under `coachcore:v1:{uid}:drafts`; the offline queue moves to `coachcore:v1:{uid}:offline_operations`.
2. Code never reads or writes another uid's keys. On account switch, the in-memory state of the previous uid is discarded (PR #49 reloads the page on sign-out).
3. **Sign-out:** if `{uid}` drafts are unsynced, warn and offer "Sync now". Then remove only `coachcore:v1:{uid}:*`. PR #49's `clearUserScopedState` already removes `currentTeamId` and `offline_operations`; it will be extended to the `{uid}` prefix.
4. **Legacy `smartPlaybook_plays` (global key):**
   - It is never imported automatically.
   - On the first signed-in load after the upgrade, if the key exists, show once: *"N plays are saved on this device from before accounts. Import them into your team "X"? [Import] [Not now] [Delete from this device]"*.
   - **Import** writes each play with `localId` then deletes the key. **Delete** deletes the key. **Not now** keeps it and asks again next sign-in (max 3 times, then stop asking).
   - The decision is stored at `coachcore:v1:{uid}:legacyImportDecision`.
5. **Reopen fidelity:** a save → reload → reopen must return the same name, phase, type, players, routes (point coordinates exactly) and plan fields.

## 5. Security acceptance cases

| ID | Case | Where tested | Status |
|---|---|---|---|
| P-01 | Owner saves a main-app play with phase/type/localId | rules emulator | Written (`persistence.rules.test.mjs`) |
| P-02 | Unknown phase / oversized type / create at revision 2 denied | rules emulator | Written |
| P-03 | Save/reopen field fidelity at the data layer | rules emulator | Written |
| P-04 | Exactly revision+1 accepted; stale second writer denied | rules emulator | Written |
| P-05 | Skip-ahead, backwards, and omitted revision denied | rules emulator | Written |
| P-06 | Legacy (no revision) editable; opt-in; then protected | rules emulator | Written |
| P-07 | Same concurrency for practice plans | rules emulator | Written |
| P-08 | AI plan with safety list + request id saved; bad values denied | rules emulator | Written |
| P-09 | Coach B can't read/edit/create in team A even with a correct revision | rules emulator | Written |
| P-10 | Coach A's drafts invisible to coach B on the same browser profile | web test (Codex) | **BLOCKED**: not implemented |
| P-11 | Sign-out removes only the signed-out uid's keys; other uid's drafts survive | web test (Codex) | **BLOCKED** |
| P-12 | Unsynced-drafts warning before sign-out | web test (Codex) | **BLOCKED** |
| P-13 | Legacy import prompt appears once per uid; never auto-imports; Import/Delete/Not-now behave as §4.4 | web test (Codex) | **BLOCKED** |
| P-14 | Two tabs edit the same play → second save shows conflict UI, nothing lost | web + emulator (Codex) | **BLOCKED** |
| P-15 | AI plan → edit → save → hard reload → identical; link from a film clip resolves | web + emulator (Codex), film part after S6 | **BLOCKED** |
| P-16 | Offline queue replay refuses operations queued under a different uid | unit (Codex) | **BLOCKED** |

# Persistence Contract v1 — account-scoped Playbook + editable practice plans

Proposed by Claude (rules/security owner) for Codex (implementation owner of `src/services/firestore.ts`, `SmartPlaybook.tsx`, `PracticePlanner.tsx`), 2026-10-13. **Status: ACCEPTED by Codex on #39 (2026-10-13 16:08 UTC).** The two practice-plan bound disagreements Codex raised were resolved as Codex proposed (§2, P-08b). The rules and emulator tests that enforce this contract are on branch `claude/persistence-contract-rules` (stacked on PR #49) and nothing is merged.

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
name 1..200 (= gateway title bound) · date? · duration? (0..600) · periods? list ≤40 · goals? list ≤20 · notes? ≤5000 (= gateway notes bound)
source?: 'manual'|'ai'         aiRequestId?: string ≤64 (coach-ai.v1 requestId)
safetyConsiderations?: list ≤20
ageGroup?: '6U'|'8U'|'10U'|'12U'|'14U'|'HS_JV'|'HS_VARSITY'|'ADULT'
skillLevel?: 'beginner'|'intermediate'|'advanced'
contactLevel?: 'non_contact'|'limited_contact'|'full_contact'
hydrationBreakMinutes?: list ≤20
revision?: int ≥1              teamId · createdBy · createdAt (immutable) · updatedAt
```

**Lossless mapping for AI plans (`coach-ai.v1` `practice_plan` → `practicePlans`):**

| coach-ai.v1 result | practicePlans field |
|---|---|
| `title` | `name` |
| `totalMinutes` | `duration` |
| `ageGroup` (+ request `skillLevel`, `contactLevel`) | `ageGroup`, `skillLevel`, `contactLevel` |
| `warmup` `{durationMinutes, activities[]}` | `periods[0] = {kind:'warmup', name:'Warm-up', durationMinutes, activities[]}` |
| each `periods[i]` `{name, focus, durationMinutes, drills[]}` | `periods[] = {kind:'period', name, focus, durationMinutes, drills[]}` with full drill objects `{name, durationMinutes, setup, instructions, coachingPoints[], equipment[]}` |
| `cooldown` | last `periods[]` entry with `kind:'cooldown'` |
| `hydrationBreakMinutes` | `hydrationBreakMinutes` |
| `safetyConsiderations` | `safetyConsiderations` |
| `notes` | `notes` |
| response `requestId` | `aiRequestId`; `source:'ai'` |

Round-trip must be exact: plan → save → reload → re-map back produces the same coach-ai.v1 `result` object, which is unit-testable by Codex. Rules can't validate inside list items, so the client validates each period/drill with the same bounds as the server's `OUTPUT_LIMITS` (zod schema shared in `contracts.ts`). Film links live on the clip side (`films/{id}/clips/{id}/links`), so there is **no** link field on plans or plays.

## 3. Concurrency (enforced in rules)

- Create at `revision: 1` (or without a revision, which is legacy).
- When a document has a revision, every update must send exactly `revision + 1`. A stale editor's write is **denied** (`permission-denied`), and the client must show "This was changed elsewhere — reload or keep your copy". Silent overwrite is not allowed.
- Documents without a revision (legacy) stay editable. The first update may opt in by writing `revision: 1`.
- **Client write semantics (agreed with Codex's proposal):** `runTransaction` reads the doc, checks `revision === expectedRevision` (the one the editor loaded) and writes `expectedRevision + 1`. A mismatch, or a rules denial, is a conflict. Rules are the server-side guarantee even if a client skips the transaction.
- **Denial is not proof of conflict (Codex amendment, accepted):** a `permission-denied` alone is shown as an authorization/save error. The conflict UI appears only when an authorized read or transaction shows a revision mismatch, and it never offers to overwrite or copy into a team the coach cannot access.
- **Phase mapping (client adapter, no rules change):** the main app's `special` is stored as `special_teams` and decoded back, with an exact UI round-trip test.
- **Offline queue:** an offline edit carries its `expectedRevision` and is replayed only for the same session (uid + teamId captured at enqueue time). On replay conflict it becomes a conflict draft; it is never force-written.
- **Conflict UI:** three choices: **Reload remote** (discard local), **Keep my version as a copy** (save as a new document, revision 1), **Export my version** (download JSON). Nothing is lost silently.

## 4. Device and account behavior (client requirements)

1. **Signed in → Firestore is the source of truth.** Local storage holds only unsynced drafts, scoped by **both** uid and team: `coachcore:v1:{uid}:{teamId}:drafts`. The offline queue moves to `coachcore:v1:{uid}:{teamId}:offline_operations`. Responses that arrive after a team or account switch are discarded (session captured at request time).
2. Code never reads or writes another uid's or team's keys. On account switch, the previous uid's in-memory state is discarded (PR #49 reloads the page on sign-out).
3. **Sign-out:**
   - Explicit sign-out runs the guards registered with `registerSignOutGuard(guard)` from `src/hooks/useAuth.tsx`. These are implemented on this branch with tests.
   - Codex's guard shows "You have N unsynced drafts: **Sync now** / **Export drafts** / **Sign out anyway** / **Cancel**". Returning false cancels sign-out, and a throwing guard also cancels (fail-safe).
   - Session expiry or revocation by Firebase can't be guarded. In that case uid+team-scoped drafts stay on the device for the same coach's next sign-in; the app never shows them to another uid.
   - `clearUserScopedState` removes only the current session key `currentTeamId`. **Amended 2026-10-14 (#61):** the legacy global `offline_operations` queue is quarantined (never replayed) and is now **preserved byte-for-byte** on sign-out, like the other legacy device data. It does **not** touch `smartPlaybook_plays`, `coachcore-playbook`, scoped `coachcore:v1:*` drafts, or other users' scoped keys.
4. **Legacy global data (`smartPlaybook_plays`, standalone `coachcore-playbook`):**
   - **D10 is pending, so import is inactive.** The originals are preserved byte-for-byte: not read into an account, not modified, not deleted.
   - If D10 is approved as recommended: one prompt per uid ("N plays are saved on this device from before accounts. Import into team X? **Import** / **Not now**").
   - **Import** writes copies with `localId` and verifies that each one reads back identically (P-03 fidelity) before the import is recorded.
   - Deleting the global originals is a **separate, explicit** later choice ("Remove the old copy from this device"), offered only after a verified import. It never happens automatically and never during D10-pending.
   - Decision stored at `coachcore:v1:{uid}:legacyImportDecision`.
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
| P-08 | AI plan with safety list + request id saved; lossless age/skill/contact/hydration fields saved; bad values denied | rules emulator | Written |
| P-08b | Plan name 200 OK / 201 denied; notes 5000 OK / 5001 denied; play name stays ≤120. The gateway enforces the same title ≤200 and notes ≤5000, so every accepted AI plan saves without truncation | rules emulator + functions tests | Written |
| P-09 | Coach B can't read/edit/create in team A even with a correct revision | rules emulator | Written |
| P-10 | Coach A's drafts invisible to coach B on the same browser profile | web test (Codex) | **BLOCKED**: not implemented |
| P-11 | Sign-out removes only the signed-out uid's keys; other uid's drafts survive | web test (Codex) | **BLOCKED** |
| P-12a | Sign-out guard can cancel sign-out; a throwing guard cancels; an agreeing guard proceeds | web test (Claude, `useAuth.test.tsx`) | Written, passing locally |
| P-12b | Unsynced-drafts guard UI (Sync / Export / Sign out anyway / Cancel) | web test (Codex) | **BLOCKED** |
| P-13 | While D10 is pending: legacy originals byte-identical before and after sign-in/sign-out, no prompt shown. After D10: prompt once per uid; import verified before recording; no automatic deletion | web test (Codex) | **BLOCKED** (D10 pending; implementation pending) |
| P-14 | Two tabs edit the same play → second save shows conflict UI, nothing lost | web + emulator (Codex) | **BLOCKED** |
| P-15 | AI plan → edit → save → hard reload → identical; link from a film clip resolves | web + emulator (Codex), film part after S6 | **BLOCKED** |
| P-16 | Offline queue replay refuses operations queued under a different uid | unit (Codex) | **BLOCKED** |

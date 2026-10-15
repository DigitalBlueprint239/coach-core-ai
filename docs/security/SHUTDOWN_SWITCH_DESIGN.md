# Non-destructive spend shutdown switch: design only

Claude, 2026-10-13. **Status: DESIGN, not built, not deployed, not configured.** Building it needs Coach Drew's approval (Founder Decision Packet D5). Activating it in any project is a separate live-configuration approval.

## 1. Goal and non-goals

**Goal.** When staging spend crosses a threshold, stop the expensive paths automatically **without disabling billing and without deleting data**:
- AI;
- film uploads and processing;
- new playback links;
- optionally all client writes or reads.

**Non-goals.**
- It is **not a hard cap.** Billing data that triggers it is delayed, and some charges continue (§5).
- It does not replace the Firebase spend cap, the OpenAI hard limit or the app quotas. It sits on top of them.
- It never deletes files, documents or accounts.

## 2. Components

| Component | Where | Notes |
|---|---|---|
| Budget for the staging project, with Pub/Sub notifications | Cloud Billing → Pub/Sub topic `billing-budget-staging` | The budget itself only notifies. Google publishes the budget's status "multiple times per day"; the first message can take "several hours"; delivery is at-least-once and may be out of order (✔ docs) |
| Switch document `config/killSwitches` | Firestore | `{ level, reason, setBy, setAt, budgetCostAmount, budgetAmount, costIntervalStart, version }`. Clients may read it, to show a banner. **No client may write it** (rules deny); only the Admin SDK or the console can |
| History `config/killSwitches/history/{id}` | Firestore | Append-only audit of every change: who/what, from→to, cost figures |
| Subscriber function `onBudgetNotification` | Cloud Functions (Pub/Sub trigger) | Maps cost/threshold to a level and **only escalates**. Idempotent; ignores stale or duplicate messages (compares `costIntervalStart` and `costAmount`) |
| Enforcement points | Gateway, upload-reservation and playback-link functions; Firestore and Storage rules | Each reads the switch. Functions cache the read for ≤30 s; rules read it per request |
| Clear/override script `functions/scripts/kill-switch.js` | Run by the founder with admin credentials | `status`, `set <level> --reason`, `clear --reason`. The only way to de-escalate. Always writes history |

## 3. Levels (monotonic: automation can only raise them)

| Level | AI | Film upload | New playback links | Client writes (plays, plans, teams) | Client reads | Proposed automatic trigger |
|---|---|---|---|---|---|---|
| `normal` | per `COACH_CORE_AI_ENABLED` | on | on | on | on | — |
| `ai_off` | **off** | on | on | on | on | AI spend share > $40 (optional) |
| `film_off` | off | **off** | **off** | on | on | project budget **≥ 50%** of $100 |
| `read_only` | off | off | off | **off** | on | project budget **≥ 100%** of $100 |
| `paused` | off | off | off | off | **off** (signed-in users see a "beta paused" screen) | **manual only** (founder) |

Thresholds are proposals for Coach Drew to set. Email alerts at $25/$50/$100 stay as they are.

**De-escalation is manual only.** A new month, or lifting the Firebase spend cap, does **not** reset the switch. That stops a lifted cap from silently reopening everything.

## 4. Behaviour by situation

### 4.1 Normal operation (functions running)

1. Budget message arrives, then the subscriber computes the level. If it is higher than the current level, it writes `config/killSwitches` and a history entry.
2. Within ≤30 s:
   - the gateway refuses (`ai-disabled`);
   - the upload-reservation function refuses new uploads;
   - the link function refuses new links.
3. Rules enforce `read_only` and `paused` on the next request.
4. The app shows a banner, and the founder is emailed (the same alert channel).

### 4.2 If Cloud Functions is already paused by the Firebase spend cap

The spend cap pauses **all** Cloud Run functions in the project, including the subscriber. So:

- **Function-mediated paths are already stopped by the cap itself:**
  - AI calls fail.
  - No upload reservations can be created, so Storage rules (which require a reservation) refuse uploads.
  - No new playback links are issued.
  - Film validation and the retention sweeper stop.
  - Clients see errors that the UI must handle gracefully.
- **The subscriber cannot run, so the switch is not set automatically.** Budget messages stay in the Pub/Sub subscription (retention set to 7 days in this design). When functions resume (the cap is lifted, or the 1st of the month), the subscriber processes them and latches the right level **before** anyone can use the reopened paths. Duplicate and old messages are ignored by `costIntervalStart`.
- **Still running and still billing:**
  - Firestore direct client reads and writes (rules still enforce access);
  - Firebase Hosting;
  - Cloud Storage at-rest;
  - links issued in the last ≤10 minutes.
- **Manual path (works without functions):** the founder sets `config/killSwitches.level` in the Firebase console, or runs `kill-switch.js set read_only`. Rules then enforce `read_only` or `paused` immediately, with no functions involved.
- **Last resort:** deploy deny-all rules (pre-written in `rules/emergency/`, still a deploy). **Never** disable billing: it is destructive and can delete resources.

### 4.3 Existing playback links

- Links are V4 signed URLs that expire in ≤10 minutes. **They cannot be revoked by this switch or by rules.** Signed URLs are checked against the signature and expiry, not against Firestore or Security Rules. Google documents only expiry or signing-key rotation as ways to end a link (✔ docs).
- With the default service account and IAM `signBlob`, the signing keys are Google-managed. **There is no key we can rotate on demand.** Removing the signer's bucket permission may also cut links off, but this is **undocumented**, so the design does not rely on it.
- **Result:** after the switch sets `film_off`, playback stops within **≤10 minutes** as existing links expire. During that window a holder can re-download the file within the link's lifetime, so residual egress is bounded by links issued in the last 10 minutes.
- **Immediate cutoff, emergency and manual only:** rename (copy then delete) the affected film objects so existing links return 404. This is founder-approved, costs operations, and the deleted originals stay in soft-delete (and keep billing) for the bucket's soft-delete period.

### 4.4 Ongoing storage charges (not stopped by any level)

- **At-rest storage keeps billing.** The switch never deletes. At the beta estimate (≤20 GB) that is about $0.30–0.40/month (✔ Standard ≈ $0.020/GiB-month).
- **The retention sweeper is a function, so it is paused with Functions.** Backstop: a **Cloud Storage Object Lifecycle rule**, which runs inside Storage and does not depend on Functions. Proposed rules:
  - `quarantine/`: delete at age ≥1 day;
  - `films/`: delete at age ≥31 days, one day after the app's 30-day retention.

  Lifecycle actions run asynchronously, and configuration changes can take up to 24 h to apply (✔ docs). Standard storage has no early-deletion fee. Setting the lifecycle rule is a live configuration change, approved with D4/D5.
- **Firestore storage and indexes** keep billing (tiny for the beta). Firestore reads by legitimate users continue until `read_only`/`paused`; at `paused`, rules deny client reads.
- **Hosting** keeps serving the static app (free tier 10 GB/month).

## 5. Exposure that remains even with the switch

| Source | Why it isn't stopped | Bound |
|---|---|---|
| Delay before the switch trips | Billing data and Pub/Sub messages lag "several hours"; costs are estimates until invoice | Spend accrued during the lag. Shrink it with app quotas and Monitoring alerts (minutes) |
| Firebase spend-cap lag (Functions) | "can be delayed by several minutes"; overage billed | Minutes of function usage |
| OpenAI hard-limit lag | "spend can slightly exceed the configured amount" | Small |
| Live playback links | Can't be revoked | ≤10 min of re-downloads per issued link |
| Storage at rest, Firestore storage, Hosting | Not usage-gated | Small; listed in §4.4 |
| Firestore reads at `film_off` | Reads are still allowed | Until `read_only`/`paused` |

## 6. Rules sketch (not applied)

```
function switchLevel() {
  return exists(/databases/$(database)/documents/config/killSwitches)
    ? get(/databases/$(database)/documents/config/killSwitches).data.level : 'normal';
}
function writesAllowed() { return !(switchLevel() in ['read_only', 'paused']); }
function readsAllowed()  { return switchLevel() != 'paused'; }
match /config/killSwitches { allow get: if isBetaUser(); allow write: if false; }
// add `&& writesAllowed()` to every client create/update rule, `&& readsAllowed()` to reads.
// Storage: uploads also require switchLevel() in ['normal', 'ai_off'] (cross-service firestore.get).
```

**Cost note:** each rule evaluation adds 1 billed document read for the switch. Rules cache `get()` within a request; the 10-`get()`-per-request limit still has room.

## 7. Test plan (when approved)

All tests run in emulators; none touch real billing:
- **Pub/Sub emulator:** publish synthetic budget messages at 49% / 50% / 100%, plus duplicate and out-of-order copies. Check the levels escalate exactly once and never de-escalate.
- **E2E (PR #54 harness):** at `film_off` the gateway refuses and upload reservation is refused. At `read_only` a play save is denied with a clear message. At `paused` the app shows the paused screen.
- **Functions-paused simulation:** run without the functions emulator. Set the switch via the Admin REST API, then check that the rules enforce `read_only`/`paused`. Restart functions with queued messages and check the latch holds.
- **Clear script:** only the admin path can de-escalate, and history entries are written.

**Size:** about one Claude slice (rules + subscriber + script + tests). Lifecycle and budget wiring are configuration changes for the founder to approve at deploy time.

## Sources

- Budget Pub/Sub notifications: https://docs.cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications
- Firebase spend caps: https://firebase.google.com/docs/projects/billing/spend-caps
- Signed URLs: https://docs.cloud.google.com/storage/docs/access-control/signed-urls
- Object Lifecycle Management: https://docs.cloud.google.com/storage/docs/lifecycle
- OpenAI spend limits: https://developers.openai.com/api/docs/guides/spend-limits

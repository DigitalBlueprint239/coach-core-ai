# Staging readiness checklist (before requesting a staging deploy)

Claude, 2026-10-13. **Status: NOT READY TO REQUEST DEPLOYMENT. MVP NO-GO** (updated 2026-10-14 evening: CC02/CC03 and the D10 repairs — implementation delivered; independent acceptance pending. ×10 measured: open defects L1 and R1b fail 10/10 on both engines; Firefox intermittent H2). Items marked ✗ or ⚠ below must be closed first. Nothing here merges, deploys, spends or changes live configuration.

## 1. Exact PR/commit combination

The test-only candidate is **`claude/integration-candidate-2026-10-13b` @ `9b84573`** (`c112b68` + PR #54's A09 diagnostics). It is evidence only, never merged and has no PR. It was built from `recovery/coach-core-mvp-2026` @ `3992d8d` in this order:

| # | PR | Head | Review state | Contents |
|---|---|---|---|---|
| 1 | #40 Codex tests | `dd7fe83` | open | test repairs (FieldMemo etc.) |
| 2 | #42 Claude Day 1 | `498c4cc` | open | audit docs |
| 3 | #45 Codex shared docs (draft) | `503af06` | draft | docs. Conflicts with #42 in `docs/COACH_CORE_SHARED_CONTEXT.md`; resolved in the candidate by keeping both, and needs the same manual resolution on the real merge |
| 4 | #49 Claude Day 2 | `341e95b` | open | auth gate, rules, AI gateway, prebuild guard |
| 5 | #51 Codex film plan (draft) | `1da86e3` | draft | docs only (film not implemented) |
| 6 | #52 Claude Day 3 docs | `007ce2a` + this commit | open | security docs, decision packet, evidence |
| 7 | #53 persistence contract (draft) | `a4cea1e` | draft, **accepted by Codex** | rules + boundary tests |
| 8 | #54 E2E harness + readiness tooling | `f9ba83c` | open | emulator mode (fail-closed), E2E, release proof, staging probe |

**Gates at the candidate:**
- web jest **366/366**, 18/18 suites (at `8fabcec`; `66dfadf` adds only scripts and docs);
- tsc **0**;
- release-build proof **13/13** (§2; local and CI);
- CI: rules, functions and web-auth+bundle scan green.
- E2E ×10 at `9b84573` (run `38436729577`): **Chromium 140/140, Firefox 140/140**, 80 BLOCKED each. Release proof 13/13 in CI.
- One earlier A09 failure on `c112b68` remains an **open intermittent** (1 in ~90 executions; cause not established; diagnostics added).

**Not in the candidate (✗ dependencies):**
- Codex client work for P-10..P-17: per-coach drafts, cloud play save, plan edit/save, conflict UI, offline replay. **None has landed yet.** The 8 E2E placeholders stay BLOCKED until each lands with a real test.
- Standalone Smart Playbook PR #3 (separate repo). It is approved on Chromium and has Firefox 30/30 on the persistence tests; the full Firefox suite ×10 is requested. Its integration into the main app is the Day 5 decision.
- #47 (ADR, OpenAI-only amendment) is still open.

**Outstanding critical dependency findings** (main app, `npm audit --omit=dev`): **3 critical, 5 high, 2 moderate**. Functions and rules tests: **0**.

| Severity | Package (path) | Reaches browsers? | Fix |
|---|---|---|---|
| critical | `protobufjs` 7.5.3 (firebase → @firebase/firestore → @grpc/proto-loader) | **No.** Node-only Firestore transport; the bundle contains only a `type.googleapis.com/google.protobuf.*` string | update `firebase` (non-major fix available) |
| critical | `websocket-driver` 0.7.4 (firebase → @firebase/database → faye-websocket) | **No.** Node-only Realtime Database transport | update `firebase` |
| critical | `tar` 7.4.3 (@tailwindcss/postcss → @tailwindcss/oxide) | **No.** Build machine only (risk is to the build/CI host) | update `@tailwindcss/postcss` |
| high | `@grpc/grpc-js`, `browserslist`, `nanoid`, `postcss` (direct), `source-map-js` | Node/build-time; `postcss` is a direct dependency | `npm audit fix` (all non-major) |
| moderate | `@protobufjs/utf8`, `yaml` | Node/build-time | same |

⚠ **Gate:** Codex lands the dependency update (non-major fixes are available for all 10), or Coach Drew accepts the remainder in writing. Then re-run the full regression on the new candidate SHA.

## 2. Production-build proof: test hooks and emulator config are absent

`bash scripts/security/verify-release-build.sh coach-core-mvp-staging-239` (PR #54; also a CI step) passes 13/13 at `c112b68`:

- **The guard refuses an emulator build for the real staging project.** It also refuses for any non-`demo-*` project, at runtime in `src/firebase.ts`.
- **`.env.production` pins `REACT_APP_USE_FIREBASE_EMULATORS=false`**, so webpack removes the emulator/hook branch entirely.
- **A staging-shaped build contains none of:**
  - the `__coachCoreE2E` marker or the `e2e-support`/`emulator-hooks` modules;
  - emulator ports 9099/8080/5001/9199;
  - `demo-*` values or e2e placeholders.

  It does contain the staging project ID.
- **Negative control:** the same patterns **do** match the emulator build, so the scan is not vacuous.
- **SHA-256 manifest** of the built files is written.

⚠ **At deploy time** the founder's deploy must:
1. run this script with the real staging web config (public identifiers, no secrets);
2. deploy **that** `build/` without rebuilding;
3. keep the manifest.

The proof build above uses a placeholder web key, so its bytes intentionally differ from the deployed build.

## 3. Staging tests prepared (run only after an approved deploy)

| Area | IDs | How |
|---|---|---|
| Real authentication | RA-01..RA-08 | Manual, `e2e/staging/REAL_AUTH_CHECKS.md`: real email link, link reuse, cross-device, real Google, beta grant/revoke, **Anonymous disabled server-side**, unauthorized domain |
| Invalid-token rejection | SEC-08, 08b, 08c, 08d | `e2e/staging/gateway-probe.mjs`: forged RS256 token and malformed token must return 401 `UNAUTHENTICATED` from the gateway; a forged token must also get 401 from Firestore |
| Origin handling | SEC-07, SEC-09 | Same probe: an unlisted origin gets no `allow-origin`; the staging origin does. `COACH_CORE_ALLOWED_ORIGINS` must be a **JSON array** |
| Probe validity | — | Self-test on the emulator correctly **FAILS** SEC-07/08 (the emulator allows all origins and skips token checks). The probe refuses any project except `coach-core-mvp-staging-239` |
| Existing smoke plan | AUTH, ISO, WF, FILM, SEC-01..10 | `STAGING_SMOKE_TEST_PLAN.md` |

## 4. Spending controls: availability in our accounts

✗ **Not verified in our accounts from this session.** Google Cloud APIs are refused by this session's network policy (403 at the proxy), and there is no console or OpenAI access. No setting was read, enabled or changed. Availability per vendor documentation (re-checked 2026-10-13):

| Control | Vendor scope (✔ docs) | Founder read-only check (change nothing) | Record |
|---|---|---|---|
| Firebase spend cap | Preview; **Blaze** plan required; covers Cloud Functions (Cloud Run functions), App Hosting, AI Logic and Extensions. **Not** Storage, Firestore or Hosting. Enforcement can lag several minutes | Firebase console → `coach-core-mvp-staging-239` → Settings → Usage and billing → Details & settings: note the **plan** and whether a **"Service-level spend caps"** card is shown | Screenshot: plan + card present/absent |
| Budget + alerts | Notify only; Pub/Sub messages several times a day, first may take hours | Cloud console → Billing → Budgets & alerts: list existing budgets. Or read-only `gcloud billing budgets list --billing-account=<ID>` | List of budgets (or none) |
| Billing link | — | `gcloud billing projects describe coach-core-mvp-staging-239` (read-only) | `billingEnabled` true/false |
| OpenAI hard spend limit | Per project or organization; blocks with HTTP 429 `project_spend_limit_exceeded`; slight overshoot possible | platform.openai.com → the staging project → Settings → Limits → Spend: confirm **"Enforce a hard limit"** is offered. **Do not save** | Screenshot of the option |
| OpenAI model access | `gpt-6.1-sol` in the staging project | Project → Limits → Models (read) | Screenshot |

## 5. Revised cost language

Used in `FOUNDER_DECISION_PACKET.md` §4 and required in all status updates:

- **Thresholds:** budget alerts at $25/$50/$100 **only notify**. A threshold is a trigger point, not a maximum.
- **Delayed enforcement:**
  - OpenAI hard limit $50: stops new AI requests, **possibly slightly above $50**.
  - Firebase spend cap $20: **pauses Cloud Functions only**, after up to several minutes; Preview feature.
  - App AI quotas: immediate, counted per request.
- **Uncapped:** Firestore, Cloud Storage (at rest and downloads), Hosting, Cloud Logging, Cloud Build/Artifact Registry, Pub/Sub. These are limited only by invite-only access, app limits, alerts and a person acting on them.
- **Estimates, not quotes:** ≈$0–15/month infrastructure + ≈$17 AI at expected beta use.
- The shutdown switch is **designed, not built** (`SHUTDOWN_SWITCH_DESIGN.md`).

## 6. Go/no-go before requesting deployment

| # | Item | Owner | Status |
|---|---|---|---|
| G1 | Dependency findings fixed or accepted in writing; regression re-run on the new candidate SHA | Codex / Coach Drew | ⚠ Production `npm audit` **0** after #60 (verified on candidate-4 clean install); full-graph dev/tooling advisories remain as disclosed in #60 and need fixing or written acceptance |
| G2 | Founder decisions D5 (billing + controls) and D10 (legacy import), plus D1–D7 if film is in the deploy | Coach Drew | ✗ |
| G3 | Founder read-only verification of §4 controls recorded | Coach Drew | ✗ |
| G4 | PR #49 founder actions (§6 of the Day 2 report: old keys checked/rotated, web key restricted, Anonymous OFF, authorized domains) | Coach Drew | ✗ |
| G5 | Candidate CI green: rules, functions, web+bundle, E2E Chromium+Firefox | Claude | ✗ at candidate-4 `c858d1d`: rules/functions/web+bundle ✔; E2E ×10 400/20 per engine (L1, R1b); clean `npm ci` jest 416/416, tsc 0, release proof 13/13, prod audit 0 |
| G6 | Release-build proof re-run with the real staging web config at deploy time; manifest kept | deployer | prepared |
| G7 | Staging config: `COACH_CORE_AI_ENABLED=false`, `COACH_CORE_ALLOWED_ORIGINS` as a JSON array, AI global cap 50/day | deployer | prepared |
| G8 | Smoke plan + RA/SEC checks scheduled with synthetic accounts and test-pattern video only | Claude + Coach Drew | prepared |
| G9 | Client features the demo needs (Codex P-10..P-17) landed with real E2E tests | Codex / Claude | ⚠ **implementation delivered (#59/#60); independent acceptance pending.** CC-P10..P17 (+P10b, P16b) PASS **10/10** on Chromium 156 and Firefox 157 at `709e0f4` and candidate `c858d1d` (PR #63) |
| G10 | Shutdown switch: approve build before film upload, or accept the exposure in writing | Coach Drew | open decision |
| G11 | D10 legacy import (#55) accepted in real browsers | Codex (R1, R2, R5) / Claude (re-test) | ⚠ **implementation delivered (#59); independent acceptance pending.** History: FAIL on 2026-10-14 (R1/R2 10/10, report §7, PR #56, kept as evidence). Re-test ×10 at `709e0f4`/`c858d1d`: R1 finished-import (D10-06b), R2 (D10-07b) and R5 (D10-12) **VERIFIED FIXED** (10/10 both engines). **R1b** (unfinished import offered to another account, D10-06c) **FAIL 10/10**, repair requested |
| G13 | Legacy device data never deleted: quarantined `offline_operations` on sign-out (#61 escalation), Migration Banner (L1) | Claude (auth) / Codex (banner) | ⚠ Sign-out: **fixed** by Claude in `12e386f` (CC-L0 PASS). Banner: **L1 FAIL 10/10** on both engines (app reports success and deletes the original); bounded repair requested on #59 |
| G12 | CC02 cloud edit/conflict/sign-out recovery and CC03 practice-plan save/reopen implemented, with independent acceptance P-10..P-12b, P-14..P-17 | Codex / Claude | ⚠ **implementation delivered; independent acceptance pending.** Scenarios PASS 10/10 both engines; gate open until L1/R1b close and the suite is re-run green |

## Tracked limitations (kept open until closed with evidence)

| Item | Owner | Status |
|---|---|---|
| R3: "Not now" on the D10 prompt is a permanent decline (no re-entry point) | Codex / Coach Drew | OPEN (disclosed limitation) |
| R4: `D10_APPROVED = true` build constant, so the import prompt ships in release builds | Codex / deploy decision | OPEN |
| Firefox instability: H1 team-creation toast (3 in the morning, 0 in 1,660 afternoon Firefox executions); **H2** D10-07 timeout 1/10 at `709e0f4`; Codex's P14 background-tab reload timeout | Claude / Codex | OPEN; diagnostics in place, no retries |
| Standalone Playbook touch exit (Windows, PR #3 repo) | Codex | OPEN |
| Physical tablets/phones; staging real auth, CORS and token checks (RA-*, SEC-07..10) | Coach Drew / Claude | NOT MEASURED (requires approved staging) |

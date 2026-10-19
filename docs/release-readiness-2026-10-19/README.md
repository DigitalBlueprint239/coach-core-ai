# Coach Core release-readiness package

**Preparation only. MVP NO-GO.** Baseline: accepted PR79 source **`515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1`**, tested PR merge **`950addf164e4f789c6488bf5af7dd60dc2e43ce8`**. No application/workflow/test/config changes, unchanged test reruns, enforcement execution, merges, deployments, live-data/configuration operations, recovery or AI activation are part of this package.

## 1. Preserve what is accepted; qualify the product-defect statement

[Posted closure](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6269823320), [PR79](https://github.com/DigitalBlueprint239/coach-core-ai/pull/79), [run39268393120/1](https://github.com/DigitalBlueprint239/coach-core-ai/actions/runs/39268393120), [immutable evidence/review9984b7c](https://github.com/DigitalBlueprint239/coach-core-ai/tree/9984b7cf7a7301b4423595eaa516d59d1f17ac1a/docs/evidence/combined-closure-515dc1d).

Preserved PASS: combined implementation and complete required emulator acceptance, **160/160**; release L3 **10/10**; all13 ZIPs verified; real-PR aggregate **ELIGIBLE/success**, independently recomputed. Main182 executions:180passed/2N2-D2 diagnostic60s timeouts; whole workflow correctly concludes failure. Diagnostic failures were not waived or turned into passes. Source/merge trees identical. Local focused33gate/10reporter/19evidence/65real-build-release/49import pass; CI gate27pass/6history skips and release39pass/26skips remain accurately distinguished. No tests were rerun for this documentation package.

**Confirmed product defects:** no surviving demonstrated blocking app-code defect is established on515dc1d in the accepted **core** paths (identity/team, cloud plays/practice editing, approved import/recovery boundary with import OFF). This is not a blanket “no defects” or beta-ready assertion. Two N2-D2 failures are confirmed diagnostic test failures, not proof of a new reachable app defect. H2/FX-02/N3/N2-A2 remain unresolved observations/risks; nonrecurrence does not close them. Manual re-save after certain failed edits and fresh “Not now” ask-once behavior are approved limitations, not newly unaccepted defects.

**Scope blocks a broader clean-bill claim:** the queue records a confirmed **Windows-touch exit defect in the separate standalone Playbook**, with no linked repair/device PASS or written scope exclusion. It is not demonstrated on PR79; if that standalone experience is included in the beta, this is a remaining product defect requiring repair+device proof or explicit exclusion. The **Film Analyzer is required for the full MVP and is not implemented/accepted in this baseline**; that is a product capability/acceptance gap, not a diagnostic timeout. A core-only trial must be explicitly named and authorized as reduced scope; this package does not silently drop film from the MVP. These distinctions must appear in the founder decision.

Old queue headings and old staging documents contain superseded failures/pending decisions. Use current SHA-pinned acceptance above, approved policy comments6221265245/6224877757 and the detailed distinctions here. Do not reopen settled D1–D9 direction; request the existing detailed approval record where its terms are missing.

## 2. Enforcement validation procedure — NOT authorized to execute here

**Owners:** Coach Drew/repository administrator authorizes any temporary protection/fixture/App/branch changes; Claude or designated CI maintainer prepares the bounded fixture; a different reviewer verifies it. Current production/recovery rules remain untouched.

**Isolation:** propose disposable target `validation/coach-core-enforcement-2026-10-19`, initially at exact515dc1d, and case branches `validation/enforcement-case-<ID>`. Do not repurpose recovery/master, PR79's frozen target, or accepted source branches. Before creation, ensure these names are unused. If repository-level inherited rules would make this non-isolated, stop and obtain authorization for a dedicated disposable private test repository instead. Case PRs are never merged. Existing accepted workflow's PR filters do not include this new target.

**What is authorized now:** prepare/read/review this plan and payload only. **What needs explicit Coach Drew authorization:** creation of disposable targets/fixture PRs/workflow runs; temporary protection and any restoration/removal; timeout/cancel/force-cancel probes; any alternate-App test/installation; future application of settings to recovery. No write command is executed by this package.

### E0 — capture and establish the temporary fixture

1. Admin records repo/target SHA, owner, UTC start/end and intended duration; checks write permissions and selects another reviewer. Record expected GitHub Actions App **id15368** from accepted check118118349642, but verify live App identity before applying anything.
2. Save read-only snapshots of target branch, classic protection, repository rulesets (including parents), Actions permissions and bypass policies. `gh api repos/DigitalBlueprint239/coach-core-ai/rulesets?includes_parents=true` and `gh api repos/DigitalBlueprint239/coach-core-ai/branches/<URL-encoded-target>/protection` are read-only examples. Preserve HTTP404 as absence only when authorized branch lookup succeeds;403 is inaccessible, not absent. Store checksums and an owner-readable restore copy. Never dump tokens.
3. Review a test-only fixture scoped **only** to the disposable target. It must exercise the accepted aggregate job's always-run/entry-guard/download/evaluation/terminal conditions, expose timed rendezvous markers, and allow controlled success/failure/missing/timed-out/cancelled outcomes. Keep one authoritative check name per case. Do not alter actual browser assertions or normal acceptance limits.
4. Distinguish **platform fixture results** from product acceptance. A controlled valid-fixture evaluator or stub is permitted only as explicitly labeled platform-test evidence, never as a real application ELIGIBLE verdict. PR79 already supplies the actual positive trusted-PR application path. Test double omissions do not close end-to-end artifact correctness. If additional real-candidate validation becomes necessary, authorize it separately on the next changed release candidate; do not repeat PR79's unchanged matrix.
5. Use temporary case-job timeout2minutes / controlled wait180seconds for timeout fixtures only; these are not changes to accepted20/120-minute limits. Use a release marker or bounded wait to cancel after the entry guard has skipped and before/after evaluation. Capture timing, not just the final badge.

### E1 — exact proposed settings

`proposed-protection.json` is a **review payload, not applied**. Proposed classic protection for the disposable target (and separately, only after successful review/authorization, intended recovery policy):

- Required check: **only `Coach Core merge eligibility`**, expected GitHub Actions App15368. Do not require name-only acceptance jobs as a substitute.
- Require PRs, **1 independent approving review**, dismiss stale approvals, require approval of the most recent reviewable push, resolve conversations.
- Strict/up-to-date status checks **ON**; administrator enforcement **ON**; no force pushes/deletions; no routine bypass. `restrictions:null` means no additional push-actor allowlist, not permission to bypass PR/review/check requirements. No special bypass list is proposed.
- No merge queue proposed for the initial validation; no auto-merge. Merge queue is an alternative owner choice, not silently enabled. If intended, use separate reviewed queue policy and tests below. No site/Firebase settings are part of this payload.

Expected App identity does not bind a check to a particular workflow file: another GitHub Actions job can emit the same name. Before recovery enforcement, the designated trusted maintainer must review changes to workflows/evaluator/artifact code; no CODEOWNERS protection is claimed by this payload (`require_code_owner_reviews:false`). If that trust boundary is not already enforced by the approved collaborator/review policy, add a separately reviewed CI-ownership rule before claiming adversarial enforcement readiness.

Admin first confirms support/plan/role availability for these settings and inherited rules. Read back the effective rule after applying it to the disposable target. If any required field is unsupported, stop and revise the proposal rather than silently omit it. Do not loosen recovery or organization rules.

### E2 — execute cases after authorization; never merge

For every case retain target/head/tested merge SHA, event, run/attempt, workflow/check IDs, App identity, step timing, check conclusion, evaluator/report when present, review state and actual merge-eligibility reason. Have the independent reviewer satisfy the review prerequisite on safe fixture PRs so a missing review does not mask the status-check result. Capture API mergeStateStatus/status rollup plus protected PR UI merge-control reason. No merge API call or “merge and undo” test.

| ID | Action on disposable fixture | Expected check/evaluator | Required platform evidence |
|---|---|---|---|
| E-POS | Complete controlled valid evaluation | success; actual application positive remains PR79 evidence | Required-check requirement satisfied with expected App; do not call it beta approval |
| E-FAIL | Fail acceptance/evaluation; separately withhold one artifact | failure; named incomplete evidence reasons | Merge ineligible specifically because required check failed |
| E-MISS | Case with no matching authoritative job/workflow; separate invalid workflow/renamed context | no required check / pending, not a fabricated success | Merge blocked by missing expected context, even if other checks green; distinguish parse failure from evaluator execution |
| E-APP | If authorized alternate App already exists, publish same-name success from it while expected App absent | Expected App check still missing | Merge blocked. Otherwise record App-spoof case NOT MEASURED; no new installation implied |
| E-MTIME | Timeout matrix fixture before complete execution | aggregate schedules and fails incomplete coverage | timed-out prerequisite cannot produce satisfying eligibility |
| E-GTIME | Timeout authoritative job itself | timed_out/cancelled, no completed eligible verdict | Required-check rules block; exact GitHub terminal state recorded, not assumed |
| E-EARLY | Normal/API/concurrency cancel during matrix | entry guard/evaluator fail, or hard terminalcancelled | no skipped-success; required check blocks |
| E-LATE | Cancel after entry guard skipped, otherwise eligible input; repeat at evaluation rendezvous | Observe actual conclusion; entry guard is not a continuous cancellation latch | Recommend **all cancelled validation attempts block**. If a late-cancelled fixture succeeds, enforcement FAIL: review terminal cancellation guard/design before claiming policy. Completed eligible output alone does not prove cancellation handling |
| E-FORCE | Force-cancel authoritative fixture while running | cancelled/no completed evaluation | Protected PR remains blocked; no report is not counted as eligible |
| E-STALE | Prior success then failed/cancelled/missing authoritative rerun on same SHA; inspect failed-jobs/full-rerun paths separately | stale-attempt artifacts rejected by R4; preserve earlier results | Demonstrate selected required check cannot use stale success to mask newest invalid attempt. No claim that all upload/rerun paths behave alike |
| E-SKIP | Explicitly skipped authoritative fixture, plus downstream skipped prerequisite | GitHub may treat skipped check as success | Negative control must show danger; production design may never use that skip path. If effective rule accepts skipped authoritatives, enforce non-skippable evaluated success by design and demonstrate it |
| E-QUEUE | **Only if a queue is intended:** real merge_group checks_requested, supersession/rebuild, failure/cancel/missing cases | exact queue SHA/head/run binding and complete reviewed evaluation | Queue cannot admit failed/cancelled/missing/stale group check; separate authorized fixture first and changed-candidate end-to-end evidence later |

If platform selection masks a cancelled/missing run with earlier same-SHA success, the proposed check-only policy is insufficient: stop enforcement acceptance and review a run/attempt-aware design. Do not pretend documenting this limitation enforces it. Require a new independent review for any code correction.

### E3 — restoration and sign-off

Stop new fixture triggers, preserve/redact/hash evidence, and confirm no pending cancellation affects unrelated runs. Close unmerged case PRs. If target was newly created/unprotected, admin removes **only the newly installed target-specific rule**, verifies404/absence and unaffected inherited rules, then deletes disposable branches **only if their deletion was included in the explicit authorization**; otherwise retain them clearly labeled inactive. If a pre-existing rule was intentionally used, restore its exact saved effective settings and independently compare normalized JSON; do not replace it with a generic null/default payload. Remove only fixture files/Apps created for this experiment under their separately approved cleanup. Record recovery/master rules and SHAs unchanged. Failure to restore is an open incident/blocker, not PASS. No live Firebase data or services are involved.

## 3. Firebase/access checklist — executable after access/operation approval

Do not run these steps against production or invent credentials. Coach Drew names the operator and grants the necessary **read-only** console access first; permission failure is BLOCKED, not a product defect. Every result record must contain ID, operator/reviewer, UTC, exact candidate/artifact/project/site, access used, observed/expected values, pass/fail/blocked, redacted evidence path/hash and next action. Never retain key values, tokens, sign-in/OOB links, service-account JSON or real coach/player data.

| ID / owner | Required access | Procedure and completion evidence |
|---|---|---|
| F-01 Drew + deploy owner | Project/browser-console Viewer, relevant IAM/security read roles | Confirm stagingproject **coach-core-mvp-staging-239**, project number, webAppID, Hosting site, bucket, database, regions and named operator/IAM. Source `.firebaserc` defaults to originalcoach-core-ai: every future command must name approvedstaging explicitly. Record metadata and role scope; no `firebase use` or bare deploy |
| F-02 Drew + Claude | Firebase Auth/config read + API-key restriction metadata read | Record Google/email-link enabled, Anonymous OFF server-side, authorizeddomains, webkey API/origin restrictions; record oldkey rotation/check attestation by identifier/date only. Never read/reveal secret values. A failed setting check opens a scoped remediation request, not automatic correction |
| F-03 Drew + billing owner | Billing/usage/budget read | Record billing link/plan, existing budgets/alerts and actual spend-control availability/scope/lag, usage and operator escalation. Read-only example: `gcloud billing projects describe coach-core-mvp-staging-239`; budget listing requires separately confirmed billing-account ID. Alerts are not caps; do not copy old proposed dollar amounts as configured limits. AI-off makes provider-activation/model-access tests out of current scope; preserve settled spending terms/provenance |
| F-04 Claude/security + authorized operator | Functions/CloudRun config/invoker/IAM metadata and logging read; no secret payload access | Verify effective AI=false, approved JSON-arrayorigins, exact function allowlist, service identities and no unintended public/admin/deletion handlers; record config revision and redacted metadata. Inspect bindings/versions, not SecretManager values. Do not deploy/delete `cleanupOldNotifications` or activate schedules |
| F-05 Claude/security | Rules release metadata and source read | Compare deployed Firestore/Storage rules and version/hash to approved source; confirm intended isolation. Source/emulator PASS is not deployedrules PASS. No console publish. Record rulesversions/hashes/diff and accessible/notaccessible result |
| F-06 Drew + Claude | Hosting/access-policy read | Choose and verify restricted site-access model. `noindex`, obscure URL and data Auth are not a site-access gate. Recommend explicitly protected staging access; if owner instead permits public shell/private data, document exact exposure/risk and independent security approval. Capture signed-out/unauthorized access result without real data |
| F-07 Drew + Claude | Existing settled decision record | Link settled D1–D9 terms, current privacy/shared-device policy, retention and rollback authority. Browser recovery storage is same-origin plaintext; UI isolation is not encryption. Recommend personal-device-only trial until shared-device residual risk is explicitly accepted or a reviewed solution exists. Preserve originals; no cleanup |

No new Firebase console access has been established by this package. Prior GitHub0environments/0deployment records say nothing about live Firebase state. Inspection may find mismatch; only then classify a concrete configuration defect and request separately scoped correction.

## 4. Device and staging verification checklist

**Access/owner:** Coach Drew supplies named synthetic accounts/devices and approved restricted staging URL; Claude/test owner runs scenarios; independent reviewer signs evidence. Physical devices are not available in this session. Existing emulator proof stands and is not repeated. Before any staging writes, email, account creation, beta-claim change, cache experiment or traffic, obtain authorization scoped to synthetic staging resources. `beta-access.js` grants/revokes are explicitly founder-run, not agent actions.

| ID | Steps / expected outcome | Required evidence / stop rule |
|---|---|---|
| D-01 device inventory | At least one physical iPhone/Safari, iPad/Safari, Android/Chrome and intended desktop browser; Windows touch if included. Record hardware,OS,browser,input,zoom/orientation,URL/artifact. If unavailable mark BLOCKED, never substitute desktopviewport PASS | Versioned device/scenario matrix and screen recordings with no tokens/personal data |
| D-02 auth/access | RA-01 emaildelivery/same-device;RA-02reuse rejected;RA-03crossdevice emailconfirmation;RA-04realGoogle;RA-07Anonymous rejected;RA-08unauthorizeddomain rejected. Drew alone performs authorized synthetic RA-05grant/RA-06revoke; measure actual token/session behavior | Per-ID PASS/FAIL, timed revocation observations, sanitized expected errors. Stop on unexpected access; do not change providers/domains |
| D-03 core touch/UI | Approved identity screen; create/select team; draw/drag/undo/redo/save/reopen play; edit/manual-save/reopen plan; all buttons reachable with keyboard/touch/orientation, dialogs scroll and focus correctly; **exit/back via touch** works if offered | Same owned data after reload; no falseSaved; recordings incl.exit and exact test IDs. Windows standalone issue not assumed fixed by phoneemulation |
| D-04 persistence/isolation | Owned play/plan readback; conflict UI instead of overwrite; signed-out/other-account UI isolation; background then return/reload, connectionloss then manualre-save under approved limitation | Synthetic A/B scenarios, no A UI/data access byB; A recovery bytes preserved; no deletion or broad draft-durability inference. No live production writes |
| D-05 OFF/recovery boundary | On release-shaped OFF build, disablednotice/no import buttons/no newcopy or claim/decision changes; originals preserved. Do not enable import for staging simply to repeat accepted emulator D10tests; any opt-in needs separate approvedtestbuild | Device behavior/config/artifact binding; missing-team case remains blocked, no clearing/transfer/recovery |
| D-06 SW/update/cache | After separate cache/rollout test authorization: load old approved staging artifact, then exact new artifact; confirm HTML/entryJS/cache/SWversion match and no mixed bundle; offline UI honest; sameaccount data remains. No browserstorageclear as rollback workaround | Before/after asset hashes, SW/cache metadata and behavior. ExistingbrowsertestsblockSW, so this is untested, not inherited PASS |
| D-07 accessibility | Physical touch targets, readable content, contrast/zoom, keyboard/focus/labels/reducedmotion on actual shippedUI | Record failures and severity; escalate actionable defects rather than lower criteria |

### Staging security commands — future, not run now

Only after approved deployment, confirmed AI OFF and synthetic/no-production traffic authorization:

```bash
PROBE_PROJECT=coach-core-mvp-staging-239 \
PROBE_CONFIRM=coach-core-mvp-staging-239 \
PROBE_ALLOWED_ORIGIN=https://coach-core-mvp-staging-239.web.app \
node e2e/staging/gateway-probe.mjs
```

Replace origin only with the separately approved exact staging origin. Supply `PROBE_API_KEY` through approved non-logged configuration if testing Firestore forged-token rejection; it is the public web key, not an ID token. The probe **skips SEC-08d without it**, so an exit0 with fewer checks is not full security PASS. Require observed SEC-09allowed CORS,SEC-07unlisted rejected,SEC-08forged,08bmalformed,08cno-token refusal,**08dFirestore forgedtoken401**, plus separately approved synthetic authenticated cross-team deny checks. Probe is real traffic even with invalid tokens and may incur platform cost; its historical “no spend” comment is not a guarantee. Do not test AI generation or real youth data. Capture only statuses/reasons, never tokens/OOB links; verify unauthorized requests do not reach backend operations. Provider reachability, real token verification and access revocation are not established by emulator results.

## 5. Deployment/rollback checklist — no deployment authority granted

| ID / owner | Access required | Steps / completion criterion |
|---|---|---|
| R-01 Drew + independent reviewer | Source/evidence read | Approve exact candidate/reduced-scope or full-MVP scope and operator/target/change window; all predeploy gates accepted.515dc1d PASS alone is not deployment authorization |
| R-02 build owner | Approved build inputs/toolchain, public registered staging web config; no server secrets | Freeze artifact with actual approved publicwebconfig, freshbuild provenance/hashes, OFF resolution/inlining, credential/hook/emulator checks; preserve ON negative-control evidence. Changed publicwebconfig produces newbytes: version and independently inspect only affected release proof, not pretend oldCIhash equals deployartifact. No rebuild after freeze |
| R-03 deploy owner + Claude | Staging rollout access, only after separate explicit approval | Prepare reviewed exact Hosting/rules/function allowlist and priorrelease inventory; explicitly exclude unreviewed functions/schedules/deletion. Identify deployment command/target/resources for final approval outside this package; no broad `firebase deploy` or cleanup-by-deletion. Record previous Hosting release/artifact/config/rules/functions and owners |
| R-04 reviewer | Approved restricted staging URL/HTTP access | Download servedindex/entryJS/assets, compare decompressed bytes to frozen manifest; record Hostingsite/releaseID,SHA,headers/cache/SWversions and registeredconfig. Check authenticated/unauthorized access boundary. Exact release-executable behavior is still unverified until actual non-emulator shippedbuild is exercised under approved synthetic staging tests; samecommitOFFemulator is not that proof |
| R-05 Claude + Drew | Device/auth/test access as section4 | Complete D-series/RA/SEC and applicable workflow/security smoke with realprovider; preserveAIoff. Stop and file source-pinned defect on failure, no automatic remediation |
| R-06 deploy owner + reviewer | Separately authorized non-destructive staging rollback/rehearsal | Approve previousknownsafe release and compatibility; restore only explicitly allowed previous code/config under separate approval, verify servedhashes/access/datareadback and no mixedcache. Never clear deviceclaims/drafts, delete originals/teams, roll backliveData or broadly redeploy rules/functions blindly. If no knownsafeversion/rehearsal exists, rollback gate BLOCKED |
| R-07 Drew | Signed release evidence/decisions | Founder recordsgo/no-go,scope,remainingacceptedlimitations,invite list/operatorcontact and supporttruthfulness. AI remainsOFF; film/full-MVP cannot be called complete without its own accepted implementation. No automaticrelease on greenaggregate |

This package supersedes **as instructions for this task** unsafe/stale parts of older smoke docs that call for AI activation, deletion of old functions/film/data, broad redeploy or clearing caches/storage as recovery. Historical docs/evidence remain untouched; future operator must use an independently reviewed, explicitly authorized resource-specific plan.

## 6. Kev audit: known assignment versus proposed replacement

Only located sharedrecord: [issue39comment6221265245](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6221265245): Coach Kev must preserve/share the audit outside the damaged Windows checkout; do not commit apparent deletions; auditaccess/physical-device/founderchecks remain incomplete. GitHub issue search and current inspected docs provide no audit file, detailed commission, finding list, method, sourceSHA or coverage matrix. **I cannot verify which exact checks Kev was commissioned to perform.** The damaged checkout is an evidence-access issue, not proof of a product failure. Nor can his unavailable audit be credited as completed verification.

The following **replacement coverage proposal** addresses the open release surfaces; it is not attributed as Kev's actual completed scope:

| Replacement | Owner / access | Deliverable / no-repeat boundary |
|---|---|---|
| K-01 recover audit provenance | Kev + Drew; preservedexternalcopy/read access | Provide originalaudit/brief,date,sourceSHA,findings/evidencehashes. Do not work in damagedcheckout or commit deletions. If unavailable record unavailable, no invented findings |
| K-02 desktop/Windows-touch exit | Kev/test owner with physicalWindows-touch; Codex if actualapprepair | D-01/D-03 physicalrecord for exact offeredapp; establish standalone/main scope and exit behavior. No unchanged emulator rerun as substitute |
| K-03 Firebase/access/security configuration | Drew authorizedread operator + Claude | F-01..F-07 evidence and RA/SEC after deploymentauthorization; no admin powers granted toKev by this plan |
| K-04 source/security/dependency review | Separate securityreviewer + Codex; repo/audit-report read | Map accepted515dc1d boundary/auth/rules/clientsecret evidence to current advisories/threatmodel; existing acceptedtests reused. Fresh advisorydatabase disposition only if due/requested, no automaticdependencyupdate/fullregression |
| K-05 recovery/privacy/support | Claude/security + Drew | Review preservation/ownershipblockedboundary/shared-deviceplaintext/supportproposals and disclosure; no recovery/write experiments |
| K-06 deployment/device proof | Deployment owner + independent reviewer | R-series and D-series exactartifact/access/realprovider/rollback records under laterapproval |

When originalaudit arrives, reconcile each finding to the replacementmatrix and currentSHA. Reuse matching valid evidence; test only uncovered/changed surfaces. Availability of a report alone does not close its findings.

## 7. Actual unresolved support/disclosure decisions and recommendations

**Already approved, not reopened:** R3ask-once freshNotnow; R4defaultOFF with explicit approvedtestingopt-in; ownership-verified supportboundary/no automaticmissingteamrecovery ([6224877757](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6224877757)). Manualre-save limitation approved in6221265245. No productionimportON or supportpowers were authorized.

| Decision / authority | Recommended choice | Consequence / alternative |
|---|---|---|
| SupportD1 channel/staff/hours/response | Drew names an actually monitored beta contact and responsible person **before any contact promise**; until then say missingteamrecovery unavailable, not “open a ticket” | No inventedmailbox/SLA. If no channel is assigned, disclosure must state that no recovery service is available; invitations cannot imply otherwise |
| D2 operatoraccess; D3 audit/retention | No new supportconsole access for this beta by default. Drew-only escalation via an approved contact does not confer backend authority. If lookup is later needed:individualMFA,leastprivilegedread-onlyrole,auditedaccess,recordretention/privacy approval | Less capability/cost now; genuine ownershipverification remains unavailable. Sharedadmincredentials are not an acceptable alternative |
| D4 accountverification; D5 originalteamID | Keep missingteamrecovery blocked; separately design credible provider-authenticated accountproof and trustedbackendteamidentity only if required | DeviceJSON/screenshot/teamname/challengeword is not proof. Newin-appcode/lookupflow would be new reviewed work, not a choice that makes current tooling exist |
| D6 discard unfinished import; D7 restorationwrites | Defer both; preserve originals/claims/pending/decision; no supportwrite/transfer/releaseclaim | Less recovery capability, honest limitation; enabling either needs separate product/security/data-preservation review and authorization |
| DisclosureP1 placement | Versioned private-beta onboarding brief/agreement delivered **before invitation/consent**, with explicit acknowledgement; optional inappcopy only via separately reviewed change | Approving a draft is not publishing it. Drew approves finaltext/location; operator retains version/date/ackrecord without privatecontent |
| P2 OFF versus ON | **OFF remains settled approved default**, not an unresolved poll. Only approved emulator/testing opt-in continues | ProductionON would require a new explicit ownerdecision/releaseproof review, not silently enabled for beta |
| P3 contactwording | Name contact only afterD1 is verified; never imply restoration/claimreset service | “Import is off. Missing-team recovery is not available in this beta. Do not clear device data.” Supplement acceptedcopy in owner-approved onboarding; do not activate recovery |
| Shareddeviceprivacy and beta scope | Recommend personal-device-only trial until plaintext/localrecovery risk and Windows-touch/standalone exposure are explicitly accepted/scoped | UI/account isolation remains accepted, storage is not encrypted; this is a separate risk/scope decision, not permission to delete preserveddata |

Proposed wording for approval (not published): “This beta keeps device-play import off. If an approved testing build offers import, choosing Not now on a fresh offer means it will not ask again for that account on that device; originals remain untouched. An interrupted import can resume only with the original account and team. Missing-team recovery is not available in this beta. Do not clear or edit device data to bypass the block. If saving fails, keep the editor open and use the existing save action again; automatic retry is not promised.” Named contact/response promise must awaitD1. This does not alter the accepted identity UI or application code.

## 8. One consolidated closure table

**Categories:** accepted evidence; confirmed failure/defect; reliability observation; untested releasegate; ownerdecision/evidenceaccess. An unavailable gate is not an appdefect. No readiness percentage is claimed.

| Item | Category / current status | Owner | Required evidence and next action |
|---|---|---|---|
| PR79core implementation/requiredacceptance | **Accepted PASS**,515dc1d/950addf | Codex + independent reviewer | Preserve9984b7c evidence; no unchanged rerun |
| L1/L2/L3/aggregatepositive | **Accepted PASS**, isolated realPR | CI/build owner + reviewer | Preserve limitedclaim/artifacts/provenance; not enforcement/deploymentproof |
| N2-D2 | **Confirmed diagnostic test failure**,2timeouts, not newly attributed appdefect | Claude diagnostics; Codex if app mechanism | Keep exits/last-run/causehistory; discriminating investigation if authorized; no reclassification/retries |
| StandaloneWindowstouch exit | **Confirmed historical productdefect**, relevance to intendedbeta unresolved | Codex/Kev + Drew scope | Establish offeredapp/SHA; repair+physicalproof if included, or written exclusion. Do not claimPR79fixedit |
| FilmAnalyzer/fullMVP | **Required capability/acceptance gap**, not includedin515 | Film owners + Drew | No fullMVPapproval without acceptedimplementation; explicit reducedscopeauthorization if coretrial intended |
| H2/FX-02/N3/N2-A2 | **Reliability observations/risks**, unresolvedcauses | Claude/Codex; Drewdisposition | Preservehistory, attribute/appfix if demonstrated or scopedwrittenrisk; passingbatch doesnotclose |
| Manualre-save /Notnow /defaultOFF | **Approved limitations/policy**, implementationpreserved | Drew disclosure; Codex/Claude | Publish only approved honestdisclosure; no reopenedchoices or broaderdurabilityclaim |
| Missingcheck/timeouts/latecancel/reruns/Appbinding/protectedblocking | **Untested enforcementgates; NOT READY** | Admin/Drew + CIowner/reviewer | E0–E3 on separately authorized disposabletarget, exactpayload/readback/blockedmergeevidence/restoration; sourcechanges ifprobeexposesbypass |
| Mergequeue | **Conditional ownerchoice**, noqueueassumed | Drew/admin | Strictuptodate recommended initially; E-QUEUE onlyifintended |
| Firebase/IAM/Auth/keys/rules/origins/billing/siteaccess | **Untested live/configurationgates** | Drew authorizedoperator + Claude | F-01..07; no access/configstate inferred fromsource orGitHubmetadata |
| Kev audit | **Missing evidenceaccess**, neither defectnorPASS | Kev/Drew | K-01originalbrief/report or honestunavailable;K-02..06 replacementcoverage independentlyreviewed |
| SupportD1–D5 | **Ownerchoices + unavailable capability** | Drew/operatorTBD | Choose realchannel/owners or discloseunavailable; no powers/verifierinvented; maintainblockedrecovery |
| D6/D7futurefeatures | **Not approved/included**, recommenddefer | Drew/security | Separate reviewedrequest onlyifneeded; no clearing/transfer/writes |
| DisclosureP1/P3/shareddevicepolicy | **Unresolved ownerdecisions** | Drew | Approve version/placement/contacttruthfulness/risk/scope; verifybeforeinvites |
| PhysicaliOS/Android/tablet/Windows/accessibility/background/SW | **Untested releasegates** | Drew deviceowner + reviewer | D-01..07,actualhardware/exactartifact,no viewportsubstitution |
| RealAuth/token/origin/teamisolation | **Untested staginggates** | Drew founderactions + Claude | Approvedsyntheticaccounts/traffic;RA/SECcomplete incl08d,allIDrecords;no AI |
| Actualreleasebytes/hostedconfig/cache/rollback | **Untested releasegates**, deploymentnotauthorized | Deployowner + independentreviewer | R-01..06 after separateapproval; samecommitOFFemulator doesnotexecute releaseartifact |
| Security/dependency/advisory/privacyscope | **Open disposition/provenance**, no newdefectclaim | Claude/Codex/Drew | Use exactcandidateexistingreports; map currentreachable findings/risk; missingdetailedsettledD1–D9recordrequested,notreopendecisions |
| Recoverytargetintegration/finalrelease | **Not performed; MVP NO-GO** | Drew + integrator/reviewer | Separate authorized exactcandidate ifneeded,closegates,foundersignedscope/go-no-go. No automaticrelease fromgreencheck |

**Execution order:** preserve PASS → founder approves scope/access/temporaryenforcement experiment → read-onlyF/K prerequisites and supportdecisions → separately authorized E0–E3 → independently reviewed releaseartifact/deployment/rollback plan → separately authorized restrictedstaging/device/realproviderchecks → reconcile failures/decisions → founderreleasego/no-go. No authorization for those later operations is inferred from this preparation request.

## Source ledger and package verification

- Acceptance/closure: [issue39comment6269823320](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6269823320) and [9984b7c independent review](https://github.com/DigitalBlueprint239/coach-core-ai/blob/9984b7cf7a7301b4423595eaa516d59d1f17ac1a/docs/evidence/combined-closure-515dc1d/independent-review/independent-review.md).
- Current inspected release queue: [8953a38a52f9dfc913461196e4cd8fe3c34e849f](https://github.com/DigitalBlueprint239/coach-core-ai/blob/8953a38a52f9dfc913461196e4cd8fe3c34e849f/docs/security/MVP_RELEASE_GATE_QUEUE_2026-10-15.md): B4 standalone Windows-touch defect, C2/C3 device/real-auth gaps, A-series reliability history. Its older pending/accepted statuses are superseded by exact PR79 evidence and founder approvals cited here.
- Authoritative support/recovery drafts at [accepted source515dc1d](https://github.com/DigitalBlueprint239/coach-core-ai/tree/515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1/docs/support); approved policy6224877757 and limitation/audit record6221265245.
- [CC-007 decision reconciliation at515dc1d](https://github.com/DigitalBlueprint239/coach-core-ai/blob/515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1/docs/CC_007_DECISION_RECONCILIATION.md) distinguishes settled directions from missing detailed terms and film/full-MVP acceptance. [CC-007 readiness](https://github.com/DigitalBlueprint239/coach-core-ai/blob/515dc1d92bf237dae4d70ff2cc38c2aee07d5ae1/docs/CC_007_STAGING_READINESS.md) supplies access/rollback/plaintext/film boundaries, not current acceptance counts.
- RA/SEC scripts and old smoke sources are inspected, not executed: `e2e/staging/REAL_AUTH_CHECKS.md`, `e2e/staging/gateway-probe.mjs`, `functions/scripts/beta-access.js`, `docs/security/STAGING_READINESS_CHECKLIST.md`, `STAGING_SMOKE_TEST_PLAN.md`. This package explicitly corrects unsafe/stale instructions for future scoped planning; historical files remain unchanged.

Package validation: JSON syntax/required policy fields, CSV header, documentation diff/scope and source references checked. No application/focused/browser tests, platform fixtures, Firebase checks or deployment ran. `result-template.csv` is an empty evidence form, not a test result. The proposed JSON is a concrete reviewable settings proposal, not an applied rule or restoration snapshot.

## Coach Core merge eligibility: INELIGIBLE

candidate b139d18d5ea617fd4d505dbdd19ef1e0403662a9 (head b139d18d5ea617fd4d505dbdd19ef1e0403662a9), event workflow_dispatch, run 39186218570 attempt 2, expected repeat 1

| job | conclusion | artifact | selected | executed | passed | failed | verdict |
|---|---|---|---:|---:|---:|---:|---|
| E2E acceptance (chromium) | success | present | 65 | 1 | 1 | 0 | FAIL |
| E2E diagnostic (chromium) | success | present | 10 | 1 | 1 | 0 | FAIL |
| E2E obsolete-fault-model (chromium) | failure | present | 1 | 1 | 0 | 1 | FAIL |
| E2E acceptance (firefox) | success | present | 65 | 1 | 1 | 0 | FAIL |
| E2E diagnostic (firefox) | success | present | 10 | 1 | 1 | 0 | FAIL |
| E2E obsolete-fault-model (firefox) | success | present | 1 | 1 | 1 | 0 | FAIL |
| E2E acceptance (phone-chromium) | success | present | 15 | 1 | 1 | 0 | FAIL |
| E2E diagnostic (phone-chromium) | success | present | 0 | 0 | 0 | 0 | FAIL |
| E2E obsolete-fault-model (phone-chromium) | success | present | 0 | 0 | 0 | 0 | FAIL |
| E2E acceptance (phone-firefox) | success | present | 15 | 1 | 1 | 0 | FAIL |
| E2E diagnostic (phone-firefox) | success | present | 0 | 0 | 0 | 0 | FAIL |
| E2E obsolete-fault-model (phone-firefox) | success | present | 0 | 0 | 0 | 0 | FAIL |

### Reasons
- R1 event "workflow_dispatch" is not a trusted merge event (pull_request/merge_group); bounded or manual runs cannot satisfy the release gate
- R4 E2E acceptance (chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E acceptance (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (chromium): executed identities != membership (missing 64, extra 0); selection was narrowed or membership drifted — first missing: ai-gateway.spec.ts:14:1 E2E-AI01 practice planner offers no AI generation and makes no AI request while a plan is created and saved
- R4 E2E diagnostic (chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E diagnostic (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E diagnostic (chromium): executed identities != membership (missing 9, extra 0); selection was narrowed or membership drifted — first missing: n2.spec.ts:51:1 N2-D1 [diagnostic] write reaches the server but its acknowledgement channel is cut for 8 s: does the dialog stick, recover, or duplicate?
- R4 E2E obsolete-fault-model (chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E obsolete-fault-model (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R4 E2E acceptance (firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E acceptance (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (firefox): executed identities != membership (missing 64, extra 0); selection was narrowed or membership drifted — first missing: ai-gateway.spec.ts:14:1 E2E-AI01 practice planner offers no AI generation and makes no AI request while a plan is created and saved
- R4 E2E diagnostic (firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E diagnostic (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E diagnostic (firefox): executed identities != membership (missing 9, extra 0); selection was narrowed or membership drifted — first missing: n2.spec.ts:51:1 N2-D1 [diagnostic] write reaches the server but its acknowledgement channel is cut for 8 s: does the dialog stick, recover, or duplicate?
- R4 E2E obsolete-fault-model (firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E obsolete-fault-model (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R4 E2E acceptance (phone-chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E acceptance (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-chromium): executed identities != membership (missing 14, extra 0); selection was narrowed or membership drifted — first missing: auth.spec.ts:100:1 E2E-A07 [emulator email link] sign-out returns to sign-in, survives reload, clears the session team key, keeps legacy plays and the quarantined legacy queue byte-identical
- R4 E2E diagnostic (phone-chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E diagnostic (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R4 E2E obsolete-fault-model (phone-chromium): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E obsolete-fault-model (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R4 E2E acceptance (phone-firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E acceptance (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-firefox): executed identities != membership (missing 14, extra 0); selection was narrowed or membership drifted — first missing: auth.spec.ts:100:1 E2E-A07 [emulator email link] sign-out returns to sign-in, survives reload, clears the session team key, keeps legacy plays and the quarantined legacy queue byte-identical
- R4 E2E diagnostic (phone-firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E diagnostic (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R4 E2E obsolete-fault-model (phone-firefox): artifact run_attempt 1 != 2 (stale artifact from another attempt)
- R5 E2E obsolete-fault-model (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection

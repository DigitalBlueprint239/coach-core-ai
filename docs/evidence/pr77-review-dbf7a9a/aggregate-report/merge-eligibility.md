## Coach Core merge eligibility: INELIGIBLE

candidate dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4 (head dbf7a9ae7dd51092f9ec2ac86f3c19a0d67b23f4), event workflow_dispatch, run 39079754536 attempt 1, expected repeat 1

| job | conclusion | artifact | selected | executed | passed | failed | verdict |
|---|---|---|---:|---:|---:|---:|---|
| E2E acceptance (chromium) | success | present | 65 | 1 | 1 | 0 | FAIL |
| E2E diagnostic (chromium) | success | present | 10 | 1 | 1 | 0 | FAIL |
| E2E obsolete-fault-model (chromium) | success | present | 1 | 1 | 1 | 0 | FAIL |
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
- R5 E2E acceptance (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (chromium): executed identities != membership (missing 64, extra 0); selection was narrowed or membership drifted
- R5 E2E diagnostic (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E diagnostic (chromium): executed identities != membership (missing 9, extra 0); selection was narrowed or membership drifted
- R5 E2E obsolete-fault-model (chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (firefox): executed identities != membership (missing 64, extra 0); selection was narrowed or membership drifted
- R5 E2E diagnostic (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E diagnostic (firefox): executed identities != membership (missing 9, extra 0); selection was narrowed or membership drifted
- R5 E2E obsolete-fault-model (firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-chromium): executed identities != membership (missing 14, extra 0); selection was narrowed or membership drifted
- R5 E2E diagnostic (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E obsolete-fault-model (phone-chromium): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E acceptance (phone-firefox): executed identities != membership (missing 14, extra 0); selection was narrowed or membership drifted
- R5 E2E diagnostic (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection
- R5 E2E obsolete-fault-model (phone-firefox): a dispatch grep "D10-01|N2-D0|N2-A2" narrowed the selection

## Coach Core merge eligibility: INELIGIBLE

candidate bb157ba057913bd0835db8df9ca5eb569df0011f (head bb157ba057913bd0835db8df9ca5eb569df0011f), event push, run 39192236704 attempt 1, expected repeat 1

| job | conclusion | artifact | selected | executed | passed | failed | verdict |
|---|---|---|---:|---:|---:|---:|---|
| E2E acceptance (chromium) | cancelled | missing | 65 | - | - | - | FAIL |
| E2E diagnostic (chromium) | cancelled | missing | 10 | - | - | - | FAIL |
| E2E obsolete-fault-model (chromium) | cancelled | missing | 1 | - | - | - | FAIL |
| E2E acceptance (firefox) | cancelled | missing | 65 | - | - | - | FAIL |
| E2E diagnostic (firefox) | cancelled | missing | 10 | - | - | - | FAIL |
| E2E obsolete-fault-model (firefox) | cancelled | missing | 1 | - | - | - | FAIL |
| E2E acceptance (phone-chromium) | cancelled | missing | 15 | - | - | - | FAIL |
| E2E diagnostic (phone-chromium) | cancelled | missing | 0 | - | - | - | FAIL |
| E2E obsolete-fault-model (phone-chromium) | cancelled | missing | 0 | - | - | - | FAIL |
| E2E acceptance (phone-firefox) | cancelled | missing | 15 | - | - | - | FAIL |
| E2E diagnostic (phone-firefox) | cancelled | missing | 0 | - | - | - | FAIL |
| E2E obsolete-fault-model (phone-firefox) | cancelled | missing | 0 | - | - | - | FAIL |

### Reasons
- R7 could not gather inputs (fail closed): artifacts directory gate/artifacts does not exist
- R1 event "push" is not a trusted merge event (pull_request/merge_group); bounded or manual runs cannot satisfy the release gate
- R2 E2E acceptance (chromium): required acceptance job concluded "cancelled"
- R2 E2E diagnostic (chromium): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E obsolete-fault-model (chromium): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E acceptance (firefox): required acceptance job concluded "cancelled"
- R2 E2E diagnostic (firefox): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E obsolete-fault-model (firefox): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E acceptance (phone-chromium): required acceptance job concluded "cancelled"
- R2 E2E diagnostic (phone-chromium): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E obsolete-fault-model (phone-chromium): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E acceptance (phone-firefox): required acceptance job concluded "cancelled"
- R2 E2E diagnostic (phone-firefox): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)
- R2 E2E obsolete-fault-model (phone-firefox): job concluded "cancelled" (cancelled/skipped/timed out jobs leave coverage unproven)

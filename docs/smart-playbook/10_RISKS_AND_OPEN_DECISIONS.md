# 10 — Risks and Open Decisions

## Open decisions (owner)

| ID | Decision | Options | Recommendation |
|---|---|---|---|
| RD-01 | Verification bar wording: design says ≥2/item, ≥3/matchup; brief says "three-source standard" | (a) ≥3 for every Verified claim (b) keep 2/3 | (a) for new content; re-check existing 6 |
| RD-02 | Approve ADR-001/002 (canonical model v3, yards + profiles) before T-103 | approve / amend | approve |
| RD-03 | Content acquisition spend (books, rule books, advisory panel stipends, licences) | budget | panel + rule books first |
| RD-04 | Beta scope: Smart Playbook-only vs Film required (per #104 Film is MVP scope) | owners decide | — |
| RD-05 | Separate staging Firebase project (staging currently shares prod data) | now / later | before player accounts (Phase 4) |
| RD-06 | Youth privacy: COPPA/parental consent, retention for player accounts under 13 | policy | legal review before Phase 4 |
| RD-07 | 3D stack approval (ADR-006: R3F + three) | approve / prototype Babylon | approve with perf gate |
| RD-08 | Retire v1 Smart Playbook in production after v2 parity | when | after T-111 |
| RD-09 | Who may publish Verified content: owner only / owner + named reviewers | — | owner + named reviewers recorded per item |

## Risks

| ID | Risk | Likelihood/Impact | Mitigation |
|---|---|---|---|
| RK-01 | Verification bar starves the library (open-web sources thin for run game/youth) | High/High | Acquisition plan (07 §3); Expert-reviewed category; panel |
| RK-02 | Parity gaps (exports, player access, quizzes) delay adoption | High/High | Play card in Phase 1; Phase 4 workflow suite |
| RK-03 | Model v3 churn breaks saved plays | Med/High | schemaVersion, pure migrations, fixtures, never rewrite v1 |
| RK-04 | 3D perf on school hardware | Med/Med | budgets + adaptive quality; measured on low-end laptop already |
| RK-05 | 3D seen as parity (GoArmy Edge free) | High/Med | differentiate on football correctness; measure SP-D04 |
| RK-06 | AI accuracy/trust | Med/High | deterministic rules first; structured output; citations; approval |
| RK-07 | Two-lane conflicts on shared files | Med/Med | #104 contract; small shared-file PRs; issue #39 |
| RK-08 | Credential leakage from reference repo patterns | Low/High | never deploy standalone; guard test on trunk |
| RK-09 | Licensing of 3D assets / coaching material | Med/High | licence register; original diagrams; cite-only |
| RK-10 | Staging shares prod data | Med/Med | RD-05 |
| RK-11 | Laptop limits local builds | High/Low | cloud sessions + CI |

## Unverified items carried from earlier inspections

- Standalone repo: depth of quiz-to-player workflow; whether AI recommendations assume tendencies (read pending).
- Football Play Card "auto-aligned defenses" claim (app store only).
- GoArmy Edge: current feature depth and adoption beyond listing/estimates.

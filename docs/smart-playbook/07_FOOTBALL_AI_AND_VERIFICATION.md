# 07 — Football AI and Verification

Status: policy (verification rules are owner-mandated and non-negotiable); AI architecture proposed (ADR-004).

## 1. Knowledge categories (ADR-005)

| Category | Meaning | Label shown | Who can publish |
|---|---|---|---|
| **Verified** | Each claim supported by **≥ 2 independent reliable publishers per item and ≥ 3 per matchup claim** (existing bar, unchanged) **and** applicable expert review | "Verified" | Owner/approved reviewer after evidence check |
| **Expert-reviewed** | A named trusted coach approved the football explanation; source bar not (yet) met | "Coach-reviewed" | Owner-approved reviewer |
| **Coach-authored** | The team's own content | (team name) | The team |
| **Provisional AI** | Model-generated, not verified | "AI draft — not verified" | Never published as verified |
| **Insufficient evidence** | Cannot be established to the bar | hidden from coaches | — |

Coach review adds authority but is **never** counted as independent sources. Coaches' private plays never need
citations. Only Coach Core's *published* claims and teaching content carry the strict bar.

> Note on the bar: the approved design (2026-10-30) set **≥2 publishers per item, ≥3 per matchup**; the master
> brief refers to a "three-source standard". Recorded as an open decision (RD-01) — until resolved, the stricter
> reading (≥3 for any claim labelled Verified) applies to new content; existing 6 items are re-checked.

## 2. Source registry (SP-V20)

Fields per source: id, title, author, publisher/organization, publication date, type (book, clinic, course,
association rule book, licensed library, staff material, web), **rights & usage restrictions** (cite-only /
licensed-to-display / owned), concepts covered, exact supported claims (quoted locator, not reproduced text),
**independence group** (same author/org/publisher = same group), reviewer, verification status, revision history.
Citation ≠ permission to reproduce: diagrams and explanations are **original, rights-cleared expressions**; we
cite sources for the football facts.

## 3. Content acquisition plan (prioritized)

| # | Channel | Value | Cost/constraints | Coverage |
|---|---|---|---|---|
| 1 | Coach advisory panel (Drew + 3–5 youth/HS/college coaches, credited/paid) | Expert-reviewed layer fast; access to their purchased libraries for *citation* | Stipends; agreements on IP | All levels |
| 2 | Legitimately purchased books/clinic manuals (e.g. youth system authors; respected scheme books) | Citable independent sources for run game & youth systems | Purchase cost; cite-only | Youth systems, run game, coverages |
| 3 | Rule books (NFHS, NCAA, NFL FLAG, league rules) | Rule profiles | Purchase/licence; cite | Rules (SP-V12) |
| 4 | Coaching associations/clinics (AFCA, state associations, USA Football) | Independent publishers | Membership | All |
| 5 | Publisher/author licensing partnerships | Permission to adapt diagrams/text | Negotiation | Selected systems |
| 6 | Original staff-authored content (rights-cleared) | Product IP | Staff time | Everything, labelled Coach-reviewed until sourced |

No unauthorized copies; no redistribution without a licence. Purchases/licences are owner decisions (RD-03).

## 4. AI architecture (SP-V08)

- Server-side only (Firebase Functions + Genkit + Anthropic, per approved design); browser holds no keys (guard test
  exists). Auth via Firebase ID token; per-team quotas; request/response schema validation (zod) at the boundary;
  observability (Sentry + structured logs); live AI off at launch (owner decision 2026-10-30).
- **Structured output only**: AI returns a draft canonical play/concept JSON → validated by football-core rules
  (legality, eligibility, conflicts) → shown as "AI draft" → coach edits/approves. Prose-only outputs never alter plays.
- **Explanations** use a fixed contract: observed · rule/principle · why it may help · assumptions · evidence
  (registry ids) · confidence/verification state · trade-offs · possible counters. No unsupported percentages.
- **Grounding**: retrieval only from the source registry + team's own data; citations must resolve to registry ids;
  no invented opponent tendencies — tendencies require coach-entered or film-derived data with provenance.
- **Privacy**: no roster/minor PII to providers without a data policy and team permission; tenant isolation by team id.

## 5. Tests (see 11)

Structured-output schema tests · invalid-play rejection · citation resolution · "no tendency without data" ·
provider-failure fallback · approval gating · cross-team isolation.

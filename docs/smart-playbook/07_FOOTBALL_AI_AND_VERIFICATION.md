# 07 — Football AI and Verification

Status: policy (verification rules are owner-mandated and non-negotiable); AI architecture proposed (ADR-004).

## 1. Knowledge categories (ADR-005)

| Category | Meaning | Label shown | Who can publish |
|---|---|---|---|
| **Verified** | Each claim supported by **three independent, reliable sources** (independent organizations or origins of evidence) **and** qualified expert review (RD-01). Governing rule books are the primary authority for the rules they define. | "Verified" | Owner/approved reviewer after evidence check |
| **Expert-reviewed** | A named trusted coach approved the football explanation; source bar not (yet) met | "Coach-reviewed" | Owner-approved reviewer |
| **Coach-authored** | The team's own content | (team name) | The team |
| **Provisional AI** | Model-generated, not verified | "AI draft — not verified" | Never published as verified |
| **Insufficient evidence** | Cannot be established to the bar | hidden from coaches | — |

Coach review adds authority but is **never** counted as independent sources. Coaches' private plays never need
citations. Only Coach Core's *published* claims and teaching content carry the strict bar.

> **Decided (RD-01, 2026-11-03):** Verified requires **three independent, reliable sources** (independent organizations
> or origins, not copies of one claim) **plus qualified expert review**. Official, versioned governing rule books are
> the primary authority for the rules they define; interpretations and tactics still need support. The 6 items
> verified under the earlier 2/3 bar are re-checked against the new bar (T-112).

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

- Server-side only, behind **one gateway with provider adapters** (owner decision 2026-10-13, recorded in PR #47: new
  OpenAI and Anthropic credentials only, no Gemini, no reuse of old keys). Film's tagging uses the OpenAI adapter
  (issue #50). Which provider serves the Smart Playbook advisor is an **open owner decision (RD-10)**; Genkit is an
  implementation option, not a vendor choice. The browser holds no keys (guard test exists). The coach-action trigger is
  UI intent, **not authorization**: the gateway must verify the Firebase ID token with Admin credentials and check team
  membership (`authorizeAdvisoryAccess`) before any provider call. Auth via Firebase ID token; per-team quotas; request/response schema validation (zod) at the boundary;
  observability (Sentry + structured logs); live AI off at launch (owner decision 2026-10-30).
- **Read-only, on demand (owner decisions 2 and 3):** AI answers only explicit coach requests and never writes plays.
  Contract in `src/football-core/advisory.ts`: coach-action trigger required; deep-frozen context; responses limited to
  status/statements/suggestions (text); provider failure returns "unavailable" with the play unchanged; AI off returns
  deterministic facts. Statements carry a basis: deterministic-fact, verified-knowledge, coach-provided, assumption,
  interpretation, unknown. Any future write capability needs separate approval and a separate interface.
- **Explanations** use a fixed contract: observed · rule/principle · why it may help · assumptions · evidence
  (registry ids) · confidence/verification state · trade-offs · possible counters. No unsupported percentages.
- **Grounding**: retrieval only from the source registry + team's own data; citations must resolve to registry ids;
  no invented opponent tendencies — tendencies require coach-entered or film-derived data with provenance.
- **Privacy**: no roster/minor PII to providers without a data policy and team permission; tenant isolation by team id.

## 5. Tests (see 11)

Structured-output schema tests · invalid-play rejection · citation resolution · "no tendency without data" ·
provider-failure fallback · approval gating · cross-team isolation.

## 6. Qualified football review group: proposal (owner decision 5; nothing committed or paid)

**Composition (5-7):** 2 youth tackle coaches (5+ seasons; at least one run-first system such as Wing-T or Double Wing),
2 high school coaches (5+ varsity seasons; one offensive and one defensive coordinator background), 1 offensive-line
specialist (run blocking), optionally 1-2 advanced specialists (college; coverage and pressure). Drew may serve but
does not alone constitute the group.

**Qualifications:** verifiable coaching history (school or league, years, role); references; willingness to sign
reviewer and IP agreements; conflict disclosure (paid ties to playbook vendors; authored products under review).

**Responsibilities:** review assigned items by family; approve or reject with written rationale; label each claim as
official rule, coaching convention or tactical opinion; never review their own authored content.

**Procedure:** item, then evidence check (registry; 3 independent sources for Verified), then two reviewers (matching
the level where relevant), then the decision is recorded (reviewer id, date, rationale). Disagreement: a third
reviewer decides; persistent disputes are shown as "coaching variation" with both views, never as Verified.

**Rights:** reviewers' written explanations are licensed to Coach Core by agreement; no reviewer-supplied copyrighted
material is reproduced without rights.

**Compensation options (owner chooses):** per-item stipend; monthly retainer; advisor credit or equity; free team
licenses and credit. Budget estimates on request; **no commitment without approval (RD-03b).**

## 7. Costed review and acquisition proposal (estimates for owner approval; nothing committed)

**Expertise needed for the first review gate (Inside Zone, line assignments, 4-3 Over, eligibility, youth/HS rules):**

| Reviewer | Must have | Reviews |
|---|---|---|
| Offensive line coach (HS varsity, 5+ yrs) | Taught inside zone covered/uncovered rules | IZ convention, combos/climbs, unblocked-defender reasons |
| Defensive coordinator (HS varsity) | Coached 4-3 / multiple fronts | 4-3 Over alignment, techniques, box definition |
| Youth tackle head coach (5+ seasons) | Run-first youth system | Youth-coach wording, age-appropriateness |
| Rules specialist (state-certified official or rules interpreter) | NFHS rules knowledge | Eligibility model, formation legality, profile text |

Independence: each item gets two reviewers who did not author it; reviewers disclose vendor ties; rule claims cite
the rule book.

**Evidence recording:** reviewer id, date, item id/version, decision, rationale, sources checked — stored with the
item (registry, T-105).

**IP:** reviewer agreement licensing their written rationale to Coach Core; no third-party copyrighted text supplied.

**Estimated costs (planning ranges, not quotes):**

| Item | Estimate |
|---|---|
| 4 reviewers x first gate (about 3 h each at $50-$100/h) | $600-$1,200 |
| Ongoing review (two reviewers per item, about 20-30 min per item) | $25-$100 per item |
| NFHS football rules book + case book (current edition) | about $10-$30 |
| Two respected scheme books for run game / zone (purchase, cite-only) | about $40-$80 |
| Optional: state association or AFCA membership for clinic material | about $50-$150 per year |

**Initial schedule (after approval):** week 1 recruit and sign; week 2 review the IZ + 4-3 Over + eligibility items;
week 3 changes from review, then items move to Coach-reviewed (Verified only when three independent sources also exist).

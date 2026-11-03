# 11 — Acceptance Test Matrix

Proof types: **U** unit (Vitest) · **R** rules emulator · **B** browser/E2E (Playwright, to be added) · **S** staging
walkthrough with evidence · **C** coach review (named reviewer) · **P** performance capture. Status: ✅ passing
(link) · ☐ not yet written.

| AT | Requirement | Scenario | Proof | Status |
|---|---|---|---|---|
| AT-01 | V01 | Drag player, keyboard nudge, undo/redo | U | ✅ `editorReducer.test.ts`, `FieldSheet.test.tsx` |
| AT-02 | V01 | Draw & edit a route with control points | U+B | ☐ |
| AT-03 | V01 | Multi-select, align, zoom/pan, snap | U+B | ☐ |
| AT-04 | V01 | Touch/stylus editing on tablet | B | ☐ |
| AT-05 | V03 | Model v3 types round-trip serialize | U | ☐ |
| AT-06 | V10 | Install one concept on Doubles/Trips/Bunch/Empty/Tight; conflicts reported, overrides kept | U | ☐ (`applyConcept` partial ✅ `concepts.test.ts`) |
| AT-07 | V03 | v2→v3 migration preserves every field (fixtures) | U | ☐ |
| AT-08 | V03 | v1 plays readable via coordinate profile, never rewritten | U | ☐ (v1/v2 reader filter ✅ `v1ReadFilter.test.ts`) |
| AT-09 | V11 | Inside Zone OL rules vs 4-3 Over resolve every defender in the box | U+C | ☐ |
| AT-10 | V11 | Power: down/kick-out/pull assignments; RB track | U+C | ☐ |
| AT-11 | V04 | Coverage rules per role (Cover 3 sky: flat/curl/hook/deep third) | U+C | ☐ |
| AT-12 | V04 | Run fits: every gap owned vs a given front | U+C | ☐ |
| AT-13 | V12 | Rule profile API: default profile reproduces current legality messages exactly; unknown profile rejected; profile id is versioned | U | ✅ this PR (`rules.test.ts`) — CI |
| AT-14 | V12 | 8-/9-/6-player and 7v7 legality per sourced rules | U+C | ☐ |
| AT-15 | V12 | NFL FLAG 5v5 constraints (rushers, no-run zones, no blocking, QB) | U+C | ☐ |
| AT-20 | V02 | 2D pass concept → coverage → 3D → play → pause at progression → QB eye → change defense → replay | B+P | ☐ |
| AT-21 | V02 | 2D↔3D position error ≤ 0.01 yd at sampled t | B | ☐ (prototype ✅ in #95) |
| AT-22 | V02 | Selected player preserved across views | B | ☐ (prototype ✅ #95) |
| AT-23 | V02 | Frame time p95 within budget on 4 device classes | P | ☐ |
| AT-24 | V21 | Tier A playback: events (snap, handoff, pass) at correct t | U | ☐ |
| AT-25 | V19 | Play card PDF from saved play with team terminology; legible print | U+B | ☐ |
| AT-26..29 | V19 | Wristbands, call sheets, PPT, full playbook PDF | U+B | ☐ |
| AT-30 | V07 | Recommendation from published content only | U | ✅ `assistant.test.ts` |
| AT-31 | V07 | Explanation contract fields present and sourced | U | ☐ |
| AT-32 | V07 | Offense vs front matchups (run game) | U+C | ☐ |
| AT-33..35 | V08 | AI structured draft validated by rules; invalid rejected; approval required | U | ☐ |
| AT-36 | V20 | Registry independence: same publisher counts once | U | ☐ |
| AT-37 | V20 | Category labels shown; Provisional AI never shown as Verified | U | ☐ |
| AT-38 | V20 | Drafts never reach coaches | U | ✅ `library.test.ts`, `decisions.test.ts` |
| AT-39 | V20 | Owner review → decisions.json → publish | U+S | ✅ `ContentReview.test.tsx`; staging 2026-11-02 |
| AT-40 | V05 | Player lens shows own assignment; hides coach-only notes | U | ☐ |
| AT-41 | V06 | Read step-through highlights correct defender/route | U+S | ✅ `ReadSteps.test.tsx`; staging 2026-11-02 |
| AT-42 | V09 | Terminology reaches labels, reads, assistant | U | ✅ `TerminologyPanel.test.tsx`, PlaybookScreen tests |
| AT-43..46 | V14 | Quiz from saved play; coach approval; completion; mastery | U+B | ☐ |
| AT-47..49 | V16 | Roles/permissions; revision concurrency; private by default | R+U | ◐ owner-only ✅ `firestore.rules.test.ts` |
| AT-50..53 | V13/V15 | Practice from installs; film-linked plays; tendencies require data | U+B | ☐ |
| AT-60 | V17 | No horizontal overflow at 390/768/1440; touch targets | B | ◐ screenshots (#102) |
| AT-61 | V18 | Offline view + edit + resync | B | ☐ |
| AT-62 | V22 | Accessibility audit (keyboard, contrast, reduced motion) | B+C | ☐ |
| AT-90 | workflow | Create→save→reload→change formation→keep assignments→defense→2D play→3D→pause/resume→teaching summary→quiz→export→reopen on second device | B | ☐ (end-state E2E) |

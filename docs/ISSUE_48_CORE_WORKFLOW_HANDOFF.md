# Issue #48 — standalone core workflow handoff

Date: 2026-10-13 / Codex. [Tracking issue](https://github.com/DigitalBlueprint239/coach-core-ai/issues/48). [Focused repair PR #2](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/pull/2) is stacked on reviewed PR #1; retarget to `recovery/smart-playbook-mvp-2026` after #1 lands. Main shared-doc changes remain in draft PR #45, held until #40 lands; no code integration or automatic merge.

Evidence at implementation commit `aea4fd952ad579d014964f12f2e2767fe72f2871`:

- [Full report, commands and limits](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/aea4fd952ad579d014964f12f2e2767fe72f2871/docs/CORE_WORKFLOW_RECOVERY_EVIDENCE.md)
- [Machine results](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/aea4fd952ad579d014964f12f2e2767fe72f2871/docs/evidence/core-workflows/results.json)
- [Production browser log](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/aea4fd952ad579d014964f12f2e2767fe72f2871/docs/evidence/core-workflows/browser-final.log)
- [PDF install sample](https://github.com/DigitalBlueprint239/Coach-Core-Smart-Playbook-/blob/aea4fd952ad579d014964f12f2e2767fe72f2871/docs/evidence/core-workflows/tablet-touch-install.pdf)

## Verified gates

| Gate | Result |
| --- | --- |
| TypeScript | 0 → 0 diagnostics; no suppressions/exclusions |
| Transaction baseline replay | 3 focused tests fail against parent code; pass after repairs |
| Full unit suite | 18 pass, 0 skipped |
| Real production browser | 14 pass, 0 failed/skipped/flaky |
| Tablet pan/export repetition | 3 consecutive pass, no retries |
| Clean install / production build | Pass; chunk 1,403.37 kB / gzip 436.44 kB; warning retained |
| npm audit | Existing critical affected jsPDF package → 0 findings |
| Provider canary bundle | 0 fake-key/legacy-provider graph violations |

Node 22.23.1, npm 10.9.8, TypeScript 5.8.3, React 19.3.0, Vite 6.4.4, actual Edge/Chromium 154.0.4258.62. Desktop mouse: 1440×1000. Tablet emulation: 1024×768, DPR 2, native browser touchscreen input. Production preview runs on loopback only; isolated synthetic data, zero uncaught page errors and AI request attempts.

```powershell
npm ci
npm test
npx --no-install tsc --noEmit
npm audit --json
npm run build
npm run test:bundle
npm run test:browser
npm run test:browser -- --grep 'downloaded' --project tablet-touch --repeat-each 3
```

The linked full report includes exact redirections, parent-source replay/restoration, dependency/version commands, intermediate failures and raw artifacts. Final passing counts are verified from raw logs/JSON; earlier failures are retained separately. No tests were weakened or skipped in the final full suites.

## Repairs / affected files

- History/context/UI: immutable pre-interaction snapshots, functional batching, route begin/end, play-switch boundaries, editing-aware autosave, safe force-save failure status, drawing cancellation/replacement.
- Storage: new complete playbook validator; original invalid bytes preserved, referenced IDs/finite geometry checked, save errors propagated, extension JSON retained, collision-resistant new IDs.
- Exports: independent saved-data canvas renderer, typed autoTable, landscape A4 fitting, long-note pagination, error display, no selection/state switch. Parsed downloads verify one-page play / three-page install, 1440×640 images with offense/defense pixels, labels and final coaching note.
- Browser fixes: one panel position, bounded SVG icons, initial field fit, accessible V2 property editor, touch route hit/finish/cancel controls and stationary-touch navigation after pan.
- jsPDF 3.0.4 upgraded to 4.2.1; autoTable pinned at compatible 5.0.8 already in parent lock. Other existing locked versions, including React/Vite, unchanged. Browser/PDF test tools are development dependencies.
- Safety: Vite key substitution disabled, stale CDN import map removed, legacy provider/unimplemented coaching service modules excluded via local disabled aliases, reproducible bundle canary script. Legacy source remains preserved. No main auth/backend/rules implementation edits.

## Limits / next owners

**Physical tablet hardware, Safari/iOS, Android/other engines and multi-touch remain unverified**, not PASS. The verified touch scope uses a real Chromium browser with device/touch emulation. Export tests cover default HS configuration and synthetic English content; other field variants/fonts and wristband/clipboard/PNG paths are not newly verified. Invalid legacy stored data remains preserved but requires manual recovery; no migration/reset.

Latest founder decision is [OpenAI-only MVP](https://github.com/DigitalBlueprint239/coach-core-ai/issues/46#issuecomment-6146120833). Browser AI remains off until a protected OpenAI backend contract is agreed with Claude; no credentials or provider calls were activated. Claude retains auth/functions/rules/security review and gateway ownership. Integration must be explicitly sequenced on #46, with non-overlapping files.

Next: review PR #2; land prerequisite PRs only through reviewed human decisions; perform independent security/gateway and real-device acceptance; verify authenticated full coaching flows. **MVP remains NO-GO. No production merge, Firebase access, public deployment or paid infrastructure changes.**

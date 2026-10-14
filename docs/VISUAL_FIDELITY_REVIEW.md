# PR #67 — visual fidelity revision (approval pending)

Coach Drew requested this revision because the previous implementation was **not visually approved**. The supplied concept board remains the visual-direction reference. This revision is submitted for visual approval, not marked accepted.

## What changed

- Desktop: one full-width calendar beside the sidebar; selected practice detail directly below it. Calendar practice selection updates that detail. `Details` retains the native read-only dialog. Upcoming and assignments remain secondary panels below.
- Mobile: Today and its date lead directly into the next practice, primary action and checklist. The large hero, promotional footer, repeated section headings and explanatory banner are removed. Sample mode has a compact, visible label and an accessible exit control.
- Finish: deeper navy, quieter borders, 6px panel radii, tighter spacing, consistent Lucide icons. Cyan is concentrated on active selection and the primary action.
- Saved-plan display: the existing authorized list response supplies available duration, periods, goals and notes. The read-only projection ignores malformed display values and never mutates records. No new query, write, scheduling time, location, period, goal or activity is invented.

Auth, team context, persistence/recovery/conflicts, imports, rules, Functions, AI, canvas, package/lockfiles and the acceptance e2e suite remain unchanged. No feature rollout, merge or deployment.

## Reference / implementation comparisons

In `evidence/visual-fidelity/`:

- `desktop-reference-vs-implementation.png`: original My Week interface crop beside the 1440×1000 implementation screenshot.
- `tablet-reference-vs-implementation.png`: the same supplied desktop interface beside the 834×1112 responsive adaptation. **No separate tablet reference was supplied.**
- `phone-reference-vs-implementation.png`: original Today interface crop beside the 375×812 implementation screenshot.

Comparisons use exact raster crops from Coach Drew's attachment, resized proportionally for viewing. They exclude decorative hardware frames and do not use generated replacement pixels. The reference mobile crop still contains its original image behind the title; the implementation intentionally uses plain deep navy. Original reference date labels remain visible in the crop; the implementation uses current relative sample dates.

## Intentional differences

1. Only existing destinations remain in navigation. No working Film/Attendance/Reports module or attendance action is implied. Mobile's second action opens the existing Smart Playbook destination.
2. A sample primary action says **View practice preview**, opening read-only details; it does not pretend to open a saved sample plan. A real plan uses **Open practice plans**, the existing library workflow.
3. The desktop practice detail beneath the calendar is the requested addition, rather than a recreation of the concept's three crowded lower cards. Its sample periods, goals and notes are labeled **Sample concept**; real details use saved information only.
4. Real dated plans without a start time are untimed and say **Time not set**. The time-grid events are confined to labeled sample preview; scheduling remains unavailable. Sample tiles have a minimum readable/touch height and should not be read as a duration scale; their text and practice detail state the times/duration.
5. Tablet uses a compact sidebar and wraps practice-period cards. Phone replaces the dense time grid with a day picker lower on the page; Today/next practice and assignments stay first.
6. Notification decoration, stadium imagery, device frames, crowded lettering and incidental text/date errors are omitted. The smaller sample label remains visible without displacing the workflow.

## Verification and boundaries

Baseline: 441/441 Jest, zero TypeScript diagnostics, production build PASS with existing SmartPlaybook warnings. Revision: 443/443 tests; nine targeted tests include selection, missing-data honesty, immutable metadata projection and old-team response exclusion. TypeScript diagnostics remain zero.

The revision production build also passes with the same existing warning files and no new UI warnings. Gzip output is 225.18 kB JS / 4.17 kB CSS. The local shared-component preview starts successfully without cloud/auth imports and has zero browser page errors. Phone primary-action bottom is 361px at each tested 320/375/430px width. These are measured placement checks, not visual approval.

The shared-component localhost preview was checked at 320, 375, 430, 768, 834, 1024, 1280, 1440 and 1920px in Chromium and Firefox. All 18 layouts pass overflow, axe WCAG A/AA and control-height checks. Geometry assertions verify full-width calendar/detail placement on desktop/tablet and next-practice/primary-action placement near the top on phone. Navigation focus, skip link, native dialog/Escape/focus return, reduced motion and sample browser-storage isolation pass. The preview imports no auth/cloud modules and makes no external requests.

An initial draft-copy encoding error corrupted a separator in the sample label, causing one targeted test and the first browser label check to fail. UTF-8 was corrected; the label assertion was updated to the intentionally compact wording; successful reruns are recorded separately. No assertion, timeout or retry in the acceptance harness changed.

These are browser viewport tests, not physical-device testing or authenticated backend workflow acceptance. Existing Firebase configuration is required for the authenticated app; the standalone visual preview remains independent. Prior inherited acceptance issues and Claude's independent workflow review remain separate, higher-priority work. Current visual approval is **PENDING Coach Drew**; MVP readiness is not inferred.

## Reproduce

```powershell
npx tsc --noEmit
$env:CI='true'
npm test -- --watchAll=false --runInBand
$env:CI='false'
npm run build
node scripts/visual-preview.cjs 4317
```

Open `http://127.0.0.1:4317/`. Choose `Exit preview` for truthful empty states. The portable runner `evidence/visual-fidelity/verify-fidelity.cjs` uses the existing e2e Playwright installation, or `COACH_CORE_PLAYWRIGHT_MODULE` pointing at another installed copy. No backend/emulator is accessed by this runner. Comparison construction, dimensions, checksums and machine-readable results accompany the images.

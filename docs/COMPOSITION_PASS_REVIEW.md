# Coach Core — implemented composition pass

**Visual approval remains pending.** This is an implementation in draft PR #67, not another proposal-only comparison.

- [Updated desktop, 1440×900](evidence/composition-pass/1440-dashboard.png)
- [Updated phone, 375×812](evidence/composition-pass/375-dashboard.png)
- [Desktop beside approved reference](evidence/composition-pass/desktop-reference-vs-updated.png)
- [Phone beside approved reference](evidence/composition-pass/phone-reference-vs-updated.png)

Reload the [standalone visual preview](http://127.0.0.1:4317/). The separate [empty-state example](http://127.0.0.1:4317/empty.html) contains no invented team, plan or assignment records.

## Implemented

The desktop header/week stack is tighter. Selected practice begins around y532 instead of y649; the calendar is approximately 407px tall instead of 493px. Time, field, duration, all five periods, focus, notes and the practice action fit together in the initial 1440×900 view. The meaningful practice detail also fits at 1280×800. Desktop brand typography is 18px/800; phone brand is 17px/800. Intermediate layouts now retain readable navigation labels rather than icons alone.

Selected practice has a stronger navy surface and restrained cyan edge/highlight. Assignments and upcoming are quieter supporting cards. Phone has a tighter heading, a more prominent practice name, duration and saved/sample focus information in the practice card, one primary action and legible four-item bottom labels. Narrow calendars retain the content-width day picker and full-width agenda; opaque safe-area navigation and focus clearance are preserved.

**Sample preview only:** the demonstration week is fixed at **October 12–18, 2026**, with **Wednesday, October 14** initially selected and populated. Practice detail is visible immediately, allowing consistent reference comparisons. The label explicitly says “Sample data · preview” and “Demo week”; its reset control says “Demo day,” not the real Today. Sample tasks remain temporary and are never saved.

**Real accounts:** the real date, authorized records, selected week/day and selected saved-plan id are held separately from sample state. Visiting and changing preview cannot move the live calendar selection. No schedules, locations, times, periods, activity or tasks are fabricated. Existing data queries, authentication, saving, recovery, conflicts, rules, AI and acceptance repairs are unchanged.

## Verification and limits

The suite increases from 443 to 445 passing tests, including fixed populated sample initialization regardless of real date and preservation of real calendar/plan selection across a preview visit. TypeScript reports zero diagnostics. Browser evidence covers Chromium/Firefox at 320, 375, 430, 490, 834, 1280 and 1440px. It checks readable event words, no page overflow, 44px-high controls, immediate populated selection, desktop calendar/detail placement, modal/Escape/focus, temporary sample storage, truthful empty example, shell navigation, narrow calendar inside a wide viewport, reduced motion and navigation clearance with a simulated extra 32px inset. See verification.json and checks.txt for final results.

This localhost UI preview has no cloud/auth imports and cannot demonstrate Teams/editors/save/reopen. Claude’s **separate authenticated synthetic-data emulator walkthrough** remains requested through [issue #39](https://github.com/DigitalBlueprint239/coach-core-ai/issues/39#issuecomment-6190881288). Claude’s reported accepted candidate 8 repair evidence is preserved separately; it is not claimed as integration or approval of #67. No authenticated or physical-device testing is claimed here.

No merge, production deployment, new modules, AI generation, paid assets, subscriptions or broader rollout.

Final verification: **445/445 tests in 31 suites, TypeScript 0, production build PASS with inherited Smart Playbook warnings only** (JS 225.64kB / CSS 4.56kB gzip). All 14 Chromium/Firefox viewport cases pass with zero axe violations, page overflow, fragmented event words, browser page errors or external requests. Dialog/focus, navigation, empty example, temporary storage, keyboard, reduced motion, content-width agenda and simulated extra safe-area clearance pass. Minified production CSS passes at all seven widths. These are browser emulation measurements, not physical-device or authenticated acceptance.

# Coach Core — fidelity revision tokens (visual approval pending)

Source: Coach Drew’s supplied concept-board interface. These are exact implementation values derived from its visual direction, not recovered original font/layout metadata. The previous implementation was not visually approved; this revision awaits Coach Drew’s approval.

| Role | Value |
|---|---|
| Canvas / inset / panel / raised | #030D17 / #06121E / #091925 / #0E2333 |
| Primary / secondary / muted text | #F3F7FC / #BAC9D8 / #91A6BA |
| Quiet border | 1px solid #233A4C |
| Cyan / hover / button ink / focus | #00D1EF / #76E9FA / #03121B / #9CEEFF |
| Practice / meeting / game tiles | #12382F / #253041 / #482B2B |
| Selected practice tile | #10333C, cyan leading border |
| Fonts | Segoe UI, locally available Inter, Arial, sans-serif; no remote fonts |
| Hierarchy | Page 26px; mobile practice24px; selected practice22px; panels18px; actions13px; metadata11–13px |
| Radii | Panels6px; actions/navigation4px; event tiles3px |
| Spacing | 4/8/10/12/14/16/20/24px; desktop main24px sides; panel16px; panel gap14px |
| Focus | 3px #9CEEFF outline,3px offset; dark #005D7A on retained light editor surfaces |
| Interactions | 120ms color/border transition; all transitions/animations removed for reduced motion |
| Touch | Primary actions48px high on phone; navigation60px; other buttons at least44px high; day cells60px high on phone |

Desktop>=1100px:184px sidebar, full-width calendar, practice detail below, two support cards. Tablet768–1099px:72px icon sidebar with accessible names/tooltips, full-width calendar and wrapping detail periods. Phone<768px:Today and next practice first, compact sample label, checklist, upcoming, day-picker calendar, fixed four-item bottom navigation with safe-area padding.

Cyan emphasizes active day/selection and primary action; no broad glow or decorative stadium/hardware background. Calendar start-time placement is sample-only. Event tiles retain a minimum readable touch height rather than encoding duration solely by height; textual times and plan duration are authoritative. Live plans stay untimed when no start time exists. Planned destinations remain separate from functional navigation.

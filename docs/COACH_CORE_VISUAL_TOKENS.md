# Coach Core — fidelity revision tokens (visual approval pending)

Current composition revision (approval pending): desktop sidebar208px, intermediate sidebar128px with text labels; brand18px/800 desktop and17px/800 phone; header44px high, main padding12px20px desktop; page heading24px. Week has44px day headers and260px time body; event labels13px/12px with52px minimum timed tile height and natural text height. Calendar padding12px; selected-practice surface gradient135deg #102C3E→#0B1E2D with #2E566B border and restrained inset highlight; supporting cards #071521/#172B39, titles16px secondary. Selected practice title24px, mobile practice22px, bottom labels11px. Stable sample data only:12–18 Oct2026, selected14 Oct; real-account dates untouched. Full current evidence: COMPOSITION_PASS_REVIEW.md. Earlier token notes below are historical where they differ.

Source: Coach Drew’s supplied concept-board interface. These are exact implementation values derived from its visual direction, not recovered original font/layout metadata. The previous implementation was not visually approved; this revision awaits Coach Drew’s approval.

| Role | Value |
|---|---|
| Canvas / inset / panel / raised | #030D17 / #06121E / #091925 / #0E2333 |
| Primary / secondary / muted text | #F3F7FC / #BAC9D8 / #91A6BA |
| Quiet border | 1px solid #1C3041; row dividers #182D3D |
| Raised card surface | linear-gradient(145deg, #0C1E2C 0%, #081722 75%); shadow 0 2px 8px #00000026; inset highlight 0 1px #FFFFFF03 |
| Cyan / hover / button ink / focus | #00D1EF / #76E9FA / #03121B / #9CEEFF |
| Practice / meeting / game tiles | #12382F / #253041 / #482B2B |
| Selected practice tile | #10333C, cyan leading border |
| Fonts | Segoe UI, locally available Inter, Arial, sans-serif; no remote fonts |
| Hierarchy | Page 26px; mobile next time22px / practice18px; selected practice22px; panels18px; actions13px; metadata11–13px |
| Radii | Panels6px; actions/navigation4px; event tiles3px |
| Spacing | 4/8/10/12/14/16/20/24px; desktop main24px sides; panel16px; panel gap14px |
| Focus | 3px #9CEEFF outline,3px offset; dark #005D7A on retained light editor surfaces |
| Interactions | 120ms color/border transition; all transitions/animations removed for reduced motion |
| Touch | Primary action46px high on phone; navigation60px; other buttons at least44px high; compact day cells54px high |

Rejected-preview correction: the calendar switches to a day picker and selected-day agenda below **900px of its own content width** via a container query. This also covers a narrow calendar inside a wide browser. Whole-word wrapping replaces anywhere wrapping. Mobile panels use14px padding and10px gaps; next-practice card has one action. Navigation #06121E is opaque, with68px base height plus safe-area inset; measured border-box height controls content clearance, with16px additional workspace clearance and16px control scroll margin. Keyboard focus reveals controls above the bar.

Desktop>=1100px:184px sidebar, full-width calendar, practice detail below, two support cards. Tablet768–1099px:72px icon sidebar with accessible names/tooltips, full-width calendar and wrapping detail periods. Phone<768px:Today and next practice first, compact sample label, checklist, upcoming, day-picker calendar, fixed four-item bottom navigation with safe-area padding.

Cyan emphasizes active day/selection and primary action; no broad glow or decorative stadium/hardware background. Calendar start-time placement is sample-only. Event tiles retain a minimum readable touch height rather than encoding duration solely by height; textual times and plan duration are authoritative. Live plans stay untimed when no start time exists. Planned destinations remain separate from functional navigation.

# Smart Playbook TypeScript root-cause classification — Issue #38

Source: DigitalBlueprint239/Coach-Core-Smart-Playbook- at commit `6b4c42c0d18a2a0364a3cf72f62bbc4535517e58`. Exact source blob identities are recorded in [source manifest](../outputs/evidence/SMART_SOURCE_MANIFEST.json). This is a materialized source snapshot, not a Git checkout. The independent standalone recovery branch exists; this PR changes no standalone application files.

Verified rerun: `npx --no-install tsc --noEmit` using installed TypeScript 5.8.3 / Node 22.23.1. Exit 2; **810 diagnostics**, matching the original audit: 807 TS2339, 1 TS2741, 2 TS2322. The audit-only TSX harness was temporarily moved outside the source snapshot, then restored, so the compiler examined the original application surface. Blank lines are excluded from diagnostic counts. [Raw output](../outputs/evidence/issue-38/smart-types.log); [machine-readable counts](../outputs/evidence/issue-38/smart-types-classification.json).

| Root cause (source inspection) | Count | Affected files / repair |
| --- | ---: | --- |
| Missing styled-components DefaultTheme augmentation | 807 | Styled interpolations throughout the application see the library's empty DefaultTheme instead of the exported AppTheme in src/styles/theme.ts. Add an included declaration module augmenting DefaultTheme from AppTheme; keep the existing ThemeProvider. Do not use any or suppressions. |
| Global style props incorrectly require explicit theme | 1 | App.tsx:162 renders GlobalStyles beneath ThemeProvider. src/styles/globalStyles.ts explicitly declares createGlobalStyle<{ theme: AppTheme }>, making theme a required call-site prop. After augmentation, use createGlobalStyle without this required custom prop and check inference. |
| SVG component interfaces omit forwarded props | 2 | components/ai/DrillFinder.tsx:231 and components/ai/GameScripter.tsx:338 pass style to zero-argument icons from components/icons.tsx. Accept React.SVGProps<SVGSVGElement> and forward props to the root svg, preserving defaults. |

These are shared declaration/interface defects, not 810 separate logic defects. The proposed repairs have **not** been applied or typechecked in this milestone. Counts do not prove runtime correctness, accessibility, persistence, or safe credential handling.

## Missing theme members

| Property | Diagnostics |
| --- | ---: |
| colors | 393 |
| spacing | 277 |
| fontSizes | 94 |
| borderRadius | 25 |
| shadows | 8 |
| transition | 8 |
| fontFamilies | 2 |

## Files by diagnostic count

| File | Diagnostics |
| --- | ---: |
| `components/ai/DrillFinder.tsx` | 70 |
| `components/ai/GameScripter.tsx` | 70 |
| `components/ai/PracticePlanner.tsx` | 63 |
| `components/FormationSelector.tsx` | 51 |
| `components/DesignPanel.tsx` | 50 |
| `components/RoutesConceptsPanel.tsx` | 44 |
| `components/AssignQuizModal.tsx` | 39 |
| `components/PlayOrganizer.tsx` | 37 |
| `components/SituationalPlayCallerPanel.tsx` | 31 |
| `components/NewPlayModal.tsx` | 28 |
| `components/LearnPanel.tsx` | 27 |
| `components/InstallManager.tsx` | 26 |
| `components/AnalyticsPanel.tsx` | 25 |
| `components/CoverageAnalysisPanel.tsx` | 24 |
| `components/RightSidebar.tsx` | 24 |
| `components/OptimizePanel.tsx` | 23 |
| `components/GamePlanPanel.tsx` | 20 |
| `components/WristbandPanel.tsx` | 19 |
| `components/ExportSuite.tsx` | 18 |
| `src/field/CanvasInspector.tsx` | 18 |
| `components/Modal.tsx` | 17 |
| `components/PracticePlanModal.tsx` | 17 |
| `components/WristbandModal.tsx` | 14 |
| `components/Toolbar.tsx` | 13 |
| `components/AlignmentToolbar.tsx` | 11 |
| `components/ThumbToolbelt.tsx` | 11 |
| `components/FloatingPanel.tsx` | 10 |
| `App.tsx` | 8 |
| `components/FieldCanvas.tsx` | 1 |
| `components/FormationThumbnail.tsx` | 1 |

## Repair order and acceptance

1. In a standalone task branch, add typed theme augmentation and correct GlobalStyles; rerun the same command and retain before/after evidence.
2. Give icons standard SVG prop interfaces; rerun tsc and Vite build. No dependency or framework upgrade is indicated by these diagnostics.
3. Verify field, route editing, drag undo, save/reopen, and exports independently. A clean compiler does not resolve the functional failures already recorded in the original matrix.
4. Coordinate with Claude for Gemini client credential handling and all security gates before integrating any standalone module.

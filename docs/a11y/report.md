# Accessibility (WCAG AA) Report

This report tracks baseline and post‑remediation accessibility status using:
- axe runtime checks (via `@axe-core/react` in development)
- ESLint rules from `eslint-plugin-jsx-a11y` (CI enforced)

## How To Reproduce

- Dev build with axe enabled
  - Install deps: `npm ci`
  - Start dev: `npm run dev`
  - Open the app in the browser and navigate primary flows
  - Check the browser DevTools console for logs prefixed with "[axe]" (violations printed by axe-core/react)

- CI lint enforcement (a11y rules)
  - Locally: `npx eslint src --max-warnings=0`
  - In CI: GitHub Actions runs the same command and fails the job on violations

## Baseline (Before)

- axe runtime violations: Run the dev server and capture console output. Copy summary here.
  - Example format:
    - Violations found on route "/": N
    - Violations found on route "/dashboard": N
    - …

- ESLint (jsx-a11y) summary: `npx eslint src --format stylish`
  - Total a11y rule errors: <fill-in-after-run>
  - Most frequent rules: <fill-in-after-run>

## Remediation Summary

- Implemented `@axe-core/react` in development to log violations.
- Strengthened focus visibility using theme-wide `:focus-visible` outlines.
- Increased button contrast (brand.600/700/800) to ensure AA for white text.
- Improved Input focus ring and ensured accessible labeling in shared input.
- Enabled stricter `jsx-a11y` rules and added CI lint step.

## After Fixes

- axe runtime violations: Re-run the dev app and retest primary flows. Capture results below.
  - Violations found on route "/": <fill-in-after-run>
  - Violations found on route "/dashboard": <fill-in-after-run>
  - …

- ESLint (jsx-a11y) summary after fixes:
  - Total a11y rule errors: <fill-in-after-run>
  - Notes: <optional>

## Follow-ups / Notes

- If any component is intentionally icon-only, ensure it uses `IconButton` with a descriptive `aria-label`.
- Any input rendered without a visible `<FormLabel>` must provide an `aria-label` (the shared MobileOptimizedInput sets one automatically when `label` is provided or `ariaLabel` is passed).
- Modals use focus trap and `returnFocusOnClose` to maintain logical focus order.


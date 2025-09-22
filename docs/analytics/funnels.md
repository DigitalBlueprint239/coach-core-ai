# Analytics Funnels

This document describes the onboarding funnel instrumentation and how to verify it.

## Core Funnel

landing → login → onboarding_start → starter_created → saved

### Events

- landing
  - Trigger: On landing page mount.
  - Code: `trackLandingView()`
- login
  - Trigger: Successful sign-in or sign-up.
  - Code: `trackFunnel('login')`
- onboarding_start
  - Trigger: When the Onboarding Checklist overlay opens (gated by Remote Config).
  - Code: `trackOnboardingStart(userId)`
- starter_created
  - Trigger: After generating the Starter Session.
  - Code: `trackStarterCreated(planId, duration)`
- saved
  - Trigger: On dismiss after starter session exists (indicates it persisted in store/storage).
  - Code: `trackStarterSaved(planId)`

## Files

- Analytics helpers: `src/services/analytics/analytics-events.ts`
- Onboarding UI: `src/components/onboarding/OnboardingChecklist.tsx`
- Starter session generator: `src/components/onboarding/createStarterSession.ts`
- Landing page hook: `src/components/Landing/OptimizedLandingPage.tsx`
- Login page events: `src/components/auth/LoginPage.tsx`

## Remote Config Flag

- Key: `onboardingChecklist`
- Default: disabled (false)
- Behavior: When enabled and the user has no practice plans, a modal overlay prompts the user to create a Starter Session.

## Validation

- Use browser devtools network/console to confirm analytics events (GA/segment) are emitted when interacting with the overlay and creating the starter session.
- Confirm a new practice appears in local state/storage and in the Practice Planner list.


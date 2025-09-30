# PHASE 4 BETA KICKOFF PLAN

## Executive Summary
Phase 4 expands Coach Core AI from controlled internal validation to a 100+ user external beta over four weeks. The plan prioritizes a safe rollout, actionable insight loops, and rapid iteration. This document captures the final pre-execution decisions, including schema refinements, dashboard priorities, cohort selection, and risk controls.

- **Launch Objective**: Reach full beta capacity (100+ users) with measurable activation and retention signals by the end of Week 4.
- **Success Signals**: >=60% invite-to-activation conversion, <=24 hour mean time-to-resolution for critical bugs, weekly retention >=50%.
- **Cross-Cutting Themes**: Instrument everything, bias toward reversible changes, protect data and user trust.

## Workstream Breakdown

### Task 1 - Route Integration & Beta Gate
- **Scope**: Finalize gated routing, ensure non-beta fallback, and capture analytics around gate encounters.
- **Key Updates**
  - Add loading and error states while verifying beta eligibility.
  - Provide graceful downgrade path for non-beta users (return to default experience + prompt to join waitlist).
  - Emit analytics events (`beta_gate_loading`, `beta_gate_denied`, `beta_gate_access_granted`) for conversion funnel insights.
  - Wire rollback toggle: feature flag + runtime kill-switch that can disable all beta-surfaced routes within minutes.
- **Deliverables**
  - `BetaGate` component extension with suspense-ready loading UI, fallback copy, analytics instrumentation.
  - Feature flag config + documentation for instant rollback.
  - Verification checklist covering beta user journeys, non-beta fallback, and analytics events.

### Task 2 - Firestore Schema & Data Ops
- **Updated Collections**
  ```typescript
  beta_invites: {
    inviteId: string;
    userId: string;
    status: 'pending' | 'accepted' | 'declined';
    sentAt: Timestamp;
    remindersSent: number;
    lastReminderAt?: Timestamp;
    conversionMetadata?: {
      onboardingCompleted: boolean;
      firstFeatureUsed?: string;
      timeToActivation?: number; // minutes
    };
  }

  beta_feedback: {
    feedbackId: string;
    userId: string;
    sessionId?: string;
    submittedAt: Timestamp;
    category: 'bug' | 'feature_request' | 'ux' | 'other';
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
    responseToUser?: string;
    attachments?: string[]; // screenshot URLs
  }
  ```
- **Operational Controls**
  - Composite indexes: `(status, sentAt DESC)` for invite follow-up, `(severity, resolved)` for triage, `(userId, submittedAt DESC)` for user history views.
  - Data retention: 6-month retention for beta-only records with scheduled purge job; align privacy notice with GDPR requirements.
  - Backups: Daily automated exports to secure storage bucket + manual pre/post milestone snapshots (Week 1 start, Week 4 pre-GA).
  - Access model: restrict `beta_feedback` write/read to beta participants + staff; ensure `beta_invites` reminders update via Cloud Functions with minimal scope service account.

### Task 3 - Launch Dashboard & Alerting
- **Priority 1: Conversion Funnel**
  - Track invites -> accepted -> onboarded -> active -> retained, with drop-off annotations.
  - Surface per-cohort activation time (median minutes) and identify stalled invites.
- **Priority 2: Critical Issues**
  - Highlight unresolved `critical` severity feedback, error rate trends, performance regressions.
  - Show live alert thresholds (p95 latency, error rate) with color coding.
- **Priority 3: Feature Validation**
  - Rank most/least used beta features, feature request volume, and "time to first value".
- **Enhancements in Scope**
  - Export CSV/PDF for weekly beta reports.
  - Automated daily summary email summarizing funnel metrics + open critical issues.
  - Configurable alert thresholds with Slack/Email hooks for spikes.
  - Instrumentation alignment with analytics events defined in Task 1 and Firestore schema fields.

### Task 4 - Beta Cohort Execution
- **Selection Criteria**
  ```typescript
  const selectionCriteria = {
    priority1: 'Waitlist members who referred others',
    priority2: 'Early signups (first 50)',
    priority3: 'Completed profile info',
    exclude: 'Competitors or press',
  };
  ```
- **Manual Review Workflow**
  - Apply automated filters via Firestore query, then manual domain review to exclude press/competitors.
  - Maintain "next up" queue for fast replacements when slots open.
- **Invitation Package**
  - Expectations: 20-30 minutes/week testing, weekly feedback form, immediate escalation path for critical issues.
  - Perks: Lifetime discount, founding member badge, early roadmap previews.
  - Direct access: Dedicated beta Slack channel + founders@ alias.
- **Engagement Cadence**
  - Week 0: send invite + onboarding checklist + BetaGate instructions.
  - Week 1+: bi-weekly feedback prompts and targeted reminders (respecting `remindersSent` limits).
  - Track conversions via `conversionMetadata` fields to identify friction.

## Delivery Timeline (4 Weeks)

| Week | Focus | Key Outputs |
|------|-------|-------------|
| Week 0 (Prep) | Finalize schema, indexes, feature flags | Firestore migrations, backup schedule, BetaGate loading/fallback UI, invite copy draft |
| Week 1 | Internal beta hardening | Dashboard funnel baseline, monitoring alerts enabled, cohort shortlist validated |
| Week 2 | First 20 external users | Invitations sent, onboarding analytics live, daily summary email pipeline |
| Week 3 | Scale to 60 users | Export/report automation, alert thresholds tuned, replacement cohort ready |
| Week 4 | Reach 100+ users | Conversion optimization experiments, retention review, pre-GA go/no-go checklist |

## Risk Mitigation & Monitoring
- **Rollback Plan**: Feature flag kills beta routes; document manual steps + Slack alert macro.
- **Monitoring**: Alerts for error rate spikes, latency degradation, and invite drop-off beyond 24 hours.
- **Communication**: Beta-only Slack channel for rapid triage; publish known issues doc with update timestamps.
- **Quality Gates**: Blocker bug triage within 2 hours, automatic escalation for unresolved `critical` feedback.

## Parallel Work During Beta
- Performance profiling driven by beta usage patterns.
- Mobile responsiveness sweeps focused on beta-reported devices.
- Help center articles covering onboarding, top workflows, troubleshooting.
- Staging payment system end-to-end tests ahead of GA.

## Immediate Next Actions
1. Update Firestore schema manager scripts + indexes, validate in staging.
2. Implement `BetaGate` enhancements with analytics and rollback hook.
3. Configure dashboard funnel views and alert thresholds; wire daily summary job.
4. Finalize invite copy, review cohort shortlist against exclusion rules.
5. Schedule backups, retention jobs, and documentation walkthrough for the beta team.

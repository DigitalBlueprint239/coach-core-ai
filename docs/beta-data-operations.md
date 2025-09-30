# Beta Data Operations Playbook

This guide captures the operational guardrails for the beta Firestore collections introduced in Phase 4. Keep it close to the release runbook so the entire team understands how invite, feedback, and analytics data are protected.

## Collections in Scope
- `beta_invites`
- `beta_feedback`
- `beta_users`
- `beta_events`

## Composite Indexes
- `beta_invites`: `(cohortId ASC, status ASC, sentAt DESC)`
- `beta_feedback`: `(cohortId ASC, severity DESC, resolved ASC)`
- `beta_feedback`: `(userId ASC, submittedAt DESC)`

Run `python3 firestore_schema_manager.py` to verify the repo copy of `firestore.indexes.json` before each deployment. The script exits non-zero when a required index is missing.

## Data Retention
- Retain invite and feedback documents for **180 days**.
- Configure a scheduled cleanup job (Cloud Functions or Workflows) that:
  - Targets `beta_invites` and `beta_feedback` collections.
  - Deletes records older than 180 days that are not flagged for escalation.
  - Emits metrics for number of documents purged.
- Update customer-facing privacy copy to reflect the 6-month retention window.

## Backup Strategy
- Daily managed export at **05:00 UTC** to the bucket referenced by the `BETA_BACKUP_BUCKET` environment variable.
- Manual snapshots before the Week 1 kickoff and immediately before the Week 4 go/no-go review.
- Store manifest of exports in `reports/beta-backups/` with timestamped filenames.

## Operational Checks
- Add runtime alert: invite conversion funnels that stall for >24 hours trigger the "Beta Funnel Watch" alert channel.
- Track backup job success/failure in the monitoring dashboard; notify the beta Slack channel on failure.
- Rotate the service account used for backups every 90 days and scope permissions to storage write + datastore export.

## GDPR & Privacy Notes
- Honor user deletion requests within 7 days by purging invite, feedback, and derived analytics events.
- Ensure `beta_feedback` responses are scrubbed of PII prior to exporting outside the production project.
- Document data handling workflow in the security review tracker with links to the latest cleanup job configuration.

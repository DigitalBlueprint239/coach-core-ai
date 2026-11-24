// Smart Playbook v2 feature flags. Read at call time (not module load) so tests can vi.stubEnv them.
// Only the exact string 'true' turns a flag on.

/** The new "Sheet on the desk" playbook screen replaces the old Smart Playbook tab. */
export function isPlaybookV2Enabled(): boolean {
  return import.meta.env.REACT_APP_ENABLE_PLAYBOOK_V2 === 'true';
}

/** The owner's content review screen (dev and preview builds only). */
export function isContentReviewEnabled(): boolean {
  return import.meta.env.REACT_APP_ENABLE_CONTENT_REVIEW === 'true';
}

/**
 * The editor built on the canonical v4 play (stable player ids, stored geometry, revision history). It takes the
 * Smart Playbook tab when on. Needs the v4 Firestore rules to be live in the same project, so it stays off in
 * production until those rules are released.
 */
export function isPlaybookV4Enabled(): boolean {
  return import.meta.env.REACT_APP_ENABLE_PLAYBOOK_V4 === 'true';
}

import type { Verification } from './types';

/** Distinct publishers required before content is shown to coaches (spec §6). */
const REQUIRED_PUBLISHERS = { item: 2, matchup: 3 } as const;

/** True when content may reach coaches: verified by enough distinct publishers, or approved by a named reviewer. */
export function isPublishable(v: Verification, kind: 'item' | 'matchup'): boolean {
  if (v.status === 'approved') return v.reviewer.trim() !== '' && v.date.trim() !== '';
  if (v.status !== 'verified') return false;
  const publishers = new Set(v.sources.map(s => s.publisher.trim().toLowerCase()));
  return publishers.size >= REQUIRED_PUBLISHERS[kind];
}

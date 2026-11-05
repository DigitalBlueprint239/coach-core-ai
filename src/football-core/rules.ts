// Versioned football rule profiles (T-101, requirement SP-V12). A profile states the structural rules a formation
// is checked against, so 11-player, 8/9-player, 7v7 and flag variants can each have their own (added in T-102,
// once each rule is sourced from its rule book). Profiles are versioned (`name@n`): a changed rule is a new version,
// never an edit, so saved plays keep meaning what they meant.
import type { Verification } from './types';

export type RuleProfile = {
  /** Versioned id, e.g. `eleven-player@1`. */
  id: string;
  name: string;
  playersPerSide: number;
  /** Minimum offensive players on the line of scrimmage at the snap. */
  minOnLine: number;
  /** How receiver eligibility is decided (see eligibility.ts). New models get new values, never silent changes. */
  eligibility: 'ends-and-backs';
  verification: Verification;
};

const ELEVEN_PLAYER_V1: RuleProfile = {
  id: 'eleven-player@1',
  name: '11-player',
  playersPerSide: 11,
  minOnLine: 7,
  eligibility: 'ends-and-backs',
  // The engine's long-standing default. Draft until the rules are cited from the NFHS and NCAA rule books (T-102).
  verification: {
    status: 'draft',
    sources: [],
    note: 'Default 11-player structure used since phase 1; rule-book citations pending (T-102).',
  },
};

export const RULE_PROFILES: Readonly<Record<string, RuleProfile>> = Object.freeze({
  [ELEVEN_PLAYER_V1.id]: ELEVEN_PLAYER_V1,
});

/** The profile used when none is given: identical to the engine's behaviour before profiles existed. */
export const DEFAULT_RULE_PROFILE: RuleProfile = ELEVEN_PLAYER_V1;

/** The profile with this versioned id; throws for an unknown id rather than guessing. */
export function ruleProfile(id: string): RuleProfile {
  const profile = RULE_PROFILES[id];
  if (!profile) throw new Error(`Unknown rule profile: ${id}`);
  return profile;
}

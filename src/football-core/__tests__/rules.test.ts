import { validateFormation } from '../formations';
import { DEFAULT_RULE_PROFILE, RULE_PROFILES, ruleProfile, type RuleProfile } from '../rules';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import type { Formation } from '../types';

const doubles = (): Formation => {
  const f = SPREAD_FORMATIONS.find(x => x.id === 'doubles');
  if (!f) throw new Error('missing doubles');
  return structuredClone(f);
};

describe('rule profiles', () => {
  it('every profile id carries a version (name@n)', () => {
    for (const id of Object.keys(RULE_PROFILES)) expect(id).toMatch(/^[a-z0-9-]+@\d+$/);
  });

  it('the default profile is the current 11-player rule: 11 players, at least 7 on the line', () => {
    expect(DEFAULT_RULE_PROFILE.id).toBe('eleven-player@1');
    expect(DEFAULT_RULE_PROFILE.playersPerSide).toBe(11);
    expect(DEFAULT_RULE_PROFILE.minOnLine).toBe(7);
  });

  it('profiles stay drafts until their rules are sourced from rule books', () => {
    expect(DEFAULT_RULE_PROFILE.verification.status).toBe('draft');
  });

  it('looks up a profile by versioned id and rejects unknown ids', () => {
    expect(ruleProfile('eleven-player@1')).toBe(DEFAULT_RULE_PROFILE);
    expect(() => ruleProfile('eleven-player@99')).toThrow('Unknown rule profile: eleven-player@99');
  });
});

describe('validateFormation with a rule profile', () => {
  it('without a profile, results are identical to the default profile (no behaviour change)', () => {
    const legal = doubles();
    const short = doubles();
    short.players = short.players.slice(0, 10);
    const offLine = doubles();
    offLine.players = offLine.players.map(p => ({ ...p, onLine: false }));
    for (const f of [legal, short, offLine]) {
      expect(validateFormation(f)).toEqual(validateFormation(f, DEFAULT_RULE_PROFILE));
    }
    expect(validateFormation(legal)).toEqual([]);
    expect(validateFormation(short)).toContain('Needs 11 players (has 10).');
    expect(validateFormation(offLine)).toContain('Needs at least 7 players on the line (has 0).');
  });

  it("uses the profile's player count and line minimum", () => {
    const small: RuleProfile = { ...DEFAULT_RULE_PROFILE, id: 'test-small@1', playersPerSide: 10, minOnLine: 3 };
    const f = doubles();
    f.players = f.players.slice(0, 10);
    expect(validateFormation(f, small)).toEqual([]);
    expect(validateFormation(doubles(), small)).toContain('Needs 10 players (has 11).');
  });
});

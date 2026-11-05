// Milestone 1 contracts: eligibility, concept installation with structured conflicts, the v3 assignment model.
// All deterministic — no AI involved.
import { receiverEligibility } from '../eligibility';
import { hasErrors } from '../findings';
import { installConcept } from '../install';
import { fromV2Assignment, toV2Assignment } from '../model';
import { DEFAULT_RULE_PROFILE } from '../rules';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { PASS_CONCEPTS } from '../content/concepts.pass';
import type { Concept, Formation } from '../types';

const formation = (id: string): Formation => {
  const f = SPREAD_FORMATIONS.find(x => x.id === id);
  if (!f) throw new Error(`missing formation ${id}`);
  return structuredClone(f);
};
const concept = (id: string): Concept => {
  const c = PASS_CONCEPTS.find(x => x.id === id);
  if (!c) throw new Error(`missing concept ${id}`);
  return structuredClone(c);
};

describe('receiver eligibility (ends-and-backs)', () => {
  it('in Doubles the line ends and the off-line players are eligible; interior linemen are not', () => {
    const e = receiverEligibility(formation('doubles'), DEFAULT_RULE_PROFILE);
    for (const r of ['X', 'Z', 'H', 'Y', 'RB'] as const) expect(e.get(r)).toBe('eligible');
    for (const r of ['LT', 'LG', 'C', 'RG', 'RT'] as const) expect(e.get(r)).toBe('ineligible');
  });

  it('the quarterback is reported as unsupported, not guessed', () => {
    expect(receiverEligibility(formation('doubles'), DEFAULT_RULE_PROFILE).get('QB')).toBe('unsupported');
  });

  it('a receiver moved onto the line inside the end becomes ineligible', () => {
    const f = formation('doubles');
    f.players = f.players.map(p => (p.role === 'Y' ? { ...p, onLine: true } : p));
    expect(receiverEligibility(f, DEFAULT_RULE_PROFILE).get('Y')).toBe('ineligible');
  });
});

describe('installConcept', () => {
  it('installs Smash on Doubles with every assignment mapped and no errors', () => {
    const r = installConcept(concept('smash'), formation('doubles'));
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    expect(hasErrors(r.findings)).toBe(false);
    expect(r.value.profileId).toBe('eleven-player@1');
    expect(r.value.assignments).toHaveLength(concept('smash').assignments.length);
    expect(r.value.assignments.every(a => a.player !== null)).toBe(true);
  });

  it('a covered receiver gets a coded, explained finding with manual options — and the route is kept', () => {
    const f = formation('doubles');
    f.players = f.players.map(p => (p.role === 'Y' ? { ...p, onLine: true } : p));
    const r = installConcept(concept('smash'), f);
    if (r.status !== 'ok') throw new Error('expected ok');
    const finding = r.findings.find(x => x.code === 'eligibility.ineligible-receiver');
    expect(finding).toBeDefined();
    expect(finding?.subject).toEqual({ role: 'Y', slot: 'strong-2' });
    expect(finding?.basis?.profileId).toBe('eleven-player@1');
    expect(finding?.basis?.authority).toBe('draft');
    expect(finding?.options.length).toBeGreaterThan(0);
    const yRoute = r.value.assignments.find(a => a.player === 'Y');
    expect(yRoute?.assignment).toEqual({ kind: 'route', slot: 'strong-2', route: 'corner' });
  });

  it('never silently drops an assignment the formation cannot fill (the protection here)', () => {
    const f = formation('doubles');
    f.players = f.players.filter(p => p.role !== 'RB');
    const r = installConcept(concept('smash'), f);
    if (r.status !== 'ok') throw new Error('expected ok');
    const protect = r.value.assignments.find(a => a.assignment.kind === 'protect');
    expect(protect).toEqual({ assignment: { kind: 'protect', slot: 'back', rule: 'unspecified' }, player: null });
    expect(r.findings.some(x => x.code === 'install.missing-slot' && x.subject?.slot === 'back')).toBe(true);
    expect(r.findings.some(x => x.code === 'formation.illegal')).toBe(true); // 10 players under an 11-player profile
  });

  it('a route given to the quarterback is flagged as not checkable rather than approved', () => {
    const c: Concept = { ...concept('smash'), assignments: [{ slot: 'qb', kind: 'route', route: 'flat' }] };
    const r = installConcept(c, formation('doubles'));
    expect(r.findings.some(x => x.code === 'eligibility.unsupported' && x.subject?.role === 'QB')).toBe(true);
  });
});

describe('v3 assignment model', () => {
  it('every library concept converts to v3 and back without loss', () => {
    for (const c of PASS_CONCEPTS) {
      for (const a of c.assignments) expect(toV2Assignment(fromV2Assignment(a))).toEqual(a);
    }
  });

  it('unknown block and protection schemes stay explicit "unspecified", never invented', () => {
    expect(fromV2Assignment({ slot: 'back', kind: 'protect' })).toEqual({ kind: 'protect', slot: 'back', rule: 'unspecified' });
    expect(fromV2Assignment({ slot: 'back', kind: 'block' })).toEqual({ kind: 'block', slot: 'back', rule: 'unspecified' });
  });

  it('run assignments are expressible in the same structure (no v2 form, so no lossy downgrade)', () => {
    expect(toV2Assignment({ kind: 'run-track', slot: 'back', track: { aimingPoint: 'B-gap', side: 'strong' } })).toBeNull();
    expect(toV2Assignment({ kind: 'block', slot: 'back', rule: 'zone-playside' })).toBeNull();
    expect(toV2Assignment({ kind: 'block', slot: 'RT', rule: 'unspecified' })).toBeNull(); // v2 has no line positions
  });
});

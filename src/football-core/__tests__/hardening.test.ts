// PR #106 hardening: response validation, server-side authorization gate, eligibility and legality edge cases,
// draft-vs-verified wording.
import {
  authorizeAdvisoryAccess, createDisabledAdvisor, requestAdvice, validateAdvisoryResponse, type Advisor, type AdvisoryRequest,
} from '../advisory';
import { receiverEligibility } from '../eligibility';
import { validateFormation } from '../formations';
import { installConcept } from '../install';
import { DEFAULT_RULE_PROFILE, type RuleProfile } from '../rules';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import { PASS_CONCEPTS } from '../content/concepts.pass';
import type { Formation } from '../types';

const doubles = (): Formation => structuredClone(SPREAD_FORMATIONS.find(x => x.id === 'doubles')!);
const smash = () => structuredClone(PASS_CONCEPTS.find(c => c.id === 'smash')!);
const request = (allowedSourceIds: string[] = []): AdvisoryRequest => {
  const f = doubles();
  f.players = f.players.map(p => (p.role === 'Y' ? { ...p, onLine: true } : p));
  const r = installConcept(smash(), f);
  if (r.status !== 'ok') throw new Error('expected ok');
  return {
    capability: 'explain-rule-conflict',
    trigger: { kind: 'coach-action', action: 'asked' },
    teamId: 't1',
    context: { installation: r.value, findings: r.findings, allowedSourceIds },
  };
};
const fixed = (response: unknown): Advisor => ({ advise: async () => response as never });

describe('validateAdvisoryResponse', () => {
  const ok = { status: 'answered', statements: [{ basis: 'interpretation', text: 'Y is covered.' }], suggestions: ['Move Y off the line.'] };

  it('accepts a well-formed response', () => {
    expect(validateAdvisoryResponse(ok)).toEqual([]);
  });

  it.each([
    ['unknown status', { ...ok, status: 'done' }, 'Unknown status'],
    ['unknown basis', { ...ok, statements: [{ basis: 'proof', text: 'x' }] }, 'unknown basis'],
    ['empty text', { ...ok, statements: [{ basis: 'assumption', text: '  ' }] }, 'needs text'],
    ['extra statement field', { ...ok, statements: [{ basis: 'assumption', text: 'x', apply: true }] }, 'may not contain: apply'],
    ['non-text suggestion', { ...ok, suggestions: [{ op: 'replace' }] }, 'Suggestions must be'],
    ['statements not a list', { ...ok, statements: 'x' }, 'Statements must be a list'],
    ['not an object', null, 'not an object'],
  ])('rejects %s', (_label, response, expected) => {
    expect(validateAdvisoryResponse(response).join(' ')).toContain(expected);
  });

  it('verified knowledge must cite sources from the approved registry', () => {
    const noSource = { ...ok, statements: [{ basis: 'verified-knowledge', text: 'Smash beats Cover 2.' }] };
    const invented = { ...ok, statements: [{ basis: 'verified-knowledge', text: 'x', sourceIds: ['made-up'] }] };
    const good = { ...ok, statements: [{ basis: 'verified-knowledge', text: 'x', sourceIds: ['src-1'] }] };
    expect(validateAdvisoryResponse(noSource, ['src-1']).join(' ')).toContain('without a source');
    expect(validateAdvisoryResponse(invented, ['src-1']).join(' ')).toContain('outside the approved registry: made-up');
    expect(validateAdvisoryResponse(good, ['src-1'])).toEqual([]);
  });

  it('requestAdvice rejects a malformed advisor answer instead of showing it', async () => {
    await expect(requestAdvice(fixed({ status: 'answered', statements: [{ basis: 'proof', text: 'x' }], suggestions: [] }), request())).rejects.toThrow('Advisor response rejected');
  });

  it('requestAdvice rejects an unknown capability', async () => {
    const bad = { ...request(), capability: 'rewrite-play' } as unknown as AdvisoryRequest;
    await expect(requestAdvice(createDisabledAdvisor(), bad)).rejects.toThrow('Unknown advice type');
  });
});

describe('authorizeAdvisoryAccess (server-side gate; the coach-action trigger is not authorization)', () => {
  it('requires a server-verified uid', () => {
    expect(() => authorizeAdvisoryAccess({ verifiedUid: null, teamId: 't1', memberUids: ['a'] })).toThrow('signed-in coach');
  });
  it('requires team membership', () => {
    expect(() => authorizeAdvisoryAccess({ verifiedUid: 'b', teamId: 't1', memberUids: ['a'] })).toThrow('Only members');
  });
  it('allows a member', () => {
    expect(() => authorizeAdvisoryAccess({ verifiedUid: 'a', teamId: 't1', memberUids: ['a'] })).not.toThrow();
  });
});

describe('draft rule-engine findings are never presented as verified rules', () => {
  it('the disabled advisor says the profile is not yet verified against the rule book', async () => {
    const res = await requestAdvice(createDisabledAdvisor(), request());
    const fact = res.statements.find(s => s.text.includes('not an eligible receiver'));
    expect(fact?.basis).toBe('deterministic-fact');
    expect(fact?.text).toContain('draft rule profile — not yet verified against the governing rule book');
    expect(res.statements.some(s => s.basis === 'verified-knowledge')).toBe(false);
  });
});

describe('eligibility and legality edge cases', () => {
  it('players tied for an end spot are unsupported, not guessed', () => {
    const f = doubles();
    f.players = f.players.map(p => (p.role === 'Y' ? { ...p, onLine: true, at: { x: 19, y: -0.8 } } : p)); // stacked with Z
    const e = receiverEligibility(f, DEFAULT_RULE_PROFILE);
    expect(e.get('Y')).toBe('unsupported');
    expect(e.get('Z')).toBe('unsupported');
    expect(e.get('X')).toBe('eligible');
  });

  it('with nobody on the line every player is unsupported and the formation is illegal', () => {
    const f = doubles();
    f.players = f.players.map(p => ({ ...p, onLine: false }));
    expect([...receiverEligibility(f, DEFAULT_RULE_PROFILE).values()].every(v => v === 'unsupported')).toBe(true);
    expect(validateFormation(f).join(' ')).toContain('at least 7 players on the line (has 0)');
  });

  it('an unknown eligibility model makes every player unsupported', () => {
    const odd = { ...DEFAULT_RULE_PROFILE, id: 'odd@1', eligibility: 'numbering' } as unknown as RuleProfile;
    expect([...receiverEligibility(doubles(), odd).values()].every(v => v === 'unsupported')).toBe(true);
  });

  it('exactly the line minimum is legal; one fewer is not', () => {
    expect(validateFormation(doubles())).toEqual([]); // 7 on the line
    const six = doubles();
    six.players = six.players.map(p => (p.role === 'X' ? { ...p, onLine: false } : p));
    expect(validateFormation(six)).toContain('Needs at least 7 players on the line (has 6).');
  });

  it('a duplicated role is reported', () => {
    const f = doubles();
    f.players = f.players.map(p => (p.role === 'H' ? { ...p, role: 'Y' as const } : p));
    expect(validateFormation(f)).toContain('Role Y is used twice.');
  });
});

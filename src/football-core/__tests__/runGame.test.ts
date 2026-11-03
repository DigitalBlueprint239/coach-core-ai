// AT-09 (Inside Zone vs 4-3 Over) and AT-24 (timing events). Deterministic; no AI.
import { resolveInsideZone, INSIDE_ZONE_CONVENTION } from '../runGame';
import { alignDefense } from '../defense';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import type { Formation } from '../types';

const doubles = (): Formation => structuredClone(SPREAD_FORMATIONS.find(f => f.id === 'doubles')!);
const ok = (side: 'strong' | 'weak' = 'strong', f = doubles()) => {
  const r = resolveInsideZone(f, side);
  if (r.status !== 'ok') throw new Error(r.reason);
  return r;
};

describe('Inside Zone to the strong side vs 4-3 Over (Doubles)', () => {
  it('resolves every lineman to a defender or a climb, play side first', () => {
    const { value } = ok();
    expect(value.playSide).toBe(1);
    expect(value.blocks.map(b => [b.blocker, b.rule, b.target, b.climbTo ?? null])).toEqual([
      ['RT', 'zone-playside', 'DE-S', null], // covered by the strong end on his outside shoulder
      ['RG', 'combo', 'DT-S', 'MIKE'], // covered by the 3-technique; double team with C
      ['C', 'combo', 'DT-S', 'MIKE'], // uncovered (nose is shaded back side): double team, climb to Mike
      ['LG', 'combo', 'NT', 'WILL'], // the nose is in his play-side gap; double team with LT
      ['LT', 'combo', 'NT', 'WILL'], // uncovered: double team, climb to Will
    ]);
  });

  it('every block carries a football rationale', () => {
    for (const b of ok().value.blocks) expect(b.rationale.length).toBeGreaterThan(20);
  });

  it('reports unblocked defenders with reasons instead of hiding them', () => {
    const { value, findings } = ok();
    const reason = (role: string) => value.unblocked.find(u => u.defender === role)?.reason ?? '';
    expect(reason('DE-W')).toContain('Back-side end');
    expect(reason('SAM')).toContain('Outside the box');
    expect(findings.filter(f => f.severity !== 'info')).toEqual([]); // nothing in the box left unaccounted for
  });

  it('models the exchange and the runner track', () => {
    const { value } = ok();
    expect(value.ball).toEqual([
      { kind: 'snap', to: 'qb' },
      { kind: 'handoff', from: 'qb', to: 'back', meshDepth: 5 },
    ]);
    expect(value.runner).toEqual({ role: 'RB', track: { aimingPoint: 'guard-outside-hip', side: 'strong', read: 'press-and-cut' } });
  });

  it('AT-24: timing events are ordered and labelled as a nominal teaching timeline', () => {
    const { value } = ok();
    const ts = value.timeline.map(e => e.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(value.timeline.map(e => e.event)).toEqual(['snap', 'line-first-step', 'mesh', 'combo-climb', 'handoff', 'runner-press']);
    expect(value.convention).toBe(INSIDE_ZONE_CONVENTION);
    expect(INSIDE_ZONE_CONVENTION).toContain('not a mandatory rule');
  });

  it('is deterministic', () => {
    expect(ok()).toEqual(ok());
  });
});

describe('what the engine refuses to guess', () => {
  it('to the weak side, a lineman with nobody left to block is reported, not invented', () => {
    const { value, findings } = ok('weak');
    expect(value.playSide).toBe(-1);
    const rt = value.blocks.find(b => b.blocker === 'RT');
    expect(rt?.target).toBeNull();
    expect(rt?.climbTo).toBeUndefined();
    expect(findings.some(f => f.code === 'run.unresolved-block' && f.subject?.slot === 'RT')).toBe(true);
    expect(findings.some(f => f.code === 'run.unblocked-box-defender' && f.message.includes('DT-S'))).toBe(true);
    expect(value.unblocked.find(u => u.defender === 'DE-S')?.reason).toContain('Back-side end'); // only the outermost
    expect(value.unblocked.find(u => u.defender === 'DT-S')?.reason).toContain('Not reached');
  });

  it('a tight end on the line is unsupported for now', () => {
    const trey = structuredClone(SPREAD_FORMATIONS.find(f => f.id === 'trey-right')!);
    const r = resolveInsideZone(trey);
    expect(r.status).toBe('unsupported');
    if (r.status === 'unsupported') expect(r.reason).toContain('TE');
  });

  it('a formation without a running back is unsupported', () => {
    const f = doubles();
    f.players = f.players.filter(p => p.role !== 'RB');
    expect(resolveInsideZone(f).status).toBe('unsupported');
  });

  it('a front other than four down linemen is unsupported', () => {
    const f = doubles();
    const threeDown = alignDefense('cover-3', f).filter(d => d.role !== 'NT');
    const r = resolveInsideZone(f, 'strong', threeDown);
    expect(r.status).toBe('unsupported');
    if (r.status === 'unsupported') expect(r.reason).toContain('3 down linemen');
  });

  it('never claims a block is won or a lane opens', () => {
    const text = JSON.stringify(ok().value).toLowerCase();
    for (const claim of ['wins', 'guarantee', 'yards gained', 'touchdown', 'success rate']) expect(text).not.toContain(claim);
  });
});

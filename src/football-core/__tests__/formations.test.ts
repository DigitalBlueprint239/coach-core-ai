import { mirrorFormation, slotsFor, strengthOf, validateFormation } from '../formations';
import { SPREAD_FORMATIONS } from '../content/formations.spread';
import type { Formation, Slot } from '../types';

const byId = (id: string) => {
  const f = SPREAD_FORMATIONS.find(x => x.id === id);
  if (!f) throw new Error(`missing formation ${id}`);
  return f;
};
const roleIn = (f: Formation, slot: Slot) => slotsFor(f).get(slot)?.role;

describe('slotsFor / strengthOf', () => {
  it('trips right numbers Z, H, Y as strong-1, strong-2, strong-3 and X as weak-1', () => {
    const f = byId('trips-right');
    expect(strengthOf(f)).toBe('right');
    expect(roleIn(f, 'strong-1')).toBe('Z');
    expect(roleIn(f, 'strong-2')).toBe('H');
    expect(roleIn(f, 'strong-3')).toBe('Y');
    expect(roleIn(f, 'weak-1')).toBe('X');
    expect(roleIn(f, 'qb')).toBe('QB');
  });

  it('doubles is 2x2 and uses the declared strength on a tie', () => {
    const f = byId('doubles');
    expect(strengthOf(f)).toBe('right');
    expect(roleIn(f, 'strong-1')).toBe('Z');
    expect(roleIn(f, 'strong-2')).toBe('Y');
    expect(roleIn(f, 'weak-1')).toBe('X');
    expect(roleIn(f, 'weak-2')).toBe('H');
    expect(slotsFor(f).has('strong-3')).toBe(false);
  });

  it('the shotgun RB is the back, not a receiver', () => {
    expect(roleIn(byId('doubles'), 'back')).toBe('RB');
  });

  it('empty numbers the detached RB as strong-3', () => {
    const f = byId('empty');
    expect(roleIn(f, 'strong-3')).toBe('RB');
    expect(slotsFor(f).has('back')).toBe(false);
  });

  it('mirrored trips is trips left', () => {
    const right = byId('trips-right');
    const left = mirrorFormation(right, 'trips-left', 'Trips Left');
    expect(left.id).toBe('trips-left');
    expect(left.name).toBe('Trips Left');
    expect(left.strength).toBe('left');
    expect(strengthOf(left)).toBe('left');
    left.players.forEach((p, i) => {
      expect(p.at.x).toBeCloseTo(-right.players[i].at.x, 9);
      expect(p.at.y).toBe(right.players[i].at.y);
    });
    const slots: Slot[] = ['strong-1', 'strong-2', 'strong-3', 'weak-1', 'back', 'qb'];
    for (const s of slots) expect(roleIn(left, s)).toBe(roleIn(right, s));
  });
});

describe('validateFormation', () => {
  it('every content formation is legal', () => {
    for (const f of SPREAD_FORMATIONS) expect(validateFormation(f)).toEqual([]);
  });

  it('names a missing player', () => {
    const f = byId('doubles');
    const short: Formation = { ...f, players: f.players.filter(p => p.role !== 'H') };
    expect(validateFormation(short)).toContain('Needs 11 players (has 10).');
  });

  it('names too few on the line', () => {
    const f = byId('doubles');
    const off: Formation = { ...f, players: f.players.map(p => (p.role === 'Z' ? { ...p, onLine: false } : p)) };
    expect(validateFormation(off)).toContain('Needs at least 7 players on the line (has 6).');
  });

  it('names a duplicated role', () => {
    const f = byId('doubles');
    const dup: Formation = { ...f, players: f.players.map(p => (p.role === 'RB' ? { ...p, role: 'QB' } : p)) };
    expect(validateFormation(dup)).toContain('Role QB is used twice.');
  });
});

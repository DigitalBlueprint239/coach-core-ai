import type { Formation, FormationPlayer, OffenseRole, Slot } from './types';

const LINEMEN: readonly OffenseRole[] = ['LT', 'LG', 'C', 'RG', 'RT'];
const BACK_ORDER: readonly OffenseRole[] = ['RB', 'FB', 'F'];
const MIN_ON_LINE = 7;

const isBack = (p: FormationPlayer) => Math.abs(p.at.x) <= 4 && p.at.y <= -3;

function split(f: Formation) {
  const backs: FormationPlayer[] = [];
  const left: FormationPlayer[] = [];
  const right: FormationPlayer[] = [];
  let qb: FormationPlayer | undefined;
  for (const p of f.players) {
    if (LINEMEN.includes(p.role)) continue;
    if (p.role === 'QB') qb = p;
    else if (isBack(p)) backs.push(p);
    else (p.at.x > 0 ? right : left).push(p);
  }
  backs.sort((a, b) => rank(a.role) - rank(b.role));
  return { qb, backs, left, right };
}

const rank = (r: OffenseRole) => {
  const i = BACK_ORDER.indexOf(r);
  return i < 0 ? BACK_ORDER.length : i;
};

/** The side with more receivers; the formation's declared strength breaks a tie. */
export function strengthOf(f: Formation): 'left' | 'right' {
  const { left, right } = split(f);
  if (right.length === left.length) return f.strength;
  return right.length > left.length ? 'right' : 'left';
}

/** Receivers numbered from the outside in on each side (#1, #2, #3), plus the QB and backs. */
export function slotsFor(f: Formation): Map<Slot, FormationPlayer> {
  const { qb, backs, left, right } = split(f);
  const strong = strengthOf(f) === 'right' ? right : left;
  const weak = strong === right ? left : right;
  const slots = new Map<Slot, FormationPlayer>();
  if (qb) slots.set('qb', qb);
  if (backs[0]) slots.set('back', backs[0]);
  if (backs[1]) slots.set('back-2', backs[1]);
  const number = (side: FormationPlayer[], prefix: 'strong' | 'weak') =>
    [...side]
      .sort((a, b) => Math.abs(b.at.x) - Math.abs(a.at.x))
      .slice(0, 3)
      .forEach((p, i) => slots.set(`${prefix}-${i + 1}` as Slot, p));
  number(strong, 'strong');
  number(weak, 'weak');
  return slots;
}

export function mirrorFormation(f: Formation, id: string, name: string): Formation {
  return {
    ...f,
    id,
    name,
    strength: f.strength === 'right' ? 'left' : 'right',
    players: f.players.map(p => ({ ...p, at: { x: p.at.x === 0 ? 0 : -p.at.x, y: p.at.y } })),
  };
}

/** Plain-language problems that make a formation illegal; empty when legal. */
export function validateFormation(f: Formation): string[] {
  const problems: string[] = [];
  if (f.players.length !== 11) problems.push(`Needs 11 players (has ${f.players.length}).`);
  const onLine = f.players.filter(p => p.onLine).length;
  if (onLine < MIN_ON_LINE) problems.push(`Needs at least ${MIN_ON_LINE} players on the line (has ${onLine}).`);
  const seen = new Set<OffenseRole>();
  const reported = new Set<OffenseRole>();
  for (const p of f.players) {
    if (seen.has(p.role) && !reported.has(p.role)) {
      problems.push(`Role ${p.role} is used twice.`);
      reported.add(p.role);
    }
    seen.add(p.role);
  }
  return problems;
}

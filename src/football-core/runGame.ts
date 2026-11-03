// Run game v1: Inside Zone against a modelled 4-3 Over (T-107, owner decision 4: run first).
//
// What is deterministic here: defender levels (first/second level, in or out of the box), each blocker's target under
// the stated blocking convention, the exchange and the runner's aiming point. What is NOT claimed: that any block is
// won, that a lane opens, or any yardage. Timing values are a nominal teaching timeline, not measurements.
//
// Blocking convention used (a widely taught "covered / uncovered" inside-zone rule; recorded as coaching convention,
// not a mandatory rule, and draft until reviewed by the football review group):
//   1. Work from the play side to the back side. A lineman is COVERED when a first-level defender is head-up on him or
//      shaded to his play side (within 1.6 yd). A covered lineman blocks that defender.
//   2. An UNCOVERED lineman combo-blocks (double-teams) with the adjacent play-side lineman on that lineman's defender,
//      and climbs to the nearest unclaimed in-box linebacker.
//   3. If no play-side partner is covered, the uncovered lineman climbs straight to the nearest unclaimed linebacker.
//   4. Defenders nobody is assigned to are reported (e.g. the back-side end, players outside the box), never hidden.
// Unsupported (returns `unsupported`, nothing guessed): missing linemen/QB/back, a tight end or wing on the line near
// the ball (not modelled yet), or a front that is not four down linemen with two or three box linebackers.
import { alignDefense } from './defense';
import type { Evaluation, Finding } from './findings';
import { slotsFor, strengthOf } from './formations';
import { LINE_SLOTS, type BallAction, type LineSlot, type RunTrack } from './model';
import type { Defender, DefenderRole, Formation } from './types';

export type RunSide = 'strong' | 'weak';

export type BlockAssignment = {
  blocker: LineSlot;
  rule: 'zone-playside' | 'combo';
  /** The first-level defender this lineman blocks (for a combo: the defender being double-teamed). */
  target: DefenderRole | null;
  /** For a combo or a climb: the linebacker this lineman works to. */
  climbTo?: DefenderRole;
  rationale: string;
};

export type TimelineEvent = { t: number; event: 'snap' | 'line-first-step' | 'mesh' | 'handoff' | 'combo-climb' | 'runner-press'; detail: string };

export type InsideZoneResolution = {
  concept: 'inside-zone';
  front: '4-3-over';
  side: RunSide;
  /** +1 = offense's right, -1 = offense's left. */
  playSide: 1 | -1;
  blocks: BlockAssignment[];
  unblocked: Array<{ defender: DefenderRole; reason: string }>;
  ball: BallAction[];
  runner: { role: string; track: RunTrack };
  /** Nominal teaching timeline in seconds from the snap — NOT measured and not a prediction. */
  timeline: TimelineEvent[];
  convention: string;
};

const COVER_YD = 1.6;
const HEAD_UP_YD = 0.5;
const BOX_HALF_WIDTH = 7;
const FIRST_LEVEL_MAX_Y = 2;
const SECOND_LEVEL_MAX_Y = 7;

export const INSIDE_ZONE_CONVENTION =
  'Covered/uncovered inside-zone rule: covered linemen block the defender on or play-side of them; uncovered linemen double-team with the play-side neighbour and climb to the nearest linebacker. Coaching convention (draft, pending football review), not a mandatory rule.';

export function resolveInsideZone(formation: Formation, side: RunSide = 'strong', defense?: Defender[]): Evaluation<InsideZoneResolution> {
  const findings: Finding[] = [];
  const line = LINE_SLOTS.map(role => formation.players.find(p => p.role === role));
  if (line.some(p => !p)) return { status: 'unsupported', reason: 'Inside zone needs all five offensive linemen.', findings };
  const slots = slotsFor(formation);
  const qb = slots.get('qb');
  const back = slots.get('back');
  if (!qb || !back) return { status: 'unsupported', reason: 'Inside zone needs a quarterback and a running back.', findings };
  const nearLine = formation.players.filter(
    p => p.onLine && !(LINE_SLOTS as readonly string[]).includes(p.role) && Math.abs(p.at.x) < BOX_HALF_WIDTH,
  );
  if (nearLine.length) {
    return {
      status: 'unsupported',
      reason: `Blocking for a player on the line next to the tackles (${nearLine.map(p => p.role).join(', ')}) is not modelled yet.`,
      findings,
    };
  }

  const defenders = defense ?? alignDefense('cover-3', formation);
  const firstLevel = defenders.filter(d => d.at.y <= FIRST_LEVEL_MAX_Y && Math.abs(d.at.x) < BOX_HALF_WIDTH);
  const linebackers = defenders.filter(
    d => d.at.y > FIRST_LEVEL_MAX_Y && d.at.y <= SECOND_LEVEL_MAX_Y && Math.abs(d.at.x) < BOX_HALF_WIDTH,
  );
  if (firstLevel.length !== 4 || linebackers.length < 2 || linebackers.length > 3) {
    return {
      status: 'unsupported',
      reason: `This front (${firstLevel.length} down linemen, ${linebackers.length} box linebackers) is not modelled; only a 4-3 Over shape is.`,
      findings,
    };
  }

  const strongRight = strengthOf(formation) === 'right';
  const playSide: 1 | -1 = (strongRight ? 1 : -1) * (side === 'strong' ? 1 : -1) === 1 ? 1 : -1;
  // Linemen ordered from the play side to the back side.
  const ordered = [...(line as NonNullable<(typeof line)[number]>[])].sort((a, b) => playSide * (b.at.x - a.at.x));

  const claimedDL = new Set<DefenderRole>();
  const claimedLB = new Set<DefenderRole>();
  const coverOf = new Map<LineSlot, Defender>();
  for (const ol of ordered) {
    const d = firstLevel
      .filter(x => !claimedDL.has(x.role))
      .find(x => {
        const dx = x.at.x - ol.at.x;
        return Math.abs(dx) <= HEAD_UP_YD || (playSide * dx > 0 && playSide * dx <= COVER_YD);
      });
    if (d) {
      coverOf.set(ol.role as LineSlot, d);
      claimedDL.add(d.role);
    }
  }

  const nearestLB = (x: number) =>
    linebackers.filter(l => !claimedLB.has(l.role)).sort((a, b) => Math.abs(a.at.x - x) - Math.abs(b.at.x - x))[0];

  const blocks: BlockAssignment[] = [];
  ordered.forEach((ol, i) => {
    const role = ol.role as LineSlot;
    const covered = coverOf.get(role);
    if (covered) {
      blocks.push({
        blocker: role,
        rule: 'zone-playside',
        target: covered.role,
        rationale: `Covered: ${covered.role} is ${Math.abs(covered.at.x - ol.at.x) <= HEAD_UP_YD ? 'head-up on' : 'on the play-side shoulder of'} ${role}, so ${role} blocks him.`,
      });
      return;
    }
    const partner = i > 0 ? ordered[i - 1] : undefined; // adjacent play-side lineman
    const partnerTarget = partner ? coverOf.get(partner.role as LineSlot) : undefined;
    const partnerBlock = partner ? blocks.find(b => b.blocker === partner.role) : undefined;
    if (partner && partnerTarget && partnerBlock && partnerBlock.rule === 'zone-playside' && !partnerBlock.climbTo) {
      const lb = nearestLB(partnerTarget.at.x);
      if (lb) claimedLB.add(lb.role);
      partnerBlock.rule = 'combo';
      partnerBlock.climbTo = lb?.role;
      blocks.push({
        blocker: role,
        rule: 'combo',
        target: partnerTarget.role,
        climbTo: lb?.role,
        rationale: `Uncovered: ${role} double-teams ${partnerTarget.role} with ${partner.role}; one of them climbs to ${lb ? lb.role : 'the second level (no linebacker left to claim)'}.`,
      });
      if (!lb) {
        findings.push({ code: 'run.unresolved-climb', severity: 'warning', message: `The ${partner.role}-${role} double team has no linebacker left to climb to.`, subject: { slot: role }, options: ['Check the defensive alignment.'] });
      }
      return;
    }
    const lb = nearestLB(ol.at.x);
    if (lb) claimedLB.add(lb.role);
    blocks.push({
      blocker: role,
      rule: 'zone-playside',
      target: null,
      climbTo: lb?.role,
      rationale: lb
        ? `Uncovered with no covered play-side partner: ${role} climbs straight to ${lb.role}.`
        : `Uncovered and no linebacker left to claim: ${role} has no resolved target.`,
    });
    if (!lb) {
      findings.push({ code: 'run.unresolved-block', severity: 'warning', message: `${role} has no defender to block under this convention.`, subject: { slot: role }, options: ['Assign this lineman by hand.'] });
    }
  });

  const blockedRoles = new Set(blocks.flatMap(b => [b.target, b.climbTo].filter((r): r is DefenderRole => !!r)));
  // The back-side end is the OUTERMOST first-level defender on the back side, not every back-side lineman.
  const backsideEnd = firstLevel
    .filter(d => playSide * d.at.x < 0)
    .sort((a, b) => playSide * a.at.x - playSide * b.at.x)[0];
  const unblocked = defenders
    .filter(d => !blockedRoles.has(d.role))
    .map(d => {
      const inBox = Math.abs(d.at.x) < BOX_HALF_WIDTH && d.at.y <= SECOND_LEVEL_MAX_Y;
      const reason = !inBox
        ? 'Outside the box: not blocked by the line; perimeter blocking is not modelled yet.'
        : d.role === backsideEnd?.role
          ? 'Back-side end: inside zone leaves him unblocked by the line (he is commonly read by the quarterback or handled by a back-side block not modelled here).'
          : 'Not reached by any blocker under this convention.';
      return { defender: d.role, reason };
    });
  for (const u of unblocked) {
    if (u.reason.startsWith('Not reached')) {
      findings.push({ code: 'run.unblocked-box-defender', severity: 'warning', message: `${u.defender} is in the box and nobody is assigned to him.`, options: ['Account for him with a back, a read, or a manual assignment.'] });
    }
  }

  const sideWord = playSide === 1 ? 'right' : 'left';
  const runner: InsideZoneResolution['runner'] = {
    role: back.role,
    track: { aimingPoint: 'guard-outside-hip', side, read: 'press-and-cut' },
  };
  return {
    status: 'ok',
    value: {
      concept: 'inside-zone',
      front: '4-3-over',
      side,
      playSide,
      blocks,
      unblocked,
      ball: [
        { kind: 'snap', to: 'qb' },
        { kind: 'handoff', from: 'qb', to: 'back', meshDepth: Math.abs(back.at.y) },
      ],
      runner,
      timeline: [
        { t: 0, event: 'snap', detail: 'Center snaps to the quarterback.' },
        { t: 0.1, event: 'line-first-step', detail: `Every lineman steps to the ${sideWord} (play side).` },
        { t: 0.4, event: 'mesh', detail: `Quarterback and ${back.role} meet at the mesh.` },
        { t: 0.6, event: 'combo-climb', detail: 'Double teams work to the linebackers; one blocker climbs.' },
        { t: 0.8, event: 'handoff', detail: `Ball handed to ${back.role}.` },
        { t: 1.1, event: 'runner-press', detail: `${back.role} presses the ${sideWord} guard's outside hip, then cuts off the blocks.` },
      ],
      convention: INSIDE_ZONE_CONVENTION,
    },
    findings,
  };
}

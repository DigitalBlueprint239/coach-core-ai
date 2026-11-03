// Canonical football model v3 — semantic assignments (ADR-001, approved in principle 2026-11-03).
// A typed union that can express run and pass football with one structure. This slice defines the contract and a
// lossless adapter from today's v2 assignments; run-scheme resolution (Inside Zone) builds on it next (T-107).
// Where today's data does not say something (e.g. *which* block or protection), the adapter records `unspecified`
// instead of inventing a scheme.
import type { Assignment, RouteId, Slot } from './types';

export const MODEL_VERSION = 3 as const;

/** Run blocking rules by family; each lineman's target is resolved against a front by the engine (T-107). */
export type BlockRule =
  | 'unspecified'
  | 'zone-playside' // step playside, block the man covering the playside gap or climb
  | 'zone-backside' // cut off the backside gap
  | 'down' // block down on the inside defender (gap schemes)
  | 'pull-kick' // pull and kick out the end man on the line
  | 'pull-lead' // pull and lead through the hole
  | 'base' // block the man over
  | 'combo'; // double team, one climbs to the linebacker

export type ProtectionRule = 'unspecified' | 'slide' | 'man' | 'big-on-big' | 'check-release';

export type RunTrack = {
  /** Aiming point as a gap/landmark relative to the line, e.g. playside A gap / B gap, or the tackle's outside hip. */
  aimingPoint: 'A-gap' | 'B-gap' | 'C-gap' | 'guard-outside-hip' | 'tackle-outside-hip' | 'edge';
  /** The side the play is run to, relative to the formation's strength. */
  side: 'strong' | 'weak';
  /** How the runner reads or presses the hole. */
  read?: 'press-and-cut' | 'follow-puller' | 'downhill';
};

export type BallAction =
  | { kind: 'snap'; to: Slot }
  | { kind: 'handoff'; from: Slot; to: Slot; meshDepth?: number }
  | { kind: 'pitch'; from: Slot; to: Slot }
  | { kind: 'pass'; from: Slot; dropSteps?: 3 | 5 | 7; shotgun?: boolean };

export type AssignmentV3 =
  | { kind: 'route'; slot: Slot; route: RouteId; depth?: number }
  | { kind: 'run-track'; slot: Slot; track: RunTrack }
  | { kind: 'block'; slot: Slot; rule: BlockRule }
  | { kind: 'protect'; slot: Slot; rule: ProtectionRule }
  | { kind: 'motion'; slot: Slot; motion: 'jet' | 'orbit' | 'across' | 'return'; endsAt?: Slot }
  | { kind: 'read'; slot: Slot; key: string; rule: string };

export type ConceptFamily = 'run' | 'pass' | 'play-action' | 'rpo' | 'screen';

/** Lossless conversion of a v2 assignment. Nothing is guessed: unknown block/protection rules stay `unspecified`. */
export function fromV2Assignment(a: Assignment): AssignmentV3 {
  switch (a.kind) {
    case 'route':
      return a.depth === undefined
        ? { kind: 'route', slot: a.slot, route: a.route }
        : { kind: 'route', slot: a.slot, route: a.route, depth: a.depth };
    case 'protect':
      return { kind: 'protect', slot: a.slot, rule: 'unspecified' };
    case 'block':
      return { kind: 'block', slot: a.slot, rule: 'unspecified' };
  }
}

/** Back to v2 where v2 can express it (route/protect/block); other kinds have no v2 form and return null. */
export function toV2Assignment(a: AssignmentV3): Assignment | null {
  switch (a.kind) {
    case 'route':
      return a.depth === undefined
        ? { slot: a.slot, kind: 'route', route: a.route }
        : { slot: a.slot, kind: 'route', route: a.route, depth: a.depth };
    case 'protect':
      return a.rule === 'unspecified' ? { slot: a.slot, kind: 'protect' } : null;
    case 'block':
      return a.rule === 'unspecified' ? { slot: a.slot, kind: 'block' } : null;
    default:
      return null;
  }
}

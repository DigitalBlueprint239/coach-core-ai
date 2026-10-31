// Spread formations (10/11 personnel) for the first content slice. Positions are candidates until
// Task 9 verifies them against sources; change them only with sources.
import type { Formation, FormationPlayer, OffenseRole, Verification } from '../types';

const AWAITING: Verification = { status: 'draft', sources: [], note: 'awaiting research (Task 9)' };

const p = (role: OffenseRole, x: number, y: number, onLine = false): FormationPlayer => ({ role, at: { x, y }, onLine });

const LINE: FormationPlayer[] = [
  p('LT', -4.6, -0.5, true),
  p('LG', -2.3, -0.5, true),
  p('C', 0, -0.5, true),
  p('RG', 2.3, -0.5, true),
  p('RT', 4.6, -0.5, true),
];
const QB = p('QB', 0, -5);
const RB_GUN = p('RB', -2.6, -5);

export const SPREAD_FORMATIONS: Formation[] = [
  {
    id: 'doubles',
    name: 'Doubles',
    personnel: '10',
    strength: 'right',
    players: [...LINE, QB, RB_GUN, p('X', -19, -0.8, true), p('H', -13.5, -1.6), p('Y', 13.5, -1.6), p('Z', 19, -0.8, true)],
    levels: ['youth', 'jv', 'varsity'],
    verification: AWAITING,
  },
  {
    id: 'trips-right',
    name: 'Trips Right',
    personnel: '10',
    strength: 'right',
    players: [...LINE, QB, RB_GUN, p('X', -19, -0.8, true), p('Y', 8.5, -1.6), p('H', 13.5, -1.6), p('Z', 19, -0.8, true)],
    levels: ['jv', 'varsity'],
    verification: AWAITING,
  },
  {
    id: 'trey-right',
    name: 'Trey Right',
    personnel: '11',
    strength: 'right',
    players: [...LINE, QB, RB_GUN, p('TE', 6.9, -0.5, true), p('H', 13.5, -1.6), p('Z', 19, -0.8, true), p('X', -19, -0.8, true)],
    levels: ['youth', 'jv', 'varsity'],
    verification: AWAITING,
  },
  {
    id: 'empty',
    name: 'Empty',
    personnel: '10',
    strength: 'right',
    players: [...LINE, QB, p('X', -19, -0.8, true), p('H', -13.5, -1.6), p('Y', 13.5, -1.6), p('Z', 19, -0.8, true), p('RB', 8.5, -1.6)],
    levels: ['varsity'],
    verification: AWAITING,
  },
];

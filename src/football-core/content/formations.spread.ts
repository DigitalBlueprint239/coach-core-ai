// Spread formations (10/11 personnel) for the first content slice. Verified items cite their sources
// (./sources); drafts wait in the owner's review queue. Change positions only with sources.
import { GLAZIER_2X2, USAF_PRUITT_3X1, YFO_2X2_SPREAD, YFO_FLOOD_TRIPS } from './sources';
import type { Formation, FormationPlayer, OffenseRole } from '../types';


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
    verification: { status: 'verified', sources: [GLAZIER_2X2, YFO_2X2_SPREAD] },
  },
  {
    id: 'trips-right',
    name: 'Trips Right',
    personnel: '10',
    strength: 'right',
    players: [...LINE, QB, RB_GUN, p('X', -19, -0.8, true), p('Y', 8.5, -1.6), p('H', 13.5, -1.6), p('Z', 19, -0.8, true)],
    levels: ['jv', 'varsity'],
    verification: { status: 'verified', sources: [USAF_PRUITT_3X1, YFO_FLOOD_TRIPS] },
  },
  {
    id: 'trey-right',
    name: 'Trey Right',
    personnel: '11',
    strength: 'right',
    players: [...LINE, QB, RB_GUN, p('TE', 6.9, -0.5, true), p('H', 13.5, -1.6), p('Z', 19, -0.8, true), p('X', -19, -0.8, true)],
    levels: ['youth', 'jv', 'varsity'],
    verification: { status: 'draft', sources: [], note: 'No reliable source found yet for the 3x1 set with an attached tight end as aligned here.' },
  },
  {
    id: 'empty',
    name: 'Empty',
    personnel: '10',
    strength: 'right',
    players: [...LINE, QB, p('X', -19, -0.8, true), p('H', -13.5, -1.6), p('Y', 13.5, -1.6), p('Z', 19, -0.8, true), p('RB', 8.5, -1.6)],
    levels: ['varsity'],
    verification: { status: 'draft', sources: [], note: 'No reliable source found yet for this 3x2 empty alignment with the detached running back.' },
  },
];

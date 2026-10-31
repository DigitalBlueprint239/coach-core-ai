// "What beats what" claims. Each needs 3 independent reliable publishers (or the owner's approval)
// before the assistant may use it; the rest wait in the owner's review queue.
import { GLAZIER_SMASH, ITP_COVER_3, USAF_EAGLES_MESH, USAF_READ_DEFENSES, WWTP_MESH, WWTP_SMASH, YFO_BEAT_COVER_3, YFO_CURL_FLAT } from './sources';
import type { Matchup } from '../types';


export const MATCHUPS: Matchup[] = [
  {
    concept: 'flood',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'Two receivers on the flat defender, one high and one low. He can only take one.',
    verification: { status: 'draft', sources: [YFO_BEAT_COVER_3], note: 'One reliable publisher; three are required for a matchup.' },
  },
  {
    concept: 'curl-flat',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The flat defender has to pick the curl or the flat. Throw to whichever he leaves.',
    verification: { status: 'draft', sources: [YFO_CURL_FLAT], note: 'One reliable publisher; three are required for a matchup.' },
  },
  {
    concept: 'four-verticals',
    beats: 'cover-3',
    stressedDefender: 'Middle safety',
    reason: 'Four receivers go deep against three deep defenders, so one seam is always open.',
    verification: { status: 'draft', sources: [YFO_BEAT_COVER_3, ITP_COVER_3], note: 'Two reliable publishers; three are required for a matchup.' },
  },
  {
    concept: 'snag',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The corner, snag and swing make a triangle the flat defender cannot cover by himself.',
    verification: { status: 'draft', sources: [], note: 'Only blogs and fan sites found so far.' },
  },
  {
    concept: 'stick',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The stick and the flat stretch the flat defender sideways on a quick, safe throw.',
    verification: { status: 'draft', sources: [YFO_BEAT_COVER_3], note: 'One reliable publisher; USA Football describes stick against Quarters, not Cover 3.' },
  },
  {
    concept: 'smash',
    beats: 'cover-2',
    stressedDefender: 'Cornerback',
    reason: 'The cornerback has the flat and cannot also run with the corner route behind him.',
    verification: { status: 'verified', sources: [GLAZIER_SMASH, WWTP_SMASH, USAF_READ_DEFENSES] },
  },
  {
    concept: 'mesh',
    beats: 'cover-1',
    stressedDefender: 'Man defenders on the crossers',
    reason: 'The two drags cross so close that the defenders covering them get rubbed off.',
    verification: { status: 'draft', sources: [USAF_EAGLES_MESH, WWTP_MESH], note: 'Sources say mesh beats man coverage generally; none names Cover 1 specifically.' },
  },
  {
    concept: 'mesh',
    beats: 'cover-0',
    stressedDefender: 'Man defenders on the crossers',
    reason: 'With no safety help, a drag that clears the crossing traffic has room to run.',
    verification: { status: 'draft', sources: [USAF_EAGLES_MESH, WWTP_MESH], note: 'Sources say mesh beats man coverage generally; none names Cover 0 specifically.' },
  },
];

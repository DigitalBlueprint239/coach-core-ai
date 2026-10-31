// "What beats what" claims for the first content slice. Candidates only: each needs 3 independent
// sources (Task 9) before the assistant may use it.
import type { Matchup, Verification } from '../types';

const AWAITING: Verification = { status: 'draft', sources: [], note: 'awaiting research (Task 9)' };

export const MATCHUPS: Matchup[] = [
  {
    concept: 'flood',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'Two receivers on the flat defender, one high and one low. He can only take one.',
    verification: AWAITING,
  },
  {
    concept: 'curl-flat',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The flat defender has to pick the curl or the flat. Throw to whichever he leaves.',
    verification: AWAITING,
  },
  {
    concept: 'four-verticals',
    beats: 'cover-3',
    stressedDefender: 'Middle safety',
    reason: 'Four receivers go deep against three deep defenders, so one seam is always open.',
    verification: AWAITING,
  },
  {
    concept: 'snag',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The corner, snag and swing make a triangle the flat defender cannot cover by himself.',
    verification: AWAITING,
  },
  {
    concept: 'stick',
    beats: 'cover-3',
    stressedDefender: 'Flat defender (curl/flat)',
    reason: 'The stick and the flat stretch the flat defender sideways on a quick, safe throw.',
    verification: AWAITING,
  },
  {
    concept: 'smash',
    beats: 'cover-2',
    stressedDefender: 'Cornerback',
    reason: 'The cornerback has the flat and cannot also run with the corner route behind him.',
    verification: AWAITING,
  },
  {
    concept: 'mesh',
    beats: 'cover-1',
    stressedDefender: 'Man defenders on the crossers',
    reason: 'The two drags cross so close that the defenders covering them get rubbed off.',
    verification: AWAITING,
  },
  {
    concept: 'mesh',
    beats: 'cover-0',
    stressedDefender: 'Man defenders on the crossers',
    reason: 'With no safety help, a drag that clears the crossing traffic has room to run.',
    verification: AWAITING,
  },
];

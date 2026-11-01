// 4-3 Over front and its coverages for the first content slice. Verified items cite their sources
// (./sources); drafts wait in the owner's review queue.
import { GLAZIER_SMASH, ITP_COVER_3, USAF_READ_DEFENSES } from './sources';
import type { Coverage, Front } from '../types';


export const FRONT_43_OVER: Front = { id: '43-over', name: '4-3 Over', verification: { status: 'draft', sources: [], note: 'Front alignment not yet researched against reliable sources.' } };

export const COVERAGES: Coverage[] = [
  { id: 'cover-0', name: 'Cover 0', deepDefenders: 0, verification: { status: 'draft', sources: [], note: 'Not yet researched against reliable sources.' } },
  { id: 'cover-1', name: 'Cover 1', deepDefenders: 1, verification: { status: 'draft', sources: [], note: 'Not yet researched against reliable sources.' } },
  { id: 'cover-2', name: 'Cover 2', deepDefenders: 2, verification: { status: 'verified', sources: [USAF_READ_DEFENSES, GLAZIER_SMASH] } },
  { id: 'cover-3', name: 'Cover 3', deepDefenders: 1, verification: { status: 'verified', sources: [USAF_READ_DEFENSES, ITP_COVER_3] } },
  { id: 'cover-4', name: 'Cover 4', deepDefenders: 2, verification: { status: 'draft', sources: [], note: 'Not yet researched against reliable sources.' } },
];

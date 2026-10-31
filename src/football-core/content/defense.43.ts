// 4-3 Over front and its coverages for the first content slice. Draft until Task 9 verifies them.
import type { Coverage, Front, Verification } from '../types';

const AWAITING: Verification = { status: 'draft', sources: [], note: 'awaiting research (Task 9)' };

export const FRONT_43_OVER: Front = { id: '43-over', name: '4-3 Over', verification: AWAITING };

export const COVERAGES: Coverage[] = [
  { id: 'cover-0', name: 'Cover 0', deepDefenders: 0, verification: AWAITING },
  { id: 'cover-1', name: 'Cover 1', deepDefenders: 1, verification: AWAITING },
  { id: 'cover-2', name: 'Cover 2', deepDefenders: 2, verification: AWAITING },
  { id: 'cover-3', name: 'Cover 3', deepDefenders: 1, verification: AWAITING },
  { id: 'cover-4', name: 'Cover 4', deepDefenders: 2, verification: AWAITING },
];

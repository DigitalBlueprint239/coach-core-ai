import { slotsFor, strengthOf } from './formations';
import type { CoverageId, Defender, DefenderRole, Formation, Yards } from './types';

/** Defenders at or beyond this depth (yd) count as deep. */
const DEEP_YD = 10;
const HASH_YD = 8.9;
/** Fallback x for a cornerback when the formation has no #1 on his side. */
const WIDE_YD = 18;

const CB_DEPTH: Record<CoverageId, number> = { 'cover-0': 1, 'cover-1': 1, 'cover-2': 5, 'cover-3': 7, 'cover-4': 7 };

/** 4-3 Over aligned to an offensive formation, with the secondary set by coverage (all 11 defenders). */
export function alignDefense(coverage: CoverageId, f: Formation): Defender[] {
  const slots = slotsFor(f);
  const s = strengthOf(f) === 'right' ? 1 : -1;
  const x = (slot: Parameters<typeof slots.get>[0]) => slots.get(slot)?.at.x;
  const strong2 = x('strong-2');
  const weak2 = x('weak-2');
  const apex = strong2 === undefined ? s * 5 : (strong2 + s * 4.6) / 2;

  const at: Record<DefenderRole, Yards> = {
    'DE-S': { x: s * 5.6, y: 1.3 },
    'DT-S': { x: s * 2.9, y: 1.3 },
    NT: { x: -s * 0.8, y: 1.3 },
    'DE-W': { x: -s * 5.6, y: 1.3 },
    SAM: { x: apex, y: 4.5 },
    MIKE: { x: s * 1.5, y: 4.5 },
    WILL: { x: -s * 3.5, y: 4.5 },
    'CB-S': { x: (x('strong-1') ?? s * WIDE_YD) + s, y: CB_DEPTH[coverage] },
    'CB-W': { x: (x('weak-1') ?? -s * WIDE_YD) - s, y: CB_DEPTH[coverage] },
    SS: { x: 0, y: 0 },
    FS: { x: 0, y: 0 },
  };

  switch (coverage) {
    case 'cover-0':
      at.SS = { x: strong2 ?? apex, y: 5 };
      at.FS = { x: x('back') ?? 0, y: 6 };
      break;
    case 'cover-1':
      at.SS = { x: strong2 ?? apex, y: 6 };
      at.FS = { x: 0, y: 13 };
      break;
    case 'cover-2':
      at.SS = { x: s * HASH_YD, y: 12 };
      at.FS = { x: -s * HASH_YD, y: 12 };
      break;
    case 'cover-3':
      at.SS = { x: apex, y: 6 };
      at.FS = { x: 0, y: 13 };
      break;
    case 'cover-4':
      at.SS = { x: (strong2 ?? s * HASH_YD) * 0.6, y: 10 };
      at.FS = { x: weak2 === undefined ? -s * HASH_YD : weak2 * 0.6, y: 10 };
      break;
  }

  const order: DefenderRole[] = ['DE-S', 'DT-S', 'NT', 'DE-W', 'SAM', 'MIKE', 'WILL', 'CB-S', 'CB-W', 'SS', 'FS'];
  return order.map(role => ({ role, at: at[role], deep: at[role].y >= DEEP_YD }));
}

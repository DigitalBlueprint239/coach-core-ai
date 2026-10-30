import {
  FIELD_WIDTH_YD, HASH_LENGTH_YD, LINE_WIDTH_YD, NUMBER_HEIGHT_YD, NUMBER_TOP_FROM_SIDELINE_YD,
  RULESETS, fieldLayout, type Ruleset,
} from './field';

/** Axis-aligned painted rectangle in canonical yards (x lateral, y downfield). */
export interface MarkRect { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number }

export interface YardNumberMark {
  readonly n: number;
  /** Center of the numeral pair. */
  readonly xYd: number;
  readonly yYd: number;
  /** Numbers read upright from their own sideline. */
  readonly sideline: 'left' | 'right';
  readonly arrowTowardNegativeY: boolean;
}

export interface FieldMarkings {
  readonly lines: readonly MarkRect[];
  readonly numbers: readonly YardNumberMark[];
  readonly endZones: readonly MarkRect[];
  readonly bounds: MarkRect;
}

const HALF_W = FIELD_WIDTH_YD / 2;
const HALF_LINE = LINE_WIDTH_YD / 2;
/** Sideline ticks sit 4 in. inside the boundary. */
const SIDE_TICK_INSET_YD = 4 / 36;

export function buildMarkings(ruleset: Ruleset, ballOnOwn: number): FieldMarkings {
  const layout = fieldLayout(ballOnOwn);
  const hash = RULESETS[ruleset].hashFromCenterYd;
  const lines: MarkRect[] = [];
  const across = (y: number, width = LINE_WIDTH_YD) => lines.push({ x0: -HALF_W, y0: y - width / 2, x1: HALF_W, y1: y + width / 2 });

  // Boundary: sidelines and end lines.
  for (const s of [-1, 1]) {
    lines.push({ x0: s * HALF_W - HALF_LINE, y0: layout.backLineOwnYd, x1: s * HALF_W + HALF_LINE, y1: layout.backLineOppYd });
  }
  across(layout.backLineOwnYd);
  across(layout.backLineOppYd);

  for (const mark of layout.fiveYardLines) across(mark.yYd, mark.isGoalLine ? LINE_WIDTH_YD * 2 : LINE_WIDTH_YD);

  for (const y of layout.tickLines) {
    const y0 = y - HALF_LINE, y1 = y + HALF_LINE;
    for (const s of [-1, 1]) {
      // Hash marks: 2 ft, the inner edge on the hash line.
      const inner = s * hash;
      lines.push(s < 0 ? { x0: inner - HASH_LENGTH_YD, y0, x1: inner, y1 } : { x0: inner, y0, x1: inner + HASH_LENGTH_YD, y1 });
      // Sideline ticks.
      const edge = s * (HALF_W - SIDE_TICK_INSET_YD);
      lines.push(s < 0 ? { x0: edge, y0, x1: edge + HASH_LENGTH_YD, y1 } : { x0: edge - HASH_LENGTH_YD, y0, x1: edge, y1 });
    }
  }

  const numberCenterFromSideline = NUMBER_TOP_FROM_SIDELINE_YD - NUMBER_HEIGHT_YD / 2;
  const numbers: YardNumberMark[] = [];
  for (const mark of layout.fiveYardLines) {
    if (mark.number === null) continue;
    for (const sideline of ['left', 'right'] as const) {
      numbers.push({
        n: mark.number,
        xYd: (sideline === 'left' ? -1 : 1) * (HALF_W - numberCenterFromSideline),
        yYd: mark.yYd,
        sideline,
        arrowTowardNegativeY: mark.towardOwnGoal,
      });
    }
  }

  return {
    lines,
    numbers,
    endZones: [
      { x0: -HALF_W, y0: layout.backLineOwnYd, x1: HALF_W, y1: layout.ownGoalYd },
      { x0: -HALF_W, y0: layout.oppGoalYd, x1: HALF_W, y1: layout.backLineOppYd },
    ],
    bounds: { x0: -HALF_W, y0: layout.backLineOwnYd, x1: HALF_W, y1: layout.backLineOppYd },
  };
}

/** Number plate size in yards (two numerals straddling the line). */
export const NUMBER_PLATE = Object.freeze({ width: 4, height: NUMBER_HEIGHT_YD });

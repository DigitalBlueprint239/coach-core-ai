/**
 * Field geometry in yards, relative to the ball at the LOS (same frame as CanonicalScene).
 * The ball's yard line is presentation state (the stored play has no ball spot),
 * so absolute yard numbers are a view choice, not play data.
 */

/** 160 ft. */
export const FIELD_WIDTH_YD = 160 / 3;
export const END_ZONE_DEPTH_YD = 10;
/** 4 in. field lines. */
export const LINE_WIDTH_YD = 4 / 36;

export type Ruleset = 'HS' | 'NCAA' | 'NFL';

export interface RulesetSpec {
  readonly id: Ruleset;
  readonly label: string;
  /** Distance from the field's center line to each row of hash marks. */
  readonly hashFromCenterYd: number;
  readonly source: string;
}

/** Hash positions from the sideline: NFHS 53 ft 4 in, NCAA 60 ft, NFL 70 ft 9 in. */
export const RULESETS: Readonly<Record<Ruleset, RulesetSpec>> = Object.freeze({
  HS: { id: 'HS', label: 'High School (NFHS)', hashFromCenterYd: FIELD_WIDTH_YD / 2 - (53 + 4 / 12) / 3, source: 'NFHS: hashes divide the field into thirds, 53′4″ from each sideline' },
  NCAA: { id: 'NCAA', label: 'College (NCAA)', hashFromCenterYd: FIELD_WIDTH_YD / 2 - 60 / 3, source: 'NCAA: hashes 60′ from each sideline (40′ apart)' },
  NFL: { id: 'NFL', label: 'Pro (NFL)', hashFromCenterYd: FIELD_WIDTH_YD / 2 - (70 + 9 / 12) / 3, source: 'NFL: hashes 70′9″ from each sideline (18′6″ apart)' },
});

export const HASH_LENGTH_YD = 2 / 3;
/** Number tops sit 9 yd in from the sideline; numerals 6 ft tall. */
export const NUMBER_TOP_FROM_SIDELINE_YD = 9;
export const NUMBER_HEIGHT_YD = 2;

export interface YardLineMark {
  /** Yards downfield from the LOS. */
  readonly yYd: number;
  /** Distance to the nearer goal line (0–50), or null for goal lines. */
  readonly number: number | null;
  readonly isGoalLine: boolean;
  /** Which way the direction arrow beside the number points (toward the nearer goal). */
  readonly towardOwnGoal: boolean;
}

export interface FieldLayout {
  readonly ownGoalYd: number;
  readonly oppGoalYd: number;
  readonly backLineOwnYd: number;
  readonly backLineOppYd: number;
  readonly fiveYardLines: readonly YardLineMark[];
  /** Every yard line that gets hash/side ticks (not multiples of 5). */
  readonly tickLines: readonly number[];
}

/** @param ballOnOwn ball's yard line measured from the offense's own goal line (1–99). */
export function fieldLayout(ballOnOwn: number): FieldLayout {
  const ownGoalYd = -ballOnOwn;
  const oppGoalYd = 100 - ballOnOwn;
  const fiveYardLines: YardLineMark[] = [];
  const tickLines: number[] = [];
  for (let fromOwn = 0; fromOwn <= 100; fromOwn++) {
    const yYd = ownGoalYd + fromOwn;
    if (fromOwn % 5 === 0) {
      const toNearer = Math.min(fromOwn, 100 - fromOwn);
      fiveYardLines.push({
        yYd,
        number: fromOwn % 10 === 0 && toNearer > 0 ? toNearer : null,
        isGoalLine: fromOwn === 0 || fromOwn === 100,
        towardOwnGoal: fromOwn < 50,
      });
    } else {
      tickLines.push(yYd);
    }
  }
  return {
    ownGoalYd, oppGoalYd,
    backLineOwnYd: ownGoalYd - END_ZONE_DEPTH_YD,
    backLineOppYd: oppGoalYd + END_ZONE_DEPTH_YD,
    fiveYardLines, tickLines,
  };
}

/** Canonical yards → Three.js world (1 unit = 1 yd, +Y up, offense attacks toward −Z). */
export const yardsToWorld = (xYd: number, yYd: number, height = 0): [number, number, number] => [xYd, height, -yYd];
/** Three.js world → canonical yards. Exact inverse of yardsToWorld on the ground plane. */
export const worldToYards = (x: number, z: number) => ({ xYd: x, yYd: -z });

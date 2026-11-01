// Football core: shared types. Coordinates are yards — x lateral from the ball (positive = offense's
// right), y from the line of scrimmage (positive = downfield, negative = offensive backfield).

export type Yards = { x: number; y: number };

export type Level = 'youth' | 'jv' | 'varsity';
export const LEVEL_ORDER: readonly Level[] = ['youth', 'jv', 'varsity'];

export type OffenseRole = 'LT' | 'LG' | 'C' | 'RG' | 'RT' | 'QB' | 'RB' | 'FB' | 'TE' | 'X' | 'Z' | 'H' | 'Y' | 'F';

export type Slot = 'strong-1' | 'strong-2' | 'strong-3' | 'weak-1' | 'weak-2' | 'weak-3' | 'back' | 'back-2' | 'qb';

export type Source = {
  title: string;
  publisher: string;
  url: string;
  /** YYYY-MM-DD */
  accessed: string;
  kind: 'association' | 'book' | 'college-pro' | 'coaching-education';
};

export type Verification =
  | { status: 'verified'; sources: Source[] }
  | { status: 'draft'; sources: Source[]; note: string }
  | { status: 'approved'; reviewer: string; date: string; sources: Source[] }
  | { status: 'rejected'; reviewer: string; date: string; reason: string };

export type FormationPlayer = { role: OffenseRole; at: Yards; onLine: boolean };

export type Formation = {
  id: string;
  name: string;
  personnel: '10' | '11' | '12' | '20' | '21';
  strength: 'left' | 'right';
  players: FormationPlayer[];
  levels: Level[];
  verification: Verification;
};

export type RouteId =
  | 'go' | 'seam' | 'sail' | 'flat' | 'arrow' | 'curl' | 'hitch'
  | 'corner' | 'stick' | 'snag' | 'drag' | 'out' | 'dig' | 'swing';

export type Assignment =
  | { slot: Slot; kind: 'route'; route: RouteId; depth?: number }
  | { slot: Slot; kind: 'protect' }
  | { slot: Slot; kind: 'block' };

export type ReadStep = { focus: string; text: string };

export type Concept = {
  id: string;
  name: string;
  minLevel: Level;
  assignments: Assignment[];
  read: ReadStep[];
  verification: Verification;
};

export type CoverageId = 'cover-0' | 'cover-1' | 'cover-2' | 'cover-3' | 'cover-4';

export type DefenderRole = 'DE-S' | 'DT-S' | 'NT' | 'DE-W' | 'SAM' | 'MIKE' | 'WILL' | 'CB-S' | 'CB-W' | 'SS' | 'FS';

export type Defender = { role: DefenderRole; at: Yards; deep: boolean };

export type Coverage = { id: CoverageId; name: string; deepDefenders: 0 | 1 | 2; verification: Verification };

export type Front = { id: string; name: string; verification: Verification };

export type Matchup = {
  concept: string;
  beats: CoverageId;
  stressedDefender: string;
  reason: string;
  verification: Verification;
};

export type Library = {
  formations: Formation[];
  concepts: Concept[];
  fronts: Front[];
  coverages: Coverage[];
  matchups: Matchup[];
};

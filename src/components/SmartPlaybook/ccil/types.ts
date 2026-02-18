/**
 * CCIL Types — Core Coach Intelligence Layer
 *
 * Canonical types used at the SmartPlaybook ↔ intelligence boundary.
 * These types decouple the playbook UI state from the analysis pipeline.
 */

// ── Canonical Play ──────────────────────────────────────────────────

export interface CanonicalPlayer {
  id: string;
  x: number;
  y: number;
  position: string;
  number?: number;
}

export interface CanonicalRoute {
  id: string;
  playerId: string;
  points: Array<{ x: number; y: number }>;
  type: string;
  color?: string;
}

/**
 * CanonicalPlay is the normalized representation of a SmartPlaybook play
 * that the intelligence layer consumes for analysis.
 */
export interface CanonicalPlay {
  players: CanonicalPlayer[];
  routes: CanonicalRoute[];
  phase: 'offense' | 'defense' | 'special_teams';
  playType: string;
  playName: string;
  fieldDimensions: { width: number; height: number };
  revision: number;
  timestamp: number;
}

// ── Intelligence Issue ──────────────────────────────────────────────

export type IssueSeverity = 'info' | 'warning' | 'critical';
export type IssueCategory =
  | 'alignment'
  | 'spacing'
  | 'route_conflict'
  | 'coverage_gap'
  | 'personnel'
  | 'formation'
  | 'general';

/**
 * IntelligenceIssue is the output of the CCIL analysis pipeline.
 * Each issue is a discrete finding about the current play state.
 */
export interface IntelligenceIssue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  title: string;
  description: string;
  affectedPlayerIds: string[];
  suggestion?: string;
}

// ── Analysis Result ─────────────────────────────────────────────────

export interface AnalysisResult {
  issues: IntelligenceIssue[];
  revision: number;
  analyzedAt: number;
  score: number; // 0–100, overall play quality heuristic
}

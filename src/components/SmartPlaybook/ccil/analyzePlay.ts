/**
 * analyzePlay — CCIL + OIM analysis pipeline entry point
 *
 * Runs heuristic checks against a CanonicalPlay and returns IntelligenceIssue[].
 * This is the integration surface; deeper OIM logic will be delegated to
 * modules/intelligence and modules/oim when they are built out.
 *
 * Current checks (heuristic, no ML):
 *   1. Empty field (no players)
 *   2. Missing routes for skill-position players
 *   3. Player spacing (too close = collision risk)
 *   4. Out-of-bounds players
 *   5. Route crossing conflicts
 *   6. Personnel count check
 */

import type {
  CanonicalPlay,
  IntelligenceIssue,
  AnalysisResult,
  IssueSeverity,
  IssueCategory,
} from './types';

let issueCounter = 0;

function makeIssue(
  severity: IssueSeverity,
  category: IssueCategory,
  title: string,
  description: string,
  affectedPlayerIds: string[] = [],
  suggestion?: string
): IntelligenceIssue {
  issueCounter += 1;
  return {
    id: `issue-${issueCounter}`,
    severity,
    category,
    title,
    description,
    affectedPlayerIds,
    suggestion,
  };
}

// ── Individual checks ───────────────────────────────────────────────

function checkEmptyField(play: CanonicalPlay): IntelligenceIssue[] {
  if (play.players.length === 0) {
    return [
      makeIssue(
        'info',
        'general',
        'Empty field',
        'No players on the field. Add players or load a formation to begin analysis.',
        [],
        'Load a formation template to get started.'
      ),
    ];
  }
  return [];
}

function checkPlayerSpacing(play: CanonicalPlay): IntelligenceIssue[] {
  const issues: IntelligenceIssue[] = [];
  const MIN_SPACING = 24; // pixels

  for (let i = 0; i < play.players.length; i++) {
    for (let j = i + 1; j < play.players.length; j++) {
      const a = play.players[i];
      const b = play.players[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MIN_SPACING) {
        issues.push(
          makeIssue(
            'warning',
            'spacing',
            'Players too close',
            `${a.position} #${a.number ?? '?'} and ${b.position} #${b.number ?? '?'} are only ${Math.round(dist)}px apart.`,
            [a.id, b.id],
            'Increase separation to avoid collision at the snap.'
          )
        );
      }
    }
  }
  return issues;
}

function checkOutOfBounds(play: CanonicalPlay): IntelligenceIssue[] {
  const issues: IntelligenceIssue[] = [];
  const { width, height } = play.fieldDimensions;
  const MARGIN = 10;

  for (const p of play.players) {
    if (p.x < MARGIN || p.x > width - MARGIN || p.y < MARGIN || p.y > height - MARGIN) {
      issues.push(
        makeIssue(
          'warning',
          'alignment',
          'Player near boundary',
          `${p.position} #${p.number ?? '?'} is at the edge of the field (${Math.round(p.x)}, ${Math.round(p.y)}).`,
          [p.id],
          'Move the player inward for a legal alignment.'
        )
      );
    }
  }
  return issues;
}

const SKILL_POSITIONS = new Set(['WR', 'TE', 'RB', 'FB']);

function checkMissingRoutes(play: CanonicalPlay): IntelligenceIssue[] {
  if (play.phase !== 'offense') return [];

  const issues: IntelligenceIssue[] = [];
  const playerIdsWithRoutes = new Set(play.routes.map(r => r.playerId));

  for (const p of play.players) {
    if (SKILL_POSITIONS.has(p.position) && !playerIdsWithRoutes.has(p.id)) {
      issues.push(
        makeIssue(
          'info',
          'route_conflict',
          'Missing route',
          `${p.position} #${p.number ?? '?'} has no assigned route.`,
          [p.id],
          'Draw a route for this player to complete the play design.'
        )
      );
    }
  }
  return issues;
}

function checkPersonnelCount(play: CanonicalPlay): IntelligenceIssue[] {
  const MAX_PLAYERS = 11;
  if (play.players.length > MAX_PLAYERS) {
    return [
      makeIssue(
        'critical',
        'personnel',
        'Too many players',
        `${play.players.length} players on the field (max ${MAX_PLAYERS}).`,
        play.players.slice(MAX_PLAYERS).map(p => p.id),
        'Remove extra players to comply with rules.'
      ),
    ];
  }
  return [];
}

function checkRouteCrossings(play: CanonicalPlay): IntelligenceIssue[] {
  if (play.routes.length < 2) return [];

  const issues: IntelligenceIssue[] = [];
  // Simplified: check if any two routes share a close midpoint
  for (let i = 0; i < play.routes.length; i++) {
    for (let j = i + 1; j < play.routes.length; j++) {
      const rA = play.routes[i];
      const rB = play.routes[j];
      if (rA.points.length < 2 || rB.points.length < 2) continue;

      const midA = rA.points[Math.floor(rA.points.length / 2)];
      const midB = rB.points[Math.floor(rB.points.length / 2)];
      const dx = midA.x - midB.x;
      const dy = midA.y - midB.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 20) {
        issues.push(
          makeIssue(
            'warning',
            'route_conflict',
            'Route crossing detected',
            'Two routes converge near the same point, risking a pick or collision.',
            [rA.playerId, rB.playerId],
            'Stagger timing or adjust route paths to create separation.'
          )
        );
      }
    }
  }
  return issues;
}

// ── Main analysis entry point ───────────────────────────────────────

/**
 * analyzePlay — Run the full CCIL heuristic pipeline on a CanonicalPlay.
 * Returns an AnalysisResult containing all IntelligenceIssues and a score.
 */
export function analyzePlay(play: CanonicalPlay): AnalysisResult {
  // Reset counter per analysis run
  issueCounter = 0;

  const issues: IntelligenceIssue[] = [
    ...checkEmptyField(play),
    ...checkPlayerSpacing(play),
    ...checkOutOfBounds(play),
    ...checkMissingRoutes(play),
    ...checkPersonnelCount(play),
    ...checkRouteCrossings(play),
  ];

  // Compute score: start at 100, deduct per issue severity
  const DEDUCTIONS: Record<string, number> = {
    critical: 25,
    warning: 10,
    info: 3,
  };

  let score = 100;
  for (const issue of issues) {
    score -= DEDUCTIONS[issue.severity] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  return {
    issues,
    revision: play.revision,
    analyzedAt: Date.now(),
    score,
  };
}

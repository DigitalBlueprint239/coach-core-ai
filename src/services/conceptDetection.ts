import { EnginePlay, ConceptDetectionResult, FootballRouteId } from '../types/playbook';
import { getAllConcepts } from './conceptService';

/**
 * Analyzes the routes assigned to players in a play and identifies
 * which passing concept(s) are present.
 *
 * Returns an array sorted by confidence (exact matches first).
 * Returns empty array if no concept is detected.
 *
 * Disambiguation is handled by evaluating concepts in priority order
 * (lower priority number = evaluated first). Once a concept is matched
 * as 'exact', lower-priority concepts that share the same routes are
 * still returned but ranked lower.
 */
export function detectConcepts(play: EnginePlay): ConceptDetectionResult[] {
  if (!play || !play.players || play.players.length === 0) {
    return [];
  }

  // Collect all assigned routes
  const assignedRoutes: FootballRouteId[] = play.players
    .filter((p) => p.assignedRoute)
    .map((p) => p.assignedRoute!);

  if (assignedRoutes.length === 0) {
    return [];
  }

  const concepts = getAllConcepts();
  // Sort by priority ascending (lower = higher priority = checked first)
  const sorted = [...concepts].sort((a, b) => a.priority - b.priority);

  const results: ConceptDetectionResult[] = [];

  for (const concept of sorted) {
    const matchResult = matchConcept(assignedRoutes, concept.requiredRoutes, concept.minMatchCount);

    if (matchResult.matched) {
      results.push({
        conceptId: concept.id,
        conceptName: concept.name,
        coverageBeaters: concept.coverageBeaters,
        confidence: matchResult.confidence,
        matchedRoutes: matchResult.matchedRoutes,
        coachingCue: concept.coachingCue,
      });
    }
  }

  // Sort: exact first, then partial; within same confidence, keep priority order
  results.sort((a, b) => {
    if (a.confidence === 'exact' && b.confidence === 'partial') return -1;
    if (a.confidence === 'partial' && b.confidence === 'exact') return 1;
    return 0;
  });

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MatchResult {
  matched: boolean;
  confidence: 'exact' | 'partial';
  matchedRoutes: string[];
}

/**
 * Checks whether `assignedRoutes` contains the routes required by a concept.
 * Handles duplicate required routes (e.g., mesh needs 2 drags).
 */
function matchConcept(
  assignedRoutes: FootballRouteId[],
  requiredRoutes: FootballRouteId[],
  minMatchCount: number,
): MatchResult {
  // Build a frequency map of assigned routes
  const available = new Map<string, number>();
  for (const r of assignedRoutes) {
    available.set(r, (available.get(r) ?? 0) + 1);
  }

  // Try to match each required route
  const remaining = new Map(available);
  const matchedRoutes: string[] = [];

  for (const req of requiredRoutes) {
    const count = remaining.get(req) ?? 0;
    if (count > 0) {
      remaining.set(req, count - 1);
      matchedRoutes.push(req);
    }
  }

  const totalRequired = requiredRoutes.length;
  const matchCount = matchedRoutes.length;

  if (matchCount >= totalRequired) {
    return { matched: true, confidence: 'exact', matchedRoutes };
  }

  if (matchCount >= minMatchCount) {
    return { matched: true, confidence: 'partial', matchedRoutes };
  }

  return { matched: false, confidence: 'partial', matchedRoutes: [] };
}

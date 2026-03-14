import { EnginePlay, CoverageShell } from '../types/playbook';
import { detectConcepts } from './conceptDetection';
import { getAllConcepts } from './conceptService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlayRecommendation {
  play: EnginePlay;
  detectedConcept: string;
  coverageBeaterScore: number; // 0–100
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Given a coach's playbook and a selected defensive coverage,
 * returns plays ranked by how effectively they attack that coverage.
 *
 * Works entirely offline — no AI proxy required.
 */
export function getPlaysVsCoverage(
  plays: EnginePlay[],
  coverage: CoverageShell,
): PlayRecommendation[] {
  if (!plays || plays.length === 0) return [];

  return plays
    .map((play) => scorePlayVsCoverage(play, coverage))
    .filter((result) => result.coverageBeaterScore > 0)
    .sort((a, b) => b.coverageBeaterScore - a.coverageBeaterScore);
}

function scorePlayVsCoverage(
  play: EnginePlay,
  coverage: CoverageShell,
): PlayRecommendation {
  const detected = detectConcepts(play);

  if (detected.length === 0) {
    return { play, detectedConcept: 'None', coverageBeaterScore: 0, reasoning: '' };
  }

  const best = detected[0]; // highest confidence match
  const allConcepts = getAllConcepts();
  const conceptData = allConcepts.find((c) => c.id === best.conceptId);

  const isDirectBeater = conceptData?.coverageBeaters?.includes(coverage) ?? false;
  const isWeakAgainst = conceptData?.weakVs?.includes(coverage) ?? false;

  let score: number;
  if (isDirectBeater) {
    score = best.confidence === 'exact' ? 100 : 90;
  } else if (!isWeakAgainst) {
    score = 40;
  } else {
    score = 0;
  }

  const reasoning = isDirectBeater
    ? conceptData?.coachingCue ?? `${best.conceptName} attacks ${coverage}`
    : '';

  return { play, detectedConcept: best.conceptName, coverageBeaterScore: score, reasoning };
}

/**
 * All supported coverage shells for the UI dropdown.
 */
export const COVERAGE_SHELLS: { id: CoverageShell; label: string }[] = [
  { id: 'cover_0', label: 'Cover 0' },
  { id: 'cover_1', label: 'Cover 1' },
  { id: 'cover_2', label: 'Cover 2' },
  { id: 'tampa_2', label: 'Tampa 2' },
  { id: 'cover_3', label: 'Cover 3' },
  { id: 'cover_4', label: 'Cover 4' },
  { id: 'cover_6', label: 'Cover 6' },
  { id: 'man_coverage', label: 'Man Coverage' },
];

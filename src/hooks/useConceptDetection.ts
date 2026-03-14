import { useMemo } from 'react';
import { ConceptDetectionResult, EnginePlay } from '../types/playbook';
import { detectConcepts } from '../services/conceptDetection';

/**
 * Pure derived-state hook: detects passing concepts from a play.
 * Never writes to context, never triggers history.
 */
export function useConceptDetection(play: EnginePlay | null): ConceptDetectionResult[] {
  return useMemo(() => {
    if (!play) return [];
    return detectConcepts(play);
  }, [play]);
}

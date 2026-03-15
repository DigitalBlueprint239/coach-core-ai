/**
 * useConceptDetection — React hook that defers concept detection to avoid
 * blocking the UI during player drag operations.
 *
 * Uses useDeferredValue so detection runs after drag completes, not during
 * every intermediate move event.
 */

import { useMemo, useDeferredValue } from 'react';
import { detectConcepts, DetectedConcept } from '../services/conceptDetection';
import type { Play } from '../services/firestore';

export function useConceptDetection(play: Play | null): DetectedConcept[] {
  // Defer the play value — React will use the stale value during urgent updates
  // (like drag) and only run detection after the UI settles.
  const deferredPlay = useDeferredValue(play);

  return useMemo(() => {
    if (!deferredPlay) return [];
    return detectConcepts(deferredPlay);
  }, [deferredPlay]);
}

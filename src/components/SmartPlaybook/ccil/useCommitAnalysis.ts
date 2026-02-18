/**
 * useCommitAnalysis — React hook for commit-triggered CCIL analysis
 *
 * This hook owns the `analysisRevision` counter and exposes a `commit()`
 * wrapper. Each call to `commit()` increments the revision, which triggers
 * a memoised re-run of the canonical adapter + analyzePlay pipeline.
 *
 * Usage in SmartPlaybook:
 *   const { commit, analysisResult, analysisRevision } = useCommitAnalysis(
 *     players, routes, currentPlayPhase, currentPlayType, currentPlayName
 *   );
 *
 *   // Wrap every state-mutating handler:
 *   saveToUndoStack('add_player');
 *   setPlayers(prev => addPlayer(prev, newPlayer));
 *   commit();   // ← triggers analysis re-run
 */

import { useState, useMemo, useCallback } from 'react';
import { toCanonicalPlay } from './canonicalAdapter';
import { analyzePlay } from './analyzePlay';
import type { AnalysisResult } from './types';

const FIELD_DIMENSIONS = { width: 600, height: 300 };

interface UseCommitAnalysisOptions {
  players: Array<{
    id: string;
    x: number;
    y: number;
    position: string;
    number?: number;
    selected?: boolean;
    createdAt?: string;
  }>;
  routes: Array<{
    id: string;
    playerId: string;
    points: Array<{ x: number; y: number }>;
    type: string;
    color?: string;
    createdAt?: string;
  }>;
  phase: string;
  playType: string;
  playName: string;
}

export function useCommitAnalysis({
  players,
  routes,
  phase,
  playType,
  playName,
}: UseCommitAnalysisOptions) {
  const [analysisRevision, setAnalysisRevision] = useState(0);

  /**
   * commit() — call after every state mutation that should trigger analysis.
   * Increments the revision counter, causing the memoised analysis to re-run.
   */
  const commit = useCallback(() => {
    setAnalysisRevision(prev => prev + 1);
  }, []);

  /**
   * Memoised canonical play conversion.
   * Re-runs when analysisRevision changes (not on every render).
   */
  const canonicalPlay = useMemo(
    () =>
      toCanonicalPlay({
        players,
        routes,
        phase,
        playType,
        playName,
        fieldDimensions: FIELD_DIMENSIONS,
        revision: analysisRevision,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysisRevision]
  );

  /**
   * Memoised analysis result. Depends only on the canonical play reference,
   * which itself depends on analysisRevision.
   */
  const analysisResult: AnalysisResult = useMemo(
    () => analyzePlay(canonicalPlay),
    [canonicalPlay]
  );

  return {
    commit,
    analysisRevision,
    analysisResult,
    canonicalPlay,
  };
}

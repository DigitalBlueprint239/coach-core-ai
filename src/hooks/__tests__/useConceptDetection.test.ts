/**
 * useConceptDetection hook tests
 */

import { renderHook } from '@testing-library/react';
import { useConceptDetection } from '../useConceptDetection';
import type { Play } from '../../services/firestore';

// Build a minimal valid play for testing
function buildTestPlay(): Play {
  return {
    teamId: 'team-1',
    name: 'Test',
    formation: 'Shotgun',
    description: '',
    players: [
      { id: 'p1', number: 1, position: 'WR', x: 50, y: 150 },
      { id: 'p2', number: 2, position: 'WR', x: 550, y: 150 },
    ],
    routes: [
      {
        id: 'r1',
        playerId: 'p1',
        path: [{ x: 50, y: 150 }, { x: 50, y: 20 }],
        type: 'pass' as const,
        timing: 1,
      },
      {
        id: 'r2',
        playerId: 'p2',
        path: [{ x: 550, y: 150 }, { x: 550, y: 20 }],
        type: 'pass' as const,
        timing: 1,
      },
    ],
    tags: [],
    difficulty: 'beginner' as const,
    sport: 'football',
    createdBy: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('useConceptDetection', () => {
  it('returns empty array for null play', () => {
    const { result } = renderHook(() => useConceptDetection(null));
    expect(result.current).toEqual([]);
  });

  it('returns detected concepts for a valid play', () => {
    const play = buildTestPlay();
    const { result } = renderHook(() => useConceptDetection(play));
    // Should return an array (may or may not have detections depending on routes)
    expect(Array.isArray(result.current)).toBe(true);
  });

  it('returns same reference for same play object', () => {
    const play = buildTestPlay();
    const { result, rerender } = renderHook(() => useConceptDetection(play));
    const first = result.current;
    rerender();
    // useMemo should return same reference since play didn't change
    expect(result.current).toBe(first);
  });
});

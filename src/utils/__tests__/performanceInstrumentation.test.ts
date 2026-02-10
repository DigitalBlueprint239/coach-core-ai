import { describe, expect, it, vi, beforeEach } from 'vitest';
import { clearScreenTimings, completeScreenRenderTiming, getRecentScreenTimings, startScreenRenderTiming } from '../performanceInstrumentation';

describe('performanceInstrumentation', () => {
  beforeEach(() => {
    clearScreenTimings();
    vi.restoreAllMocks();
  });

  it('records and returns render timings', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(35);
    const marker = startScreenRenderTiming('practice');
    completeScreenRenderTiming(marker);

    const results = getRecentScreenTimings();
    expect(results).toHaveLength(1);
    expect(results[0].screen).toBe('practice');
    expect(results[0].durationMs).toBe(25);
  });
});

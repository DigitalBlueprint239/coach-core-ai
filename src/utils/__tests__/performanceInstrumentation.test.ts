import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  classifyTiming,
  clearScreenTimings,
  completeScreenRenderTiming,
  getRecentScreenTimings,
  startScreenRenderTiming,
  getTargetForScreen
} from '../performanceInstrumentation';

describe('performanceInstrumentation', () => {
  beforeEach(() => {
    clearScreenTimings();
    vi.restoreAllMocks();
  });

  it('records and returns render timings with status', () => {
    vi.spyOn(performance, 'now').mockReturnValueOnce(10).mockReturnValueOnce(35);
    const marker = startScreenRenderTiming('practice');
    const result = completeScreenRenderTiming(marker);

    const results = getRecentScreenTimings();
    expect(results).toHaveLength(1);
    expect(results[0].screen).toBe('practice');
    expect(results[0].durationMs).toBe(25);
    expect(result.status).toBe('green');
  });

  it('classifies thresholds as green/yellow/red', () => {
    expect(classifyTiming(300, 300)).toBe('green');
    expect(classifyTiming(360, 300)).toBe('yellow');
    expect(classifyTiming(400, 300)).toBe('red');
  });

  it('includes season health target timing', () => {
    expect(getTargetForScreen('season-health')).toBe(350);
  });
});

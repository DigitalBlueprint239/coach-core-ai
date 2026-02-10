import { describe, expect, it, vi } from 'vitest';
import { persistValidatedPracticePlan } from '../persistence';

const validPlan = {
  title: 'Plan',
  whyThisPlan: 'Because constraints',
  segments: Array.from({ length: 4 }).map((_, i) => ({
    id: `s${i + 1}`,
    minutes: 10,
    setup: 'Warmup',
    coachingPoints: ['A'],
    variations: ['B']
  }))
};

describe('practice plan persistence safety', () => {
  it('does not persist invalid plans', () => {
    const setItem = vi.fn();
    const ok = persistValidatedPracticePlan({ title: 'x', segments: [] } as any, { source: 'test' }, { setItem } as any);
    expect(ok).toBe(false);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('persists valid plans with metadata', () => {
    const setItem = vi.fn();
    const ok = persistValidatedPracticePlan(validPlan as any, { source: 'test' }, { setItem } as any);
    expect(ok).toBe(true);
    expect(setItem).toHaveBeenCalledTimes(1);
  });
});

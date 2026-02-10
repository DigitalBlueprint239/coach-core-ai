import { env } from '../config/env';
export interface ScreenTiming {
  screen: string;
  durationMs: number;
  recordedAt: number;
}

const MAX_TIMINGS = 50;
const timings: ScreenTiming[] = [];

export interface ScreenTimingMarker {
  screen: string;
  startedAt: number;
}

export const startScreenRenderTiming = (screen: string): ScreenTimingMarker => ({
  screen,
  startedAt: performance.now()
});

export const completeScreenRenderTiming = (marker: ScreenTimingMarker): ScreenTiming => {
  const entry: ScreenTiming = {
    screen: marker.screen,
    durationMs: Math.max(0, performance.now() - marker.startedAt),
    recordedAt: Date.now()
  };

  timings.unshift(entry);
  if (timings.length > MAX_TIMINGS) timings.length = MAX_TIMINGS;

  if (typeof window !== 'undefined') {
    (window as any).__coachCoreTimings = timings;
  }

  if (env.DEV) {
    console.info('[perf]', entry.screen, `${entry.durationMs.toFixed(1)}ms`);
  }

  return entry;
};

export const getRecentScreenTimings = (): ScreenTiming[] => [...timings];

export const clearScreenTimings = (): void => {
  timings.length = 0;
};

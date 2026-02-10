import { env } from '../config/env';

export interface ScreenTiming {
  screen: string;
  durationMs: number;
  recordedAt: number;
  status: 'green' | 'yellow' | 'red';
  targetMs: number;
}

const MAX_TIMINGS = 50;
const timings: ScreenTiming[] = [];

const TARGETS: Record<string, number> = {
  schedule: 300,
  chat: 300,
  practice: 350
};

export interface ScreenTimingMarker {
  screen: string;
  startedAt: number;
}

export const getTargetForScreen = (screen: string): number => TARGETS[screen] ?? 350;

export const classifyTiming = (durationMs: number, targetMs: number): 'green' | 'yellow' | 'red' => {
  if (durationMs <= targetMs) return 'green';
  if (durationMs <= targetMs * 1.25) return 'yellow';
  return 'red';
};

export const startScreenRenderTiming = (screen: string): ScreenTimingMarker => ({
  screen,
  startedAt: performance.now()
});

export const completeScreenRenderTiming = (marker: ScreenTimingMarker): ScreenTiming => {
  const targetMs = getTargetForScreen(marker.screen);
  const durationMs = Math.max(0, performance.now() - marker.startedAt);
  const entry: ScreenTiming = {
    screen: marker.screen,
    durationMs,
    recordedAt: Date.now(),
    status: classifyTiming(durationMs, targetMs),
    targetMs
  };

  timings.unshift(entry);
  if (timings.length > MAX_TIMINGS) timings.length = MAX_TIMINGS;

  if (typeof window !== 'undefined') {
    (window as any).__coachCoreTimings = timings;
  }

  if (env.DEV) {
    console.info('[perf]', entry.screen, `${entry.durationMs.toFixed(1)}ms`, entry.status);
  }

  return entry;
};

export const getRecentScreenTimings = (): ScreenTiming[] => [...timings];

export const clearScreenTimings = (): void => {
  timings.length = 0;
};

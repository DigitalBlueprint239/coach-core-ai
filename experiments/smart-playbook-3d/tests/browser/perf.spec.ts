import { test } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { enter3d, exit2d, open, probe, waitPhase } from './helpers';

/**
 * Measurement, not assertion: targets (warm p95 ≤ 600 ms, 60 FPS desktop, 30 FPS mobile)
 * are reported against what this machine actually does. Results go to test-results/perf-<project>.json.
 */
const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)];
};

test('measure transition latency and camera frame rate', async ({ page }, info) => {
  test.setTimeout(240_000);

  // Cold: no background prewarm, first ever entry creates the context and compiles shaders.
  await open(page, 'prewarm=0');
  await page.getByTestId('btn-3d').click();
  await waitPhase(page, '3d');
  const cold = (await probe<{ readyMs: number; totalMs: number }[]>(page, 'metrics'))[0];

  // Warm: prewarmed page, ten entries.
  await open(page);
  await page.waitForFunction(() => !!(window as unknown as { __sp3d: { rendererInfo(): unknown } }).__sp3d.rendererInfo(), null, { timeout: 15_000 });
  for (let i = 0; i < 10; i++) { await enter3d(page); await exit2d(page); }
  const all = await probe<{ kind: string; warm: boolean; readyMs: number; totalMs: number }[]>(page, 'metrics');
  const enters = all.filter(m => m.kind === 'enter' && m.warm);
  const exits = all.filter(m => m.kind === 'exit');

  await enter3d(page);
  const intervals = await probe<number[]>(page, 'benchmark', 4000);
  const renderer = await probe<Record<string, unknown>>(page, 'rendererInfo');
  const viewport = page.viewportSize();
  const dpr = await page.evaluate(() => window.devicePixelRatio);

  const fps = 1000 / (intervals.reduce((a, b) => a + b, 0) / intervals.length);
  const report = {
    project: info.project.name,
    emulated: info.project.name !== 'desktop',
    viewport, dpr, renderer,
    machine: 'Intel i5-3230M, Intel HD Graphics 4000, 6 GB RAM, Windows 10; Google Chrome (Playwright channel=chrome)',
    cold: { readyMs: cold.readyMs, totalMs: cold.totalMs },
    warmEnter: {
      n: enters.length,
      readyP50: pct(enters.map(m => m.readyMs), 50), readyP95: pct(enters.map(m => m.readyMs), 95),
      totalP50: pct(enters.map(m => m.totalMs), 50), totalP95: pct(enters.map(m => m.totalMs), 95),
    },
    exit: { n: exits.length, p50: pct(exits.map(m => m.totalMs), 50), p95: pct(exits.map(m => m.totalMs), 95) },
    orbit: {
      frames: intervals.length, meanFps: fps,
      frameMsP50: pct(intervals, 50), frameMsP95: pct(intervals, 95), frameMsMax: Math.max(...intervals),
    },
  };
  mkdirSync('test-results', { recursive: true });
  writeFileSync(`test-results/perf-${info.project.name}.json`, JSON.stringify(report, null, 2));
  info.annotations.push({ type: 'perf', description: JSON.stringify(report) });
  console.log(JSON.stringify(report, null, 2));
});

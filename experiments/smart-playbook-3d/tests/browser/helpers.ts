import { expect, type Page, type Request } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Probe = any;

export async function open(page: Page, query = '') {
  await page.goto(`/${query ? `?${query}` : ''}`);
  await page.waitForFunction(() => !!(window as Probe).__sp3d);
}

export const phase = (page: Page) => page.evaluate(() => (window as Probe).__sp3d.phase() as string);

export async function waitPhase(page: Page, p: string, timeout = 20_000) {
  await page.waitForFunction(x => (window as Probe).__sp3d.phase() === x, p, { timeout });
}

export async function enter3d(page: Page) {
  await page.getByTestId('btn-3d').click();
  await waitPhase(page, '3d');
}

export async function exit2d(page: Page) {
  await page.getByTestId('btn-2d').click();
  await waitPhase(page, '2d');
}

export const probe = <T>(page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as Probe).__sp3d[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;

/** Records every request; fails the test on any non-GET or non-loopback request. */
export function watchNetwork(page: Page) {
  const seen: { method: string; url: string }[] = [];
  page.on('request', (r: Request) => seen.push({ method: r.method(), url: r.url() }));
  return {
    seen,
    assertClean() {
      const writes = seen.filter(r => !['GET', 'HEAD'].includes(r.method));
      const remote = seen.filter(r => !/^(http:\/\/127\.0\.0\.1:5179\/|data:|blob:)/.test(r.url));
      expect(writes, 'no write requests').toEqual([]);
      expect(remote, 'no non-loopback requests').toEqual([]);
    },
  };
}

/** Decode a PNG screenshot in the page and return RGBA at the given CSS-pixel points (scaled for DPR). */
/** Pixel at each CSS point; with radius > 0, the most route-coloured (bluest) pixel within ±radius device px. */
export async function samplePixels(page: Page, png: Buffer, points: { x: number; y: number }[], scale: number, radius = 0) {
  return page.evaluate(async ([b64, pts, s, rad]) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const r = rad as number;
    return (pts as { x: number; y: number }[]).map(p => {
      const d = ctx.getImageData(Math.round(p.x * (s as number)) - r, Math.round(p.y * (s as number)) - r, 2 * r + 1, 2 * r + 1).data;
      let best = 0;
      for (let i = 4; i < d.length; i += 4) if (d[i + 2] > d[best + 2]) best = i;
      return Array.from(d.slice(best, best + 4));
    });
  }, [png.toString('base64'), points, scale, radius] as const);
}

/** Mean absolute per-channel difference (0–255) between two equally sized PNGs, computed in the page. */
export async function meanPixelDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([x, y]) => {
    const load = async (b64: string) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    };
    const [da, db] = await Promise.all([load(x as string), load(y as string)]);
    let sum = 0, big = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
      sum += d;
      if (d > 48) big++;
    }
    const n = da.length / 4;
    return { mean: sum / n, fractionOver48: big / n };
  }, [a.toString('base64'), b.toString('base64')] as const);
}

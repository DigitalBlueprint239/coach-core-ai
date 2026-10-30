import { expect, test } from '@playwright/test';
import { enter3d, exit2d, meanPixelDiff, open, phase, probe, samplePixels, waitPhase, watchNetwork, type Probe } from './helpers';

interface StoredEnv { key: string; play: { players: { id: string; x: number; y: number }[] } }

test.describe('2D ⇄ 3D Smart Playbook transition', () => {
  test('opens in the 2D editor with verified geometry and the experiment label', async ({ page }) => {
    const net = watchNetwork(page);
    await open(page);
    expect(await phase(page)).toBe('2d');
    await expect(page.getByTestId('field-2d')).toBeVisible();
    await expect(page.getByTestId('geometry-status')).toHaveText('GEOMETRY VERIFIED');
    await expect(page.getByTestId('experiment-chip')).toContainText('EXPERIMENT ONLY');
    await expect(page.getByTestId('btn-3d')).toBeEnabled();
    net.assertClean();
  });

  test('matched overhead puts every 3D player on its 2D pixel, then lifts', async ({ page }, info) => {
    await open(page, 'hold=1');
    const stage = page.getByTestId('stage');
    await page.waitForTimeout(600);
    const before = await stage.screenshot();
    await page.getByTestId('btn-3d').click();
    await waitPhase(page, 'handoff-in');
    await page.waitForTimeout(450); // let the 2D layer finish fading out
    const after = await stage.screenshot();

    const envs = JSON.parse(await probe<string>(page, 'draftJson')) as StoredEnv[];
    const width = (await page.getByTestId('field-2d').boundingBox())!.width;
    const scale = width / 600;
    let worstPx = 0;
    for (const env of envs) {
      for (const p of env.play.players) {
        const s = await probe<{ x: number; y: number }>(page, 'projectToScreen', `${env.key}/${p.id}`);
        worstPx = Math.max(worstPx, Math.abs(s.x - p.x * scale), Math.abs(s.y - p.y * scale));
      }
    }
    const worstYd = worstPx / scale / 10;
    const diff = await meanPixelDiff(page, before, after);
    info.annotations.push({ type: 'alignment', description: `worst ${worstPx.toFixed(3)} css px = ${worstYd.toFixed(4)} yd; pixel diff mean ${diff.mean.toFixed(2)}/255, ${(diff.fractionOver48 * 100).toFixed(2)}% px > 48` });
    expect(worstYd).toBeLessThanOrEqual(0.01);
    // Same picture: lines, markers and labels coincide; only rasterisation differs.
    expect(diff.mean).toBeLessThan(6);
    expect(diff.fractionOver48).toBeLessThan(0.02);

    await probe(page, 'release');
    await waitPhase(page, '3d');
    const pose = await probe<{ polar: number }>(page, 'pose');
    expect(pose.polar).toBeGreaterThan(0.8);
  });

  test('ten 2D→3D→2D round trips leave the play, ids and coordinates untouched with no writes or leaks', async ({ page }, info) => {
    test.setTimeout(180_000);
    const net = watchNetwork(page);
    await open(page);
    const fp = await probe<string>(page, 'fingerprint');
    const json = await probe<string>(page, 'draftJson');
    const players = await probe<unknown[]>(page, 'scenePlayers');
    let firstInfo: { geometries: number; textures: number } | null = null;
    for (let i = 0; i < 10; i++) {
      await enter3d(page);
      if (i % 3 === 1) await page.getByTestId('preset-sideline').click();
      if (i % 3 === 2) await page.getByRole('button', { name: 'QB', exact: true }).click();
      await exit2d(page);
      // Baseline once every view has been seen (objects upload to the GPU when first in frustum).
      if (i === 2) firstInfo = await probe(page, 'rendererInfo');
    }
    expect(await probe<string>(page, 'fingerprint')).toBe(fp);
    expect(await probe<string>(page, 'draftJson')).toBe(json);
    expect(await probe<unknown[]>(page, 'scenePlayers')).toEqual(players);
    await expect(page.getByTestId('round-trips')).toHaveText('10');
    await expect(page.getByTestId('dirty')).toHaveText('Unchanged since load');
    expect(await probe<unknown[]>(page, 'writes')).toEqual([]);
    const lastInfo = await probe<{ geometries: number; textures: number }>(page, 'rendererInfo');
    info.annotations.push({ type: 'gpu-memory', description: `after 3 trips ${JSON.stringify(firstInfo)}; after 10 trips ${JSON.stringify(lastInfo)}` });
    expect(lastInfo.geometries).toBeLessThanOrEqual(firstInfo!.geometries);
    expect(lastInfo.textures).toBeLessThanOrEqual(firstInfo!.textures);
    net.assertClean();
  });

  test('reverses smoothly from mid-lift (cancelable motion) without touching data', async ({ page }) => {
    await open(page);
    const fp = await probe<string>(page, 'fingerprint');
    await page.getByTestId('btn-3d').click();
    await waitPhase(page, 'lifting');
    await page.keyboard.press('Escape');
    await waitPhase(page, '2d');
    expect(await probe<string>(page, 'fingerprint')).toBe(fp);
  });

  test('orbit, zoom and camera presets change only the camera', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'mouse orbit covered on desktop; touch has its own test');
    await open(page);
    const fp = await probe<string>(page, 'fingerprint');
    await enter3d(page);
    const box = (await page.getByTestId('stage').boundingBox())!;
    const p0 = await probe<{ azimuth: number; r: number }>(page, 'pose');
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.45, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const p1 = await probe<{ azimuth: number; r: number }>(page, 'pose');
    expect(Math.abs(p1.azimuth - p0.azimuth)).toBeGreaterThan(0.1);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(700);
    const p2 = await probe<{ r: number }>(page, 'pose');
    expect(p2.r).toBeLessThan(p1.r);
    await page.getByTestId('preset-sideline').click();
    await page.waitForFunction(() => !(window as Probe).__sp3d.pose() || Math.abs((window as Probe).__sp3d.pose().azimuth - Math.PI / 2) < 0.02);
    await page.getByTestId('preset-overhead').click();
    await page.waitForFunction(() => (window as Probe).__sp3d.pose().polar < 0.05);
    expect(await probe<string>(page, 'fingerprint')).toBe(fp);
  });

  test('selecting a player in 3D shows it in the inspector and survives the return to 2D', async ({ page }) => {
    await open(page);
    await enter3d(page);
    const s = await probe<{ x: number; y: number }>(page, 'projectToScreen', 'offense/off-QB');
    const canvasBox = (await page.locator('[data-testid=layer-3d] canvas').boundingBox())!;
    await page.mouse.click(canvasBox.x + s.x, canvasBox.y + s.y);
    await expect(page.getByTestId('inspector')).toContainText('QB');
    expect((await probe<{ selectedUid: string }>(page, 'view')).selectedUid).toBe('offense/off-QB');
    await exit2d(page);
    await expect(page.getByTestId('inspector')).toContainText('QB');
    expect((await probe<{ selectedUid: string }>(page, 'view')).selectedUid).toBe('offense/off-QB');
  });

  test('routes render at their fixture waypoints in 3D', async ({ page }, info) => {
    await open(page);
    await enter3d(page);
    await page.getByTestId('preset-overhead').click();
    await page.waitForFunction(() => (window as Probe).__sp3d.pose().polar < 0.05);
    await page.waitForTimeout(800);
    const routes = await probe<{ id: string; sourceKey: string; points: { xYd: number; yYd: number }[] }[]>(page, 'routes');
    expect(routes.map(r => r.id).sort()).toEqual(['r-h-seam', 'r-rb-swing', 'r-x-go', 'r-y-seam', 'r-z-curl']);
    expect(routes.find(r => r.id === 'r-rb-swing')!.sourceKey).toBe('path');
    // Sample the rendered colour on each route's first segment, at a point clear of every player marker.
    const players = await probe<{ xYd: number; yYd: number }[]>(page, 'scenePlayers');
    const pts = [];
    for (const r of routes) {
      const a = r.points[0], b = r.points[1];
      let at = { x: (a.xYd + b.xYd) / 2, y: (a.yYd + b.yYd) / 2 };
      for (let f = 0.25; f <= 0.8; f += 0.05) {
        const c = { x: a.xYd + (b.xYd - a.xYd) * f, y: a.yYd + (b.yYd - a.yYd) * f };
        if (players.every(p => Math.hypot(p.xYd - c.x, p.yYd - c.y) > 1.6)) { at = c; break; }
      }
      pts.push(await probe<{ x: number; y: number }>(page, 'projectYards', at.x, at.y));
    }
    const canvas = page.locator('[data-testid=layer-3d] canvas');
    const shot = await canvas.screenshot();
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    // ±1 device px: a ~3 px ribbon resampled from the canvas DPR (capped at 2) to the page DPR can shift by one pixel.
    const rgba = await samplePixels(page, shot, pts, dpr, 1);
    info.annotations.push({ type: 'route-pixels', description: JSON.stringify(rgba) });
    for (const [r, g, b] of rgba) {
      expect(b).toBeGreaterThan(150);
      expect(g).toBeGreaterThan(130);
      expect(r).toBeLessThan(120);
    }
  });

  test('resizing keeps the 3D canvas matched to the stage and alignment exact', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'viewport resize exercised on desktop');
    await open(page);
    await enter3d(page);
    await page.setViewportSize({ width: 900, height: 700 });
    await page.waitForTimeout(500);
    const stage = (await page.getByTestId('stage').boundingBox())!;
    const canvas = (await page.locator('[data-testid=layer-3d] canvas').boundingBox())!;
    expect(Math.abs(stage.width - canvas.width)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(stage.height - canvas.height)).toBeLessThanOrEqual(0.5);
    await exit2d(page);
    await page.goto('/?hold=1');
    await page.waitForFunction(() => !!(window as Probe).__sp3d);
    await page.getByTestId('btn-3d').click();
    await waitPhase(page, 'handoff-in');
    const width = (await page.getByTestId('field-2d').boundingBox())!.width;
    const s = await probe<{ x: number; y: number }>(page, 'projectToScreen', 'offense/off-X');
    expect(Math.abs(s.x - 120 * (width / 600))).toBeLessThan(0.5);
    expect(Math.abs(s.y - 190 * (width / 600))).toBeLessThan(0.5);
  });

  test('2D edits remain an unsaved draft across 3D visits and the 3D scene reflects them', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'pointer drag on desktop; keyboard edit covered below');
    await open(page);
    const canvas = (await page.getByTestId('field-2d').boundingBox())!;
    const k = canvas.width / 600;
    // Drag the RB (stored at 260,245) three yards to its right.
    await page.mouse.move(canvas.x + 260 * k, canvas.y + 245 * k);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 290 * k, canvas.y + 245 * k, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByTestId('dirty')).toHaveText('Edited · unsaved (in memory)');
    const edited = await probe<string>(page, 'fingerprint');
    const rb = (await probe<{ uid: string; xYd: number }[]>(page, 'scenePlayers')).find(p => p.uid === 'offense/off-RB')!;
    expect(rb.xYd).toBeGreaterThan(-1.5);
    for (let i = 0; i < 3; i++) { await enter3d(page); await exit2d(page); }
    expect(await probe<string>(page, 'fingerprint')).toBe(edited);
    await expect(page.getByTestId('dirty')).toHaveText('Edited · unsaved (in memory)');
    expect(await probe<unknown[]>(page, 'writes')).toEqual([]);
  });

  test('keyboard: V opens 3D, arrows orbit, number keys pick presets, Escape returns', async ({ page }) => {
    await open(page);
    await page.getByTestId('stage').focus();
    await page.keyboard.press('v');
    await waitPhase(page, '3d');
    await expect(page.getByTestId('stage')).toBeFocused();
    const a0 = (await probe<{ azimuth: number }>(page, 'pose')).azimuth;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(400);
    expect((await probe<{ azimuth: number }>(page, 'pose')).azimuth).toBeGreaterThan(a0 + 0.1);
    await page.keyboard.press('3');
    await page.waitForFunction(() => Math.abs((window as Probe).__sp3d.pose().azimuth - Math.PI / 2) < 0.02);
    await page.keyboard.press('Escape');
    await waitPhase(page, '2d');
    await expect(page.getByTestId('btn-3d')).toBeFocused();
    // Roster is reachable and operable from the keyboard.
    await page.getByRole('button', { name: 'Z', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('inspector')).toContainText('Z');
    // Keyboard nudge edits the draft by one yard.
    await page.getByTestId('stage').focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('dirty')).toHaveText('Edited · unsaved (in memory)');
  });

  test('touch: tap to enter 3D, one-finger drag orbits, tap selects', async ({ page, browserName, isMobile }) => {
    test.skip(!isMobile || browserName !== 'chromium', 'touch devices only');
    await open(page);
    await page.getByTestId('btn-3d').tap();
    await waitPhase(page, '3d');
    const box = (await page.getByTestId('stage').boundingBox())!;
    const a0 = (await probe<{ azimuth: number }>(page, 'pose')).azimuth;
    const inspector = page.getByTestId('inspector');
    const before = (await inspector.count()) ? await inspector.innerText() : null;
    const cdp = await page.context().newCDPSession(page);
    const x0 = box.x + box.width * 0.4, y = box.y + box.height * 0.5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + i * 12, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    expect(Math.abs((await probe<{ azimuth: number }>(page, 'pose')).azimuth - a0)).toBeGreaterThan(0.05);
    // An orbit drag that ends over a player must not select it.
    expect((await inspector.count()) ? await inspector.innerText() : null).toBe(before);
    await page.getByTestId('preset-tactical').tap();
    await page.waitForFunction(() => !(window as Probe).__sp3d.animating(), null, { timeout: 5000 });
    await page.waitForTimeout(150);
    const s = await probe<{ x: number; y: number }>(page, 'projectToScreen', 'offense/off-QB');
    const c = (await page.locator('[data-testid=layer-3d] canvas').boundingBox())!;
    await page.touchscreen.tap(c.x + s.x, c.y + s.y);
    await expect(page.getByTestId('inspector')).toContainText('QB');
  });

  test('narrow screens: no horizontal overflow and controls meet touch-target size', async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const id of ['btn-2d', 'btn-3d', 'preset-tactical', 'reduce-motion']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('replaces the camera move with a short dissolve: no intermediate camera poses', async ({ page }) => {
    await open(page);
    await expect(page.locator('.app')).toHaveAttribute('data-reduced-motion', 'true');
    // Sample the camera every animation frame during the transition.
    const samples = page.evaluate(() => new Promise<number[]>(resolve => {
      const polars: number[] = [];
      const start = performance.now();
      const tick = () => {
        const p = (window as Probe).__sp3d.pose();
        if (p && (window as Probe).__sp3d.phase() !== '2d') polars.push(p.polar);
        if ((window as Probe).__sp3d.phase() === '3d' || performance.now() - start > 6000) resolve(polars);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    await page.getByTestId('btn-3d').click();
    const polars = await samples;
    await waitPhase(page, '3d');
    const final = polars[polars.length - 1];
    expect(polars.every(p => Math.abs(p - final) < 1e-6)).toBe(true);
    const m = (await probe<{ totalMs: number }[]>(page, 'metrics')).at(-1)!;
    expect(m.totalMs).toBeLessThan(600);
    await page.keyboard.press('Escape');
    await waitPhase(page, '2d');
  });
});

test.describe('failure handling', () => {
  test('WebGL context loss returns to 2D intact and 3D can be reopened', async ({ page }) => {
    await open(page);
    const fp = await probe<string>(page, 'fingerprint');
    await enter3d(page);
    await probe(page, 'loseContext');
    await waitPhase(page, '2d');
    await expect(page.getByTestId('notice')).toContainText('graphics context was lost');
    expect(await probe<string>(page, 'fingerprint')).toBe(fp);
    await enter3d(page);
    expect(await probe<{ renderer: string } | null>(page, 'rendererInfo')).not.toBeNull();
    await exit2d(page);
    expect(await probe<string>(page, 'fingerprint')).toBe(fp);
  });

  test('ambiguous legacy play stays usable in 2D and 3D is withheld', async ({ page }) => {
    await open(page, 'scenario=legacy-ambiguous');
    await expect(page.getByTestId('geometry-status')).toHaveText('ALIGNMENT UNVERIFIED');
    await expect(page.getByTestId('btn-3d')).toBeDisabled();
    expect(await probe<unknown[]>(page, 'scenePlayers')).toEqual([]);
    await page.keyboard.press('v');
    await expect(page.getByTestId('notice')).toContainText('withheld');
    expect(await phase(page)).toBe('2d');
    await expect(page.getByTestId('warnings')).toContainText('coordinate profile unknown');
    // 2D remains a working editor on raw pixels.
    await page.getByRole('button', { name: 'QB', exact: true }).click();
    await expect(page.getByTestId('inspector')).toContainText('withheld — profile unknown');
  });

  test('classified legacy play opens in 3D but is never labelled verified', async ({ page }) => {
    await open(page, 'scenario=legacy-classified');
    await expect(page.getByTestId('geometry-status')).toContainText('CLASSIFIED');
    await enter3d(page);
    await expect(page.locator('.hud-warning')).toContainText('Classified alignment');
    await expect(page.getByTestId('geometry-status')).toHaveClass(/geo-classified/);
    await expect(page.getByTestId('geometry-status')).not.toHaveText('GEOMETRY VERIFIED');
    await exit2d(page);
  });
});

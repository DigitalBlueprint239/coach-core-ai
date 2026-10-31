// Visual evidence for CC-SP3D-002. Requires `npm run preview` on 127.0.0.1:5179.
// Usage: node scripts/capture-evidence.mjs <outDir>
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'evidence';
mkdirSync(out, { recursive: true });
const args = ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'];
const browser = await chromium.launch({ channel: 'chrome', args });
const base = 'http://127.0.0.1:5179';
const waitPhase = (page, p) => page.waitForFunction(x => window.__sp3d.phase() === x, p, { timeout: 20000 });

const targets = [
  { name: 'desktop', ctx: { viewport: { width: 1440, height: 900 } } },
  { name: 'tablet', ctx: { ...devices['iPad (gen 7) landscape'] } },
  { name: 'phone', ctx: { ...devices['Pixel 7'] } },
];

for (const t of targets) {
  const context = await browser.newContext(t.ctx);
  const page = await context.newPage();
  await page.goto(`${base}/?hold=1`);
  await page.waitForFunction(() => !!window.__sp3d);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/${t.name}-1-2d.png`, fullPage: t.name === 'phone' });
  await page.getByTestId('btn-3d').click();
  await waitPhase(page, 'handoff-in');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${t.name}-2-matched-overhead-3d.png`, fullPage: t.name === 'phone' });
  await page.evaluate(() => window.__sp3d.release());
  await waitPhase(page, '3d');
  await page.getByRole('button', { name: 'QB', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${t.name}-3-tactical-3d.png`, fullPage: t.name === 'phone' });
  if (t.name === 'desktop') {
    for (const p of ['sideline', 'defense']) {
      await page.getByTestId(`preset-${p}`).click();
      await page.waitForTimeout(1000);
      await page.getByTestId('stage').screenshot({ path: `${out}/desktop-4-${p}.png` });
    }
  }
  await context.close();
}

// Legacy policy screens.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/?scenario=legacy-ambiguous`);
  await page.waitForFunction(() => !!window.__sp3d);
  await page.keyboard.press('v');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/legacy-ambiguous-2d-3d-withheld.png` });
  await page.goto(`${base}/?scenario=legacy-classified`);
  await page.waitForFunction(() => !!window.__sp3d);
  await page.getByTestId('btn-3d').click();
  await waitPhase(page, '3d');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/legacy-classified-3d.png` });
  await page.close();
}

// Transition frame strip (no video: Playwright video needs a separate ffmpeg download).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 760 } });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForFunction(() => !!window.__sp3d && !!window.__sp3d.rendererInfo());
  await page.waitForTimeout(800);
  const frames = [];
  const stage = page.getByTestId('stage');
  await page.getByTestId('btn-3d').click();
  const t0 = Date.now();
  while (Date.now() - t0 < 1500) { frames.push(await stage.screenshot({ type: 'jpeg', quality: 70 })); }
  await waitPhase(page, '3d');
  await page.waitForTimeout(400);
  const box = await stage.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.46, { steps: 30 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.getByTestId('preset-sideline').click();
  await page.waitForTimeout(1100);
  await page.getByTestId('btn-2d').click();
  await waitPhase(page, '2d');
  await page.waitForTimeout(600);
  await context.close();

  // Contact sheet of the camera lift, assembled in a page canvas.
  const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const pick = frames.length <= 8 ? frames : Array.from({ length: 8 }, (_, i) => frames[Math.round((i * (frames.length - 1)) / 7)]);
  const png = await sheet.evaluate(async b64s => {
    const imgs = await Promise.all(b64s.map(async b => { const i = new Image(); i.src = `data:image/jpeg;base64,${b}`; await i.decode(); return i; }));
    const w = 640, h = Math.round((imgs[0].height / imgs[0].width) * w);
    const c = document.createElement('canvas'); c.width = w * 2 + 12; c.height = (h + 26) * Math.ceil(imgs.length / 2) + 6;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = '600 14px Segoe UI'; ctx.fillStyle = '#7deeff';
    imgs.forEach((im, i) => { const x = 4 + (i % 2) * (w + 4), y = 4 + Math.floor(i / 2) * (h + 26); ctx.drawImage(im, x, y + 20, w, h); ctx.fillText(`frame ${i + 1}/${imgs.length}`, x + 4, y + 15); });
    return c.toDataURL('image/png').split(',')[1];
  }, pick.map(f => f.toString('base64')));
  writeFileSync(`${out}/transition-frame-strip.png`, Buffer.from(png, 'base64'));
  console.log('frames captured:', frames.length);
}

await browser.close();
console.log('evidence written to', out);

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const { chromium, firefox } = require(process.env.COACH_CORE_PLAYWRIGHT_MODULE || path.join(root, 'e2e/node_modules/playwright'));
const output = path.resolve(process.argv[2] || __dirname);
fs.mkdirSync(output, { recursive: true });

(async () => {
  const results = [], failures = [];
  for (const [engine, browserType] of Object.entries({ chromium, firefox })) {
    const browser = await browserType.launch({ headless: true });
    for (const [name, width, height] of [['narrow-phone',320,740],['phone',375,812],['large-phone',430,932],['small-tablet',768,1024],['tablet',834,1112],['small-desktop',1024,900],['desktop-1280',1280,900],['desktop',1440,1000],['wide-desktop',1920,1080]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', serviceWorkers: 'block' });
      const page = await context.newPage(), errors = [], external = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1') { external.push(url.origin); return route.abort(); }
        return route.continue();
      });
      await page.goto('http://127.0.0.1:4317/');
      await page.getByRole('heading', { name: width < 768 ? 'Today' : 'My Week', exact: true }).waitFor();
      await page.getByText('Sample data · preview', { exact: true }).waitFor();
      const geometry = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right }; };
        return { viewport:innerWidth, page:document.documentElement.scrollWidth, main:rect('main'), calendar:rect('.cc-calendar-panel'), practice:rect('.cc-practice-panel'), today:rect('.cc-today-panel'), primary:rect('.cc-today-panel .cc-action-primary'), nav:rect('.cc-bottom-nav') };
      });
      assert.ok(geometry.page <= width, `${engine}/${name} page overflow`);
      if (width >= 768) {
        assert.ok(geometry.calendar.width >= geometry.main.width - 70, 'calendar spans main workspace');
        assert.ok(geometry.practice.y >= geometry.calendar.bottom, 'selected practice below calendar');
        assert.ok(await page.getByRole('region', { name:'Selected practice' }).isVisible());
        const selected = page.getByRole('region', { name:'Selected practice' });
        await assert.equal(await selected.getByText('Warm-up', { exact:true }).count(), 1);
        const target = page.locator('.cc-calendar-panel button').filter({ hasText:'Walk-through' });
        if (await target.count()) { await target.click(); await selected.getByRole('heading', { name:'Walk-through' }).waitFor(); }
        // Restore the initial selection for comparable review screenshots.
        await page.reload(); await page.getByText('Sample data · preview', { exact:true }).waitFor();
      } else {
        assert.ok(geometry.today.y < 220, 'Today next-practice card near top');
        assert.ok(geometry.primary.bottom < Math.min(geometry.nav.y, 620), 'primary action visible near top above navigation');
        assert.ok(await page.getByRole('region', { name:'Next practice' }).isVisible());
      }
      await page.addScriptTag({ path:path.join(root, 'node_modules/axe-core/axe.min.js') });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly:{ type:'tag',values:['wcag2a','wcag2aa','wcag21aa'] } })).violations.map(item => ({ id:item.id, impact:item.impact, nodes:item.nodes.map(node => node.target) })));
      if (violations.length) failures.push({ engine,name,violations });
      const targets = await page.locator('button').evaluateAll(nodes => nodes.filter(node => { const r = node.getBoundingClientRect();return r.width > 0 && r.height > 0 && r.height < 44; }).map(node => ({ text:node.innerText,height:node.getBoundingClientRect().height })));
      assert.deepEqual(targets, [], 'controls at least44px high');
      if (engine === 'chromium' && ['phone','tablet','desktop'].includes(name)) {
        await page.screenshot({ path:path.join(output, `${name}-${width}x${height}.png`) });
        await page.screenshot({ path:path.join(output, `${name}-full-page.png`),fullPage:true });
      }
      if (name === 'phone' || name === 'desktop') {
        const opener = page.getByRole('button', { name:'View practice preview',exact:true });
        await opener.click(); await page.getByRole('dialog', { name:'Team practice' }).waitFor();
        assert.ok(await page.locator('dialog').evaluate(node => node.contains(document.activeElement)), 'dialog focus');
        await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(), 0);
        assert.ok(await opener.evaluate(node => node === document.activeElement), 'return focus');
        await page.getByRole('button', { name:'Teams',exact:true }).click();
        await page.getByRole('heading', { name:'Visual preview only' }).waitFor();
        assert.ok(await page.locator('main').evaluate(node => node === document.activeElement), 'navigation main focus');
        await page.getByRole('button', { name:'Return to dashboard' }).click();
        await page.getByRole('checkbox', { name:'Check practice equipment' }).check();
        assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'sample storage isolation');
        await page.getByRole('button', { name:'Exit preview',exact:true }).click();
        assert.equal(await page.getByRole('checkbox').count(), 0);
        assert.equal(await page.getByText('Team practice', { exact:true }).count(), 0);
        if (engine === 'chromium') await page.screenshot({ path:path.join(output, `${name}-empty-${width}x${height}.png`),fullPage:true });
      }
      assert.deepEqual(errors, [], 'browser page errors');assert.deepEqual(external, [], 'external requests');
      results.push({ engine,version:browser.version(),name,width,height,geometry,axeViolations:violations.length,overflow:false,pageErrors:0,externalRequests:0 });
      console.log(`PASS ${engine} ${name} ${width}x${height}`);await context.close();
    }
    const page = await browser.newPage({ viewport:{ width:1440,height:1000 },reducedMotion:'reduce' });
    await page.goto('http://127.0.0.1:4317/');await page.keyboard.press('Tab');
    assert.ok(await page.locator('.cc-skip').evaluate(node => node === document.activeElement));
    await page.keyboard.press('Enter');assert.ok(await page.locator('main').evaluate(node => node === document.activeElement));
    assert.equal(await page.locator('.cc-action').first().evaluate(node => getComputedStyle(node).transitionDuration), '0s');
    results.push({ engine,keyboard:'PASS',reducedMotion:'PASS' });await browser.close();
  }
  fs.writeFileSync(path.join(output, 'fidelity-verification.json'), JSON.stringify({ results,failures,scope:'Shared-component local visual preview; no authenticated workflow or physical-device acceptance' },null,2));
  assert.deepEqual(failures, [], 'axe accessibility violations');console.log('Fidelity verification complete.');
})().catch(error => { console.error(error);process.exit(1); });

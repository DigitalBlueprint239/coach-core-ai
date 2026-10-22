// Owned A0 browser checks. Does not modify or run the accepted core matrix.
const { chromium, firefox } = require('../../e2e/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'); const path = require('node:path');
const out = process.env.A0_EVIDENCE_DIR || '/tmp/coach-core-film-a0-evidence'; fs.mkdirSync(out, { recursive: true });
const base = 'http://localhost:4210';
const key = 'coach-core:film-a0:synthetic-out-route-v1';
const sample = require('../../src/features/film-analyzer/demo/sample.json');
const stored = JSON.stringify({ version: 1, sampleId: sample.id, sampleHashes: sample.files.map(f => f.sha256), startMs: 3500, endMs: 6000, label: 'Out route', note: 'Break toward the sideline.' });
const results = []; let build = null;
async function cue(page) {
  await page.getByLabel('Interval start seconds').fill('3.5'); await page.getByLabel('Interval end seconds').fill('6');
  await page.getByLabel('Coaching label').fill('Out route'); await page.getByLabel('Coaching note').fill('Break toward the sideline.');
}
async function ready(page) {
  await page.goto(base); await page.getByText('Sample bytes and duration verified.', { exact: false }).waitFor();
}
async function unsaved(page) {
  assert.match(await page.getByTestId('save-status').innerText(), /^Not saved/);
}
const cases = {
  async 'complete-playback-save-reopen-reset'(page) {
    await ready(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('video').currentTime > .25);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByLabel('Playback speed').selectOption('2');
    assert.equal(await page.locator('video').evaluate(v => v.playbackRate), 2);
    await page.getByLabel('Seek video').fill('3.5'); await page.getByRole('button', { name: 'Mark start here' }).click();
    await page.getByLabel('Seek video').fill('6'); await page.getByRole('button', { name: 'Mark end here' }).click();
    assert.equal(await page.getByLabel('Interval start seconds').inputValue(), '3.5');
    assert.equal(await page.getByLabel('Interval end seconds').inputValue(), '6');
    await page.getByLabel('Coaching label').fill('Out route'); await page.getByLabel('Coaching note').fill('Break toward the sideline.');
    await page.getByRole('button', { name: 'Replay interval' }).click();
    await page.waitForFunction(() => { const v = document.querySelector('video'); return v.paused && Math.abs(v.currentTime - 6) < .08; });
    await page.getByRole('button', { name: 'Save in this browser' }).click();
    assert.match(await page.getByTestId('save-status').innerText(), /^Saved in this browser/);
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), stored);
    await page.screenshot({ path: path.join(out, `${page.engineName}-saved.png`), fullPage: true });
    await page.reload(); await page.getByText('Sample bytes and duration verified.', { exact: false }).waitFor();
    assert.equal(await page.getByLabel('Coaching label').inputValue(), 'Out route');
    assert.equal(await page.getByLabel('Coaching note').inputValue(), 'Break toward the sideline.');
    assert.equal(await page.getByLabel('Interval start seconds').inputValue(), '3.5');
    assert.equal(await page.getByLabel('Interval end seconds').inputValue(), '6');
    assert.match(await page.getByTestId('save-status').innerText(), /^Saved in this browser/);
    await page.getByLabel('Coaching note').fill('Changed session cue'); await unsaved(page);
    await page.evaluate(() => localStorage.setItem('a0-unrelated', 'keep'));
    await page.getByRole('button', { name: 'Reset local demo' }).click();
    assert.match(await page.getByTestId('save-status').innerText(), /^Reset confirmed/);
    assert.equal(await page.evaluate(k => localStorage.getItem(k), key), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('a0-unrelated')), 'keep');
    await page.reload(); assert.equal(await page.getByLabel('Coaching label').inputValue(), '');
  },
  async 'storage-access-denied-session-still-works'(page) {
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } }));
    await ready(page); await cue(page); await page.getByRole('button', { name: 'Save in this browser' }).click(); await unsaved(page);
    assert.equal(await page.getByLabel('Coaching note').inputValue(), 'Break toward the sideline.');
    await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => document.querySelector('video').currentTime > .2);
  },
  async 'quota-exceeded-never-saved'(page) {
    await page.addInitScript(k => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function(a,b) { if (a === k) throw new DOMException('Full','QuotaExceededError'); return set.call(this,a,b); }; }, key);
    await ready(page); await cue(page); await page.getByRole('button', { name: 'Save in this browser' }).click(); await unsaved(page);
  },
  async 'readback-mismatch-never-saved'(page) {
    await page.addInitScript(k => { let wrote = false; const set = Storage.prototype.setItem, get = Storage.prototype.getItem; Storage.prototype.setItem = function(a,b) { const r = set.call(this,a,b); if(a === k) wrote = true; return r; }; Storage.prototype.getItem = function(a) { const v = get.call(this,a); return a === k && wrote && v ? v.replace('Out route','Wrong route') : v; }; }, key);
    await ready(page); await cue(page); await page.getByRole('button', { name: 'Save in this browser' }).click(); await unsaved(page);
  },
  async 'readback-throws-never-saved'(page) {
    await page.addInitScript(k => { let wrote = false; const set = Storage.prototype.setItem, get = Storage.prototype.getItem; Storage.prototype.setItem = function(a,b) { const r=set.call(this,a,b); if(a === k) wrote=true; return r; }; Storage.prototype.getItem = function(a) { if(a === k && wrote) throw new Error('Readback denied'); return get.call(this,a); }; }, key);
    await ready(page); await cue(page); await page.getByRole('button', { name: 'Save in this browser' }).click(); await unsaved(page);
  },
  async 'corrupt-record-preserved-until-reset'(page) {
    await page.addInitScript(k => localStorage.setItem(k, '{broken'), key); await ready(page); await unsaved(page);
    assert.equal(await page.evaluate(k => localStorage.getItem(k),key), '{broken'); await cue(page);
    await page.getByRole('button', { name: 'Reset local demo' }).click(); assert.equal(await page.evaluate(k => localStorage.getItem(k),key), null);
  },
  async 'foreign-sample-cannot-reopen'(page) {
    const foreign = stored.replace(sample.id,'foreign'); await page.addInitScript(({k,v}) => localStorage.setItem(k,v), {k:key,v:foreign});
    await ready(page); await unsaved(page); assert.equal(await page.getByLabel('Coaching label').inputValue(), ''); assert.equal(await page.evaluate(k => localStorage.getItem(k),key), foreign);
  },
  async 'reset-denied-keeps-session-and-never-confirms'(page) {
    await page.addInitScript(({k,v}) => { localStorage.setItem(k,v); Storage.prototype.removeItem = function(a) { if(a === k) throw new Error('Denied'); }; }, {k:key,v:stored});
    await ready(page); await page.getByRole('button', { name:'Reset local demo' }).click(); await unsaved(page);
    assert.equal(await page.getByLabel('Coaching label').inputValue(),'Out route'); assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),stored);
  },
  async 'reset-noop-keeps-session-and-never-confirms'(page) {
    await page.addInitScript(({k,v})=>{localStorage.setItem(k,v);Storage.prototype.removeItem=function(){};},{k:key,v:stored});
    await ready(page); await page.getByRole('button',{name:'Reset local demo'}).click(); await unsaved(page); assert.equal(await page.getByLabel('Coaching label').inputValue(),'Out route');
  },
  async 'another-tab-change-invalidates-saved-status'(page) {
    await ready(page); await cue(page); await page.getByRole('button',{name:'Save in this browser'}).click();
    const other=await page.context().newPage(); await other.goto(base); await other.evaluate(k=>localStorage.removeItem(k),key); await unsaved(page);
    assert.equal(await page.getByLabel('Coaching label').inputValue(),'Out route'); await other.close();
  },
  async 'invalid-interval-cannot-save'(page) {
    await ready(page); await cue(page);
    for(const [start,end] of [['6','3'],['-1','3'],['0','9'],['3','3']]) {
      await page.getByLabel('Interval start seconds').fill(start); await page.getByLabel('Interval end seconds').fill(end);
      assert.equal(await page.getByRole('button',{name:'Save in this browser'}).isDisabled(),true);
    }
    await page.getByLabel('Interval start seconds').fill('0');await page.getByLabel('Interval end seconds').fill('3');await page.getByLabel('Coaching label').fill(' ');
    assert.equal(await page.getByRole('button',{name:'Save in this browser'}).isDisabled(),true);
  },
  async 'tampered-media-fails-closed'(page) {
    await page.route(/film-a0\/out-route\.(mp4|webm)/,async route=>{const r=await route.fetch();await route.fulfill({response:r,body:Buffer.concat([await r.body(),Buffer.from('tampered')])});});
    await page.goto(base); await page.getByRole('alert').waitFor(); assert.match(await page.getByRole('alert').innerText(),/identity check failed/);
    assert.equal(await page.getByRole('button',{name:'Play',exact:true}).isDisabled(),true);await cue(page);assert.equal(await page.getByRole('button',{name:'Save in this browser'}).isDisabled(),true);
  },
  async 'missing-media-fails-clearly'(page) {
    await page.route(/film-a0\/out-route\.(mp4|webm)/,route=>route.fulfill({status:503,body:'unavailable'}));await page.goto(base);await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/could not be loaded/);
  },
  async 'phone-identity-layout-and-save'(page) {
    await page.setViewportSize({width:390,height:844});await ready(page);await cue(page);
    await page.getByRole('button',{name:'Save in this browser'}).click();assert.match(await page.getByTestId('save-status').innerText(),/^Saved in this browser/);
    for(const text of ['coach@demo.invalid','Synthetic Football Lab','Sample preview · not saved']) assert.equal(await page.getByText(text,{exact:false}).first().isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByTestId('save-status').scrollIntoViewIfNeeded();
    await page.evaluate(()=>document.querySelector('[data-testid=save-status]').scrollIntoView({block:'center'}));
    assert.equal(await page.evaluate(()=>{const r=document.querySelector('[data-testid=save-status]').getBoundingClientRect(),nav=document.querySelector('.cc-bottom-nav').getBoundingClientRect(),header=document.querySelector('.cc-topbar').getBoundingClientRect();return r.top>=header.bottom&&r.bottom<=nav.top;}),true);
    await page.screenshot({path:path.join(out,`${page.engineName}-phone-status.png`)});
    await page.evaluate(()=>{document.activeElement.blur();window.scrollTo(0,0);});
    await page.screenshot({path:path.join(out,`${page.engineName}-phone.png`),fullPage:true});
  },
};
(async()=>{
  build = await (await fetch(base+'/a0-build.json')).json();
  for(const [engineName,engine] of Object.entries({chromium,firefox})) {
    const browser=await engine.launch({headless:true});
    fs.writeFileSync(path.join(out,`${engineName}-version.txt`),browser.version()+'\n');
    for(const [name,test] of Object.entries(cases)) {
      const context=await browser.newContext({viewport:{width:1440,height:1000}});const requests=[];const errors=[];
      context.on('request',r=>requests.push(r.url()));await context.tracing.start({screenshots:true,snapshots:true});
      const page=await context.newPage();page.engineName=engineName;page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
      try { await test(page);assert.deepEqual(errors,[]);assert.deepEqual(requests.filter(u=>!u.startsWith(base+'/')&&!u.startsWith('blob:'+base)),[]);results.push({engine:engineName,name,status:'PASS',requests:requests.length}); }
      catch(e){results.push({engine:engineName,name,status:'FAIL',error:e.stack});await page.screenshot({path:path.join(out,`${engineName}-${name}-failure.png`),fullPage:true}).catch(()=>{});}
      await context.tracing.stop({path:path.join(out,`${engineName}-${name}.zip`)});await context.close();console.log(JSON.stringify(results.at(-1)));
    }
    await browser.close();
  }
})().catch(e=>{results.push({name:'runner',status:'FAIL',error:e.stack});console.error(e);}).finally(()=>{const totals={pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,skip:0};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({build,totals,results},null,2));console.log(totals);if(totals.fail)process.exitCode=1;});

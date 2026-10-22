// A0-1 regressions. Run unchanged against the failed and repaired local builds.
const {chromium,firefox}=require('../../e2e/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const out=process.env.A0_EVIDENCE_DIR||'/tmp/film-a0-reopen';fs.mkdirSync(out,{recursive:true});
const base='http://localhost:4210',key='coach-core:film-a0:synthetic-out-route-v1';
const sample=require('../../src/features/film-analyzer/demo/sample.json');
const stored=JSON.stringify({version:1,sampleId:sample.id,sampleHashes:sample.files.map(f=>f.sha256),startMs:3500,endMs:6000,label:'Out route',note:'Break toward the sideline.'});
const results=[];let build;
async function unopened(page){assert.doesNotMatch(await page.getByTestId('save-status').innerText(),/^Saved/);assert.equal(await page.getByLabel('Coaching label').inputValue(),'');assert.equal(await page.getByLabel('Coaching note').inputValue(),'');assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),stored);}
(async()=>{
 build=await(await fetch(base+'/a0-build.json')).json();
 for(const [name,engine] of Object.entries({chromium,firefox})){
  const browser=await engine.launch({headless:true});
  for(const variant of ['tampered','missing','duration','slow','reset-pending','edit-pending','other-tab-pending']){
   const context=await browser.newContext();await context.tracing.start({screenshots:true,snapshots:true});
   const page=await context.newPage();page.setDefaultTimeout(10000);let release=()=>{};const requests=[];context.on('request',r=>requests.push(r.url()));
   try{
    await page.addInitScript(({k,v})=>localStorage.setItem(k,v),{k:key,v:stored});
    if(variant==='duration')await page.addInitScript(()=>Object.defineProperty(HTMLMediaElement.prototype,'duration',{get:()=>9,configurable:true}));
    if(variant==='tampered')await page.route(/film-a0\/out-route\.(mp4|webm)/,async r=>{const response=await r.fetch();await r.fulfill({response,body:Buffer.concat([await response.body(),Buffer.from('tamper')])});});
    if(variant==='missing')await page.route(/film-a0\/out-route\.(mp4|webm)/,r=>r.fulfill({status:503,body:'unavailable'}));
    const slow=['slow','reset-pending','edit-pending','other-tab-pending'].includes(variant);
    if(slow){const gate=new Promise(r=>{release=r;});await page.route(/film-a0\/out-route\.(mp4|webm)/,async r=>{await gate;await r.continue().catch(()=>{});});}
    await page.goto(base);
    if(!slow){await page.getByRole('alert').waitFor();await unopened(page);assert.match(await page.getByTestId('save-status').innerText(),/not verified|cannot be reopened/i);}
    else{
     if(variant==='slow'){
      await unopened(page);assert.match(await page.getByTestId('save-status').innerText(),/verifying the sample/);
      await page.waitForTimeout(300);await unopened(page);release();
      await page.getByText('Sample bytes and duration verified.',{exact:false}).waitFor();
      await page.waitForFunction(()=>document.querySelector('[data-testid=save-status]').textContent.startsWith('Saved'));
      assert.equal(await page.getByLabel('Coaching label').inputValue(),'Out route');assert.equal(await page.getByLabel('Coaching note').inputValue(),'Break toward the sideline.');
     }else if(variant==='reset-pending'){
      await page.getByRole('button',{name:'Reset local demo'}).click();assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);release();await page.getByText('Sample bytes and duration verified.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Coaching label').inputValue(),'');assert.match(await page.getByTestId('save-status').innerText(),/^Reset confirmed/);
     }else if(variant==='edit-pending'){
      await page.getByLabel('Coaching label').fill('New session cue');release();await page.getByText('Sample bytes and duration verified.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Coaching label').inputValue(),'New session cue');assert.match(await page.getByTestId('save-status').innerText(),/^Not saved/);assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),stored);
     }else{
      const other=await context.newPage();await other.goto(base);await other.evaluate(k=>localStorage.removeItem(k),key);await page.getByTestId('save-status').filter({hasText:'changed in another tab'}).waitFor();release();await page.getByText('Sample bytes and duration verified.',{exact:false}).waitFor();assert.equal(await page.getByLabel('Coaching label').inputValue(),'');assert.match(await page.getByTestId('save-status').innerText(),/^Not saved/);await other.close();
     }
    }
    assert.deepEqual(requests.filter(u=>!u.startsWith(base+'/')&&!u.startsWith('blob:'+base)),[]);
    results.push({engine:name,variant,status:'PASS'});
   }catch(e){results.push({engine:name,variant,status:'FAIL',error:e.stack});await page.screenshot({path:path.join(out,`${name}-${variant}-failure.png`),fullPage:true}).catch(()=>{});}
   finally{release();await context.tracing.stop({path:path.join(out,`${name}-${variant}.zip`)});await context.close();}
   console.log(JSON.stringify(results.at(-1)));
  }
  await browser.close();
 }
})().catch(e=>results.push({status:'FAIL',error:e.stack})).finally(()=>{const totals={pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,skip:0};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({build,totals,results},null,2));console.log(totals);if(totals.fail)process.exitCode=1;});

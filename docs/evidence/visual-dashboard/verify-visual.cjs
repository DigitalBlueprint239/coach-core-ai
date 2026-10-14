const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const {chromium,firefox}=require(process.env.COACH_CORE_PLAYWRIGHT_MODULE||path.join(root,'e2e/node_modules/playwright'));
const output=path.resolve(process.argv[2]||__dirname);fs.mkdirSync(output,{recursive:true});
const axe=path.join(root,'node_modules/axe-core/axe.min.js');
(async()=>{const results=[];const failures=[];
for(const [engine,type] of Object.entries({chromium,firefox})){
 const browser=await type.launch({headless:true});
 for(const [name,width,height] of [['narrow-phone',320,740],['phone',375,812],['small-tablet',640,960],['tablet',834,1112],['small-desktop',1024,900],['desktop-1280',1280,900],['desktop',1440,1000],['wide-desktop',1920,1080]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',serviceWorkers:'block'});const page=await context.newPage();const errors=[];const external=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'){external.push(url.origin);return route.abort();}return route.continue();});
  await page.goto('http://127.0.0.1:4317/');await page.getByRole('heading',{name:'Your week. Game ready.'}).waitFor();
  const sizes=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(sizes.page<=sizes.viewport,`${engine}/${name} horizontal overflow ${JSON.stringify(sizes)}`);
  await page.addScriptTag({path:axe});const a11y=await page.evaluate(async()=>{const report=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return report.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
  if(a11y.length)failures.push({engine,name,a11y});
  const smallTargets=await page.locator('button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44;}).map(n=>({text:n.innerText,label:n.getAttribute('aria-label'),height:n.getBoundingClientRect().height})));assert.deepEqual(smallTargets,[],`${engine}/${name} controls shorter than44px`);
  if(engine==='chromium'&&['phone','tablet','desktop'].includes(name)){await page.screenshot({path:path.join(output,`${name}-${width}x${height}.png`)});await page.screenshot({path:path.join(output,`${name}-full-page.png`),fullPage:true});}
  if(name==='phone'||name==='desktop'){
   await page.getByRole('button',{name:'View sample event',exact:true}).click();await page.getByRole('dialog',{name:'Team practice'}).waitFor();
   assert.equal(await page.locator('dialog').evaluate(n=>n.contains(document.activeElement)),true,'dialog focus');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0,'Escape closes details');
   await page.getByRole('button',{name:'Teams',exact:true}).click();await page.getByRole('heading',{name:'Visual preview only'}).waitFor();assert.equal(await page.locator('main').evaluate(n=>n===document.activeElement),true,'navigation focuses main');
   await page.getByRole('button',{name:'Return to dashboard'}).click();await page.getByRole('checkbox',{name:'Check practice equipment'}).check();
   assert.equal(await page.evaluate(()=>localStorage.length),0,'preview must not persist sample tasks');
   await page.getByRole('button',{name:'Exit sample preview',exact:true}).click();assert.equal(await page.getByRole('checkbox').count(),0,'empty workspace has no fictional assignments');assert.equal(await page.getByText('Team practice',{exact:true}).count(),0,'sample events removed');
   if(engine==='chromium')await page.screenshot({path:path.join(output,`${name}-empty-${width}x${height}.png`)});
  }
  assert.deepEqual(errors,[],`${engine}/${name} browser errors`);assert.deepEqual(external,[],`${engine}/${name} external requests`);
  results.push({engine,name,width,height,overflow:false,smallTargets:0,a11yViolations:a11y.length,errors:0,externalRequests:0});console.log(`PASS ${engine} ${name} ${width}x${height}`);await context.close();
 }
 // Keyboard and motion are checked on the actual browser engine.
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4317/');await page.keyboard.press('Tab');assert.equal(await page.locator('.cc-skip').evaluate(n=>n===document.activeElement),true,'skip link first keyboard target');await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(n=>n===document.activeElement),true,'skip link reaches main');
 const outline=await page.locator('.cc-skip').evaluate(n=>getComputedStyle(n).outlineWidth);const motion=await page.locator('.cc-action').first().evaluate(n=>getComputedStyle(n).transitionDuration);assert.equal(motion,'0s');
 results.push({engine,keyboard:'PASS',reducedMotion:'PASS',outline});await browser.close();
}
fs.writeFileSync(path.join(output,'ui-verification.json'),JSON.stringify({results,a11yFailures:failures,physicalDeviceTesting:false,scope:'Standalone shared-component visual preview; no authenticated workflow acceptance'},null,2));
assert.deepEqual(failures,[],'accessibility violations');console.log('Visual verification completed.');
})().catch(e=>{console.error(e);process.exitCode=1;});

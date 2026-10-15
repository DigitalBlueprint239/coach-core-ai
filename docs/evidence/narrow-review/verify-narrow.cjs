const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,firefox}=require(process.env.COACH_CORE_PLAYWRIGHT_MODULE || 'playwright');
const out=path.resolve(process.env.COACH_CORE_UI_OUTPUT || __dirname);fs.mkdirSync(out,{recursive:true});
const sizes=[[375,812],[430,932],[490,900],[834,1112],[1440,1000]];
(async()=>{const results=[];
 for(const [engine,type] of Object.entries({chromium,firefox})){
 const browser=await type.launch({headless:true});
 for(const [width,height] of sizes){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(new URL(r.request().url()).hostname!=='127.0.0.1'){external.push(r.request().url());return r.abort();}return r.continue();});
 await page.goto('http://127.0.0.1:4317/');await page.getByText('Sample data · preview',{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page overflow');
 const compact=await page.locator('.cc-selected-day').isVisible();assert.equal(compact,width<1100,'content-width agenda');
 if(width<768){const card=page.getByRole('region',{name:'Next practice'});assert.equal(await card.getByRole('button').count(),1);assert.ok(await card.locator('.cc-next-time').isVisible());const g=await card.boundingBox();assert.ok(g.y<160&&g.height<230,'compact next practice');assert.equal(await page.locator('.cc-bottom-nav').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(6, 18, 30)');}
 if(engine==='chromium'){await page.screenshot({path:path.join(out,`${width}-top.png`)});await page.screenshot({path:path.join(out,`${width}-full.png`),fullPage:true});}
 if(compact){const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+1);await page.getByRole('button',{name:tomorrow.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}),exact:true}).click();await page.locator('.cc-selected-day').getByRole('button',{name:/Team practice/}).waitFor();
 await page.locator('.cc-calendar-panel').scrollIntoViewIfNeeded();if(engine==='chromium')await page.screenshot({path:path.join(out,`${width}-agenda.png`)});
 const agenda=page.locator('.cc-selected-day');await agenda.getByRole('button',{name:/Team practice/}).click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 }
 // Measure every individual word's line boxes, including all visible event titles.
 const fragments=await page.locator('.cc-event strong,.cc-upcoming-list strong').evaluateAll(nodes=>nodes.filter(n=>n.getBoundingClientRect().height).flatMap(n=>{const text=n.firstChild;if(!text||text.nodeType!==3)return[];return [...text.textContent.matchAll(/\S+/g)].flatMap(m=>{const range=document.createRange();range.setStart(text,m.index);range.setEnd(text,m.index+m[0].length);return range.getClientRects().length>1?[m[0]]:[];});}));assert.deepEqual(fragments,[],'fragmented event words');
 let clearance=0;
 if(width<768){for(const button of await page.locator('main button,main input').all()){if(!await button.isVisible())continue;await button.evaluate(n=>{n.scrollIntoView({block:'end'});n.focus({preventScroll:true});});const r=await button.boundingBox(),nav=await page.locator('.cc-bottom-nav').boundingBox();assert.ok(r.y+r.height<=nav.y-8,`nav covers ${await button.getAttribute('aria-label')||await button.textContent()}`);clearance++;}
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));if(engine==='chromium')await page.screenshot({path:path.join(out,`${width}-bottom.png`)});}
 const smallTargets=await page.locator('button').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<44;}).map(n=>n.textContent));assert.deepEqual(smallTargets,[],'44px control height');
 await page.addScriptTag({path:path.resolve(__dirname,'../../../node_modules/axe-core/axe.min.js')});const axe=await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(axe,[],'axe');
 await page.getByRole('button',{name:'Exit preview',exact:true}).click();assert.equal(await page.getByRole('checkbox').count(),0);assert.equal(await page.getByText('Team practice',{exact:true}).count(),0);assert.ok(await page.getByText('Assignment tracking is planned').isVisible());assert.equal(await page.evaluate(()=>localStorage.length+sessionStorage.length),0);
 if(engine==='chromium')await page.screenshot({path:path.join(out,`${width}-empty.png`),fullPage:true});
 for(const name of ['Teams','Practice Plans','Smart Playbook']){await page.getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{name:'Visual preview only'}).waitFor();assert.ok(await page.locator('main').evaluate(n=>n===document.activeElement));await page.getByRole('button',{name:'Return to dashboard'}).click();}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);results.push({engine,version:browser.version(),width,height,compact,clearance,axe:0,wordFragments:0,errors,external});console.log('PASS',engine,width);await page.close();
 }
 // A narrow calendar inside a wide browser must use its own content width.
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4317/');await page.locator('.cc-calendar-panel').evaluate(n=>n.style.width='490px');assert.ok(await page.locator('.cc-selected-day').isVisible());assert.ok(!await page.locator('.cc-hours').isVisible());assert.equal(await page.locator('.cc-action').first().evaluate(n=>getComputedStyle(n).transitionDuration),'0s');await page.keyboard.press('Tab');assert.ok(await page.locator('.cc-skip').evaluate(n=>n===document.activeElement));await page.keyboard.press('Enter');assert.ok(await page.locator('main').evaluate(n=>n===document.activeElement));results.push({engine,wideViewportNarrowCalendar:'PASS',keyboard:'PASS',reducedMotion:'PASS'});await browser.close();
 }
 fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({results,scope:'Local isolated shared-component preview. Browser emulation; no physical device or authenticated acceptance.'},null,2));
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium,expect}=require('/workspace/coach-core-integration/e2e/node_modules/@playwright/test');
const fs=require('node:fs');const out='/workspace/coach-core-windows-main-evidence';
(async()=>{const browser=await chromium.launch({headless:true});const context=await browser.newContext();await context.tracing.start({screenshots:true,snapshots:true});const page=await context.newPage();page.setDefaultTimeout(20000);const external=[];await context.route('**/*',r=>{const u=new URL(r.request().url());if(['localhost','127.0.0.1'].includes(u.hostname))return r.continue();external.push(u.origin+u.pathname);return r.abort();});
const nav=async name=>page.getByRole('navigation').getByRole('button',{name:new RegExp(name)}).filter({visible:true}).first().click();
await page.goto('http://localhost:3000/start');await expect(page.getByText('Welcome, coach@demo.coachcore.test')).toBeVisible();
if(process.env.CHECK_RESTART==='1'){
 await nav('Teams');await expect(page.getByRole('heading',{name:'Synthetic Training Team',exact:true})).toBeVisible();
 await nav('Practice Plans');await page.getByRole('button',{name:'Open Local Tuesday Practice',exact:true}).click();await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('Synthetic coaching walkthrough only.');
 await nav('Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await page.getByRole('button',{name:'Load',exact:true}).first().click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Local Shotgun');
 console.log('PASS restart: team, practice note and play recovered from local emulator export/import.');
}else{
 await nav('Teams');await page.getByRole('button',{name:'Create Team',exact:true}).first().click();await page.getByLabel('Team Name').fill('Synthetic Training Team');await page.getByRole('button',{name:'Create Team',exact:true}).last().click();await expect(page.getByRole('heading',{name:'Synthetic Training Team',exact:true})).toBeVisible();await page.screenshot({path:out+'/teams.png',fullPage:true});
 await nav('Practice Plans');await page.getByLabel('Plan.name',{exact:true}).fill('Local Tuesday Practice');await page.getByLabel('Plan.notes',{exact:true}).fill('Synthetic coaching walkthrough only.');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');await page.screenshot({path:out+'/practice.png',fullPage:true});
 await nav('Smart Playbook');await page.getByRole('button',{name:/Shotgun/}).click();await page.getByPlaceholder('Enter play name...').fill('Local Shotgun');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');await page.screenshot({path:out+'/playbook.png',fullPage:true});
 console.log('PASS actual Windows-entry route: synthetic sign-in -> Teams create -> Practice save -> Smart Playbook save.');
}
await context.tracing.stop({path:out+(process.env.CHECK_RESTART==='1'?'/restart-trace.zip':'/user-flow-trace.zip')});console.log('External requests sent:',external.length);await browser.close();})().catch(e=>{console.error(e);process.exitCode=1;});

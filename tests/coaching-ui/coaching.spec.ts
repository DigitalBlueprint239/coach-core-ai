import {test,expect,Page} from '../../e2e/node_modules/@playwright/test';
import {resetEmulators,adminSet,adminGet,adminTeamsOwnedBy} from '../../e2e/tests/support/emulator';
import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen} from '../../e2e/tests/support/app';
test.beforeEach(async({page,context,browser,browserName})=>{console.info('Browser:',browserName,browser.version());await resetEmulators();await skipOnboarding(context);await context.addInitScript(()=>localStorage.setItem('smartPlaybook_onboarding_complete','true'));page.on('dialog',d=>{void d.accept();});});
async function setup(page:Page,label:string){const email=coachEmail(label),uid=await signInAsBetaCoach(page,email);await createTeamViaUI(page,'Owls');const [team]=await adminTeamsOwnedBy(uid);return {email,uid,teamId:team.id};}
async function plan(page:Page){await openTab(page,'Practice Plans');await expect(page.getByRole('heading',{name:'Practice Planner'})).toBeVisible();}
async function saved(page:Page){await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');}
test('P16 manual editable plan saves and reopens exact ordered content in clean browser',async({page,browser})=>{
 const s=await setup(page,'p16');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('A'.repeat(200));await page.getByLabel('Plan.notes',{exact:true}).fill('N'.repeat(5000));await page.getByLabel('Plan.periods.2.focus').fill('Route timing');await saved(page);
 const docId=await page.evaluate(([uid,team])=>{const prefix=`coachcore:v1:${uid}:${team}:drafts:practicePlans`;return localStorage.getItem(prefix);},[s.uid,s.teamId]);expect(docId).toBeNull();
 const context=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(context);const clean=await context.newPage();await signInAsBetaCoach(clean,s.email);await plan(clean);
 await clean.getByRole('button',{name:`Open ${'A'.repeat(200)}`,exact:true}).click();await expect(clean.getByLabel('Plan.notes',{exact:true})).toHaveValue('N'.repeat(5000));await expect(clean.getByLabel('Plan.periods.2.focus')).toHaveValue('Route timing');
 }finally{await context.close();}
});
test('P14 concurrent edits show recovery; copy keeps both server versions',async({page,browser})=>{
 const s=await setup(page,'p14');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Original');await saved(page);
 const second=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(second);const p2=await second.newPage();p2.on('dialog',d=>{void d.accept();});await signInAsBetaCoach(p2,s.email);await plan(p2);await p2.getByRole('button',{name:'Open Original',exact:true}).click();
 await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await saved(page);await p2.getByLabel('Plan.name',{exact:true}).fill('Second editor');await p2.getByRole('button',{name:'Save practice plan',exact:true}).click();
 await expect(p2.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Keep my version as a copy'}).click();await expect(p2.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
 await expect(p2.getByRole('button',{name:'Open Server first',exact:true})).toBeVisible();await expect(p2.getByRole('button',{name:'Open Second editor',exact:true})).toBeVisible();
 }finally{await second.close();}
});
test('P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation',async({page,context})=>{
 const a=await setup(page,'p10');await plan(page);await context.setOffline(true);await page.getByLabel('Plan.name',{exact:true}).fill('Private A draft');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();
 // A transaction cannot acknowledge while offline. Draft is already captured before any network wait.
 await expect.poll(()=>page.evaluate(([uid,team])=>JSON.parse(localStorage.getItem(`coachcore:v1:${uid}:${team}:drafts:practicePlans`)||'null')?.fields.name,[a.uid,a.teamId])).toBe('Private A draft');
 await context.setOffline(false);await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
 await page.getByLabel('Plan.notes',{exact:true}).fill('Unsynced note');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('Unsynced note');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign out anyway',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
 const b=await signInAsBetaCoach(page,coachEmail('coachB'));await createTeamViaUI(page,'B Team');await plan(page);await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('');
 expect(await page.evaluate(uid=>Object.keys(localStorage).some(k=>k.startsWith(`coachcore:v1:${uid}:`)&&JSON.parse(localStorage.getItem(k)||'null')?.fields?.notes==='Unsynced note'),a.uid)).toBe(true);
 expect(await page.evaluate(uid=>Object.keys(localStorage).filter(k=>k.startsWith(`coachcore:v1:${uid}:`)&&k.includes(':drafts:')),b)).toEqual([]);
});
test('P15 ordinary play cloud save, property edit, hard reload, complete reopen',async({page})=>{
 const s=await setup(page,'p15');await openTab(page,'Smart Playbook');await page.getByRole('button',{name:/Shotgun/}).click();await page.getByPlaceholder('Enter play name...').fill('Mesh');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();
 await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');await page.getByPlaceholder('Enter play name...').fill('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('unsaved');
 await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
 await page.reload();await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await expect(page.getByText('Mesh edited',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Load',exact:true}).click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
});

import {test,expect,Page} from '../../e2e/node_modules/@playwright/test';
import {resetEmulators,adminSet,adminGet,adminTeamsOwnedBy} from '../../e2e/tests/support/emulator';
import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen,waitForE2EHooks} from '../../e2e/tests/support/app';
test.beforeEach(async({page,context,browser,browserName})=>{console.info('Browser:',browserName,browser.version());await resetEmulators();await skipOnboarding(context);await context.addInitScript(()=>localStorage.setItem('smartPlaybook_onboarding_complete','true'));page.on('dialog',d=>{void d.accept();});});
async function setup(page:Page,label:string){const email=coachEmail(label),uid=await signInAsBetaCoach(page,email);await createTeamViaUI(page,'Owls');const [team]=await adminTeamsOwnedBy(uid);return {email,uid,teamId:team.id};}
async function plan(page:Page){await openTab(page,'Practice Plans');await expect(page.getByRole('heading',{name:'Practice Planner'})).toBeVisible();}
async function saved(page:Page){await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');}
test('P16 manual editable plan saves and reopens exact ordered content in clean browser',async({page,browser})=>{
 const s=await setup(page,'p16');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('A'.repeat(200));await page.getByLabel('Plan.notes',{exact:true}).fill('N'.repeat(5000));await page.getByLabel('Plan.periods.2.focus').fill('Route timing');await saved(page);
 const draftKeys=await page.evaluate(([uid,team])=>{const prefix=`coachcore:v1:${uid}:${team}:drafts:practicePlans`;return Object.keys(localStorage).filter(k=>k.startsWith(prefix));},[s.uid,s.teamId]);expect(draftKeys).toEqual([]);
 const context=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(context);const clean=await context.newPage();await signInAsBetaCoach(clean,s.email);await plan(clean);
 await clean.getByRole('button',{name:`Open ${'A'.repeat(200)}`,exact:true}).click();await expect(clean.getByLabel('Plan.notes',{exact:true})).toHaveValue('N'.repeat(5000));await expect(clean.getByLabel('Plan.periods.2.focus')).toHaveValue('Route timing');
 }finally{await context.close();}
});
test('R5 no-team coach sees a truthful block with no save action',async({page})=>{
 await signInAsBetaCoach(page,coachEmail('no-team'));await openTab(page,'Smart Playbook');
 await expect(page.getByRole('alert')).toContainText('No play has been saved');
 await expect(page.getByRole('button',{name:'Save Play',exact:true})).toHaveCount(0);
});
test('R1 verified legacy import keeps originals and blocks another account',async({page})=>{
 await setup(page,'claim-a');const originals=JSON.stringify([{id:'legacy',name:'Original',phase:'offense',type:'pass',players:[],routes:[]}]);
 await page.evaluate(raw=>localStorage.setItem('smartPlaybook_plays',raw),originals);await openTab(page,'Smart Playbook');
 await page.getByRole('button',{name:'Import plays',exact:true}).click();
 await expect.poll(()=>page.evaluate(()=>localStorage.getItem('coachcore:v1:legacyImportClaim'))).not.toBeNull();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
 await signInAsBetaCoach(page,coachEmail('claim-b'));await createTeamViaUI(page,'Bravo');await openTab(page,'Smart Playbook');
 await expect(page.getByRole('region',{name:'Import device plays'})).toContainText('already imported by another account');
 await expect(page.getByRole('button',{name:'Import plays',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('smartPlaybook_plays'))).toBe(originals);
});
test('P14 shared-profile tabs preserve drafts across refresh and recover conflict as a copy',async({page,context})=>{
 const s=await setup(page,'p14');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Original');await saved(page);
 const p2=await context.newPage();try{p2.on('dialog',d=>{void d.accept();});await p2.goto('/');await expect(p2.getByText(`Welcome, ${s.email}`)).toBeVisible();await plan(p2);await p2.getByRole('button',{name:'Open Original',exact:true}).click();
 await p2.getByLabel('Plan.name',{exact:true}).fill('Second editor');await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await saved(page);
 await p2.reload();await plan(p2);await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Save practice plan',exact:true}).click();
 await expect(p2.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Keep my version as a copy'}).click();await expect(p2.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
 await expect(p2.getByRole('button',{name:'Open Server first',exact:true})).toBeVisible();await expect(p2.getByRole('button',{name:'Open Second editor',exact:true})).toBeVisible();
 }finally{await p2.close();}
});
test('P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation',async({page,context})=>{
 const a=await setup(page,'p10');await plan(page);await context.setOffline(true);await page.getByLabel('Plan.name',{exact:true}).fill('Private A draft');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();
 // A transaction cannot acknowledge while offline. Draft is already captured before any network wait.
 await expect.poll(()=>page.evaluate(([uid,team])=>Object.entries(localStorage).filter(([k])=>k.startsWith(`coachcore:v1:${uid}:${team}:drafts:practicePlans`)).map(([,raw])=>JSON.parse(raw).fields.name),[a.uid,a.teamId])).toContain('Private A draft');
 await context.setOffline(false);await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
 await page.getByLabel('Plan.notes',{exact:true}).fill('Unsynced note');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('Unsynced note');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign out anyway',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
 const b=await signInAsBetaCoach(page,coachEmail('coach-b'));await createTeamViaUI(page,'B Team');await plan(page);await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('');
 expect(await page.evaluate(uid=>Object.keys(localStorage).some(k=>k.startsWith(`coachcore:v1:${uid}:`)&&JSON.parse(localStorage.getItem(k)||'null')?.fields?.notes==='Unsynced note'),a.uid)).toBe(true);
 expect(await page.evaluate(uid=>Object.keys(localStorage).filter(k=>k.startsWith(`coachcore:v1:${uid}:`)&&k.includes(':drafts:')),b)).toEqual([]);
});
test('P15 ordinary play cloud save, property edit, hard reload, complete reopen',async({page})=>{
 const s=await setup(page,'p15');await openTab(page,'Smart Playbook');await page.getByRole('button',{name:/Shotgun/}).click();await page.getByPlaceholder('Enter play name...').fill('Mesh');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();
 await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');await page.getByPlaceholder('Enter play name...').fill('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('unsaved');
 await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
 await page.reload();await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await expect(page.getByText('Mesh edited',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Load',exact:true}).click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
});
test('P12 sync-now acknowledges the unsaved plan before signing out',async({page})=>{
 await setup(page,'p12sync');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Sync on sign out');await page.getByLabel('Plan.notes',{exact:true}).fill('Preserved by sync');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();
 await page.getByRole('button',{name:'Sync now',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
});
test('[SDK-in-browser] P10 unauthorized cross-team read and write are denied by actual rules',async({page})=>{
 const a=await setup(page,'negative-a');const when=new Date('2026-10-13T12:00:00Z');
 await adminSet('practicePlans/protected',{name:'Private team A',teamId:a.teamId,createdBy:a.uid,createdAt:when,updatedAt:when,revision:1});
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();const b=await signInAsBetaCoach(page,coachEmail('negative-b'));await waitForE2EHooks(page);
 const result=await page.evaluate(async([team,uid])=>{
   const hooks=(window as unknown as {__coachCoreE2E:{get:(path:string)=>Promise<unknown>;set:(path:string,data:unknown)=>Promise<unknown>}}).__coachCoreE2E;
   return [await hooks.get('practicePlans/protected'),await hooks.set('plays/forbidden',{name:'Forbidden',players:[],routes:[],teamId:team,createdBy:uid,revision:1,createdAt:{__ts:'2026-10-13T12:00:00Z'},updatedAt:{__ts:'2026-10-13T12:00:00Z'}})];
 },[a.teamId,b]);expect(result).toEqual([{ok:false,code:'permission-denied'},{ok:false,code:'permission-denied'}]);
 expect((await adminGet('practicePlans/protected'))?.name).toBe('Private team A');expect(await adminGet('plays/forbidden')).toBeNull();
});

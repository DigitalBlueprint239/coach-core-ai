# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coaching.spec.ts >> P16 manual editable plan saves and reopens exact ordered content in clean browser
- Location: tests\coaching-ui\coaching.spec.ts:8:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('status', { name: 'Practice save status' })
Expected: "saved"
Received: "failed"
Timeout:  10000ms

Call log:
  - Expect "toHaveText" getByRole('status', { name: 'Practice save status' }) with timeout 10000ms
  - waiting for getByRole('status', { name: 'Practice save status' })
    3 × locator resolved to <p role="status" aria-label="Practice save status">saving</p>
      - unexpected value "saving"
    20 × locator resolved to <p role="status" aria-label="Practice save status">failed</p>
       - unexpected value "failed"

```

```yaml
- status "Practice save status": failed
```

# Test source

```ts
  1  | import {test,expect,Page} from '../../e2e/node_modules/@playwright/test';
  2  | import {resetEmulators,adminSet,adminGet,adminTeamsOwnedBy} from '../../e2e/tests/support/emulator';
  3  | import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen} from '../../e2e/tests/support/app';
  4  | test.beforeEach(async({page,context})=>{await resetEmulators();await skipOnboarding(context);await context.addInitScript(()=>localStorage.setItem('smartPlaybook_onboarding_complete','true'));page.on('dialog',d=>{void d.accept();});});
  5  | async function setup(page:Page,label:string){const email=coachEmail(label),uid=await signInAsBetaCoach(page,email);await createTeamViaUI(page,'Owls');const [team]=await adminTeamsOwnedBy(uid);return {email,uid,teamId:team.id};}
  6  | async function plan(page:Page){await openTab(page,'Practice Plans');await expect(page.getByRole('heading',{name:'Practice Planner'})).toBeVisible();}
> 7  | async function saved(page:Page){await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');}
     |                                                                                                                                                                                    ^ Error: expect(locator).toHaveText(expected) failed
  8  | test('P16 manual editable plan saves and reopens exact ordered content in clean browser',async({page,browser})=>{
  9  |  const s=await setup(page,'p16');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('A'.repeat(200));await page.getByLabel('Plan.notes',{exact:true}).fill('N'.repeat(5000));await page.getByLabel('Plan.periods.2.focus').fill('Route timing');await saved(page);
  10 |  const docId=await page.evaluate(([uid,team])=>{const prefix=`coachcore:v1:${uid}:${team}:drafts:practicePlans`;return localStorage.getItem(prefix);},[s.uid,s.teamId]);expect(docId).toBeNull();
  11 |  const context=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(context);const clean=await context.newPage();await signInAsBetaCoach(clean,s.email);await plan(clean);
  12 |  await clean.getByRole('button',{name:`Open ${'A'.repeat(200)}`,exact:true}).click();await expect(clean.getByLabel('Plan.notes',{exact:true})).toHaveValue('N'.repeat(5000));await expect(clean.getByLabel('Plan.periods.2.focus')).toHaveValue('Route timing');
  13 |  }finally{await context.close();}
  14 | });
  15 | test('P14 concurrent edits show recovery; copy keeps both server versions',async({page,browser})=>{
  16 |  const s=await setup(page,'p14');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Original');await saved(page);
  17 |  const second=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(second);const p2=await second.newPage();p2.on('dialog',d=>{void d.accept();});await signInAsBetaCoach(p2,s.email);await plan(p2);await p2.getByRole('button',{name:'Open Original',exact:true}).click();
  18 |  await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await saved(page);await p2.getByLabel('Plan.name',{exact:true}).fill('Second editor');await p2.getByRole('button',{name:'Save practice plan',exact:true}).click();
  19 |  await expect(p2.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Keep my version as a copy'}).click();await expect(p2.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  20 |  await expect(p2.getByRole('button',{name:'Open Server first',exact:true})).toBeVisible();await expect(p2.getByRole('button',{name:'Open Second editor',exact:true})).toBeVisible();
  21 |  }finally{await second.close();}
  22 | });
  23 | test('P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation',async({page,context})=>{
  24 |  const a=await setup(page,'p10');await plan(page);await context.setOffline(true);await page.getByLabel('Plan.name',{exact:true}).fill('Private A draft');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();
  25 |  // A transaction cannot acknowledge while offline. Draft is already captured before any network wait.
  26 |  await expect.poll(()=>page.evaluate(([uid,team])=>JSON.parse(localStorage.getItem(`coachcore:v1:${uid}:${team}:drafts:practicePlans`)||'null')?.fields.name,[a.uid,a.teamId])).toBe('Private A draft');
  27 |  await context.setOffline(false);await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  28 |  await page.getByLabel('Plan.notes',{exact:true}).fill('Unsynced note');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('Unsynced note');
  29 |  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign out anyway',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  30 |  const b=await signInAsBetaCoach(page,coachEmail('coachB'));await createTeamViaUI(page,'B Team');await plan(page);await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('');
  31 |  expect(await page.evaluate(uid=>Object.keys(localStorage).some(k=>k.startsWith(`coachcore:v1:${uid}:`)&&JSON.parse(localStorage.getItem(k)||'null')?.fields?.notes==='Unsynced note'),a.uid)).toBe(true);
  32 |  expect(await page.evaluate(uid=>Object.keys(localStorage).filter(k=>k.startsWith(`coachcore:v1:${uid}:drafts`)),b)).toEqual([]);
  33 | });
  34 | test('P15 ordinary play cloud save, property edit, hard reload, complete reopen',async({page})=>{
  35 |  const s=await setup(page,'p15');await openTab(page,'Smart Playbook');await page.getByRole('button',{name:/Shotgun/}).click();await page.getByPlaceholder('Enter play name...').fill('Mesh');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();
  36 |  await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');await page.getByPlaceholder('Enter play name...').fill('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('unsaved');
  37 |  await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
  38 |  await page.reload();await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await expect(page.getByText('Mesh edited',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Load',exact:true}).click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
  39 | });
  40 | 
```
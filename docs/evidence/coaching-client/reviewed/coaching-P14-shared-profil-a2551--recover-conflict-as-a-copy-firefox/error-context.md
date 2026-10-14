# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coaching.spec.ts >> P14 shared-profile tabs preserve drafts across refresh and recover conflict as a copy
- Location: tests\coaching-ui\coaching.spec.ts:31:5

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.reload: Test timeout of 60000ms exceeded.
Call log:
  - waiting for navigation until "load"

```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - navigation [ref=f1e4]:
      - generic [ref=f1e5]: Coach Core
    - generic [ref=f1e13]:
      - banner [ref=f1e14]:
        - generic [ref=f1e16]:
          - generic [ref=f1e17]:
            - heading "Coach Core AI" [level=1] [ref=f1e18]
            - text: Owls
          - generic [ref=f1e19]:
            - generic [ref=f1e20]: Welcome, p14-mv84se6i-1@e2e.coachcore.test
            - button "Sign out" [ref=f1e21]
      - navigation [ref=f1e22]:
        - generic [ref=f1e24]:
          - button "📊Overview" [ref=f1e25]
          - button "👥Teams" [ref=f1e26]
          - button "📋Practice Plans" [ref=f1e27]
          - button "🏈Smart Playbook" [ref=f1e28]
          - button "📈Analytics" [ref=f1e29]
      - main [ref=f1e30]:
        - region "Practice plan editor" [ref=f1e31]:
          - heading "Practice Planner" [level=2] [ref=f1e32]
          - paragraph [ref=f1e33]: AI generation is disabled. Build or edit your own plan. Film connections are blocked pending implementation and approvals.
          - status "Practice save status" [ref=f1e34]: saved
          - button "New practice plan" [ref=f1e35]
          - button "Save practice plan" [ref=f1e36]
          - button "Export draft" [ref=f1e37]
          - button "Refresh practice library" [ref=f1e38]
          - region "Device recovery" [ref=f1e39]:
            - button "Find other device drafts" [ref=f1e40]
          - list "Saved practice plans" [ref=f1e41]:
            - listitem [ref=f1e42]:
              - button "Open Server first" [ref=f1e43]
              - text: Revision 2
          - paragraph [ref=f1e44]: Created 2026-10-14T13:14:51.237Z; last saved 2026-10-14T13:14:54.335Z
          - group "Plan" [ref=f1e45]:
            - generic [ref=f1e47]:
              - text: Name
              - textbox "Plan.name" [ref=f1e48]: Server first
            - generic [ref=f1e49]:
              - text: Date
              - textbox "Plan.date" [ref=f1e50]
            - generic [ref=f1e51]:
              - text: Duration
              - spinbutton "Plan.duration" [ref=f1e52]: "60"
            - generic [ref=f1e53]:
              - text: Age Group
              - combobox "Plan.ageGroup" [ref=f1e54]:
                - option "6U"
                - option "8U"
                - option "10U" [selected]
                - option "12U"
                - option "14U"
                - option "HS_JV"
                - option "HS_VARSITY"
                - option "ADULT"
            - generic [ref=f1e55]:
              - text: Skill Level
              - combobox "Plan.skillLevel" [ref=f1e56]:
                - option "beginner" [selected]
                - option "intermediate"
                - option "advanced"
            - generic [ref=f1e57]:
              - text: Contact Level
              - combobox "Plan.contactLevel" [ref=f1e58]:
                - option "non_contact" [selected]
                - option "limited_contact"
                - option "full_contact"
            - group "Goals" [ref=f1e59]:
              - button "Add Goals" [ref=f1e61]
            - generic [ref=f1e62]:
              - text: Notes
              - textbox "Plan.notes" [ref=f1e63]
            - group "Periods" [ref=f1e64]:
              - generic [ref=f1e66]:
                - group "1" [ref=f1e67]:
                  - generic [ref=f1e69]:
                    - text: Kind
                    - combobox "Plan.periods.1.kind" [ref=f1e70]:
                      - option "warmup" [selected]
                      - option "period"
                      - option "cooldown"
                  - generic [ref=f1e71]:
                    - text: Name
                    - textbox "Plan.periods.1.name" [ref=f1e72]: Warm-up
                  - generic [ref=f1e73]:
                    - text: Duration Minutes
                    - spinbutton "Plan.periods.1.durationMinutes" [ref=f1e74]: "10"
                  - group "Activities" [ref=f1e75]:
                    - button "Add Activities" [ref=f1e77]
                - button "Move up" [disabled] [ref=f1e78]
                - button "Move down" [ref=f1e79]
                - button "Remove item" [ref=f1e80]
              - generic [ref=f1e81]:
                - group "2" [ref=f1e82]:
                  - generic [ref=f1e84]:
                    - text: Kind
                    - combobox "Plan.periods.2.kind" [ref=f1e85]:
                      - option "warmup"
                      - option "period" [selected]
                      - option "cooldown"
                  - generic [ref=f1e86]:
                    - text: Name
                    - textbox "Plan.periods.2.name" [ref=f1e87]: Skills
                  - generic [ref=f1e88]:
                    - text: Focus
                    - textbox "Plan.periods.2.focus" [ref=f1e89]
                  - generic [ref=f1e90]:
                    - text: Duration Minutes
                    - spinbutton "Plan.periods.2.durationMinutes" [ref=f1e91]: "40"
                  - group "Drills" [ref=f1e92]:
                    - button "Add Drills" [ref=f1e94]
                - button "Move up" [ref=f1e95]
                - button "Move down" [ref=f1e96]
                - button "Remove item" [ref=f1e97]
              - generic [ref=f1e98]:
                - group "3" [ref=f1e99]:
                  - generic [ref=f1e101]:
                    - text: Kind
                    - combobox "Plan.periods.3.kind" [ref=f1e102]:
                      - option "warmup"
                      - option "period"
                      - option "cooldown" [selected]
                  - generic [ref=f1e103]:
                    - text: Name
                    - textbox "Plan.periods.3.name" [ref=f1e104]: Cool-down
                  - generic [ref=f1e105]:
                    - text: Duration Minutes
                    - spinbutton "Plan.periods.3.durationMinutes" [ref=f1e106]: "10"
                  - group "Activities" [ref=f1e107]:
                    - button "Add Activities" [ref=f1e109]
                - button "Move up" [ref=f1e110]
                - button "Move down" [disabled] [ref=f1e111]
                - button "Remove item" [ref=f1e112]
              - button "Add Periods" [ref=f1e113]
            - group "Hydration Break Minutes" [ref=f1e114]:
              - button "Add Hydration Break Minutes" [ref=f1e116]
            - group "Safety Considerations" [ref=f1e117]:
              - button "Add Safety Considerations" [ref=f1e119]
  - generic [ref=f1e124]:
    - paragraph [ref=f1e129]: Team created successfully!
    - button [ref=f1e131]
```

# Test source

```ts
  1  | import {test,expect,Page} from '../../e2e/node_modules/@playwright/test';
  2  | import {resetEmulators,adminSet,adminGet,adminTeamsOwnedBy} from '../../e2e/tests/support/emulator';
  3  | import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen,waitForE2EHooks} from '../../e2e/tests/support/app';
  4  | test.beforeEach(async({page,context,browser,browserName})=>{console.info('Browser:',browserName,browser.version());await resetEmulators();await skipOnboarding(context);await context.addInitScript(()=>localStorage.setItem('smartPlaybook_onboarding_complete','true'));page.on('dialog',d=>{void d.accept();});});
  5  | async function setup(page:Page,label:string){const email=coachEmail(label),uid=await signInAsBetaCoach(page,email);await createTeamViaUI(page,'Owls');const [team]=await adminTeamsOwnedBy(uid);return {email,uid,teamId:team.id};}
  6  | async function plan(page:Page){await openTab(page,'Practice Plans');await expect(page.getByRole('heading',{name:'Practice Planner'})).toBeVisible();}
  7  | async function saved(page:Page){await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');}
  8  | test('P16 manual editable plan saves and reopens exact ordered content in clean browser',async({page,browser})=>{
  9  |  const s=await setup(page,'p16');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('A'.repeat(200));await page.getByLabel('Plan.notes',{exact:true}).fill('N'.repeat(5000));await page.getByLabel('Plan.periods.2.focus').fill('Route timing');await saved(page);
  10 |  const draftKeys=await page.evaluate(([uid,team])=>{const prefix=`coachcore:v1:${uid}:${team}:drafts:practicePlans`;return Object.keys(localStorage).filter(k=>k.startsWith(prefix));},[s.uid,s.teamId]);expect(draftKeys).toEqual([]);
  11 |  const context=await browser.newContext({serviceWorkers:'block'});try{await skipOnboarding(context);const clean=await context.newPage();await signInAsBetaCoach(clean,s.email);await plan(clean);
  12 |  await clean.getByRole('button',{name:`Open ${'A'.repeat(200)}`,exact:true}).click();await expect(clean.getByLabel('Plan.notes',{exact:true})).toHaveValue('N'.repeat(5000));await expect(clean.getByLabel('Plan.periods.2.focus')).toHaveValue('Route timing');
  13 |  }finally{await context.close();}
  14 | });
  15 | test('R5 no-team coach sees a truthful block with no save action',async({page})=>{
  16 |  await signInAsBetaCoach(page,coachEmail('no-team'));await openTab(page,'Smart Playbook');
  17 |  await expect(page.getByRole('alert')).toContainText('No play has been saved');
  18 |  await expect(page.getByRole('button',{name:'Save Play',exact:true})).toHaveCount(0);
  19 | });
  20 | test('R1 verified legacy import keeps originals and blocks another account',async({page})=>{
  21 |  await setup(page,'claim-a');const originals=JSON.stringify([{id:'legacy',name:'Original',phase:'offense',type:'pass',players:[],routes:[]}]);
  22 |  await page.evaluate(raw=>localStorage.setItem('smartPlaybook_plays',raw),originals);await openTab(page,'Smart Playbook');
  23 |  await page.getByRole('button',{name:'Import plays',exact:true}).click();
  24 |  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('coachcore:v1:legacyImportClaim'))).not.toBeNull();
  25 |  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  26 |  await signInAsBetaCoach(page,coachEmail('claim-b'));await createTeamViaUI(page,'Bravo');await openTab(page,'Smart Playbook');
  27 |  await expect(page.getByRole('region',{name:'Import device plays'})).toContainText('already imported by another account');
  28 |  await expect(page.getByRole('button',{name:'Import plays',exact:true})).toHaveCount(0);
  29 |  expect(await page.evaluate(()=>localStorage.getItem('smartPlaybook_plays'))).toBe(originals);
  30 | });
  31 | test('P14 shared-profile tabs preserve drafts across refresh and recover conflict as a copy',async({page,context})=>{
  32 |  const s=await setup(page,'p14');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Original');await saved(page);
  33 |  const p2=await context.newPage();try{p2.on('dialog',d=>{void d.accept();});await p2.goto('/');await expect(p2.getByText(`Welcome, ${s.email}`)).toBeVisible();await plan(p2);await p2.getByRole('button',{name:'Open Original',exact:true}).click();
  34 |  await p2.getByLabel('Plan.name',{exact:true}).fill('Second editor');await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await saved(page);
> 35 |  await p2.reload();await plan(p2);await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Save practice plan',exact:true}).click();
     |           ^ Error: page.reload: Test timeout of 60000ms exceeded.
  36 |  await expect(p2.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();await expect(p2.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');await p2.getByRole('button',{name:'Keep my version as a copy'}).click();await expect(p2.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  37 |  await expect(p2.getByRole('button',{name:'Open Server first',exact:true})).toBeVisible();await expect(p2.getByRole('button',{name:'Open Second editor',exact:true})).toBeVisible();
  38 |  }finally{await p2.close();}
  39 | });
  40 | test('P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation',async({page,context})=>{
  41 |  const a=await setup(page,'p10');await plan(page);await context.setOffline(true);await page.getByLabel('Plan.name',{exact:true}).fill('Private A draft');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();
  42 |  // A transaction cannot acknowledge while offline. Draft is already captured before any network wait.
  43 |  await expect.poll(()=>page.evaluate(([uid,team])=>Object.entries(localStorage).filter(([k])=>k.startsWith(`coachcore:v1:${uid}:${team}:drafts:practicePlans`)).map(([,raw])=>JSON.parse(raw).fields.name),[a.uid,a.teamId])).toContain('Private A draft');
  44 |  await context.setOffline(false);await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  45 |  await page.getByLabel('Plan.notes',{exact:true}).fill('Unsynced note');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('Unsynced note');
  46 |  await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('button',{name:'Sign out anyway',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  47 |  const b=await signInAsBetaCoach(page,coachEmail('coach-b'));await createTeamViaUI(page,'B Team');await plan(page);await expect(page.getByLabel('Plan.notes',{exact:true})).toHaveValue('');
  48 |  expect(await page.evaluate(uid=>Object.keys(localStorage).some(k=>k.startsWith(`coachcore:v1:${uid}:`)&&JSON.parse(localStorage.getItem(k)||'null')?.fields?.notes==='Unsynced note'),a.uid)).toBe(true);
  49 |  expect(await page.evaluate(uid=>Object.keys(localStorage).filter(k=>k.startsWith(`coachcore:v1:${uid}:`)&&k.includes(':drafts:')),b)).toEqual([]);
  50 | });
  51 | test('P15 ordinary play cloud save, property edit, hard reload, complete reopen',async({page})=>{
  52 |  const s=await setup(page,'p15');await openTab(page,'Smart Playbook');await page.getByRole('button',{name:/Shotgun/}).click();await page.getByPlaceholder('Enter play name...').fill('Mesh');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();
  53 |  await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');await page.getByPlaceholder('Enter play name...').fill('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('unsaved');
  54 |  await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
  55 |  await page.reload();await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await expect(page.getByText('Mesh edited',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Load',exact:true}).click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Mesh edited');await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
  56 | });
  57 | test('P12 sync-now acknowledges the unsaved plan before signing out',async({page})=>{
  58 |  await setup(page,'p12sync');await plan(page);await page.getByLabel('Plan.name',{exact:true}).fill('Sync on sign out');await page.getByLabel('Plan.notes',{exact:true}).fill('Preserved by sync');
  59 |  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('dialog',{name:'Unsynced draft recovery'})).toBeVisible();
  60 |  await page.getByRole('button',{name:'Sync now',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  61 | });
  62 | test('P15 existing complete route payload survives property save and reopening',async({page})=>{
  63 |  const s=await setup(page,'geometry');const when=new Date('2026-10-01T12:00:00Z');
  64 |  const players=[{id:'qb',x:110.25,y:180.5,position:'QB',number:7,selected:false,color:'#abcdef'}];
  65 |  const routes=[{id:'route',playerId:'qb',path:[{x:110.25,y:180.5,t:0},{x:150.75,y:140.25,t:1}],type:'custom',color:'#123456',duration:2}];
  66 |  await adminSet('plays/geometry',{name:'Geometry',formation:'Custom',description:'Full precision',phase:'offense',type:'pass',players,routes,tags:['timing'],difficulty:'advanced',sport:'football',teamId:s.teamId,createdBy:s.uid,createdAt:when,updatedAt:when,revision:1});
  67 |  await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await page.getByRole('button',{name:'Load',exact:true}).click();
  68 |  await page.getByPlaceholder('Enter play name...').fill('Geometry edited');await page.getByRole('button',{name:'Save Play',exact:true}).first().click();await page.getByRole('button',{name:'Save Play',exact:true}).last().click();await expect(page.getByRole('status',{name:'Play save status'})).toHaveText('saved');
  69 |  const record=await adminGet('plays/geometry');expect(record?.players).toEqual(players);expect(record?.routes).toEqual(routes);expect(record?.description).toBe('Full precision');expect(record?.tags).toEqual(['timing']);expect(record?.revision).toBe(2);
  70 |  await page.reload();await openTab(page,'Smart Playbook');await page.getByRole('button',{name:'Load Play',exact:true}).click();await page.getByRole('button',{name:'Load',exact:true}).click();await expect(page.getByPlaceholder('Enter play name...')).toHaveValue('Geometry edited');
  71 | });
  72 | test('[SDK-in-browser] P10 unauthorized cross-team read and write are denied by actual rules',async({page})=>{
  73 |  const a=await setup(page,'negative-a');const when=new Date('2026-10-13T12:00:00Z');
  74 |  await adminSet('practicePlans/protected',{name:'Private team A',teamId:a.teamId,createdBy:a.uid,createdAt:when,updatedAt:when,revision:1});
  75 |  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();const b=await signInAsBetaCoach(page,coachEmail('negative-b'));await waitForE2EHooks(page);
  76 |  const result=await page.evaluate(async([team,uid])=>{
  77 |    const hooks=(window as unknown as {__coachCoreE2E:{get:(path:string)=>Promise<unknown>;set:(path:string,data:unknown)=>Promise<unknown>}}).__coachCoreE2E;
  78 |    return [await hooks.get('practicePlans/protected'),await hooks.set('plays/forbidden',{name:'Forbidden',players:[],routes:[],teamId:team,createdBy:uid,revision:1,createdAt:{__ts:'2026-10-13T12:00:00Z'},updatedAt:{__ts:'2026-10-13T12:00:00Z'}})];
  79 |  },[a.teamId,b]);expect(result).toEqual([{ok:false,code:'permission-denied'},{ok:false,code:'permission-denied'}]);
  80 |  expect((await adminGet('practicePlans/protected'))?.name).toBe('Private team A');expect(await adminGet('plays/forbidden')).toBeNull();
  81 | });
  82 | 
```
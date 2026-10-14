# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-investigation.spec.ts >> sign-in entered during pending logout is preserved after navigation
- Location: tests\coaching-ui\navigation-investigation.spec.ts:29:5

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Or get a sign-in link by email')
Expected: "next-coach@e2e.coachcore.test"
Received: ""
Timeout:  10000ms

Call log:
  - Expect "toHaveValue" getByLabel('Or get a sign-in link by email') with timeout 10000ms
  - waiting for getByLabel('Or get a sign-in link by email')
    22 × locator resolved to <input value="" required="" type="email" id="signin-email" autocomplete="email" class="w-full px-3 py-2 border rounded focus:outline-none focus:ring"/>
       - unexpected value ""

```

```yaml
- textbox "Or get a sign-in link by email"
```

# Test source

```ts
  1  | import {test,expect,type Page} from '../../e2e/node_modules/@playwright/test';
  2  | import {resetEmulators} from '../../e2e/tests/support/emulator';
  3  | import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen} from '../../e2e/tests/support/app';
  4  | import {afterSignOutNavigation} from './navigationCheckpoint';
  5  | 
  6  | test.beforeEach(async({page,context,browser,browserName})=>{
  7  |   console.info('ENGINE',browserName,browser.version());await resetEmulators();await skipOnboarding(context);
  8  |   page.on('dialog',async dialog=>{console.info('DIALOG',dialog.type());await dialog.accept();});
  9  | });
  10 | async function coach(page:Page,label:string){return signInAsBetaCoach(page,coachEmail(label));}
  11 | 
  12 | test('transitional sign-in visibility precedes logout navigation completion',async({page})=>{
  13 |   await coach(page,'logout-barrier');
  14 |   await page.evaluate(()=>{
  15 |     const original=window.caches.keys.bind(window.caches);
  16 |     const probe=window as unknown as {__logoutRelease?:()=>void;__logoutWaiting?:boolean;__coachingLogoutDocument?:boolean};
  17 |     probe.__coachingLogoutDocument=true;
  18 |     window.caches.keys=()=>new Promise<string[]>(resolve=>{probe.__logoutWaiting=true;probe.__logoutRelease=()=>{void original().then(resolve);};});
  19 |   });
  20 |   await page.getByRole('button',{name:'Sign out',exact:true}).click();
  21 |   await expect(signInScreen(page)).toBeVisible();
  22 |   expect(await page.evaluate(()=>(window as unknown as {__logoutWaiting:boolean}).__logoutWaiting)).toBe(true);
  23 |   expect(await page.evaluate(()=>(window as unknown as {__coachingLogoutDocument:boolean}).__coachingLogoutDocument)).toBe(true);
  24 |   await afterSignOutNavigation(page,async()=>{await page.evaluate(()=>(window as unknown as {__logoutRelease:()=>void}).__logoutRelease());});
  25 |   await expect(signInScreen(page)).toBeVisible();
  26 |   await coach(page,'after-barrier');
  27 | });
  28 | 
  29 | test('sign-in entered during pending logout is preserved after navigation',async({page})=>{
  30 |   await coach(page,'input-barrier');
  31 |   await page.evaluate(()=>{
  32 |     const original=window.caches.keys.bind(window.caches);
  33 |     const probe=window as unknown as {__logoutRelease?:()=>void};
  34 |     window.caches.keys=()=>new Promise<string[]>(resolve=>{probe.__logoutRelease=()=>{void original().then(resolve);};});
  35 |   });
  36 |   await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  37 |   await page.getByLabel('Or get a sign-in link by email').fill('next-coach@e2e.coachcore.test');
  38 |   await afterSignOutNavigation(page,async()=>{await page.evaluate(()=>(window as unknown as {__logoutRelease:()=>void}).__logoutRelease());});
> 39 |   await expect(page.getByLabel('Or get a sign-in link by email')).toHaveValue('next-coach@e2e.coachcore.test');
     |                                                                   ^ Error: expect(locator).toHaveValue(expected) failed
  40 | });
  41 | 
  42 | for(const foreground of [false,true])test(`${foreground?'foreground':'background'} tab reload preserves its own draft and rejects stale revision`,async({page,context})=>{
  43 |   await coach(page,foreground?'foreground':'background');await createTeamViaUI(page,'Navigation team');await openTab(page,'Practice Plans');
  44 |   await page.getByLabel('Plan.name',{exact:true}).fill('Original');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  45 |   const second=await context.newPage();second.on('dialog',async d=>{console.info('SECOND DIALOG',d.type());await d.accept();});
  46 |   try{
  47 |     await second.goto('/');await openTab(second,'Practice Plans');await second.getByRole('button',{name:'Open Original',exact:true}).click();await second.getByLabel('Plan.name',{exact:true}).fill('Second editor');
  48 |     await page.bringToFront();await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  49 |     if(foreground)await second.bringToFront();
  50 |     console.info('VISIBILITY',await second.evaluate(()=>document.visibilityState));
  51 |     await second.reload();await openTab(second,'Practice Plans');await expect(second.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');
  52 |     await second.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(second.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();
  53 |     await expect(second.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');
  54 |   }finally{await second.close();}
  55 | });
  56 | 
```
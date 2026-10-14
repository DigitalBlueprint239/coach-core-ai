import {test,expect,type Page} from '../../e2e/node_modules/@playwright/test';
import {resetEmulators} from '../../e2e/tests/support/emulator';
import {coachEmail,skipOnboarding,signInAsBetaCoach,createTeamViaUI,openTab,signInScreen} from '../../e2e/tests/support/app';
import {afterSignOutNavigation} from './navigationCheckpoint';

test.beforeEach(async({page,context,browser,browserName})=>{
  console.info('ENGINE',browserName,browser.version());await resetEmulators();await skipOnboarding(context);
  page.on('dialog',async dialog=>{console.info('DIALOG',dialog.type());await dialog.accept();});
});
async function coach(page:Page,label:string){return signInAsBetaCoach(page,coachEmail(label));}

test('transitional sign-in visibility precedes logout navigation completion',async({page})=>{
  await coach(page,'logout-barrier');
  await page.evaluate(()=>{
    const original=window.caches.keys.bind(window.caches);
    const probe=window as unknown as {__logoutRelease?:()=>void;__logoutWaiting?:boolean;__coachingLogoutDocument?:boolean};
    probe.__coachingLogoutDocument=true;
    window.caches.keys=()=>new Promise<string[]>(resolve=>{probe.__logoutWaiting=true;probe.__logoutRelease=()=>{void original().then(resolve);};});
  });
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(signInScreen(page)).toBeVisible();
  expect(await page.evaluate(()=>(window as unknown as {__logoutWaiting:boolean}).__logoutWaiting)).toBe(true);
  expect(await page.evaluate(()=>(window as unknown as {__coachingLogoutDocument:boolean}).__coachingLogoutDocument)).toBe(true);
  await afterSignOutNavigation(page,async()=>{await page.evaluate(()=>(window as unknown as {__logoutRelease:()=>void}).__logoutRelease());});
  await expect(signInScreen(page)).toBeVisible();
  await coach(page,'after-barrier');
});

test('sign-in entered during pending logout is preserved after navigation',async({page})=>{
  await coach(page,'input-barrier');
  await page.evaluate(()=>{
    const original=window.caches.keys.bind(window.caches);
    const probe=window as unknown as {__logoutRelease?:()=>void};
    window.caches.keys=()=>new Promise<string[]>(resolve=>{probe.__logoutRelease=()=>{void original().then(resolve);};});
  });
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(signInScreen(page)).toBeVisible();
  await page.getByLabel('Or get a sign-in link by email').fill('next-coach@e2e.coachcore.test');
  await afterSignOutNavigation(page,async()=>{await page.evaluate(()=>(window as unknown as {__logoutRelease:()=>void}).__logoutRelease());});
  await expect(page.getByLabel('Or get a sign-in link by email')).toHaveValue('next-coach@e2e.coachcore.test');
});

for(const foreground of [false,true])test(`${foreground?'foreground':'background'} tab reload preserves its own draft and rejects stale revision`,async({page,context})=>{
  await coach(page,foreground?'foreground':'background');await createTeamViaUI(page,'Navigation team');await openTab(page,'Practice Plans');
  await page.getByLabel('Plan.name',{exact:true}).fill('Original');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
  const second=await context.newPage();second.on('dialog',async d=>{console.info('SECOND DIALOG',d.type());await d.accept();});
  try{
    await second.goto('/');await openTab(second,'Practice Plans');await second.getByRole('button',{name:'Open Original',exact:true}).click();await second.getByLabel('Plan.name',{exact:true}).fill('Second editor');
    await page.bringToFront();await page.getByLabel('Plan.name',{exact:true}).fill('Server first');await page.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(page.getByRole('status',{name:'Practice save status'})).toHaveText('saved');
    if(foreground)await second.bringToFront();
    console.info('VISIBILITY',await second.evaluate(()=>document.visibilityState));
    await second.reload();await openTab(second,'Practice Plans');await expect(second.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');
    await second.getByRole('button',{name:'Save practice plan',exact:true}).click();await expect(second.getByRole('alertdialog',{name:'Conflicting edits'})).toBeVisible();
    await expect(second.getByLabel('Plan.name',{exact:true})).toHaveValue('Second editor');
  }finally{await second.close();}
});

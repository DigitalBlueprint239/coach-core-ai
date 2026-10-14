import type {Page} from '../../e2e/node_modules/@playwright/test';

/** Wait for the application-owned logout reload, not merely its transitional UI. */
export async function afterSignOutNavigation(page:Page,finish:()=>Promise<void>):Promise<void>{
  await page.evaluate(()=>{(window as unknown as {__coachingLogoutDocument?:boolean}).__coachingLogoutDocument=true;});
  await finish();
  await page.waitForFunction(()=>!(window as unknown as {__coachingLogoutDocument?:boolean}).__coachingLogoutDocument&&document.readyState==='complete');
}

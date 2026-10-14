# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-gateway.spec.ts >> E2E-AI01b [SDK-in-browser] the app's AI client reaches the emulated gateway, which refuses with ai-disabled (browser-side: no provider request; server-side provider not observable here)
- Location: e2e\tests\ai-gateway.spec.ts:28:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "code": "unavailable",
+   "code": "internal",
    "ok": false,
-   "reason": "ai-disabled",
+   "reason": "ai-unavailable",
  }
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
            - text: AI Off Team
          - generic [ref=f1e19]:
            - generic [ref=f1e20]: Welcome, ai01b-mv8ls03r-2@e2e.coachcore.test
            - button "Sign out" [ref=f1e21]
      - navigation [ref=f1e22]:
        - generic [ref=f1e24]:
          - button "📊Overview" [ref=f1e25]
          - button "👥Teams" [ref=f1e26]
          - button "📋Practice Plans" [ref=f1e27]
          - button "🏈Smart Playbook" [ref=f1e28]
          - button "📈Analytics" [ref=f1e29]
      - main [ref=f1e30]:
        - generic [ref=f1e31]:
          - generic [ref=f1e32]:
            - heading "Team Management" [level=2] [ref=f1e33]
            - generic [ref=f1e34]:
              - button "Create Team" [ref=f1e35]
              - button "Join Team" [ref=f1e36]
          - generic [ref=f1e38]:
            - heading "Current Team" [level=3] [ref=f1e39]
            - generic [ref=f1e42]:
              - heading "AI Off Team" [level=4] [ref=f1e43]
              - paragraph [ref=f1e44]: "Code: 498BARYQ"
              - paragraph [ref=f1e45]: 1 member
  - generic [ref=f1e50]:
    - paragraph [ref=f1e55]: Team created successfully!
    - button [ref=f1e57]
```

# Test source

```ts
  1  | // AI stays OFF (founder instruction). Since #59 the Practice Planner no longer
  2  | // offers AI generation at all; the gateway kill switch is still checked through
  3  | // the app's own AI client against the emulated function (placeholder key).
  4  | import { test, expect } from '@playwright/test';
  5  | import { resetEmulators, AUTH_ONLY } from './support/emulator';
  6  | import { coachEmail, skipOnboarding, signInAsBetaCoach, createTeamViaUI, openTab, storage, waitForE2EHooks } from './support/app';
  7  |
  8  | test.beforeEach(async ({ context }) => {
  9  |   test.skip(AUTH_ONLY, 'needs the Firestore and Functions emulators');
  10 |   await resetEmulators();
  11 |   await skipOnboarding(context);
  12 | });
  13 |
  14 | test('E2E-AI01 practice planner offers no AI generation and makes no AI request while a plan is created and saved', async ({ page }) => {
  15 |   const calls: string[] = [];
  16 |   page.on('request', (r) => { if (/\/coachAI|openai\.com|generativelanguage|anthropic\.com/.test(r.url())) calls.push(r.url()); });
  17 |   await signInAsBetaCoach(page, coachEmail('ai01'));
  18 |   await createTeamViaUI(page, 'AI Off Team');
  19 |   await openTab(page, 'Practice Plans');
  20 |   await expect(page.getByText('AI generation is disabled.')).toBeVisible();
  21 |   await expect(page.getByRole('button', { name: /Generate|AI/ })).toHaveCount(0);
  22 |   await page.getByLabel('Plan.name', { exact: true }).fill('Manual plan');
  23 |   await page.getByRole('button', { name: 'Save practice plan', exact: true }).click();
  24 |   await expect(page.getByRole('status', { name: 'Practice save status' })).toHaveText('saved');
  25 |   expect(calls).toEqual([]);
  26 | });
  27 |
  28 | test('E2E-AI01b [SDK-in-browser] the app\'s AI client reaches the emulated gateway, which refuses with ai-disabled (browser-side: no provider request; server-side provider not observable here)', async ({ page }) => {
  29 |   const provider: string[] = [];
  30 |   const gateway: number[] = [];
  31 |   page.on('request', (r) => { if (/openai\.com|generativelanguage|anthropic\.com/.test(r.url())) provider.push(r.url()); });
  32 |   page.on('response', (r) => { if (r.url().includes('/coachAI') && r.request().method() === 'POST') gateway.push(r.status()); });
  33 |   await signInAsBetaCoach(page, coachEmail('ai01b'));
  34 |   await createTeamViaUI(page, 'AI Off Team');
  35 |   const teamId = (await storage(page)).currentTeamId;
  36 |   await waitForE2EHooks(page);
  37 |   const r = await page.evaluate((t) => (window as any).__coachCoreE2E.coachAI(t), teamId);
> 38 |   expect(r).toEqual({ ok: false, code: 'unavailable', reason: 'ai-disabled' });
     |             ^ Error: expect(received).toEqual(expected) // deep equality
  39 |   expect(gateway.length).toBeGreaterThan(0);
  40 |   expect(provider).toEqual([]);
  41 | });
  42 |
```

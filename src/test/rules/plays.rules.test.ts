// src/test/rules/plays.rules.test.ts
// Firestore rules tests for tiered access to plays create

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
/* eslint-disable @typescript-eslint/no-var-requires */
declare const require: any;

let testing: any = null;

const PROJECT_ID = 'demo-project';

async function loadRules(rules: string) {
  if (!testing) return;
  await testing.loadFirestoreRules({ projectId: PROJECT_ID, rules });
}

function getAuthedDb(uid: string) {
  if (!testing) throw new Error('rules-unit-testing not available');
  return testing.initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: 'localhost', port: 8080 },
  }).then(env => env.authenticatedContext(uid).firestore());
}

// Conditionally run only if rules-unit-testing is available
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  testing = require('@firebase/rules-unit-testing');
} catch {
  testing = null;
}

const maybe = testing ? describe : describe.skip;

maybe('Firestore rules: plays create tier limits', () => {
  beforeAll(async () => {
    if (!testing) return;
    const fs = await import('fs');
    const path = await import('path');
    const rulesPath = path.resolve(process.cwd(), 'firestore.rules.enhanced');
    const rules = fs.readFileSync(rulesPath, 'utf8');
    await loadRules(rules);
  });

  afterAll(async () => {
    if (!testing) return;
    await testing.clearFirestoreData({ projectId: PROJECT_ID });
    await testing.deleteTestEnvironment(await testing.initializeTestEnvironment({ projectId: PROJECT_ID }));
  });

  it('allows pro user to create plays', async () => {
    if (!testing) return;
    const db = await getAuthedDb('user_pro');
    const admin = testing.initializeAdminApp({ projectId: PROJECT_ID }).firestore();

    // Seed subscriptions/user and team membership requirement (team doc)
    await admin.doc('subscriptions/user_pro').set({ plan: 'pro', status: 'active' });
    await admin.doc('teams/team1').set({ headCoachId: 'user_pro', assistantCoachIds: [] });

    const playsRef = db.collection('plays');
    await expect(playsRef.add({ teamId: 'team1', title: 'Pro Play' })).resolves.toBeDefined();
  });

  it('allows free user under limit to create but denies at limit', async () => {
    if (!testing) return;
    const db = await getAuthedDb('user_free');
    const admin = testing.initializeAdminApp({ projectId: PROJECT_ID }).firestore();

    // No pro subscription
    await admin.doc('teams/team2').set({ headCoachId: 'user_free', assistantCoachIds: [] });

    // Under limit: savedPlaysThisMonth = 2
    await admin.doc('usage/user_free').set({ savedPlaysThisMonth: 2 });
    const playsRef = db.collection('plays');
    await expect(playsRef.add({ teamId: 'team2', title: 'Free Play OK' })).resolves.toBeDefined();

    // At limit: = 3
    await admin.doc('usage/user_free').set({ savedPlaysThisMonth: 3 });
    await expect(playsRef.add({ teamId: 'team2', title: 'Should Fail' })).rejects.toBeDefined();
  });
});

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const workflowDir = '.github/workflows';
const workflows = Object.fromEntries(readdirSync(workflowDir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => [name, readFileSync(workflowDir + '/' + name, 'utf8').replace(/\r\n/g, '\n')]));
const production = workflows['deploy-production.yml'];
const rules = workflows['release-firebase-rules.yml'];

const sha = 'a'.repeat(40);
const prodProvider = 'projects/384023691487/locations/global/workloadIdentityPools/github/providers/actions';
const github = {
  GITHUB_ACTIONS: 'true',
  GITHUB_REPOSITORY: 'DigitalBlueprint239/coach-core-ai',
  GITHUB_REPOSITORY_ID: '1018633922',
  GITHUB_REPOSITORY_OWNER_ID: '206572958',
  GITHUB_REF: 'refs/heads/recovery/coach-core-mvp-2026',
  GITHUB_EVENT_NAME: 'workflow_dispatch',
};
const clean = () => Object.fromEntries(Object.entries(process.env)
  .filter(([key]) => !/^(GITHUB_|PROD_|STAGING_|RULES_|REACT_APP_|TARGET$|SURFACE$|REF$|CONFIRM$)/.test(key)));
const node = (script, args, env) => spawnSync(process.execPath, [script, ...args], { env: { ...clean(), ...env }, encoding: 'utf8' });

const prodEnv = {
  ...github,
  REACT_APP_DEPLOY_ENV: 'production',
  REACT_APP_FIREBASE_API_KEY: 'production-firebase-web-key',
  REACT_APP_FIREBASE_AUTH_DOMAIN: 'coach-core-ai.firebaseapp.com',
  REACT_APP_FIREBASE_PROJECT_ID: 'coach-core-ai',
  REACT_APP_FIREBASE_STORAGE_BUCKET: 'coach-core-ai.appspot.com',
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '384023691487',
  REACT_APP_FIREBASE_APP_ID: '1:384023691487:web:abcdef',
};
const prodPreflight = (overrides = {}) => node('scripts/assert-firebase-deploy-env.mjs', ['production'], { ...prodEnv, ...overrides });

test('production release is manual, owner-gated, hosting-only and bound to the recovery branch', () => {
  assert.match(production, /^on:\n  workflow_dispatch:/m);
  assert.ok(!/^\s+(push|pull_request|pull_request_target|schedule):/m.test(production));
  assert.ok(production.includes('environment: production'));
  assert.ok(production.includes('replace-live-site'));
  assert.ok(production.includes('merge-base --is-ancestor "$REF" origin/recovery/coach-core-mvp-2026'));
  assert.ok(production.includes('persist-credentials: false'));
  assert.ok(production.includes('--only hosting:production --project coach-core-ai'));
  assert.ok(production.includes('GITHUB_STEP_SUMMARY'));
});

test('production preflight accepts only a manual run of the protected branch in this repository', () => {
  assert.equal(prodPreflight().status, 0, prodPreflight().stderr);
  for (const bad of [
    { GITHUB_EVENT_NAME: 'push' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF: 'refs/heads/master' },
    { GITHUB_REF: 'refs/pull/1/merge' },
    { GITHUB_REPOSITORY_ID: '1' },
    { GITHUB_REPOSITORY_OWNER_ID: '1' },
    { GITHUB_REPOSITORY: 'someone/coach-core-ai' },
    { REACT_APP_FIREBASE_PROJECT_ID: 'coach-core-mvp-staging-239', REACT_APP_FIREBASE_AUTH_DOMAIN: 'coach-core-mvp-staging-239.firebaseapp.com', REACT_APP_FIREBASE_STORAGE_BUCKET: 'coach-core-mvp-staging-239.appspot.com' },
  ]) {
    assert.notEqual(prodPreflight(bad).status, 0, JSON.stringify(bad));
  }
});

test('a keyless production identity must be complete and live in the production project', () => {
  const account = 'hosting-release@coach-core-ai.iam.gserviceaccount.com';
  assert.equal(prodPreflight({ PROD_WIF_PROVIDER: prodProvider, PROD_DEPLOY_SERVICE_ACCOUNT: account }).status, 0);
  for (const bad of [
    { PROD_WIF_PROVIDER: prodProvider },
    { PROD_DEPLOY_SERVICE_ACCOUNT: account },
    { PROD_WIF_PROVIDER: 'not-a-provider', PROD_DEPLOY_SERVICE_ACCOUNT: account },
    { PROD_WIF_PROVIDER: prodProvider, PROD_DEPLOY_SERVICE_ACCOUNT: 'hosting@coach-core-mvp-staging-239.iam.gserviceaccount.com' },
  ]) {
    assert.notEqual(prodPreflight(bad).status, 0, JSON.stringify(bad));
  }
});

const rulesEnv = {
  ...github,
  TARGET: 'staging',
  SURFACE: 'firestore:rules',
  REF: sha,
  CONFIRM: 'release-rules-to-staging',
  RULES_PROJECT_ID: 'coach-core-mvp-staging-239',
  RULES_WIF_PROVIDER: 'projects/792889984377/locations/global/workloadIdentityPools/github/providers/actions',
  RULES_SERVICE_ACCOUNT: 'rules-release@coach-core-mvp-staging-239.iam.gserviceaccount.com',
};
const rulesPreflight = (overrides = {}) => node('scripts/assert-rules-release.mjs', [], { ...rulesEnv, ...overrides });

test('rules release preflight passes only for one rules surface with a matching keyless identity', () => {
  assert.equal(rulesPreflight().status, 0, rulesPreflight().stderr);
  assert.equal(rulesPreflight({ SURFACE: 'storage' }).status, 0);
  assert.equal(rulesPreflight({
    TARGET: 'production', CONFIRM: 'release-rules-to-production', RULES_PROJECT_ID: 'coach-core-ai',
    RULES_WIF_PROVIDER: prodProvider, RULES_SERVICE_ACCOUNT: 'rules-release@coach-core-ai.iam.gserviceaccount.com',
  }).status, 0);
});

test('rules release preflight fails closed', () => {
  for (const bad of [
    { SURFACE: 'hosting' },
    { SURFACE: 'functions' },
    { SURFACE: 'firestore' }, // would also deploy indexes
    { SURFACE: 'firestore:rules,hosting' },
    { SURFACE: '' },
    { CONFIRM: 'release-rules-to-production' },
    { REF: 'recovery/coach-core-mvp-2026' },
    { RULES_PROJECT_ID: 'coach-core-ai' }, // staging pointed at production
    { RULES_PROJECT_ID: '' },
    { RULES_WIF_PROVIDER: '' }, // not provisioned: no stored-key fallback
    { RULES_SERVICE_ACCOUNT: '' },
    { RULES_SERVICE_ACCOUNT: 'rules-release@coach-core-ai.iam.gserviceaccount.com' },
    { TARGET: 'production', CONFIRM: 'release-rules-to-production' }, // production target, staging project
    { GITHUB_EVENT_NAME: 'push' },
    { GITHUB_REF: 'refs/heads/master' },
    { GITHUB_REPOSITORY_ID: '1' },
  ]) {
    assert.notEqual(rulesPreflight(bad).status, 0, JSON.stringify(bad));
  }
});

test('rules release workflow is manual, keyless, tested first and never touches hosting or functions', () => {
  assert.match(rules, /^on:\n  workflow_dispatch:/m);
  assert.ok(!/^\s+(push|pull_request|pull_request_target|schedule):/m.test(rules));
  assert.ok(rules.includes("inputs.target == 'production' && 'production' || 'firebase-staging'"));
  assert.ok(rules.includes('persist-credentials: false'));
  assert.ok(rules.indexOf('assert-rules-release.mjs') < rules.indexOf('google-github-actions/auth@v3'));
  assert.ok(rules.indexOf('npm run test:rules') < rules.indexOf('firebase deploy'));
  assert.ok(rules.includes('firebase deploy --only "$SURFACE" --project "$RULES_PROJECT_ID"'));
  assert.ok(!rules.includes('secrets.'));
});

test('no workflow uses the legacy CLI token, a broad deploy, or a fork-writable trigger', () => {
  for (const [name, text] of Object.entries(workflows)) {
    assert.ok(!text.includes('FIREBASE_TOKEN'), name + ' references FIREBASE_TOKEN');
    assert.ok(!text.includes('pull_request_target'), name + ' uses pull_request_target');
    for (const line of text.split('\n').filter((l) => /firebase(-tools)?\s+deploy/.test(l) && !l.trim().startsWith('#'))) {
      assert.ok(line.includes('--only '), name + ' has a firebase deploy without --only: ' + line.trim());
      assert.ok(line.includes('--project '), name + ' has a firebase deploy without --project: ' + line.trim());
      assert.ok(!/--only\s+"?functions/.test(line), name + ' deploys functions: ' + line.trim());
    }
  }
});

test('the stored production key is confined to the manual, owner-gated production release', () => {
  const users = Object.entries(workflows).filter(([, text]) => text.includes('FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI')).map(([name]) => name);
  assert.deepEqual(users, ['deploy-production.yml']);
  assert.equal(production.split('FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI').length - 1, 1);
  assert.ok(production.includes("if: ${{ vars.PROD_WIF_PROVIDER == '' }}"));
});

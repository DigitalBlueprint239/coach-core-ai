import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { test } from 'node:test';

const stage = 'coach-core-ai-stage-test';
const base = {
  REACT_APP_FIREBASE_API_KEY: 'staging-firebase-web-key',
  REACT_APP_FIREBASE_AUTH_DOMAIN: stage + '.firebaseapp.com',
  REACT_APP_FIREBASE_PROJECT_ID: stage,
  REACT_APP_FIREBASE_STORAGE_BUCKET: stage + '.firebasestorage.app',
  REACT_APP_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  REACT_APP_FIREBASE_APP_ID: '1:123456789:web:abcdef',
  REACT_APP_DEPLOY_ENV: 'staging',
  REACT_APP_AI_ENABLED: 'false',
  STAGING_FIREBASE_PROJECT_ID: stage,
  STAGING_WIF_PROVIDER: 'projects/123456789/locations/global/workloadIdentityPools/github/providers/actions',
  STAGING_DEPLOY_SERVICE_ACCOUNT: 'hosting@' + stage + '.iam.gserviceaccount.com',
};
const run = (mode, overrides = {}) => spawnSync(process.execPath,
  ['scripts/assert-firebase-deploy-env.mjs', mode],
  { env: { ...process.env, ...base, ...overrides }, encoding: 'utf8' });

test('valid isolated staging config passes static preflight', () => {
  const result = run('staging');
  assert.equal(result.status, 0, result.stderr);
});

test('production Firebase project is never accepted as staging', () => {
  const result = run('staging', {
    REACT_APP_FIREBASE_PROJECT_ID: 'coach-core-ai',
    REACT_APP_FIREBASE_AUTH_DOMAIN: 'coach-core-ai.firebaseapp.com',
    REACT_APP_FIREBASE_STORAGE_BUCKET: 'coach-core-ai.appspot.com',
  });
  assert.notEqual(result.status, 0);
});

test('mismatched staging deployment, auth domain, bucket or cloud identity fail closed', () => {
  for (const override of [
    { STAGING_FIREBASE_PROJECT_ID: 'other-staging-project' },
    { REACT_APP_FIREBASE_AUTH_DOMAIN: 'coach-core-ai.firebaseapp.com' },
    { REACT_APP_FIREBASE_STORAGE_BUCKET: 'coach-core-ai.appspot.com' },
    { STAGING_DEPLOY_SERVICE_ACCOUNT: 'hosting@coach-core-ai.iam.gserviceaccount.com' },
    { REACT_APP_AI_ENABLED: 'true' },
  ]) {
    assert.notEqual(run('staging', override).status, 0, JSON.stringify(override));
  }
});

test('production preflight refuses nonproduction project ID', () => {
  const result = run('production', { REACT_APP_DEPLOY_ENV: 'production' });
  assert.notEqual(result.status, 0);
});

test('staging Hosting config contains no backend deployment targets', () => {
  const configFile = '.firebase.staging.generated.json';
  try {
    const result = spawnSync(process.execPath, ['scripts/prepare-staging-hosting-config.mjs'],
      { env: { ...process.env, STAGING_FIREBASE_PROJECT_ID: stage }, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const json = JSON.parse(readFileSync(configFile, 'utf8'));
    assert.deepEqual(Object.keys(json), ['hosting']);
    assert.equal(json.hosting.public, 'build');
    assert.equal(json.hosting.target, undefined);
    assert.ok(json.hosting.headers.some(h => h.headers.some(v => v.key === 'X-Robots-Tag')));
    const prod = JSON.parse(readFileSync('firebase.json', 'utf8'));
    assert.deepEqual(prod.hosting.map(h => h.target), ['production']);
    const rc = JSON.parse(readFileSync('.firebaserc', 'utf8'));
    assert.equal(rc.projects.default, undefined);
  } finally {
    if (existsSync(configFile)) unlinkSync(configFile);
  }
});

test('staging workflows cannot reference production service account or fixed production project', () => {
  for (const path of ['.github/workflows/deploy-staging.yml', '.github/workflows/firebase-preview.yml']) {
    const content = readFileSync(path, 'utf8');
    assert.ok(content.includes('environment: firebase-staging'), path);
    assert.ok(content.includes('STAGING_FIREBASE_PROJECT_ID'), path);
    assert.ok(content.includes('assert-firebase-deploy-env.mjs'), path);
    assert.ok(!content.includes('FIREBASE_SERVICE_ACCOUNT_COACH_CORE_AI'), path);
    assert.ok(!content.includes('projectId: coach-core-ai'), path);
  }
});

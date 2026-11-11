#!/usr/bin/env node
// Preflight for .github/workflows/release-firebase-rules.yml. No cloud API calls; fails closed.
const productionProject = 'coach-core-ai';
const problems = [];
const get = (key) => (process.env[key] || '').trim();

const target = get('TARGET');
const surface = get('SURFACE');
const projectId = get('RULES_PROJECT_ID');
const provider = get('RULES_WIF_PROVIDER');
const serviceAccount = get('RULES_SERVICE_ACCOUNT');

if (!['staging', 'production'].includes(target)) problems.push('TARGET must be staging or production.');
// Exactly one rules surface. Anything else (hosting, functions, indexes, a comma list) is refused.
if (!['firestore:rules', 'storage'].includes(surface)) problems.push('SURFACE must be firestore:rules or storage.');
if (get('CONFIRM') !== 'release-rules-to-' + target) problems.push('Confirmation phrase does not match the target.');
if (!/^[0-9a-f]{40}$/.test(get('REF'))) problems.push('REF must be a full commit SHA.');

if (!projectId) problems.push('No Firebase project is configured for this target.');
if (target === 'production' && projectId !== productionProject) problems.push('Production rules go to the production project only.');
if (target === 'staging' && projectId === productionProject) problems.push('Staging must never be the production project.');

if (!provider || !serviceAccount) {
  problems.push('No keyless rules identity is provisioned for ' + target + '. This workflow has no stored-key fallback.');
} else {
  if (!/^projects\/[0-9]+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/.test(provider)) {
    problems.push('Invalid WIF provider resource name.');
  }
  if (projectId && !serviceAccount.endsWith('@' + projectId + '.iam.gserviceaccount.com')) {
    problems.push('The rules identity must be a service account in the target project.');
  }
}

if (get('GITHUB_ACTIONS') === 'true') {
  if (get('GITHUB_REPOSITORY') !== 'DigitalBlueprint239/coach-core-ai') problems.push('GitHub repository identity mismatch.');
  if (get('GITHUB_REPOSITORY_ID') !== '1018633922') problems.push('Unexpected GitHub repository ID.');
  if (get('GITHUB_REPOSITORY_OWNER_ID') !== '206572958') problems.push('Unexpected GitHub owner ID.');
  if (get('GITHUB_REF') !== 'refs/heads/recovery/coach-core-mvp-2026') problems.push('Rules releases must be started from the protected recovery branch.');
  if (get('GITHUB_EVENT_NAME') !== 'workflow_dispatch') problems.push('Rules releases are manual only.');
}

if (problems.length) {
  for (const problem of problems) console.error('rules-release: ' + problem);
  process.exit(1);
}
console.log('rules-release: verified ' + surface + ' for ' + target + '; project=' + projectId + '.');

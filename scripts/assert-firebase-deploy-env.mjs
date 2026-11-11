#!/usr/bin/env node
// Strict deploy preflight. No cloud API calls. Never default to the production project.
const mode = process.argv[2];
const productionProject = 'coach-core-ai';
const validModes = new Set(['staging', 'preview', 'production']);
const problems = [];
const get = (key) => (process.env[key] || '').trim();
const required = (key) => {
  const value = get(key);
  if (!value || /^(your[-_]|replace[-_]|todo$|changeme$)/i.test(value)) {
    problems.push('Missing or placeholder: ' + key);
  }
  return value;
};
if (!validModes.has(mode)) problems.push('Expected staging, preview, or production mode.');
if (get('REACT_APP_DEPLOY_ENV') !== mode) problems.push('REACT_APP_DEPLOY_ENV must be exactly ' + mode);
const projectId = required('REACT_APP_FIREBASE_PROJECT_ID');
const apiKey = required('REACT_APP_FIREBASE_API_KEY');
const authDomain = required('REACT_APP_FIREBASE_AUTH_DOMAIN');
const storageBucket = required('REACT_APP_FIREBASE_STORAGE_BUCKET');
const appId = required('REACT_APP_FIREBASE_APP_ID');
const senderId = required('REACT_APP_FIREBASE_MESSAGING_SENDER_ID');
if (projectId && !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) problems.push('Invalid Firebase project ID format.');
if (projectId && authDomain !== projectId + '.firebaseapp.com') problems.push('Auth domain must belong to the selected project.');
if (projectId && ![projectId + '.firebasestorage.app', projectId + '.appspot.com'].includes(storageBucket)) {
  problems.push('Storage bucket must be the default bucket of the selected project.');
}
if (mode === 'production') {
  if (projectId !== productionProject) problems.push('Production must use the explicitly approved production project.');
  // Keyless production deploys are optional until provisioned, but a half-configured or foreign identity fails closed.
  const prodProvider = get('PROD_WIF_PROVIDER');
  const prodAccount = get('PROD_DEPLOY_SERVICE_ACCOUNT');
  if (Boolean(prodProvider) !== Boolean(prodAccount)) problems.push('PROD_WIF_PROVIDER and PROD_DEPLOY_SERVICE_ACCOUNT must be set together.');
  if (prodProvider && !/^projects\/[0-9]+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/.test(prodProvider)) {
    problems.push('Invalid production WIF provider resource name.');
  }
  if (prodAccount && !prodAccount.endsWith('@' + productionProject + '.iam.gserviceaccount.com')) {
    problems.push('Production deployment identity must be a service account in the production project.');
  }
} else {
  const stagingId = required('STAGING_FIREBASE_PROJECT_ID');
  if (projectId === productionProject || stagingId === productionProject) problems.push('Staging and previews must never use production.');
  if (projectId && stagingId && projectId !== stagingId) problems.push('Build project ID and staging deploy project ID disagree.');
  const provider = required('STAGING_WIF_PROVIDER');
  const serviceAccount = required('STAGING_DEPLOY_SERVICE_ACCOUNT');
  if (provider && !/^projects\/[0-9]+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/.test(provider)) {
    problems.push('Invalid WIF provider resource name.');
  }
  if (serviceAccount && stagingId && !serviceAccount.endsWith('@' + stagingId + '.iam.gserviceaccount.com')) {
    problems.push('Deployment identity must be a service account in the staging project.');
  }
  if (get('REACT_APP_AI_ENABLED') !== 'false') problems.push('Staging AI calls must explicitly remain disabled.');
}
if (get('GITHUB_REPOSITORY') && get('GITHUB_REPOSITORY') !== 'DigitalBlueprint239/coach-core-ai') {
  problems.push('GitHub repository identity mismatch.');
}
// A staging deployment may only originate from the protected recovery branch.
// The WIF provider MUST independently enforce the same repository ID, owner ID,
// ref, event, workflow, and environment claims: client-side checks alone are not IAM.
if (mode === 'staging' && get('GITHUB_ACTIONS') === 'true') {
  if (get('GITHUB_REPOSITORY_ID') !== '1018633922') problems.push('Unexpected GitHub repository ID.');
  if (get('GITHUB_REPOSITORY_OWNER_ID') !== '206572958') problems.push('Unexpected GitHub owner ID.');
  if (get('GITHUB_REF') !== 'refs/heads/recovery/coach-core-mvp-2026') problems.push('Staging deploys require the protected recovery branch.');
  if (!['push', 'workflow_dispatch'].includes(get('GITHUB_EVENT_NAME'))) problems.push('Staging deploy event is not allowed.');
}
// A production release is a manual run of the protected recovery branch in this exact repository.
if (mode === 'production' && get('GITHUB_ACTIONS') === 'true') {
  if (get('GITHUB_REPOSITORY_ID') !== '1018633922') problems.push('Unexpected GitHub repository ID.');
  if (get('GITHUB_REPOSITORY_OWNER_ID') !== '206572958') problems.push('Unexpected GitHub owner ID.');
  if (get('GITHUB_REF') !== 'refs/heads/recovery/coach-core-mvp-2026') problems.push('Production releases must be started from the protected recovery branch.');
  if (get('GITHUB_EVENT_NAME') !== 'workflow_dispatch') problems.push('Production releases are manual only.');
}
if (problems.length) {
  for (const problem of problems) console.error('firebase-isolation: ' + problem);
  process.exit(1);
}
console.log('firebase-isolation: configuration verified for ' + mode + '; project=' + projectId + '.');

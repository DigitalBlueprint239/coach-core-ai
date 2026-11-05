#!/usr/bin/env node
// Prevent accidental reintroduction of the wrong build system or browser-exposed secret examples.
// This verifies repository configuration, NOT application behavior, dependencies or deployment safety.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.env.COACH_CORE_STACK_ROOT || process.cwd();
const read = (name) => readFileSync(resolve(root, name), 'utf8');
const issues = [];
const pkg = JSON.parse(read('package.json'));
const vite = read('vite.config.ts');
const html = read('index.html');
const env = read('env.production.example');

if (!pkg.dependencies?.react || !pkg.dependencies?.['react-dom']) issues.push('React runtime is missing');
if (!pkg.devDependencies?.vite || !pkg.devDependencies?.['@vitejs/plugin-react']) issues.push('Vite React build tool is missing');
if (pkg.dependencies?.['react-scripts'] || pkg.devDependencies?.['react-scripts']) issues.push('Do not restore legacy react-scripts');
if (!/^vite(?:\s|$)/.test(pkg.scripts?.dev || '')) issues.push('npm run dev must start Vite');
if (!/\bvite build\b/.test(pkg.scripts?.build || '')) issues.push('npm run build must use Vite');
if (!/\bvitest run\b/.test(pkg.scripts?.test || '')) issues.push('npm test must run Vitest');
if (!/envPrefix:\s*['"]REACT_APP_['"]/.test(vite)) issues.push('Keep legacy REACT_APP_ env prefix until explicitly migrated');
if (!/outDir:\s*['"]build['"]/.test(vite)) issues.push('Firebase Hosting expects Vite output in build/');
if (!/src\/index\.tsx/.test(html)) issues.push('App HTML entry should reference src/index.tsx');

const names = new Set();
for (const line of env.split(/\r?\n/)) {
  const stripped = line.trim();
  if (!stripped || stripped.startsWith('#')) continue;
  const m = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(stripped);
  if (!m) { issues.push('Invalid env example assignment'); continue; }
  const name = m[1];
  if (!name.startsWith('REACT_APP_')) issues.push('Unsupported example environment prefix: ' + name);
  if (/(OPENAI_API_KEY|GEMINI_API_KEY|ANTHROPIC_API_KEY|SENTRY_AUTH_TOKEN|SERVICE_ACCOUNT|FIREBASE_ADMIN|CLIENT_SECRET|PRIVATE_KEY)/i.test(name)) {
    issues.push('Sensitive credential name must never be in client env example: ' + name);
  }
  if (names.has(name)) issues.push('Duplicate env example key: ' + name);
  names.add(name);
}
for (const name of ['REACT_APP_FIREBASE_API_KEY','REACT_APP_FIREBASE_AUTH_DOMAIN','REACT_APP_FIREBASE_PROJECT_ID','REACT_APP_FIREBASE_APP_ID']) {
  if (!names.has(name)) issues.push('Missing required Firebase web configuration example: ' + name);
}
if (issues.length) {
  for (const issue of issues) console.error('check:stack: ' + issue);
  process.exitCode = 1;
} else {
  console.log('check:stack passed: React + Vite, Firebase output, and public environment example are internally consistent.');
}

#!/usr/bin/env node
// Generate a Hosting-only staging configuration. Rules and Functions can never be deployed by this config.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const project = (process.env.STAGING_FIREBASE_PROJECT_ID || '').trim();
if (!project || project === 'coach-core-ai') {
  console.error('Staging project ID is missing or refers to production.');
  process.exit(1);
}
const source = JSON.parse(readFileSync(resolve(root, 'firebase.staging.template.json'), 'utf8'));
const staging = source.hosting;
if (!staging || Array.isArray(staging) || staging.public !== 'build' || staging.target || staging.site || Object.keys(source).some((key) => key !== 'hosting')) {
  console.error('Could not find the approved staging Hosting configuration.');
  process.exit(1);
}
const { target: _unused, site: _site, ...hosting } = staging;
hosting.headers = [
  ...(hosting.headers || []),
  { source: '**', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
];
const destination = resolve(root, '.firebase.staging.generated.json');
writeFileSync(destination, JSON.stringify({ hosting }, null, 2) + '\n', { flag: 'w' });
console.log('Generated staging-only Hosting configuration (no database, Storage rules, or Functions deploy targets).');

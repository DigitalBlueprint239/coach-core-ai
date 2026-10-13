#!/usr/bin/env node
/* eslint-disable no-console */
// Prebuild guard (Day 2, F-01).
//
// Create React App copies EVERY `REACT_APP_*` variable present at build time
// into the browser bundle — not only the ones the code reads (an unresolved
// `process.env.X` access inlines the whole object). So any secret placed in a
// REACT_APP_* variable is public, no matter what the source code does.
//
// This script fails the build if a REACT_APP_* variable looks like a secret
// or an AI-provider credential. It prints variable NAMES only, never values.

const ALLOWED_PUBLIC = new Set([
  // Firebase web config is a public identifier by design (restrict it in GCP).
  'REACT_APP_FIREBASE_API_KEY',
  // Web Push VAPID *public* key.
  'REACT_APP_VAPID_PUBLIC_KEY',
]);

const SUSPICIOUS_NAME = /(SECRET|TOKEN|PASSWORD|PRIVATE|OPENAI|GEMINI|ANTHROPIC|CLAUDE|API_KEY|ACCESS_KEY)/i;
const SUSPICIOUS_VALUE = /(sk-(proj-|ant-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{36})/;

const offenders = [];
for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('REACT_APP_')) continue;
  if (ALLOWED_PUBLIC.has(name)) {
    if (SUSPICIOUS_VALUE.test(String(value))) offenders.push(`${name} (value looks like a private key)`);
    continue;
  }
  if (SUSPICIOUS_NAME.test(name)) offenders.push(name);
  else if (SUSPICIOUS_VALUE.test(String(value))) offenders.push(`${name} (value looks like a private key)`);
}

if (offenders.length > 0) {
  console.error('\n[security] Build blocked: these REACT_APP_* variables would be published in the browser bundle:');
  offenders.forEach((o) => console.error(`  - ${o}`));
  console.error('AI provider keys belong in Google Cloud Secret Manager (COACH_CORE_OPENAI_API_KEY),');
  console.error('used only by the coachAI Cloud Function. Remove these variables from the build environment.\n');
  process.exit(1);
}
console.log('[security] client env check passed: no secret-like REACT_APP_* variables.');

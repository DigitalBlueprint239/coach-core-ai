#!/usr/bin/env node
// Staging security probe: origin handling and invalid-token rejection.
// NOT run by CI. Run only after an approved staging deploy (smoke SEC-07/08/09).
//
// It sends no real credentials and causes no spend: every request is either a
// CORS preflight or carries a forged/malformed token that must be refused
// before the gateway runs (AI is also disabled at first deploy).
//
// Usage:
//   PROBE_PROJECT=coach-core-mvp-staging-239 PROBE_CONFIRM=coach-core-mvp-staging-239 \
//   PROBE_ALLOWED_ORIGIN=https://coach-core-mvp-staging-239.web.app \
//   node e2e/staging/gateway-probe.mjs
// Optional: PROBE_FUNCTIONS_BASE (default https://us-central1-<project>.cloudfunctions.net),
//           PROBE_API_KEY (the PUBLIC web API key, for the Firestore REST check).
// Self-test against the local emulator (expected to FAIL SEC-07/08 there):
//   PROBE_EMULATOR=1 PROBE_PROJECT=demo-coach-core-e2e node e2e/staging/gateway-probe.mjs
const project = process.env.PROBE_PROJECT || '';
const emulator = process.env.PROBE_EMULATOR === '1';
const ALLOWED_PROJECTS = ['coach-core-mvp-staging-239'];

if (emulator) {
  if (!project.startsWith('demo-')) throw new Error('emulator self-test needs a demo-* project');
} else {
  if (!ALLOWED_PROJECTS.includes(project)) throw new Error(`refusing: ${project || '(none)'} is not an approved staging project`);
  if (process.env.PROBE_CONFIRM !== project) throw new Error('refusing: set PROBE_CONFIRM to the project id to confirm');
}

const fnBase = process.env.PROBE_FUNCTIONS_BASE
  || (emulator ? `http://127.0.0.1:5001/${project}/us-central1` : `https://us-central1-${project}.cloudfunctions.net`);
const gateway = `${fnBase}/coachAI`;
const allowed = process.env.PROBE_ALLOWED_ORIGIN || (emulator ? 'http://localhost:3000' : `https://${project}.web.app`);
const unlisted = 'https://not-allowed.coachcore-probe.invalid';

// A token with valid JWT structure and plausible Firebase claims, signed with
// garbage. A real Firebase backend must reject it.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const forged = [
  b64({ alg: 'RS256', kid: 'forged-kid', typ: 'JWT' }),
  b64({
    iss: `https://securetoken.google.com/${project}`, aud: project, auth_time: now - 60,
    user_id: 'forged-uid', sub: 'forged-uid', iat: now - 60, exp: now + 3600,
    email: 'forged@probe.invalid', email_verified: true, beta: true,
    firebase: { identities: {}, sign_in_provider: 'password' },
  }),
  Buffer.from('not-a-real-signature').toString('base64url'),
].join('.');

const results = [];
const record = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id} -- ${detail}`); };

async function preflight(origin) {
  const r = await fetch(gateway, {
    method: 'OPTIONS',
    headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,authorization' },
  });
  return { status: r.status, acao: r.headers.get('access-control-allow-origin') };
}

async function callable(token) {
  const r = await fetch(gateway, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: allowed, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ data: { schemaVersion: 'coach-ai.v1', task: 'coach_assistant', teamId: 'probe', input: { question: 'probe' } } }),
  });
  let body = {};
  try { body = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, error: body?.error?.status, reason: body?.error?.details?.reason };
}

const a = await preflight(allowed);
record('SEC-09 allowed origin passes CORS', a.acao === allowed, `status ${a.status}, allow-origin=${a.acao}`);

const u = await preflight(unlisted);
record('SEC-07 unlisted origin refused by CORS', !u.acao || (u.acao !== unlisted && u.acao !== '*'), `status ${u.status}, allow-origin=${u.acao}`);

const f = await callable(forged);
record('SEC-08 forged ID token rejected', f.status === 401 && f.error === 'UNAUTHENTICATED', `status ${f.status}, ${f.error}/${f.reason}`);

const m = await callable('malformed.token');
record('SEC-08b malformed token rejected', m.status === 401 && m.error === 'UNAUTHENTICATED', `status ${m.status}, ${m.error}/${m.reason}`);

const n = await callable(null);
// No token: the gateway itself refuses. With AI disabled the kill switch answers
// first (ai-disabled); with AI enabled it must be sign-in-required.
record('SEC-08c no token refused', n.status >= 400 && ['ai-disabled', 'sign-in-required'].includes(n.reason), `status ${n.status}, ${n.error}/${n.reason}`);

if (!emulator && process.env.PROBE_API_KEY) {
  const doc = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/teams/probe`;
  const r = await fetch(`${doc}?key=${encodeURIComponent(process.env.PROBE_API_KEY)}`, { headers: { Authorization: `Bearer ${forged}` } });
  record('SEC-08d Firestore rejects forged token', r.status === 401, `status ${r.status}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`RESULT ${results.length - failed}/${results.length} passed${emulator ? ' (emulator self-test: SEC-07/08 are EXPECTED to fail here)' : ''}`);
process.exit(failed && !emulator ? 1 : 0);

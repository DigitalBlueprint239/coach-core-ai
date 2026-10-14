// Admin-side helpers that talk ONLY to the local Firebase emulators.
// "Bearer owner" is the emulators' built-in admin token; it is not a
// credential and is rejected by real Google endpoints.
export const PROJECT = process.env.E2E_PROJECT_ID || 'demo-coach-core-e2e';
if (!PROJECT.startsWith('demo-')) throw new Error('E2E tests only run against a demo-* project');

const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';
const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
export const AUTH_ONLY = process.env.E2E_AUTH_ONLY === '1';

async function call(url: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export async function resetEmulators(): Promise<void> {
  await call(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  if (!AUTH_ONLY) {
    await call(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  }
}

/** Latest email sign-in link the emulator "sent" to this address. */
export async function latestSignInLink(email: string): Promise<URL> {
  const { oobCodes = [] } = await call(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  const codes = oobCodes.filter((c: any) => c.email === email && c.requestType === 'EMAIL_SIGNIN');
  if (!codes.length) throw new Error(`no sign-in link recorded for ${email}`);
  // The emulator link points at its own action page; the real link lands on
  // the continue URL with the same parameters, which is what the app parses.
  const link = new URL(codes[codes.length - 1].oobLink);
  const target = new URL(link.searchParams.get('continueUrl') || 'http://localhost:3000/');
  for (const k of ['mode', 'oobCode', 'apiKey', 'lang']) {
    const v = link.searchParams.get(k);
    if (v) target.searchParams.set(k, v);
  }
  return target;
}

export async function lookupUid(email: string): Promise<string> {
  const r = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
    method: 'POST', headers: OWNER, body: JSON.stringify({ email: [email] }),
  });
  const uid = r.users?.[0]?.localId;
  if (!uid) throw new Error(`no emulator user ${email}`);
  return uid;
}

async function updateUser(uid: string, body: Record<string, unknown>): Promise<void> {
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
    method: 'POST', headers: OWNER, body: JSON.stringify({ localId: uid, ...body }),
  });
}

/** Equivalent of `functions/scripts/beta-access.js grant` against the emulator. */
export async function grantBeta(email: string): Promise<string> {
  const uid = await lookupUid(email);
  await updateUser(uid, { customAttributes: JSON.stringify({ beta: true }) });
  return uid;
}

export async function disableUser(email: string): Promise<void> {
  await updateUser(await lookupUid(email), { disableUser: true });
}

/** Creates a password user with an UNVERIFIED email (no UI path exists for this). */
export async function createUnverifiedPasswordUser(email: string, password: string): Promise<void> {
  await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-e2e-web-key`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
}

// ---- Firestore (admin, bypasses rules; used only for seeding and checks) ----
type Json = null | boolean | number | string | Json[] | { [k: string]: Json } | Date;
function toValue(v: Json): any {
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
}
function fromValue(v: any): any {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return v;
}
const docsUrl = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;

export async function adminSet(path: string, data: Record<string, Json>): Promise<void> {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
  await call(`${docsUrl}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
}

export async function adminGet(path: string): Promise<Record<string, any> | null> {
  const res = await fetch(`${docsUrl}/${path}`, { headers: OWNER });
  if (res.status === 404) return null;
  const d = await res.json();
  return Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromValue(v)]));
}

/** Documents in a collection where field == value (admin; includes update time). */
export async function adminQuery(collectionId: string, field: string, value: string): Promise<Array<{ id: string; updateTime: string; data: Record<string, any> }>> {
  const r = await call(`${docsUrl}:runQuery`, {
    method: 'POST', headers: OWNER,
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
    } }),
  });
  return r.filter((x: any) => x.document).map((x: any) => ({
    id: x.document.name.split('/').pop(),
    updateTime: x.document.updateTime,
    data: Object.fromEntries(Object.entries(x.document.fields || {}).map(([k, v]) => [k, fromValue(v)])),
  }));
}

/** Teams owned by uid, read with admin rights (ground truth for UI checks). */
export async function adminTeamsOwnedBy(uid: string): Promise<Array<{ id: string; name: string }>> {
  const r = await call(`${docsUrl}:runQuery`, {
    method: 'POST', headers: OWNER,
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'teams' }],
      where: { fieldFilter: { field: { fieldPath: 'ownerId' }, op: 'EQUAL', value: { stringValue: uid } } },
    } }),
  });
  return r.filter((x: any) => x.document).map((x: any) => ({
    id: x.document.name.split('/').pop(),
    name: x.document.fields?.name?.stringValue,
  }));
}

# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: coaching.spec.ts >> P10 P11 P12 P17 offline draft, refresh, sign-out cancellation and second-account isolation
- Location: tests\coaching-ui\coaching.spec.ts:23:5

# Error details

```
Error: no sign-in link recorded for coachB-mv81tjgh-4@e2e.coachcore.test
```

# Page snapshot

```yaml
- main [ref=f3e4]:
  - heading "Coach Core AI" [level=1] [ref=f3e5]
  - heading "Private beta sign-in" [level=2] [ref=f3e6]
  - button "Continue with Google" [ref=f3e7]
  - status [ref=f3e8]: Check coachB-mv81tjgh-4@e2e.coachcore.test for a sign-in link. Open it on this device to finish signing in.
  - paragraph [ref=f3e9]: Access is limited to invited coaches during the private beta.
```

# Test source

```ts
  1   | // Admin-side helpers that talk ONLY to the local Firebase emulators.
  2   | // "Bearer owner" is the emulators' built-in admin token; it is not a
  3   | // credential and is rejected by real Google endpoints.
  4   | export const PROJECT = process.env.E2E_PROJECT_ID || 'demo-coach-core-e2e';
  5   | if (!PROJECT.startsWith('demo-')) throw new Error('E2E tests only run against a demo-* project');
  6   | 
  7   | const AUTH = 'http://127.0.0.1:9099';
  8   | const FIRESTORE = 'http://127.0.0.1:8080';
  9   | const OWNER = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
  10  | export const AUTH_ONLY = process.env.E2E_AUTH_ONLY === '1';
  11  | 
  12  | async function call(url: string, init: RequestInit = {}): Promise<any> {
  13  |   const res = await fetch(url, init);
  14  |   const text = await res.text();
  15  |   if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} -> ${res.status} ${text.slice(0, 300)}`);
  16  |   return text ? JSON.parse(text) : {};
  17  | }
  18  | 
  19  | export async function resetEmulators(): Promise<void> {
  20  |   await call(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  21  |   if (!AUTH_ONLY) {
  22  |     await call(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  23  |   }
  24  | }
  25  | 
  26  | /** Latest email sign-in link the emulator "sent" to this address. */
  27  | export async function latestSignInLink(email: string): Promise<URL> {
  28  |   const { oobCodes = [] } = await call(`${AUTH}/emulator/v1/projects/${PROJECT}/oobCodes`);
  29  |   const codes = oobCodes.filter((c: any) => c.email === email && c.requestType === 'EMAIL_SIGNIN');
> 30  |   if (!codes.length) throw new Error(`no sign-in link recorded for ${email}`);
      |                            ^ Error: no sign-in link recorded for coachB-mv81tjgh-4@e2e.coachcore.test
  31  |   // The emulator link points at its own action page; the real link lands on
  32  |   // the continue URL with the same parameters, which is what the app parses.
  33  |   const link = new URL(codes[codes.length - 1].oobLink);
  34  |   const target = new URL(link.searchParams.get('continueUrl') || 'http://localhost:3000/');
  35  |   for (const k of ['mode', 'oobCode', 'apiKey', 'lang']) {
  36  |     const v = link.searchParams.get(k);
  37  |     if (v) target.searchParams.set(k, v);
  38  |   }
  39  |   return target;
  40  | }
  41  | 
  42  | export async function lookupUid(email: string): Promise<string> {
  43  |   const r = await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:lookup`, {
  44  |     method: 'POST', headers: OWNER, body: JSON.stringify({ email: [email] }),
  45  |   });
  46  |   const uid = r.users?.[0]?.localId;
  47  |   if (!uid) throw new Error(`no emulator user ${email}`);
  48  |   return uid;
  49  | }
  50  | 
  51  | async function updateUser(uid: string, body: Record<string, unknown>): Promise<void> {
  52  |   await call(`${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts:update`, {
  53  |     method: 'POST', headers: OWNER, body: JSON.stringify({ localId: uid, ...body }),
  54  |   });
  55  | }
  56  | 
  57  | /** Equivalent of `functions/scripts/beta-access.js grant` against the emulator. */
  58  | export async function grantBeta(email: string): Promise<string> {
  59  |   const uid = await lookupUid(email);
  60  |   await updateUser(uid, { customAttributes: JSON.stringify({ beta: true }) });
  61  |   return uid;
  62  | }
  63  | 
  64  | export async function disableUser(email: string): Promise<void> {
  65  |   await updateUser(await lookupUid(email), { disableUser: true });
  66  | }
  67  | 
  68  | /** Creates a password user with an UNVERIFIED email (no UI path exists for this). */
  69  | export async function createUnverifiedPasswordUser(email: string, password: string): Promise<void> {
  70  |   await call(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-e2e-web-key`, {
  71  |     method: 'POST', headers: { 'Content-Type': 'application/json' },
  72  |     body: JSON.stringify({ email, password, returnSecureToken: true }),
  73  |   });
  74  | }
  75  | 
  76  | // ---- Firestore (admin, bypasses rules; used only for seeding and checks) ----
  77  | type Json = null | boolean | number | string | Json[] | { [k: string]: Json } | Date;
  78  | function toValue(v: Json): any {
  79  |   if (v === null) return { nullValue: null };
  80  |   if (v instanceof Date) return { timestampValue: v.toISOString() };
  81  |   if (typeof v === 'boolean') return { booleanValue: v };
  82  |   if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  83  |   if (typeof v === 'string') return { stringValue: v };
  84  |   if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  85  |   return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  86  | }
  87  | function fromValue(v: any): any {
  88  |   if ('nullValue' in v) return null;
  89  |   if ('booleanValue' in v) return v.booleanValue;
  90  |   if ('integerValue' in v) return Number(v.integerValue);
  91  |   if ('doubleValue' in v) return v.doubleValue;
  92  |   if ('stringValue' in v) return v.stringValue;
  93  |   if ('timestampValue' in v) return v.timestampValue;
  94  |   if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  95  |   if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  96  |   return v;
  97  | }
  98  | const docsUrl = `${FIRESTORE}/v1/projects/${PROJECT}/databases/(default)/documents`;
  99  | 
  100 | export async function adminSet(path: string, data: Record<string, Json>): Promise<void> {
  101 |   const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toValue(v)]));
  102 |   await call(`${docsUrl}/${path}`, { method: 'PATCH', headers: OWNER, body: JSON.stringify({ fields }) });
  103 | }
  104 | 
  105 | export async function adminGet(path: string): Promise<Record<string, any> | null> {
  106 |   const res = await fetch(`${docsUrl}/${path}`, { headers: OWNER });
  107 |   if (res.status === 404) return null;
  108 |   const d = await res.json();
  109 |   return Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromValue(v)]));
  110 | }
  111 | 
  112 | /** Teams owned by uid, read with admin rights (ground truth for UI checks). */
  113 | export async function adminTeamsOwnedBy(uid: string): Promise<Array<{ id: string; name: string }>> {
  114 |   const r = await call(`${docsUrl}:runQuery`, {
  115 |     method: 'POST', headers: OWNER,
  116 |     body: JSON.stringify({ structuredQuery: {
  117 |       from: [{ collectionId: 'teams' }],
  118 |       where: { fieldFilter: { field: { fieldPath: 'ownerId' }, op: 'EQUAL', value: { stringValue: uid } } },
  119 |     } }),
  120 |   });
  121 |   return r.filter((x: any) => x.document).map((x: any) => ({
  122 |     id: x.document.name.split('/').pop(),
  123 |     name: x.document.fields?.name?.stringValue,
  124 |   }));
  125 | }
  126 | 
```
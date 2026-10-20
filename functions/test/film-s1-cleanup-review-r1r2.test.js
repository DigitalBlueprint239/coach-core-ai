/* eslint-disable */
// Retained VERBATIM regression: independent reviewer's PR86 probes
// (session_01EUU9Xh8ytHDPZpzdekH5fT, #39 c-6301624587 for verdict
// c-6301621806), sha256 of the original script
// 6413db5a052e4928dfb0deb0d797cfe9619661c386ab5262a1602e1f1461235e.
// Only change: the checkout root comes from this file's location instead of
// the PR86_ROOT environment variable. At 3921225: 0/3 (C1-R1 x2, C1-R2).
// Must stay 3/3.
/* eslint-disable */
// Independent reviewer probes (session_01EUU9Xh8ytHDPZpzdekH5fT), PR86 @ 3921225.
// Candidate doubles + candidate S1 handlers + cleanup; synthetic only, no network.
// Run: PR86_ROOT=<checkout> node --test c1-review-probes.cjs
const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const {createRequire} = require('node:module');
const req = createRequire(path.join(__dirname, '..', '..', 'functions', 'test', 'x.js'));
const c = req('../src/film/contract');
const cl = req('../src/film/cleanup');
const {createFilmHandlers} = req('../src/film/handlers');
const {createStorageAdapter} = req('../src/film/storage-adapter');
const {FakeTimestamp, FakeFirestore, FakeBucket} = req('./film-cleanup-doubles');

const BKT = 'demo-c1-review.appspot.com';
const OWNER = 'uid-owner', TEAM = 'team-rv';
const T0 = new Date('2026-10-20T20:00:00.000Z');
const AUTH = {uid: OWNER, token: {email_verified: true, firebase: {sign_in_provider: 'google.com'}, auth_time: 1760900000}};
const NOT_MP4 = Buffer.from('this is plain text, not a video!', 'latin1');

function world(bucketName = () => BKT) {
  const db = new FakeFirestore(), bucket = new FakeBucket(BKT), clock = {t: T0};
  const adapter = createStorageAdapter(bucket);
  let fn = 0, hn = 0;
  db.write(`teams/${TEAM}`, {ownerId: OWNER, name: 'A'});
  const h = createFilmHandlers({db, Timestamp: FakeTimestamp,
    getUser: async () => ({disabled: false, customClaims: {beta: true}}),
    readHead: (t) => adapter.readHead(t), cleanupBucketName: () => bucketName(),
    cleanupBucket: () => bucket, logger: {info() {}, warn() {}, error() {}},
    now: () => clock.t, monotonicMs: () => 0, newCleanupHolder: () => `h-${++hn}`,
    newFilmId: () => `00000000-0000-4000-8000-${String(++fn).padStart(12, '0')}`});
  return {db, bucket, clock, h};
}
const reserve = async (w) => {
  const r = await w.h.reserveFilmUpload({auth: AUTH, data: {schemaVersion: 'coach-film.v1',
    operationId: crypto.randomUUID(), action: 'reserveFilmUpload', payload: {teamId: TEAM,
      declaredBytes: NOT_MP4.length, declaredContentType: 'video/mp4', fileName: 's.mp4',
      rightsAcknowledged: true, rightsWordingVersion: 'rights-v1'}}});
  assert.equal(r.ok, true);
  return r.data;
};
const records = (w) => w.db.list ? w.db.list('filmCleanup') : null;
const countRecords = async (w) => (await w.db.collection('filmCleanup').get()).docs.length;

// R1 generalisation: ANY target refusal, not only a missing bucket name.
for (const [label, eventBucket] of [['event bucket differs from configured', 'other-bucket.appspot.com'],
  ['event bucket field absent', undefined]]) {
  test(`C1-R1 (generalised): finalize with ${label} must not commit a cleanup-owing rejection without an obligation`, async () => {
    const w = world();
    const r = await reserve(w);
    const gen = w.bucket.put ? w.bucket.put(r.uploadPath, NOT_MP4) : null;
    const generation = String(gen && gen.generation !== undefined ? gen.generation : gen);
    const outcome = await w.h.onQuarantineFinalized({bucket: eventBucket, name: r.uploadPath,
      generation, size: NOT_MP4.length, contentType: 'video/mp4'});
    const film = w.db.read(`teams/${TEAM}/films/${r.filmId}`);
    const n = await countRecords(w);
    console.log(label, JSON.stringify({outcome, status: film.status, records: n}));
    // Durability requirement: a committed cleanup-owing decision implies a record.
    assert.ok(!(film.status === 'rejected' && n === 0), 'rejected + slot released with zero obligations');
  });
}

// R2: invalid pending records are never moved out of the due range and can starve valid ones.
test('C1-R2: >= sweepBatchMax invalid due records must not permanently starve a valid due record', async () => {
  const w = world();
  const L = cl.CLEANUP_LIMITS;
  const base = (i) => {
    const name = c.uploadPathFor(TEAM, `00000000-0000-4000-9000-${String(i).padStart(12, '0')}`);
    return {bucket: 'old-bucket.appspot.com', name, generation: String(1000 + i), teamId: TEAM,
      filmId: name.split('/')[2], origin: 'abandon', createdAtMs: T0.getTime() - 7200e3,
      state: 'pending', attempts: 0, fence: 0, lease: null, history: [],
      nextAttemptAtMs: T0.getTime() - 7200e3 + i, sweepDueAtMs: T0.getTime() - 7200e3 + i,
      resolvedAtMs: null, evidence: null};
  };
  // L.sweepBatchMax records bound to a previous bucket name (e.g. after a config change).
  for (let i = 0; i < L.sweepBatchMax; i++) {
    const d = base(i);
    w.db.write(`filmCleanup/${cl.cleanupIdFor(d.bucket, d.name, d.generation)}`, d);
  }
  // One valid, due, newer obligation.
  const name = c.uploadPathFor(TEAM, '00000000-0000-4000-9000-999999999999');
  const gen = w.bucket.put(name, NOT_MP4);
  const generation = String(gen && gen.generation !== undefined ? gen.generation : gen);
  const good = {bucket: BKT, name, generation, teamId: TEAM, filmId: name.split('/')[2], origin: 'abandon',
    createdAtMs: T0.getTime() - 60e3, state: 'pending', attempts: 0, fence: 0, lease: null, history: [],
    nextAttemptAtMs: T0.getTime() - 60e3, sweepDueAtMs: T0.getTime() - 60e3, resolvedAtMs: null, evidence: null};
  const goodId = cl.cleanupIdFor(BKT, name, generation);
  w.db.write(`filmCleanup/${goodId}`, good);
  const runs = [];
  for (let k = 0; k < 3; k++) {
    w.clock.t = new Date(w.clock.t.getTime() + 24 * 3600e3);
    const s = await w.h.retryPendingFilmCleanups({limit: L.sweepBatchMax});
    runs.push({queried: s.queried, outcomes: [...new Set(s.results.map((x) => x.admission))],
      goodSeen: s.results.some((x) => x.id === goodId)});
  }
  console.log('sweeps', JSON.stringify(runs), 'good state', w.db.read(`filmCleanup/${goodId}`).state);
  assert.ok(runs.some((r) => r.goodSeen), 'valid due obligation never reached by any sweep');
});

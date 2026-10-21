/* eslint-disable */
// Independent reviewer probes (session_01EUU9Xh8ytHDPZpzdekH5fT), PR87 @ e7fdff3. Synthetic doubles only.
// Run: node r2-probes.cjs <exact checkout>
const path = require('path'); const root = process.argv[2];
const r = require(path.join(root, 'functions/src/film/reconcile'));
const c = require(path.join(root, 'functions/src/film/contract'));
const {FakeFirestore, FakeTimestamp} = require(path.join(root, 'functions/test/lfs-doubles'));
const logger = {info() {}, warn() {}, error() {}};
const now = new Date('2026-10-21T10:30:00Z');
const T = '2026-10-21T10:00:00Z';
const utf8 = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
function mk(listFn, over = {}) {
  const db = new FakeFirestore(); const io = {lists: [], downloads: 0, deletes: 0};
  const storage = {name: 'demo-p.appspot.com',
    async listObjects(q) { io.lists.push({...q}); return listFn(q); },
    file() { return {async download() { io.downloads++; throw Object.assign(new Error('x'), {code: 503}); },
      async delete() { io.deletes++; }}; }};
  let mono = 0;
  const rc = r.createQuarantineReconciler({db, Timestamp: FakeTimestamp, storage, bucketName: () => storage.name,
    project: 'demo-p', now: () => now, logger, monotonicMs: () => mono, ...over});
  return {db, io, rc, setMono: (v) => { mono = v; }, state: () => db.read(r.STATE_PATH),
    ev: () => db.paths(r.EVIDENCE_COLLECTION + '/').map((p) => db.read(p))};
}
// GCS-like listing in UTF-8 order; token = last returned name; page size k
const gcs = (all, k) => (q) => {
  const sorted = [...all].sort((a, b) => utf8(a.name, b.name));
  let tail = sorted.filter((x) => !q.startOffset || utf8(x.name, q.startOffset) >= 0);
  if (q.pageToken) tail = tail.filter((x) => utf8(x.name, q.pageToken) > 0);
  const page = tail.slice(0, Math.min(k, q.maxResults || k));
  return {items: page, nextPageToken: tail.length > page.length ? page[page.length - 1].name : null};
};
const obj = (name, g) => ({name, generation: g, size: '32', contentType: 'video/mp4', timeCreated: T});
const out = {};
(async () => {
  // P1: Unicode pair, one file per run (limit 1), 1 object per page
  const U = [obj('quarantine//source.mp4', '1'), obj('quarantine/\u{10000}/source.mp4', '2')];
  {
    const w = mk(gcs(U, 1)); const runs = [];
    for (let i = 0; i < 4; i++) { const x = await w.rc.reconcileQuarantine({limit: 1}); runs.push([x.processed, x.passEnded]); }
    out.unicodeLimit1 = {runs, evidence: w.ev().map((e) => [e.name.codePointAt(11).toString(16), e.code, e.count]), downloads: w.io.downloads, deletes: w.io.deletes, cleanupRecords: w.db.paths('filmCleanup/').length};
  }
  // P2: Unicode pair, invocation-budget stop after the first object
  {
    const L = r.deriveLimits(undefined, {objectBudgetMs: 1000, invocationBudgetMs: 1500});
    const w = mk(gcs(U, 1), {limits: L});
    // advance the monotonic clock once the first checkpoint lands, so the 2nd object can't be admitted
    const orig = w.db.runTransaction.bind(w.db); let cps = 0;
    w.db.runTransaction = async (fn, o) => { const res = await orig(fn, o); const s = w.db.read(r.STATE_PATH); if (s && s.afterName && cps++ === 0) w.setMono(600); return res; };
    const a = await w.rc.reconcileQuarantine({limit: 10}); w.setMono(0);
    const b = await w.rc.reconcileQuarantine({limit: 10});
    out.unicodeBudgetStop = {first: [a.processed, a.stoppedFor], second: [b.processed, b.passEnded], evidence: w.ev().map((e) => e.name.codePointAt(11).toString(16)), downloads: w.io.downloads, deletes: w.io.deletes};
  }
  // P3: durable no-progress error is persisted right after the stalling run
  {
    const items = [1, 2, 3].map((n) => obj(c.uploadPathFor('team', `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`), String(n)));
    const w = mk((q) => { const tail = items.filter((x) => !q.startOffset || x.name >= q.startOffset); return {items: tail.slice(0, 2), nextPageToken: tail.length > 2 ? 'more' : null}; });
    const a = await w.rc.reconcileQuarantine({limit: 10}); const s1 = w.state();
    const b = await w.rc.reconcileQuarantine({limit: 10}); const s2 = w.state();
    out.noProgressDurable = {run1: a.stoppedFor, stateAfterRun1: {lastError: s1.lastError && s1.lastError.code, consecutiveFailures: s1.consecutiveFailures, listQuery: s1.listQuery, listStalls: s1.listStalls, lease: s1.lease},
      run2: [b.processed, b.passEnded], run2FirstListStartOffsetIsName2: w.io.lists.find((q, i) => i >= 2 && !q.pageToken) ? w.io.lists.filter((q) => !q.pageToken).slice(-1)[0].startOffset === items[1].name : null, stateAfterRun2: {lastError: s2.lastError, consecutiveFailures: s2.consecutiveFailures}};
  }
  // P4: legitimate empty pages with ADVANCING tokens: 2 empties (below cap) and 3 empties (at cap)
  for (const empties of [2, 3]) {
    const item = obj(c.uploadPathFor('team', '00000000-0000-4000-8000-000000000009'), '9');
    const w = mk((q) => { const n = q.pageToken ? Number(q.pageToken.slice(1)) : 0; return n < empties ? {items: [], nextPageToken: 't' + (n + 1)} : {items: [item], nextPageToken: null}; },
      {limits: {...r.RECONCILE_LIMITS, listsMax: 10}});
    const runs = []; let firstErr = null;
    for (let i = 0; i < 3 && !runs.some((x) => x[1]); i++) { const x = await w.rc.reconcileQuarantine({limit: 10}); runs.push([x.processed, x.passEnded, x.stoppedFor]); const s = w.state(); if (!firstErr && s.lastError) firstErr = s.lastError.code; }
    out[`emptyPages${empties}`] = {runs, itemEvidenced: w.ev().length === 1, everRecordedError: firstErr};
  }
  console.log(JSON.stringify(out, null, 1));
})();

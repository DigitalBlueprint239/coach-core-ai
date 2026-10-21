/* eslint-disable */
// Reviewer probe: k legitimate empty pages with ADVANCING tokens before one real object.
// Run: node empty-run.cjs <checkout> [reconcile.js override path]
const path = require('path'); const root = process.argv[2];
const r = require(process.argv[3] || path.join(root, 'functions/src/film/reconcile'));
const c = require(path.join(root, 'functions/src/film/contract'));
const {FakeFirestore, FakeTimestamp} = require(path.join(root, 'functions/test/lfs-doubles'));
const now = new Date('2026-10-21T10:30:00Z');
(async () => {
  for (const k of [1, 2, 3, 5]) {
    const item = {name: c.uploadPathFor('team', '00000000-0000-4000-8000-000000000009'), generation: '9', size: '32', contentType: 'video/mp4', timeCreated: '2026-10-21T10:00:00Z'};
    const db = new FakeFirestore();
    const storage = {name: 'demo-p.appspot.com', async listObjects(q) { const n = q.pageToken ? Number(q.pageToken.slice(1)) : 0; return n < k ? {items: [], nextPageToken: 't' + (n + 1)} : {items: [item], nextPageToken: null}; },
      file() { return {async download() { throw Object.assign(new Error('x'), {code: 503}); }}; }};
    const rc = r.createQuarantineReconciler({db, Timestamp: FakeTimestamp, storage, bucketName: () => storage.name, project: 'demo-p', now: () => now, logger: {info() {}, warn() {}, error() {}}});
    const runs = []; for (let i = 0; i < 6; i++) { const x = await rc.reconcileQuarantine({limit: 10}); runs.push(x.passEnded ? 'END' : (x.stoppedFor || '-')); }
    const reached = db.paths(r.EVIDENCE_COLLECTION + '/').length === 1;
    console.log(JSON.stringify({emptyPagesBeforeObject: k, objectReachedWithin6Runs: reached, runs}));
  }
})();

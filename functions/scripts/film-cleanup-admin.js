#!/usr/bin/env node
"use strict";
/**
 * FILM cleanup operator tool (LFS-A, #39 c-6303891279; r2 §3.6 / r3.1):
 * EMULATOR-ONLY in this slice. Every command refuses unless the project id
 * starts with `demo-` AND FIRESTORE_EMULATOR_HOST is set; it never uses
 * production credentials. Live administration needs a separate C1-D1
 * authorization.
 *
 * Commands (bounded output, ids and paths only):
 *   list-parked | list-stuck | list-evidence  [--limit N]
 *   unpark --id <id> --expect-parked-at <atMs> --reason "<=120 printable"
 *
 * Unpark is ONE transaction: re-read the record, CAS on parked.atMs, refuse
 * unless pending with no live lease and the audit history is not full,
 * reconstruct the candidate (drop `parked`, sweepDueAtMs =
 * max(parked.sweepDueAtMs, now)), validate the COMPLETE candidate with the
 * frozen C1 recordProblem under the current bucket, then write the record
 * and an audit event filmCleanupAudit/{id}/events/{n} (outside the record,
 * so cleanup.js and its strict schema stay unchanged). No automatic unpark.
 */
const path = require("node:path");
const cl = require(path.join(__dirname, "..", "src", "film", "cleanup.js"));

const PARK_AUDIT_MAX = 8;
const LIST_MAX = 100;
const REASON_RE = /^[\x20-\x7e]{1,120}$/;

/**
 * Refuses any live target.
 * @param {object} env process.env
 * @param {?string} project
 * @return {?string} problem
 */
function environmentProblem(env, project) {
  if (typeof project !== "string" || !project.startsWith("demo-")) {
    return "project-not-demo";
  }
  if (!env.FIRESTORE_EMULATOR_HOST) return "emulator-host-missing";
  return null;
}

/**
 * Bounded read-only listing.
 * @param {object} db
 * @param {string} kind parked|stuck|evidence
 * @param {number} limit
 * @return {Promise<object[]>}
 */
async function list(db, kind, limit = LIST_MAX) {
  const n = Math.min(Math.max(1, Number(limit) || LIST_MAX), LIST_MAX);
  if (kind === "evidence") {
    const s = await db.collection("filmReconcile").doc("quarantine")
        .collection("evidence").limit(n).get();
    return s.docs.map((d) => ({id: d.id, name: d.data().name,
      generation: d.data().generation, code: d.data().code,
      count: d.data().count}));
  }
  const s = kind === "stuck" ?
    await db.collection(cl.CLEANUP_COLLECTION).where("state", "==", "stuck")
        .limit(n).get() :
    await db.collection(cl.CLEANUP_COLLECTION)
        .where("parked.atMs", ">=", 0).limit(n).get();
  return s.docs.map((d) => ({id: d.id, name: d.data().name,
    generation: d.data().generation, state: d.data().state,
    parked: d.data().parked || null}));
}

/**
 * CAS unpark (see header).
 * @param {object} db
 * @param {object} o {id, expectParkedAt, reason, bucketName, nowMs}
 * @return {Promise<object>} {ok} or {refused: problem}
 */
async function unpark(db, o) {
  if (typeof o.reason !== "string" || !REASON_RE.test(o.reason)) {
    return {refused: "reason-invalid"};
  }
  if (!Number.isSafeInteger(o.expectParkedAt)) {
    return {refused: "expect-parked-at-invalid"};
  }
  const recRef = db.collection(cl.CLEANUP_COLLECTION).doc(String(o.id));
  const auditRef = db.collection("filmCleanupAudit").doc(String(o.id));
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(recRef);
    const audit = await tx.get(auditRef);
    if (!snap.exists) return {refused: "not-found"};
    const r = snap.data();
    if (!r.parked || typeof r.parked !== "object") {
      return {refused: "not-parked"};
    }
    if (r.parked.atMs !== o.expectParkedAt) return {refused: "cas-mismatch"};
    if (r.state !== "pending") return {refused: "not-pending"};
    if (r.lease && r.lease.untilMs > o.nowMs) {
      return {refused: "live-lease"};
    }
    const count = audit.exists ? audit.data().count : 0;
    if (!Number.isSafeInteger(count) || count >= PARK_AUDIT_MAX) {
      return {refused: "audit-full"};
    }
    const candidate = {...r};
    delete candidate.parked;
    candidate.sweepDueAtMs = Math.max(
        Number.isSafeInteger(r.parked.sweepDueAtMs) ?
          r.parked.sweepDueAtMs : 0, o.nowMs);
    const problem = cl.recordProblem(String(o.id), candidate, o.bucketName);
    if (problem) return {refused: `still-invalid:${problem}`};
    tx.set(recRef, candidate);
    tx.set(auditRef, {count: count + 1});
    tx.set(auditRef.collection("events").doc(String(count + 1)), {
      kind: "unpark", parked: r.parked, reason: o.reason, atMs: o.nowMs,
      n: count + 1});
    return {ok: true, n: count + 1};
  });
}

/**
 * @param {string[]} argv
 * @return {object}
 */
function parseArgs(argv) {
  const out = {_: []};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[++i];
    else out._.push(argv[i]);
  }
  return out;
}

/** CLI entry. */
async function main() {
  const a = parseArgs(process.argv.slice(2));
  const project = a.project || process.env.GCLOUD_PROJECT;
  const problem = environmentProblem(process.env, project);
  if (problem) {
    process.stderr.write(`film-cleanup-admin: refused (${problem}). ` +
      "Emulator-only in this slice: demo-* project AND " +
      "FIRESTORE_EMULATOR_HOST required.\n");
    process.exit(1);
  }
  const {initializeApp} = require("firebase-admin/app");
  const {getFirestore} = require("firebase-admin/firestore");
  const app = initializeApp({projectId: project}, "film-cleanup-admin");
  const db = getFirestore(app);
  const cmd = a._[0];
  let res;
  if (["list-parked", "list-stuck", "list-evidence"].includes(cmd)) {
    res = await list(db, cmd.slice(5), a.limit);
  } else if (cmd === "unpark") {
    if (!a.bucket) {
      process.stderr.write("film-cleanup-admin: --bucket required\n");
      process.exit(1);
    }
    res = await unpark(db, {id: a.id, expectParkedAt: Number(
        a["expect-parked-at"]), reason: a.reason, bucketName: a.bucket,
    nowMs: Date.now()});
  } else {
    process.stderr.write("usage: film-cleanup-admin <list-parked|" +
      "list-stuck|list-evidence|unpark> ...\n");
    process.exit(2);
  }
  process.stdout.write(`${JSON.stringify(res)}\n`);
  process.exit(res && res.refused ? 1 : 0);
}

if (require.main === module) {
  main().catch((e) => {
    process.stderr.write(`film-cleanup-admin: error ${e && e.code || ""}\n`);
    process.exit(1);
  });
}

module.exports = {PARK_AUDIT_MAX, environmentProblem, list, unpark,
  parseArgs};

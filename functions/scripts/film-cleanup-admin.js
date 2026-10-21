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
 *   list-s2b-recovery [--teams N] [--films M] [--after-team T
 *     [--after-film F]]   (FILM-INT-A D5 / I-9; READ-ONLY, see below)
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
const c2 = require(path.join(__dirname, "..", "src", "film",
    "contract-v2.js"));
const {jobIdFor} = require(path.join(__dirname, "..", "src", "film",
    "worker", "worker.js"));

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

const S2B_LIST_MAX = 50;
const S2B_STATUSES = ["validating", "ready", "rejected"];

/**
 * FILM-INT-A D5 (I-9): S2b-owned same-generation quarantine sources an
 * operator should know about. READ-ONLY (never writes) and bounded:
 * - teams ordered by document id, at most N per invocation;
 * - per team, `films where status in [validating, ready, rejected]` ordered
 *   by document id, sharing ONE film budget M across the invocation (each
 *   query asks for remaining+1 to detect truncation without slicing an
 *   unbounded scan);
 * - per film, ONE direct read of the job for the film's recorded generation
 *   (`jobIdFor`); no collection-group query.
 * Max reads per invocation <= (N+1) + (M+N) + M, reported with the output.
 * The cursor {team, film} resumes INSIDE a truncated team before advancing,
 * so repeated invocations visit every eligible film once (quiescent data).
 * Classes (actual A5 job semantics; there is no terminal-error state):
 *   a  validating, job carries ANY active recovery mark `job.recovery`
 *      (the durable mark A5 admission refuses on; every A5 reason:
 *      attempts-exhausted, rejection-precondition-failed,
 *      reject-precondition-failed, ready-precondition-failed,
 *      precondition-changed-mid-run, validation-record-invalid,
 *      validation-record-stale, output-ownership-unproven,
 *      team-ownership-changed); the reason is reported. A resolved mark
 *      (`resolvedRecovery` with `recovery` cleared) is not active
 *      (PR88 F-1, #39 c-6326638892).
 *   b  ready / worker-reason rejected, quarantine cleanup `mismatch` (412)
 *   c  ready / worker-reason rejected, quarantine cleanup `pending`
 *      ("unresolved (not proven failed)")
 *   d  ready / worker-reason rejected, no quarantine cleanup intent
 * Output-object cleanup stays with I-2. Owner: the S2b worker job, by its
 * own durable cleanup intent and status checks; nothing is granted here.
 * @param {object} db admin Firestore (emulator)
 * @param {object} o {teams, films, after: {team, film}|null, documentId}
 * @return {Promise<object>} {items, next, truncated, reads, maxReads}
 */
async function listS2bRecovery(db, o = {}) {
  const bound = (v, d) => Math.min(Math.max(1, Number(v) || d),
      S2B_LIST_MAX);
  const N = bound(o.teams, 10);
  const M = bound(o.films, S2B_LIST_MAX);
  const docId = o.documentId;
  const after = o.after && o.after.team ? o.after : null;
  const out = {items: [], next: null, truncated: {teams: false,
    films: false}, reads: 0, maxReads: (N + 1) + (M + N) + M};
  let tq = db.collection("teams").orderBy(docId);
  if (after) tq = tq.startAt(after.team);
  const teams = (await tq.limit(N + 1).get()).docs;
  out.reads += teams.length;
  let budget = M;
  for (let t = 0; t < Math.min(teams.length, N); t++) {
    const team = teams[t].id;
    let fq = db.collection("teams").doc(team).collection("films")
        .where("status", "in", S2B_STATUSES).orderBy(docId);
    if (after && after.team === team && after.film) {
      fq = fq.startAfter(after.film);
    }
    const films = (await fq.limit(budget + 1).get()).docs;
    out.reads += films.length;
    const take = Math.min(films.length, budget);
    for (let i = 0; i < take; i++) {
      const d = films[i].data() || {};
      const g = d.objectGeneration;
      if (typeof g !== "string" || !cl.GENERATION_RE.test(g)) continue;
      const jobId = jobIdFor(team, films[i].id, g);
      const js = await db.collection("teams").doc(team).collection("films")
          .doc(films[i].id).collection("workerJobs").doc(jobId).get();
      out.reads += 1;
      const j = js.exists ? js.data() : null;
      const cls = s2bClass(d, j, g);
      if (cls) {
        out.items.push({team, film: films[i].id, status: d.status,
          generation: g, jobId, ...cls});
      }
    }
    budget -= take;
    if (films.length > take) { // more eligible films in THIS team
      out.next = {team, film: films[take - 1] ? films[take - 1].id :
        (after && after.team === team ? after.film : null)};
      out.truncated.films = true;
      return out;
    }
    if (budget === 0 && t + 1 < teams.length) {
      out.next = {team: teams[t + 1].id, film: null};
      out.truncated.films = true;
      return out;
    }
  }
  if (teams.length > N) {
    out.next = {team: teams[N].id, film: null};
    out.truncated.teams = true;
  }
  return out;
}

/**
 * @param {object} d film document
 * @param {?object} j job record for the film's recorded generation
 * @param {string} g recorded generation
 * @return {?object} {class, classification}
 */
function s2bClass(d, j, g) {
  if (d.status === "validating") {
    if (!j || !j.recovery) return null; // running, idle or resolved
    const reason = String(j.recovery.reason || "unspecified").slice(0, 64);
    return {class: "a", classification: `recovery: ${reason}`,
      recoveryReason: reason,
      exhaustion: j.exhaustion && j.exhaustion.outcome ?
        String(j.exhaustion.outcome).slice(0, 32) : null};
  }
  if (d.status === "rejected" &&
      !c2.WORKER_REJECTION_REASONS.includes(d.rejectionReason)) {
    return null; // S1 intake rejection: S1/C1-owned, not S2b
  }
  const q = j && j.cleanup ? j.cleanup.quarantine : null;
  if (!q) return {class: "d", classification: "no intent"};
  if (q.generation !== g) return null;
  if (q.result === "mismatch") {
    return {class: "b", classification: "precondition mismatch"};
  }
  if (q.result === "pending") {
    return {class: "c", classification: "unresolved (not proven failed)"};
  }
  return null; // deleted / absent: resolved
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
  } else if (cmd === "list-s2b-recovery") {
    const {FieldPath} = require("firebase-admin/firestore");
    res = await listS2bRecovery(db, {teams: a.teams, films: a.films,
      after: a["after-team"] ? {team: a["after-team"],
        film: a["after-film"] || null} : null,
      documentId: FieldPath.documentId()});
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
      "list-stuck|list-evidence|unpark|list-s2b-recovery> ...\n");
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
  parseArgs, listS2bRecovery, s2bClass, S2B_LIST_MAX};

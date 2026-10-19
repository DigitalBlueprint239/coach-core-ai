"use strict";
// FILM-S1 handler tests against the LOCAL Firestore + Storage emulators
// (demo-* project only). Identity is injected; the clock is injected.
// Run: firebase emulators:exec --project demo-coach-core-beta
//        --only firestore,storage "npm --prefix functions run test:film-emulator"
const {describe, it, before, beforeEach} = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");

const PROJECT = process.env.GCLOUD_PROJECT || "demo-coach-core-beta";
if (!PROJECT.startsWith("demo-") || !process.env.FIRESTORE_EMULATOR_HOST ||
    !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
  throw new Error("film emulator tests need demo-* project + both emulators");
}

const {initializeApp} = require("firebase-admin/app");
const {getFirestore, Timestamp} = require("firebase-admin/firestore");
const {getStorage} = require("firebase-admin/storage");
const c = require("../../src/film/contract");
const {LIMITS} = require("../../src/film/limits");
const {createFilmHandlers} = require("../../src/film/handlers");
const {createStorageAdapter} = require("../../src/film/storage-adapter");

const BUCKET = `${PROJECT}.appspot.com`;
initializeApp({projectId: PROJECT, storageBucket: BUCKET}, "film-s1");
const app = require("firebase-admin/app").getApp("film-s1");
const db = getFirestore(app);
const bucket = getStorage(app).bucket(BUCKET);

const OWNER = "uid-owner";
const OTHER = "uid-other";
const TEAM = "team-film-a";
const TEAM_B = "team-film-b";
const T0 = new Date("2026-10-19T21:00:00.000Z");

let clock = T0;
const users = {
  [OWNER]: {uid: OWNER, disabled: false, customClaims: {beta: true}},
  [OTHER]: {uid: OTHER, disabled: false, customClaims: {beta: true}},
  "uid-nobeta": {uid: "uid-nobeta", disabled: false, customClaims: {}},
  "uid-disabled": {uid: "uid-disabled", disabled: true,
    customClaims: {beta: true}},
};
const auth = (uid, extra = {}) => ({uid, token: {email_verified: true,
  firebase: {sign_in_provider: "google.com"}, auth_time: 1760900000,
  ...extra}});

const storage = createStorageAdapter(bucket);
const deps = {
  db, Timestamp,
  getUser: async (uid) => {
    if (!users[uid]) throw new Error("not found");
    return users[uid];
  },
  deleteObject: (t) => storage.deleteObject(t),
  readHead: (t) => storage.readHead(t),
  logger: {info() {}, warn() {}, error() {}},
  now: () => clock,
};
const h = createFilmHandlers(deps);

const op = () => crypto.randomUUID();
const reserveReq = (over = {}, opId = op()) => ({
  schemaVersion: c.CONTRACT_VERSION, operationId: opId,
  action: "reserveFilmUpload", payload: {teamId: TEAM, declaredBytes: 32,
    declaredContentType: "video/mp4", fileName: "clip.mp4",
    rightsAcknowledged: true, rightsWordingVersion: "rights-v1", ...over},
});
const abandonReq = (filmId, opId = op(), teamId = TEAM) => ({
  schemaVersion: c.CONTRACT_VERSION, operationId: opId,
  action: "abandonFilmUpload", payload: {teamId, filmId},
});
const reserve = (data, uid = OWNER, a) =>
  h.reserveFilmUpload({auth: a || auth(uid), data});
const abandon = (data, uid = OWNER) =>
  h.abandonFilmUpload({auth: auth(uid), data});

const valid = (fn, res) => {
  const r = c.RESPONSE_SCHEMAS[fn].safeParse(res);
  assert.ok(r.success, JSON.stringify(res));
  return res;
};
const expectErr = (fn, res, code, reason) => {
  valid(fn, res);
  assert.equal(res.ok, false, JSON.stringify(res));
  assert.deepEqual(res.error, {code, retryable: c.RETRYABLE[code], reason});
};
const filmDocs = async (teamId = TEAM) =>
  (await db.collection(`teams/${teamId}/films`).get()).docs.map((d) =>
    d.data());
const slots = async (teamId = TEAM) => {
  const s = await db.doc(`teams/${teamId}/filmLedger/cap`).get();
  return s.exists ? Object.keys(s.data().slots) : [];
};

// 32-byte object with a valid ftyp first box.
const MP4 = Buffer.alloc(32);
MP4.writeUInt32BE(24, 0);
MP4.write("ftypisom", 4, "latin1");
MP4.writeUInt32BE(0x200, 12);
MP4.write("isomiso2", 16, "latin1");
const NOT_MP4 = Buffer.from("this is plain text, not a video!", "latin1");

const putObject = async (path, buf, contentType = "video/mp4") => {
  const f = bucket.file(path);
  await f.save(buf, {contentType, resumable: false});
  const [m] = await f.getMetadata();
  return {name: path, size: m.size, contentType: m.contentType,
    generation: m.generation};
};
const exists = async (path) => (await bucket.file(path).exists())[0];

async function clearAll() {
  for (const col of ["teams", "filmOperations"]) {
    const snap = await db.collection(col).get();
    for (const d of snap.docs) await db.recursiveDelete(d.ref);
  }
  await bucket.deleteFiles({prefix: "quarantine/", force: true});
  await db.doc(`teams/${TEAM}`).set({name: "A", ownerId: OWNER});
  await db.doc(`teams/${TEAM_B}`).set({name: "B", ownerId: OTHER});
}

before(async () => {
  await clearAll();
});
beforeEach(async () => {
  clock = T0;
  await clearAll();
});

describe("FS-01..05 eligibility", () => {
  const cases = [
    ["FS-01 anonymous", auth(OWNER, {firebase: {sign_in_provider: "anonymous"}}),
      "permission-denied", "anonymous-not-allowed"],
    ["FS-01b signed out", null, "unauthenticated", "sign-in-required"],
    ["FS-02 unverified", auth(OWNER, {email_verified: false}),
      "permission-denied", "email-not-verified"],
    ["FS-03 non-beta", auth("uid-nobeta"), "permission-denied",
      "beta-access-required"],
    ["FS-04 disabled", auth("uid-disabled"), "unauthenticated",
      "account-disabled"],
  ];
  for (const [name, a, code, reason] of cases) {
    it(`${name} -> ${code}/${reason}, nothing written`, async () => {
      const res = await h.reserveFilmUpload({auth: a, data: reserveReq()});
      expectErr("reserveFilmUpload", res, code, reason);
      assert.equal((await filmDocs()).length, 0);
      assert.equal((await db.collection("filmOperations").get()).size, 0);
    });
  }
  it("FS-05 non-owner denied; owner succeeds (positive anchor)", async () => {
    expectErr("reserveFilmUpload", await reserve(reserveReq(), OTHER),
        "permission-denied", "not-team-owner");
    expectErr("reserveFilmUpload",
        await reserve(reserveReq({teamId: "team-missing"})),
        "permission-denied", "not-team-owner");
    assert.equal((await filmDocs()).length, 0);
    const ok = valid("reserveFilmUpload", await reserve(reserveReq()));
    assert.equal(ok.ok, true);
    assert.equal(ok.data.film.status, "reserved");
    assert.equal(ok.data.film.createdBy, OWNER);
    assert.equal(ok.data.uploadPath,
        `quarantine/${TEAM}/${ok.data.filmId}/source.mp4`);
    assert.equal(ok.data.expiresAt, new Date(T0.getTime() +
      LIMITS.reservationLifetimeMs).toISOString());
  });
});

describe("FS-06..09 limits and rights", () => {
  it("FS-06 bytes at limit accepted, limit+1 rejected", async () => {
    const at = await reserve(reserveReq({declaredBytes: LIMITS.maxBytes}));
    assert.equal(valid("reserveFilmUpload", at).ok, true);
    expectErr("reserveFilmUpload",
        await reserve(reserveReq({declaredBytes: LIMITS.maxBytes + 1})),
        "limit-exceeded", "bytes-over-limit");
  });
  it("FS-07 wrong content type", async () => {
    expectErr("reserveFilmUpload",
        await reserve(reserveReq({declaredContentType: "video/quicktime"})),
        "limit-exceeded", "format-not-allowed");
  });
  it("FS-08 rights not acknowledged / missing", async () => {
    expectErr("reserveFilmUpload",
        await reserve(reserveReq({rightsAcknowledged: false})),
        "invalid-argument", "rights-acknowledgement-required");
    const r = reserveReq();
    delete r.payload.rightsAcknowledged;
    expectErr("reserveFilmUpload", await reserve(r),
        "invalid-argument", "schema-invalid");
  });
  it("FS-09 unknown wording version", async () => {
    expectErr("reserveFilmUpload",
        await reserve(reserveReq({rightsWordingVersion: "rights-v0"})),
        "failed-precondition", "rights-wording-outdated");
    assert.equal((await filmDocs()).length, 0);
  });
});

describe("FS-10 team cap", () => {
  it("N succeed, N+1 refused, abandon frees a slot", async () => {
    const ids = [];
    for (let i = 0; i < LIMITS.teamFilmCap; i++) {
      const r = await reserve(reserveReq());
      assert.equal(r.ok, true, JSON.stringify(r));
      ids.push(r.data.filmId);
    }
    expectErr("reserveFilmUpload", await reserve(reserveReq()),
        "team-cap-reached", "team-film-cap");
    assert.equal((await abandon(abandonReq(ids[0]))).ok, true);
    assert.equal((await reserve(reserveReq())).ok, true);
    assert.equal((await slots()).length, LIMITS.teamFilmCap);
  });
  it("concurrent reservations never exceed N", async () => {
    const tries = LIMITS.teamFilmCap + 5;
    const res = await Promise.all(Array.from({length: tries},
        () => reserve(reserveReq())));
    for (const r of res) valid("reserveFilmUpload", r);
    const okCount = res.filter((r) => r.ok).length;
    assert.ok(okCount <= LIMITS.teamFilmCap, `ok=${okCount}`);
    for (const r of res.filter((x) => !x.ok)) {
      assert.ok(["team-cap-reached", "unavailable"].includes(r.error.code));
    }
    const docs = (await filmDocs()).filter((d) => d.status === "reserved");
    assert.equal(docs.length, okCount);
    assert.equal((await slots()).length, okCount);
  });
});

describe("FS-11 idempotency", () => {
  it("same operationId replays verbatim; different payload conflicts",
      async () => {
        const id = op();
        const a = await reserve(reserveReq({}, id));
        clock = new Date(T0.getTime() + 5000);
        const b = await reserve(reserveReq({}, id));
        assert.deepEqual(b, a);
        assert.equal((await filmDocs()).length, 1);
        assert.equal((await slots()).length, 1);
        expectErr("reserveFilmUpload",
            await reserve(reserveReq({declaredBytes: 33}, id)),
            "conflict", "operation-id-reused");
        // Another user's identical operationId is unrelated.
        const other = await h.reserveFilmUpload({auth: auth(OTHER),
          data: reserveReq({teamId: TEAM_B}, id)});
        assert.equal(other.ok, true);
      });
  it("concurrent duplicates create one film", async () => {
    const id = op();
    const res = await Promise.all([1, 2, 3].map(() =>
      reserve(reserveReq({}, id))));
    const oks = res.filter((r) => r.ok);
    assert.ok(oks.length >= 1);
    for (const r of oks) assert.deepEqual(r, oks[0]);
    assert.equal((await filmDocs()).length, 1);
  });
  it("errors are not stored: cap refusal retried after a slot frees",
      async () => {
        const ids = [];
        for (let i = 0; i < LIMITS.teamFilmCap; i++) {
          ids.push((await reserve(reserveReq())).data.filmId);
        }
        const id = op();
        expectErr("reserveFilmUpload", await reserve(reserveReq({}, id)),
            "team-cap-reached", "team-film-cap");
        await abandon(abandonReq(ids[0]));
        assert.equal((await reserve(reserveReq({}, id))).ok, true);
      });
});

describe("C3 retry horizon, receipts and file names", () => {
  it("replay is a receipt snapshot, not current permission", async () => {
    const id = op();
    const a = await reserve(reserveReq({}, id));
    await abandon(abandonReq(a.data.filmId));
    clock = new Date(T0.getTime() + 60000);
    const b = valid("reserveFilmUpload", await reserve(reserveReq({}, id)));
    assert.deepEqual(b, a);
    assert.equal(b.data.film.status, "reserved");
    const cur = (await db.doc(`teams/${TEAM}/films/${a.data.filmId}`).get())
        .data();
    assert.equal(cur.status, "abandoned");
    // An upload after cancellation is still discarded by the finalize path.
    const e = await putObject(a.data.uploadPath, MP4);
    assert.equal(await h.onQuarantineFinalized(e), "stale-abandoned");
    assert.equal(await exists(a.data.uploadPath), false);
  });
  it("after the replay window the same operation is refused, never re-run",
      async () => {
        const id = op();
        await reserve(reserveReq({}, id));
        clock = new Date(T0.getTime() + LIMITS.operationReplayWindowMs - 1);
        assert.equal((await reserve(reserveReq({}, id))).ok, true);
        clock = new Date(T0.getTime() + LIMITS.operationReplayWindowMs);
        expectErr("reserveFilmUpload", await reserve(reserveReq({}, id)),
            "failed-precondition", "operation-expired");
        clock = new Date(T0.getTime() + 30 * LIMITS.operationReplayWindowMs);
        expectErr("reserveFilmUpload", await reserve(reserveReq({}, id)),
            "failed-precondition", "operation-expired");
        expectErr("reserveFilmUpload",
            await reserve(reserveReq({declaredBytes: 99}, id)),
            "conflict", "operation-id-reused");
        assert.equal((await filmDocs()).length, 1);
      });
  it("file name stored canonical; equivalent spellings are one operation",
      async () => {
        const id = op();
        const a = await reserve(reserveReq({fileName: "  Cafe\u0301.mp4 "}, id));
        assert.equal(a.data.film.fileName, "Caf\u00e9.mp4");
        const b = await reserve(reserveReq({fileName: "Caf\u00e9.mp4"}, id));
        assert.deepEqual(b, a);
        assert.equal((await filmDocs()).length, 1);
      });
});

describe("FS-19..22 finalize and abandon", () => {
  it("FS-19 size mismatch and spoofed signature -> rejected, deleted",
      async () => {
        const r1 = (await reserve(reserveReq({declaredBytes: 31}))).data;
        const e1 = await putObject(r1.uploadPath, MP4);
        assert.equal(await h.onQuarantineFinalized(e1),
            "rejected-size-mismatch");
        const r2 = (await reserve(reserveReq())).data;
        const e2 = await putObject(r2.uploadPath, NOT_MP4);
        assert.equal(await h.onQuarantineFinalized(e2),
            "rejected-signature-invalid");
        for (const r of [r1, r2]) {
          const d = (await db.doc(`teams/${TEAM}/films/${r.filmId}`).get())
              .data();
          assert.equal(d.status, "rejected");
          assert.equal(await exists(r.uploadPath), false);
        }
        assert.equal((await slots()).length, 0);
      });
  it("FS-19b content type mismatch -> rejected", async () => {
    const r = (await reserve(reserveReq())).data;
    const e = await putObject(r.uploadPath, MP4, "application/octet-stream");
    assert.equal(await h.onQuarantineFinalized(e),
        "rejected-content-type-mismatch");
  });
  it("FS-20 valid header -> validating, generation recorded, never ready",
      async () => {
        const r = (await reserve(reserveReq())).data;
        const e = await putObject(r.uploadPath, MP4);
        assert.equal(await h.onQuarantineFinalized(e), "validating");
        assert.equal(await h.onQuarantineFinalized(e), "duplicate-event");
        const d = (await db.doc(`teams/${TEAM}/films/${r.filmId}`).get())
            .data();
        assert.equal(d.status, "validating");
        assert.equal(d.objectGeneration, String(e.generation));
        assert.equal(await exists(r.uploadPath), true);
        assert.equal((await slots()).length, 1);
      });
  it("FS-21 abandon from reserved and validating; repeat is stable",
      async () => {
        const r = (await reserve(reserveReq())).data;
        const a1 = valid("abandonFilmUpload", await abandon(abandonReq(r.filmId)));
        assert.equal(a1.data.previousStatus, "reserved");
        assert.equal(a1.data.film.status, "abandoned");
        const a2 = valid("abandonFilmUpload", await abandon(abandonReq(r.filmId)));
        assert.equal(a2.data.previousStatus, "abandoned");
        assert.deepEqual(a2.data.film, a1.data.film);

        const v = (await reserve(reserveReq())).data;
        await h.onQuarantineFinalized(await putObject(v.uploadPath, MP4));
        const a3 = await abandon(abandonReq(v.filmId));
        assert.equal(a3.data.previousStatus, "validating");
        assert.equal(await exists(v.uploadPath), false);
        assert.equal((await slots()).length, 0);
        // same-op replay
        const id = op();
        const w = (await reserve(reserveReq())).data;
        const b1 = await abandon(abandonReq(w.filmId, id));
        assert.deepEqual(await abandon(abandonReq(w.filmId, id)), b1);
      });
  it("FS-21b abandon edge cases", async () => {
    expectErr("abandonFilmUpload", await abandon(abandonReq(op())),
        "failed-precondition", "film-not-found");
    const r = (await reserve(reserveReq())).data;
    expectErr("abandonFilmUpload", await abandon(abandonReq(r.filmId), OTHER),
        "permission-denied", "not-team-owner");
    const rj = (await reserve(reserveReq())).data;
    await h.onQuarantineFinalized(await putObject(rj.uploadPath, NOT_MP4));
    expectErr("abandonFilmUpload", await abandon(abandonReq(rj.filmId)),
        "failed-precondition", "invalid-state");
  });
  it("FS-22 abandon then late finalize -> deleted, stays abandoned",
      async () => {
        const r = (await reserve(reserveReq())).data;
        await abandon(abandonReq(r.filmId));
        const e = await putObject(r.uploadPath, MP4);
        assert.equal(await h.onQuarantineFinalized(e), "stale-abandoned");
        assert.equal(await exists(r.uploadPath), false);
        const d = (await db.doc(`teams/${TEAM}/films/${r.filmId}`).get())
            .data();
        assert.equal(d.status, "abandoned");
      });
  it("unreserved quarantine object is deleted; other prefixes ignored",
      async () => {
        const p = `quarantine/${TEAM}/${op()}/source.mp4`;
        assert.equal(await h.onQuarantineFinalized(await putObject(p, MP4)),
            "no-reservation");
        assert.equal(await exists(p), false);
        assert.equal(await h.onQuarantineFinalized({name: "films/x.mp4"}),
            "ignored-path");
      });
});

describe("R1-R5 backend repairs", () => {
  it("R1 switch off: callables throw sanitized internal, nothing written",
      async () => {
        const off = createFilmHandlers({...deps, isEnabled: () => false});
        await assert.rejects(off.reserveFilmUpload({auth: auth(OWNER),
          data: reserveReq()}), (e) => e.code === "internal");
        await assert.rejects(off.abandonFilmUpload({auth: auth(OWNER),
          data: abandonReq(op())}), (e) => e.code === "internal");
        assert.equal((await filmDocs()).length, 0);
        assert.equal((await db.collection("filmOperations").get()).size, 0);
      });
  it("R2 abandon from reserved never deletes an unprocessed object; " +
      "its late event deletes that exact generation", async () => {
    const r = (await reserve(reserveReq())).data;
    const e = await putObject(r.uploadPath, MP4);
    await abandon(abandonReq(r.filmId));
    assert.equal(await exists(r.uploadPath), true);
    assert.equal(await h.onQuarantineFinalized(e), "stale-abandoned");
    assert.equal(await exists(r.uploadPath), false);
  });
  it("R2 stale cleanup leaves a newer generation at the same path alone",
      async () => {
        const r = (await reserve(reserveReq())).data;
        const e1 = await putObject(r.uploadPath, MP4);
        await abandon(abandonReq(r.filmId));
        const e2 = await putObject(r.uploadPath, MP4); // replaces e1 (admin)
        assert.notEqual(String(e1.generation), String(e2.generation));
        // e1's generation is gone: the event sees object-gone, deletes nothing
        assert.equal(await h.onQuarantineFinalized(e1), "object-gone");
        assert.equal(await exists(r.uploadPath), true);
        assert.equal(await storage.deleteObject({name: r.uploadPath,
          generation: String(e1.generation)}), false);
        assert.equal(await exists(r.uploadPath), true);
        // the current generation's own event removes it
        assert.equal(await h.onQuarantineFinalized(e2), "stale-abandoned");
        assert.equal(await exists(r.uploadPath), false);
      });
  it("R3 transient head-read error: throws, film stays reserved, " +
      "object kept", async () => {
    const flaky = createFilmHandlers({...deps, readHead: async () => {
      throw Object.assign(new Error("socket hang up"), {code: "ECONNRESET"});
    }});
    const r = (await reserve(reserveReq())).data;
    const e = await putObject(r.uploadPath, MP4);
    await assert.rejects(flaky.onQuarantineFinalized(e));
    const d = (await db.doc(`teams/${TEAM}/films/${r.filmId}`).get()).data();
    assert.equal(d.status, "reserved");
    assert.equal(d.objectGeneration, null);
    assert.equal(await exists(r.uploadPath), true);
    assert.equal((await slots()).length, 1);
    // the retried event then validates normally
    assert.equal(await h.onQuarantineFinalized(e), "validating");
  });
  it("R3 generation gone before the event: reservation untouched",
      async () => {
        const r = (await reserve(reserveReq())).data;
        const e = await putObject(r.uploadPath, MP4);
        await bucket.file(r.uploadPath).delete();
        assert.equal(await h.onQuarantineFinalized(e), "object-gone");
        const d = (await db.doc(`teams/${TEAM}/films/${r.filmId}`).get())
            .data();
        assert.equal(d.status, "reserved");
      });
  it("R4 ftyp box with 16 compatible brands (80 bytes) is accepted",
      async () => {
        const big = Buffer.alloc(96);
        big.writeUInt32BE(80, 0);
        big.write("ftypisom", 4, "latin1");
        for (let i = 16; i < 80; i += 4) big.write("iso2", i, "latin1");
        const r = (await reserve(reserveReq({declaredBytes: 96}))).data;
        assert.equal(await h.onQuarantineFinalized(
            await putObject(r.uploadPath, big)), "validating");
      });
  it("R5 orphan lapsed ledger slot is dropped; reserve still succeeds",
      async () => {
        const r = (await reserve(reserveReq())).data;
        await db.doc(`teams/${TEAM}/films/${r.filmId}`).delete();
        clock = new Date(T0.getTime() + LIMITS.reservationLifetimeMs);
        const next = await reserve(reserveReq());
        assert.equal(next.ok, true, JSON.stringify(next));
        assert.deepEqual(await slots(), [next.data.filmId]);
      });
});

describe("FS-23 expiry", () => {
  it("late finalize after expiry -> expired, deleted, slot released",
      async () => {
        const r = (await reserve(reserveReq())).data;
        clock = new Date(T0.getTime() + LIMITS.reservationLifetimeMs);
        const e = await putObject(r.uploadPath, MP4);
        assert.equal(await h.onQuarantineFinalized(e), "expired");
        assert.equal(await exists(r.uploadPath), false);
        assert.equal((await slots()).length, 0);
      });
  it("lazy expiry on the next reserve frees the slot", async () => {
    const first = (await reserve(reserveReq())).data;
    clock = new Date(T0.getTime() + LIMITS.reservationLifetimeMs + 1);
    assert.equal((await reserve(reserveReq())).ok, true);
    const d = (await db.doc(`teams/${TEAM}/films/${first.filmId}`).get())
        .data();
    assert.equal(d.status, "expired");
    assert.equal((await slots()).length, 1);
  });
});

describe("stored document == returned FilmState", () => {
  it("doc fields match FilmState with Timestamps", async () => {
    const r = await reserve(reserveReq());
    const snap = await db.doc(`teams/${TEAM}/films/${r.data.filmId}`).get();
    const d = snap.data();
    assert.deepEqual(Object.keys(d).sort(),
        Object.keys(r.data.film).sort());
    for (const k of c.FILM_TIMESTAMP_FIELDS) {
      if (d[k] === null) continue;
      assert.ok(d[k] instanceof Timestamp, k);
      assert.equal(d[k].toDate().toISOString(), r.data.film[k]);
    }
  });
});

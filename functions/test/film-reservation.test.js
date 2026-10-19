"use strict";
// FILM-S1 reservation/cancellation handler tests (reconciliation 2026-10-19,
// FS-01..FS-11, FS-21..FS-24 server side) against the published
// coach-film.v1 contract (f641d3d). Synthetic data only; no project, no
// emulator, no media, no provider.
const {describe, it, beforeEach} = require("node:test");
const assert = require("node:assert/strict");

const {createFilmHandlers} = require("../src/film/reservation");
const {LIMITS} = require("../src/film/limits");
const c = require("../src/film/contract");
const {userRecords} = require("./fakes");
const {
  FakeFirestore, FakeStorage, silentLogger, FTYP, TEAM_A, TEAM_B,
  OP1, OP2, OP3, filmUuid, FILM1, FILM2, FILM3, ALICE, BOB, betaAuth, seedTeams,
  envelope, reservePayload,
} = require("./film-fakes");

let db;
let storage;
let users;
let enabled;
let clock;
let ids;
let handlers;

function build(over = {}) {
  return createFilmHandlers({
    isEnabled: () => enabled,
    getUser: async (uid) => {
      if (!users[uid]) throw new Error("not found");
      return users[uid];
    },
    db,
    deleteObject: (t) => storage.deleteObject(t),
    logger: silentLogger,
    now: () => new Date(clock),
    newFilmId: () => ids.shift() || filmUuid(900 + Math.floor(Math.random() * 99)),
    ...over,
  });
}

beforeEach(() => {
  db = new FakeFirestore();
  storage = new FakeStorage();
  users = userRecords();
  enabled = true;
  clock = Date.parse("2026-10-19T21:00:00Z");
  ids = [FILM1, FILM2, FILM3, filmUuid(4)];
  seedTeams(db);
  handlers = build();
});

const reserve = (payload = {}, op = OP1, auth = betaAuth()) =>
  handlers.reserve({auth, data: envelope("reserveFilmUpload",
      reservePayload(payload), op)});
const abandon = (filmId, op = OP2, auth = betaAuth(), teamId = TEAM_A) =>
  handlers.abandon({auth, data: envelope("abandonFilmUpload",
      {teamId, filmId}, op)});

/** The response must be a returned contract error (never a throw). */
async function expectError(promise, code, reason) {
  const res = await promise;
  assert.equal(res.ok, false, `expected ${code}/${reason}, got ok response`);
  assert.equal(res.error.code, code, `code (got ${res.error.reason})`);
  if (reason) assert.equal(res.error.reason, reason);
  assert.equal(c.schemas.errorResponse.safeParse(res).success, true,
      "error body matches coach-film.v1");
  assert.deepEqual(res, c.errorResponseFor(res.error.code, res.error.reason));
  return res;
}

const okReserve = (res) => {
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(c.RESPONSE_SCHEMAS.reserveFilmUpload.safeParse(res).success, true,
      JSON.stringify(c.RESPONSE_SCHEMAS.reserveFilmUpload.safeParse(res).error?.issues));
  return res;
};
const okAbandon = (res) => {
  assert.equal(res.ok, true, JSON.stringify(res));
  assert.equal(c.RESPONSE_SCHEMAS.abandonFilmUpload.safeParse(res).success, true,
      JSON.stringify(c.RESPONSE_SCHEMAS.abandonFilmUpload.safeParse(res).error?.issues));
  return res;
};

const film = (id = FILM1) => db.read(`teams/${TEAM_A}/films/${id}`);
const ledger = () => (db.read(`teams/${TEAM_A}/filmLedger/counts`) ||
  {active: 0}).active;

describe("FILM-S1 reserveFilmUpload: gates (FS-00..FS-05)", () => {
  it("FS-00 kill switch off (default while D3/D7 are placeholders): unavailable/backend-unavailable, no identity lookup, no writes", async () => {
    enabled = false;
    let lookups = 0;
    handlers = build({getUser: async () => {
      lookups++; return users[ALICE];
    }});
    await expectError(reserve(), "unavailable", "backend-unavailable");
    await expectError(abandon(FILM1), "unavailable", "backend-unavailable");
    assert.equal(lookups, 0);
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-01 unauthenticated caller", async () => {
    await expectError(reserve({}, OP1, null), "unauthenticated", "sign-in-required");
    await expectError(reserve({}, OP1, {uid: ALICE}), "unauthenticated", "sign-in-required");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-02 unverified email and anonymous provider", async () => {
    await expectError(reserve({}, OP1, betaAuth(ALICE, {email_verified: false})),
        "permission-denied", "email-not-verified");
    await expectError(reserve({}, OP1, betaAuth(ALICE, {firebase: {sign_in_provider: "anonymous"}})),
        "permission-denied", "anonymous-not-allowed");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-03 non-beta live record (token claim alone is not trusted)", async () => {
    users[ALICE].customClaims = {};
    await expectError(reserve(), "permission-denied", "beta-access-required");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-04 disabled account, revoked session, unknown account", async () => {
    users[ALICE].disabled = true;
    await expectError(reserve(), "unauthenticated", "account-disabled");
    users[ALICE].disabled = false;
    users[ALICE].tokensValidAfterTime = "Wed, 14 Oct 2026 00:00:00 GMT";
    await expectError(reserve(), "unauthenticated", "sign-in-required");
    await expectError(reserve({}, OP1, betaAuth("ghost-uid")), "unauthenticated", "sign-in-required");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-05 non-owner and missing team get the same not-team-owner; the owner succeeds", async () => {
    await expectError(reserve({teamId: TEAM_B}), "permission-denied", "not-team-owner");
    await expectError(reserve({teamId: "no-such-team"}), "permission-denied", "not-team-owner");
    assert.deepEqual(db.writeLog, []);
    const res = okReserve(await reserve());
    assert.equal(res.data.filmId, FILM1);
  });
});

describe("FILM-S1 reserveFilmUpload: contract and limits (FS-06..FS-09, FS-24)", () => {
  it("FS-06 declaredBytes at the PENDING_D3 placeholder is accepted; limit + 1 -> limit-exceeded/bytes-over-limit", async () => {
    okReserve(await reserve({declaredBytes: LIMITS.maxBytes}, OP1));
    await expectError(reserve({declaredBytes: LIMITS.maxBytes + 1}, OP2),
        "limit-exceeded", "bytes-over-limit");
    assert.equal(db.pathsUnder(`teams/${TEAM_A}/films/`).length, 1);
  });
  it("FS-07 content type outside allowedContentTypes -> limit-exceeded/format-not-allowed (distinct from schema errors)", async () => {
    await expectError(reserve({declaredContentType: "video/quicktime"}),
        "limit-exceeded", "format-not-allowed");
    await expectError(reserve({declaredContentType: "video/x-matroska"}),
        "limit-exceeded", "format-not-allowed");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-08 rights acknowledgement: false -> rights-acknowledgement-required; missing -> schema-invalid", async () => {
    await expectError(reserve({rightsAcknowledged: false}),
        "invalid-argument", "rights-acknowledgement-required");
    const p = reservePayload();
    delete p.rightsAcknowledged;
    await expectError(handlers.reserve({auth: betaAuth(),
      data: envelope("reserveFilmUpload", p)}), "invalid-argument", "schema-invalid");
    assert.deepEqual(db.writeLog, []);
  });
  it("FS-09 unknown rights wording version -> failed-precondition/rights-wording-outdated; the placeholder version is recorded verbatim with a server timestamp", async () => {
    await expectError(reserve({rightsWordingVersion: "rights-v0"}),
        "failed-precondition", "rights-wording-outdated");
    await expectError(reserve({rightsWordingVersion: "rights-v2"}),
        "failed-precondition", "rights-wording-outdated");
    okReserve(await reserve());
    assert.equal(film().rightsWordingVersion, "rights-v1");
    assert.equal(film().rightsAcknowledgedAt.getTime(), clock);
  });
  it("FS-24 unknown fields, wrong schemaVersion, oversized name, bad ids -> schema-invalid; wrong action -> action-mismatch", async () => {
    const bad = async (data, reason = "schema-invalid") => expectError(
        handlers.reserve({auth: betaAuth(), data}), "invalid-argument", reason);
    await bad({...envelope("reserveFilmUpload", reservePayload()), extra: 1});
    await bad(envelope("reserveFilmUpload", {...reservePayload(), status: "ready"}));
    await bad(envelope("reserveFilmUpload", {...reservePayload(), objectGeneration: "1"}));
    await bad({...envelope("reserveFilmUpload", reservePayload()), schemaVersion: "coach-ai.v1"});
    await bad(envelope("reserveFilmUpload", reservePayload({fileName: "x".repeat(LIMITS.maxFileNameLength + 1)})));
    await bad(envelope("reserveFilmUpload", reservePayload({fileName: "   "})));
    await bad(envelope("reserveFilmUpload", reservePayload({teamId: "team/with/slash"})));
    await bad(envelope("reserveFilmUpload", reservePayload({declaredBytes: 0})));
    await bad(envelope("reserveFilmUpload", reservePayload({declaredBytes: 24.5})));
    await bad({...envelope("reserveFilmUpload", reservePayload()), operationId: "not-a-uuid"});
    await bad({...envelope("reserveFilmUpload", reservePayload()), operationId: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA"});
    await bad(envelope("getFilmPlaybackUrl", reservePayload()));
    await bad({...envelope("reserveFilmUpload", reservePayload()), payload: null});
    await bad(envelope("abandonFilmUpload", {teamId: TEAM_A, filmId: FILM1}), "action-mismatch");
    await expectError(handlers.abandon({auth: betaAuth(),
      data: envelope("reserveFilmUpload", reservePayload())}),
    "invalid-argument", "action-mismatch");
    await expectError(abandon("not-a-uuid"), "invalid-argument", "schema-invalid");
    assert.deepEqual(db.writeLog, []);
  });
  it("the fileName is display-only: it never appears in the upload path", async () => {
    const res = okReserve(await reserve({fileName: "../../etc/passwd.mp4"}));
    assert.equal(res.data.uploadPath, `quarantine/${TEAM_A}/${FILM1}/source.mp4`);
    assert.equal(res.data.film.fileName, "../../etc/passwd.mp4");
  });
});

describe("FILM-S1 reserveFilmUpload: server-owned record (FS-02 forged fields, FS-20 never ready)", () => {
  it("creates a reserved film whose document is field-for-field the returned FilmState; one transaction", async () => {
    const res = okReserve(await reserve());
    const f = res.data.film;
    assert.equal(res.data.filmId, FILM1);
    assert.equal(res.data.uploadPath, `quarantine/${TEAM_A}/${FILM1}/source.mp4`);
    assert.equal(res.data.uploadPath, f.uploadPath);
    assert.equal(res.data.expiresAt, f.reservationExpiresAt);
    assert.equal(res.data.expiresAt, new Date(clock + LIMITS.reservationLifetimeMs).toISOString());
    assert.equal(f.status, "reserved");
    assert.equal(f.createdBy, ALICE);
    assert.equal(f.teamId, TEAM_A);
    assert.equal(f.declaredBytes, FTYP.length);
    assert.equal(f.objectGeneration, null);
    assert.equal(f.rejectionReason, null);
    assert.equal(f.abandonedAt, null);
    const doc = film();
    assert.deepEqual(Object.keys(doc).sort(), Object.keys(c.schemas.filmState.shape).sort(),
        "document keys == FilmState keys");
    for (const k of c.FILM_TIMESTAMP_FIELDS) {
      assert.equal(doc[k] === null ? null : doc[k].toISOString(), f[k], k);
    }
    assert.equal(ledger(), 1);
    assert.equal(db.transactions.length, 1);
    assert.equal(db.transactions[0].writes, 3);
  });
  it("film ids are UUID v4 (contract) even when the id generator is the default", async () => {
    handlers = build({newFilmId: undefined});
    const res = okReserve(await reserve());
    assert.match(res.data.filmId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("no code path in this slice sets `ready`", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    for (const f of ["reservation.js", "quarantine.js"]) {
      const src = fs.readFileSync(path.join(__dirname, "..", "src", "film", f), "utf8");
      assert.ok(!/status:\s*"ready"/.test(src), `${f} never writes status ready`);
    }
  });
});

describe("FILM-S1 team cap and expiry accounting (FS-10, FS-23)", () => {
  it("FS-10 N reservations succeed, N+1 is refused, abandoning one frees exactly one slot", async () => {
    ids = [];
    for (let i = 0; i < LIMITS.teamFilmCap; i++) {
      ids.push(filmUuid(100 + i));
      okReserve(await reserve({}, `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`));
    }
    assert.equal(ledger(), LIMITS.teamFilmCap);
    assert.equal(db.pathsUnder(`teams/${TEAM_A}/films/`).length, LIMITS.teamFilmCap);
    await expectError(reserve({}, OP2), "team-cap-reached", "team-film-cap");
    assert.equal(ledger(), LIMITS.teamFilmCap);
    assert.equal(db.pathsUnder(`teams/${TEAM_A}/films/`).length, LIMITS.teamFilmCap);
    okAbandon(await abandon(filmUuid(100), OP3));
    assert.equal(ledger(), LIMITS.teamFilmCap - 1);
    ids.push(filmUuid(200));
    const res = okReserve(await reserve({}, "bbbbbbbb-bbbb-4bbb-8bbb-000000000001"));
    assert.equal(res.data.filmId, filmUuid(200));
    assert.equal(ledger(), LIMITS.teamFilmCap);
  });
  it("FS-10 the cap is per team: team B is unaffected by team A being full", async () => {
    db.seed(`teams/${TEAM_A}/filmLedger/counts`, {active: LIMITS.teamFilmCap});
    await expectError(reserve({}, OP1), "team-cap-reached", "team-film-cap");
    okReserve(await reserve({teamId: TEAM_B}, OP1, betaAuth(BOB)));
  });
  it("FS-10 a reservation attempt forced to retry (contention) consumes exactly one slot and creates one doc", async () => {
    db.simulateContention(2);
    okReserve(await reserve());
    assert.equal(db.transactions[0].attempts, 3);
    assert.equal(ledger(), 1);
    assert.equal(db.pathsUnder(`teams/${TEAM_A}/films/`).length, 1);
    assert.equal(db.pathsUnder("filmOperations/").length, 1);
  });
  it("FS-23 expired reservations are marked expired and release their slot inside the next reserve transaction", async () => {
    okReserve(await reserve({}, OP1)); // FILM1
    okReserve(await reserve({}, OP2)); // FILM2
    assert.equal(ledger(), 2);
    clock += LIMITS.reservationLifetimeMs + 1;
    const res = okReserve(await reserve({}, OP3)); // FILM3: both older ones expire here
    assert.equal(res.data.filmId, FILM3);
    assert.equal(film(FILM1).status, "expired");
    assert.equal(film(FILM1).statusChangedAt.getTime(), clock);
    assert.equal(film(FILM1).rejectionReason, null);
    assert.equal(film(FILM2).status, "expired");
    assert.equal(film(FILM3).status, "reserved");
    assert.equal(ledger(), 1);
  });
  it("FS-23 a reservation exactly at its expiry instant is expired; one millisecond before, it is not", async () => {
    okReserve(await reserve({}, OP1));
    clock += LIMITS.reservationLifetimeMs - 1;
    okReserve(await reserve({}, OP2));
    assert.equal(film(FILM1).status, "reserved");
    clock += 1;
    okReserve(await reserve({}, OP3));
    assert.equal(film(FILM1).status, "expired");
  });
  it("FS-23 expiry cannot be extended: later reserves never touch an existing reservation's reservationExpiresAt", async () => {
    okReserve(await reserve({}, OP1));
    const before = film(FILM1).reservationExpiresAt.getTime();
    clock += 1000;
    okReserve(await reserve({}, OP2));
    assert.equal(film(FILM1).reservationExpiresAt.getTime(), before);
  });
});

describe("FILM-S1 idempotency (FS-11)", () => {
  it("same operationId and payload: identical response (same timestamps), one film doc, one slot, no new writes", async () => {
    const a = okReserve(await reserve({}, OP1));
    const writes = db.writeLog.length;
    clock += 5000;
    const b = await reserve({}, OP1);
    assert.deepEqual(b, a);
    assert.equal(db.writeLog.length, writes);
    assert.equal(db.pathsUnder(`teams/${TEAM_A}/films/`).length, 1);
    assert.equal(ledger(), 1);
  });
  it("same operationId with a different payload or action: conflict, no writes", async () => {
    okReserve(await reserve({}, OP1));
    const writes = db.writeLog.length;
    await expectError(reserve({fileName: "different.mp4"}, OP1), "conflict", "operation-id-reused");
    await expectError(abandon(FILM1, OP1), "conflict", "operation-id-reused");
    assert.equal(db.writeLog.length, writes);
  });
  it("operation ids are scoped per user: another coach reusing the id is unrelated", async () => {
    okReserve(await reserve({}, OP1));
    await expectError(reserve({}, OP1, betaAuth(BOB)), "permission-denied", "not-team-owner");
    const bobRes = okReserve(await reserve({teamId: TEAM_B}, OP1, betaAuth(BOB)));
    assert.equal(bobRes.data.filmId, FILM2);
    assert.equal(bobRes.data.uploadPath, `quarantine/${TEAM_B}/${FILM2}/source.mp4`);
  });
  it("error responses are not recorded, so the same id can succeed once the cause is gone", async () => {
    users[ALICE].customClaims = {};
    await expectError(reserve({}, OP1), "permission-denied");
    users[ALICE].customClaims = {beta: true};
    db.seed(`teams/${TEAM_A}/filmLedger/counts`, {active: LIMITS.teamFilmCap});
    await expectError(reserve({}, OP1), "team-cap-reached");
    db.seed(`teams/${TEAM_A}/filmLedger/counts`, {active: 0});
    assert.equal(okReserve(await reserve({}, OP1)).data.filmId, FILM1);
  });
});

describe("FILM-S1 abandonFilmUpload (FS-21, FS-22 server side)", () => {
  it("FS-21 from reserved: previousStatus reserved, film abandoned with abandonedAt, slot released, only this reservation's object path deleted", async () => {
    okReserve(await reserve({}, OP1));
    storage.put(`quarantine/${TEAM_A}/${FILM1}/source.mp4`, FTYP, "7");
    storage.put(`quarantine/${TEAM_A}/${FILM2}/source.mp4`, FTYP, "8");
    clock += 1000;
    const res = okAbandon(await abandon(FILM1, OP2));
    assert.equal(res.data.previousStatus, "reserved");
    assert.equal(res.data.film.status, "abandoned");
    assert.equal(res.data.film.abandonedAt, new Date(clock).toISOString());
    assert.equal(res.data.film.statusChangedAt, new Date(clock).toISOString());
    const doc = film();
    assert.equal(doc.status, "abandoned");
    assert.equal(doc.abandonedAt.getTime(), clock);
    assert.deepEqual(Object.keys(doc).sort(), Object.keys(c.schemas.filmState.shape).sort());
    assert.equal(ledger(), 0);
    assert.deepEqual(storage.deletes, [{name: `quarantine/${TEAM_A}/${FILM1}/source.mp4`, generation: null}]);
    assert.ok(!storage.has(`quarantine/${TEAM_A}/${FILM1}/source.mp4`));
    assert.ok(storage.has(`quarantine/${TEAM_A}/${FILM2}/source.mp4`), "another upload is never deleted");
  });
  it("FS-21 from validating: previousStatus validating; the recorded generation is the delete precondition", async () => {
    okReserve(await reserve({}, OP1));
    db.seed(`teams/${TEAM_A}/films/${FILM1}`, {...film(), status: "validating", objectGeneration: "7"});
    storage.put(`quarantine/${TEAM_A}/${FILM1}/source.mp4`, FTYP, "7");
    const res = okAbandon(await abandon(FILM1, OP2));
    assert.equal(res.data.previousStatus, "validating");
    assert.deepEqual(storage.deletes, [{name: `quarantine/${TEAM_A}/${FILM1}/source.mp4`, generation: "7"}]);
    assert.equal(ledger(), 0);
    assert.equal(film().status, "abandoned");
    assert.equal(film().objectGeneration, "7", "history kept");
  });
  it("FS-21 a stale generation precondition never deletes a newer object", async () => {
    okReserve(await reserve({}, OP1));
    db.seed(`teams/${TEAM_A}/films/${FILM1}`, {...film(), status: "validating", objectGeneration: "7"});
    storage.put(`quarantine/${TEAM_A}/${FILM1}/source.mp4`, FTYP, "9"); // newer generation present
    okAbandon(await abandon(FILM1, OP2));
    assert.ok(storage.has(`quarantine/${TEAM_A}/${FILM1}/source.mp4`), "generation 9 untouched");
  });
  it("FS-21 repeat under the same operationId replays verbatim; under a new one returns previousStatus abandoned with the film unchanged; cleanup and release happen once", async () => {
    okReserve(await reserve({}, OP1));
    const a = okAbandon(await abandon(FILM1, OP2));
    clock += 60_000;
    const b = okAbandon(await abandon(FILM1, OP2));
    const cRes = okAbandon(await abandon(FILM1, OP3));
    assert.deepEqual(b, a);
    assert.equal(cRes.data.previousStatus, "abandoned");
    assert.deepEqual(cRes.data.film, a.data.film);
    assert.equal(ledger(), 0);
    assert.equal(storage.deletes.length, 1, "cleanup runs once");
  });
  it("from expired, rejected or ready: failed-precondition/invalid-state, nothing deleted or released", async () => {
    okReserve(await reserve({}, OP1));
    clock += LIMITS.reservationLifetimeMs + 1;
    okReserve(await reserve({}, OP2)); // expires FILM1; ledger 1 (FILM2)
    assert.equal(film(FILM1).status, "expired");
    await expectError(abandon(FILM1, OP3), "failed-precondition", "invalid-state");
    db.seed(`teams/${TEAM_A}/films/${FILM1}`, {...film(FILM1), status: "rejected", rejectionReason: "size-mismatch"});
    await expectError(abandon(FILM1, OP3), "failed-precondition", "invalid-state");
    db.seed(`teams/${TEAM_A}/films/${FILM1}`, {...film(FILM1), status: "ready", rejectionReason: null});
    await expectError(abandon(FILM1, OP3), "failed-precondition", "invalid-state");
    assert.equal(ledger(), 1);
    assert.equal(storage.deletes.length, 0);
  });
  it("missing film on an owned team: film-not-found; other coach / other team: not-team-owner", async () => {
    okReserve(await reserve({}, OP1));
    await expectError(abandon(filmUuid(77), OP2), "failed-precondition", "film-not-found");
    await expectError(abandon(FILM1, OP2, betaAuth(BOB)), "permission-denied", "not-team-owner");
    await expectError(abandon(FILM1, OP2, betaAuth(), TEAM_B), "permission-denied", "not-team-owner");
    assert.equal(storage.deletes.length, 0);
    assert.equal(film().status, "reserved");
  });
  it("cleanup failure does not undo the state change or turn the response into an error", async () => {
    okReserve(await reserve({}, OP1));
    handlers = build({deleteObject: async () => {
      throw Object.assign(new Error("boom"), {code: 500});
    }});
    const res = okAbandon(await abandon(FILM1, OP2));
    assert.equal(res.data.film.status, "abandoned");
    assert.equal(film().status, "abandoned");
    assert.equal(ledger(), 0);
  });
  it("an unexpected backend failure is thrown (client maps it to transport), never reported as a contract outcome", async () => {
    handlers = build({db: {collection() {
      throw new Error("firestore down");
    }}});
    await assert.rejects(reserve(), /firestore down/);
  });
});

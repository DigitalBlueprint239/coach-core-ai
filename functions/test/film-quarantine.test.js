"use strict";
// FILM-S1 quarantine finalize tests (reconciliation 2026-10-19, FS-19, FS-20,
// FS-22, duplicate events, stray objects, path containment). Synthetic bytes
// only; the "header check" is a container signature check, not media
// validation.
const {describe, it, beforeEach} = require("node:test");
const assert = require("node:assert/strict");

const {createQuarantineFinalizeHandler, looksLikeMp4, HEADER_PROBE_BYTES} =
  require("../src/film/quarantine");
const {createFilmHandlers} = require("../src/film/reservation");
const {LIMITS} = require("../src/film/limits");
const c = require("../src/film/contract");
const {userRecords} = require("./fakes");
const {
  FakeFirestore, FakeStorage, silentLogger, FTYP, TEAM_A, OP1, OP2, FILM1,
  betaAuth, seedTeams, envelope, reservePayload,
} = require("./film-fakes");

let db;
let storage;
let clock;
let finalize;
let handlers;

const PATH = `quarantine/${TEAM_A}/${FILM1}/source.mp4`;
const film = (id = FILM1) => db.read(`teams/${TEAM_A}/films/${id}`);
const ledger = () => (db.read(`teams/${TEAM_A}/filmLedger/counts`) ||
  {active: 0}).active;

function event(name, generation, size, contentType = "video/mp4") {
  return {data: {name, bucket: "demo-bucket", generation, size, contentType}};
}

beforeEach(async () => {
  db = new FakeFirestore();
  storage = new FakeStorage();
  clock = Date.parse("2026-10-19T21:00:00Z");
  seedTeams(db);
  const users = userRecords();
  handlers = createFilmHandlers({
    isEnabled: () => true,
    getUser: async (uid) => users[uid],
    db,
    deleteObject: (t) => storage.deleteObject(t),
    logger: silentLogger,
    now: () => new Date(clock),
    newFilmId: () => FILM1,
  });
  finalize = createQuarantineFinalizeHandler({
    db,
    deleteObject: (t) => storage.deleteObject(t),
    readHead: (t) => storage.readHead(t),
    logger: silentLogger,
    now: () => new Date(clock),
  });
  const res = await handlers.reserve({auth: betaAuth(),
    data: envelope("reserveFilmUpload", reservePayload(), OP1)});
  assert.equal(res.ok, true);
  assert.equal(film().status, "reserved");
  assert.equal(ledger(), 1);
});

describe("looksLikeMp4 (container signature, not media validation)", () => {
  it("accepts an ftyp box and rejects other leading bytes", () => {
    assert.equal(looksLikeMp4(FTYP), true);
    assert.equal(looksLikeMp4(Buffer.from("this is not a video at all")), false);
    assert.equal(looksLikeMp4(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 0, 0, 0, 0])), false);
    assert.equal(looksLikeMp4(Buffer.alloc(0)), false);
    assert.equal(looksLikeMp4(Buffer.alloc(8)), false);
    const hugeBox = Buffer.from(FTYP);
    hugeBox.writeUInt32BE(0x7fffffff, 0);
    assert.equal(looksLikeMp4(hugeBox), false);
    const tinyBox = Buffer.from(FTYP);
    tinyBox.writeUInt32BE(8, 0);
    assert.equal(looksLikeMp4(tinyBox), false);
  });
});

describe("FS-20 finalize with a matching object -> validating, never ready", () => {
  it("records generation and bytes, releases nothing, deletes nothing", async () => {
    const gen = storage.put(PATH, FTYP);
    const out = await finalize(event(PATH, gen, FTYP.length));
    assert.equal(out.outcome, "validating");
    const f = film();
    assert.equal(f.status, "validating");
    assert.equal(f.objectGeneration, gen);
    assert.equal(f.rejectionReason, null);
    assert.equal(f.statusChangedAt.getTime(), clock);
    assert.deepEqual(Object.keys(f).sort(), Object.keys(c.schemas.filmState.shape).sort(),
        "document keys == FilmState keys");
    assert.ok(c.schemas.filmState.safeParse(require("../src/film/reservation").toFilmState(f)).success);
    assert.equal(ledger(), 1, "slot still held while validating");
    assert.deepEqual(storage.deletes, []);
    assert.ok(storage.has(PATH));
  });
  it("duplicate delivery of the same event is a no-op", async () => {
    const gen = storage.put(PATH, FTYP);
    await finalize(event(PATH, gen, FTYP.length));
    const writes = db.writeLog.length;
    const out = await finalize(event(PATH, gen, FTYP.length));
    assert.equal(out.outcome, "duplicate-event");
    assert.equal(db.writeLog.length, writes);
    assert.deepEqual(storage.deletes, []);
    assert.equal(film().status, "validating");
  });
});

describe("FS-19 finalize with a mismatching object -> rejected, exact generation deleted, slot released once", () => {
  it("size mismatch", async () => {
    const gen = storage.put(PATH, FTYP);
    const out = await finalize(event(PATH, gen, FTYP.length + 1));
    assert.equal(out.outcome, "rejected");
    assert.equal(out.reason, "size-mismatch");
    assert.equal(film().status, "rejected");
    assert.equal(film().rejectionReason, "size-mismatch");
    assert.equal(film().objectGeneration, gen, "what was deleted is recorded");
    assert.equal(ledger(), 0);
    assert.deepEqual(storage.deletes, [{name: PATH, generation: gen}]);
    assert.ok(!storage.has(PATH));
  });
  it("content type mismatch (declared video/mp4, finalized as something else)", async () => {
    const gen = storage.put(PATH, FTYP);
    const out = await finalize(event(PATH, gen, FTYP.length, "video/quicktime"));
    assert.equal(out.reason, "content-type-mismatch");
    assert.equal(film().status, "rejected");
    assert.equal(ledger(), 0);
    assert.ok(!storage.has(PATH));
  });
  it("spoofed MIME: right size and type, bytes are not an MP4 container", async () => {
    const fake = Buffer.from("not a video, just 24 byt"); // 24 bytes
    assert.equal(fake.length, FTYP.length);
    const gen = storage.put(PATH, fake);
    const out = await finalize(event(PATH, gen, fake.length));
    assert.equal(out.reason, "signature-invalid");
    assert.equal(film().rejectionReason, "signature-invalid");
    assert.equal(film().status, "rejected");
    assert.equal(film().objectGeneration, gen);
    assert.equal(ledger(), 0);
    assert.ok(!storage.has(PATH));
  });
  it("a rejected film's slot is not released again by a duplicate event", async () => {
    const gen = storage.put(PATH, FTYP);
    await finalize(event(PATH, gen, FTYP.length + 1));
    db.seed(`teams/${TEAM_A}/filmLedger/counts`, {active: 3}); // other films
    const out = await finalize(event(PATH, gen, FTYP.length + 1));
    assert.equal(out.outcome, "duplicate-event");
    assert.equal(ledger(), 3);
  });
  it("only the probe's object is read: head read is bounded to headerProbeBytes", async () => {
    const big = Buffer.concat([FTYP, Buffer.alloc(4096)]);
    const gen = storage.put(PATH, big);
    let asked = null;
    finalize = createQuarantineFinalizeHandler({
      db,
      deleteObject: (t) => storage.deleteObject(t),
      readHead: (t) => {
        asked = t;
        return storage.readHead(t);
      },
      logger: silentLogger,
      now: () => new Date(clock),
    });
    await finalize(event(PATH, gen, big.length));
    assert.deepEqual(asked, {name: PATH, generation: gen, bytes: HEADER_PROBE_BYTES});
    assert.equal(HEADER_PROBE_BYTES, 64);
  });
});

describe("FS-22 races: abandoned/expired/missing reservations never come back", () => {
  it("abandon, then a late finalize: object deleted by exact generation, status stays abandoned, slot not released twice", async () => {
    const ab = await handlers.abandon({auth: betaAuth(),
      data: envelope("abandonFilmUpload", {teamId: TEAM_A, filmId: FILM1}, OP2)});
    assert.equal(ab.ok, true);
    assert.equal(ledger(), 0);
    const gen = storage.put(PATH, FTYP); // upload landed after the abandon
    const out = await finalize(event(PATH, gen, FTYP.length));
    assert.equal(out.outcome, "stray-abandoned");
    assert.equal(film().status, "abandoned");
    assert.equal(ledger(), 0);
    assert.deepEqual(storage.deletes.at(-1), {name: PATH, generation: gen});
    assert.ok(!storage.has(PATH));
  });
  it("finalize after the reservation window: expired, slot released, object deleted", async () => {
    clock += LIMITS.reservationLifetimeMs + 1;
    const gen = storage.put(PATH, FTYP);
    const out = await finalize(event(PATH, gen, FTYP.length));
    assert.equal(out.outcome, "expired");
    assert.equal(film().status, "expired");
    assert.equal(film().rejectionReason, null);
    assert.equal(film().objectGeneration, null);
    assert.equal(ledger(), 0);
    assert.ok(!storage.has(PATH));
  });
  it("object for a reservation that does not exist: deleted by exact generation, no document created", async () => {
    const name = `quarantine/${TEAM_A}/ghost/source.mp4`;
    const gen = storage.put(name, FTYP);
    const out = await finalize(event(name, gen, FTYP.length));
    assert.equal(out.outcome, "stray-no-reservation");
    assert.equal(db.read(`teams/${TEAM_A}/films/ghost`), undefined);
    assert.ok(!storage.has(name));
  });
  it("stale event whose generation is already gone deletes nothing else", async () => {
    storage.put(PATH, FTYP, "100"); // current object
    const out = await finalize(event(PATH, "99", FTYP.length)); // event for an older generation
    // head probe for gen 99 returns null -> object-missing, reservation stays open
    assert.equal(out.outcome, "object-missing");
    assert.equal(film().status, "reserved");
    assert.ok(storage.has(PATH), "generation 100 untouched");
    assert.deepEqual(storage.deletes, []);
  });
  it("a second generation arriving for a validating film is removed by exact generation and the state is unchanged", async () => {
    const gen1 = storage.put(PATH, FTYP);
    await finalize(event(PATH, gen1, FTYP.length));
    const gen2 = storage.put(PATH, FTYP); // overwrite (rules deny this; defence in depth)
    const out = await finalize(event(PATH, gen2, FTYP.length));
    assert.equal(out.outcome, "stray-validating");
    assert.equal(film().objectGeneration, gen1);
    assert.equal(film().status, "validating");
    assert.deepEqual(storage.deletes.at(-1), {name: PATH, generation: gen2});
  });
});

describe("path containment: nothing outside quarantine/{team}/{film}/source.mp4 is touched", () => {
  it("ignores other paths and malformed events without deleting or writing", async () => {
    const cases = [
      `films/${TEAM_A}/${FILM1}/source.mp4`,
      `frames/${TEAM_A}/${FILM1}/frame.jpg`,
      `teams/${TEAM_A}/files/diagram.png`,
      `quarantine/${TEAM_A}/${FILM1}/other.mp4`,
      `quarantine/${TEAM_A}/${FILM1}/source.mp4/extra`,
      `quarantine/${TEAM_A}/source.mp4`,
      `quarantine/../${TEAM_A}/${FILM1}/source.mp4`,
      `quarantine/${TEAM_A}/film 1/source.mp4`,
      "",
    ];
    for (const name of cases) {
      storage.put(name || "empty", FTYP);
      const out = await finalize(event(name, "5", FTYP.length));
      assert.equal(out.outcome, "ignored", name);
    }
    const out = await finalize(event(PATH, undefined, FTYP.length));
    assert.equal(out.outcome, "ignored", "missing generation");
    assert.deepEqual(storage.deletes, []);
    assert.equal(db.writeLog.length, 3, "only the seed reservation writes");
  });
});

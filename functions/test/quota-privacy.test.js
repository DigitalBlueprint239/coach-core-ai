"use strict";
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {reserveQuota, QuotaError} = require("../src/ai/quota");
const {redactText} = require("../src/ai/privacy");

/** Minimal in-memory stand-in for the Admin Firestore transaction API. */
function memoryDb() {
  const docs = new Map();
  const ref = (id) => ({id});
  return {
    docs,
    collection: () => ({doc: ref}),
    async runTransaction(fn) {
      const writes = [];
      const tx = {
        get: async (r) => ({exists: docs.has(r.id), data: () => docs.get(r.id)}),
        set: (r, data) => writes.push([r.id, data]),
      };
      const out = await fn(tx);
      for (const [id, data] of writes) docs.set(id, {...(docs.get(id) || {}), ...data});
      return out;
    },
  };
}

const limits = {userDaily: 3, userPerMinute: 2, globalDaily: 5};
const at = (iso) => new Date(iso);

describe("quota", () => {
  it("enforces the per-minute burst limit", async () => {
    const db = memoryDb();
    await reserveQuota(db, "u1", limits, at("2026-10-13T10:00:00Z"));
    await reserveQuota(db, "u1", limits, at("2026-10-13T10:00:10Z"));
    await assert.rejects(reserveQuota(db, "u1", limits, at("2026-10-13T10:00:20Z")),
        (e) => e instanceof QuotaError && e.scope === "user_burst");
    // A minute later the burst window has cleared.
    const r = await reserveQuota(db, "u1", limits, at("2026-10-13T10:01:30Z"));
    assert.deepEqual(r, {usedToday: 3, dailyLimit: 3});
  });

  it("enforces the per-user daily limit and resets the next UTC day", async () => {
    const db = memoryDb();
    for (const m of ["10:00", "10:05", "10:10"]) {
      await reserveQuota(db, "u1", limits, at(`2026-10-13T${m}:00Z`));
    }
    await assert.rejects(reserveQuota(db, "u1", limits, at("2026-10-13T11:00:00Z")),
        (e) => e.scope === "user_daily");
    const next = await reserveQuota(db, "u1", limits, at("2026-10-14T00:00:01Z"));
    assert.equal(next.usedToday, 1);
  });

  it("enforces the global daily circuit breaker across users", async () => {
    const db = memoryDb();
    let t = Date.parse("2026-10-13T08:00:00Z");
    for (const uid of ["a", "b", "c", "d", "e"]) {
      await reserveQuota(db, uid, limits, new Date(t += 120_000));
    }
    await assert.rejects(reserveQuota(db, "f", limits, new Date(t += 120_000)),
        (e) => e.scope === "global_daily");
  });
});

describe("privacy redaction", () => {
  it("removes contact details and dates but keeps football content", () => {
    const out = redactText("Call 239-555-0101 or coach@team.org re: 2012-03-14 trips right");
    assert.ok(!out.includes("239-555-0101"));
    assert.ok(!out.includes("coach@team.org"));
    assert.ok(!out.includes("2012-03-14"));
    assert.match(out, /trips right/);
  });
  it("leaves ordinary coaching numbers alone", () => {
    assert.equal(redactText("Run 4 verticals vs Cover 3 for 10 minutes"),
        "Run 4 verticals vs Cover 3 for 10 minutes");
  });
});

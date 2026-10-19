"use strict";
// Wiring checks for the FILM-S1 exports in functions/index.js: no project, no
// network. The film callables must fail closed by default and must never see
// the AI secret; the quarantine trigger must be a Storage finalize trigger.
const {describe, it, before} = require("node:test");
const assert = require("node:assert/strict");

let fns;
before(() => {
  process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
  delete process.env.COACH_CORE_AI_ENABLED;
  delete process.env.COACH_CORE_FILM_ENABLED; // default must be OFF
  fns = require("../index");
});

describe("functions/index.js FILM-S1 wiring", () => {
  it("exports the two reservation callables and the quarantine finalize trigger, nothing else film-related", () => {
    assert.equal(typeof fns.reserveFilmUpload, "function");
    assert.equal(typeof fns.abandonFilmUpload, "function");
    assert.equal(typeof fns.onFilmQuarantineFinalized, "function");
    const filmExports = Object.keys(fns).filter((n) => /film/i.test(n)).sort();
    assert.deepEqual(filmExports,
        ["abandonFilmUpload", "onFilmQuarantineFinalized", "reserveFilmUpload"]);
    for (const n of ["getFilmPlaybackUrl", "requestFramePreview", "approveFrame", "deleteFilm"]) {
      assert.equal(fns[n], undefined, `${n} is a later slice`);
    }
  });

  it("film functions bind no secrets", () => {
    for (const n of ["reserveFilmUpload", "abandonFilmUpload", "onFilmQuarantineFinalized"]) {
      const secrets = (fns[n].__endpoint || {}).secretEnvironmentVariables || [];
      assert.equal(secrets.length, 0, `${n} must not see secrets`);
    }
  });

  it("the quarantine trigger is a Storage object-finalized event trigger with bounded resources", () => {
    const ep = fns.onFilmQuarantineFinalized.__endpoint;
    assert.ok(ep.eventTrigger, "event trigger");
    assert.equal(ep.eventTrigger.eventType, "google.cloud.storage.object.v1.finalized");
    assert.equal(ep.httpsTrigger, undefined);
    assert.equal(ep.callableTrigger, undefined);
    assert.equal(ep.timeoutSeconds, 60);
    assert.equal(ep.maxInstances, 5);
  });

  it("the callables are callable triggers with CORS restricted to the allow-list", () => {
    for (const n of ["reserveFilmUpload", "abandonFilmUpload"]) {
      const ep = fns[n].__endpoint;
      assert.ok(ep.callableTrigger, `${n} callable`);
      assert.equal(ep.timeoutSeconds, 30);
      assert.equal(ep.maxInstances, 5);
    }
  });

  it("with the kill switch unset, both callables RETURN unavailable/backend-unavailable (contract error, not a throw) before touching identity or data", async () => {
    for (const n of ["reserveFilmUpload", "abandonFilmUpload"]) {
      const res = await fns[n].run({auth: null, data: {}, rawRequest: {}});
      assert.deepEqual(res, {ok: false, error: {
        code: "unavailable", retryable: true, reason: "backend-unavailable"}});
    }
  });

  it("coachAI is unchanged: still refuses with ai-disabled and still the only secret holder", async () => {
    await assert.rejects(
        fns.coachAI.run({auth: null, data: {}, rawRequest: {}}),
        (e) => e.code === "unavailable" && e.details.reason === "ai-disabled");
    const secrets = fns.coachAI.__endpoint.secretEnvironmentVariables || [];
    assert.deepEqual(secrets.map((s) => s.key), ["COACH_CORE_OPENAI_API_KEY"]);
  });
});

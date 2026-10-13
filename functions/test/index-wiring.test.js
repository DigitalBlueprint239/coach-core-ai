"use strict";
// Wiring checks for functions/index.js with no Firebase project and no
// network: the deployed callable must fail closed by default.
const {describe, it, before} = require("node:test");
const assert = require("node:assert/strict");

let fns;
before(() => {
  process.env.GCLOUD_PROJECT = "demo-coach-core-beta";
  delete process.env.COACH_CORE_AI_ENABLED; // default must be OFF
  fns = require("../index");
});

describe("functions/index.js", () => {
  it("exports the AI gateway and no public destructive HTTP endpoint", () => {
    assert.equal(typeof fns.coachAI, "function");
    assert.equal(typeof fns.cleanupOldNotifications, "function");
    // Scheduled functions carry a schedule trigger, not an HTTPS trigger.
    const ep = fns.cleanupOldNotifications.__endpoint;
    assert.ok(ep.scheduleTrigger, "cleanup must be scheduled");
    assert.equal(ep.httpsTrigger, undefined);
  });

  it("binds only COACH_CORE_OPENAI_API_KEY to coachAI", () => {
    const secrets = fns.coachAI.__endpoint.secretEnvironmentVariables || [];
    assert.deepEqual(secrets.map((s) => s.key), ["COACH_CORE_OPENAI_API_KEY"]);
    for (const name of Object.keys(fns)) {
      if (name === "coachAI") continue;
      const other = (fns[name].__endpoint || {}).secretEnvironmentVariables || [];
      assert.equal(other.length, 0, `${name} must not see AI secrets`);
    }
  });

  it("coachAI refuses with ai-disabled when the kill switch is unset", async () => {
    await assert.rejects(
        fns.coachAI.run({auth: null, data: {}, rawRequest: {}}),
        (e) => e.code === "unavailable" && e.details.reason === "ai-disabled");
  });

  it("trackUserActivity rejects anonymous and non-beta callers", async () => {
    await assert.rejects(fns.trackUserActivity.run({auth: null, data: {activity: "sign_in"}}),
        (e) => e.code === "permission-denied");
    await assert.rejects(fns.trackUserActivity.run({
      auth: {uid: "x", token: {beta: true, firebase: {sign_in_provider: "anonymous"}}},
      data: {activity: "sign_in"},
    }), (e) => e.code === "permission-denied");
  });
});

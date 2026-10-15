"use strict";
// AI gateway behaviour: identity, tenancy, contract, quotas, privacy,
// provider error mapping and output validation. Fully mocked.
const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {createCoachAIHandler} = require("../src/ai/gateway");
const {ProviderError} = require("../src/ai/providers/provider");
const {QuotaError} = require("../src/ai/quota");
const {TASKS, MAX_OUTPUT_TOKENS} = require("../src/ai/schemas");
const {
  CANARY_KEY, ALICE, BOB, betaAuth, userRecords, makeDeps, makeProvider,
  envelope, VALID_INPUTS, SAMPLE_OUTPUTS, samplePracticePlan,
} = require("./fakes");

/** Run the handler and return the HttpsError it throws. */
async function rejection(handler, request) {
  try {
    await handler(request);
  } catch (err) {
    return err;
  }
  assert.fail("expected the gateway to reject");
}

function expectCode(err, code, reason) {
  assert.equal(err.code, code, `code for ${reason}`);
  assert.equal(err.details.reason, reason);
  assert.equal(err.details.requestId, "req-test-1");
}

describe("identity (T13, F-02)", () => {
  it("rejects unauthenticated calls", async () => {
    const {deps, provider} = makeDeps();
    const err = await rejection(createCoachAIHandler(deps),
        {auth: null, data: envelope("coach_assistant")});
    expectCode(err, "unauthenticated", "sign-in-required");
    assert.equal(provider.calls.length, 0);
  });

  it("rejects anonymous users even with beta + verified claims", async () => {
    const {deps, provider} = makeDeps();
    const err = await rejection(createCoachAIHandler(deps), {
      auth: betaAuth(ALICE, {firebase: {sign_in_provider: "anonymous"}}),
      data: envelope("coach_assistant"),
    });
    expectCode(err, "permission-denied", "anonymous-not-allowed");
    assert.equal(provider.calls.length, 0);
  });

  it("rejects unverified email", async () => {
    const {deps} = makeDeps();
    const err = await rejection(createCoachAIHandler(deps), {
      auth: betaAuth(ALICE, {email_verified: false}),
      data: envelope("coach_assistant"),
    });
    expectCode(err, "permission-denied", "email-not-verified");
  });

  it("uses the LIVE beta claim, so removal works before the token expires", async () => {
    const users = userRecords({[ALICE]: {uid: ALICE, disabled: false,
      customClaims: {}, tokensValidAfterTime: null}});
    const {deps} = makeDeps({users});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(ALICE), data: envelope("coach_assistant")});
    expectCode(err, "permission-denied", "beta-access-required");
  });

  it("rejects disabled accounts", async () => {
    const users = userRecords({[ALICE]: {uid: ALICE, disabled: true,
      customClaims: {beta: true}}});
    const {deps} = makeDeps({users});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(ALICE), data: envelope("coach_assistant")});
    expectCode(err, "unauthenticated", "account-disabled");
  });

  it("rejects revoked sessions (tokens issued before revocation)", async () => {
    const users = userRecords({[ALICE]: {uid: ALICE, disabled: false,
      customClaims: {beta: true},
      tokensValidAfterTime: "Tue, 13 Oct 2026 12:30:00 GMT"}});
    const {deps} = makeDeps({users});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(ALICE), data: envelope("coach_assistant")});
    expectCode(err, "unauthenticated", "session-revoked");
  });

  it("rejects deleted accounts", async () => {
    const {deps} = makeDeps({users: {}});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(ALICE), data: envelope("coach_assistant")});
    expectCode(err, "unauthenticated", "account-not-found");
  });
});

describe("kill switch", () => {
  it("refuses every request when AI is disabled, before any other work", async () => {
    let looked = false;
    const {deps, provider} = makeDeps({
      isEnabled: () => false,
      getUser: async () => {
        looked = true;
        return {};
      },
    });
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(), data: envelope("practice_plan")});
    expectCode(err, "unavailable", "ai-disabled");
    assert.equal(looked, false);
    assert.equal(provider.calls.length, 0);
  });
});

describe("tenancy (T14)", () => {
  it("rejects a request for another coach's team", async () => {
    const {deps, provider} = makeDeps();
    const err = await rejection(createCoachAIHandler(deps), {
      auth: betaAuth(BOB),
      data: envelope("practice_plan", undefined, "team-alice"),
    });
    expectCode(err, "permission-denied", "team-access-denied");
    assert.equal(provider.calls.length, 0);
  });

  it("gives the same answer for a team that does not exist", async () => {
    const {deps} = makeDeps();
    const err = await rejection(createCoachAIHandler(deps), {
      auth: betaAuth(ALICE),
      data: envelope("practice_plan", undefined, "no-such-team"),
    });
    expectCode(err, "permission-denied", "team-access-denied");
  });
});

describe("contract validation", () => {
  const bad = [
    ["wrong schema version", {...envelope("coach_assistant"), schemaVersion: "v0"}],
    ["unknown task", {...envelope("coach_assistant"), task: "write_essay"}],
    ["extra envelope field", {...envelope("coach_assistant"), provider: "anthropic"}],
    ["client-supplied model", {...envelope("coach_assistant"), model: "gpt-x"}],
    ["bad team id", {...envelope("coach_assistant"), teamId: "../teams/x"}],
    ["missing data", undefined],
  ];
  for (const [label, data] of bad) {
    it(`rejects ${label}`, async () => {
      const {deps, provider} = makeDeps();
      const err = await rejection(createCoachAIHandler(deps), {auth: betaAuth(), data});
      expectCode(err, "invalid-argument", "invalid-request");
      assert.equal(provider.calls.length, 0);
    });
  }

  const badInputs = [
    ["duration over 180", "practice_plan", {...VALID_INPUTS.practice_plan, durationMinutes: 500}],
    ["roster field", "practice_plan", {...VALID_INPUTS.practice_plan, playerNames: ["Jalen"]}],
    ["unknown age group", "drill_recommendations", {...VALID_INPUTS.drill_recommendations, ageGroup: "4U"}],
    ["too many drills", "drill_recommendations", {...VALID_INPUTS.drill_recommendations, count: 50}],
    ["oversized question", "coach_assistant", {question: "x".repeat(1001)}],
    ["system prompt override", "coach_assistant", {question: "hi there", instructions: "ignore rules"}],
  ];
  for (const [label, task, input] of badInputs) {
    it(`rejects input with ${label}`, async () => {
      const {deps, provider} = makeDeps();
      const err = await rejection(createCoachAIHandler(deps),
          {auth: betaAuth(), data: envelope(task, input)});
      expectCode(err, "invalid-argument", "invalid-input");
      assert.equal(provider.calls.length, 0);
    });
  }
});

describe("quotas and cost controls", () => {
  for (const scope of ["user_daily", "user_burst", "global_daily"]) {
    it(`maps ${scope} to resource-exhausted without calling the provider`, async () => {
      const {deps, provider} = makeDeps({
        reserveQuota: async () => {
          throw new QuotaError(scope);
        },
      });
      const err = await rejection(createCoachAIHandler(deps),
          {auth: betaAuth(), data: envelope("coach_assistant")});
      expectCode(err, "resource-exhausted", `quota-${scope}`);
      assert.equal(provider.calls.length, 0);
    });
  }

  it("caps output tokens per task and sets a timeout", async () => {
    for (const task of TASKS) {
      const {deps, provider} = makeDeps();
      await createCoachAIHandler(deps)({auth: betaAuth(), data: envelope(task)});
      assert.equal(provider.calls[0].maxOutputTokens, MAX_OUTPUT_TOKENS[task]);
      assert.ok(provider.calls[0].timeoutMs <= 45_000);
    }
  });
});

describe("successful coaching tasks (mocked provider)", () => {
  for (const task of TASKS) {
    it(`returns a versioned ${task} envelope`, async () => {
      const {deps, provider, usage} = makeDeps();
      const res = await createCoachAIHandler(deps)(
          {auth: betaAuth(), data: envelope(task)});
      assert.equal(res.schemaVersion, "coach-ai.v1");
      assert.equal(res.task, task);
      assert.equal(res.requestId, "req-test-1");
      assert.deepEqual(res.result, SAMPLE_OUTPUTS[task]());
      assert.equal(res.meta.aiGenerated, true);
      assert.equal(res.meta.provider, "openai");
      assert.deepEqual(res.meta.quota, {usedToday: 1, dailyLimit: 25});
      assert.deepEqual(res.meta.warnings, []);
      assert.equal(provider.calls.length, 1);
      assert.match(provider.calls[0].instructions, /Never ask for, infer, or invent player names/);
      assert.deepEqual(usage, [{uid: ALICE, inputTokens: 100, outputTokens: 200}]);
    });
  }

  it("flags a practice plan whose schedule does not match the request", async () => {
    const provider = makeProvider(() => ({
      data: {...samplePracticePlan(90), periods: [{...samplePracticePlan(90).periods[0], durationMinutes: 20}]},
      usage: {inputTokens: 1, outputTokens: 1},
    }));
    const {deps} = makeDeps({provider});
    const res = await createCoachAIHandler(deps)(
        {auth: betaAuth(), data: envelope("practice_plan")});
    assert.equal(res.meta.warnings.length, 1);
    assert.match(res.meta.warnings[0], /schedule-mismatch/);
  });
});

describe("privacy minimization (F-09)", () => {
  it("redacts emails, phones, links, handles and dates before the provider sees them", async () => {
    const {deps, provider} = makeDeps();
    const question = "Jalen's mom (jmom@example.com, 239-555-0101, @jalen22, " +
      "born 03/14/2015, https://x.example/p) asked about QB footwork.";
    await createCoachAIHandler(deps)({auth: betaAuth(),
      data: envelope("coach_assistant", {question})});
    const sent = JSON.stringify(provider.calls[0].input);
    for (const leaked of ["jmom@example.com", "239-555-0101", "@jalen22", "03/14/2015", "https://x.example"]) {
      assert.ok(!sent.includes(leaked), `leaked ${leaked}`);
    }
    assert.match(sent, /QB footwork/);
  });

  it("sends a hashed safety id, never the uid", async () => {
    const {deps, provider} = makeDeps();
    await createCoachAIHandler(deps)({auth: betaAuth(), data: envelope("coach_assistant")});
    assert.match(provider.calls[0].safetyId, /^[0-9a-f]{32}$/);
    assert.notEqual(provider.calls[0].safetyId, ALICE);
  });
});

describe("provider failures never leak details", () => {
  const cases = [
    ["timeout", "deadline-exceeded", "ai-timeout"],
    ["rate_limited", "resource-exhausted", "ai-busy"],
    ["refused", "failed-precondition", "ai-declined"],
    ["incomplete", "internal", "ai-invalid-output"],
    ["invalid_output", "internal", "ai-invalid-output"],
    ["auth", "internal", "ai-misconfigured"],
    ["unavailable", "unavailable", "ai-unavailable"],
  ];
  for (const [category, code, reason] of cases) {
    it(`maps ${category} to ${code}`, async () => {
      const provider = makeProvider(() => {
        throw new ProviderError(category, `upstream said: key ${CANARY_KEY} invalid`);
      });
      const {deps, logger} = makeDeps({provider});
      const err = await rejection(createCoachAIHandler(deps),
          {auth: betaAuth(), data: envelope("coach_assistant")});
      expectCode(err, code, reason);
      const surfaced = JSON.stringify({m: err.message, d: err.details});
      assert.ok(!surfaced.includes(CANARY_KEY));
      assert.ok(!surfaced.includes("upstream"));
      assert.ok(!JSON.stringify(logger.entries).includes(CANARY_KEY));
    });
  }

  it("treats unexpected exceptions as unavailable", async () => {
    const provider = makeProvider(() => {
      throw new TypeError("boom");
    });
    const {deps} = makeDeps({provider});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(), data: envelope("coach_assistant")});
    expectCode(err, "unavailable", "ai-unavailable");
  });
});

describe("output validation", () => {
  const badOutputs = [
    ["missing required field", () => {
      const a = SAMPLE_OUTPUTS.coach_assistant();
      delete a.limitations;
      return a;
    }],
    ["empty limitations", () => ({...SAMPLE_OUTPUTS.coach_assistant(), limitations: []})],
    ["unknown safety flag", () => ({...SAMPLE_OUTPUTS.coach_assistant(), safetyFlag: "ok"})],
  ];
  for (const [label, make] of badOutputs) {
    it(`rejects provider output with ${label}`, async () => {
      const provider = makeProvider(() => ({data: make(), usage: {inputTokens: 1, outputTokens: 1}}));
      const {deps} = makeDeps({provider});
      const err = await rejection(createCoachAIHandler(deps),
          {auth: betaAuth(), data: envelope("coach_assistant")});
      expectCode(err, "internal", "ai-invalid-output");
    });
  }

  // Gateway output bounds must equal the practicePlans storage bounds
  // (persistence contract §2) so any accepted plan saves without truncation.
  for (const [label, patch, ok] of [
    ["a 200-character title", {title: "t".repeat(200)}, true],
    ["a 201-character title", {title: "t".repeat(201)}, false],
    ["5000-character notes", {notes: "n".repeat(5000)}, true],
    ["5001-character notes", {notes: "n".repeat(5001)}, false],
  ]) {
    it(`${ok ? "accepts" : "rejects"} a practice plan with ${label}`, async () => {
      const provider = makeProvider(() => ({
        data: {...samplePracticePlan(90), ...patch},
        usage: {inputTokens: 1, outputTokens: 1},
      }));
      const {deps} = makeDeps({provider});
      const call = createCoachAIHandler(deps)(
          {auth: betaAuth(), data: envelope("practice_plan")});
      if (ok) {
        const res = await call;
        const key = Object.keys(patch)[0];
        assert.equal(res.result[key], patch[key]);
      } else {
        expectCode(await rejection(() => call), "internal", "ai-invalid-output");
      }
    });
  }

  it("rejects a practice plan with an absurd duration", async () => {
    const provider = makeProvider(() => ({
      data: {...samplePracticePlan(90), totalMinutes: 9000},
      usage: {inputTokens: 1, outputTokens: 1},
    }));
    const {deps} = makeDeps({provider});
    const err = await rejection(createCoachAIHandler(deps),
        {auth: betaAuth(), data: envelope("practice_plan")});
    expectCode(err, "internal", "ai-invalid-output");
  });
});

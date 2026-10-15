"use strict";
// Test doubles for the AI gateway. No network, no Firebase project.

const CANARY_KEY = "CANARY_OPENAI_KEY_NOT_A_SECRET_0000";

const ALICE = "alice-uid";
const BOB = "bob-uid";

/** Token for a signed-in, verified, beta Google user. */
function betaAuth(uid = ALICE, overrides = {}) {
  return {
    uid,
    token: {
      email_verified: true,
      beta: true,
      auth_time: Math.floor(Date.parse("2026-10-13T12:00:00Z") / 1000),
      firebase: {sign_in_provider: "google.com"},
      ...overrides,
    },
  };
}

/** Live user records as returned by admin.auth().getUser(). */
function userRecords(extra = {}) {
  return {
    [ALICE]: {uid: ALICE, disabled: false, customClaims: {beta: true},
      tokensValidAfterTime: "Mon, 12 Oct 2026 00:00:00 GMT"},
    [BOB]: {uid: BOB, disabled: false, customClaims: {beta: true},
      tokensValidAfterTime: "Mon, 12 Oct 2026 00:00:00 GMT"},
    ...extra,
  };
}

const TEAMS = {
  "team-alice": {ownerId: ALICE, name: "Eagles"},
  "team-bob": {ownerId: BOB, name: "Bears"},
};

function samplePracticePlan(total = 90) {
  return {
    title: "10U tackling fundamentals",
    ageGroup: "10U",
    totalMinutes: total,
    warmup: {durationMinutes: 10, activities: [
      {name: "Dynamic stretch", durationMinutes: 10, instructions: "Lines"},
    ]},
    periods: [
      {name: "Tackling", focus: "Leverage", durationMinutes: total - 20, drills: [
        {name: "Shimmy drill", durationMinutes: total - 20, setup: "Cones",
          instructions: "Walk-through then thud", coachingPoints: ["Eyes up"],
          equipment: ["cones"]},
      ]},
    ],
    cooldown: {durationMinutes: 10, activities: [
      {name: "Stretch", durationMinutes: 10, instructions: "Static"},
    ]},
    hydrationBreakMinutes: [30, 60],
    safetyConsiderations: ["Water every 20 minutes", "Stop on head contact"],
    notes: "",
  };
}

function sampleDrills() {
  return {drills: [{
    name: "Mirror drill", objective: "Footwork", durationMinutes: 10,
    playersNeeded: {min: 2, max: 20}, equipment: ["cones"], setup: "Pairs",
    steps: ["Face partner", "Mirror"], coachingTips: ["Stay low"],
    progressions: {easier: "Walk", harder: "Add ball"}, safetyNotes: ["Space"],
  }]};
}

function sampleAnswer() {
  return {
    answer: "Teach Cover 2 with a walk-through first.",
    keyPoints: ["Corners squat", "Safeties split"],
    suggestedNextSteps: ["Install on Tuesday"],
    limitations: ["I do not know your league rules."],
    safetyFlag: "none",
    followUpQuestions: [],
  };
}

const VALID_INPUTS = {
  practice_plan: {
    ageGroup: "10U", durationMinutes: 90, skillLevel: "beginner",
    objectives: ["tackling"], equipment: ["cones"], contactLevel: "limited_contact",
  },
  drill_recommendations: {
    skillFocus: "footwork", ageGroup: "10U", availableMinutes: 20,
    equipment: ["cones"], experienceLevel: "beginner", count: 2,
  },
  coach_assistant: {
    question: "How do I teach Cover 2 to 12U kids?",
    context: {ageGroup: "12U", topic: "defense"},
  },
};

const SAMPLE_OUTPUTS = {
  practice_plan: samplePracticePlan,
  drill_recommendations: sampleDrills,
  coach_assistant: sampleAnswer,
};

/** Capturing logger. */
function makeLogger() {
  const entries = [];
  const rec = (level) => (msg, data) => entries.push({level, msg, data});
  return {entries, info: rec("info"), warn: rec("warn"), error: rec("error")};
}

/** Fake provider that records calls and returns a scripted result. */
function makeProvider(behavior) {
  const calls = [];
  return {
    calls,
    name: "openai",
    model: "test-model",
    async generate(req) {
      calls.push(req);
      return behavior(req);
    },
  };
}

/**
 * Build gateway deps with sensible defaults; override any field.
 * @param {object} over
 * @return {object}
 */
function makeDeps(over = {}) {
  const users = over.users || userRecords();
  const logger = makeLogger();
  const provider = over.provider || makeProvider((req) => ({
    data: SAMPLE_OUTPUTS[req.task](),
    usage: {inputTokens: 100, outputTokens: 200},
  }));
  const usage = [];
  const deps = {
    isEnabled: () => true,
    getUser: async (uid) => {
      if (!users[uid]) throw new Error("auth/user-not-found");
      return users[uid];
    },
    getTeam: async (id) => TEAMS[id] || null,
    reserveQuota: async () => ({usedToday: 1, dailyLimit: 25}),
    recordUsage: async (uid, u) => usage.push({uid, ...u}),
    getProvider: () => provider,
    logger,
    now: () => new Date("2026-10-13T13:00:00Z"),
    newRequestId: () => "req-test-1",
    ...over,
  };
  return {deps, provider, logger, usage};
}

function envelope(task, input = VALID_INPUTS[task], teamId = "team-alice") {
  return {schemaVersion: "coach-ai.v1", task, teamId, input};
}

module.exports = {
  CANARY_KEY, ALICE, BOB, TEAMS, betaAuth, userRecords, makeDeps,
  makeProvider, makeLogger, envelope, VALID_INPUTS, SAMPLE_OUTPUTS,
  samplePracticePlan,
};

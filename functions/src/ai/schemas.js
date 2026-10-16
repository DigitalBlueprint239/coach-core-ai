"use strict";
/**
 * Coach Core AI gateway — versioned request/response contracts.
 *
 * Contract version: coach-ai.v1
 *
 * These schemas are the ONLY shape the web app depends on. They are
 * provider-neutral: no OpenAI (or any other provider) field ever leaks
 * through. Bump CONTRACT_VERSION for any breaking change and keep the old
 * version accepted until the frontend has migrated.
 *
 * Privacy: no input field accepts player names, contact details, dates of
 * birth or roster data. Free-text fields are length-capped and redacted
 * (see privacy.js) before they leave the server.
 */
const {z} = require("zod");

const CONTRACT_VERSION = "coach-ai.v1";

const TASKS = ["practice_plan", "drill_recommendations", "coach_assistant"];

const AGE_GROUPS = [
  "6U", "8U", "10U", "12U", "14U", "HS_JV", "HS_VARSITY", "ADULT",
];
const SKILL_LEVELS = ["beginner", "intermediate", "advanced"];
const CONTACT_LEVELS = ["non_contact", "limited_contact", "full_contact"];
const TOPICS = [
  "offense", "defense", "special_teams", "practice_planning",
  "player_development", "game_management", "safety", "other",
];

const shortText = (max) => z.string().trim().min(1).max(max);
const textList = (maxItems, maxLen) =>
  z.array(shortText(maxLen)).max(maxItems);

// ---------------------------------------------------------------- inputs

const practicePlanInput = z.object({
  ageGroup: z.enum(AGE_GROUPS),
  durationMinutes: z.number().int().min(30).max(180),
  skillLevel: z.enum(SKILL_LEVELS),
  objectives: textList(5, 120).min(1),
  equipment: textList(15, 60).default([]),
  contactLevel: z.enum(CONTACT_LEVELS).default("non_contact"),
}).strict();

const drillRecommendationsInput = z.object({
  skillFocus: shortText(80),
  ageGroup: z.enum(AGE_GROUPS),
  availableMinutes: z.number().int().min(5).max(90),
  equipment: textList(15, 60).default([]),
  experienceLevel: z.enum(SKILL_LEVELS),
  count: z.number().int().min(1).max(6).default(3),
}).strict();

const coachAssistantInput = z.object({
  question: z.string().trim().min(3).max(1000),
  context: z.object({
    ageGroup: z.enum(AGE_GROUPS).optional(),
    skillLevel: z.enum(SKILL_LEVELS).optional(),
    topic: z.enum(TOPICS).optional(),
  }).strict().default({}),
}).strict();

const INPUT_SCHEMAS = {
  practice_plan: practicePlanInput,
  drill_recommendations: drillRecommendationsInput,
  coach_assistant: coachAssistantInput,
};

const requestEnvelope = z.object({
  schemaVersion: z.literal(CONTRACT_VERSION),
  task: z.enum(TASKS),
  teamId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
  input: z.unknown(),
}).strict();

// --------------------------------------------------------------- outputs
// Provider-facing output schemas use only types, enums and required keys
// (portable across structured-output implementations). Numeric/size limits
// are enforced afterwards by OUTPUT_LIMITS on the server.

const activity = z.object({
  name: z.string(),
  durationMinutes: z.number(),
  instructions: z.string(),
});

const planDrill = z.object({
  name: z.string(),
  durationMinutes: z.number(),
  setup: z.string(),
  instructions: z.string(),
  coachingPoints: z.array(z.string()),
  equipment: z.array(z.string()),
});

const practicePlanOutput = z.object({
  title: z.string(),
  ageGroup: z.enum(AGE_GROUPS),
  totalMinutes: z.number(),
  warmup: z.object({
    durationMinutes: z.number(),
    activities: z.array(activity),
  }),
  periods: z.array(z.object({
    name: z.string(),
    focus: z.string(),
    durationMinutes: z.number(),
    drills: z.array(planDrill),
  })),
  cooldown: z.object({
    durationMinutes: z.number(),
    activities: z.array(activity),
  }),
  hydrationBreakMinutes: z.array(z.number()),
  safetyConsiderations: z.array(z.string()),
  notes: z.string(),
});

const drillRecommendationsOutput = z.object({
  drills: z.array(z.object({
    name: z.string(),
    objective: z.string(),
    durationMinutes: z.number(),
    playersNeeded: z.object({min: z.number(), max: z.number()}),
    equipment: z.array(z.string()),
    setup: z.string(),
    steps: z.array(z.string()),
    coachingTips: z.array(z.string()),
    progressions: z.object({easier: z.string(), harder: z.string()}),
    safetyNotes: z.array(z.string()),
  })),
});

const coachAssistantOutput = z.object({
  answer: z.string(),
  keyPoints: z.array(z.string()),
  suggestedNextSteps: z.array(z.string()),
  limitations: z.array(z.string()),
  safetyFlag: z.enum([
    "none", "consult_medical_professional", "consult_league_rules",
  ]),
  followUpQuestions: z.array(z.string()),
});

const OUTPUT_SCHEMAS = {
  practice_plan: practicePlanOutput,
  drill_recommendations: drillRecommendationsOutput,
  coach_assistant: coachAssistantOutput,
};

// Server-side bounds applied to every provider result (defense in depth).
const nonNeg = (max) => z.number().min(0).max(max);
const OUTPUT_LIMITS = {
  practice_plan: z.object({
    title: z.string().min(1).max(200),
    totalMinutes: nonNeg(240),
    warmup: z.object({
      durationMinutes: nonNeg(60),
      activities: z.array(
          z.object({durationMinutes: nonNeg(60)}).passthrough()).max(10),
    }).passthrough(),
    periods: z.array(z.object({
      durationMinutes: nonNeg(120),
      drills: z.array(
          z.object({durationMinutes: nonNeg(120)}).passthrough()).max(10),
    }).passthrough()).min(1).max(20),
    cooldown: z.object({durationMinutes: nonNeg(60)}).passthrough(),
    hydrationBreakMinutes: z.array(nonNeg(240)).max(20),
    safetyConsiderations: z.array(z.string().max(500)).min(1).max(20),
    // Same bound as practicePlans.notes in firestore.rules, so every valid
    // result can be saved without truncation (persistence contract §2).
    notes: z.string().max(5000),
  }).passthrough(),
  drill_recommendations: z.object({
    drills: z.array(z.object({
      durationMinutes: nonNeg(90),
      steps: z.array(z.string().max(1000)).min(1).max(20),
    }).passthrough()).min(1).max(6),
  }).passthrough(),
  coach_assistant: z.object({
    answer: z.string().min(1).max(8000),
    limitations: z.array(z.string()).min(1).max(10),
  }).passthrough(),
};

const MAX_OUTPUT_TOKENS = {
  practice_plan: 3000,
  drill_recommendations: 2000,
  coach_assistant: 1200,
};

module.exports = {
  CONTRACT_VERSION,
  TASKS,
  AGE_GROUPS,
  SKILL_LEVELS,
  CONTACT_LEVELS,
  TOPICS,
  INPUT_SCHEMAS,
  OUTPUT_SCHEMAS,
  OUTPUT_LIMITS,
  MAX_OUTPUT_TOKENS,
  requestEnvelope,
};

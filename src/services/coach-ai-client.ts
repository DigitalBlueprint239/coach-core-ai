// Coach Core AI — browser client for the server-side AI gateway.
//
// This is the ONLY way the web app talks to AI. It calls the authenticated
// Firebase callable `coachAI`; the OpenAI key lives in Secret Manager on the
// server and never reaches the browser. Types mirror contract coach-ai.v1
// (functions/src/ai/schemas.js). Keep them in sync when the contract changes.

import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app } from '../firebase';

export const COACH_AI_CONTRACT = 'coach-ai.v1' as const;

/** Show next to every AI input. The server also redacts contact details. */
export const AI_PRIVACY_NOTICE =
  'Do not enter player names, contact details, birth dates or medical information. ' +
  'AI suggestions are drafts — review them before using them with athletes.';

export type AgeGroup = '6U' | '8U' | '10U' | '12U' | '14U' | 'HS_JV' | 'HS_VARSITY' | 'ADULT';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type ContactLevel = 'non_contact' | 'limited_contact' | 'full_contact';
export type CoachTopic =
  | 'offense' | 'defense' | 'special_teams' | 'practice_planning'
  | 'player_development' | 'game_management' | 'safety' | 'other';

export const AGE_GROUP_OPTIONS: { value: AgeGroup; label: string }[] = [
  { value: '6U', label: '6U' }, { value: '8U', label: '8U' },
  { value: '10U', label: '10U' }, { value: '12U', label: '12U' },
  { value: '14U', label: '14U' }, { value: 'HS_JV', label: 'High school JV' },
  { value: 'HS_VARSITY', label: 'High school varsity' }, { value: 'ADULT', label: 'Adult' },
];

// ---------------------------------------------------------------- inputs
export interface PracticePlanInput {
  ageGroup: AgeGroup;
  durationMinutes: number; // 30–180
  skillLevel: SkillLevel;
  objectives: string[]; // 1–5, each ≤120 chars
  equipment?: string[]; // ≤15, each ≤60 chars
  contactLevel?: ContactLevel; // default non_contact
}

export interface DrillRecommendationsInput {
  skillFocus: string; // ≤80 chars
  ageGroup: AgeGroup;
  availableMinutes: number; // 5–90
  equipment?: string[];
  experienceLevel: SkillLevel;
  count?: number; // 1–6, default 3
}

export interface CoachAssistantInput {
  question: string; // 3–1000 chars. Do not include player names or personal details.
  context?: { ageGroup?: AgeGroup; skillLevel?: SkillLevel; topic?: CoachTopic };
}

// --------------------------------------------------------------- outputs
export interface PlanActivity { name: string; durationMinutes: number; instructions: string }
export interface PlanDrill {
  name: string; durationMinutes: number; setup: string; instructions: string;
  coachingPoints: string[]; equipment: string[];
}
export interface PracticePlanResult {
  title: string;
  ageGroup: AgeGroup;
  totalMinutes: number;
  warmup: { durationMinutes: number; activities: PlanActivity[] };
  periods: { name: string; focus: string; durationMinutes: number; drills: PlanDrill[] }[];
  cooldown: { durationMinutes: number; activities: PlanActivity[] };
  hydrationBreakMinutes: number[];
  safetyConsiderations: string[];
  notes: string;
}

export interface DrillRecommendationsResult {
  drills: {
    name: string; objective: string; durationMinutes: number;
    playersNeeded: { min: number; max: number };
    equipment: string[]; setup: string; steps: string[]; coachingTips: string[];
    progressions: { easier: string; harder: string }; safetyNotes: string[];
  }[];
}

export interface CoachAssistantResult {
  answer: string;
  keyPoints: string[];
  suggestedNextSteps: string[];
  limitations: string[];
  safetyFlag: 'none' | 'consult_medical_professional' | 'consult_league_rules';
  followUpQuestions: string[];
}

export interface CoachAITaskMap {
  practice_plan: { input: PracticePlanInput; result: PracticePlanResult };
  drill_recommendations: { input: DrillRecommendationsInput; result: DrillRecommendationsResult };
  coach_assistant: { input: CoachAssistantInput; result: CoachAssistantResult };
}
export type CoachAITask = keyof CoachAITaskMap;

export interface CoachAIResponse<T extends CoachAITask> {
  schemaVersion: typeof COACH_AI_CONTRACT;
  task: T;
  requestId: string;
  result: CoachAITaskMap[T]['result'];
  meta: {
    aiGenerated: true;
    provider: string;
    model: string;
    generatedAt: string;
    quota: { usedToday: number; dailyLimit: number };
    warnings: string[];
  };
}

// ---------------------------------------------------------------- errors
const FRIENDLY: Record<string, string> = {
  'sign-in-required': 'Please sign in to use AI features.',
  'anonymous-not-allowed': 'Please sign in with your coach account.',
  'email-not-verified': 'Please verify your email address first.',
  'beta-access-required': 'Your account is not enabled for the private beta yet.',
  'account-disabled': 'This account is disabled.',
  'account-not-found': 'Please sign in again.',
  'session-revoked': 'Your session ended. Please sign in again.',
  'team-access-denied': 'You can only use AI for teams you own.',
  'invalid-request': 'The request was not valid. Please refresh and try again.',
  'invalid-input': 'Some details are missing or out of range.',
  'ai-disabled': 'AI features are turned off right now. Everything else still works.',
  'quota-user_daily': 'You have reached today\'s AI limit. It resets at midnight UTC.',
  'quota-user_burst': 'Too many AI requests in a row. Wait a minute and try again.',
  'quota-global_daily': 'AI is at capacity for today. Please try again tomorrow.',
  'quota-unavailable': 'AI is temporarily unavailable. Please try again shortly.',
  'ai-timeout': 'The AI took too long to answer. Please try again.',
  'ai-busy': 'The AI service is busy. Please try again shortly.',
  'ai-declined': 'The AI could not help with that request. Try rephrasing it.',
  'ai-invalid-output': 'The AI returned an unusable answer. Please try again.',
  'ai-misconfigured': 'AI is not configured correctly. Please tell the Coach Core team.',
  'ai-unavailable': 'AI is temporarily unavailable. Please try again shortly.',
  'not-in-beta': 'This AI feature is not part of the private beta.',
  'team-required': 'Create or select a team first.',
  'age-group-required': 'Choose an age group first.',
  'objectives-required': 'Choose at least one practice goal.',
};

export class CoachAIError extends Error {
  readonly code: string;
  readonly reason: string;
  readonly requestId?: string;
  readonly issues?: string[];

  constructor(code: string, reason: string, requestId?: string, issues?: string[]) {
    super(FRIENDLY[reason] || 'AI request failed. Please try again.');
    this.name = 'CoachAIError';
    this.code = code;
    this.reason = reason;
    this.requestId = requestId;
    this.issues = issues;
  }
}

function toCoachAIError(err: unknown): CoachAIError {
  const e = err as { code?: string; details?: { reason?: string; requestId?: string; issues?: string[] } };
  const code = String(e?.code || 'unknown').replace(/^functions\//, '');
  const reason = e?.details?.reason || (code === 'unauthenticated' ? 'sign-in-required' : 'ai-unavailable');
  return new CoachAIError(code, reason, e?.details?.requestId, e?.details?.issues);
}

// ---------------------------------------------------------------- client
let functionsInstance: Functions | null = null;
function functions(): Functions {
  if (!functionsInstance) functionsInstance = getFunctions(app);
  return functionsInstance;
}

/**
 * Call the AI gateway for one coaching task.
 * @throws CoachAIError with a coach-friendly message and a stable `reason`.
 */
export async function callCoachAI<T extends CoachAITask>(
  task: T,
  teamId: string,
  input: CoachAITaskMap[T]['input'],
): Promise<CoachAIResponse<T>> {
  const callable = httpsCallable<unknown, CoachAIResponse<T>>(functions(), 'coachAI', { timeout: 70_000 });
  try {
    const res = await callable({ schemaVersion: COACH_AI_CONTRACT, task, teamId, input });
    return res.data;
  } catch (err) {
    throw toCoachAIError(err);
  }
}

export const coachAI = {
  practicePlan: (teamId: string, input: PracticePlanInput) => callCoachAI('practice_plan', teamId, input),
  drillRecommendations: (teamId: string, input: DrillRecommendationsInput) =>
    callCoachAI('drill_recommendations', teamId, input),
  assistant: (teamId: string, input: CoachAssistantInput) => callCoachAI('coach_assistant', teamId, input),
};

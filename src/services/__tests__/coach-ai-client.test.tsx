// Browser side of the AI gateway (Day 2, F-01): the client sends only the
// versioned envelope to the `coachAI` callable, maps server errors to
// coach-friendly messages, and the AI context fails closed for non-beta
// features instead of fabricating output.
import React from 'react';
import { render, act } from '@testing-library/react';

const mockCalls: { name: string; payload: unknown }[] = [];
let mockImpl: (payload: unknown) => Promise<unknown> = () => Promise.resolve({ data: null });

jest.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (_f: unknown, name: string) => (payload: unknown) => {
    mockCalls.push({ name, payload });
    return mockImpl(payload);
  },
}));
jest.mock('../../firebase', () => ({ app: {}, auth: {}, db: {} }));
jest.mock('../../contexts/TeamContext', () => ({
  useTeam: () => ({ currentTeam: { id: 'team-alice', name: 'Eagles' } }),
}));

// eslint-disable-next-line import/first
import { callCoachAI, CoachAIError, COACH_AI_CONTRACT } from '../coach-ai-client';
// eslint-disable-next-line import/first
import { AIProvider, useAI } from '../../ai-brain/AIContext';

beforeEach(() => {
  mockCalls.length = 0;
  mockImpl = () => Promise.resolve({ data: null });
});

describe('callCoachAI', () => {
  it('calls the coachAI callable with the versioned envelope only', async () => {
    mockImpl = () => Promise.resolve({ data: { schemaVersion: COACH_AI_CONTRACT, task: 'coach_assistant', result: { answer: 'ok' } } });
    const res = await callCoachAI('coach_assistant', 'team-alice', { question: 'How do I teach stance?' });
    expect(res.result).toEqual({ answer: 'ok' });
    expect(mockCalls).toHaveLength(1);
    expect(mockCalls[0].name).toBe('coachAI');
    expect(mockCalls[0].payload).toEqual({
      schemaVersion: 'coach-ai.v1',
      task: 'coach_assistant',
      teamId: 'team-alice',
      input: { question: 'How do I teach stance?' },
    });
  });

  it('maps server errors to friendly messages with a stable reason', async () => {
    mockImpl = () => Promise.reject({ code: 'functions/resource-exhausted', details: { reason: 'quota-user_daily', requestId: 'r1' } });
    await expect(callCoachAI('coach_assistant', 't', { question: 'abc' })).rejects.toMatchObject({
      name: 'CoachAIError', code: 'resource-exhausted', reason: 'quota-user_daily', requestId: 'r1',
      message: expect.stringMatching(/today's AI limit/),
    });
  });

  it('treats unknown failures as unavailable without exposing internals', async () => {
    mockImpl = () => Promise.reject(new Error('socket hang up: secret internals'));
    const err = await callCoachAI('coach_assistant', 't', { question: 'abc' }).catch((e) => e);
    expect(err).toBeInstanceOf(CoachAIError);
    expect(err.reason).toBe('ai-unavailable');
    expect(err.message).not.toMatch(/internals/);
  });
});

describe('AIProvider', () => {
  function capture() {
    const ref: { ai: ReturnType<typeof useAI> | null } = { ai: null };
    function Probe() {
      ref.ai = useAI();
      return null;
    }
    render(<AIProvider><Probe /></AIProvider>);
    return ref;
  }

  it('routes practice planning through the gateway using the current team', async () => {
    mockImpl = () => Promise.resolve({ data: { result: { title: 'Plan' }, meta: { warnings: [] }, requestId: 'r2' } });
    const ref = capture();
    let out: any;
    await act(async () => {
      out = await ref.ai!.generateSmartPractice({ duration: 500, goals: ['skill_dev'], teamId: 'demo-team', ageGroup: '10U' });
    });
    expect(out.title).toBe('Plan');
    const payload = mockCalls[0].payload as any;
    expect(payload.task).toBe('practice_plan');
    expect(payload.teamId).toBe('team-alice');
    expect(payload.input).toEqual({
      ageGroup: '10U', durationMinutes: 180, skillLevel: 'beginner',
      objectives: ['Skill development'], equipment: [], contactLevel: 'non_contact',
    });
  });

  it('never sends roster context to the gateway', async () => {
    mockImpl = () => Promise.resolve({ data: { result: {}, meta: {}, requestId: 'r' } });
    const ref = capture();
    await act(async () => {
      await ref.ai!.generateSmartPractice({ duration: 60, goals: ['tackling'], ageGroup: '12U', rosterContext: { players: ['Jalen Smith #7'] } });
    });
    expect(JSON.stringify(mockCalls[0].payload)).not.toMatch(/Jalen/);
  });

  it('requires an age group instead of guessing one', async () => {
    const ref = capture();
    await act(async () => {
      await expect(ref.ai!.generateSmartPractice({ duration: 60, goals: ['tackling'] }))
        .rejects.toMatchObject({ reason: 'age-group-required' });
    });
    expect(mockCalls).toHaveLength(0);
  });

  it('fails closed for AI features outside the private beta', async () => {
    const ref = capture();
    for (const call of [
      () => ref.ai!.analyzeFormation({}),
      () => ref.ai!.generateGamePlan({}, {}),
      () => ref.ai!.getCoverageRecommendation({}),
      () => ref.ai!.generatePlaySuggestion({} as any, {} as any),
    ]) {
      await expect(call()).rejects.toMatchObject({ reason: 'not-in-beta' });
    }
    expect(mockCalls).toHaveLength(0);
  });
});

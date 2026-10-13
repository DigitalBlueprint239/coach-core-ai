import React, { useState } from 'react';
import { useAI } from '../../ai-brain/AIContext';
import { AGE_GROUP_OPTIONS, type AgeGroup, type SkillLevel } from '../../services/coach-ai-client';

const defaultGoals = [
  { label: 'Game Prep', value: 'game_prep' },
  { label: 'Red Zone Offense', value: 'red_zone_offense' },
  { label: 'Skill Development', value: 'skill_dev' },
  { label: 'Conditioning', value: 'conditioning' },
];

const PracticePlanner: React.FC = () => {
  const ai = useAI();
  const [duration, setDuration] = useState(90);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | ''>('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAIResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  const handleGoalChange = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleAIGenerate = async () => {
    setLoading(true);
    setError(null);
    setAIResult(null);
    setFeedback(null);
    try {
      // Team id comes from the signed-in coach's current team (AIContext);
      // the server re-checks ownership. No roster data is sent.
      const result = await ai.generateSmartPractice({
        duration,
        goals,
        ageGroup: ageGroup || undefined,
        skillLevel,
      });
      setAIResult(result);
    } catch (err: any) {
      setError(err?.message || 'AI generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (type: 'helpful' | 'not_helpful') => {
    setFeedback(type);
    ai.recordOutcome('practice_generated', type === 'helpful' ? 'success' : 'failure');
  };

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Practice Plan Generator (AI)</h2>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Duration (minutes)</label>
        <input
          type="number"
          min={30}
          max={180}
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded focus:outline-none focus:ring"
        />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="pp-age" className="block mb-1 font-medium">Age group</label>
          <select id="pp-age" value={ageGroup} onChange={e => setAgeGroup(e.target.value as AgeGroup)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring">
            <option value="">Choose…</option>
            {AGE_GROUP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pp-skill" className="block mb-1 font-medium">Skill level</label>
          <select id="pp-skill" value={skillLevel} onChange={e => setSkillLevel(e.target.value as SkillLevel)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring">
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Goals</label>
        <div className="flex flex-wrap gap-2">
          {defaultGoals.map(goal => (
            <button
              key={goal.value}
              type="button"
              onClick={() => handleGoalChange(goal.value)}
              className={`px-3 py-1 rounded-full border ${goals.includes(goal.value) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={handleAIGenerate}
        disabled={loading || goals.length === 0 || !ageGroup}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition mb-4 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate with AI'}
      </button>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {aiResult && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          {/* coach-ai.v1 practice_plan result; AI-generated, coach should review */}
          <h3 className="font-semibold text-lg mb-1">{aiResult.title || 'AI-Generated Practice Plan'}</h3>
          <p className="text-xs text-gray-500 mb-3">AI-generated draft — review before running practice.</p>
          {aiResult.warmup && (
            <p className="text-sm mb-2"><span className="font-medium">Warm-up:</span> {aiResult.warmup.durationMinutes} min</p>
          )}
          {Array.isArray(aiResult.periods) && (
            <div className="mb-2">
              <span className="font-medium">Periods:</span>
              <ul className="list-decimal ml-6 text-sm">
                {aiResult.periods.map((period: any, i: number) => (
                  <li key={i} className="mb-1">
                    <span className="font-semibold">{period.name}</span> — {period.durationMinutes} min{period.focus ? `, ${period.focus}` : ''}
                    {Array.isArray(period.drills) && (
                      <ul className="list-disc ml-6 text-xs text-gray-700">
                        {period.drills.map((drill: any, j: number) => (
                          <li key={j}>{drill.name} ({drill.durationMinutes} min)</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {Array.isArray(aiResult.safetyConsiderations) && aiResult.safetyConsiderations.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Safety:</span>
              <ul className="list-disc ml-6 text-sm text-blue-900">
                {aiResult.safetyConsiderations.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {aiResult.meta?.warnings?.length > 0 && (
            <p className="text-xs text-amber-700">Check the schedule: durations may not add up exactly.</p>
          )}
          {/* Feedback */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-500">Was this helpful?</span>
            <button
              onClick={() => handleFeedback('helpful')}
              className={`p-1 rounded ${feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
              disabled={!!feedback}
            >👍</button>
            <button
              onClick={() => handleFeedback('not_helpful')}
              className={`p-1 rounded ${feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
              disabled={!!feedback}
            >👎</button>
            {feedback && (
              <span className="text-xs ml-2 text-gray-600">Thank you for your feedback!</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticePlanner;

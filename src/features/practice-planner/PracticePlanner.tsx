import React, { useState, useEffect } from 'react';
import { useAI } from '../../ai-brain/AIContext';
import { useTeam } from '../../contexts/TeamContext';
import { savePracticePlan, getPracticePlans, type PracticePlan } from '../../services/firestore';

const defaultGoals = [
  { label: 'Game Prep', value: 'game_prep' },
  { label: 'Red Zone Offense', value: 'red_zone_offense' },
  { label: 'Skill Development', value: 'skill_dev' },
  { label: 'Conditioning', value: 'conditioning' },
];

const PracticePlanner: React.FC = () => {
  const ai = useAI();
  const { currentTeam } = useTeam();
  const [duration, setDuration] = useState(90);
  const [goals, setGoals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiResult, setAIResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [savedPlans, setSavedPlans] = useState<PracticePlan[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load saved plans when team changes
  useEffect(() => {
    if (!currentTeam) return;
    let cancelled = false;
    getPracticePlans(currentTeam.id)
      .then((plans) => { if (!cancelled) setSavedPlans(plans); })
      .catch((err) => console.error('Failed to load saved plans:', err));
    return () => { cancelled = true; };
  }, [currentTeam]);

  const handleGoalChange = (goal: string) => {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleAIGenerate = async () => {
    if (!currentTeam) {
      setError('Please create or join a team first.');
      return;
    }
    setLoading(true);
    setError(null);
    setAIResult(null);
    setFeedback(null);
    setSaveSuccess(false);
    try {
      const teamContext = {
        teamId: currentTeam.id,
        teamName: currentTeam.name,
        sport: 'football' as const,
        ageGroup: 'high_school' as const,
      };
      const result = await ai.generatePracticePlan(teamContext, goals, duration);
      setAIResult(result);
    } catch {
      setError('AI generation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTeam || !aiResult) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const planData = {
        name: `Practice - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString().split('T')[0],
        duration,
        periods: aiResult.plan?.periods ?? [],
        goals,
        notes: aiResult.insights?.join('; ') ?? '',
      };
      await savePracticePlan(currentTeam.id, planData);
      setSaveSuccess(true);
      // Refresh saved plans list
      const plans = await getPracticePlans(currentTeam.id);
      setSavedPlans(plans);
    } catch {
      setError('Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFeedback = (type: 'helpful' | 'not_helpful') => {
    setFeedback(type);
    ai.recordOutcome('practice_generated', type === 'helpful' ? 'success' : 'failure');
  };

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Practice Plan Generator (AI)</h2>

      {!currentTeam && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg">
          Create or join a team to generate and save practice plans.
        </div>
      )}

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
        disabled={loading || goals.length === 0 || !currentTeam}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition mb-4 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate with AI'}
      </button>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      {aiResult && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-lg mb-2">AI-Generated Practice Plan</h3>
          <div className="mb-2">
            <span className="font-medium">Confidence:</span> <span className="text-blue-700">{Math.round((aiResult.confidence || 0) * 100)}%</span>
          </div>
          {aiResult.insights && aiResult.insights.length > 0 && (
            <div className="mb-2">
              <span className="font-medium">Insights:</span>
              <ul className="list-disc ml-6 text-sm text-blue-900">
                {aiResult.insights.map((insight: string, i: number) => (
                  <li key={i}>{insight}</li>
                ))}
              </ul>
            </div>
          )}
          {aiResult.plan && aiResult.plan.periods && (
            <div className="mb-2">
              <span className="font-medium">Periods:</span>
              <ul className="list-decimal ml-6 text-sm">
                {aiResult.plan.periods.map((period: any, i: number) => (
                  <li key={i} className="mb-1">
                    <span className="font-semibold">{period.name}</span> - {period.duration} min, Intensity: {period.intensity}
                    {period.drills && (
                      <ul className="list-disc ml-6 text-xs text-gray-700">
                        {period.drills.map((drill: string, j: number) => (
                          <li key={j}>{drill}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || saveSuccess}
            className="w-full mt-3 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Plan'}
          </button>

          {/* Feedback */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-500">Was this helpful?</span>
            <button
              onClick={() => handleFeedback('helpful')}
              className={`p-1 rounded ${feedback === 'helpful' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
              disabled={!!feedback}
            >thumbs up</button>
            <button
              onClick={() => handleFeedback('not_helpful')}
              className={`p-1 rounded ${feedback === 'not_helpful' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
              disabled={!!feedback}
            >thumbs down</button>
            {feedback && (
              <span className="text-xs ml-2 text-gray-600">Thank you for your feedback!</span>
            )}
          </div>
        </div>
      )}

      {/* Saved plans list */}
      {savedPlans.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Saved Plans</h3>
          <ul className="space-y-2">
            {savedPlans.map((plan) => (
              <li key={plan.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{plan.name}</span>
                  <span className="text-xs text-gray-500">{plan.date}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {plan.duration} min &middot; {plan.goals.join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PracticePlanner;

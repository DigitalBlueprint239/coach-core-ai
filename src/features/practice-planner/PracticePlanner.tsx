import React, { useState } from 'react';
import { useAI } from '../../ai-brain/AIContext';
import { useTeam } from '../../contexts/TeamContext';

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
      const teamContext = currentTeam
        ? {
            teamId: currentTeam.id,
            teamName: currentTeam.name,
            sport: (currentTeam as any).sport || 'football',
            ageGroup: (currentTeam.level as any),
          }
        : { 
            teamId: '', 
            teamName: 'My Team', 
            sport: 'football', 
            ageGroup: 'youth' 
          };
      const result = await ai.generatePracticePlan(teamContext, goals, duration);
      setAIResult(result);
    } catch (err: any) {
      setError('AI generation failed. Please try again.');
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
        disabled={loading || goals.length === 0}
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

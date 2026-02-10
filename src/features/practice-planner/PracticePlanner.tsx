import React, { useState } from 'react';
import { useAI } from '../../ai-brain/AIContext';
import {
  adaptToPracticeSuggestionOutput,
  isMedicalAdviceRequest,
  PracticeSuggestionInput,
  PracticeSuggestionOutput,
  validatePracticeSuggestionOutput
} from '../../ai/contract/practiceSuggestion';
import { persistValidatedPracticePlan, persistValidatedSegmentUpdate } from './persistence';

const defaultGoals = [
  { label: 'Game Prep', value: 'game_prep' },
  { label: 'Red Zone Offense', value: 'red_zone_offense' },
  { label: 'Skill Development', value: 'skill_dev' },
  { label: 'Conditioning', value: 'conditioning' }
];

const PracticePlanner: React.FC = () => {
  const ai = useAI();
  const [duration, setDuration] = useState(90);
  const [goals, setGoals] = useState<string[]>([]);
  const [sport, setSport] = useState('football');
  const [ageGroup, setAgeGroup] = useState('high_school');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [rosterSize, setRosterSize] = useState(20);
  const [equipmentAvailable, setEquipmentAvailable] = useState('cones,balls,bibs');
  const [coachTone, setCoachTone] = useState('encouraging');
  const [coachPhilosophy, setCoachPhilosophy] = useState('teach-first, high-effort');
  const [loading, setLoading] = useState(false);
  const [aiResult, setAIResult] = useState<{ plan: PracticeSuggestionOutput; metadata: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoalChange = (goal: string) => {
    setGoals((prev) => (prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]));
  };

  const buildInput = (): PracticeSuggestionInput => ({
    sport,
    ageGroup,
    skillLevel,
    rosterSize,
    durationMinutes: duration,
    equipmentAvailable: equipmentAvailable.split(',').map((i) => i.trim()).filter(Boolean),
    focusGoals: goals,
    coachStyleProfile: {
      tone: coachTone,
      philosophy: coachPhilosophy
    }
  });

  const handleAIGenerate = async () => {
    setLoading(true);
    setError(null);
    setAIResult(null);

    const input = buildInput();

    if (isMedicalAdviceRequest(input)) {
      setLoading(false);
      setError('Coach Core cannot provide medical or injury treatment advice. Please consult a qualified medical professional.');
      return;
    }

    try {
      const teamContext = {
        teamId: 'demo-team',
        teamName: 'Demo Team',
        sport: sport as any,
        ageGroup: ageGroup as any,
        skillLevel,
        playerCount: rosterSize
      };

      const raw = await ai.generatePracticePlan(teamContext, goals, duration, {
        equipmentAvailable: input.equipmentAvailable,
        coachStyleProfile: input.coachStyleProfile
      });

      const structured = adaptToPracticeSuggestionOutput(raw, input);
      const validation = validatePracticeSuggestionOutput(structured);

      if (!validation.valid) {
        throw new Error(`Invalid AI response: ${validation.errors.join(' ')}`);
      }

      const metadata = {
        input,
        generatedAt: new Date().toISOString(),
        source: 'practice_planner'
      };

      setAIResult({ plan: structured, metadata });
      persistValidatedPracticePlan(structured, metadata);
    } catch (err: any) {
      setError(err?.message || 'AI generation failed. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateSegment = async (segmentId: string) => {
    if (!aiResult) return;

    try {
      const input = aiResult.metadata.input as PracticeSuggestionInput;
      const teamContext = {
        teamId: 'demo-team',
        teamName: 'Demo Team',
        sport: input.sport as any,
        ageGroup: input.ageGroup as any,
        skillLevel: input.skillLevel,
        playerCount: input.rosterSize
      };

      const raw = await ai.generatePracticePlan(teamContext, input.focusGoals, input.durationMinutes, {
        equipmentAvailable: input.equipmentAvailable,
        coachStyleProfile: input.coachStyleProfile,
        regenerateSegmentId: segmentId,
        regeneratePurpose: `Regenerate segment ${segmentId}`
      });

      const structured = adaptToPracticeSuggestionOutput(raw, input);
      const validation = validatePracticeSuggestionOutput(structured);
      if (!validation.valid) {
        setError(`Regeneration rejected: ${validation.errors.join(' ')}`);
        return;
      }

      const replacement = structured.segments.find((s) => s.id === segmentId) || structured.segments[0];
      const markedReplacement = { ...replacement, id: segmentId, regenerated: true };
      const nextPlan: PracticeSuggestionOutput = {
        ...aiResult.plan,
        segments: aiResult.plan.segments.map((s) => (s.id === segmentId ? markedReplacement : s))
      };

      const persisted = persistValidatedSegmentUpdate(nextPlan, markedReplacement, {
        ...aiResult.metadata,
        regeneratedAt: new Date().toISOString(),
        regeneratedSegmentId: segmentId
      });

      if (!persisted) {
        setError('Regenerated segment failed validation and was not saved.');
        return;
      }

      setAIResult({ ...aiResult, plan: nextPlan });
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate segment.');
    }
  };

  const updateSegmentPoint = (segmentId: string, text: string) => {
    if (!aiResult) return;
    const updated = {
      ...aiResult.plan,
      segments: aiResult.plan.segments.map((s) =>
        s.id === segmentId ? { ...s, coachingPoints: [text, ...s.coachingPoints.slice(1)] } : s
      )
    };
    setAIResult({ ...aiResult, plan: updated });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md mt-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Practice Plan Generator (AI)</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input value={sport} onChange={(e) => setSport(e.target.value)} className="px-3 py-2 border rounded" placeholder="sport" />
        <input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="px-3 py-2 border rounded" placeholder="age group" />
        <input value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)} className="px-3 py-2 border rounded" placeholder="skill level" />
        <input type="number" min={5} value={rosterSize} onChange={(e) => setRosterSize(Number(e.target.value))} className="px-3 py-2 border rounded" placeholder="roster size" />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Duration (minutes)</label>
        <input type="number" min={30} max={180} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full px-3 py-2 border rounded" />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Equipment (comma-separated)</label>
        <input value={equipmentAvailable} onChange={(e) => setEquipmentAvailable(e.target.value)} className="w-full px-3 py-2 border rounded" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <input value={coachTone} onChange={(e) => setCoachTone(e.target.value)} className="px-3 py-2 border rounded" placeholder="coach tone" />
        <input value={coachPhilosophy} onChange={(e) => setCoachPhilosophy(e.target.value)} className="px-3 py-2 border rounded" placeholder="coach philosophy" />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Goals</label>
        <div className="flex flex-wrap gap-2">
          {defaultGoals.map((goal) => (
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
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-2 rounded-lg font-semibold mb-4 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate with AI'}
      </button>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      {aiResult && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="structured-practice-plan">
          <h3 className="font-semibold text-lg mb-2">{aiResult.plan.title}</h3>
          <p className="text-sm text-blue-900 mb-3">{aiResult.plan.whyThisPlan}</p>
          <ul className="space-y-3">
            {aiResult.plan.segments.map((segment) => (
              <li key={segment.id} className="bg-white border rounded p-3">
                <div className="flex justify-between items-center">
                  <strong>{segment.setup}</strong>
                  <span className="text-xs text-gray-500">{segment.minutes} min</span>
                </div>
                <textarea
                  className="w-full mt-2 p-2 border rounded text-sm"
                  value={segment.coachingPoints[0] || ''}
                  onChange={(e) => updateSegmentPoint(segment.id, e.target.value)}
                />
                <div className="text-xs text-gray-600 mt-2">Status: {segment.regenerated ? 'Regenerated' : 'Original'} • Variations: {segment.variations.join(' • ')}</div>
                <button onClick={() => regenerateSegment(segment.id)} className="mt-2 text-xs text-blue-700 underline">Regenerate this segment</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PracticePlanner;

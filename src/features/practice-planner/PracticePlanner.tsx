// Team-scoped, coach-authored practice workflow. AI suggestions are strictly optional and do not auto-save.
import React, { useId, useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useTeam } from '../../contexts/TeamContext';
import { usePracticePlans } from '../../hooks/useFirestore';
import { useAI } from '../../ai-brain/AIContext';

const GOALS = [
  { label: 'Game Prep', value: 'game_prep' },
  { label: 'Red Zone Offense', value: 'red_zone_offense' },
  { label: 'Skill Development', value: 'skill_dev' },
  { label: 'Conditioning', value: 'conditioning' },
];

type AIOverview = { insights: string[]; periods: Array<{ name: string; duration: number; drills: string[] }> };
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

function safeAIOverview(raw: unknown): AIOverview {
  if (!isRecord(raw)) return { insights: [], periods: [] };
  const insights = Array.isArray(raw.insights) ? raw.insights.filter((x): x is string => typeof x === 'string') : [];
  const plan: Record<string, unknown> = isRecord(raw.plan) ? raw.plan : {};
  const rawPeriods = Array.isArray(plan.periods) ? plan.periods : [];
  const periods = rawPeriods.filter(isRecord).map(period => ({
    name: typeof period.name === 'string' ? period.name : 'Practice period',
    duration: typeof period.duration === 'number' && Number.isFinite(period.duration) ? period.duration : 0,
    drills: Array.isArray(period.drills) ? period.drills.filter((x): x is string => typeof x === 'string') : [],
  }));
  return { insights, periods };
}

const dateToday = (): string => {
  const d = new Date();
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TeamPracticePlanner: React.FC<{ teamId: string }> = ({ teamId }) => {
  const ai = useAI();
  const { plans, loading: plansLoading, error: listError, createPlan } = usePracticePlans(teamId);
  const fieldId = useId();
  const [name, setName] = useState('New practice plan');
  const [date, setDate] = useState(dateToday);
  const [duration, setDuration] = useState(90);
  const [periodName, setPeriodName] = useState('Team teaching period');
  const [notes, setNotes] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiOverview, setAIOverview] = useState<AIOverview | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const aiEnabled = import.meta.env.REACT_APP_AI_ENABLED === 'true';

  const toggleGoal = (goal: string) => setGoals(prev =>
    prev.includes(goal) ? prev.filter(x => x !== goal) : [...prev, goal],
  );
  const valid = name.trim() !== '' && periodName.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isInteger(duration) && duration >= 30 && duration <= 180 && goals.length > 0;

  const saveManual = async () => {
    if (!valid || saving) return;
    setError(null);
    setStatus(null);
    setSaving(true);
    try {
      await createPlan({
        name: name.trim(),
        date,
        duration,
        goals: [...goals],
        notes,
        periods: [{ id: 'period-1', name: periodName.trim(), duration, intensity: 3, drills: [] }],
      });
      // The existing Firestore service can queue writes while offline. Avoid claiming cloud confirmation.
      setStatus('Practice plan submitted. Look for it in Saved Plans after synchronization.');
    } catch {
      setError('Could not submit this practice plan. Your details remain here.');
    } finally {
      setSaving(false);
    }
  };

  const generate = async () => {
    if (!aiEnabled || generating || !goals.length) return;
    setGenerating(true);
    setError(null);
    setAIOverview(null);
    try {
      const result: unknown = await ai.generateSmartPractice({ duration, goals, teamId });
      setAIOverview(safeAIOverview(result));
    } catch {
      setError('Could not generate optional AI suggestions. Your manual plan is unaffected.');
    } finally {
      setGenerating(false);
    }
  };

  const opened = plans.find(plan => plan.id === openPlanId);
  return (
    <section className="max-w-2xl mx-auto p-4 bg-white rounded-lg shadow-md mt-6" aria-label="Team practice planner">
      <h2 className="text-2xl font-bold mb-2">Practice Planner</h2>
      <p className="text-sm text-gray-700 mb-4">
        Build and save a coach-approved practice plan for your selected team. AI suggestions are optional, never saved automatically.
      </p>
      <div className="grid gap-3">
        <label htmlFor={`${fieldId}-name`} className="grid gap-1">
          Practice name
          <input id={`${fieldId}-name`} className="border rounded p-2" maxLength={100} value={name}
            onChange={e => setName(e.target.value)} />
        </label>
        <label htmlFor={`${fieldId}-date`} className="grid gap-1">
          Practice date
          <input id={`${fieldId}-date`} type="date" className="border rounded p-2" value={date}
            onChange={e => setDate(e.target.value)} />
        </label>
        <label htmlFor={`${fieldId}-duration`} className="grid gap-1">
          Duration (minutes)
          <input id={`${fieldId}-duration`} type="number" min={30} max={180} className="border rounded p-2"
            value={duration} onChange={e => setDuration(Number(e.target.value))} />
        </label>
        <label htmlFor={`${fieldId}-period`} className="grid gap-1">
          First practice period
          <input id={`${fieldId}-period`} className="border rounded p-2" maxLength={100}
            value={periodName} onChange={e => setPeriodName(e.target.value)} />
        </label>
        <div role="group" aria-label="Practice goals" className="flex flex-wrap gap-2">
          {GOALS.map(goal => (
            <button type="button" key={goal.value} aria-pressed={goals.includes(goal.value)}
              onClick={() => toggleGoal(goal.value)}
              className="px-3 py-2 rounded-full border bg-gray-100 text-gray-900">
              {goal.label}
            </button>
          ))}
        </div>
        <label htmlFor={`${fieldId}-notes`} className="grid gap-1">
          Coaching notes
          <textarea id={`${fieldId}-notes`} className="border rounded p-2" rows={3}
            value={notes} onChange={e => setNotes(e.target.value)} />
        </label>
        <button type="button" className="bg-blue-700 text-white rounded p-3 font-semibold"
          disabled={!valid || saving} onClick={() => void saveManual()}>
          {saving ? 'Saving…' : 'Save practice plan'}
        </button>
        {status && <p role="status" className="text-green-800">{status}</p>}
        {(error || listError) && <p role="alert" className="text-red-700">{error || listError}</p>}
      </div>

      <section aria-label="Saved practice plans" className="mt-6">
        <h3 className="text-lg font-semibold">Saved Plans</h3>
        {plansLoading ? <p>Loading saved plans…</p> : plans.length === 0 ? <p>No saved plans for this team yet.</p> : (
          <ul className="grid gap-2">
            {plans.map(plan => (
              <li key={plan.id}>
                <button type="button" className="border rounded px-3 py-2" onClick={() => setOpenPlanId(plan.id ?? null)}>
                  Open saved plan {plan.name}
                </button>
                <span className="text-gray-600 text-sm"> {plan.date}</span>
              </li>
            ))}
          </ul>
        )}
        {opened && (
          <article className="mt-3 border rounded p-3" aria-label="Opened saved practice plan">
            <h4 className="font-semibold">{opened.name}</h4>
            <p>{opened.date} · {opened.duration} minutes</p>
            <p>Goals: {opened.goals.join(', ') || 'None specified'}</p>
            <p>Notes: {opened.notes || 'None'}</p>
            <ul>{opened.periods.map(period => <li key={period.id}>{period.name} · {period.duration} minutes</li>)}</ul>
            <button type="button" className="border rounded px-3 py-2 mt-2" onClick={() => setOpenPlanId(null)}>Close saved plan</button>
          </article>
        )}
      </section>

      <section className="mt-6 border-t pt-4" aria-label="Optional AI practice suggestions">
        <h3 className="text-lg font-semibold">Optional AI suggestions</h3>
        <p className="text-sm text-gray-600">Research-stage assistance only. Review all teaching suggestions yourself.</p>
        <button type="button" className="border rounded px-3 py-2 mt-2" disabled={!aiEnabled || generating || goals.length === 0}
          onClick={() => void generate()}>{generating ? 'Generating…' : 'Ask AI for suggestions'}</button>
        {!aiEnabled && <p className="text-sm text-gray-600">AI is disabled until the authenticated proxy is explicitly enabled.</p>}
        {aiOverview && (
          <div className="mt-3 p-3 border rounded" aria-label="AI suggestion preview">
            <h4 className="font-semibold">Unreviewed AI suggestions</h4>
            <ul>{aiOverview.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul>
            <ul>{aiOverview.periods.map((period, i) => <li key={i}>{period.name} · {period.duration} min</li>)}</ul>
            <p className="text-sm">Not automatically added to your saved practice plans.</p>
          </div>
        )}
      </section>
    </section>
  );
};

const PracticePlanner: React.FC = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  if (!user || user.isAnonymous) return <p>Sign in to manage practice plans.</p>;
  if (!currentTeam) return <p>Select a team to create or open practice plans.</p>;
  // Team-scoped key discards one team's unsaved form and AI result when switching teams.
  return <TeamPracticePlanner key={currentTeam.id} teamId={currentTeam.id} />;
};

export default PracticePlanner;

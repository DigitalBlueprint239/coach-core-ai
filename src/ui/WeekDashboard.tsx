import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, MapPin, Plus } from 'lucide-react';
import { Panel, Action, EmptyState } from './primitives';
import type { Destination } from './AppShell';

export interface PracticePeriod { name: string; durationMinutes?: number }
export interface WeekEvent {
  id: string; title: string; date: string; time?: string; location?: string;
  kind: 'practice' | 'meeting' | 'game' | 'plan';
  durationMinutes?: number; periods?: PracticePeriod[]; goals?: string[]; notes?: string;
  startMinute?: number; endMinute?: number;
}
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const addDays = (date: Date, days: number) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
const parseDay = (day: string) => new Date(`${day}T12:00:00`);
const isPractice = (event: WeekEvent) => event.kind === 'practice' || event.kind === 'plan';
const samplePeriods: PracticePeriod[] = [
  { name: 'Warm-up', durationMinutes: 10 }, { name: 'Individual skills', durationMinutes: 20 },
  { name: 'Position groups', durationMinutes: 20 }, { name: 'Team period', durationMinutes: 30 },
  { name: 'Cool-down', durationMinutes: 10 },
];
export const DEMO_DAY = '2026-10-14';
const WEEK_GRID_HEIGHT = 260;
export function sampleEvents(): WeekEvent[] {
  const today = parseDay(DEMO_DAY);
  const monday = parseDay('2026-10-12');
  const pastExamples: WeekEvent[] = [
    { id: 'sample-staff', title: 'Staff meeting', date: dateKey(monday), time: '8:00 AM', startMinute: 480, endMinute: 525, kind: 'meeting' },
    { id: 'sample-previous-practice', title: 'Team practice', date: dateKey(monday), time: '3:30 PM', startMinute: 930, endMinute: 1020, kind: 'practice', durationMinutes: 90, periods: samplePeriods },
    { id: 'sample-position-groups', title: 'Position groups', date: dateKey(addDays(monday, 1)), time: '3:30 PM', startMinute: 930, endMinute: 990, kind: 'practice', durationMinutes: 60 },
  ];
  return [...pastExamples.filter(event => event.date < dateKey(today)),
    { id: 'sample-practice', title: 'Team practice', date: DEMO_DAY, time: '3:30–5:00 PM', location: 'Practice field', kind: 'practice', startMinute: 930, endMinute: 1020, durationMinutes: 90, periods: samplePeriods, goals: ['Clean alignment', 'Fast transitions'], notes: 'Emphasize communication and clean execution.' },
    { id: 'sample-film', title: 'Staff meeting', date: dateKey(addDays(today, 1)), time: '8:00–8:30 AM', location: 'Coaches room', kind: 'meeting', startMinute: 480, endMinute: 510 },
    { id: 'sample-walkthrough', title: 'Walk-through', date: dateKey(addDays(today, 2)), time: '4:00–4:45 PM', location: 'Practice field', kind: 'practice', startMinute: 960, endMinute: 1005, durationMinutes: 45 },
    { id: 'sample-game', title: 'Game day', date: dateKey(addDays(today, 3)), time: '7:00 PM', location: 'Home stadium', kind: 'game', startMinute: 1140, endMinute: 1200 },
  ];
}
const initialTasks = [{ id: 'plan', title: 'Review the practice plan', done: true }, { id: 'equipment', title: 'Check practice equipment', done: false }, { id: 'staff', title: 'Prepare staff meeting notes', done: false }];

function EventDetails({ event, preview, onClose }: { event: WeekEvent; preview: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current; const opener = document.activeElement as HTMLElement | null;
    if (node?.showModal) node.showModal(); else node?.setAttribute('open', '');
    return () => { node?.close?.(); opener?.focus(); };
  }, []);
  return <dialog ref={dialog} className="cc-event-detail" aria-labelledby="cc-event-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div><span className="cc-eyebrow">{preview ? 'Sample event · preview only' : 'Saved practice plan'}</span>
      <h2 id="cc-event-title">{event.title}</h2>
      <p>{parseDay(event.date).toLocaleDateString('en-US', { dateStyle: 'full' })} · {event.time || 'Time not set'}</p>
      <p>{preview ? 'This fictional event cannot be opened, saved or assigned to your team.' : 'Open Practice Plans to select and edit this saved plan.'}</p>
    </div><Action autoFocus onClick={onClose}>Close details</Action>
  </dialog>;
}

function PracticeSummary({ event, preview, onNavigate, onDetails }: { event: WeekEvent; preview: boolean; onNavigate: (view: Destination) => void; onDetails: () => void }) {
  return <>
    <div className="cc-practice-summary">
      <div><p className="cc-kicker">Selected practice {preview && <span className="cc-inline-label">Sample concept</span>}</p>
        <h2>{event.title}</h2>
        <p className="cc-practice-meta"><CalendarDays size={15} aria-hidden="true" />{parseDay(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          <span><Clock3 size={15} aria-hidden="true" />{event.time || 'Time not set'}</span>
          {event.durationMinutes !== undefined && <span>{event.durationMinutes} min</span>}
          {event.location && <span><MapPin size={15} aria-hidden="true" />{event.location}</span>}
        </p>
      </div>
      <div className="cc-practice-actions"><Action onClick={onDetails}>Details</Action><Action primary onClick={() => preview ? onDetails() : onNavigate('practice')}>{preview ? 'View practice preview' : 'Open practice plans'}<ArrowRight size={16} aria-hidden="true" /></Action></div>
    </div>
    {event.periods?.length ? <ol className="cc-periods" aria-label="Practice periods">{event.periods.map((period, index) => <li key={`${index}:${period.name}`}><span className="cc-period-number">{index + 1}</span><strong>{period.name}</strong>{period.durationMinutes !== undefined && <span>{period.durationMinutes} min</span>}</li>)}</ol> : <p className="cc-detail-empty">No period information in this plan.</p>}
    {(event.goals?.length || event.notes) && <div className="cc-practice-notes">{event.goals?.length ? <p><strong>Focus</strong> {event.goals.join(' · ')}</p> : null}{event.notes && <p>{event.notes}</p>}</div>}
  </>;
}

export default function WeekDashboard({ teamName, events = [], loading = false, error = '', preview, onPreviewChange, onNavigate, today: givenToday, emptyExample = false }: {
  teamName?: string; events?: WeekEvent[]; loading?: boolean; error?: string; preview: boolean;
  onPreviewChange: (next: boolean) => void; onNavigate: (view: Destination) => void; today?: Date; emptyExample?: boolean;
}) {
  const [realToday] = useState(() => givenToday || new Date());
  const today = preview ? parseDay(DEMO_DAY) : realToday;
  type CalendarState = { weekOffset: number; selected: string; selectedId: string | null; dayChosen: boolean };
  const initialSample: CalendarState = { weekOffset: 0, selected: DEMO_DAY, selectedId: 'sample-practice', dayChosen: true };
  const [liveCalendar, setLiveCalendar] = useState<CalendarState>(() => ({ weekOffset: 0, selected: dateKey(realToday), selectedId: null, dayChosen: false }));
  const [sampleCalendar, setSampleCalendar] = useState<CalendarState>(initialSample);
  const { weekOffset, selected, selectedId, dayChosen } = preview ? sampleCalendar : liveCalendar;
  const setCalendar = preview ? setSampleCalendar : setLiveCalendar;
  const [tasks, setTasks] = useState(initialTasks);
  const [detail, setDetail] = useState<WeekEvent | null>(null);
  const source = preview ? sampleEvents() : events;
  const start = addDays(today, -((today.getDay() + 6) % 7) + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));
  const nextEvents = source.filter(event => event.date >= dateKey(today)).sort((a, b) => a.date.localeCompare(b.date));
  const nextPractice = nextEvents.find(isPractice);
  const selectedEvents = source.filter(event => event.date === selected);
  const practice = source.find(event => event.id === selectedId && isPractice(event)) || selectedEvents.find(isPractice) || (!dayChosen ? nextPractice : undefined);
  const chooseDay = (day: string) => setCalendar(previous => ({ ...previous, selected: day, selectedId: null, dayChosen: true }));
  const chooseEvent = (event: WeekEvent, agenda: boolean) => { setCalendar(previous => ({ ...previous, selected: event.date, selectedId: isPractice(event) ? event.id : null, dayChosen: true })); if (!isPractice(event) || agenda) setDetail(event); };
  const changeWeek = (offset: number) => setCalendar(previous => ({ ...previous, weekOffset: offset, selected: dateKey(addDays(today, -((today.getDay() + 6) % 7) + offset * 7)), selectedId: null, dayChosen: true }));
  const eventButton = (event: WeekEvent, timed = false, agenda = false) => <button key={event.id} type="button" className={`cc-event cc-event-${event.kind} ${practice?.id === event.id ? 'cc-event-selected' : ''}`}
    aria-label={`${event.title}, ${parseDay(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${event.time || 'time not set'}`}
    aria-pressed={isPractice(event) ? practice?.id === event.id : undefined}
    style={timed ? { top: `${((event.startMinute! - 420) / 900) * 100}%` } : undefined}
    onClick={() => chooseEvent(event, agenda)}><strong>{event.title}</strong><span>{timed && event.startMinute !== undefined ? new Date(2000, 0, 1, Math.floor(event.startMinute / 60), event.startMinute % 60).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : event.time || 'Time not set'}</span></button>;

  return <>
    <div className="cc-dashboard-heading"><div><h1><span className="cc-desktop-title">My Week</span><span className="cc-phone-title">Today</span></h1>
      <p>{preview ? 'Demo week · Oct 12–18, 2026' : today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{teamName && <span className="cc-heading-team"> · {teamName}</span>}</p></div>
      <div className="cc-mode"><span className={`cc-sample-label ${preview ? '' : 'cc-live-label'}`}>{preview ? 'Sample data · preview' : emptyExample ? 'Empty-state example' : 'Team workspace'}</span>
        <Action onClick={() => { onPreviewChange(!preview); setDetail(null); setSampleCalendar(initialSample); setTasks(initialTasks); }}>{preview ? 'Exit preview' : 'Sample preview'}</Action>
        {preview && <span className="cc-sr-only">Fictional events and tasks. Changes are temporary and never saved.</span>}
      </div>
    </div>
    {!preview && error && <p role="alert" className="cc-notice">{error}</p>}
    <div className="cc-dashboard-grid">
      <section className="cc-panel cc-calendar-panel" aria-label="Weekly calendar">
        <div className="cc-calendar-controls"><h2 className="cc-sr-only">Weekly calendar</h2><div className="cc-week-paging">
          <button type="button" aria-label="Previous week" onClick={() => changeWeek(weekOffset - 1)}><ChevronLeft size={18} aria-hidden="true" /></button>
          <span aria-live="polite">{days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {days[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <button type="button" aria-label="Next week" onClick={() => changeWeek(weekOffset + 1)}><ChevronRight size={18} aria-hidden="true" /></button>
          <Action onClick={() => { setCalendar(previous => ({ ...previous, weekOffset: 0, selected: dateKey(today), selectedId: null, dayChosen: true })); }}>{preview ? 'Demo day' : 'Today'}</Action>
        </div><span className="cc-week-view">Week</span></div>
        <div className={`cc-week-grid ${preview ? 'cc-week-timed' : 'cc-week-plans'}`} role="group" aria-label="Choose a day">
          {preview && <div className="cc-hours" aria-hidden="true"><span className="cc-hours-head" />{['7 AM', '9 AM', '11 AM', '1 PM', '3 PM', '5 PM', '7 PM'].map((hour, index) => <span key={hour} style={{ top: `${44 + index * 2 / 15 * WEEK_GRID_HEIGHT}px` }}>{hour}</span>)}</div>}
          {days.map(day => { const key = dateKey(day); return <div className={`cc-day ${key === dateKey(today) ? 'cc-day-today' : ''}`} key={key}>
            <button type="button" className="cc-day-picker" aria-pressed={selected === key} aria-label={day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} onClick={() => chooseDay(key)}>
              <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span><strong>{day.getDate()}</strong></button>
            <div className="cc-day-events">{source.filter(event => event.date === key).map(event => eventButton(event, preview && event.startMinute !== undefined))}</div>
          </div>; })}
        </div>
        <div className="cc-selected-day" role="region" aria-label="Selected day agenda"><h3>{parseDay(selected).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</h3>
          {selectedEvents.length ? selectedEvents.map(event => eventButton(event, false, true)) : <p>No dated plans or events for this day.</p>}</div>
        <div className="cc-calendar-note">{preview ? <><span className="cc-legend-dot" />Sample practices and events</> : loading ? 'Loading authorized practice plans…' : events.length ? 'Saved plans · start times not set. Scheduling unavailable.' : 'No dated practice plans yet. Scheduling unavailable.'}</div>
      </section>

      <section className="cc-panel cc-practice-panel" aria-label="Selected practice" aria-live="polite">
        {practice ? <PracticeSummary event={practice} preview={preview} onNavigate={onNavigate} onDetails={() => setDetail(practice)} /> : <div className="cc-empty-practice"><EmptyState title={loading ? 'Loading your plans…' : 'No practice selected'}>{dayChosen ? 'Choose a practice from the calendar.' : teamName ? 'No upcoming dated practice plans.' : 'Select or create your team to start planning.'}</EmptyState><Action primary onClick={() => onNavigate(teamName ? 'practice' : 'teams')}><Plus size={18} aria-hidden="true" />{teamName ? 'Create Practice Plan' : 'Manage Teams'}</Action></div>}
      </section>

      <section className="cc-panel cc-today-panel" aria-label="Next practice">
        <p className="cc-kicker">Next up {preview && <span className="cc-inline-label">Sample</span>}</p>
        {nextPractice ? <div className="cc-next-event"><div className="cc-next-summary"><span className="cc-next-icon"><ClipboardList size={21} aria-hidden="true" /></span><div>
          <p className="cc-next-time">{nextPractice.time || 'Time not set'}</p><h2>{nextPractice.title}</h2>
          <p className="cc-next-date">{parseDay(nextPractice.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{nextPractice.durationMinutes !== undefined && <> · {nextPractice.durationMinutes} min</>}</p>
          {nextPractice.location && <p><MapPin size={14} aria-hidden="true" />{nextPractice.location}</p>}</div></div>
          {nextPractice.goals?.length ? <p className="cc-next-focus"><strong>Focus</strong> {nextPractice.goals.join(' · ')}</p> : null}
          <Action primary onClick={() => preview ? setDetail(nextPractice) : onNavigate('practice')}>{preview ? 'View practice preview' : 'Open practice plans'}<ArrowRight size={17} aria-hidden="true" /></Action>
        </div> : <EmptyState title={loading ? 'Loading your plans…' : 'A clear field ahead'}>{teamName ? 'No upcoming dated practice plans.' : 'Select or create your team to start planning.'}</EmptyState>}
        {!nextPractice && <div className="cc-quick-actions"><Action primary onClick={() => onNavigate(teamName ? 'practice' : 'teams')}><Plus size={18} aria-hidden="true" />{teamName ? 'Create Practice Plan' : 'Manage Teams'}</Action></div>}
      </section>

      <Panel title="Upcoming" className="cc-upcoming-panel">{nextEvents.length ? <ul className="cc-upcoming-list">{nextEvents.slice(0, 3).map(event => <li key={event.id}>
        <CalendarDays size={18} aria-hidden="true" /><span className="cc-upcoming-date">{parseDay(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
        <button type="button" onClick={() => setDetail(event)}><strong>{event.title}</strong><span>{event.time || 'Time not set'}</span></button></li>)}</ul> : <EmptyState title={loading ? 'Loading upcoming plans…' : 'No upcoming plans'}>Dated saved practice plans will appear here.</EmptyState>}</Panel>

      <Panel title="Assignments" className="cc-assignments-panel" action={<span className="cc-inline-label">{preview ? `Sample · ${tasks.filter(task => task.done).length}/${tasks.length}` : 'Unavailable'}</span>}>
        {preview ? <ul className="cc-tasks">{tasks.map(task => <li key={task.id}><label><input type="checkbox" checked={task.done} onChange={() => setTasks(tasks.map(item => item.id === task.id ? { ...item, done: !item.done } : item))} /><span>{task.title}</span></label></li>)}</ul> : <EmptyState title="Assignment tracking is planned">No connected task feed yet.</EmptyState>}
      </Panel>
    </div>
    {detail && <EventDetails event={detail} preview={preview} onClose={() => setDetail(null)} />}
  </>;
}

// Team terminology (spec §5.0): map our baseline words to the team's once; the whole screen speaks them.
// Substitution only (applyTerminology), never AI. Level select is spec §5.4 (vocabulary swap is phase 3).
import React, { useId, useState } from 'react';
import { LEVEL_ORDER, ROUTES, applyTerminology, publishedLibrary } from '../../../football-core';
import type { Level, RouteId } from '../../../football-core';
import type { TeamPlaybookSettings } from '../playModel';

export type TerminologyPanelProps = { settings: TeamPlaybookSettings; onChange(s: TeamPlaybookSettings): void };

type Row = { term: string; meaning: string };

const POSITIONS: Row[] = [
  { term: 'X', meaning: 'split end' },
  { term: 'Z', meaning: 'flanker' },
  { term: 'H', meaning: 'slot receiver' },
  { term: 'Y', meaning: 'inside receiver' },
  { term: 'F', meaning: 'H-back' },
  { term: 'TE', meaning: 'tight end' },
  { term: 'RB', meaning: 'running back' },
  { term: 'QB', meaning: 'quarterback' },
];

const DEFENDERS: Row[] = [
  { term: 'CB-S', meaning: 'strong-side corner' },
  { term: 'CB-W', meaning: 'weak-side corner' },
  { term: 'SS', meaning: 'strong safety' },
  { term: 'FS', meaning: 'free safety' },
  { term: 'SAM', meaning: 'strong-side linebacker' },
  { term: 'MIKE', meaning: 'middle linebacker' },
  { term: 'WILL', meaning: 'weak-side linebacker' },
];

const ROUTE_ROWS: Row[] = (Object.keys(ROUTES) as RouteId[]).map(id => ({ term: id, meaning: 'route' }));
const CONCEPT_ROWS: Row[] = publishedLibrary().concepts.map(c => ({ term: c.name, meaning: 'play' }));

/** Uses a position, a route and the words "hit" and "hash", which must never be renamed by mistake. */
const PREVIEW = 'Watch the cornerback. He sits on the hitch: hit H on the corner, between the hash and the sideline.';

const LEVEL_NAME: Record<Level, string> = { youth: 'Youth', jv: 'JV', varsity: 'Varsity' };

export const TerminologyPanel: React.FC<TerminologyPanelProps> = ({ settings, onChange }) => {
  const ids = useId();
  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...settings.terminology }));
  // Follow the stored terminology when it changes from outside (a late load, or a save rolled back on error).
  const [seen, setSeen] = useState(settings.terminology);
  if (seen !== settings.terminology) {
    setSeen(settings.terminology);
    setDraft({ ...settings.terminology });
  }

  const cleaned = (d: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(d)) if (v.trim() && v.trim() !== k) out[k] = v.trim();
    return out;
  };
  const live = cleaned(draft);

  const commit = () => {
    const next = cleaned(draft);
    const prev = settings.terminology;
    const same = Object.keys(next).length === Object.keys(prev).length && Object.entries(next).every(([k, v]) => prev[k] === v);
    if (!same) onChange({ ...settings, terminology: next });
  };

  const section = (title: string, rows: Row[]) => (
    <fieldset className="pb2-term-group">
      <legend>{title}</legend>
      {rows.map(r => (
        <div key={r.term} className="pb2-term-row">
          <span className="pb2-term-ours">
            <strong>{r.term}</strong> <span className="pb2-muted">{r.meaning}</span>
          </span>
          <span aria-hidden="true" className="pb2-term-arrow">
            →
          </span>
          <input
            className="pb2-input"
            aria-label={`Your word for ${r.term} (${r.meaning})`}
            placeholder={r.term}
            maxLength={24}
            value={draft[r.term] ?? ''}
            onChange={e => setDraft(d => ({ ...d, [r.term]: e.target.value }))}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit();
            }}
          />
        </div>
      ))}
    </fieldset>
  );

  return (
    <section className="pb2-terminology" aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="pb2-library-title">
        Your words
      </h2>
      <p className="pb2-muted">Our word on the left, yours on the right. Leave a row empty to keep ours.</p>

      <div className="pb2-term-preview">
        <span className="pb2-muted">Preview</span>
        <p data-testid="terminology-preview">{applyTerminology(PREVIEW, live)}</p>
      </div>

      <label className="pb2-field pb2-term-level">
        <span>Level</span>
        <select
          className="pb2-select"
          value={settings.level}
          onChange={e => onChange({ ...settings, level: e.target.value as Level })}
        >
          {LEVEL_ORDER.map(l => (
            <option key={l} value={l}>
              {LEVEL_NAME[l]}
            </option>
          ))}
        </select>
      </label>

      <div className="pb2-term-groups">
        {section('Positions', POSITIONS)}
        {section('Defenders', DEFENDERS)}
        {section('Routes', ROUTE_ROWS)}
        {section('Plays', CONCEPT_ROWS)}
      </div>
    </section>
  );
};

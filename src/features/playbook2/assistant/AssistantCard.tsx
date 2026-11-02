// The coaching assistant (spec §5.2): "what beats this defense?". Deterministic: it only calls recommend() on the
// published library, so every answer traces to verified or approved content. No AI.
import React, { useEffect, useId, useMemo, useState } from 'react';
import { applyTerminology, publishedLibrary, recommend } from '../../../football-core';
import type { CoverageId, Level, Library, Terminology } from '../../../football-core';

export type AssistantCardProps = {
  level: Level;
  playbookConceptIds: string[];
  terminology: Terminology;
  onAdd(conceptId: string): void;
  /** Defaults to publishedLibrary(); whatever is passed is filtered through publishedLibrary() again. */
  library?: Library;
  /** The coverage the opponent plays most, so the sheet can draw it. */
  onTopCoverage?(coverage: CoverageId | undefined): void;
};

type Frequency = 'mostly' | 'sometimes' | 'rarely' | 'none';
const FREQUENCIES: Array<{ id: Frequency; label: string; share: number }> = [
  { id: 'mostly', label: 'Mostly', share: 0.6 },
  { id: 'sometimes', label: 'Sometimes', share: 0.3 },
  { id: 'rarely', label: 'Rarely', share: 0.1 },
  { id: 'none', label: 'Not at all', share: 0 },
];
const shareOf = (f: Frequency) => FREQUENCIES.find(x => x.id === f)?.share ?? 0;

const LEVEL_TAG: Record<Level, string> = { youth: 'Youth and up', jv: 'JV and up', varsity: 'Varsity' };

export const AssistantCard: React.FC<AssistantCardProps> = ({
  level, playbookConceptIds, terminology, onAdd, library, onTopCoverage,
}) => {
  const ids = useId();
  const lib = useMemo(() => publishedLibrary(library), [library]);
  // Only published coverages can be picked, so the sheet never draws an unverified defense.
  const coverages = lib.coverages;
  const [freq, setFreq] = useState<Partial<Record<CoverageId, Frequency>>>({});
  const t = (s: string) => applyTerminology(s, terminology);

  const profile = useMemo(
    () => ({
      coverages: coverages.map(c => ({ id: c.id, share: shareOf(freq[c.id] ?? 'none') })).filter(c => c.share > 0),
    }),
    [freq, coverages],
  );
  const top = profile.coverages.reduce<{ id: CoverageId; share: number } | undefined>(
    (best, c) => (!best || c.share > best.share ? (c as { id: CoverageId; share: number }) : best),
    undefined,
  )?.id;

  useEffect(() => {
    onTopCoverage?.(top);
  }, [top, onTopCoverage]);

  const recs = useMemo(
    () => (profile.coverages.length ? recommend(profile, { level, playbook: playbookConceptIds, limit: 3 }, lib) : []),
    [profile, level, playbookConceptIds, lib],
  );
  const [best, ...alternatives] = recs;
  const nameOf = (id: CoverageId) => coverages.find(c => c.id === id)?.name ?? id;

  const summary = top
    ? `They play ${freq[top] === 'mostly' ? 'mostly ' : ''}${nameOf(top)}`
    : 'Tell me what coverages they play.';

  return (
    <section className="pb2-assistant" aria-labelledby={`${ids}-title`}>
      <h2 id={`${ids}-title`} className="pb2-assistant-title">
        {summary}
      </h2>

      {profile.coverages.length > 0 && !best && (
        <p className="pb2-assistant-none">No verified play beats this defense at your level yet.</p>
      )}

      {best && (
        <section className="pb2-rec" aria-label="Recommended play">
          <div className="pb2-rec-head">
            <span className="pb2-display pb2-rec-name">{t(best.concept.name)}</span>
            <span className="pb2-tag">{LEVEL_TAG[best.concept.minLevel]}</span>
          </div>
          <p className="pb2-hand pb2-rec-reason">{t(best.reason)}</p>
          <p className="pb2-rec-meta">
            Beats {nameOf(best.beats)} · stresses the {t(best.stressedDefender.toLowerCase())}
          </p>
          {best.inPlaybook ? (
            <span className="pb2-tag pb2-tag-ok">In your playbook</span>
          ) : (
            <button
              type="button"
              className="pb2-btn pb2-strong"
              aria-label={`Add ${t(best.concept.name)} to my playbook`}
              onClick={() => onAdd(best.concept.id)}
            >
              Add to my playbook
            </button>
          )}
        </section>
      )}

      {alternatives.length > 0 && (
        <div className="pb2-alts">
          <h3 className="pb2-alts-title">Also worth a look</h3>
          <ul>
            {alternatives.slice(0, 2).map(r => (
              <li key={r.concept.id} className="pb2-alt">
                <span>
                  <strong>{t(r.concept.name)}</strong>{' '}
                  <span className="pb2-muted">
                    · beats {nameOf(r.beats)} · {LEVEL_TAG[r.concept.minLevel]}
                  </span>
                </span>
                {r.inPlaybook ? (
                  <span className="pb2-tag pb2-tag-ok">In your playbook</span>
                ) : (
                  <button
                    type="button"
                    className="pb2-btn"
                    aria-label={`Add ${t(r.concept.name)} to my playbook`}
                    onClick={() => onAdd(r.concept.id)}
                  >
                    Add
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="pb2-opponent">
        <legend>Their defense</legend>
        {coverages.map(c => (
          <div key={c.id} className="pb2-opp-row" role="radiogroup" aria-label={c.name}>
            <span className="pb2-opp-name" aria-hidden="true">
              {c.name}
            </span>
            <span className="pb2-chips">
              {FREQUENCIES.map(f => (
                <label key={f.id} className="pb2-chip">
                  <input
                    type="radio"
                    name={`${ids}-${c.id}`}
                    value={f.id}
                    checked={(freq[c.id] ?? 'none') === f.id}
                    onChange={() => setFreq(cur => ({ ...cur, [c.id]: f.id }))}
                  />
                  <span aria-hidden={f.id === 'none' ? true : undefined}>{f.id === 'none' ? '—' : f.label}</span>
                  {f.id === 'none' && <span className="pb2-sr">Not at all</span>}
                </label>
              ))}
            </span>
          </div>
        ))}
      </fieldset>
    </section>
  );
};

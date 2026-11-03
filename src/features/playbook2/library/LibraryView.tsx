// The library (spec §5.1): verified plays and formations, each with a diagram, never a bare name.
// Only publishedLibrary() content reaches coaches; "Use this" always hands back the coach's own copy.
import React, { useId, useMemo, useState } from 'react';
import { LEVEL_ORDER, applyConcept, applyTerminology, publishedLibrary } from '../../../football-core';
import type { Concept, Formation, Level, Library } from '../../../football-core';
import { MiniDiagram } from '../field/MiniDiagram';
import { newBlankPlay, playFromConcept, type PlayV2, type TeamPlaybookSettings } from '../playModel';

export type LibraryViewProps = {
  settings: TeamPlaybookSettings;
  teamId: string;
  onUse(play: PlayV2): void;
  onClose(): void;
  /** Defaults to publishedLibrary(); whatever is passed is filtered through publishedLibrary() again. */
  library?: Library;
};

const LEVEL_NAME: Record<Level, string> = { youth: 'Youth', jv: 'JV', varsity: 'Varsity' };
const atOrBelow = (min: Level, level: Level) => LEVEL_ORDER.indexOf(min) <= LEVEL_ORDER.indexOf(level);

type Tab = 'plays' | 'formations';

export const LibraryView: React.FC<LibraryViewProps> = ({ settings, teamId, onUse, onClose, library }) => {
  const ids = useId();
  const lib = useMemo(() => publishedLibrary(library), [library]);
  const [tab, setTab] = useState<Tab>('plays');
  const [level, setLevel] = useState<Level>(settings.level);
  const [beats, setBeats] = useState<string>('any');
  const [personnel, setPersonnel] = useState<string>('any');
  const t = (s: string) => applyTerminology(s, settings.terminology);

  const own = settings.formations;
  const allFormations = useMemo(() => [...own, ...lib.formations], [own, lib.formations]);
  const formationMatches = (f: Formation) =>
    (personnel === 'any' || f.personnel === personnel) && (f.id.startsWith('team:') || f.levels.includes(level));

  const playCards = lib.concepts
    .filter(c => atOrBelow(c.minLevel, level))
    .filter(c => beats === 'any' || lib.matchups.some(m => m.concept === c.id && m.beats === beats))
    .map(c => ({
      concept: c,
      runs: allFormations.filter(formationMatches).flatMap(f => {
        const applied = applyConcept(c, f);
        return applied.ok ? [{ formation: f, routes: applied.routes.map(r => r.points) }] : [];
      }),
    }))
    .filter(card => card.runs.length > 0);

  const formationCards = allFormations.filter(formationMatches);
  const personnelOptions = [...new Set(allFormations.map(f => f.personnel))].sort();
  const beatsFor = (c: Concept) =>
    lib.matchups.filter(m => m.concept === c.id).map(m => lib.coverages.find(cv => cv.id === m.beats)?.name ?? m.beats);

  return (
    <section className="pb2-library" aria-labelledby={`${ids}-title`}>
      <div className="pb2-library-head">
        <h2 id={`${ids}-title`} className="pb2-library-title">
          Library
        </h2>
        <button type="button" className="pb2-btn" onClick={onClose}>
          Back to the play
        </button>
      </div>

      <div className="pb2-tabs" role="tablist" aria-label="Library">
        {(['plays', 'formations'] as const).map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${ids}-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${ids}-panel`}
            className="pb2-tab"
            onClick={() => setTab(id)}
          >
            {id === 'plays' ? 'Plays' : 'Formations'}
          </button>
        ))}
      </div>

      <div className="pb2-filters">
        <label className="pb2-field">
          <span>Level</span>
          <select className="pb2-select" value={level} onChange={e => setLevel(e.target.value as Level)}>
            {LEVEL_ORDER.map(l => (
              <option key={l} value={l}>
                {LEVEL_NAME[l]}
              </option>
            ))}
          </select>
        </label>
        {tab === 'plays' && (
          <label className="pb2-field">
            <span>Beats</span>
            <select className="pb2-select" value={beats} onChange={e => setBeats(e.target.value)}>
              <option value="any">Any coverage</option>
              {lib.coverages.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="pb2-field">
          <span>Personnel</span>
          <select className="pb2-select" value={personnel} onChange={e => setPersonnel(e.target.value)}>
            <option value="any">Any personnel</option>
            {personnelOptions.map(pp => (
              <option key={pp} value={pp}>
                {pp} personnel
              </option>
            ))}
          </select>
        </label>
      </div>

      <div id={`${ids}-panel`} role="tabpanel" aria-labelledby={`${ids}-tab-${tab}`} className="pb2-cards">
        {tab === 'plays' &&
          (playCards.length === 0 ? (
            <p className="pb2-empty-text pb2-library-empty">No verified plays match these filters yet.</p>
          ) : (
            playCards.map(({ concept, runs }) => (
              <article key={concept.id} className="pb2-card">
                <MiniDiagram formation={runs[0].formation} routes={runs[0].routes} label={`${t(concept.name)} from ${t(runs[0].formation.name)}`} />
                <div className="pb2-card-body">
                  <h3 className="pb2-card-title pb2-display">{t(concept.name)}</h3>
                  <p className="pb2-card-meta">
                    {LEVEL_NAME[concept.minLevel]} and up
                    {beatsFor(concept).length > 0 && <> · Beats {beatsFor(concept).join(', ')}</>}
                  </p>
                  <div className="pb2-card-actions">
                    {runs.map(({ formation }) => (
                      <button
                        key={formation.id}
                        type="button"
                        className="pb2-btn"
                        aria-label={`Use ${t(concept.name)} from ${t(formation.name)}`}
                        onClick={() => onUse(playFromConcept(teamId, concept, formation))}
                      >
                        Use this · {t(formation.name)}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))
          ))}
        {tab === 'formations' &&
          (formationCards.length === 0 ? (
            <p className="pb2-empty-text pb2-library-empty">No verified formations match these filters yet.</p>
          ) : (
            formationCards.map(f => (
              <article key={f.id} className="pb2-card">
                <MiniDiagram formation={f} label={`${t(f.name)} formation`} />
                <div className="pb2-card-body">
                  <h3 className="pb2-card-title pb2-display">{t(f.name)}</h3>
                  <p className="pb2-card-meta">
                    {f.id.startsWith('team:') && <span className="pb2-yours">Yours</span>}
                    {f.personnel} personnel · strength {f.strength}
                  </p>
                  <div className="pb2-card-actions">
                    <button
                      type="button"
                      className="pb2-btn"
                      aria-label={`Use ${t(f.name)}`}
                      onClick={() => onUse(newBlankPlay(teamId, f))}
                    >
                      Use this
                    </button>
                  </div>
                </div>
              </article>
            ))
          ))}
      </div>
    </section>
  );
};

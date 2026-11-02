// Smart Playbook v2: "Sheet on the desk" (spec §3). The sheet is the one bold element; everything else steps back.
// Behind REACT_APP_ENABLE_PLAYBOOK_V2 (see flags.ts and Dashboard.tsx).
import React, { useCallback, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import './theme.css';
import { useAuth } from '../../components/AuthProvider';
import { useTeam } from '../../contexts/TeamContext';
import { applyConcept, publishedLibrary, validateFormation } from '../../football-core';
import type { CoverageId, Formation, FormationPlayer, OffenseRole } from '../../football-core';
import { AssistantCard } from './assistant/AssistantCard';
import { editorReducer, initEditor } from './editor/editorReducer';
import { useAutosave } from './editor/useAutosave';
import { FieldSheet } from './field/FieldSheet';
import { isLineman, playerName } from './field/geometry';
import { LibraryView } from './library/LibraryView';
import { DEFAULT_SETTINGS, formationCopy, newBlankPlay, playFromConcept, type PlayV2, type TeamPlaybookSettings } from './playModel';
import { isStoreError, listPlaysV2, loadTeamSettings, savePlayV2, saveTeamSettings } from './playStore';
import { ReadSteps } from './read/ReadSteps';
import { TerminologyPanel } from './terminology/TerminologyPanel';

const PHONE_MAX = 767;
/** Marks the editor's play as a formation being built, so an autosaved draft comes back in the right mode. */
const FORMATION_DRAFT_TAG = 'formation-draft';

const LIBRARY = publishedLibrary();

const p = (role: OffenseRole, x: number, y: number, onLine = false): FormationPlayer => ({ role, at: { x, y }, onLine });
/** A blank legal set: five linemen, a QB and five eligible players, seven on the line. */
const BLANK_SET: Formation = {
  id: 'blank',
  name: 'New formation',
  personnel: '10',
  strength: 'right',
  levels: ['youth', 'jv', 'varsity'],
  verification: { status: 'approved', reviewer: 'team', date: '2026-11-01', sources: [] },
  players: [
    p('LT', -4.6, -0.5, true), p('LG', -2.3, -0.5, true), p('C', 0, -0.5, true), p('RG', 2.3, -0.5, true),
    p('RT', 4.6, -0.5, true), p('QB', 0, -5), p('RB', 0, -7), p('X', -19, -0.8, true), p('H', -10, -1.6),
    p('Y', 10, -1.6), p('Z', 19, -0.8, true),
  ],
};

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

function useReducedMotion(): boolean {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

const PlaybookScreen: React.FC = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();

  if (!user || user.isAnonymous) {
    return (
      <div className="pb2 pb2-empty">
        <p className="pb2-empty-text">Sign in to build your playbook.</p>
      </div>
    );
  }
  if (!currentTeam) {
    return (
      <div className="pb2 pb2-empty">
        <p className="pb2-empty-text">Pick a team to build its playbook.</p>
        <p className="pb2-muted">Open the Teams tab to create or choose one.</p>
      </div>
    );
  }
  return <PlaybookWorkspace key={currentTeam.id} teamId={currentTeam.id} uid={user.uid} />;
};

type View = 'sheet' | 'library' | 'terminology';
type Mode = 'play' | 'formation';
type Notice = { kind: 'error' | 'ok'; text: string } | null;

const PlaybookWorkspace: React.FC<{ teamId: string; uid: string }> = ({ teamId, uid }) => {
  const ids = useId();
  const width = useViewportWidth();
  const phone = width <= PHONE_MAX;
  const reducedMotion = useReducedMotion();

  const [settings, setSettings] = useState<TeamPlaybookSettings>(DEFAULT_SETTINGS);
  // Settings are written whole (teams/{id}.playbook), so nothing may write them before the stored ones load.
  const [settingsState, setSettingsState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [plays, setPlays] = useState<PlayV2[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, dispatch] = useReducer(editorReducer, undefined, () =>
    initEditor(playFromConcept(teamId, LIBRARY.concepts[0], LIBRARY.formations[0])),
  );
  const [mode, setMode] = useState<Mode>('play');
  const [view, setView] = useState<View>('sheet');
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newFormationOpen, setNewFormationOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [coverage, setCoverage] = useState<CoverageId | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** The play being edited before "New formation", restored (still unsaved if it was) after the formation. */
  const parked = useRef<{ play: PlayV2; dirty: boolean } | null>(null);

  const { restorable, discard, clear, offer } = useAutosave(`pb2:draft:${teamId}`, editor.play, editor.dirty);
  const { play, problems, dirty } = editor;
  const currentPlay = useRef(play);
  currentPlay.current = play;
  const terminology = settings.terminology;

  const refreshPlays = useCallback(async () => {
    try {
      setPlays(await listPlaysV2(teamId));
    } catch (e) {
      setLoadError(isStoreError(e) ? e.message : "Couldn't load your plays.");
    }
  }, [teamId]);

  useEffect(() => {
    let live = true;
    loadTeamSettings(teamId)
      .then(s => {
        if (!live) return;
        setSettings(s);
        setSettingsState('ready');
      })
      .catch(e => {
        if (!live) return;
        setSettingsState('failed');
        setLoadError(isStoreError(e) ? e.message : "Couldn't load your playbook settings.");
      });
    void refreshPlays();
    return () => {
      live = false;
    };
  }, [teamId, refreshPlays]);

  const formations = useMemo(() => [...settings.formations, ...LIBRARY.formations], [settings.formations]);

  const SETTINGS_BLOCKED =
    "Your playbook settings didn't load, so they can't be changed until they load. Reload the page to try again.";

  /** Leaving a play with unsaved changes asks first, then keeps it as the draft offered back by Restore. */
  const leaveCurrent = (): boolean => {
    if (!dirty) return true;
    if (!window.confirm('Leave this play? You can bring its unsaved changes back with Restore until you edit another one.')) {
      return false;
    }
    offer(play);
    return true;
  };

  const openPlay = (next: PlayV2, nextMode: Mode = 'play', unsaved = false) => {
    dispatch({ type: 'load', play: next, dirty: unsaved });
    setMode(nextMode);
    setActiveStep(0);
    setNotice(null);
    setView('sheet');
  };

  const undo = () => dispatch({ type: 'undo' });
  const redo = () => dispatch({ type: 'redo' });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'undo' });
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        dispatch({ type: 'redo' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const save = async () => {
    setNotice(null);
    if (mode === 'formation' && settingsState !== 'ready') {
      setNotice({ kind: 'error', text: SETTINGS_BLOCKED });
      return;
    }
    const sent = play;
    setSaving(true);
    try {
      if (mode === 'formation') {
        const formation: Formation = { ...play.formation, name: play.name.trim() || 'New formation' };
        const exists = settings.formations.some(f => f.id === formation.id);
        const next: TeamPlaybookSettings = {
          ...settings,
          formations: exists ? settings.formations.map(f => (f.id === formation.id ? formation : f)) : [...settings.formations, formation],
        };
        await saveTeamSettings(teamId, next);
        setSettings(next);
        dispatch({ type: 'saved', id: formation.id, play: sent });
        if (currentPlay.current === sent) clear();
        const back = parked.current;
        parked.current = null;
        if (back) openPlay(back.play, 'play', back.dirty);
        else openPlay(newBlankPlay(teamId, formation));
        setNotice({ kind: 'ok', text: `Saved ${formation.name} to your formations.` });
      } else {
        const id = await savePlayV2(sent, uid);
        dispatch({ type: 'saved', id, play: sent });
        // Clear the stored draft only if nothing changed while the save was in flight.
        if (currentPlay.current === sent) clear();
        setNotice({ kind: 'ok', text: 'Saved.' });
        void refreshPlays();
      }
    } catch (e) {
      setNotice({ kind: 'error', text: isStoreError(e) ? e.message : "Couldn't save. Your changes are still here." });
    } finally {
      setSaving(false);
    }
  };

  const changeFormation = (id: string) => {
    const f = formations.find(x => x.id === id);
    if (f) dispatch({ type: 'setFormation', formation: f });
  };

  const changePlay = (id: string) => {
    if (id === '__current') return;
    const next = plays.find(x => x.id === id);
    if (next && leaveCurrent()) openPlay(structuredClone(next));
  };

  const addFromAssistant = (conceptId: string) => {
    const concept = LIBRARY.concepts.find(c => c.id === conceptId);
    if (!concept || !leaveCurrent()) return;
    const runnable = [play.formation, ...formations].find(f => applyConcept(concept, f).ok) ?? LIBRARY.formations[0];
    openPlay(playFromConcept(teamId, concept, runnable));
  };

  const startFormation = (from: Formation, name: string) => {
    if (mode === 'play') parked.current = { play, dirty };
    const copy = formationCopy(from, name);
    openPlay({ ...newBlankPlay(teamId, copy), name, tags: [FORMATION_DRAFT_TAG] }, 'formation');
    setNewFormationOpen(false);
  };

  const cancelFormation = () => {
    const back = parked.current;
    parked.current = null;
    if (back) openPlay(back.play, 'play', back.dirty);
    else openPlay(playFromConcept(teamId, LIBRARY.concepts[0], LIBRARY.formations[0]));
  };

  const selected = play.formation.players.find(x => x.role === editor.selectedRole);
  const moveSelected = (dx: number, dy: number) =>
    selected && dispatch({ type: 'movePlayer', role: selected.role, at: { x: selected.at.x + dx, y: selected.at.y + dy } });

  const menuItems: Array<{ label: string; run(): void; disabled?: boolean }> = [
    { label: 'New play', run: () => leaveCurrent() && openPlay(newBlankPlay(teamId, play.formation)) },
    { label: 'New formation', run: () => setNewFormationOpen(true) },
    { label: 'Library', run: () => setView('library') },
    { label: 'Terminology', run: () => setView('terminology'), disabled: settingsState !== 'ready' },
    { label: 'Rename', run: () => setRenaming(true) },
    { label: 'Flip', run: () => dispatch({ type: 'flip' }) },
    { label: 'Undo', run: undo, disabled: editor.past.length === 0 },
    { label: 'Redo', run: redo, disabled: editor.future.length === 0 },
  ];

  const playbookConceptIds = useMemo(
    () => plays.map(x => x.conceptId).filter((x): x is string => typeof x === 'string'),
    [plays],
  );

  const assistant = (
    <AssistantCard
      level={settings.level}
      playbookConceptIds={playbookConceptIds}
      terminology={terminology}
      onAdd={addFromAssistant}
      onTopCoverage={setCoverage}
    />
  );

  const saveSettings = async (next: TeamPlaybookSettings) => {
    if (settingsState !== 'ready') {
      setNotice({ kind: 'error', text: SETTINGS_BLOCKED });
      return;
    }
    const previous = settings;
    setSettings(next);
    try {
      await saveTeamSettings(teamId, next);
    } catch (e) {
      setSettings(previous);
      setNotice({ kind: 'error', text: isStoreError(e) ? e.message : "Couldn't save your settings." });
    }
  };

  return (
    <div className={`pb2${phone ? ' pb2-phone' : ''}`}>
      {/* Top bar: path dropdowns + 2D/3D + the one primary action + More */}
      <header className="pb2-topbar">
        <div className="pb2-path">
          <span className="pb2-mark" aria-hidden="true" />
          <label className="pb2-sr" htmlFor={`${ids}-side`}>
            Side
          </label>
          <select id={`${ids}-side`} className="pb2-select" defaultValue="offense">
            <option value="offense">Offense</option>
            <option value="defense" disabled>
              Defense (soon)
            </option>
          </select>
          <span className="pb2-path-sep" aria-hidden="true">
            /
          </span>
          <label className="pb2-sr" htmlFor={`${ids}-formation`}>
            Formation
          </label>
          {mode === 'formation' ? (
            <span className="pb2-path-static">Building a formation</span>
          ) : (
            <select
              id={`${ids}-formation`}
              className="pb2-select"
              value={formations.some(f => f.id === play.formation.id) ? play.formation.id : ''}
              onChange={e => changeFormation(e.target.value)}
            >
              {!formations.some(f => f.id === play.formation.id) && <option value="">{play.formation.name}</option>}
              {formations.map(f => (
                <option key={f.id} value={f.id}>
                  {f.id.startsWith('team:') ? `${f.name} (yours)` : f.name}
                </option>
              ))}
            </select>
          )}
          <span className="pb2-path-sep" aria-hidden="true">
            /
          </span>
          {renaming ? (
            <RenameField
              label={mode === 'formation' ? 'Formation name' : 'Play name'}
              initial={play.name}
              onDone={name => {
                setRenaming(false);
                if (name !== null && name.trim() && name.trim() !== play.name) dispatch({ type: 'rename', name: name.trim() });
              }}
            />
          ) : mode === 'play' && plays.length > 0 ? (
            <>
              <label className="pb2-sr" htmlFor={`${ids}-play`}>
                Play
              </label>
              <select
                id={`${ids}-play`}
                className="pb2-select pb2-display pb2-play-select"
                value={play.id ?? '__current'}
                disabled={saving}
                onChange={e => changePlay(e.target.value)}
              >
                {!play.id && <option value="__current">{play.name.toUpperCase()}</option>}
                {plays.map(x => (
                  <option key={x.id} value={x.id}>
                    {(x.id === play.id ? play.name : x.name).toUpperCase()}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="pb2-display pb2-play-name">{play.name.toUpperCase()}</span>
          )}
          {dirty && <span className="pb2-dirty">Unsaved</span>}
        </div>

        <div className="pb2-actions">
          <div className="pb2-toggle" role="group" aria-label="View">
            <button type="button" className="pb2-toggle-btn" aria-pressed="true">
              2D
            </button>
            <button type="button" className="pb2-toggle-btn" disabled aria-describedby={`${ids}-3d`} title="3D view arrives in a later update">
              3D
            </button>
            <span id={`${ids}-3d`} className="pb2-sr">
              3D view arrives in a later update
            </span>
          </div>
          {mode === 'formation' && (
            <button type="button" className="pb2-btn" onClick={cancelFormation}>
              Cancel
            </button>
          )}
          <div className="pb2-save">
            <button type="button" className="pb2-btn pb2-primary" data-primary="true" onClick={() => void save()} disabled={saving}>
              {mode === 'formation' ? 'Save formation' : 'Save play'}
            </button>
            {notice && (
              <span role={notice.kind === 'error' ? 'alert' : 'status'} className={`pb2-notice pb2-notice-${notice.kind}`}>
                {notice.text}
              </span>
            )}
          </div>
          <MoreMenu open={menuOpen} onOpenChange={setMenuOpen} items={menuItems} />
        </div>
      </header>

      {loadError && <p className="pb2-banner pb2-banner-error" role="alert">{loadError}</p>}

      {restorable && (
        <section className="pb2-banner pb2-restore" aria-label="Unsaved draft">
          <span>
            You have an unsaved {restorable.tags.includes(FORMATION_DRAFT_TAG) ? 'formation' : 'play'}: <strong>{restorable.name}</strong>
          </span>
          <span className="pb2-banner-actions">
            <button
              type="button"
              className="pb2-btn"
              onClick={() => {
                const draft = restorable;
                const wasDirty = dirty;
                if (wasDirty && !window.confirm('Replace the play you are editing with the draft? Its unsaved changes become the draft instead.')) {
                  return;
                }
                if (wasDirty) offer(play);
                else discard();
                openPlay(draft, draft.tags.includes(FORMATION_DRAFT_TAG) ? 'formation' : 'play', true);
              }}
            >
              Restore
            </button>
            <button type="button" className="pb2-btn pb2-quiet" onClick={discard}>
              Discard
            </button>
          </span>
        </section>
      )}

      {newFormationOpen && (
        <NewFormationDialog formations={[play.formation, ...formations]} onStart={startFormation} onCancel={() => setNewFormationOpen(false)} />
      )}

      {view === 'library' && (
        <LibraryView
          settings={settings}
          teamId={teamId}
          onClose={() => setView('sheet')}
          onUse={next => leaveCurrent() && openPlay(next)}
        />
      )}
      {view === 'terminology' && (
        <div className="pb2-panel-wrap">
          <TerminologyPanel settings={settings} onChange={next => void saveSettings(next)} />
          <button type="button" className="pb2-btn" onClick={() => setView('sheet')}>
            Back to the play
          </button>
        </div>
      )}

      {view === 'sheet' && (
        <main className="pb2-main">
          <div className="pb2-desk">
            {problems.length > 0 && (
              <div className="pb2-banner pb2-problems" role="status" aria-label="Formation problems">
                <strong>Not legal yet:</strong>
                <ul>
                  {problems.map(x => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <span className="pb2-muted">You can still save it.</span>
              </div>
            )}
            <FieldSheet
              play={play}
              terminology={terminology}
              defense={mode === 'play' ? coverage : undefined}
              highlightStep={mode === 'play' && play.read.length ? activeStep : undefined}
              selectedRole={editor.selectedRole}
              onMovePlayer={(role, at) => dispatch({ type: 'movePlayer', role, at })}
              onSelect={role => dispatch({ type: 'select', role: role === editor.selectedRole ? undefined : role })}
              reducedMotion={reducedMotion}
            />
            {selected && (
              <div className="pb2-selected" aria-label="Selected player" role="group">
                <span className="pb2-selected-name">
                  {playerName(selected.role, terminology[selected.role] ?? selected.role, selected.at, selected.onLine)}
                </span>
                <label className="pb2-check">
                  <input
                    type="checkbox"
                    checked={selected.onLine}
                    onChange={e => dispatch({ type: 'setOnLine', role: selected.role, onLine: e.target.checked })}
                  />
                  On the line
                </label>
                <span className="pb2-nudge" role="group" aria-label="Nudge half a yard">
                  <button type="button" className="pb2-icon-btn" aria-label="Move left" onClick={() => moveSelected(-0.5, 0)}>←</button>
                  <button type="button" className="pb2-icon-btn" aria-label="Move up the field" onClick={() => moveSelected(0, 0.5)}>↑</button>
                  <button type="button" className="pb2-icon-btn" aria-label="Move back" onClick={() => moveSelected(0, -0.5)}>↓</button>
                  <button type="button" className="pb2-icon-btn" aria-label="Move right" onClick={() => moveSelected(0.5, 0)}>→</button>
                </span>
                {isLineman(selected.role) && <span className="pb2-muted">Linemen stay unlabelled on the sheet.</span>}
              </div>
            )}
            {mode === 'play' && play.read.length > 0 && (
              <ReadSteps steps={play.read} terminology={terminology} active={activeStep} onSelect={setActiveStep} />
            )}
            {mode === 'formation' && (
              <p className="pb2-muted pb2-hint">
                Drag players or select one and nudge it. {validateFormation(play.formation).length === 0 ? 'This set is legal.' : ''}
              </p>
            )}
          </div>
          {!phone && (
            <aside className="pb2-side" data-testid="assistant-side" aria-label="Coaching assistant panel">
              {assistant}
            </aside>
          )}
        </main>
      )}

      {phone && view === 'sheet' && (
        <section
          className="pb2-bottomsheet"
          data-testid="assistant-bottom-sheet"
          data-expanded={sheetOpen ? 'true' : 'false'}
          aria-label="Coaching assistant panel"
        >
          <button
            type="button"
            className="pb2-bottomsheet-handle"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(o => !o)}
          >
            {sheetOpen ? 'Show less' : 'Show more'}
          </button>
          <div className="pb2-bottomsheet-body">{assistant}</div>
        </section>
      )}
    </div>
  );
};

const RenameField: React.FC<{ label: string; initial: string; onDone(name: string | null): void }> = ({ label, initial, onDone }) => {
  const [value, setValue] = useState(initial);
  return (
    <input
      aria-label={label}
      className="pb2-input pb2-display"
      value={value}
      // The field appears because the coach chose Rename; focusing it is the expected next step.
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      maxLength={60}
      onChange={e => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={e => {
        if (e.key === 'Enter') onDone(value);
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
};

const MoreMenu: React.FC<{
  open: boolean;
  onOpenChange(open: boolean): void;
  items: Array<{ label: string; run(): void; disabled?: boolean }>;
}> = ({ open, onOpenChange, items }) => {
  const menuId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const first = ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not([disabled])');
    first?.focus();
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onOpenChange]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onOpenChange(false);
      ref.current?.querySelector<HTMLButtonElement>('[aria-haspopup]')?.focus();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const all = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? [])];
    const i = all.indexOf(document.activeElement as HTMLButtonElement);
    all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus();
  };

  return (
    <div className="pb2-more" ref={ref} onKeyDown={onKeyDown} role="presentation">
      <button
        type="button"
        className="pb2-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
      >
        More
      </button>
      {open && (
        <div className="pb2-menu" role="menu" id={menuId} aria-label="More">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className="pb2-menuitem"
              disabled={item.disabled}
              onClick={() => {
                onOpenChange(false);
                item.run();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const NewFormationDialog: React.FC<{
  formations: Formation[];
  onStart(from: Formation, name: string): void;
  onCancel(): void;
}> = ({ formations, onStart, onCancel }) => {
  const ids = useId();
  const [from, setFrom] = useState('blank');
  const [name, setName] = useState('New formation');
  const unique = formations.filter((f, i) => formations.findIndex(x => x.id === f.id) === i);
  const start = () => {
    const source = from === 'blank' ? BLANK_SET : unique.find(f => f.id === from) ?? BLANK_SET;
    onStart(source, name.trim() || 'New formation');
  };
  return (
    <div className="pb2-dialog-backdrop">
      <div className="pb2-dialog" role="dialog" aria-modal="true" aria-labelledby={`${ids}-title`}>
        <h2 id={`${ids}-title`} className="pb2-dialog-title">
          New formation
        </h2>
        <label className="pb2-field">
          <span>Formation name</span>
          <input className="pb2-input" value={name} maxLength={60} onChange={e => setName(e.target.value)} />
        </label>
        <label className="pb2-field">
          <span>Start from</span>
          <select className="pb2-select" value={from} onChange={e => setFrom(e.target.value)}>
            <option value="blank">A blank legal set</option>
            {unique.map(f => (
              <option key={f.id} value={f.id}>
                A copy of {f.name}
              </option>
            ))}
          </select>
        </label>
        <div className="pb2-dialog-actions">
          <button type="button" className="pb2-btn pb2-quiet" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="pb2-btn pb2-strong" onClick={start}>
            Start editing
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaybookScreen;

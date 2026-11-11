// Smart Playbook editor on the canonical v4 play (docs/smart-playbook/SCHEMA_V4.md).
// Behind REACT_APP_ENABLE_PLAYBOOK_V4. One play model throughout: every edit is a pure v4 operation addressed by
// player id, the field draws resolved geometry, and saving goes through playStoreV4 (revision + history).
import React, { useCallback, useEffect, useId, useMemo, useReducer, useState } from 'react';
import '../theme.css';
import './playbook4.css';
import { useAuth } from '../../../components/AuthProvider';
import { useTeam } from '../../../contexts/TeamContext';
import {
  ROUTES, addRoutePoint, assignRoute, createPlayDocV4, describeAssignment, duplicatePlayDocV4, flipPlay, jobOf, motionOf,
  movePlayer, moveRoutePoint, playFromConceptV4, publishedLibrary, removeJob, removeRoutePoint, renamePlay, routeOf, setBlock,
  setDefense, setLabel, setMotion, setNotes, setOnLine, setProtect, setRouteDepth, setTags,
} from '../../../football-core';
import type { BlockRule, CoverageId, PlayDocV4, PlayerId, ProtectionRule, RouteId } from '../../../football-core';
import { isLineman } from '../field/geometry';
import { deletePlayV4, isPlayConflict, loadPlayDocsV4, savePlayDocV4, type ListedPlayDocV4 } from '../playStoreV4';
import { editorReducerV4, initEditorV4, type EditorSource } from './editorReducerV4';
import { FieldSheetV4 } from './FieldSheetV4';
import { PlayCard } from './PlayCard';
import { draftKey, useDraftV4 } from './useDraftV4';

const LIBRARY = publishedLibrary();
const ROUTE_IDS = Object.keys(ROUTES) as RouteId[];
const BLOCK_RULES: BlockRule[] = ['unspecified', 'base', 'down', 'combo', 'zone-playside', 'zone-backside', 'pull-kick', 'pull-lead'];
const PROTECT_RULES: ProtectionRule[] = ['unspecified', 'man', 'slide', 'big-on-big', 'check-release'];
const MOTIONS = ['jet', 'orbit', 'across', 'return'] as const;
const words = (s: string) => (s === 'unspecified' ? 'Not specified' : s.replace(/-/g, ' '));

/** The stored play without the list bookkeeping fields. */
function toPlay(listed: ListedPlayDocV4): PlayDocV4 {
  const { id: _id, sourceSchemaVersion: _version, ...play } = listed;
  void _id;
  void _version;
  return play;
}
const sourceOf = (listed: ListedPlayDocV4): EditorSource =>
  listed.sourceSchemaVersion === 4
    ? { kind: 'stored', id: listed.id, revision: listed.revision }
    : { kind: 'new', convertedFrom: { id: listed.id, schemaVersion: listed.sourceSchemaVersion } };

const PlaybookV4Screen: React.FC = () => {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  if (!user || user.isAnonymous) {
    return (
      <div className="pb2 pb4 pb2-empty">
        <p className="pb2-empty-text">Sign in to build your playbook.</p>
      </div>
    );
  }
  if (!currentTeam) {
    return (
      <div className="pb2 pb4 pb2-empty">
        <p className="pb2-empty-text">Pick a team to build its playbook.</p>
        <p className="pb2-muted">Open the Teams tab to create or choose one.</p>
      </div>
    );
  }
  return <Workspace key={`${user.uid}:${currentTeam.id}`} uid={user.uid} teamId={currentTeam.id} teamName={currentTeam.name} />;
};

type Banner = { kind: 'ok' | 'error'; text: string };

const Workspace: React.FC<{ uid: string; teamId: string; teamName: string }> = ({ uid, teamId, teamName }) => {
  const ids = useId();
  const [plays, setPlays] = useState<ListedPlayDocV4[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<'library' | 'editor'>('library');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [newFormation, setNewFormation] = useState(LIBRARY.formations[0]?.id ?? '');
  const [newConcept, setNewConcept] = useState('');
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [state, dispatch] = useReducer(editorReducerV4, undefined, () =>
    initEditorV4(createPlayDocV4(teamId, LIBRARY.formations[0]), { kind: 'new' }),
  );
  const { play, source, dirty, selected, problems, invalid, past, future } = state;
  const draft = useMemo(() => ({ play, source }), [play, source]);
  const { restorable, discard, clear, offer } = useDraftV4(draftKey(uid, teamId), draft, dirty && view === 'editor');

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await loadPlayDocsV4(teamId);
      setPlays(result.plays);
      setSkipped(result.skipped);
      return result.plays;
    } catch {
      setLoadError("Couldn't load your plays. Check your connection and try again.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [teamId]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const edit = useCallback((apply: (p: PlayDocV4) => PlayDocV4) => dispatch({ type: 'edit', apply }), []);

  /** Opens a play in the editor. Unsaved work in the editor is kept as the draft, never dropped. */
  const open = (next: PlayDocV4, nextSource: EditorSource, asDirty = false) => {
    if (view === 'editor' && dirty) offer({ play, source });
    dispatch({ type: 'open', play: next, source: nextSource, dirty: asDirty });
    setConflict(null);
    setBanner(null);
    setConfirmDelete(null);
    setView('editor');
  };
  const backToLibrary = () => {
    if (dirty) offer({ play, source });
    setView('library');
    setConflict(null);
    setConfirmDelete(null);
  };

  const startNew = () => {
    const formation = LIBRARY.formations.find(f => f.id === newFormation);
    if (!formation) return;
    const concept = LIBRARY.concepts.find(c => c.id === newConcept);
    if (!concept) {
      open(createPlayDocV4(teamId, formation), { kind: 'new' }, true);
      return;
    }
    const { play: created, missing } = playFromConceptV4(teamId, concept, formation);
    open(created, { kind: 'new' }, true);
    if (missing.length) setBanner({ kind: 'error', text: `${concept.name} needs a receiver this formation does not have (${missing.join(', ')}). Those assignments were left out.` });
  };

  const save = async (asNew = false) => {
    if (invalid.length) {
      setBanner({ kind: 'error', text: `This play can't be saved yet: ${invalid[0]}` });
      return;
    }
    const sent = play;
    const target = !asNew && source.kind === 'stored' ? { id: source.id, expectedRevision: source.revision } : {};
    setSaving(true);
    setBanner(null);
    try {
      const result = await savePlayDocV4(sent, uid, target);
      dispatch({ type: 'saved', play: sent, id: result.id, revision: result.revision });
      clear();
      setConflict(null);
      setBanner({ kind: 'ok', text: target.id ? 'Saved.' : 'Saved as a new play.' });
      void reload();
    } catch (e) {
      // Nothing was written. The play stays in the editor and in the local draft.
      if (isPlayConflict(e)) setConflict(e.message);
      else setBanner({ kind: 'error', text: "Couldn't save. Your changes are still here; try again when you're back online." });
    } finally {
      setSaving(false);
    }
  };

  const loadSavedVersion = async () => {
    if (source.kind !== 'stored') return;
    const fresh = await reload();
    const stored = fresh?.find(p => p.id === source.id);
    if (!stored) {
      setBanner({ kind: 'error', text: 'That play no longer exists. Your version is still here; save it as a new play to keep it.' });
      return;
    }
    // The coach chose the saved version; their own edits are kept as the draft in case that was a mistake.
    offer({ play, source });
    dispatch({ type: 'open', play: toPlay(stored), source: sourceOf(stored) });
    setConflict(null);
  };

  const duplicate = (from: PlayDocV4, fromId: string) => {
    open(duplicatePlayDocV4(from, fromId, `${from.name} (copy)`.slice(0, 120)), { kind: 'new' }, true);
    setBanner({ kind: 'ok', text: 'This is a copy. Rename it and save.' });
  };

  const removePlay = async (id: string) => {
    setConfirmDelete(null);
    try {
      await deletePlayV4(teamId, id);
      setPlays(list => list.filter(p => p.id !== id));
      if (source.kind === 'stored' && source.id === id) {
        clear();
        dispatch({ type: 'open', play: createPlayDocV4(teamId, LIBRARY.formations[0]), source: { kind: 'new' } });
        setView('library');
      }
      setBanner({ kind: 'ok', text: 'Play deleted.' });
    } catch {
      setBanner({ kind: 'error', text: "Couldn't delete the play. Nothing was removed." });
    }
  };

  const allTags = useMemo(() => [...new Set(plays.flatMap(p => p.tags))].sort(), [plays]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return plays
      .filter(p => !tag || p.tags.includes(tag))
      .filter(p => !q || [p.name, p.formation.name, ...p.tags].some(text => text.toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [plays, search, tag]);

  const banners = (
    <>
      {loadError && (
        <p className="pb2-banner pb2-banner-error" role="alert">
          {loadError}{' '}
          <button type="button" className="pb2-btn" onClick={() => void reload()}>Try again</button>
        </p>
      )}
      {banner && (
        <p className={`pb2-banner${banner.kind === 'error' ? ' pb2-banner-error' : ''}`} role={banner.kind === 'error' ? 'alert' : 'status'}>
          {banner.text}
        </p>
      )}
      {restorable && (
        <section className="pb2-banner pb2-restore" aria-label="Unsaved play">
          <span>You have an unsaved play: <strong>{restorable.play.name}</strong></span>
          <span className="pb2-banner-actions">
            <button type="button" className="pb2-btn" onClick={() => { const d = restorable; discard(); open(d.play, d.source, true); }}>Restore</button>
            <button type="button" className="pb2-btn pb2-quiet" onClick={discard}>Discard</button>
          </span>
        </section>
      )}
      {confirmDelete && (
        <section className="pb2-banner pb2-banner-error" role="alertdialog" aria-label="Delete play">
          <span>Delete <strong>{confirmDelete.name}</strong>? Its saved history is removed too. This can&apos;t be undone.</span>
          <span className="pb2-banner-actions">
            <button type="button" className="pb2-btn pb4-danger" onClick={() => void removePlay(confirmDelete.id)}>Delete play</button>
            <button type="button" className="pb2-btn" onClick={() => setConfirmDelete(null)}>Keep it</button>
          </span>
        </section>
      )}
    </>
  );

  if (view === 'library') {
    return (
      <div className="pb2 pb4">
        {banners}
        <section className="pb4-library" aria-label="Your plays">
          <div className="pb4-library-head">
            <div className="pb4-row">
              <label htmlFor={`${ids}-search`}>Search plays</label>
              <input id={`${ids}-search`} className="pb2-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, formation or tag" />
            </div>
            <div className="pb4-row">
              <label htmlFor={`${ids}-tag`}>Tag</label>
              <select id={`${ids}-tag`} className="pb2-select" value={tag} onChange={e => setTag(e.target.value)}>
                <option value="">All tags</option>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <span className="pb4-spacer" />
            <div className="pb4-row">
              <label htmlFor={`${ids}-nf`}>Formation</label>
              <select id={`${ids}-nf`} className="pb2-select" value={newFormation} onChange={e => setNewFormation(e.target.value)}>
                {LIBRARY.formations.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="pb4-row">
              <label htmlFor={`${ids}-nc`}>Start from</label>
              <select id={`${ids}-nc`} className="pb2-select" value={newConcept} onChange={e => setNewConcept(e.target.value)}>
                <option value="">Blank play</option>
                {LIBRARY.concepts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="button" className="pb2-btn pb2-primary" onClick={startNew} disabled={!newFormation}>New play</button>
          </div>

          {loading && <p className="pb2-muted" role="status">Loading your plays…</p>}
          {!loading && !loadError && plays.length === 0 && <p className="pb2-empty-text">No plays yet. Pick a formation and start your first one.</p>}
          {!loading && plays.length > 0 && visible.length === 0 && <p className="pb2-muted">No plays match that search.</p>}
          {skipped > 0 && (
            <p className="pb2-muted">
              {skipped} older {skipped === 1 ? 'play was' : 'plays were'} drawn in a format this editor can&apos;t read as football. {skipped === 1 ? 'It is' : 'They are'} untouched and still in your account.
            </p>
          )}
          <ul className="pb4-grid">
            {visible.map(p => (
              <li key={p.id} className="pb4-playcard">
                <h3>{p.name}</h3>
                <p className="pb2-muted">
                  {p.formation.name}
                  {p.tags.length ? ` · ${p.tags.join(', ')}` : ''}
                  {p.sourceSchemaVersion !== 4 ? ' · older version' : ''}
                </p>
                <div className="pb4-inline">
                  <button type="button" className="pb2-btn" aria-label={`Open ${p.name}`} onClick={() => open(toPlay(p), sourceOf(p))}>Open</button>
                  <button type="button" className="pb2-btn pb2-quiet" aria-label={`Duplicate ${p.name}`} onClick={() => duplicate(toPlay(p), p.id)}>Duplicate</button>
                  {p.sourceSchemaVersion === 4 && (
                    <button type="button" className="pb2-btn pb2-quiet pb4-danger" aria-label={`Delete ${p.name}`} onClick={() => setConfirmDelete({ id: p.id, name: p.name })}>Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  const player = selected ? play.players.find(p => p.id === selected) : undefined;
  const job = selected ? jobOf(play, selected) : undefined;
  const route = selected ? routeOf(play, selected) : undefined;
  const motion = selected ? motionOf(play, selected) : undefined;
  const jobKind = job?.kind === 'route' || job?.kind === 'block' || job?.kind === 'protect' ? job.kind : job ? 'other' : 'none';
  const assigned = play.players.filter(p => play.assignments.some(a => a.playerId === p.id));

  const chooseJob = (id: PlayerId, kind: string) => {
    if (kind === 'none') edit(p => removeJob(p, id));
    else if (kind === 'route') edit(p => assignRoute(p, id, 'hitch'));
    else if (kind === 'block') edit(p => setBlock(p, id, 'unspecified'));
    else if (kind === 'protect') edit(p => setProtect(p, id, 'unspecified'));
  };

  return (
    <div className="pb2 pb4">
      <header className="pb4-toolbar">
        <button type="button" className="pb2-btn" onClick={backToLibrary}>All plays</button>
        <div className="pb4-row pb4-name">
          <label className="pb2-sr" htmlFor={`${ids}-name`}>Play name</label>
          <input id={`${ids}-name`} className="pb2-input" value={play.name} maxLength={120} onChange={e => { const name = e.target.value; edit(p => renamePlay(p, name)); }} />
        </div>
        {dirty && <span className="pb2-dirty">Unsaved</span>}
        <button type="button" className="pb2-btn" onClick={() => dispatch({ type: 'undo' })} disabled={past.length === 0}>Undo</button>
        <button type="button" className="pb2-btn" onClick={() => dispatch({ type: 'redo' })} disabled={future.length === 0}>Redo</button>
        <button type="button" className="pb2-btn" onClick={() => edit(flipPlay)}>Flip</button>
        <div className="pb4-row">
          <label className="pb2-sr" htmlFor={`${ids}-def`}>Defense shown</label>
          <select
            id={`${ids}-def`}
            className="pb2-select"
            value={play.defense?.coverageId ?? ''}
            onChange={e => { const value = e.target.value; edit(p => setDefense(p, value ? (value as CoverageId) : null)); }}
          >
            <option value="">No defense</option>
            {LIBRARY.coverages.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button type="button" className="pb2-btn" onClick={() => duplicate(play, source.kind === 'stored' ? source.id : 'unsaved')}>Duplicate</button>
        <button type="button" className="pb2-btn" onClick={() => window.print()}>Print play card</button>
        {source.kind === 'stored' && (
          <button type="button" className="pb2-btn pb4-danger" onClick={() => setConfirmDelete({ id: source.id, name: play.name })}>Delete</button>
        )}
        <button type="button" className="pb2-btn pb2-primary" data-primary="true" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save play'}
        </button>
      </header>

      {banners}
      {source.kind === 'new' && source.convertedFrom && (
        <p className="pb2-banner" role="status">
          This play was made in an older version. Saving keeps the original and adds an updated copy.
        </p>
      )}
      {conflict && (
        <section className="pb2-banner pb2-banner-error" role="alert" aria-label="Save conflict">
          <span>{conflict}</span>
          <span className="pb2-banner-actions">
            <button type="button" className="pb2-btn" onClick={() => void save(true)}>Save mine as a new play</button>
            <button type="button" className="pb2-btn" onClick={() => void loadSavedVersion()}>Load the saved version</button>
            <button type="button" className="pb2-btn pb2-quiet" onClick={() => setConflict(null)}>Keep editing</button>
          </span>
        </section>
      )}

      <div className="pb2-main">
        <div className="pb2-desk">
          <FieldSheetV4
            play={play}
            selected={selected}
            onSelect={id => dispatch({ type: 'select', id })}
            onMovePlayer={(id, at) => edit(p => movePlayer(p, id, at))}
            onMoveRoutePoint={(id, index, offset) => edit(p => moveRoutePoint(p, id, index, offset))}
          />
          {problems.length > 0 && (
            <ul className="pb2-problems" aria-label="Formation problems">
              {problems.map(text => <li key={text}>{text}</li>)}
            </ul>
          )}
        </div>

        <aside className="pb2-side">
          <section className="pb4-panel" aria-label="Selected player">
            {!player && <p className="pb2-muted">Tap a player on the field to give him an assignment.</p>}
            {player && selected && (
              <>
                <h3>{player.label ?? player.role}{isLineman(player.role) ? ' (lineman)' : ''}</h3>
                <div className="pb4-row">
                  <label htmlFor={`${ids}-label`}>Label</label>
                  <input id={`${ids}-label`} className="pb2-input" value={player.label ?? ''} maxLength={12} placeholder={player.role} onChange={e => { const text = e.target.value; edit(p => setLabel(p, selected, text)); }} />
                </div>
                <label className="pb4-check">
                  <input type="checkbox" checked={player.onLine} onChange={e => { const on = e.target.checked; edit(p => setOnLine(p, selected, on)); }} />
                  On the line of scrimmage
                </label>
                <div className="pb4-row">
                  <label htmlFor={`${ids}-job`}>Assignment</label>
                  <select id={`${ids}-job`} className="pb2-select" value={jobKind} onChange={e => chooseJob(selected, e.target.value)}>
                    <option value="none">None</option>
                    <option value="route">Route</option>
                    <option value="block">Block</option>
                    <option value="protect">Pass protect</option>
                    {jobKind === 'other' && job && <option value="other">{describeAssignment(job)}</option>}
                  </select>
                </div>

                {route && (
                  <>
                    <div className="pb4-row">
                      <label htmlFor={`${ids}-route`}>Route</label>
                      <select id={`${ids}-route`} className="pb2-select" value={route.template?.routeId ?? ''} onChange={e => { const value = e.target.value; if (value) edit(p => assignRoute(p, selected, value as RouteId)); }}>
                        {!route.template && <option value="">Custom route</option>}
                        {ROUTE_IDS.map(id => <option key={id} value={id}>{ROUTES[id].name}</option>)}
                      </select>
                    </div>
                    {route.template && (
                      <div className="pb4-row">
                        <label htmlFor={`${ids}-depth`}>Depth (yards)</label>
                        <input
                          id={`${ids}-depth`}
                          className="pb2-input"
                          type="number"
                          inputMode="decimal"
                          min={-5}
                          max={40}
                          step={0.5}
                          value={route.template.depth ?? ROUTES[route.template.routeId].defaultDepth}
                          onChange={e => { const depth = Number(e.target.value); if (e.target.value !== '' && Number.isFinite(depth)) edit(p => setRouteDepth(p, selected, depth)); }}
                        />
                      </div>
                    )}
                    <p className="pb2-muted">Drag the square handles on the field to reshape this route.</p>
                    <div className="pb4-inline">
                      <button type="button" className="pb2-btn" onClick={() => edit(p => addRoutePoint(p, selected))}>Add route point</button>
                      <button type="button" className="pb2-btn" disabled={route.points.length <= 1} onClick={() => edit(p => removeRoutePoint(p, selected, route.points.length - 1))}>Remove last point</button>
                    </div>
                  </>
                )}
                {job?.kind === 'block' && (
                  <div className="pb4-row">
                    <label htmlFor={`${ids}-block`}>Block type</label>
                    <select id={`${ids}-block`} className="pb2-select" value={job.rule} onChange={e => { const rule = e.target.value as BlockRule; edit(p => setBlock(p, selected, rule)); }}>
                      {BLOCK_RULES.map(r => <option key={r} value={r}>{words(r)}</option>)}
                    </select>
                  </div>
                )}
                {job?.kind === 'protect' && (
                  <div className="pb4-row">
                    <label htmlFor={`${ids}-protect`}>Protection</label>
                    <select id={`${ids}-protect`} className="pb2-select" value={job.rule} onChange={e => { const rule = e.target.value as ProtectionRule; edit(p => setProtect(p, selected, rule)); }}>
                      {PROTECT_RULES.map(r => <option key={r} value={r}>{words(r)}</option>)}
                    </select>
                  </div>
                )}
                {!isLineman(player.role) && (
                  <div className="pb4-row">
                    <label htmlFor={`${ids}-motion`}>Pre-snap motion</label>
                    <select id={`${ids}-motion`} className="pb2-select" value={motion?.motion ?? ''} onChange={e => { const value = e.target.value; edit(p => setMotion(p, selected, value ? (value as (typeof MOTIONS)[number]) : null)); }}>
                      <option value="">None</option>
                      {MOTIONS.map(m => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                )}
                {job && <button type="button" className="pb2-btn pb4-danger" onClick={() => edit(p => removeJob(p, selected))}>Remove assignment</button>}
              </>
            )}
          </section>

          <section className="pb4-panel" aria-label="Assignments">
            <h3>Assignments</h3>
            {assigned.length === 0 && <p className="pb2-muted">Nobody has an assignment yet.</p>}
            <ul className="pb4-list">
              {assigned.map(p => (
                <li key={p.id}>
                  <button type="button" className="pb2-btn pb2-quiet" aria-pressed={selected === p.id} onClick={() => dispatch({ type: 'select', id: p.id })}>
                    <strong>{p.label ?? p.role}</strong>: {play.assignments.filter(a => a.playerId === p.id).map(describeAssignment).join('; ')}
                  </button>
                </li>
              ))}
            </ul>
            {play.unresolved.length > 0 && (
              <p className="pb2-muted">
                {play.unresolved.length} assignment{play.unresolved.length === 1 ? '' : 's'} from the older version could not be matched to a player and {play.unresolved.length === 1 ? 'is' : 'are'} not shown. Assign {play.unresolved.length === 1 ? 'it' : 'them'} by hand if needed.
              </p>
            )}
          </section>

          <section className="pb4-panel" aria-label="Play details">
            <div className="pb4-row">
              <label htmlFor={`${ids}-tags`}>Tags (separate with commas)</label>
              <TagsInput id={`${ids}-tags`} tags={play.tags} onCommit={tags => edit(p => setTags(p, tags))} />
            </div>
            <div className="pb4-row">
              <label htmlFor={`${ids}-notes`}>Coaching notes</label>
              <textarea id={`${ids}-notes`} className="pb2-input" rows={3} maxLength={5000} value={play.notes} onChange={e => { const text = e.target.value; edit(p => setNotes(p, text)); }} />
            </div>
          </section>
        </aside>
      </div>

      <div className="pb4-print" aria-hidden="true">
        <PlayCard play={play} teamName={teamName} />
      </div>
    </div>
  );
};

/** Free-text tags, committed when the coach leaves the field so typing a comma does not fight the cursor. */
const TagsInput: React.FC<{ id: string; tags: string[]; onCommit(tags: string[]): void }> = ({ id, tags, onCommit }) => {
  const joined = tags.join(', ');
  const [text, setText] = useState(joined);
  useEffect(() => setText(joined), [joined]);
  const commit = () => {
    if (text !== joined) onCommit(text.split(','));
  };
  return <input id={id} className="pb2-input" value={text} onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} />;
};

export default PlaybookV4Screen;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useTeam } from '../../../contexts/TeamContext';
import { SYNTHETIC_SAMPLES, SyntheticSample, sampleById } from './samples';
import { AnnotationFields, AnnotationRecord, LIMITS, SUGGESTED_TAGS, normalizeTags, sameFields, sameSource, sourceFor, validateFields } from './annotation';
import { AnnotationConflict, TeamScope, deleteAnnotation, listAnnotations, saveAnnotation } from './annotationStore';
import { MediaVerificationError, chooseFile, durationMatches, fetchVerified } from './verifyMedia';
import './film-review.css';

type Editable = Omit<AnnotationFields, 'source'>;
interface Base { id: string | null; revision: number; fields: AnnotationFields | null }
interface Draft { sampleId: string; edit: Editable; base: Base }
type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'failed' | 'conflict' | 'pending'; message: string };

// Unsaved edits survive moving between app destinations for this account and team only.
// They live in memory: a reload, sign-out or another team never sees them.
const sessionDrafts = new Map<string, Draft>();
const blank = (sample: SyntheticSample): Editable => ({ startMs: 0, endMs: Math.min(3000, sample.durationMs), label: '', tags: [], notes: '' });
const seconds = (ms: number) => (Number.isFinite(ms) ? (ms / 1000).toFixed(2) : '');
const fmt = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const STEP_MS = 500;

function Editor({ uid, teamId, teamName }: { uid: string; teamId: string; teamName: string }) {
  const scope: TeamScope = useMemo(() => ({ uid, teamId }), [uid, teamId]);
  const key = `${uid}:${teamId}`;
  const video = useRef<HTMLVideoElement>(null);
  const [sampleId, setSampleId] = useState(SYNTHETIC_SAMPLES[0].id);
  const sample = sampleById(sampleId)!;
  const [media, setMedia] = useState<{ status: 'loading' | 'ready' | 'error'; url: string; error: string }>({ status: 'loading', url: '', error: '' });
  const [clock, setClock] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const stopAt = useRef<number | null>(null);
  const [edit, setEdit] = useState<Editable>(() => blank(sample));
  const [base, setBase] = useState<Base>({ id: null, revision: 0, fields: null });
  const [save, setSave] = useState<SaveState>({ kind: 'idle', message: 'Not saved — new mark.' });
  const [conflict, setConflict] = useState<AnnotationRecord | null | undefined>(undefined);
  const [pendingOpen, setPendingOpen] = useState<AnnotationRecord | null>(null);
  const [list, setList] = useState<{ loading: boolean; error: string; records: AnnotationRecord[]; invalid: { id: string; reason: string }[] }>({ loading: true, error: '', records: [], invalid: [] });
  const [restore, setRestore] = useState<Draft | null>(() => sessionDrafts.get(key) ?? null);
  const restoreRef = useRef(restore); restoreRef.current = restore;
  const [tagInput, setTagInput] = useState('');
  const [notice, setNotice] = useState('');

  const source = useMemo(() => sourceFor(sample), [sample]);
  const fields: AnnotationFields = { ...edit, source };
  const validation = useMemo(() => { try { validateFields({ ...edit, source }); return ''; } catch (e) { return (e as Error).message; } }, [edit, source]);
  const dirty = base.fields ? !sameFields(fields, base.fields) : (edit.label !== '' || edit.notes !== '' || edit.tags.length > 0 || edit.startMs !== 0 || edit.endMs !== blank(sample).endMs);
  const ready = media.status === 'ready';

  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const draftRef = useRef<Draft>({ sampleId, edit, base }); draftRef.current = { sampleId, edit, base };
  // Keep unsaved work for this account+team while the coach visits other destinations. An unanswered
  // restore offer keeps the earlier draft; only an explicit Discard, a save or a reopen removes it.
  useEffect(() => () => {
    if (dirtyRef.current) sessionDrafts.set(key, draftRef.current);
    else if (!restoreRef.current) sessionDrafts.delete(key);
  }, [key]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const refresh = useCallback(async () => {
    setList(l => ({ ...l, loading: true, error: '' }));
    try { const r = await listAnnotations(scope); setList({ loading: false, error: '', ...r }); }
    catch (e) { setList(l => ({ ...l, loading: false, error: e instanceof Error ? e.message : 'Saved marks could not be loaded.' })); }
  }, [scope]);
  useEffect(() => { void refresh(); }, [refresh]);

  // Load and verify the selected sample (bytes + SHA-256 here, duration on loadedmetadata).
  useEffect(() => {
    let alive = true; let url = ''; const abort = new AbortController();
    setMedia({ status: 'loading', url: '', error: '' }); setPlaying(false); setClock(0); stopAt.current = null;
    const file = chooseFile(sample, video.current);
    if (!file) { setMedia({ status: 'error', url: '', error: 'This browser cannot play the synthetic sample.' }); return; }
    fetchVerified(file, abort.signal).then(u => { url = u; if (alive) setMedia({ status: 'loading', url: u, error: '' }); else URL.revokeObjectURL(u); })
      .catch(e => { if (alive && (e as Error).name !== 'AbortError') setMedia({ status: 'error', url: '', error: e instanceof MediaVerificationError ? e.message : 'Sample verification failed.' }); });
    return () => { alive = false; abort.abort(); if (url) URL.revokeObjectURL(url); };
  }, [sample]);

  // A stored mark enters the editor only after its media is verified (Film A0 review finding A0-1).
  useEffect(() => {
    if (!pendingOpen) return;
    if (media.status === 'error') {
      setPendingOpen(null);
      setSave({ kind: 'failed', message: 'Not reopened — the sample failed verification. The saved mark is unchanged.' });
    } else if (ready && sampleId === pendingOpen.source.sampleId) {
      const { source: _s, id: _i, teamId: _t, createdBy: _c, revision, createdAt: _a, updatedAt: _u, ...rest } = pendingOpen;
      setEdit(rest); setBase({ id: pendingOpen.id, revision, fields: { ...rest, source: pendingOpen.source } }); setPendingOpen(null); setConflict(undefined);
      setSave({ kind: 'saved', message: `Saved to ${teamName} · revision ${revision} — reopened and checked against the sample.` });
    }
  }, [pendingOpen, media.status, ready, sampleId, teamName]);

  const confirmDiscard = (what: string) => !dirty || window.confirm(`You have unsaved changes to this mark. ${what} anyway? Your unsaved changes will be lost.`);
  const change = (patch: Partial<Editable>) => {
    setEdit(e => ({ ...e, ...patch })); setPendingOpen(null);
    setSave(s => (s.kind === 'saving' ? s : { kind: 'idle', message: 'Not saved — you have unsaved changes.' }));
  };
  const startNew = (next: SyntheticSample = sample) => {
    setEdit(blank(next)); setBase({ id: null, revision: 0, fields: null }); setConflict(undefined); setPendingOpen(null);
    setSave({ kind: 'idle', message: 'Not saved — new mark.' });
  };

  function open(record: AnnotationRecord) {
    if (!confirmDiscard('Open another mark')) return;
    const target = sampleById(record.source.sampleId);
    if (!target || !sameSource(record.source, sourceFor(target))) {
      setSave({ kind: 'failed', message: `“${record.label}” refers to sample media that is not available here. The saved mark is kept unchanged.` });
      return;
    }
    setConflict(undefined); setRestore(null); sessionDrafts.delete(key);
    setEdit(blank(target)); setBase({ id: null, revision: 0, fields: null });
    if (target.id !== sampleId) setSampleId(target.id);
    setPendingOpen(record);
    setSave({ kind: 'pending', message: `Verifying the sample before reopening “${record.label}”…` });
  }

  async function doSave(asNew = false) {
    if (!ready) { setSave({ kind: 'failed', message: 'Not saved — the sample is not verified.' }); return; }
    if (validation) { setSave({ kind: 'failed', message: `Not saved — ${validation}` }); return; }
    setSave({ kind: 'saving', message: 'Saving to your team…' });
    try {
      const record = await saveAnnotation(scope, asNew ? null : base.id, asNew ? 0 : base.revision, fields);
      const { source: s, id, revision } = record;
      setBase({ id, revision, fields: { startMs: record.startMs, endMs: record.endMs, label: record.label, tags: record.tags, notes: record.notes, source: s } });
      setConflict(undefined); sessionDrafts.delete(key);
      setSave({ kind: 'saved', message: `Saved to ${teamName} · revision ${revision} (confirmed on the server).` });
      void refresh();
    } catch (e) {
      if (e instanceof AnnotationConflict) { setConflict(e.remote); setSave({ kind: 'conflict', message: `Not saved — ${e.message}` }); void refresh(); }
      else setSave({ kind: 'failed', message: `Not saved — ${e instanceof Error ? e.message : 'the save failed'} Your edits are kept.` });
    }
  }

  async function doDelete() {
    if (!base.id || !window.confirm(`Delete “${base.fields?.label ?? edit.label}” from ${teamName}? This cannot be undone.`)) return;
    setSave({ kind: 'saving', message: 'Deleting…' });
    try { await deleteAnnotation(scope, base.id, base.revision); startNew(); setNotice('Mark deleted (confirmed on the server).'); void refresh(); }
    catch (e) {
      if (e instanceof AnnotationConflict) { setConflict(e.remote); setSave({ kind: 'conflict', message: 'Not deleted — this mark was changed elsewhere.' }); void refresh(); }
      else setSave({ kind: 'failed', message: `Not deleted — ${e instanceof Error ? e.message : 'the delete failed'}` });
    }
  }

  function loadRemote() {
    if (!conflict) { startNew(); return; }
    if (!window.confirm('Replace your edits with the saved version?')) return;
    open({ ...conflict });
  }

  // Player controls
  const seek = (ms: number) => { const v = video.current; if (!v || !ready) return; stopAt.current = null; v.currentTime = Math.max(0, Math.min(sample.durationMs, ms)) / 1000; setClock(v.currentTime * 1000); };
  const togglePlay = async () => { const v = video.current; if (!v || !ready) return; if (!v.paused) { v.pause(); return; } stopAt.current = null; try { await v.play(); } catch { setNotice('Playback did not start. Try Play again.'); } };
  const playInterval = async () => {
    const v = video.current; if (!v || !ready || validation) return;
    v.currentTime = edit.startMs / 1000; stopAt.current = edit.endMs;
    try { await v.play(); } catch { setNotice('Playback did not start. Try again.'); }
  };
  const markHere = (which: 'startMs' | 'endMs') => { const v = video.current; if (v && ready) change({ [which]: Math.round(v.currentTime * 1000) }); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    const actions: Record<string, () => void> = {
      ' ': () => void togglePlay(), k: () => void togglePlay(), ArrowLeft: () => seek(clock - STEP_MS), ArrowRight: () => seek(clock + STEP_MS),
      i: () => markHere('startMs'), o: () => markHere('endMs'), Home: () => seek(0), End: () => seek(sample.durationMs),
    };
    const act = actions[e.key]; if (act && !(e.target instanceof HTMLButtonElement && (e.key === ' ' || e.key === 'Enter'))) { e.preventDefault(); act(); }
  };

  const addTag = (raw: string) => {
    const next = normalizeTags([...edit.tags, raw]);
    if (next.length === edit.tags.length) { setTagInput(''); return; }
    change({ tags: next }); setTagInput('');
  };
  const setTime = (which: 'startMs' | 'endMs', value: string) => change({ [which]: value === '' ? NaN : Math.round(Number(value) * 1000) });

  const statusClass = save.kind === 'saved' ? 'fr-status-saved' : save.kind === 'saving' || save.kind === 'pending' ? 'fr-status-busy' : save.kind === 'idle' ? 'fr-status-unsaved' : 'fr-status-error';
  const saveDisabled = !ready || !!validation || save.kind === 'saving' || !!pendingOpen || (!dirty && !!base.id);

  return <section className="fr" aria-label="Film review">
    <div className="eb-hero fr-hero">
      <div>
        <div className="eb-kicker-row"><h1 className="eb-kicker">Film review</h1><span className="fr-badge">Synthetic preview · no real footage</span></div>
        <p className="eb-title fr-title" aria-hidden="true">{base.fields?.label || edit.label || 'New mark'}</p>
        <p className="fr-intro">Mark a play on a synthetic clip, tag it, add coaching notes and save it to <strong>{teamName}</strong>. Saved marks reopen only against the same verified clip.</p>
      </div>
    </div>
    {notice && <p className="fr-notice" role="status">{notice} <button type="button" className="eb-link" onClick={() => setNotice('')}>Dismiss</button></p>}
    {restore && <div className="fr-restore" role="alert">
      <p>You have unsaved changes from earlier in this session{restore.edit.label ? ` (“${restore.edit.label}”)` : ''}.</p>
      <button type="button" className="eb-btn" onClick={() => { const r = restore; setRestore(null); sessionDrafts.delete(key); if (r.sampleId !== sampleId) setSampleId(r.sampleId); setEdit(r.edit); setBase(r.base); setSave({ kind: 'idle', message: 'Not saved — restored unsaved changes.' }); }}>Restore unsaved changes</button>
      <button type="button" className="eb-btn" onClick={() => { setRestore(null); sessionDrafts.delete(key); }}>Discard them</button>
    </div>}

    <div className="fr-grid">
      <section className="eb-panel fr-player" aria-label="Film player">
        <div className="eb-panel-head"><h2>{sample.title}</h2>
          <label className="fr-sample">Sample<select aria-label="Synthetic sample" value={sampleId} onChange={e => { const next = sampleById(e.target.value)!; if (!confirmDiscard('Change sample')) return; setSampleId(next.id); startNew(next); }}>
            {SYNTHETIC_SAMPLES.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        </div>
        <div className="fr-stage" tabIndex={0} role="group" aria-label="Video controls area. Space plays or pauses, arrow keys step half a second, I marks start, O marks end." onKeyDown={onKey}>
          <video ref={video} src={media.url || undefined} preload="auto" playsInline aria-label={`${sample.title}. ${sample.description}`}
            onLoadedMetadata={() => { const v = video.current; if (!v) return; if (durationMatches(sample, v.duration)) setMedia(m => ({ ...m, status: 'ready' })); else setMedia({ status: 'error', url: '', error: 'The synthetic sample has the wrong duration. Playback and saving are blocked.' }); }}
            onError={() => { if (media.url) setMedia({ status: 'error', url: '', error: 'This browser could not play the verified sample.' }); }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); stopAt.current = null; }}
            onTimeUpdate={() => { const v = video.current; if (!v) return; const ms = v.currentTime * 1000; setClock(ms); if (stopAt.current !== null && ms >= stopAt.current) { v.pause(); v.currentTime = stopAt.current / 1000; setClock(stopAt.current); stopAt.current = null; } }} />
          {edit.endMs > edit.startMs && Number.isFinite(edit.startMs) && Number.isFinite(edit.endMs) && <div className="fr-interval" aria-hidden="true" style={{ left: `${(edit.startMs / sample.durationMs) * 100}%`, width: `${((edit.endMs - edit.startMs) / sample.durationMs) * 100}%` }} />}
        </div>
        {media.status === 'error' ? <p role="alert" className="fr-media-error">{media.error}</p>
          : <p className="fr-caption">{ready ? 'Sample bytes, hash and duration verified. Synthetic illustration, not game footage.' : 'Verifying the synthetic sample…'}</p>}
        <div className="fr-controls">
          <button type="button" className="eb-btn eb-btn-primary" disabled={!ready} onClick={() => void togglePlay()}>{playing ? 'Pause' : 'Play'}</button>
          <button type="button" className="eb-btn" disabled={!ready} onClick={() => seek(clock - STEP_MS)} aria-label="Back half a second">−0.5s</button>
          <button type="button" className="eb-btn" disabled={!ready} onClick={() => seek(clock + STEP_MS)} aria-label="Forward half a second">+0.5s</button>
          <label className="fr-speed">Speed<select aria-label="Playback speed" value={speed} disabled={!ready} onChange={e => { const n = Number(e.target.value); setSpeed(n); if (video.current) video.current.playbackRate = n; }}>
            {[0.25, 0.5, 1, 1.5, 2].map(n => <option key={n} value={n}>{n}×</option>)}</select></label>
          <button type="button" className="eb-btn" disabled={!ready || !!validation} onClick={() => void playInterval()}>Play marked interval</button>
        </div>
        <label className="fr-seek"><span>Seek <output>{fmt(clock)} / {fmt(sample.durationMs)}</output></span>
          <input type="range" aria-label="Seek video" min={0} max={sample.durationMs} step={50} value={Math.round(clock)} disabled={!ready} onChange={e => seek(Number(e.target.value))} /></label>
        <p className="fr-keys">Keyboard (click the video area first): Space play/pause · ← → step 0.5s · I mark start · O mark end · Home/End.</p>
      </section>

      <section className="eb-panel fr-form" aria-label="Mark a play">
        <div className="eb-panel-head"><h2>{base.id ? 'Edit mark' : 'New mark'}</h2>{base.id && <span className="fr-rev">Revision {base.revision}</span>}</div>
        <div className="fr-form-body">
          <div className="fr-times">
            <label>Start (seconds)<input type="number" aria-label="Start seconds" min={0} max={sample.durationMs / 1000} step={0.05} value={seconds(edit.startMs)} onChange={e => setTime('startMs', e.target.value)} /></label>
            <button type="button" className="eb-btn" disabled={!ready} onClick={() => markHere('startMs')}>Mark start here</button>
            <label>End (seconds)<input type="number" aria-label="End seconds" min={0} max={sample.durationMs / 1000} step={0.05} value={seconds(edit.endMs)} onChange={e => setTime('endMs', e.target.value)} /></label>
            <button type="button" className="eb-btn" disabled={!ready} onClick={() => markHere('endMs')}>Mark end here</button>
          </div>
          <label>Label<input type="text" aria-label="Label" maxLength={LIMITS.labelMax} value={edit.label} placeholder="e.g. Out route break" onChange={e => change({ label: e.target.value })} onBlur={() => edit.label !== edit.label.trim() && change({ label: edit.label.trim() })} /></label>
          <div className="fr-tags">
            <span className="fr-field-label" id="fr-tags-label">Tags <small>{edit.tags.length}/{LIMITS.tagsMax}</small></span>
            <ul aria-labelledby="fr-tags-label">{edit.tags.map(t => <li key={t}>{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => change({ tags: edit.tags.filter(x => x !== t) })}>×</button></li>)}</ul>
            <div className="fr-tag-add">
              <input type="text" aria-label="New tag" maxLength={LIMITS.tagMax} value={tagInput} placeholder="Add a tag" disabled={edit.tags.length >= LIMITS.tagsMax}
                onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (tagInput.trim()) addTag(tagInput); } }} />
              <button type="button" className="eb-btn" disabled={!tagInput.trim() || edit.tags.length >= LIMITS.tagsMax} onClick={() => addTag(tagInput)}>Add tag</button>
            </div>
            <div className="fr-suggest" aria-label="Suggested tags">{SUGGESTED_TAGS.filter(t => !edit.tags.some(x => x.toLowerCase() === t.toLowerCase())).map(t =>
              <button type="button" key={t} disabled={edit.tags.length >= LIMITS.tagsMax} onClick={() => addTag(t)}>+ {t}</button>)}</div>
          </div>
          <label>Notes <small>{edit.notes.length}/{LIMITS.notesMax}</small><textarea aria-label="Notes" maxLength={LIMITS.notesMax} rows={4} value={edit.notes} placeholder="What should the coach or player notice?" onChange={e => change({ notes: e.target.value })} /></label>
          {validation && <p className="fr-validation" role="alert">{validation}</p>}
          <div className="fr-actions">
            <button type="button" className="eb-btn eb-btn-primary" disabled={saveDisabled} onClick={() => void doSave()}>Save to team</button>
            <button type="button" className="eb-btn" onClick={() => { if (confirmDiscard('Start a new mark')) startNew(); }}>New mark</button>
            {base.id && <button type="button" className="eb-btn fr-danger" disabled={save.kind === 'saving'} onClick={() => void doDelete()}>Delete mark</button>}
          </div>
          <p role="status" aria-label="Film save status" className={`fr-status ${statusClass}`}>{save.message}</p>
          {conflict !== undefined && <div className="fr-conflict" role="alertdialog" aria-label="Conflicting change">
            <p>{conflict ? `The saved version (revision ${conflict.revision}) is different from yours.` : 'The saved version was deleted.'} Your edits are kept until you choose.</p>
            <div className="fr-actions">
              <button type="button" className="eb-btn" onClick={loadRemote}>{conflict ? 'Load the saved version' : 'Start over'}</button>
              <button type="button" className="eb-btn eb-btn-primary" disabled={!!validation || !ready} onClick={() => void doSave(true)}>Save mine as a new mark</button>
              <button type="button" className="eb-btn" onClick={() => setConflict(undefined)}>Keep editing</button>
            </div>
          </div>}
        </div>
      </section>

      <section className="eb-panel fr-library" aria-label="Saved marks">
        <div className="eb-panel-head"><h2>Saved marks</h2><button type="button" className="eb-link" onClick={() => void refresh()}>Refresh</button></div>
        {list.loading ? <p className="fr-empty">Loading saved marks…</p> : list.error ? <p role="alert" className="fr-media-error">{list.error}</p> : null}
        {!list.loading && !list.error && list.records.length === 0 && <p className="fr-empty">No saved marks for {teamName} yet.</p>}
        <ul aria-label="Saved film marks">{list.records.map(r => <li key={r.id} className={r.id === base.id ? 'fr-current' : undefined}>
          <button type="button" onClick={() => open(r)}>Open {r.label}</button>
          <span>{fmt(r.startMs)}–{fmt(r.endMs)} · rev {r.revision}{r.tags.length ? ` · ${r.tags.join(', ')}` : ''}</span>
        </li>)}</ul>
        {list.invalid.length > 0 && <p className="fr-empty" role="note">{list.invalid.length} saved record(s) could not be read and were left unchanged.</p>}
      </section>
    </div>
  </section>;
}

export default function FilmReview() {
  const { user } = useAuth(); const { currentTeam } = useTeam();
  if (!user || user.isAnonymous || !currentTeam || currentTeam.ownerId !== user.uid) return <p className="eb-alert" role="alert">Select or create your authorized team before reviewing film. Nothing has been saved.</p>;
  return <Editor key={`${user.uid}:${currentTeam.id}`} uid={user.uid} teamId={currentTeam.id} teamName={currentTeam.name} />;
}

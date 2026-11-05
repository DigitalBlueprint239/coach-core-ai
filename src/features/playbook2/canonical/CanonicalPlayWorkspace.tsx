// Canonical v3 coach workspace. The v3 document is the only editable source of truth.
// FieldSheet is used as a visualization, never as a lossy v3 persistence adapter.
import React, { useEffect, useState } from 'react';
import { validatePlayDocV3, type OffenseRole, type PlayDocV3, type Terminology, type RunSide } from '../../../football-core';
import { FieldSheet } from '../field/FieldSheet';
import type { PlayV2 } from '../playModel';
import { isPlayConflict, loadPlayDocsV3, savePlayDocV3, type ListedPlayDocV3 } from '../playStoreV3';
import { InsideZonePanel } from '../run/InsideZonePanel';
import { insideZoneSide, withInsideZoneSide } from '../run/insideZoneDraft';
import { makeCanonicalDraft, projectV3ForField } from './canonicalProjection';
import './canonicalWorkspace.css';

type Session = {
  doc: PlayDocV3;
  id?: string;
  source: 'new' | 'v2-original' | 'v3-stored';
  dirty: boolean;
};
type Notice = { kind: 'ok' | 'error'; text: string } | null;

function initialSession(seed: PlayV2 | null | undefined, teamId: string): Session | null {
  if (!seed || seed.teamId !== teamId) return null;
  return {
    doc: makeCanonicalDraft(seed),
    source: seed.id ? 'v2-original' : 'new',
    dirty: true,
  };
}

function userMessage(error: unknown): string {
  if (isPlayConflict(error)) return error.message;
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code) : '';
  if (code === 'permission-denied') return 'Your account cannot save this team’s play. Your edits remain on this screen.';
  if (code === 'unauthenticated') return 'Sign in again before saving. Your edits remain on this screen.';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'Connection unavailable. Your edits remain on this screen.';
  return 'Could not complete that action. Your edits remain on this screen.';
}

export type CanonicalPlayWorkspaceProps = {
  teamId: string;
  uid: string;
  terminology: Terminology;
  seed?: PlayV2 | null;
  onClose(): void;
};

export const CanonicalPlayWorkspace: React.FC<CanonicalPlayWorkspaceProps> = ({ teamId, uid, terminology, seed, onClose }) => {
  const [rows, setRows] = useState<ListedPlayDocV3[]>([]);
  const [loading, setLoading] = useState(true);
  const [skipped, setSkipped] = useState(0);
  const [session, setSession] = useState<Session | null>(() => initialSession(seed, teamId));
  const [selected, setSelected] = useState<OffenseRole | undefined>();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [hasConflict, setHasConflict] = useState(false);

  const refresh = async (live: () => boolean = () => true) => {
    try {
      const result = await loadPlayDocsV3(teamId);
      if (!live()) return;
      setRows(result.plays.filter(p => p.teamId === teamId));
      setSkipped(result.skipped);
      setNotice(n => n?.kind === 'error' ? n : null);
    } catch (error) {
      if (live()) setNotice({ kind: 'error', text: userMessage(error) });
    } finally {
      if (live()) setLoading(false);
    }
  };
  useEffect(() => {
    let alive = true;
    void refresh(() => alive);
    return () => { alive = false; };
    // Refresh on the team's identity change, never on document edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const mayLeave = (): boolean =>
    !saving && (!session?.dirty || window.confirm('Leave this v3 draft? Unsaved changes will be lost.'));

  const open = (row: ListedPlayDocV3) => {
    if (!mayLeave()) return;
    const { id, sourceSchemaVersion, ...document } = row;
    setSession({
      doc: structuredClone(document),
      source: sourceSchemaVersion === 3 ? 'v3-stored' : 'v2-original',
      ...(sourceSchemaVersion === 3 ? { id } : {}),
      dirty: false,
    });
    setSelected(undefined);
    setHasConflict(false);
    setNotice(null);
  };

  const update = (change: (doc: PlayDocV3) => PlayDocV3) => {
    if (saving) return;
    setSession(prev =>
      prev?.doc.status === 'draft'
        ? { ...prev, doc: change(prev.doc), dirty: true }
        : prev,
    );
    setNotice(null);
  };

  const save = async () => {
    if (!session || saving || session.doc.status !== 'draft') return;
    if (!uid) { setNotice({ kind: 'error', text: 'Sign in before saving.' }); return; }
    if (session.doc.teamId !== teamId) { setNotice({ kind: 'error', text: 'This play belongs to another team.' }); return; }
    const invalid = validatePlayDocV3(session.doc);
    if (invalid.length) { setNotice({ kind: 'error', text: 'Play cannot be saved: ' + invalid.join(' ') }); return; }
    const sent = session;
    setSaving(true);
    setNotice(null);
    try {
      const result = await savePlayDocV3(
        sent.doc,
        uid,
        sent.source === 'v3-stored' && sent.id
          ? { id: sent.id, expectedRevision: sent.doc.revision }
          : {},
      );
      setSession(prev => prev?.doc === sent.doc
        ? {
          doc: {
            ...prev.doc,
            revision: result.revision,
            createdBy: sent.source === 'v3-stored' ? sent.doc.createdBy : uid,
          },
          id: result.id,
          source: 'v3-stored',
          dirty: false,
        }
        : prev,
      );
      setHasConflict(false);
      setNotice({ kind: 'ok', text: 'Saved v3 draft. Revision ' + result.revision + '.' });
      void refresh();
    } catch (error) {
      setHasConflict(isPlayConflict(error));
      setNotice({ kind: 'error', text: userMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const duplicate = () => {
    if (saving) return;
    setSession(prev => prev
      ? {
        doc: {
          ...structuredClone(prev.doc),
          name: prev.doc.name + ' (copy)',
          provenance: { origin: 'created' },
          revision: 1,
          status: 'draft',
        },
        source: 'new',
        dirty: true,
      }
      : prev,
    );
    setHasConflict(false);
    setNotice({ kind: 'ok', text: 'Made a separate unsaved copy. The original is unchanged.' });
  };

  const projected = session ? projectV3ForField(session.doc) : null;
  const runSide = session ? insideZoneSide(session.doc.tags) : null;
  const isReadonly = session?.doc.status === 'published';

  return (
    <section className="pb3" aria-label="Version 3 play workspace">
      <div className="pb3-header">
        <div>
          <h2>Saved plays · v3 workspace</h2>
          <p className="pb2-muted">Beta editor · research stays draft · originals are never silently rewritten</p>
        </div>
        <button type="button" className="pb2-btn" onClick={() => mayLeave() && onClose()} disabled={saving}>
          Back to playbook
        </button>
      </div>
      {notice && (
        <p role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? 'pb2-banner pb2-banner-error' : 'pb2-muted'}>
          {notice.text}
        </p>
      )}
      <div className="pb3-library" aria-label="Saved play versions">
        <h3>Team plays</h3>
        {loading ? <p>Loading plays…</p> : rows.length === 0 ? <p>No compatible saved plays found yet.</p> : (
          <ul>
            {rows.map(row => (
              <li key={row.id}>
                <button type="button" className="pb2-btn" disabled={saving} onClick={() => open(row)}>
                  Open {row.name}
                </button>
                <span className="pb2-muted">
                  {row.sourceSchemaVersion === 2 ? ' v2 · opens as a new v3 copy' : ` v3 · revision ${row.revision}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        {skipped > 0 && <p className="pb2-muted">{skipped} older or unsupported plays remain untouched.</p>}
      </div>
      {session && projected && (
        <div className="pb3-editor">
          <p className="pb2-muted">
            {session.source === 'v3-stored'
              ? `Version 3 · revision ${session.doc.revision}`
              : session.source === 'v2-original'
                ? 'Original v2 is read-only. Saving creates a separate version 3 copy.'
                : 'New unsaved v3 draft.'}
            {session.dirty ? ' · Unsaved edits' : ''}
          </p>
          {isReadonly && <p role="status">Published record is read-only here. Make a draft copy before editing.</p>}
          <div className="pb3-form">
            <label>
              Play name
              <input className="pb2-input" aria-label="Canonical play name" value={session.doc.name}
                maxLength={100} disabled={saving || isReadonly}
                onChange={e => update(doc => ({ ...doc, name: e.target.value }))} />
            </label>
            <label>
              Coaching notes
              <textarea className="pb2-input" aria-label="Canonical coaching notes" value={session.doc.notes}
                rows={3} disabled={saving || isReadonly}
                onChange={e => update(doc => ({ ...doc, notes: e.target.value }))} />
            </label>
          </div>
          <FieldSheet play={projected.play} terminology={terminology} selectedRole={selected}
            reducedMotion={false}
            onSelect={role => setSelected(prev => prev === role ? undefined : role)}
            onMovePlayer={saving || isReadonly ? undefined : (role, at) => update(doc => ({
              ...doc,
              formation: {
                ...doc.formation,
                players: doc.formation.players.map(p => p.role === role ? { ...p, at } : p),
              },
            }))}
          />
          {projected.undisplayedAssignments > 0 && (
            <p role="status" className="pb2-muted">
              {projected.undisplayedAssignments} specialized v3 assignments are preserved in the saved document
              but not drawn by this v2 field visualization. They have not been modified.
            </p>
          )}
          <details>
            <summary>Stored assignment details ({session.doc.assignments.length})</summary>
            <ul>
              {session.doc.assignments.map((a, i) => (
                <li key={i}>{a.slot}: {a.kind} — {JSON.stringify(a)}</li>
              ))}
            </ul>
          </details>
          {runSide !== null && (
            <InsideZonePanel formation={session.doc.formation} side={runSide}
              onSideChange={(side: RunSide) => update(doc => ({ ...doc, tags: withInsideZoneSide(doc.tags, side) }))} />
          )}
          <div className="pb3-actions">
            <button type="button" className="pb2-btn pb2-primary" disabled={saving || isReadonly}
              onClick={() => void save()}>
              {saving ? 'Saving…' : session.source === 'v3-stored' ? 'Save v3 revision' : 'Save new v3 copy'}
            </button>
            {(hasConflict || isReadonly) && (
              <button type="button" className="pb2-btn" disabled={saving} onClick={duplicate}>
                Save as separate draft instead
              </button>
            )}
          </div>
          <p className="pb2-muted">
            No coaching method is marked Verified here. V3 typed assignments are retained unchanged,
            and legacy v2 records are never updated by this workspace.
          </p>
        </div>
      )}
    </section>
  );
};

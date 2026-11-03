// The owner's draft queue (spec §6): approve or reject unverified library content. Behind
// REACT_APP_ENABLE_CONTENT_REVIEW (dev and preview builds only). Nothing here writes to a database: the owner
// downloads decisions.json and commits it in a reviewed PR (see src/football-core/content/README.md).
import React, { useMemo, useState } from 'react';
import { applyConcept, committedDecisions, draftQueue, fullLibrary } from '../../../football-core';
import type { ContentDecision, DraftItem, Library } from '../../../football-core';
import { MiniDiagram } from '../field/MiniDiagram';
import '../theme.css';

export type ContentReviewProps = {
  reviewer: string;
  queue?: DraftItem[];
  /** Decisions already committed; defaults to content/decisions.json. */
  existing?: ContentDecision[];
  library?: Library;
  /** Receives decisions.json text; defaults to a file download. */
  onDownload?(json: string): void;
};

const KIND_NAME: Record<DraftItem['kind'], string> = {
  formation: 'Formation', concept: 'Play', front: 'Front', coverage: 'Coverage', matchup: 'What beats what',
};

const today = () => new Date().toISOString().slice(0, 10);

function downloadFile(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'decisions.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ContentReview: React.FC<ContentReviewProps> = ({ reviewer, queue, existing, library, onDownload = downloadFile }) => {
  const lib = useMemo(() => library ?? fullLibrary(), [library]);
  const items = useMemo(() => queue ?? draftQueue(lib), [queue, lib]);
  const committed = useMemo(() => existing ?? committedDecisions(), [existing]);
  const [made, setMade] = useState<ContentDecision[]>([]);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const key = (d: { kind: string; id: string }) => `${d.kind}|${d.id}`;
  const decided = new Set(made.map(key));
  const pending = items.filter(i => !decided.has(key(i)));

  const decide = (item: DraftItem, decision: 'approve' | 'reject', why?: string) => {
    const d: ContentDecision = { kind: item.kind, id: item.id, decision, reviewer: reviewer.trim() || 'Owner', date: today() };
    if (why) d.reason = why;
    setMade(m => [...m, d]);
    setRejecting(null);
    setReason('');
  };

  const nameOf = (d: ContentDecision) => items.find(i => key(i) === key(d))?.name ?? d.id;

  const visual = (item: DraftItem) => {
    if (item.kind === 'formation') {
      const f = lib.formations.find(x => x.id === item.id);
      return f ? <MiniDiagram formation={f} label={`${f.name} formation`} /> : null;
    }
    if (item.kind === 'concept') {
      const c = lib.concepts.find(x => x.id === item.id);
      if (!c) return null;
      for (const f of lib.formations) {
        const applied = applyConcept(c, f);
        if (applied.ok) return <MiniDiagram formation={f} routes={applied.routes.map(r => r.points)} label={`${c.name} from ${f.name}`} />;
      }
      return <p className="pb2-muted">No formation in the library can run it yet.</p>;
    }
    if (item.kind === 'matchup') {
      const m = lib.matchups.find(x => `${x.concept}:${x.beats}` === item.id);
      return m ? (
        <p className="pb2-review-claim">
          <span className="pb2-muted">Claim: </span>
          {m.reason} <span className="pb2-muted">(stresses the {m.stressedDefender.toLowerCase()})</span>
        </p>
      ) : null;
    }
    return null;
  };

  return (
    <div className="pb2 pb2-review">
      <div className="pb2-library-head">
        <div>
          <h2 className="pb2-library-title">Content review</h2>
          <p className="pb2-muted">
            Drafts never reach coaches. Approve or reject each one, then download the decisions and commit them.
          </p>
        </div>
        <button
          type="button"
          className="pb2-btn pb2-primary"
          data-primary="true"
          disabled={made.length === 0}
          onClick={() => onDownload(`${JSON.stringify({ decisions: [...committed, ...made] }, null, 2)}\n`)}
        >
          Download decisions
        </button>
      </div>

      {made.length > 0 && (
        <section className="pb2-review-log" aria-label="This session">
          <ul aria-label="Decisions this session">
            {made.map(d => (
              <li key={key(d)}>
                <strong>{d.decision === 'approve' ? 'Approved' : 'Rejected'}</strong> {nameOf(d)}
                {d.reason && <span className="pb2-muted"> — {d.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length === 0 ? (
        <p className="pb2-empty-text pb2-library-empty">Nothing waiting for review.</p>
      ) : (
        <div className="pb2-cards">
          {pending.map(item => {
            const k = key(item);
            return (
              <article key={k} className="pb2-card">
                {visual(item)}
                <div className="pb2-card-body">
                  <p className="pb2-card-meta">{KIND_NAME[item.kind]}</p>
                  <h3 className="pb2-card-title">{item.name}</h3>
                  <p className="pb2-review-note">{item.verification.note}</p>
                  {item.verification.sources.length > 0 ? (
                    <ul className="pb2-review-sources" aria-label="Sources found">
                      {item.verification.sources.map(s => (
                        <li key={s.url}>
                          <a href={s.url} target="_blank" rel="noopener noreferrer">
                            {s.title}
                          </a>{' '}
                          <span className="pb2-muted">({s.publisher})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="pb2-muted">No qualifying sources found yet.</p>
                  )}
                  {rejecting === k ? (
                    <div className="pb2-review-reject">
                      <label className="pb2-field">
                        <span>Reason for rejecting</span>
                        <input className="pb2-input" value={reason} maxLength={200} onChange={e => setReason(e.target.value)} />
                      </label>
                      <div className="pb2-card-actions">
                        <button type="button" className="pb2-btn pb2-quiet" onClick={() => setRejecting(null)}>
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="pb2-btn pb2-strong"
                          disabled={!reason.trim()}
                          onClick={() => decide(item, 'reject', reason.trim())}
                        >
                          Confirm reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pb2-card-actions">
                      <button type="button" className="pb2-btn pb2-strong" onClick={() => decide(item, 'approve')}>
                        Approve
                      </button>
                      <button
                        type="button"
                        className="pb2-btn"
                        onClick={() => {
                          setRejecting(k);
                          setReason('');
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ContentReview;

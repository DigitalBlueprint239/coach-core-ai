import React, { useMemo } from 'react';
import { resolveInsideZone, type Formation, type RunSide } from '../../../football-core';

export type InsideZonePanelProps = {
  formation: Formation;
  side: RunSide;
  onSideChange(side: RunSide): void;
  readOnly?: boolean;
};

/**
 * Read-only presentation of the existing deterministic research-stage run-game resolver.
 * Never changes a coach's formation, football assignments, or a production rule profile.
 */
export const InsideZonePanel: React.FC<InsideZonePanelProps> = ({ formation, side, onSideChange, readOnly = false }) => {
  const result = useMemo(() => resolveInsideZone(formation, side), [formation, side]);
  return (
    <section className="pb2-inside-zone" aria-label="Inside Zone research preview">
      <h3>Inside Zone · research preview</h3>
      <p className="pb2-muted">
        Draft covered/uncovered coaching convention, not verified coaching advice, official legality,
        a prediction of yards, or a change to your saved player assignments.
      </p>
      <div role="group" aria-label="Run direction">
        <button type="button" className="pb2-btn" disabled={readOnly} aria-pressed={side === 'strong'} onClick={() => onSideChange('strong')}>Strong side</button>
        <button type="button" className="pb2-btn" aria-pressed={side === 'weak'} onClick={() => onSideChange('weak')}>Weak side</button>
      </div>
      {result.status === 'ok' ? (
        <>
          <p><strong>Modelled front:</strong> 4-3 Over · {side} side</p>
          <h4>Proposed offensive-line responsibilities</h4>
          <ul>
            {result.value.blocks.map(block => (
              <li key={block.blocker}>
                <strong>{block.blocker}:</strong> {block.rationale}
              </li>
            ))}
          </ul>
          <h4>Defenders not assigned to an offensive lineman</h4>
          {result.value.unblocked.length ? (
            <ul>{result.value.unblocked.map(item => (
              <li key={item.defender}><strong>{item.defender}:</strong> {item.reason}</li>
            ))}</ul>
          ) : <p>None under this particular convention.</p>}
          <p><strong>Runner:</strong> {result.value.runner.role} · guard outside hip, press-and-cut.</p>
          <details>
            <summary>Illustrative teaching sequence</summary>
            <ol>{result.value.timeline.map(item => <li key={item.event}>{item.detail}</li>)}</ol>
            <p className="pb2-muted">The sequence is illustrative, not measured player tracking.</p>
          </details>
          {result.findings.length > 0 && (
            <div role="status">
              <h4>Unresolved coaching decisions</h4>
              <ul>{result.findings.map(item => (
                <li key={item.code + item.message}>{item.message}</li>
              ))}</ul>
            </div>
          )}
        </>
      ) : (
        <p role="status">Not modelled for this formation: {result.reason} No assignments have been guessed.</p>
      )}
    </section>
  );
};

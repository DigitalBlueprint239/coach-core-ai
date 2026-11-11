// A one-page play card for printing (or "Save as PDF" in the browser's print dialog). It is built from the same
// stored document and the same field component as the editor, so the paper matches the screen.
import React from 'react';
import { describeAssignment, type PlayDocV4 } from '../../../football-core';
import { FieldSheetV4 } from './FieldSheetV4';

export const PlayCard: React.FC<{ play: PlayDocV4; teamName: string }> = ({ play, teamName }) => {
  const rows = play.players
    .map(p => ({ player: p, jobs: play.assignments.filter(a => a.playerId === p.id) }))
    .filter(r => r.jobs.length > 0);
  return (
    <article className="pb4-card" aria-label={`Play card: ${play.name}`}>
      <header className="pb4-card-head">
        <h2 className="pb4-card-title">{play.name}</h2>
        <p className="pb4-card-meta">
          {teamName} · {play.formation.name} · {play.formation.personnel} personnel · strength {play.formation.strength}
          {play.defense?.coverageId ? ` · vs ${play.defense.coverageId.replace('-', ' ')}` : ''}
        </p>
      </header>
      <FieldSheetV4 play={play} readOnly />
      <table className="pb4-card-table">
        <caption>Assignments</caption>
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col">Assignment</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={2}>No assignments yet.</td>
            </tr>
          )}
          {rows.map(({ player, jobs }) => (
            <tr key={player.id}>
              <th scope="row">{player.label ?? player.role}</th>
              <td>{jobs.map(describeAssignment).join('; ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {play.read.length > 0 && (
        <section>
          <h3 className="pb4-card-sub">Quarterback read</h3>
          <ol className="pb4-card-read">
            {play.read.map((step, i) => (
              <li key={i}>{step.text}</li>
            ))}
          </ol>
        </section>
      )}
      {play.notes.trim() && (
        <section>
          <h3 className="pb4-card-sub">Coaching notes</h3>
          <p className="pb4-card-notes">{play.notes}</p>
        </section>
      )}
      {play.tags.length > 0 && <p className="pb4-card-meta">Tags: {play.tags.join(', ')}</p>}
    </article>
  );
};

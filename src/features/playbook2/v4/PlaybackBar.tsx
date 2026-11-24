// Play / pause / scrub for the shared timeline. It only reports a time; it never edits the play.
import React, { useEffect, useRef, useState } from 'react';
import type { PlayTimeline } from '../../../football-core';

export type PlaybackBarProps = {
  timeline: PlayTimeline;
  /** Seconds after the snap, or null when the coach is editing. */
  time: number | null;
  onTime(time: number | null): void;
};

export const PlaybackBar: React.FC<PlaybackBarProps> = ({ timeline, time, onTime }) => {
  const [playing, setPlaying] = useState(false);
  const report = useRef(onTime);
  report.current = onTime;
  const from = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let started: number | null = null;
    const tick = (now: number) => {
      started ??= now;
      const t = from.current + (now - started) / 1000;
      report.current(Math.min(t, timeline.duration));
      if (t >= timeline.duration) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, timeline]);

  // Leaving playback (or editing the play) stops it.
  useEffect(() => {
    if (time === null) setPlaying(false);
  }, [time]);

  if (timeline.duration === 0) return null;
  const start = () => {
    from.current = time === null || time >= timeline.duration ? 0 : time;
    report.current(from.current);
    setPlaying(true);
  };
  return (
    <div className="pb4-inline pb4-playback" role="group" aria-label="Playback">
      <button type="button" className="pb2-btn" onClick={playing ? () => setPlaying(false) : start}>{playing ? 'Pause' : 'Play'}</button>
      <input
        type="range"
        aria-label="Playback position"
        min={0}
        max={timeline.duration}
        step="any"
        value={time ?? 0}
        onChange={e => { setPlaying(false); onTime(Number(e.target.value)); }}
      />
      {time !== null && <button type="button" className="pb2-btn" onClick={() => onTime(null)}>Back to editing</button>}
      <span className="pb2-muted">Same speed for every player; not real timing.</span>
    </div>
  );
};

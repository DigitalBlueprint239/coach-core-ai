import React, { useEffect, useRef, useState } from 'react';
import AppShell from '../../../ui/AppShell';
import sample from './sample.json';
import { Mark, RECORD_KEY, clearVerified, decode, emptyMark, validMark, writeVerified } from './localRecord';
import './film-demo.css';

export default function FilmDemoApp() {
  const video = useRef<HTMLVideoElement>(null);
  const [media, setMedia] = useState('');
  const [ready, setReady] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mark, setMark] = useState<Mark>(emptyMark);
  const [clock, setClock] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState('Not saved — changes stay in this session until you save.');
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState('');
  const stopAtEnd = useRef(false);
  const [pendingRecord, setPendingRecord] = useState<Mark | null>(null);

  useEffect(() => {
    let alive = true; let objectUrl = '';
    (async () => {
      if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) || navigator.serviceWorker?.controller) {
        throw new Error('Run this isolated demo on localhost without a service worker.');
      }
      const mime = video.current?.canPlayType('video/mp4; codecs="avc1.42E01E"') ? 'video/mp4' : 'video/webm';
      const file = sample.files.find(f => f.name.endsWith(mime === 'video/mp4' ? '.mp4' : '.webm'))!;
      const response = await fetch(`/film-a0/${file.name}`, { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('Synthetic sample could not be loaded.');
      const bytes = await response.arrayBuffer();
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(b => b.toString(16).padStart(2, '0')).join('');
      if (bytes.byteLength !== file.bytes || digest !== file.sha256) throw new Error('Sample identity check failed. Playback and saving are blocked.');
      if (!alive) return;
      objectUrl = URL.createObjectURL(new Blob([bytes], { type: mime })); setMedia(objectUrl);
    })().catch(error => { if (alive) setMediaError(error.message || 'Sample verification failed.'); });
    return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, []);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECORD_KEY);
      if (raw !== null) {
        setPendingRecord(decode(raw));
        setStatus('Stored record found — verifying the sample before reopening…');
      }
    } catch {
      setSaved(false); setStatus('Not saved — local storage is unavailable or the record could not be verified. You can still work in this session.');
    }
    const changed = (event: StorageEvent) => {
      if (event.key === RECORD_KEY || event.key === null) {
        setPendingRecord(null); setSaved(false);
        setStatus('Not saved — local storage changed in another tab. Your session edits are kept; reload to reopen the stored record.');
      }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  // Manifest identity alone does not establish that the media actually loaded.
  // Keep the persisted cue out of the editor until bytes AND duration are verified.
  useEffect(() => {
    if (!pendingRecord) return;
    if (mediaError) {
      setSaved(false);
      setStatus('Stored record not verified — it cannot be reopened because the sample failed verification. The stored record is unchanged.');
    } else if (ready) {
      setMark(pendingRecord); setPendingRecord(null); setSaved(true);
      setStatus('Saved in this browser — reopened and checked against this sample.');
    }
  }, [pendingRecord, ready, mediaError]);
  function edit(patch: Partial<Mark>) {
    setMark(current => ({ ...current, ...patch })); setSaved(false); setPendingRecord(null);
    setStatus('Not saved — session edits have not been confirmed in local storage.');
  }
  function save() {
    setSaved(false); setPendingRecord(null);
    try {
      if (!ready || mediaError) throw new Error('Sample is not ready.');
      writeVerified(mark); setSaved(true);
      setStatus('Saved in this browser — write and readback verified. Not saved to a team or cloud account.');
    } catch {
      setStatus('Not saved — local storage or readback failed. Your interval and note remain in this session.');
    }
  }
  function reset() {
    setSaved(false); setPendingRecord(null);
    try {
      clearVerified(); setMark(emptyMark()); stopAtEnd.current = false;
      if (video.current) { video.current.pause(); video.current.currentTime = 0; }
      setStatus('Reset confirmed in this browser. No saved interval or note remains for this sample.');
    } catch {
      setStatus('Not saved — reset could not be confirmed. Your session edits are kept; the old record may still exist.');
    }
  }
  function seek(seconds: number) {
    if (!video.current || !ready) return;
    stopAtEnd.current = false; video.current.currentTime = Math.max(0, Math.min(sample.durationMs / 1000, seconds));
    setClock(video.current.currentTime);
  }
  async function play(interval = false) {
    if (!video.current || !ready) return;
    stopAtEnd.current = interval;
    if (interval) video.current.currentTime = mark.startMs / 1000;
    try { await video.current.play(); } catch { setNotice('Playback did not start. Use Play again after the sample is ready.'); }
  }
  const good = validMark(mark);
  const verifiedSaved = saved && ready && !mediaError;
  const visibleStatus = saved && !verifiedSaved
    ? 'Stored record not verified — the sample is unavailable. No verified reopen is claimed.'
    : status;
  return <div className="film-a0"><AppShell active="overview" onNavigate={() => setNotice('This isolated A0 demo contains Film only. Core destinations are unchanged in the accepted app.')} email="coach@demo.invalid" teamName="Synthetic Football Lab" standalone samplePreview>
    <div className="film-demo-wrap">
      <p className="film-eyebrow">LOCAL SYNTHETIC DEMO · NO ACCOUNT CONNECTED</p>
      <h1>Film review</h1>
      <p className="film-intro">Watch one out route. Mark the break, add a coaching cue, then reopen it. No real footage, uploads, cloud saves or AI.</p>
      <p className="film-boundary">The sample-preview badge means no team data is saved. Your interval and note can be saved <strong>in this browser only</strong>. Clearing site data removes them.</p>
      {notice && <p role="status" className="film-notice">{notice}</p>}
      <div className="film-demo-grid">
        <section className="film-card" aria-label="Synthetic film player">
          <div className="film-card-heading"><h2>Out route · 8 seconds</h2><span>Synthetic diagram</span></div>
          <video ref={video} src={media || undefined} preload="auto" playsInline aria-label="Synthetic out-route diagram"
            onLoadedMetadata={() => {
              const duration = video.current?.duration ?? 0;
              if (!Number.isFinite(duration) || Math.abs(duration - sample.durationMs / 1000) > 0.12) { setReady(false); setMediaError('Sample duration mismatch. Playback and saving are blocked.'); }
              else setReady(true);
            }} onError={() => { setReady(false); setMediaError('This browser could not play the verified sample. No successful playback is claimed.'); }}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); stopAtEnd.current = false; }}
            onTimeUpdate={() => {
              const v = video.current; if (!v) return; setClock(v.currentTime);
              if (stopAtEnd.current && v.currentTime >= mark.endMs / 1000) { v.pause(); v.currentTime = mark.endMs / 1000; stopAtEnd.current = false; }
            }} />
          {mediaError ? <p role="alert">{mediaError}</p> : <p className="film-caption">{ready ? 'Sample bytes and duration verified. Illustration only; not an actual game or a coaching accuracy claim.' : 'Verifying the allowlisted synthetic sample…'}</p>}
          <div className="film-controls">
            <button disabled={!ready} onClick={() => { if (playing) video.current?.pause(); else void play(); }}>{playing ? 'Pause' : 'Play'}</button>
            <button disabled={!ready || !good} onClick={() => void play(true)}>Replay interval</button>
            <label>Speed<select aria-label="Playback speed" value={speed} onChange={e => { const next = Number(e.target.value); setSpeed(next); if (video.current) video.current.playbackRate = next; }}>
              <option value="0.5">0.5×</option><option value="1">1×</option><option value="1.5">1.5×</option><option value="2">2×</option>
            </select></label>
          </div>
          <label className="film-seek">Seek <output>{clock.toFixed(1)} / 8.0 seconds</output><input aria-label="Seek video" type="range" min="0" max="8" step="0.05" value={clock} disabled={!ready} onChange={e => seek(Number(e.target.value))} /></label>
          <p className="film-task">Try marking <strong>3.5–6.0 seconds</strong>, then label it “Out route” and add “Break toward the sideline.” Marks point into this video; they do not create a new clip.</p>
        </section>
        <section className="film-card" aria-label="Coaching interval">
          <h2>Your coaching cue</h2>
          <div className="film-times">
            <label>Start (seconds)<input aria-label="Interval start seconds" type="number" min="0" max="8" step="0.05" value={Number.isFinite(mark.startMs) ? mark.startMs / 1000 : ''} onChange={e => edit({ startMs: e.target.value === '' ? NaN : Math.round(Number(e.target.value) * 1000) })} /></label>
            <label>End (seconds)<input aria-label="Interval end seconds" type="number" min="0" max="8" step="0.05" value={Number.isFinite(mark.endMs) ? mark.endMs / 1000 : ''} onChange={e => edit({ endMs: e.target.value === '' ? NaN : Math.round(Number(e.target.value) * 1000) })} /></label>
          </div>
          <div className="film-controls"><button disabled={!ready} onClick={() => edit({ startMs: Math.round((video.current?.currentTime ?? 0) * 1000) })}>Mark start here</button><button disabled={!ready} onClick={() => edit({ endMs: Math.round((video.current?.currentTime ?? 0) * 1000) })}>Mark end here</button></div>
          <label>Label<input aria-label="Coaching label" maxLength={80} value={mark.label} onChange={e => edit({ label: e.target.value })} placeholder="e.g. Out route" /></label>
          <label>Note<textarea aria-label="Coaching note" maxLength={2000} rows={4} value={mark.note} onChange={e => edit({ note: e.target.value })} placeholder="What should the coach or player notice?" /></label>
          {!good && <p className="film-validation">Use a label and an interval with 0 ≤ start &lt; end ≤ 8 seconds.</p>}
          <div className="film-controls"><button className="film-primary" disabled={!ready || !good || !!mediaError} onClick={save}>Save in this browser</button><button onClick={reset}>Reset local demo</button></div>
          <p role="status" data-testid="save-status" className={verifiedSaved ? 'film-saved' : 'film-unsaved'}>{visibleStatus}</p>
        </section>
      </div>
      <footer className="film-footer">A0 only · Original synthetic route diagram · No athlete data · No cloud connection · No cross-device persistence · Beta release not approved</footer>
    </div>
  </AppShell></div>;
}

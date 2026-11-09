import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { SCENARIOS } from './fixtures/plays';
import { projectPlays } from './model/adapter';
import { getProfile } from './model/profiles';
import { RULESETS, type Ruleset } from './model/field';
import { createWorkspace, fingerprint, isDirty, movePlayer, revert, type Workspace } from './model/workspace';
import type { CanonicalScene, StoredPoint } from './model/types';
import { Vector3 } from 'three';
import { matchedOverheadPose, TIMING } from './view/camera';
import { yardsToWorld } from './model/field';
import {
  controlsEnabled, initialViewState, is3dSide, shows3d, viewReducer, type CameraPreset, type ViewEvent,
} from './view/viewMachine';
import { Field2D } from './render2d/Field2D';
import { describeYards, routePoints } from './render2d/paint2d';
import { canCreateWebGL, Scene3D, type SceneHandle } from './render3d/Scene3D';
import { metrics, tagLayout, writeLog } from './debug';

const PRESETS: { id: CameraPreset; label: string; key: string }[] = [
  { id: 'tactical', label: 'Tactical', key: '1' },
  { id: 'overhead', label: 'Overhead', key: '2' },
  { id: 'sideline', label: 'Sideline', key: '3' },
  { id: 'defense', label: 'Defense', key: '4' },
];

const params = new URLSearchParams(window.location.search);
const initialScenario = SCENARIOS.find(s => s.id === params.get('scenario')) ?? SCENARIOS[0];
const PREWARM = params.get('prewarm') !== '0';
/** Verification aid: pause on the matched overhead state until __sp3d.release(). */
const HOLD_MATCHED = params.get('hold') === '1';
const GL_AVAILABLE = canCreateWebGL();

function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export function App() {
  const [scenario, setScenario] = useState(initialScenario);
  const [ws, setWs] = useState<Workspace>(() => createWorkspace(initialScenario.envelopes));
  const [view, rawDispatch] = useReducer(viewReducer, initialViewState);
  const [ruleset, setRuleset] = useState<Ruleset>('HS');
  const [ballOn, setBallOn] = useState(35);
  const systemReduced = useSystemReducedMotion();
  const [motionPref, setMotionPref] = useState<'system' | 'reduce'>('system');
  const reducedMotion = systemReduced || motionPref === 'reduce';
  const [mount3d, setMount3d] = useState(false);
  const baselineFp = useMemo(() => fingerprint(ws.baseline), [ws.baseline]);
  const draftFp = useMemo(() => fingerprint(ws.draft), [ws.draft]);

  const result = useMemo(() => projectPlays(ws.draft), [ws.draft]);
  const scene: CanonicalScene | null = result.status === 'unverified' ? null : result;
  const profile3d = scene ? getProfile(scene.profileIds[0]) : null;
  // 2D draws a football field only for verified geometry; legacy plays keep their raw-pixel view.
  const fieldProfile = scene && scene.status === 'verified' && scene.profileIds.length === 1 ? profile3d : null;
  const matched = useMemo(() => (profile3d ? matchedOverheadPose(profile3d) : null), [profile3d]);

  const handle = useRef<SceneHandle>({ gl: null, camera: null, rig: { current: null } }).current;
  const lift = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timing = useRef<{ kind: 'enter' | 'exit'; start: number; ready: number | null; warm: boolean } | null>(null);
  const warm = useRef(false);
  const mountedRef = useRef(false);
  mountedRef.current = mount3d;
  const [announce, setAnnounce] = useState('');
  // The stage is sized to an even whole-pixel width so the 2D canvas and the integer-sized
  // WebGL canvas share exactly the same 2:1 box (fractional boxes drift by up to ~1 px).
  const frameRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState<number | null>(null);
  useEffect(() => {
    const el = frameRef.current!;
    const measure = () => setStageW(Math.max(2, Math.floor(el.clientWidth / 2) * 2));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const phaseRef = useRef(view.phase);
  phaseRef.current = view.phase;

  const dispatch = useCallback((e: ViewEvent) => {
    const now = performance.now();
    if (e.type === 'REQUEST_3D' && phaseRef.current === '2d' && e.canRender3d && e.geometryAvailable) {
      // Warm = a GL context already exists and has drawn (prewarm or an earlier visit).
      timing.current = { kind: 'enter', start: now, ready: null, warm: warm.current || mountedRef.current };
      performance.mark('sp3d:request-3d');
      setMount3d(true);
    }
    if (e.type === 'REQUEST_2D' && is3dSide(phaseRef.current)) {
      timing.current = { kind: 'exit', start: now, ready: null, warm: true };
      performance.mark('sp3d:request-2d');
    }
    if (e.type === 'SCENE_READY' && timing.current?.kind === 'enter') {
      timing.current.ready = now - timing.current.start;
      warm.current = true;
      performance.mark('sp3d:matched-ready');
    }
    if (e.type === 'LIFT_DONE' && timing.current?.kind === 'enter') {
      metrics.push({ kind: 'enter', warm: timing.current.warm, reducedMotion, readyMs: timing.current.ready, totalMs: now - timing.current.start });
      timing.current = null;
      performance.mark('sp3d:interactive');
    }
    if (e.type === 'HANDOFF_DONE' && phaseRef.current === 'handoff-out' && timing.current?.kind === 'exit') {
      const ms = now - timing.current.start;
      metrics.push({ kind: 'exit', warm: true, reducedMotion, readyMs: ms, totalMs: ms });
      timing.current = null;
    }
    rawDispatch(e);
  }, [reducedMotion]);

  const request3d = useCallback(() => dispatch({ type: 'REQUEST_3D', canRender3d: GL_AVAILABLE, geometryAvailable: !!scene }), [dispatch, scene]);
  const request2d = useCallback(() => dispatch({ type: 'REQUEST_2D' }), [dispatch]);

  // Background prewarm so the first transition does not pay context + shader cost.
  useEffect(() => {
    if (!PREWARM || !GL_AVAILABLE || !scene || mount3d) return;
    const id = (window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 400)))(() => setMount3d(true), { timeout: 1500 });
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, [scene, mount3d]);

  // Crossfade timers (the camera rig drives lift/lower; CSS drives opacity).
  useEffect(() => {
    if (view.phase !== 'handoff-in' && view.phase !== 'handoff-out') return;
    if (HOLD_MATCHED && view.phase === 'handoff-in') return;
    const t = window.setTimeout(() => dispatch({ type: 'HANDOFF_DONE' }), reducedMotion ? TIMING.reducedFadeMs : TIMING.handoffMs);
    return () => window.clearTimeout(t);
  }, [view.phase, reducedMotion, dispatch]);

  // Focus and announcements.
  useEffect(() => {
    if (view.phase === '3d') { setAnnounce('3D tactical view. Drag to orbit, scroll or pinch to zoom, arrow keys to orbit, Escape to return to 2D.'); stageRef.current?.focus({ preventScroll: true }); }
    if (view.phase === '2d' && view.roundTrips > 0) { setAnnounce('2D diagram restored. Play unchanged.'); toggleRef.current?.focus({ preventScroll: true }); }
  }, [view.phase, view.roundTrips]);

  const changeScenario = (id: string) => {
    const next = SCENARIOS.find(s => s.id === id)!;
    if (is3dSide(view.phase)) return;
    setScenario(next);
    setWs(createWorkspace(next.envelopes));
    dispatch({ type: 'RESET_SCENARIO' });
  };

  const editable = view.phase === '2d';
  const onMove = useCallback((playKey: string, playerId: string, to: StoredPoint) => {
    if (phaseRef.current !== '2d') return;
    setWs(w => movePlayer(w, playKey, playerId, to));
  }, []);

  const selected = useMemo(() => {
    if (!view.selectedUid) return null;
    for (const env of ws.draft) {
      const p = env.play.players.find(x => `${env.key}/${x.id}` === view.selectedUid);
      if (p) return { env, p, routes: env.play.routes.filter(r => r.playerId === p.id) };
    }
    return null;
  }, [view.selectedUid, ws.draft]);

  // Keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const phase = phaseRef.current;
      if (e.key === 'Escape' && is3dSide(phase)) { e.preventDefault(); request2d(); return; }
      if (e.key === 'v' || e.key === 'V') { e.preventDefault(); if (phase === '2d') request3d(); else request2d(); return; }
      const preset = PRESETS.find(p => p.key === e.key);
      if (preset && phase === '3d') { e.preventDefault(); dispatch({ type: 'SET_PRESET', preset: preset.id }); return; }
      const onStage = document.activeElement === stageRef.current;
      if (!onStage) return;
      if (phase === '3d') {
        const rig = handle.rig.current;
        const map: Record<string, [number, number, number]> = {
          ArrowLeft: [-0.18, 0, 1], ArrowRight: [0.18, 0, 1], ArrowUp: [0, -0.1, 1], ArrowDown: [0, 0.1, 1],
          '+': [0, 0, 0.85], '=': [0, 0, 0.85], '-': [0, 0, 1.18],
        };
        if (map[e.key] && rig) { e.preventDefault(); rig.nudge(...map[e.key]); }
      } else if (phase === '2d' && selected) {
        const step = e.shiftKey ? 1 : 10;
        const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (d[e.key]) { e.preventDefault(); onMove(selected.env.key, selected.p.id, { x: selected.p.x + d[e.key][0], y: selected.p.y + d[e.key][1] }); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, request2d, request3d, handle, selected, onMove]);

  // Verification hook (read-only views of state; no way to write play data through it).
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__sp3d = {
      phase: () => phaseRef.current,
      view: () => view,
      fingerprint: () => fingerprint(ws.draft),
      baselineFingerprint: () => baselineFp,
      draftJson: () => JSON.stringify(ws.draft),
      sceneStatus: () => result.status,
      scenePlayers: () => (scene ? scene.players.map(p => ({ uid: p.uid, id: p.id, xYd: p.xYd, yYd: p.yYd })) : []),
      metrics: () => metrics.slice(),
      tagLayout: () => ({ compact: tagLayout.compact, entries: tagLayout.entries.slice() }),
      writes: () => writeLog.slice(),
      rendererInfo: () => {
        const gl = handle.gl;
        if (!gl) return null;
        const ctx = gl.getContext();
        const dbg = ctx.getExtension('WEBGL_debug_renderer_info');
        return {
          geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? null,
          renderer: dbg ? ctx.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : ctx.getParameter(ctx.RENDERER),
          webgl2: typeof WebGL2RenderingContext !== 'undefined' && ctx instanceof WebGL2RenderingContext,
          pixelRatio: gl.getPixelRatio(),
        };
      },
      loseContext: () => handle.gl?.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
      benchmark: (ms: number) => handle.rig.current?.benchmark(ms) ?? Promise.resolve([]),
      pose: () => handle.rig.current?.getPose() ?? null,
      animating: () => handle.rig.current?.isAnimating() ?? false,
      /** Where a ground point (yards) lands on the 3D canvas, in CSS px relative to the canvas. */
      projectYards: (xYd: number, yYd: number) => {
        const gl = handle.gl, cam = handle.camera;
        if (!gl || !cam) return null;
        cam.updateMatrixWorld();
        const v = new Vector3(...yardsToWorld(xYd, yYd)).project(cam);
        const r = gl.domElement.getBoundingClientRect();
        return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height, w: r.width, h: r.height };
      },
      /** Where a player's ground anchor lands on the 3D canvas. */
      projectToScreen: (uid: string) => {
        const p = scene?.players.find(x => x.uid === uid);
        return p ? (window as unknown as { __sp3d: { projectYards(x: number, y: number): unknown } }).__sp3d.projectYards(p.xYd, p.yYd) : null;
      },
      routes: () => (scene ? scene.routes.map(r => ({ id: r.id, sourceKey: r.sourceKey, points: r.points })) : []),
      release: () => { if (phaseRef.current === 'handoff-in') dispatch({ type: 'HANDOFF_DONE' }); },
      glAvailable: () => GL_AVAILABLE,
    };
  });

  const status = result.status;
  const dirty = isDirty(ws);
  const phaseLabel = { '2d': '2D DIAGRAM', preparing: 'PREPARING 3D', 'handoff-in': 'ALIGNING', lifting: 'CAMERA LIFT', '3d': '3D TACTICAL', lowering: 'RETURNING', 'handoff-out': 'ALIGNING' }[view.phase];
  const offense = scene?.players.filter(p => p.side === 'offense') ?? [];
  const defense = scene?.players.filter(p => p.side === 'defense') ?? [];
  const rosterRaw = !scene ? ws.draft.flatMap(env => env.play.players.map(p => ({ uid: `${env.key}/${p.id}`, label: p.position ?? p.id, number: p.number }))) : [];

  return (
    <div className="app" data-phase={view.phase} data-reduced-motion={reducedMotion ? 'true' : 'false'}>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">COACH CORE</span>
          <span className="brand-sub">SMART PLAYBOOK</span>
        </div>
        <span className="experiment-chip" data-testid="experiment-chip">EXPERIMENT ONLY · CC-SP3D-002 · NOT FOR PRODUCTION</span>
        <div className="topbar-controls">
          <label className="field">
            <span>Play</span>
            <select data-testid="scenario" value={scenario.id} disabled={is3dSide(view.phase)} onChange={e => changeScenario(e.target.value)}>
              {SCENARIOS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Rules</span>
            <select data-testid="ruleset" value={ruleset} onChange={e => setRuleset(e.target.value as Ruleset)}>
              {Object.values(RULESETS).map(r => <option key={r.id} value={r.id}>{r.id}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Ball on <em>(view)</em></span>
            <select value={ballOn} onChange={e => setBallOn(Number(e.target.value))}>
              {[20, 25, 30, 35, 40, 45, 50].map(n => <option key={n} value={n}>Own {n}</option>)}
            </select>
          </label>
        </div>
      </header>

      <main className="layout">
        <section className="stage-col" aria-label="Play view">
          <div className="play-head">
            <div className="play-title">
              <span className="slant">{scenario.label.toUpperCase()}</span>
              <span className="play-detail">{scenario.detail}</span>
            </div>
            <span className={`geo-badge geo-${status}`} data-testid="geometry-status">
              {status === 'verified' ? 'GEOMETRY VERIFIED' : status === 'classified' ? 'ALIGNMENT CLASSIFIED · NOT COACH-VERIFIED' : 'ALIGNMENT UNVERIFIED'}
            </span>
          </div>

          <div ref={frameRef} className="stage-frame">
          <div ref={stageRef} className="stage" tabIndex={0} data-testid="stage"
            style={stageW ? { width: stageW, height: stageW / 2 } : undefined}
            aria-label={view.phase === '3d' ? '3D field. Arrow keys orbit, plus and minus zoom, 1 to 4 camera presets, Escape returns to 2D.' : 'Play diagram'}>
            {mount3d && scene && matched && (
              <div className="layer3d" data-testid="layer-3d" data-visible={shows3d(view.phase) ? 'true' : 'false'} data-controls={controlsEnabled(view.phase) ? 'on' : 'off'}>
                <Scene3D
                  key={view.sceneEpoch}
                  scene={scene} phase={view.phase} preset={view.preset} presetRequest={view.presetRequest} matched={matched} reducedMotion={reducedMotion}
                  ruleset={ruleset} ballOn={ballOn} selectedUid={view.selectedUid} lift={lift} handle={handle}
                  onSelect={uid => dispatch({ type: 'SELECT', uid })}
                  onReady={() => dispatch({ type: 'SCENE_READY' })}
                  onLiftDone={() => dispatch({ type: 'LIFT_DONE' })}
                  onLowerDone={() => dispatch({ type: 'LOWER_DONE' })}
                  onContextLost={() => { warm.current = false; setMount3d(false); dispatch({ type: 'CONTEXT_LOST' }); }}
                  onError={reason => { setMount3d(false); dispatch({ type: 'WEBGL_FAILED', reason }); }}
                />
              </div>
            )}
            <div className="layer2d" data-testid="layer-2d">
              <Field2D
                envelopes={ws.draft} fieldProfile={fieldProfile}
                rawModeLabel={status === 'classified' ? 'LEGACY 2D · RAW STORED PIXELS · 3D USES A CLASSIFIED INTERPRETATION' : 'LEGACY 2D · RAW STORED PIXELS · COORDINATE PROFILE UNKNOWN'}
                ruleset={ruleset} ballOn={ballOn} selectedUid={view.selectedUid} editable={editable}
                onSelect={uid => dispatch({ type: 'SELECT', uid })} onMove={onMove}
              />
            </div>
            <div className="hud-phase" data-testid="phase" aria-hidden="true">{phaseLabel}</div>
            {view.phase === 'preparing' && <div className="hud-preparing" aria-hidden="true">Preparing 3D…</div>}
            {status !== 'verified' && view.phase === '3d' && (
              <div className="hud-warning" role="status">Classified alignment — positions are an interpretation pending coach confirmation.</div>
            )}
            <div className="legend" aria-hidden="true">
              <span><i className="dot off" />Offense</span>
              <span><i className="dot def" />Defense</span>
              <span><i className="bar route" />Route · illustrative</span>
              {fieldProfile || view.phase !== '2d' ? <span><i className="bar los" />LOS</span> : null}
            </div>
          </div>
          </div>

          <div className="controls" role="toolbar" aria-label="View controls">
            <div className="segmented" role="group" aria-label="View">
              <button data-testid="btn-2d" aria-pressed={!is3dSide(view.phase)} onClick={request2d} disabled={!is3dSide(view.phase)}>2D Diagram</button>
              <button ref={toggleRef} data-testid="btn-3d" aria-pressed={is3dSide(view.phase)} onClick={request3d}
                disabled={is3dSide(view.phase) || !scene || !GL_AVAILABLE}
                title={!GL_AVAILABLE ? 'WebGL unavailable on this device' : !scene ? 'Alignment unverified — 3D withheld' : 'Open 3D (V)'}>3D Field</button>
            </div>
            <div className="presets" role="group" aria-label="Camera presets">
              {PRESETS.map(p => (
                <button key={p.id} data-testid={`preset-${p.id}`} aria-pressed={view.preset === p.id}
                  disabled={view.phase !== '3d'} onClick={() => dispatch({ type: 'SET_PRESET', preset: p.id })}>
                  <kbd>{p.key}</kbd>{p.label}
                </button>
              ))}
            </div>
            <button className="motion-toggle" aria-pressed={reducedMotion} data-testid="reduce-motion"
              onClick={() => setMotionPref(m => (m === 'reduce' ? 'system' : 'reduce'))}
              disabled={systemReduced} title={systemReduced ? 'Reduced motion is set by your system' : 'Toggle reduced motion'}>
              {reducedMotion ? 'Motion: reduced' : 'Motion: full'}
            </button>
          </div>

          {(view.notice || !GL_AVAILABLE) && (
            <div className="notice" role="alert" data-testid="notice">
              <span>{view.notice ?? '3D needs WebGL, which is unavailable here. The 2D editor remains fully usable.'}</span>
              {view.notice && <button onClick={() => dispatch({ type: 'DISMISS_NOTICE' })} aria-label="Dismiss notice">✕</button>}
            </div>
          )}
        </section>

        <aside className="side" aria-label="Inspector">
          <section className="panel">
            <h2>Inspector</h2>
            {selected ? (
              <dl className="inspect" data-testid="inspector">
                <div><dt>Player</dt><dd className="big">{selected.p.position ?? selected.p.id}{typeof selected.p.number === 'number' && <span className="num">#{selected.p.number}</span>}</dd></div>
                <div><dt>Side</dt><dd>{selected.env.play.phase ?? 'unknown'}</dd></div>
                <div><dt>Stored px</dt><dd className="mono">x {fmt(selected.p.x)} · y {fmt(selected.p.y)}</dd></div>
                <div><dt>Yards</dt><dd className="mono">{(() => {
                  const y = profile3d ? describeYards(profile3d, selected.p) : null;
                  return y ? `${fmt(y.xYd)} lat · ${fmt(y.yYd)} dn${status === 'classified' ? ' (classified)' : ''}` : 'withheld — profile unknown';
                })()}</dd></div>
                <div><dt>Routes</dt><dd>{selected.routes.length ? selected.routes.map(r => `${r.id} (${r.points === undefined && r.path ? 'path' : 'points'}, ${routePoints(r).length} pts)`).join(', ') : 'none'}</dd></div>
              </dl>
            ) : <p className="muted">Select a player on the field or in the roster.</p>}
          </section>

          <section className="panel">
            <h2>Roster</h2>
            {([['Offense', offense], ['Defense', defense]] as const).map(([title, list]) => list.length > 0 && (
              <div key={title} className="roster-group">
                <h3>{title}</h3>
                <div className="roster">
                  {list.map(p => (
                    <button key={p.uid} className={`chip ${p.side}`} aria-pressed={view.selectedUid === p.uid}
                      onClick={() => dispatch({ type: 'SELECT', uid: view.selectedUid === p.uid ? null : p.uid })}>{p.label}</button>
                  ))}
                </div>
              </div>
            ))}
            {rosterRaw.length > 0 && (
              <div className="roster">
                {rosterRaw.map(p => (
                  <button key={p.uid} className="chip unknown" aria-pressed={view.selectedUid === p.uid}
                    onClick={() => dispatch({ type: 'SELECT', uid: view.selectedUid === p.uid ? null : p.uid })}>{p.label}</button>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Data integrity</h2>
            <dl className="integrity">
              <div><dt>Play fingerprint</dt><dd className="mono" data-testid="fingerprint">{draftFp}</dd></div>
              <div><dt>Draft</dt><dd data-testid="dirty">{dirty ? 'Edited · unsaved (in memory)' : 'Unchanged since load'}</dd></div>
              <div><dt>View round trips</dt><dd data-testid="round-trips">{view.roundTrips}</dd></div>
              <div><dt>Persistence</dt><dd>None in this experiment · write attempts <span data-testid="write-count">{writeLog.length}</span></dd></div>
            </dl>
            {dirty && <button className="ghost" onClick={() => setWs(revert)} disabled={!editable}>Revert draft to {baselineFp}</button>}
          </section>

          {result.warnings.length > 0 && (
            <section className="panel">
              <h2>Geometry notes</h2>
              <ul className="warnings" data-testid="warnings">{result.warnings.map(w => <li key={w}>{w}</li>)}</ul>
            </section>
          )}
        </aside>
      </main>
      <div className="sr-only" aria-live="polite">{announce}</div>
    </div>
  );
}

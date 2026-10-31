/**
 * Presentation-only state for the 2D ⇄ 3D transition. Holds no football data:
 * the play lives in the workspace, this machine only decides what is on screen.
 *
 *   2d ─REQUEST_3D→ preparing ─SCENE_READY→ handoff-in ─HANDOFF_DONE→ lifting ─LIFT_DONE→ 3d
 *   3d ─REQUEST_2D→ lowering ─LOWER_DONE→ handoff-out ─HANDOFF_DONE→ 2d
 *
 * REQUEST_2D is accepted from every 3D-side phase and reverses from wherever the
 * camera currently is. Failures always land on '2d' with a notice.
 */
export type Phase = '2d' | 'preparing' | 'handoff-in' | 'lifting' | '3d' | 'lowering' | 'handoff-out';
export type CameraPreset = 'tactical' | 'overhead' | 'sideline' | 'defense';

export interface ViewState {
  readonly phase: Phase;
  readonly preset: CameraPreset;
  /** Incremented on every preset request, so re-choosing the current preset re-frames after an orbit. */
  readonly presetRequest: number;
  readonly selectedUid: string | null;
  readonly notice: string | null;
  /** Incremented to force a fresh WebGL context after context loss. */
  readonly sceneEpoch: number;
  /** Number of completed 2D→3D→2D round trips, for diagnostics. */
  readonly roundTrips: number;
}

export type ViewEvent =
  | { type: 'REQUEST_3D'; canRender3d: boolean; geometryAvailable: boolean }
  | { type: 'SCENE_READY' }
  | { type: 'HANDOFF_DONE' }
  | { type: 'LIFT_DONE' }
  | { type: 'REQUEST_2D' }
  | { type: 'LOWER_DONE' }
  | { type: 'SET_PRESET'; preset: CameraPreset }
  | { type: 'SELECT'; uid: string | null }
  | { type: 'WEBGL_FAILED'; reason: string }
  | { type: 'CONTEXT_LOST' }
  | { type: 'DISMISS_NOTICE' }
  | { type: 'RESET_SCENARIO' };

export const initialViewState: ViewState = {
  phase: '2d', preset: 'tactical', presetRequest: 0, selectedUid: null, notice: null, sceneEpoch: 0, roundTrips: 0,
};

export const is3dSide = (phase: Phase) => phase !== '2d';
/** The 3D canvas must be visible (fully or crossfading) in these phases. */
export const shows3d = (phase: Phase) => phase === 'handoff-in' || phase === 'lifting' || phase === '3d' || phase === 'lowering' || phase === 'handoff-out';
/** Orbit/zoom are live only once the lift has finished. */
export const controlsEnabled = (phase: Phase) => phase === '3d';

export function viewReducer(state: ViewState, event: ViewEvent): ViewState {
  switch (event.type) {
    case 'REQUEST_3D':
      if (state.phase !== '2d') return state;
      if (!event.geometryAvailable) {
        return { ...state, notice: '3D is withheld for this play: its coordinate profile is unverified. The 2D view is unchanged.' };
      }
      if (!event.canRender3d) {
        return { ...state, notice: '3D needs WebGL, which is unavailable here. The 2D editor remains fully usable.' };
      }
      return { ...state, phase: 'preparing', notice: null };
    case 'SCENE_READY':
      return state.phase === 'preparing' ? { ...state, phase: 'handoff-in' } : state;
    case 'HANDOFF_DONE':
      if (state.phase === 'handoff-in') return { ...state, phase: 'lifting' };
      if (state.phase === 'handoff-out') return { ...state, phase: '2d', roundTrips: state.roundTrips + 1 };
      return state;
    case 'LIFT_DONE':
      return state.phase === 'lifting' ? { ...state, phase: '3d' } : state;
    case 'REQUEST_2D':
      switch (state.phase) {
        case 'preparing': return { ...state, phase: '2d' };
        case 'handoff-in': return { ...state, phase: 'handoff-out' };
        case 'lifting': case '3d': return { ...state, phase: 'lowering' };
        default: return state;
      }
    case 'LOWER_DONE':
      return state.phase === 'lowering' ? { ...state, phase: 'handoff-out' } : state;
    case 'SET_PRESET':
      return { ...state, preset: event.preset, presetRequest: state.presetRequest + 1 };
    case 'SELECT':
      return state.selectedUid === event.uid ? state : { ...state, selectedUid: event.uid };
    case 'WEBGL_FAILED':
      return { ...state, phase: '2d', notice: `3D could not start (${event.reason}). The 2D editor is unchanged.` };
    case 'CONTEXT_LOST':
      return {
        ...state, phase: '2d', sceneEpoch: state.sceneEpoch + 1,
        notice: 'The graphics context was lost, so the view returned to 2D. Your play is unchanged; 3D can be reopened.',
      };
    case 'DISMISS_NOTICE':
      return { ...state, notice: null };
    case 'RESET_SCENARIO':
      return { ...initialViewState, sceneEpoch: state.sceneEpoch, roundTrips: state.roundTrips };
  }
}

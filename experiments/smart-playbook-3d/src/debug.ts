/**
 * Write-attempt instrumentation for verification. The prototype has no persistence path;
 * these counters prove it by observing every browser channel a save could use.
 * Calls are counted and passed through unchanged.
 */
export interface WriteLog { channel: string; detail: string; at: number }

export const writeLog: WriteLog[] = [];

const record = (channel: string, detail: string) => writeLog.push({ channel, detail, at: performance.now() });

let installed = false;
export function installWriteGuards() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') record('fetch', `${method} ${String(input instanceof Request ? input.url : input)}`);
    return origFetch(input, init);
  };

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    if (!/^(GET|HEAD)$/i.test(method)) record('xhr', `${method} ${String(url)}`);
    return (origOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;

  if (navigator.sendBeacon) {
    const origBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => { record('beacon', String(url)); return origBeacon(url, data); };
  }

  const OrigWS = window.WebSocket;
  window.WebSocket = class extends OrigWS {
    constructor(url: string | URL, protocols?: string | string[]) { record('websocket', String(url)); super(url, protocols); }
  } as typeof WebSocket;

  for (const area of ['localStorage', 'sessionStorage'] as const) {
    try {
      const store = window[area];
      const set = store.setItem.bind(store), remove = store.removeItem.bind(store), clear = store.clear.bind(store);
      store.setItem = (k: string, v: string) => { record(area, `set ${k}`); set(k, v); };
      store.removeItem = (k: string) => { record(area, `remove ${k}`); remove(k); };
      store.clear = () => { record(area, 'clear'); clear(); };
    } catch { /* storage unavailable */ }
  }

  if (window.indexedDB) {
    const origIdb = window.indexedDB.open.bind(window.indexedDB);
    window.indexedDB.open = (name: string, version?: number) => { record('indexedDB', `open ${name}`); return origIdb(name, version); };
  }
}

export interface TransitionMetric {
  kind: 'enter' | 'exit';
  warm: boolean;
  reducedMotion: boolean;
  /** Request → first matched 3D frame presented (enter) / request → 2D restored (exit). */
  readyMs: number | null;
  /** Request → interactive 3D (enter) / same as readyMs (exit). */
  totalMs: number | null;
}

export const metrics: TransitionMetric[] = [];

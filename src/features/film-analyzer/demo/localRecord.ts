import sample from './sample.json';
export const RECORD_KEY = 'coach-core:film-a0:synthetic-out-route-v1';
export type Mark = { startMs: number; endMs: number; label: string; note: string };
export type LocalRecord = Mark & { version: 1; sampleId: string; sampleHashes: string[] };
export const emptyMark = (): Mark => ({ startMs: 0, endMs: 3000, label: '', note: '' });
export function validMark(value: Mark): boolean {
  return Number.isInteger(value.startMs) && Number.isInteger(value.endMs) && value.startMs >= 0 &&
    value.endMs > value.startMs && value.endMs <= sample.durationMs &&
    typeof value.label === 'string' && value.label.trim().length > 0 && value.label.length <= 80 &&
    typeof value.note === 'string' && value.note.length <= 2000;
}
export function encode(mark: Mark): string {
  if (!validMark(mark)) throw new Error('Invalid interval or text.');
  return JSON.stringify({ version: 1, sampleId: sample.id, sampleHashes: sample.files.map(f => f.sha256), ...mark });
}
export function decode(raw: string): Mark {
  const v = JSON.parse(raw);
  const keys = ['version', 'sampleId', 'sampleHashes', 'startMs', 'endMs', 'label', 'note'];
  if (!v || typeof v !== 'object' || Object.keys(v).length !== keys.length || keys.some(k => !(k in v)) ||
    v.version !== 1 || v.sampleId !== sample.id || JSON.stringify(v.sampleHashes) !== JSON.stringify(sample.files.map(f => f.sha256)) || !validMark(v)) {
    throw new Error('Record does not match this synthetic sample.');
  }
  return { startMs: v.startMs, endMs: v.endMs, label: v.label, note: v.note };
}
export function writeVerified(mark: Mark): string {
  const encoded = encode(mark);
  // Access itself may throw in private windows/blocked storage. Never hide that failure.
  const store = window.localStorage;
  store.setItem(RECORD_KEY, encoded);
  const actual = store.getItem(RECORD_KEY);
  if (actual !== encoded) throw new Error('Local readback did not match.');
  decode(actual);
  return encoded;
}
export function clearVerified(): void {
  const store = window.localStorage;
  store.removeItem(RECORD_KEY);
  if (store.getItem(RECORD_KEY) !== null) throw new Error('Local reset was not confirmed.');
}

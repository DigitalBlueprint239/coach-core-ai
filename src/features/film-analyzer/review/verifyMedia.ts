// Fetches one allowlisted synthetic sample and proves its identity before playback (ported from Film A0).
// Bytes and SHA-256 must match the pinned manifest; duration is checked separately on loadedmetadata.
import { SampleFile, SyntheticSample } from './samples';

export class MediaVerificationError extends Error {}

export function chooseFile(sample: SyntheticSample, probe: HTMLVideoElement | null): SampleFile | null {
  const canPlay = (f: SampleFile) => !!probe && probe.canPlayType(`${f.mime}; codecs="${f.codecs}"`) !== '';
  return sample.files.find(canPlay) ?? null;
}

export async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Returns an object URL for verified bytes. The caller must revoke it. */
export async function fetchVerified(file: SampleFile, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try { response = await fetch(file.url, { credentials: 'omit', cache: 'no-store', signal }); }
  catch (e) { if ((e as Error).name === 'AbortError') throw e; throw new MediaVerificationError('The synthetic sample could not be loaded. Playback and saving are blocked.'); }
  if (!response.ok) throw new MediaVerificationError('The synthetic sample is missing. Playback and saving are blocked.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== file.bytes || (await sha256Hex(bytes)) !== file.sha256) {
    throw new MediaVerificationError('The synthetic sample does not match its pinned identity. Playback and saving are blocked.');
  }
  return URL.createObjectURL(new Blob([bytes], { type: file.mime }));
}

/** Allowed difference between the pinned duration and what the browser reports (container rounding). */
export const DURATION_TOLERANCE_MS = 120;
export const durationMatches = (sample: SyntheticSample, seconds: number) =>
  Number.isFinite(seconds) && Math.abs(seconds * 1000 - sample.durationMs) <= DURATION_TOLERANCE_MS;

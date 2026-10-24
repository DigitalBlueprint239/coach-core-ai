// Allowlisted synthetic samples for the Film review preview (F1). Original deterministic diagrams from
// Film A0 (PR #89 @ 0dc94c4, generator scripts/film-a0/generate-sample.py on that branch): no people,
// footage, audio, AI or third-party assets. Bytes and hashes are pinned; media is verified before use.
// The files in ./samples are never imported: only the preview build (tests/film-f1/build-preview.sh)
// copies them to /film-preview/, so an ordinary production build contains no sample media.
const base = `${process.env.PUBLIC_URL || ''}/film-preview`;

export interface SampleFile { url: string; mime: 'video/mp4' | 'video/webm'; codecs: string; bytes: number; sha256: string }
export interface SyntheticSample { id: string; title: string; description: string; durationMs: number; width: number; height: number; files: SampleFile[] }

export const SYNTHETIC_SAMPLES: readonly SyntheticSample[] = [
  {
    id: 'synthetic-out-route-v1',
    title: 'Out route · 8 seconds',
    description: 'Synthetic diagram: one receiver runs and breaks toward the sideline.',
    durationMs: 8000,
    width: 640,
    height: 360,
    files: [
      { url: `${base}/out-route.mp4`, mime: 'video/mp4', codecs: 'avc1.42E01E', bytes: 25146, sha256: 'a3b4285499e64d89f99b755cbf4d320ab60b3d142a53c115e4040e83f39404d2' },
      { url: `${base}/out-route.webm`, mime: 'video/webm', codecs: 'vp8', bytes: 49584, sha256: 'a74f85cb02aaefb6eb42ed05d143c261e595903e4b5a75a49736e787e88da381' },
    ],
  },
];

export const sampleById = (id: string): SyntheticSample | undefined => SYNTHETIC_SAMPLES.find(s => s.id === id);

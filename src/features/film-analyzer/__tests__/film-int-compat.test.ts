/** INT-A D8, based on server S 7761d0c3d532b3c6b14de95b91547ec60db411eb.
 * Captured stored documents, not callable responses. No Firebase or decoder
 * execution here; D7 regenerates the captures from worker execution in CI.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as client from '../contracts-v2';

type Document = Record<string, unknown>;
interface Capture {
  schema: string;
  kind: string;
  source: string;
  projection: string;
  document: Document;
}
interface Schema {
  safeParse(value: unknown): {success: boolean; data?: unknown};
}
const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, 'functions/test/fixtures/film-int-captured');
// Test-only authoritative schemas; never imported by application code.
const server = require(path.join(root, 'functions/src/film/contract-v2')) as {
  schemas: {filmDocument: Schema; filmState: Schema};
};
const expected = [
  ['abandoned.json', 'abandoned', null, 'S1 abandon during worker run'],
  ['ready.json', 'ready', null, 'CT-4.1 worker ready'],
  ['rejected-container-invalid.json', 'rejected', 'container-invalid', 'worker verdict'],
  ['rejected-duration-over-limit.json', 'rejected', 'duration-over-limit', 'worker verdict'],
  ['rejected-metadata-invalid.json', 'rejected', 'metadata-invalid', 'worker verdict'],
  ['rejected-processing-limit-exceeded.json', 'rejected', 'processing-limit-exceeded', 'worker limit exhaustion'],
  ['rejected-video-codec-not-allowed.json', 'rejected', 'video-codec-not-allowed', 'worker verdict'],
  ['validating.json', 'validating', null, 'CT-4.1 after S1 finalize'],
] as const;
const captures = expected.map(([file, status, reason, source]) => ({
  file, status, reason, source,
  capture: JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Capture,
}));
const clone = (document: Document): Document => JSON.parse(JSON.stringify(document));

function parity(document: Document, stored: boolean, valid: boolean): void {
  const before = JSON.stringify(document);
  const schema = stored ? server.schemas.filmDocument : server.schemas.filmState;
  const parse = stored ? client.parseFilmDocument : client.parseFilmState;
  const oracle = schema.safeParse(document);
  expect(oracle.success).toBe(valid);
  if (valid) {
    expect(parse(document)).toEqual(oracle.data);
  } else {
    expect(() => parse(document)).toThrow(client.FilmContractValidationError);
  }
  expect(JSON.stringify(document)).toBe(before);
}

describe('INT-A CT-5 captured worker documents: client/server compatibility', () => {
  test('exact eight-file membership, envelope provenance and final-byte hashes', () => {
    const files = expected.map(([file]) => file);
    expect(fs.readdirSync(dir).sort()).toEqual([...files, 'SHA256SUMS.txt'].sort());
    const entries = fs.readFileSync(path.join(dir, 'SHA256SUMS.txt'), 'utf8').trim().split('\n');
    expect(entries).toHaveLength(files.length);
    const listed: string[] = [];
    for (const entry of entries) {
      const match = /^([a-f0-9]{64})  ([a-z0-9-]+\.json)$/.exec(entry);
      expect(match).not.toBeNull();
      if (!match) throw new Error('Malformed capture inventory');
      const [, digest, file] = match;
      expect(files).toContain(file);
      listed.push(file);
      const bytes = fs.readFileSync(path.join(dir, file));
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(digest);
    }
    expect(listed.sort()).toEqual(files.slice().sort());
    expect(client.FILM_CONTRACT_REVISION).toBe('6764af9edd7ab258f55c4eeb19e80a4649b8c86b');
  });

  test.each(captures)('$file preserves the captured status/reason and stored-vs-wire boundary', row => {
    const {capture, status, reason} = row;
    expect(Object.keys(capture).sort()).toEqual(['schema', 'kind', 'source', 'projection', 'document'].sort());
    expect(capture.schema).toBe('film-int-capture.v1');
    expect(capture.kind).toBe('stored-film-document');
    expect(capture.source).toBe(row.source);
    expect(capture.projection).toBe('contract-v2 FILM_TIMESTAMP_FIELDS -> toWireTimestamp');
    expect(capture.document.status).toBe(status);
    expect(capture.document.rejectionReason).toBe(reason);
    parity(capture.document, true, true);
    // Original S1 validating/abandoned captures omit new keys. Strict wire
    // FilmState must reject those bytes; only the stored reader fills nulls.
    const complete = client.NEW_FILM_KEYS.every(key =>
      Object.prototype.hasOwnProperty.call(capture.document, key));
    parity(capture.document, false, complete);
    const normalized = client.parseFilmDocument(capture.document);
    parity({...normalized}, false, true);
    if (status !== 'ready') {
      for (const key of client.NEW_FILM_KEYS) expect(normalized[key]).toBeNull();
    }
    // A stored document/envelope is not a reserve or abandon receipt.
    for (const action of client.ACTION_NAMES) {
      expect(() => client.parseFilmResponse(action, capture.document)).toThrow(client.FilmContractValidationError);
      expect(() => client.parseFilmDocument(capture)).toThrow(client.FilmContractValidationError);
    }
  });

  const omissions = captures.flatMap(row => [...client.NEW_FILM_KEYS, 'all' as const]
    .map(key => ({...row, key})));
  test.each(omissions)('$file omits $key only at the non-ready stored boundary', ({capture, status, key}) => {
    const document = clone(capture.document);
    for (const field of key === 'all' ? client.NEW_FILM_KEYS : [key]) delete document[field];
    parity(document, true, status !== 'ready');
    parity(document, false, false);
  });

  const malformed = [
    ['readyAt', 42],
    ['normalizedGeneration', '12x'],
    ['media', {videoCodec: 'h264'}],
    ['retentionExpiresAt', 'soon'],
    ['rejectionReason', 'not-a-reason'],
    ['unknownKey', true],
  ] as const;
  test.each(captures.flatMap(row => malformed.map(([key, value]) => ({...row, key, value}))))(
    '$file rejects malformed present $key (never defaulted away)', ({capture, key, value}) => {
      const document = {...clone(capture.document), [key]: value};
      parity(document, true, false);
      parity(document, false, false);
    });

  const ready = captures.find(row => row.status === 'ready')!.capture.document;
  const limits = client.TEST_POLICY_PLACEHOLDERS.PENDING_D3;
  const invalidReady: Array<{name: string; corrupt: (document: Document) => void}> = [
    {name: 'null readyAt', corrupt: d => {d.readyAt = null;}},
    {name: 'invalid timestamp', corrupt: d => {d.readyAt = 'not-a-time';}},
    {name: 'readyAt differs from statusChangedAt', corrupt: d => {d.readyAt = '2026-10-21T16:00:00.001Z';}},
    {name: 'null output generation', corrupt: d => {d.normalizedGeneration = null;}},
    {name: 'zero output generation', corrupt: d => {d.normalizedGeneration = '0';}},
    {name: 'numeric output generation', corrupt: d => {d.normalizedGeneration = 1002;}},
    {name: 'null media', corrupt: d => {d.media = null;}},
    {name: 'invalid codec', corrupt: d => {d.media = {...d.media as object, videoCodec: 'hevc'};}},
    {name: 'extra media key', corrupt: d => {d.media = {...d.media as object, gps: '1,2'};}},
    {name: 'media bytes over test policy', corrupt: d => {d.media = {...d.media as object, bytes: limits.maxBytes + 1};}},
    {name: 'media duration over test policy', corrupt: d => {d.media = {...d.media as object, durationMs: limits.maxDurationMs + 1};}},
    {name: 'media width over test policy', corrupt: d => {d.media = {...d.media as object, width: limits.maxWidth + 1};}},
    {name: 'media height over test policy', corrupt: d => {d.media = {...d.media as object, height: limits.maxHeight + 1};}},
    {name: 'invalid media digest', corrupt: d => {d.media = {...d.media as object, sha256: 'a'.repeat(63)};}},
    {name: 'nonnull retention expiry', corrupt: d => {d.retentionExpiresAt = '2026-10-22T16:00:00.000Z';}},
  ];
  test.each(invalidReady)('captured ready rejects $name', ({corrupt}) => {
    const document = clone(ready);
    corrupt(document);
    parity(document, true, false);
    parity(document, false, false);
  });
});

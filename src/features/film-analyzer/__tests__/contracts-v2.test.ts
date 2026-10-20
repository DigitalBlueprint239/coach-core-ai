/** FS-26 r4: independent runtime mirror; no worker, network or handler wiring. */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as client from '../contracts-v2';
import * as v1 from '../contracts';

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, 'tests/fixtures/coach-film.v2');
type Schema = {safeParse(value: unknown): {success: boolean; data?: unknown}};
interface Oracle {
  schemas: Record<string, Schema>;
  RESPONSE_SCHEMAS: Record<client.FilmAction, Schema>;
  admissionDecision(value: unknown): unknown;
  exhaustionOutcome(value: unknown): unknown;
  [key: string]: unknown;
}
// Server modules are test-only oracles, never browser dependencies.
const server = require(path.join(root, 'functions/src/film/contract-v2')) as Oracle;
const legacy = require(path.join(root, 'functions/src/film/legacy-r3')) as {
  decideReplay(value: unknown): unknown;
  projectR3SuccessToV2(action: client.FilmAction, value: unknown): unknown;
  schemas: Record<string, Schema>;
};
const old = require(path.join(root, 'functions/src/film/contract')) as Oracle;
interface Fixture {file: string; kind: string; action?: client.FilmAction | '*'; valid: boolean; schemaValid?: boolean}
const manifest: {fixtures: Fixture[]} = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const load = (file: string): unknown => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
const accepts = (fn: (v: unknown) => unknown, value: unknown) => {try {return {success: true, data: fn(value)};} catch {return {success: false};}};
const checksum = (data: string) => crypto.createHash('sha256').update(data).digest('hex');

describe('FS-26 r4 complete shared fixture parity', () => {
  test('exact revision, all 211 v2 files and all 86 v1 fixtures preserved', () => {
    expect(client.FILM_CONTRACT_REVISION).toBe('6764af9edd7ab258f55c4eeb19e80a4649b8c86b');
    expect(manifest.fixtures).toHaveLength(211);
    expect(fs.readdirSync(dir).filter(f => f.endsWith('.json') && !['index.json', 'contract.schema.json'].includes(f)).sort())
      .toEqual(manifest.fixtures.map(f => f.file).sort());
    for (const folder of [dir, path.join(dir, '../coach-film.v1')]) {
      const source = (file: string) => fs.readFileSync(path.join(folder, file), 'utf8').replace(/\r\n/g, '\n');
      for (const line of source('SHA256SUMS.txt').trim().split('\n')) {
        const [hash, file] = line.split(/\s+/); expect(checksum(source(file))).toBe(hash);
      }
      if (folder !== dir) {
        expect(checksum(source('SHA256SUMS.txt'))).toBe('cd0860d87715a22e50f632a07657a6c5e71597c18daaca3dfcde80ed9033c776');
        expect(JSON.parse(source('index.json')).fixtures).toHaveLength(86);
      }
    }
  });
  test.each(manifest.fixtures)('$file parity and expected outcome', f => {
    const value = load(f.file);
    const action = f.action === '*' ? 'reserveFilmUpload' : f.action ?? 'reserveFilmUpload';
    const pair = (parse: (v: unknown) => unknown, schema: Schema, expected: boolean) => {
      const actual = accepts(parse, value); const oracle = schema.safeParse(value);
      expect(oracle.success).toBe(expected); expect(actual.success).toBe(expected);
      if (expected) expect(actual.data).toEqual(oracle.data);
    };
    if (f.kind === 'film-state') return pair(client.parseFilmState, server.schemas.filmState, f.valid);
    if (f.kind === 'film-document') return pair(client.parseFilmDocument, server.schemas.filmDocument, f.valid);
    if (f.kind === 'request') return pair(v => client.parseFilmRequest(action, v), server.schemas[action === 'reserveFilmUpload' ? 'reserveRequest' : 'abandonRequest'], f.schemaValid ?? f.valid);
    if (f.kind === 'response') return pair(v => client.parseFilmResponse(action, v), f.action === '*' ? server.schemas.errorResponse : server.RESPONSE_SCHEMAS[action], f.valid);
    if (f.kind === 'client-failure') return pair(client.parseClientFailure, old.schemas.clientFailure, f.valid);
    const row = value as {input: unknown; attempts: unknown; request: unknown; expect: Record<string, unknown>};
    if (f.kind === 'attempt-admission' || f.kind === 'attempt-exhaustion') {
      const input = f.kind === 'attempt-admission' ? row.input : row.attempts;
      const actual = f.kind === 'attempt-admission' ? client.admissionDecision(input) : client.exhaustionOutcome(input);
      const expected = f.kind === 'attempt-admission' ? server.admissionDecision(input) : server.exhaustionOutcome(input);
      expect(actual).toEqual(row.expect); expect(actual).toEqual(expected); return;
    }
    if (f.kind === 'replay-case') {
      const before = JSON.stringify(row.request); const actual = client.decideReplay(row.request);
      expect(actual).toEqual(legacy.decideReplay(row.request)); expect(actual.kind).toBe(row.expect.kind);
      expect(JSON.stringify(row.request)).toBe(before);
      if (typeof row.expect.responseFile === 'string') {
        expect(actual).toEqual({kind: 'replay', response: load(row.expect.responseFile)});
      }
      if (row.expect.kind === 'error') expect(actual).toEqual({kind: 'error', response: client.errorResponseFor(row.expect.code as client.FilmErrorCode, row.expect.reason as client.FilmServerError['reason'])});
      return;
    }
    throw new Error(`Uncovered fixture kind ${f.kind}`);
  });
  test('all exported state, error and retry tables agree', () => {
    for (const key of ['CONTRACT_VERSION', 'PREVIOUS_CONTRACT_VERSION', 'S1_REJECTION_REASONS', 'WORKER_REJECTION_REASONS', 'REJECTION_REASONS', 'ERROR_CODES', 'ERROR_REASONS', 'RETRYABLE', 'NEW_FILM_KEYS', 'FILM_KEYS', 'FILM_TIMESTAMP_FIELDS', 'PENDING_LIMITS', 'WORKER_ATTEMPT_POLICY', 'CLASSIFIED_LIMIT_KILLS', 'LIMIT_KILL_SIGNALS', 'PIPELINE_STEPS', 'MEDIA_VERDICT_REASONS'] as const) expect(client[key]).toEqual(server[key]);
    for (const key of ['ACTION_NAMES', 'FILM_STATUSES', 'SLOT_HOLDING_STATUSES', 'TERMINAL_STATUSES', 'TRANSITIONS', 'SDK_ERROR_CATEGORIES'] as const) expect(client[key]).toEqual(old[key]);
    expect(client.WORKER_ATTEMPT_POLICY.platformRetry).toBe(false);
  });
});

describe('FS-26 r4 non-JSON and runtime boundary parity', () => {
  const garbage: unknown[] = [undefined, null, NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '', true, [], {}, [null], () => 1, Object.create(null)];
  test.each(garbage.map((value, index) => ({value, index})))('invalid helper input $index fails closed', ({value}) => {
    expect(client.admissionDecision(value)).toEqual(server.admissionDecision(value));
    expect(client.exhaustionOutcome(value)).toEqual(server.exhaustionOutcome(value));
    expect(client.decideReplay(value)).toEqual(legacy.decideReplay(value));
  });
  test.each([NaN, Infinity, -Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1'])('invalid counter/time %s', value => {
    const base = {delivery: 'process', configurationOk: true, admitted: 0, jobCreatedAtMs: 0, nowMs: 1};
    for (const key of ['admitted', 'jobCreatedAtMs', 'nowMs']) {
      const input = {...base, [key]: value}; expect(client.admissionDecision(input)).toEqual(server.admissionDecision(input));
      expect(client.admissionDecision(input).admit).toBe(false);
    }
  });
  test('all six retained findings and finite expiry cases', () => {
    const fixture = load('v2-replay-r3-reserve-receipt.json') as {request: {stored: Record<string, unknown>; requestSchemaVersion: string}};
    for (const expiry of [undefined, NaN, Infinity, -Infinity]) {
      const q = {...fixture.request, stored: {...fixture.request.stored, replayableUntilMs: expiry}};
      expect(client.decideReplay(q)).toEqual(legacy.decideReplay(q)); expect(client.decideReplay(q).kind).toBe('error');
    }
    for (const patch of [{schemaVersion: 'coach-film.v999'}, {responseJson: '{bad'}]) {
      const q = {...fixture.request, requestSchemaVersion: 'coach-film.v1', stored: {...fixture.request.stored, ...patch}};
      expect(client.decideReplay(q)).toEqual(legacy.decideReplay(q)); expect(client.decideReplay(q).kind).toBe('error');
    }
    for (const attempts of [[{end: 'limit-kill', kill: 'SIGXCPU'}, {end: 'limit-kill', kill: 'SIGXCPU'}], [{end: 'media-verdict', reason: 'made-up'}]]) {
      expect(client.exhaustionOutcome(attempts)).toEqual({outcome: 'invalid-input', reason: null});
    }
  });
  test.each(client.PIPELINE_STEPS)('classified versus unknown kill at %s', step => {
    for (const kill of client.LIMIT_KILL_SIGNALS) {
      const input = [{end: 'limit-kill', kill, step}, {end: 'limit-kill', kill, step}];
      expect(client.exhaustionOutcome(input)).toEqual(server.exhaustionOutcome(input));
      expect(client.exhaustionOutcome(input).outcome).toBe(kill === 'SIGKILL' ? 'recovery-needed' : 'rejected');
    }
  });
  test('strict stored/query/helper inputs match server schemas', () => {
    const q = (load('v2-replay-r3-reserve-receipt.json') as {request: Record<string, unknown>}).request;
    for (const value of [q, {...q, extra: 1}, {...q, nowMs: NaN}]) expect(accepts(client.parseReplayQuery, value)).toEqual(legacy.schemas.replayQuery.safeParse(value).success ? {success: true, data: legacy.schemas.replayQuery.safeParse(value).data} : {success: false});
    for (const value of [q.stored, {...q.stored as object, extra: 1}]) expect(accepts(client.parseStoredOperation, value).success).toBe(legacy.schemas.storedOperation.safeParse(value).success);
  });
  test('legacy projection never mutates originals or renews expiry', () => {
    const folder = path.join(dir, '../coach-film.v1');
    for (const [action, file] of [['reserveFilmUpload', 'reserve.response.ok.json'], ['abandonFilmUpload', 'abandon.response.ok-from-validating.json']] as const) {
      const original = fs.readFileSync(path.join(folder, file), 'utf8');
      const result = client.projectR3SuccessToV2(action, original);
      expect(result).toEqual(legacy.projectR3SuccessToV2(action, original));
      expect(result.ok).toBe(true);
      expect(fs.readFileSync(path.join(folder, file), 'utf8')).toBe(original);
      if (result.ok && result.response.ok) {
        expect(result.response.data.film.retentionExpiresAt).toBe(null);
        expect(() => v1.parseFilmState(result.response.ok ? result.response.data.film : null)).toThrow();
      }
    }
  });
  test('unknown nested keys and malformed resolutions stay protocol failures', () => {
    const ready = load('v2-state-ready-h264-aac.json') as Record<string, unknown>;
    for (const value of [{...ready, extra: true}, {...ready, media: {...ready.media as object, extra: true}}, {...ready, retentionExpiresAt: '2027-01-01T00:00:00.000Z'}]) {
      expect(server.schemas.filmState.safeParse(value).success).toBe(false); expect(() => client.parseFilmState(value)).toThrow(client.FilmContractValidationError);
    }
    expect(client.decodeFilmResponse('reserveFilmUpload', {ok: false, error: {code: 'unavailable', reason: 'transport', retryable: true}})).toEqual({clientFailure: {kind: 'protocol', category: 'response-invalid', retryEligible: false}});
    expect(client.classifyCallableFailure({code: 'functions/permission-denied'}).clientFailure.retryEligible).toBe(false);
  });
  test('unknown keys are refused at every new helper boundary', () => {
    const admission = {delivery: 'process', configurationOk: true, admitted: 0, jobCreatedAtMs: 0, nowMs: 1, extra: true};
    expect(client.admissionDecision(admission)).toEqual(server.admissionDecision(admission));
    expect(client.admissionDecision(admission).outcome).toBe('invalid-input');
    for (const attempt of [{end: 'completed', extra: 1}, {end: 'limit-kill', kill: 'SIGXCPU', step: 'decode-input', extra: 1}]) {
      expect(client.exhaustionOutcome([attempt])).toEqual(server.exhaustionOutcome([attempt]));
      expect(client.exhaustionOutcome([attempt]).outcome).toBe('invalid-input');
    }
  });
  test('safe timestamp, numeric and request mutations match authoritative schema', () => {
    const request = load('v2-reserve.request.valid.json') as Record<string, unknown>;
    const reserved = load('v2-film-state.reserved.json') as Record<string, unknown>;
    for (const value of [null, undefined, NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1']) {
      const state = {...reserved, declaredBytes: value};
      expect(accepts(client.parseFilmState, state).success).toBe(server.schemas.filmState.safeParse(state).success);
      const input = {...request, payload: {...request.payload as object, declaredBytes: value}};
      expect(accepts(v => client.parseFilmRequest('reserveFilmUpload', v), input).success).toBe(server.schemas.reserveRequest.safeParse(input).success);
    }
    for (const key of client.FILM_TIMESTAMP_FIELDS) {
      for (const value of [null, undefined, '2026-02-30T00:00:00.000Z', '2026-10-19T21:00:00Z']) {
        const state = {...reserved, [key]: value};
        expect(accepts(client.parseFilmState, state).success).toBe(server.schemas.filmState.safeParse(state).success);
      }
    }
    for (const value of [{...request, extra: 1}, {...request, payload: {...request.payload as object, extra: 1}}, {...request, schemaVersion: 'coach-film.v1'}]) {
      expect(() => client.parseFilmRequest('reserveFilmUpload', value)).toThrow(client.FilmContractValidationError);
      expect(server.schemas.reserveRequest.safeParse(value).success).toBe(false);
    }
  });
});

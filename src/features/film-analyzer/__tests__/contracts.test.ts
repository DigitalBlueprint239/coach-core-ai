/** FS-26: unchanged Claude golden fixtures + independently implemented client validation.
 * Contract agreement is not backend/emulator/film workflow acceptance.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ACTION_NAMES, CONTRACT_VERSION, FILM_CONTRACT_REVISION, FILM_STATUSES,
  SLOT_HOLDING_STATUSES, TERMINAL_STATUSES, TRANSITIONS, REJECTION_REASONS,
  FILM_TIMESTAMP_FIELDS, ERROR_REASONS, RETRYABLE, SDK_ERROR_CATEGORIES,
  TEST_POLICY_PLACEHOLDERS, parseFilmRequest, parseFilmResponse, parseFilmState,
  parseClientFailure, classifyCallableFailure, networkFailure, decodeFilmResponse,
  canonicalizeFileName, parseTimestamp, FilmContractValidationError,
  FilmAction, FilmResponse, FilmState,
} from '../contracts';

const root = path.resolve(__dirname, '../../../..');
const dir = path.join(root, 'tests/fixtures/coach-film.v1');
interface Fixture {
  file: string; kind: 'request' | 'response' | 'film-state' | 'client-failure';
  action?: FilmAction | '*'; valid: boolean; schemaValid?: boolean;
  rule?: string; expect?: {code: string; reason: string};
}
const manifest: {contract: string; fixtures: Fixture[]} = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const load = (file: string): unknown => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
interface Schema { safeParse(v: unknown): {success: boolean; data?: unknown} }
interface ServerContract {
  schemas: Record<string, Schema>;
  RESPONSE_SCHEMAS: Record<FilmAction, Schema>;
  PAYLOAD_SCHEMAS: Record<FilmAction, Schema>;
  [key: string]: unknown;
}
// Test-only parity oracle; no server import is reachable from the browser module.
const server = require(path.join(root, 'functions/src/film/contract.js')) as ServerContract;
const limits = require(path.join(root, 'functions/src/film/limits.js')) as {LIMITS: Record<string, unknown>};

function parseFixture(f: Fixture, value: unknown): unknown {
  if (f.kind === 'film-state') return parseFilmState(value);
  if (f.kind === 'client-failure') return parseClientFailure(value);
  const action = f.action === '*' ? 'reserveFilmUpload' : f.action;
  if (!action) throw new Error('Missing fixture action');
  return f.kind === 'request' ? parseFilmRequest(action, value) : parseFilmResponse(action, value);
}
function serverParses(f: Fixture, value: unknown): {success: boolean; data?: unknown} {
  if (f.kind === 'film-state') return server.schemas.filmState.safeParse(value);
  if (f.kind === 'client-failure') return server.schemas.clientFailure.safeParse(value);
  if (f.kind === 'response') return (f.action === '*' ? server.schemas.errorResponse : server.RESPONSE_SCHEMAS[f.action as FilmAction]).safeParse(value);
  return server.schemas[f.action === 'reserveFilmUpload' ? 'reserveRequest' : 'abandonRequest'].safeParse(value);
}

describe('FS-26 golden parity at contract r3', () => {
  test('manifest covers every fixture and SHA256SUMS matches LF source text (Git autocrlf checkout)', () => {
    expect(FILM_CONTRACT_REVISION).toBe('8f7723952bdf38c18d12d8f2611e87830b658467');
    expect(manifest.contract).toBe(CONTRACT_VERSION);
    const actual = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !['index.json', 'contract.schema.json'].includes(f));
    expect(actual.sort()).toEqual(manifest.fixtures.map(f => f.file).sort());
    for (const line of fs.readFileSync(path.join(dir, 'SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
      const match = /^([a-f0-9]{64})  (.+)$/.exec(line.trim());
      expect(match).not.toBeNull();
      if (!match) throw new Error('Malformed checksum manifest');
      const sourceText = fs.readFileSync(path.join(dir, match[2]), 'utf8').replace(/\r\n/g, '\n');
      expect(crypto.createHash('sha256').update(sourceText).digest('hex')).toBe(match[1]);
    }
  });
  test.each(manifest.fixtures)('$file: client and authoritative schema agree', fixture => {
    const value = load(fixture.file);
    // Some schema-valid requests intentionally fail server business policy/idempotency.
    // FS-26 checks parsing, not a fabricated server execution.
    const expected = fixture.kind === 'request' ? fixture.schemaValid ?? fixture.valid : fixture.valid;
    const oracle = serverParses(fixture, value);
    expect(oracle.success).toBe(expected);
    if (expected) {
      const parsed = parseFixture(fixture, value);
      expect(parsed).toEqual(oracle.data);
      expect(parseFixture(fixture, JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
    } else {
      expect(() => parseFixture(fixture, value)).toThrow(FilmContractValidationError);
    }
  });
  test('all status, transition, error and SDK category tables match', () => {
    for (const [key, value] of Object.entries({ACTION_NAMES, FILM_STATUSES, SLOT_HOLDING_STATUSES,
      TERMINAL_STATUSES, TRANSITIONS, REJECTION_REASONS, FILM_TIMESTAMP_FIELDS, ERROR_REASONS, RETRYABLE, SDK_ERROR_CATEGORIES})) {
      expect(value).toEqual(server[key]);
    }
    expect({...TEST_POLICY_PLACEHOLDERS.PENDING_D3, ...TEST_POLICY_PLACEHOLDERS.PENDING_D7,
      ...TEST_POLICY_PLACEHOLDERS.DELEGATED}).toEqual(limits.LIMITS);
    expect(TEST_POLICY_PLACEHOLDERS.status).toBe('TEST_PLACEHOLDER_NOT_APPROVED');
  });
  test('every supported server reason has a golden fixture, accepted for both actions', () => {
    for (const [code, reasons] of Object.entries(ERROR_REASONS)) {
      for (const reason of reasons) {
        const value = load(`error.${code}.${reason}.json`);
        for (const action of ACTION_NAMES) expect(parseFilmResponse(action, value)).toEqual(value);
      }
    }
  });
});

const requestValue = () => load('reserve.request.valid.json') as Record<string, unknown>;
const responseValue = () => load('reserve.response.ok.json') as FilmResponse<'reserveFilmUpload'>;
const stateValue = () => load('film-state.reserved.json') as FilmState;

describe('FS-26 strict runtime boundaries', () => {
  test.each(['envelope', 'payload', 'response', 'data', 'film', 'error', 'clientFailure'])('unknown fields rejected at %s', level => {
    if (level === 'envelope' || level === 'payload') {
      const v = requestValue();
      if (level === 'envelope') v.extra = true;
      else v.payload = {...v.payload as object, extra: true};
      expect(() => parseFilmRequest('reserveFilmUpload', v)).toThrow(FilmContractValidationError);
    } else if (level === 'clientFailure') {
      expect(() => parseClientFailure({clientFailure: {...networkFailure().clientFailure, extra: true}})).toThrow(FilmContractValidationError);
    } else if (level === 'error') {
      expect(() => parseFilmResponse('reserveFilmUpload', {ok: false, error: {code: 'unavailable', reason: 'backend-unavailable', retryable: true, extra: true}})).toThrow(FilmContractValidationError);
    } else {
      const v = responseValue(); if (!v.ok) throw new Error('Expected success fixture');
      const invalid = level === 'response' ? {...v, extra: true}
        : level === 'data' ? {...v, data: {...v.data, extra: true}}
          : {...v, data: {...v.data, film: {...v.data.film, extra: true}}};
      expect(() => parseFilmResponse('reserveFilmUpload', invalid)).toThrow(FilmContractValidationError);
    }
  });
  test.each([null, [], 1, '', {}, {schemaVersion: 'coach-film.v2'}, {ok: 'true'}])('malformed message %j fails closed', value => {
    expect(() => parseFilmRequest('reserveFilmUpload', value)).toThrow(FilmContractValidationError);
    expect(decodeFilmResponse('reserveFilmUpload', value)).toEqual({clientFailure: {kind: 'protocol', category: 'response-invalid', retryEligible: false}});
  });
  test.each(['2026-02-30T00:00:00.000Z', '2026-10-19T21:15:00Z', '2026-10-19T21:15:00.000+00:00', 1760908500000])('timestamp %j rejected by both', value => {
    expect(server.schemas.isoTimestamp.safeParse(value).success).toBe(false);
    expect(() => parseTimestamp(value)).toThrow(FilmContractValidationError);
  });
  test.each(['  Cafe\u0301.mp4 ', '\tCafé.mp4\n', '\u00a0Café.mp4\u00a0'])('canonical filename %j matches server without changing operation identity', fileName => {
    const v = requestValue(); v.payload = {...v.payload as object, fileName};
    const parsed = parseFilmRequest('reserveFilmUpload', v);
    expect(parsed.payload.fileName).toBe('Café.mp4');
    expect(parsed.operationId).toBe(v.operationId);
    expect(parsed).toEqual(server.schemas.reserveRequest.safeParse(v).data);
    expect(canonicalizeFileName(fileName)).toBe('Café.mp4');
    expect(parseFilmRequest('reserveFilmUpload', parsed)).toEqual(parsed);
  });
  test.each(['a\u0000.mp4', 'a\u0085.mp4', ' ', '😀'.repeat(61)])('invalid filename %j rejected', fileName => {
    const v = requestValue(); v.payload = {...v.payload as object, fileName};
    expect(server.schemas.reserveRequest.safeParse(v).success).toBe(false);
    expect(() => parseFilmRequest('reserveFilmUpload', v)).toThrow(FilmContractValidationError);
  });
  test.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '1'])('invalid byte value %j rejected by both', declaredBytes => {
    const v = requestValue(); v.payload = {...v.payload as object, declaredBytes};
    expect(server.schemas.reserveRequest.safeParse(v).success).toBe(false);
    expect(() => parseFilmRequest('reserveFilmUpload', v)).toThrow(FilmContractValidationError);
  });
  test('opaque string bounds match Zod4 code-point semantics; filename has separate UTF-16 contract', () => {
    const v = requestValue();
    v.payload = {...v.payload as object, declaredContentType: '😀'.repeat(100), rightsWordingVersion: '😀'.repeat(40)};
    expect(parseFilmRequest('reserveFilmUpload', v)).toEqual(server.schemas.reserveRequest.safeParse(v).data);
    const film = {...stateValue(), createdBy: '😀'.repeat(128)};
    expect(parseFilmState(film)).toEqual(server.schemas.filmState.safeParse(film).data);
  });
  test('state ready is representable but a reserve receipt cannot claim ready', () => {
    const film = {...stateValue(), status: 'ready', objectGeneration: '123'};
    expect(parseFilmState(film).status).toBe('ready');
    const v = responseValue(); if (!v.ok) throw new Error('Expected success');
    expect(() => parseFilmResponse('reserveFilmUpload', {...v, data: {...v.data, film}})).toThrow(FilmContractValidationError);
  });
  test('historical receipt parses unchanged after expiry; parsing never claims live upload permission', () => {
    const v = responseValue(); if (!v.ok) throw new Error('Expected success');
    expect(Date.parse(v.data.expiresAt)).toBeLessThan(Date.parse('2030-01-01T00:00:00.000Z'));
    expect(parseFilmResponse('reserveFilmUpload', v)).toEqual(v);
    // No freshness inference/new operation ID. Current-document/rules checks belong to later upload integration.
    const req = requestValue(); expect(parseFilmRequest('reserveFilmUpload', req).operationId).toBe(req.operationId);
    expect(parseFilmResponse('reserveFilmUpload', load('error.failed-precondition.operation-expired.json'))).toEqual({
      ok: false, error: {code: 'failed-precondition', reason: 'operation-expired', retryable: false},
    });
  });
});

describe('FS-26 distinct local failures, no retry executor', () => {
  test.each(SDK_ERROR_CATEGORIES)('SDK %s stays distinct and sanitizes details', category => {
    const failure = classifyCallableFailure({code: `functions/${category}`, message: 'PRIVATE_SENTINEL', details: {token: 'PRIVATE_SENTINEL'}});
    expect(failure).toEqual({clientFailure: {kind: 'sdk', category, retryEligible: ['unavailable', 'deadline-exceeded'].includes(category)}});
    expect(server.schemas.clientFailure.safeParse(failure).success).toBe(true);
    expect(JSON.stringify(failure)).not.toContain('PRIVATE_SENTINEL');
    expect(() => parseFilmResponse('reserveFilmUpload', failure)).toThrow(FilmContractValidationError);
  });
  test.each([new TypeError('fetch failed'), null, {}, {code: 'unrecognized'}, {code: 'auth/permission-denied'}])('unknown thrown error is not assumed transient: %j', error => {
    expect(classifyCallableFailure(error)).toEqual({clientFailure: {kind: 'sdk', category: 'unknown', retryEligible: false}});
  });
  test('network classification requires explicit caller evidence; malformed resolutions are protocol failures', () => {
    expect(networkFailure()).toEqual(load('client-failure.network.network.json'));
    expect(decodeFilmResponse('reserveFilmUpload', {ok: false, error: {code: 'unavailable', retryable: true, reason: 'transport'}}))
      .toEqual(load('client-failure.protocol.response-invalid.json'));
    expect(() => parseClientFailure(load('error.unavailable.backend-unavailable.json'))).toThrow(FilmContractValidationError);
  });
});


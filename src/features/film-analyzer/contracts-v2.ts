import {parseFilmResponse as parseR3Response} from './contracts';
/** coach-film.v2 client mirror. Authoritative contract revision:
 * 6764af9edd7ab258f55c4eeb19e80a4649b8c86b. No Firebase/provider calls.
 * Policy values are emulator/test placeholders, NOT production approvals.
 * A reservation receipt is historical acknowledgement, NEVER upload permission.
 */
export const FILM_CONTRACT_REVISION = '6764af9edd7ab258f55c4eeb19e80a4649b8c86b';
export const CONTRACT_VERSION = 'coach-film.v2';
export const ACTION_NAMES = ['reserveFilmUpload', 'abandonFilmUpload'] as const;
export type FilmAction = typeof ACTION_NAMES[number];
export const FILM_STATUSES = ['reserved', 'validating', 'ready', 'rejected', 'abandoned', 'expired'] as const;
export type FilmStatus = typeof FILM_STATUSES[number];
export const SLOT_HOLDING_STATUSES = ['reserved', 'validating', 'ready'] as const;
export const TERMINAL_STATUSES = ['rejected', 'abandoned', 'expired'] as const;
export const TRANSITIONS: Readonly<Record<FilmStatus, readonly FilmStatus[]>> = {
  reserved: ['validating', 'rejected', 'abandoned', 'expired'],
  validating: ['ready', 'rejected', 'abandoned'], ready: [], rejected: [], abandoned: [], expired: [],
};
export const S1_REJECTION_REASONS = ['size-mismatch', 'content-type-mismatch', 'signature-invalid'] as const;
export const WORKER_REJECTION_REASONS = ['container-invalid', 'metadata-invalid', 'video-stream-missing',
  'video-codec-not-allowed', 'audio-codec-not-allowed', 'stream-count-exceeded', 'duration-over-limit',
  'resolution-over-limit', 'media-corrupt', 'output-invalid', 'processing-limit-exceeded'] as const;
export const REJECTION_REASONS = [...S1_REJECTION_REASONS, ...WORKER_REJECTION_REASONS] as const;
export const NEW_FILM_KEYS = ['readyAt', 'normalizedGeneration', 'media', 'retentionExpiresAt'] as const;
export const PREVIOUS_CONTRACT_VERSION = 'coach-film.v1';
export const FILM_TIMESTAMP_FIELDS = ['createdAt', 'statusChangedAt', 'reservationExpiresAt', 'rightsAcknowledgedAt', 'abandonedAt', 'readyAt', 'retentionExpiresAt'] as const;
export const ERROR_REASONS = {
  unauthenticated: ['sign-in-required', 'account-disabled'],
  'permission-denied': ['anonymous-not-allowed', 'email-not-verified', 'beta-access-required', 'not-team-owner'],
  'invalid-argument': ['schema-invalid', 'action-mismatch', 'rights-acknowledgement-required', 'unsupported-version'],
  'limit-exceeded': ['bytes-over-limit', 'format-not-allowed'],
  'team-cap-reached': ['team-film-cap'],
  'failed-precondition': ['rights-wording-outdated', 'film-not-found', 'invalid-state', 'operation-expired', 'legacy-record-invalid'],
  conflict: ['operation-id-reused'], unavailable: ['backend-unavailable'],
} as const;
export type FilmErrorCode = keyof typeof ERROR_REASONS;
export const ERROR_CODES = Object.keys(ERROR_REASONS) as FilmErrorCode[];
export const RETRYABLE = {
  unauthenticated: false, 'permission-denied': false, 'invalid-argument': false,
  'limit-exceeded': false, 'team-cap-reached': false, 'failed-precondition': false,
  conflict: false, unavailable: true,
} as const;
export type FilmServerError = { [C in FilmErrorCode]: {
  code: C; reason: typeof ERROR_REASONS[C][number]; retryable: typeof RETRYABLE[C];
} }[FilmErrorCode];
export const SDK_ERROR_CATEGORIES = ['cancelled', 'unknown', 'invalid-argument', 'deadline-exceeded',
  'not-found', 'already-exists', 'permission-denied', 'resource-exhausted', 'failed-precondition',
  'aborted', 'out-of-range', 'unimplemented', 'internal', 'unavailable', 'data-loss', 'unauthenticated'] as const;
export type SdkCategory = typeof SDK_ERROR_CATEGORIES[number];
export type ClientFailure = { clientFailure:
  | { kind: 'protocol'; category: 'response-invalid'; retryEligible: false }
  | { kind: 'network'; category: 'network'; retryEligible: true }
  | { [C in SdkCategory]: { kind: 'sdk'; category: C;
      retryEligible: C extends 'unavailable' | 'deadline-exceeded' ? true : false } }[SdkCategory]
};
export const TEST_POLICY_PLACEHOLDERS = {
  status: 'TEST_PLACEHOLDER_NOT_APPROVED',
  PENDING_D3: { maxBytes: 100000000, maxDurationMs: 300000, maxWidth: 1920, maxHeight: 1080,
    teamFilmCap: 20, allowedContentTypes: ['video/mp4'] },
  PENDING_D7: { acceptedRightsWordingVersions: ['rights-v1'] },
  DELEGATED: { reservationLifetimeMs: 3600000, operationReplayWindowMs: 86400000, maxFileNameLength: 120 },
} as const;
export interface ReservePayload {
  teamId: string; declaredBytes: number; declaredContentType: string; fileName: string;
  rightsAcknowledged: boolean; rightsWordingVersion: string;
}
export interface AbandonPayload { teamId: string; filmId: string }
export interface PayloadByAction { reserveFilmUpload: ReservePayload; abandonFilmUpload: AbandonPayload }
export type FilmRequest<A extends FilmAction = FilmAction> = { [K in A]: {
  schemaVersion: typeof CONTRACT_VERSION; operationId: string; action: K; payload: PayloadByAction[K];
} }[A];
export interface Media {
  bytes: number; durationMs: number; width: number; height: number;
  videoCodec: 'h264'; audioCodec: 'aac' | null; frameRateMode: 'cfr' | 'vfr'; sha256: string;
}
export interface FilmState {
  filmId: string; teamId: string; createdBy: string; status: FilmStatus;
  createdAt: string; statusChangedAt: string; reservationExpiresAt: string;
  declaredBytes: number; declaredContentType: string; fileName: string;
  rightsWordingVersion: string; rightsAcknowledgedAt: string; uploadPath: string;
  objectGeneration: string | null; rejectionReason: typeof REJECTION_REASONS[number] | null;
  abandonedAt: string | null;
  readyAt: string | null; normalizedGeneration: string | null; media: Media | null; retentionExpiresAt: null;
}
export interface ReserveData { filmId: string; uploadPath: string; expiresAt: string; film: FilmState }
export interface AbandonData { filmId: string; previousStatus: 'reserved' | 'validating' | 'abandoned'; film: FilmState }
export interface DataByAction { reserveFilmUpload: ReserveData; abandonFilmUpload: AbandonData }
export type FilmResponse<A extends FilmAction = FilmAction> =
  | { ok: true; data: DataByAction[A] } | { ok: false; error: FilmServerError };

/** No input, SDK message, path or raw details in validation errors. */
export class FilmContractValidationError extends Error {
  constructor() { super('Invalid coach-film.v2 message'); this.name = 'FilmContractValidationError'; }
}
function check(condition: unknown): asserts condition {
  if (!condition) throw new FilmContractValidationError();
}
function object(value: unknown): Record<string, unknown> {
  check(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Record<string, unknown>;
}
function strict(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const v = object(value);
  check(Object.keys(v).length === keys.length && keys.every(k => Object.prototype.hasOwnProperty.call(v, k)));
  return v;
}
function text(value: unknown, max: number, pattern?: RegExp): asserts value is string {
  // Zod4 string length bounds count Unicode code points. Filename below has
  // an additional normative UTF-16 code-unit bound; do not conflate them.
  check(typeof value === 'string' && value.length >= 1 && Array.from(value).length <= max && (!pattern || pattern.test(value)));
}
function member<T extends string>(value: unknown, values: readonly T[]): asserts value is T {
  check(typeof value === 'string' && (values as readonly string[]).includes(value));
}
function integer(value: unknown): asserts value is number { check(typeof value === 'number' && Number.isSafeInteger(value) && value >= 1); }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TEAM = /^[A-Za-z0-9_-]+$/;
const CONTROLS = /[\u0000-\u001f\u007f-\u009f]/;
export function parseTimestamp(value: unknown): string {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value));
  check(!Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value);
  return value;
}
export function canonicalizeFileName(name: string): string { return name.normalize('NFC').trim(); }
function fileName(value: unknown, stored: boolean): string {
  check(typeof value === 'string');
  const canonical = canonicalizeFileName(value);
  text(canonical, 120); check(canonical.length <= 120 && !CONTROLS.test(canonical) && (!stored || value === canonical));
  return canonical;
}
export function uploadPathFor(team: string, film: string): string { return `quarantine/${team}/${film}/source.mp4`; }

export function parseFilmRequest<A extends FilmAction>(action: A, value: unknown): FilmRequest<A> {
  member(action, ACTION_NAMES);
  const v = strict(value, ['schemaVersion', 'operationId', 'action', 'payload']);
  check(v.schemaVersion === CONTRACT_VERSION && v.action === action); text(v.operationId, 36, UUID);
  const keys = action === 'reserveFilmUpload'
    ? ['teamId', 'declaredBytes', 'declaredContentType', 'fileName', 'rightsAcknowledged', 'rightsWordingVersion']
    : ['teamId', 'filmId'];
  const p = strict(v.payload, keys); text(p.teamId, 128, TEAM);
  if (action === 'reserveFilmUpload') {
    integer(p.declaredBytes); text(p.declaredContentType, 100); text(p.rightsWordingVersion, 40);
    check(typeof p.rightsAcknowledged === 'boolean');
    return { ...v, payload: { ...p, fileName: fileName(p.fileName, false) } } as FilmRequest<A>;
  }
  text(p.filmId, 36, UUID);
  return { schemaVersion: CONTRACT_VERSION, operationId: v.operationId, action, payload: { ...p } } as unknown as FilmRequest<A>;
}

export const FILM_KEYS = ['filmId', 'teamId', 'createdBy', 'status', 'createdAt', 'statusChangedAt',
    'reservationExpiresAt', 'declaredBytes', 'declaredContentType', 'fileName', 'rightsWordingVersion',
    'rightsAcknowledgedAt', 'uploadPath', 'objectGeneration', 'rejectionReason', 'abandonedAt', ...NEW_FILM_KEYS] as const;
export function parseFilmState(value: unknown): FilmState {
  const v = strict(value, FILM_KEYS);
  text(v.filmId, 36, UUID); text(v.teamId, 128, TEAM); text(v.createdBy, 128);
  member(v.status, FILM_STATUSES); integer(v.declaredBytes); text(v.declaredContentType, 100);
  fileName(v.fileName, true); text(v.rightsWordingVersion, 40); text(v.uploadPath, 300);
  for (const key of FILM_TIMESTAMP_FIELDS) if (v[key] !== null) parseTimestamp(v[key]);
  if (v.objectGeneration !== null) text(v.objectGeneration, 20, /^[1-9][0-9]{0,19}$/);
  if (v.rejectionReason !== null) member(v.rejectionReason, REJECTION_REASONS);
  check(v.uploadPath === uploadPathFor(v.teamId, v.filmId));
  check((v.abandonedAt !== null) === (v.status === 'abandoned'));
  check((v.rejectionReason !== null) === (v.status === 'rejected'));
  if (v.status === 'reserved' || v.status === 'expired') check(v.objectGeneration === null);
  if (['validating', 'ready', 'rejected'].includes(v.status)) check(v.objectGeneration !== null);
  const ms = (key: string) => Date.parse(v[key] as string);
  check(ms('rightsAcknowledgedAt') <= ms('createdAt') && ms('createdAt') < ms('reservationExpiresAt'));
  check(ms('statusChangedAt') >= ms('createdAt'));
  if (v.status === 'reserved') check(ms('statusChangedAt') === ms('createdAt'));
  if (v.status === 'expired') check(ms('statusChangedAt') >= ms('reservationExpiresAt'));
  if (v.status === 'validating' || (v.status === 'rejected' && (S1_REJECTION_REASONS as readonly unknown[]).includes(v.rejectionReason))) check(ms('statusChangedAt') < ms('reservationExpiresAt'));
  if (v.status === 'abandoned') check(v.abandonedAt === v.statusChangedAt);
  const ready = v.status === 'ready';
  for (const key of ['readyAt', 'normalizedGeneration', 'media']) check((v[key] !== null) === ready);
  if (v.normalizedGeneration !== null) text(v.normalizedGeneration, 20, /^[1-9][0-9]{0,19}$/);
  check(v.retentionExpiresAt === null);
  if (ready) check(v.readyAt === v.statusChangedAt);
  return { ...v, media: v.media === null ? null : parseMedia(v.media) } as unknown as FilmState;
}

export function parseServerError(value: unknown): FilmServerError {
  const e = strict(value, ['code', 'reason', 'retryable']);
  member(e.code, Object.keys(ERROR_REASONS) as FilmErrorCode[]);
  member(e.reason, ERROR_REASONS[e.code]); check(e.retryable === RETRYABLE[e.code]);
  return { ...e } as FilmServerError;
}
export function parseFilmResponse<A extends FilmAction>(action: A, value: unknown): FilmResponse<A> {
  member(action, ACTION_NAMES);
  const shape = object(value);
  if (shape.ok === false) { const v = strict(value, ['ok', 'error']); return { ok: false, error: parseServerError(v.error) }; }
  const v = strict(value, ['ok', 'data']); check(v.ok === true);
  const d = strict(v.data, action === 'reserveFilmUpload'
    ? ['filmId', 'uploadPath', 'expiresAt', 'film'] : ['filmId', 'previousStatus', 'film']);
  text(d.filmId, 36, UUID); const film = parseFilmState(d.film); check(d.filmId === film.filmId);
  if (action === 'reserveFilmUpload') {
    text(d.uploadPath, 300); parseTimestamp(d.expiresAt);
    check(d.uploadPath === film.uploadPath && d.expiresAt === film.reservationExpiresAt && film.status === 'reserved');
  } else {
    member(d.previousStatus, ['reserved', 'validating', 'abandoned']); check(film.status === 'abandoned');
    if (d.previousStatus === 'reserved') check(film.objectGeneration === null);
    if (d.previousStatus === 'validating') check(film.objectGeneration !== null);
  }
  return { ok: true, data: { ...d, film } } as FilmResponse<A>;
}
export function parseClientFailure(value: unknown): ClientFailure {
  const v = strict(value, ['clientFailure']); const f = strict(v.clientFailure, ['kind', 'category', 'retryEligible']);
  member(f.kind, ['protocol', 'network', 'sdk']);
  if (f.kind === 'protocol') check(f.category === 'response-invalid' && f.retryEligible === false);
  if (f.kind === 'network') check(f.category === 'network' && f.retryEligible === true);
  if (f.kind === 'sdk') { member(f.category, SDK_ERROR_CATEGORIES); check(f.retryEligible === (f.category === 'unavailable' || f.category === 'deadline-exceeded')); }
  return { clientFailure: { ...f } } as ClientFailure;
}
/** Use only when the caller has established no HTTP response, not for any TypeError. */
export function networkFailure(): ClientFailure { return { clientFailure: { kind: 'network', category: 'network', retryEligible: true } }; }
/** Never retain SDK message/details; unknown errors fail closed, without guessing a server reason. */
export function classifyCallableFailure(error: unknown): ClientFailure {
  const raw = error !== null && typeof error === 'object' && 'code' in error ? (error as {code: unknown}).code : undefined;
  const code = typeof raw === 'string' ? raw.replace(/^functions\//, '') : '';
  const category: SdkCategory = (SDK_ERROR_CATEGORIES as readonly string[]).includes(code) ? code as SdkCategory : 'unknown';
  return parseClientFailure({ clientFailure: { kind: 'sdk', category, retryEligible: category === 'unavailable' || category === 'deadline-exceeded' } });
}
/** Resolved malformed values are protocol failures, NEVER retryable transport/server errors. */
export function decodeFilmResponse<A extends FilmAction>(action: A, value: unknown): FilmResponse<A> | ClientFailure {
  try { return parseFilmResponse(action, value); } catch (error) {
    if (!(error instanceof FilmContractValidationError)) throw error;
    return { clientFailure: { kind: 'protocol', category: 'response-invalid', retryEligible: false } };
  }
}


/** Normalized-output facts; bounds are PENDING_D3, never production approval. */
export function parseMedia(value: unknown): Media {
  const m = strict(value, ['bytes', 'durationMs', 'width', 'height', 'videoCodec', 'audioCodec', 'frameRateMode', 'sha256']);
  for (const key of ['bytes', 'durationMs', 'width', 'height']) integer(m[key]);
  const limits = TEST_POLICY_PLACEHOLDERS.PENDING_D3;
  check((m.bytes as number) <= limits.maxBytes && (m.durationMs as number) <= limits.maxDurationMs);
  check((m.width as number) >= 2 && (m.width as number) <= limits.maxWidth);
  check((m.height as number) >= 2 && (m.height as number) <= limits.maxHeight);
  check(m.videoCodec === 'h264' && (m.audioCodec === null || m.audioCodec === 'aac'));
  member(m.frameRateMode, ['cfr', 'vfr']); text(m.sha256, 64, /^[0-9a-f]{64}$/);
  return {...m} as unknown as Media;
}
/** Missing new keys are tolerated ONLY at this stored-document boundary. */
export function parseFilmDocument(value: unknown): FilmState {
  const v = object(value); const out = {...v};
  if (v.status !== 'ready') for (const key of NEW_FILM_KEYS) if (!(key in out)) out[key] = null;
  return parseFilmState(out);
}
export const PENDING_LIMITS = {maxBytes: 'PENDING_D3', maxDurationMs: 'PENDING_D3', maxWidth: 'PENDING_D3', maxHeight: 'PENDING_D3'} as const;
export const WORKER_ATTEMPT_POLICY = {status: 'TEST_ONLY', maxAdmittedAttempts: 3, admissionHorizonMs: 21600000, platformRetry: false} as const;
export const CLASSIFIED_LIMIT_KILLS = ['SIGXCPU', 'wall-time', 'SIGXFSZ', 'allocation-failure'] as const;
export const LIMIT_KILL_SIGNALS = [...CLASSIFIED_LIMIT_KILLS, 'SIGKILL'] as const;
export const PIPELINE_STEPS = ['probe-input', 'decode-input', 'normalize', 'probe-output', 'decode-output'] as const;
export const MEDIA_VERDICT_REASONS = WORKER_REJECTION_REASONS.filter(r => r !== 'processing-limit-exceeded');
export type PipelineStep = typeof PIPELINE_STEPS[number];
export type MediaVerdictReason = typeof MEDIA_VERDICT_REASONS[number];
export interface AdmissionInput {
  delivery: 'process' | 'duplicate' | 'contention'; configurationOk: boolean;
  admitted: number; jobCreatedAtMs: number; nowMs: number;
}
export type AttemptRecord =
  | {end: 'media-verdict'; reason: MediaVerdictReason}
  | {end: 'limit-kill'; kill: typeof LIMIT_KILL_SIGNALS[number]; step: PipelineStep}
  | {end: 'infrastructure' | 'unknown' | 'crash' | 'completed'};
function safeMs(value: unknown): asserts value is number { check(typeof value === 'number' && Number.isSafeInteger(value) && value >= 0); }
export function parseAdmissionInput(value: unknown): AdmissionInput {
  const v = strict(value, ['delivery', 'configurationOk', 'admitted', 'jobCreatedAtMs', 'nowMs']);
  member(v.delivery, ['process', 'duplicate', 'contention']); check(typeof v.configurationOk === 'boolean');
  safeMs(v.admitted); check(v.admitted <= 3); safeMs(v.jobCreatedAtMs); safeMs(v.nowMs); check(v.nowMs >= v.jobCreatedAtMs);
  return {...v} as unknown as AdmissionInput;
}
export function parseAttemptRecord(value: unknown): AttemptRecord {
  const o = object(value); member(o.end, ['media-verdict', 'limit-kill', 'infrastructure', 'unknown', 'crash', 'completed']);
  const v = strict(value, o.end === 'media-verdict' ? ['end', 'reason'] : o.end === 'limit-kill' ? ['end', 'kill', 'step'] : ['end']);
  if (v.end === 'media-verdict') member(v.reason, MEDIA_VERDICT_REASONS);
  if (v.end === 'limit-kill') { member(v.kill, LIMIT_KILL_SIGNALS); member(v.step, PIPELINE_STEPS); }
  return {...v} as AttemptRecord;
}
export function parseExhaustionInput(value: unknown): AttemptRecord[] {
  check(Array.isArray(value) && value.length >= 1 && value.length <= 3);
  const a = value.map(parseAttemptRecord);
  check(a.slice(0, -1).every(x => x.end !== 'media-verdict' && x.end !== 'completed')); return a;
}
export type AdmissionDecision = {admit: boolean; consumes: boolean; outcome: 'invalid-input' | 'skip-duplicate' | 'skip-contention' | 'stalled-configuration' | 'refused-exhausted' | 'refused-horizon' | 'admitted'};
/** Pure contract calculation only: no transaction, executor or retry activation. */
export function admissionDecision(value: unknown): AdmissionDecision {
  let d: AdmissionInput;
  try { d = parseAdmissionInput(value); } catch (e) { if (!(e instanceof FilmContractValidationError)) throw e; return {admit: false, consumes: false, outcome: 'invalid-input'}; }
  const no = (outcome: AdmissionDecision['outcome']): AdmissionDecision => ({admit: false, consumes: false, outcome});
  if (d.delivery !== 'process') return no(d.delivery === 'duplicate' ? 'skip-duplicate' : 'skip-contention');
  if (!d.configurationOk) return no('stalled-configuration');
  if (d.admitted >= 3) return no('refused-exhausted');
  if (d.nowMs >= d.jobCreatedAtMs + WORKER_ATTEMPT_POLICY.admissionHorizonMs) return no('refused-horizon');
  return {admit: true, consumes: true, outcome: 'admitted'};
}
export type ExhaustionOutcome = {outcome: 'invalid-input' | 'completed' | 'recovery-needed'; reason: null} | {outcome: 'rejected'; reason: typeof WORKER_REJECTION_REASONS[number]};
export function exhaustionOutcome(value: unknown): ExhaustionOutcome {
  let a: AttemptRecord[];
  try { a = parseExhaustionInput(value); } catch (e) { if (!(e instanceof FilmContractValidationError)) throw e; return {outcome: 'invalid-input', reason: null}; }
  const last = a[a.length - 1];
  if (last.end === 'media-verdict') return {outcome: 'rejected', reason: last.reason};
  if (last.end === 'completed') return {outcome: 'completed', reason: null};
  const classified = (x: AttemptRecord) => x.end === 'limit-kill' && (CLASSIFIED_LIMIT_KILLS as readonly string[]).includes(x.kill);
  if (last.end === 'limit-kill' && classified(last) && a.slice(0, -1).some(x => x.end === 'limit-kill' && classified(x) && x.step === last.step)) return {outcome: 'rejected', reason: 'processing-limit-exceeded'};
  return {outcome: 'recovery-needed', reason: null};
}
export function errorResponseFor(code: FilmErrorCode, reason: FilmServerError['reason']): {ok: false; error: FilmServerError} {
  return {ok: false, error: parseServerError({code, reason, retryable: RETRYABLE[code]})};
}
export const SUPPORTED_RECEIPT_STATUS = {reserveFilmUpload: 'reserved', abandonFilmUpload: 'abandoned'} as const;
const legacyInvalid = () => errorResponseFor('failed-precondition', 'legacy-record-invalid');
export type Projection = {ok: true; response: FilmResponse} | {ok: false; error: ReturnType<typeof legacyInvalid>};
/** Historical acknowledgement only. Original bytes are never rewritten. */
export function projectR3SuccessToV2(action: FilmAction, stored: unknown): Projection {
  try {
    check(typeof stored === 'string'); const raw: unknown = JSON.parse(stored);
    const v1 = parseR3Response(action, raw); check(v1.ok);
    check(v1.data.film.status === SUPPORTED_RECEIPT_STATUS[action]);
    const film: Record<string, unknown> = {};
    for (const key of FILM_KEYS) film[key] = (NEW_FILM_KEYS as readonly string[]).includes(key) ? null : (v1.data.film as unknown as Record<string, unknown>)[key];
    return {ok: true, response: parseFilmResponse(action, {ok: true, data: {...v1.data, film}})};
  } catch { return {ok: false, error: legacyInvalid()}; }
}
export interface StoredOperation {schemaVersion?: typeof CONTRACT_VERSION; action: FilmAction; payloadHash: string; responseJson: string; replayableUntilMs: number}
export interface ReplayQuery {requestSchemaVersion: string; action: FilmAction; payloadHash: string; nowMs: number; stored?: unknown; liveFilmStatus?: FilmStatus}
export function parseReplayQuery(value: unknown): ReplayQuery {
  const v = object(value); const keys = ['requestSchemaVersion', 'action', 'payloadHash', 'nowMs'];
  check(Object.keys(v).every(k => [...keys, 'stored', 'liveFilmStatus'].includes(k)) && keys.every(k => Object.prototype.hasOwnProperty.call(v, k)));
  check(typeof v.requestSchemaVersion === 'string'); member(v.action, ACTION_NAMES); check(typeof v.payloadHash === 'string' && Array.from(v.payloadHash).length >= 1); safeMs(v.nowMs);
  if (v.liveFilmStatus !== undefined) member(v.liveFilmStatus, FILM_STATUSES);
  return {...v} as unknown as ReplayQuery;
}
export function parseStoredOperation(value: unknown): StoredOperation {
  const v = object(value); const keys = ['action', 'payloadHash', 'responseJson', 'replayableUntilMs'];
  check(Object.keys(v).every(k => [...keys, 'schemaVersion'].includes(k)) && keys.every(k => Object.prototype.hasOwnProperty.call(v, k)));
  if (v.schemaVersion !== undefined) check(v.schemaVersion === CONTRACT_VERSION);
  member(v.action, ACTION_NAMES); check(typeof v.payloadHash === 'string' && Array.from(v.payloadHash).length >= 1); check(typeof v.responseJson === 'string'); safeMs(v.replayableUntilMs);
  return {...v} as unknown as StoredOperation;
}
export type ReplayDecision = {kind: 'invalid-input' | 'new-operation'} | {kind: 'error'; response: ReturnType<typeof errorResponseFor>} | {kind: 'replay'; responseJson: string} | {kind: 'replay'; response: FilmResponse};
export function decideReplay(value: unknown): ReplayDecision {
  let q: ReplayQuery;
  try { q = parseReplayQuery(value); } catch { return {kind: 'invalid-input'}; }
  const err = (code: FilmErrorCode, reason: FilmServerError['reason']): ReplayDecision => ({kind: 'error', response: errorResponseFor(code, reason)});
  const v1 = q.requestSchemaVersion === PREVIOUS_CONTRACT_VERSION;
  if (!v1 && q.requestSchemaVersion !== CONTRACT_VERSION) return err('invalid-argument', 'schema-invalid');
  if (q.stored === null || q.stored === undefined) return v1 ? err('invalid-argument', 'unsupported-version') : {kind: 'new-operation'};
  let s: StoredOperation;
  try { s = parseStoredOperation(q.stored); } catch { return {kind: 'error', response: legacyInvalid()}; }
  if (s.action !== q.action || s.payloadHash !== q.payloadHash) return err('conflict', 'operation-id-reused');
  if (q.nowMs >= s.replayableUntilMs) return err('failed-precondition', 'operation-expired');
  let response: FilmResponse;
  if (s.schemaVersion === CONTRACT_VERSION) {
    try { response = parseFilmResponse(s.action, JSON.parse(s.responseJson)); check(response.ok && response.data.film.status === SUPPORTED_RECEIPT_STATUS[s.action]); }
    catch { return {kind: 'error', response: legacyInvalid()}; }
  } else { const p = projectR3SuccessToV2(s.action, s.responseJson); if (!p.ok) return {kind: 'error', response: p.error}; response = p.response; }
  if (v1) return s.schemaVersion === CONTRACT_VERSION ? err('invalid-argument', 'unsupported-version') : {kind: 'replay', responseJson: s.responseJson};
  return {kind: 'replay', response};
}

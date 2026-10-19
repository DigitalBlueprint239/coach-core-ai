/** coach-film.v1 client mirror. Authoritative contract revision:
 * 8f7723952bdf38c18d12d8f2611e87830b658467. No Firebase/provider calls.
 * Policy values are emulator/test placeholders, NOT production approvals.
 * A reservation receipt is historical acknowledgement, NEVER upload permission.
 */
export const FILM_CONTRACT_REVISION = '8f7723952bdf38c18d12d8f2611e87830b658467';
export const CONTRACT_VERSION = 'coach-film.v1';
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
export const REJECTION_REASONS = ['size-mismatch', 'content-type-mismatch', 'signature-invalid'] as const;
export const FILM_TIMESTAMP_FIELDS = ['createdAt', 'statusChangedAt', 'reservationExpiresAt', 'rightsAcknowledgedAt', 'abandonedAt'] as const;
export const ERROR_REASONS = {
  unauthenticated: ['sign-in-required', 'account-disabled'],
  'permission-denied': ['anonymous-not-allowed', 'email-not-verified', 'beta-access-required', 'not-team-owner'],
  'invalid-argument': ['schema-invalid', 'action-mismatch', 'rights-acknowledgement-required'],
  'limit-exceeded': ['bytes-over-limit', 'format-not-allowed'],
  'team-cap-reached': ['team-film-cap'],
  'failed-precondition': ['rights-wording-outdated', 'film-not-found', 'invalid-state', 'operation-expired'],
  conflict: ['operation-id-reused'], unavailable: ['backend-unavailable'],
} as const;
export type FilmErrorCode = keyof typeof ERROR_REASONS;
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
export interface FilmState {
  filmId: string; teamId: string; createdBy: string; status: FilmStatus;
  createdAt: string; statusChangedAt: string; reservationExpiresAt: string;
  declaredBytes: number; declaredContentType: string; fileName: string;
  rightsWordingVersion: string; rightsAcknowledgedAt: string; uploadPath: string;
  objectGeneration: string | null; rejectionReason: typeof REJECTION_REASONS[number] | null;
  abandonedAt: string | null;
}
export interface ReserveData { filmId: string; uploadPath: string; expiresAt: string; film: FilmState }
export interface AbandonData { filmId: string; previousStatus: 'reserved' | 'validating' | 'abandoned'; film: FilmState }
export interface DataByAction { reserveFilmUpload: ReserveData; abandonFilmUpload: AbandonData }
export type FilmResponse<A extends FilmAction = FilmAction> =
  | { ok: true; data: DataByAction[A] } | { ok: false; error: FilmServerError };

/** No input, SDK message, path or raw details in validation errors. */
export class FilmContractValidationError extends Error {
  constructor() { super('Invalid coach-film.v1 message'); this.name = 'FilmContractValidationError'; }
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

export function parseFilmState(value: unknown): FilmState {
  const v = strict(value, ['filmId', 'teamId', 'createdBy', 'status', 'createdAt', 'statusChangedAt',
    'reservationExpiresAt', 'declaredBytes', 'declaredContentType', 'fileName', 'rightsWordingVersion',
    'rightsAcknowledgedAt', 'uploadPath', 'objectGeneration', 'rejectionReason', 'abandonedAt']);
  text(v.filmId, 36, UUID); text(v.teamId, 128, TEAM); text(v.createdBy, 128);
  member(v.status, FILM_STATUSES); integer(v.declaredBytes); text(v.declaredContentType, 100);
  fileName(v.fileName, true); text(v.rightsWordingVersion, 40); text(v.uploadPath, 300);
  for (const key of FILM_TIMESTAMP_FIELDS) if (key !== 'abandonedAt' || v[key] !== null) parseTimestamp(v[key]);
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
  if (v.status === 'validating' || v.status === 'rejected') check(ms('statusChangedAt') < ms('reservationExpiresAt'));
  if (v.status === 'abandoned') check(v.abandonedAt === v.statusChangedAt);
  return { ...v } as unknown as FilmState;
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


"use strict";
/**
 * LOST-FINALIZE-SOURCE (LFS-A, #39 c-6303623216 / r3.2 c-6303605492):
 * the dedicated, injected BOUNDED TRANSPORT BOUNDARY used by the quarantine
 * reconciler and its dedicated S1 handler instance (acceptance item #1).
 *
 * Storage: the pinned @google-cloud/storage request path (teeny-request over
 * node-fetch v3) exposes no abort hook and ignores `timeout` (measured,
 * reviewer LFS-10), so this facade issues the three JSON-API requests it
 * needs (list, ranged media read, generation-matched delete) itself, with a
 * facade-owned AbortController per request: exactly one HTTP request per
 * call, no retries, a hard per-request deadline that aborts the underlying
 * connection, and byte caps on every response body. It presents exactly the
 * Bucket/File surface the FROZEN S1 code calls (storage-adapter.readHead:
 * `file(name,{generation}).download({start,end})`;
 * cleanup.deleteExactGeneration: `file(name).delete({ifGenerationMatch})`),
 * so no frozen file changes.
 *
 * Auth (production branch): a facade-owned, deadline-bounded token provider
 * reading the Cloud Functions metadata server, cached and single-flight.
 * The emulator branch sends no credentials.
 *
 * Firestore: a dedicated pinned @google-cloud/firestore instance (gRPC) with
 * a finite per-RPC deadline and no gax-level retry codes for every RPC the
 * reconciler path issues; production auth comes from the same bounded token
 * provider. The SDK's own outer retry layers remain and are COUNTED, not
 * removed (see docs/film/FILM_LFS_RECONCILE.md §Transport).
 *
 * Local transport only: an aborted request may still have taken effect
 * remotely (e.g. a DELETE). Nothing here claims a rollback.
 *
 * TEST_ONLY. Constants are TEST placeholders (C1-D1 decides production).
 */

const LFS_TRANSPORT_LIMITS = Object.freeze({
  status: "TEST_PLACEHOLDER",
  /** Hard deadline per Storage HTTP request (<= C1 attemptBudgetMs). */
  storageRequestMs: 5000,
  /** Hard deadline for one metadata-server token request. */
  tokenRequestMs: 3000,
  /** Token refreshed when it expires within this margin. */
  tokenRefreshMarginMs: 60 * 1000,
  /** Body caps. */
  listResponseMaxBytes: 1024 * 1024,
  deleteResponseMaxBytes: 64 * 1024,
  tokenResponseMaxBytes: 64 * 1024,
  /** Per-RPC deadline configured on the dedicated Firestore client. */
  firestoreRpcMs: 2000,
});

const PROD_STORAGE_ENDPOINT = "https://storage.googleapis.com";
const METADATA_TOKEN_URL = "http://metadata.google.internal/computeMetadata/" +
  "v1/instance/service-accounts/default/token";

/** Error with a code the frozen S1 classifiers understand. */
class TransportError extends Error {
  /**
   * @param {string} message
   * @param {(number|string)} code HTTP status (number) or a local code
   */
  constructor(message, code) {
    super(message);
    this.name = "TransportError";
    this.code = code;
  }
}

/**
 * One bounded HTTP exchange: exactly one fetch, a facade-owned deadline that
 * aborts the underlying request (and its body), and a byte cap.
 * @param {object} o
 * @param {function} o.fetchImpl fetch (undici global by default)
 * @param {string} o.url
 * @param {string} o.method
 * @param {object} o.headers
 * @param {number} o.deadlineMs
 * @param {number} o.maxBytes body cap (exceeding it aborts -> error)
 * @param {object} [o.counter] {requests} incremented once per call
 * @return {Promise<{status: number, body: Buffer}>}
 */
async function boundedExchange(o) {
  const ac = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ac.abort();
  }, o.deadlineMs);
  if (o.counter) o.counter.requests = (o.counter.requests || 0) + 1;
  try {
    const res = await o.fetchImpl(o.url, {method: o.method,
      headers: o.headers, signal: ac.signal, redirect: "manual"});
    const chunks = [];
    let n = 0;
    if (res.body) {
      for await (const chunk of res.body) {
        n += chunk.length;
        if (n > o.maxBytes) {
          ac.abort();
          throw new TransportError("response exceeds cap", "body-over-cap");
        }
        chunks.push(Buffer.from(chunk));
      }
    }
    return {status: res.status, body: Buffer.concat(chunks)};
  } catch (e) {
    if (e instanceof TransportError) throw e;
    if (timedOut) throw new TransportError("deadline", "deadline");
    throw new TransportError("transport", (e && e.code) ? String(e.code)
        .slice(0, 64) : "transport");
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Facade-owned, deadline-bounded metadata-server token provider (production
 * branch). Single-flight and cached until near expiry.
 * @param {object} [o]
 * @return {{token: function(): Promise<string>, counter: object}}
 */
function createTokenProvider(o = {}) {
  const fetchImpl = o.fetchImpl || fetch;
  const url = o.url || METADATA_TOKEN_URL;
  const limits = o.limits || LFS_TRANSPORT_LIMITS;
  const now = o.nowMs || (() => Date.now());
  const counter = {requests: 0};
  let cached = null;
  let inflight = null;
  /** @return {Promise<string>} */
  async function token() {
    if (cached && cached.expiresAtMs - limits.tokenRefreshMarginMs > now()) {
      return cached.token;
    }
    if (!inflight) {
      inflight = (async () => {
        const r = await boundedExchange({fetchImpl, url, method: "GET",
          headers: {"Metadata-Flavor": "Google"},
          deadlineMs: limits.tokenRequestMs,
          maxBytes: limits.tokenResponseMaxBytes, counter});
        if (r.status !== 200) {
          throw new TransportError("token status", `token-${r.status}`);
        }
        let j;
        try {
          j = JSON.parse(r.body.toString("utf8"));
        } catch (_) {
          throw new TransportError("token body", "token-malformed");
        }
        if (typeof j.access_token !== "string" || !j.access_token ||
            !Number.isFinite(j.expires_in)) {
          throw new TransportError("token body", "token-malformed");
        }
        cached = {token: j.access_token,
          expiresAtMs: now() + j.expires_in * 1000};
        return cached.token;
      })().finally(() => {
        inflight = null;
      });
    }
    return inflight;
  }
  return {token, counter};
}

/**
 * Bounded Storage facade presenting the Bucket/File surface the frozen S1
 * code uses, plus a bounded list for the reconciler.
 * @param {object} o
 * @param {string} o.bucketName configured default bucket
 * @param {string} [o.endpoint] base URL; production default, or the
 *   emulator's (STORAGE_EMULATOR_HOST)
 * @param {?{token: function}} [o.tokenProvider] null = emulator (no auth)
 * @param {function} [o.fetchImpl]
 * @param {object} [o.limits]
 * @return {object} bucket facade
 */
function createBoundedStorage(o) {
  const fetchImpl = o.fetchImpl || fetch;
  const limits = o.limits || LFS_TRANSPORT_LIMITS;
  const base = (o.endpoint || PROD_STORAGE_ENDPOINT).replace(/\/+$/, "");
  const counter = {requests: 0};
  const b = encodeURIComponent(o.bucketName);
  const obj = (name) => `${base}/storage/v1/b/${b}/o/` +
    encodeURIComponent(name);
  const headers = async (extra = {}) => {
    const h = {...extra};
    if (o.tokenProvider) {
      h.Authorization = `Bearer ${await o.tokenProvider.token()}`;
    }
    return h;
  };
  const fail = (status, what) => {
    throw new TransportError(`${what} ${status}`, status);
  };
  const facade = {
    name: o.bucketName,
    counter,
    /**
     * @param {string} name
     * @param {{generation: string}} [fo]
     * @return {object} File facade
     */
    file(name, fo = {}) {
      return {
        name,
        /**
         * Ranged media read of one exact generation, capped at the range.
         * @param {{start: number, end: number}} d
         * @return {Promise<Buffer[]>}
         */
        async download(d) {
          if (!fo.generation) throw new TransportError("generation", "arg");
          const want = d.end - d.start + 1;
          const r = await boundedExchange({fetchImpl, method: "GET",
            url: `${obj(name)}?alt=media&generation=` +
              encodeURIComponent(fo.generation),
            headers: await headers({Range: `bytes=${d.start}-${d.end}`}),
            deadlineMs: limits.storageRequestMs, maxBytes: want, counter});
          if (r.status !== 200 && r.status !== 206) fail(r.status, "read");
          return [r.body];
        },
        /**
         * Generation-matched delete; one request, no retry.
         * @param {{ifGenerationMatch: string}} d
         * @return {Promise<Array>}
         */
        async delete(d) {
          if (!d || !d.ifGenerationMatch) {
            throw new TransportError("precondition required", "arg");
          }
          const r = await boundedExchange({fetchImpl, method: "DELETE",
            url: `${obj(name)}?ifGenerationMatch=` +
              encodeURIComponent(d.ifGenerationMatch),
            headers: await headers(), deadlineMs: limits.storageRequestMs,
            maxBytes: limits.deleteResponseMaxBytes, counter});
          if (r.status !== 204 && r.status !== 200) fail(r.status, "delete");
          return [{}];
        },
      };
    },
    /**
     * One bounded list request (no auto-pagination, no retry).
     * @param {{prefix: string, startOffset: (string|undefined),
     *   maxResults: number}} q
     * @return {Promise<{items: object[], nextPageToken: ?string}>}
     */
    async listObjects(q) {
      const p = new URLSearchParams({prefix: q.prefix,
        maxResults: String(q.maxResults)});
      if (q.startOffset) p.set("startOffset", q.startOffset);
      const r = await boundedExchange({fetchImpl, method: "GET",
        url: `${base}/storage/v1/b/${b}/o?${p}`, headers: await headers(),
        deadlineMs: limits.storageRequestMs,
        maxBytes: limits.listResponseMaxBytes, counter});
      if (r.status !== 200) fail(r.status, "list");
      let j;
      try {
        j = JSON.parse(r.body.toString("utf8"));
      } catch (_) {
        throw new TransportError("list body", "list-malformed");
      }
      if (!j || typeof j !== "object" ||
          (j.items !== undefined && !Array.isArray(j.items))) {
        throw new TransportError("list body", "list-malformed");
      }
      return {items: j.items || [],
        nextPageToken: typeof j.nextPageToken === "string" ?
          j.nextPageToken : null};
    },
  };
  return facade;
}

/** Firestore RPCs the reconciler path issues (transactions, reads). */
const FIRESTORE_METHODS = Object.freeze(["BatchGetDocuments", "Commit",
  "BeginTransaction", "Rollback", "RunQuery"]);

/**
 * gax clientConfig: a finite per-RPC deadline and no gax retry codes for
 * every reconciler-path RPC.
 * @param {number} rpcMs
 * @return {object}
 */
function firestoreClientConfig(rpcMs) {
  return {interfaces: {"google.firestore.v1.Firestore": {
    retry_codes: {none: []},
    retry_params: {bounded: {initial_retry_delay_millis: 100,
      retry_delay_multiplier: 1, max_retry_delay_millis: 100,
      initial_rpc_timeout_millis: rpcMs, rpc_timeout_multiplier: 1,
      max_rpc_timeout_millis: rpcMs, total_timeout_millis: rpcMs}},
    methods: Object.fromEntries(FIRESTORE_METHODS.map((m) => [m,
      {timeout_millis: rpcMs, retry_codes_name: "none",
        retry_params_name: "bounded"}])),
  }}};
}

/**
 * Dedicated Firestore client for the reconciler path.
 * @param {object} o
 * @param {function} o.Firestore the pinned @google-cloud/firestore class
 * @param {string} o.projectId
 * @param {?{token: function}} [o.tokenProvider] production auth; omitted on
 *   the emulator branch (the SDK then uses its emulator credentials)
 * @param {object} [o.settings] extra settings (tests: host, sslCreds...)
 * @param {object} [o.limits]
 * @return {object} Firestore
 */
function createBoundedFirestore(o) {
  const limits = o.limits || LFS_TRANSPORT_LIMITS;
  const settings = {projectId: o.projectId, preferRest: false,
    clientConfig: firestoreClientConfig(limits.firestoreRpcMs),
    ...(o.settings || {})};
  if (o.tokenProvider) {
    const tp = o.tokenProvider;
    settings.auth = {
      getClient: async () => ({
        getRequestHeaders: async () => new Headers({
          authorization: `Bearer ${await tp.token()}`}),
      }),
      getProjectId: async () => o.projectId,
      getUniverseDomain: async () => "googleapis.com",
    };
  }
  return new o.Firestore(settings);
}

/**
 * Measured SDK retry layers of the pinned stack (firebase-admin 14.5.0,
 * @google-cloud/firestore 9.3.1, google-gax 6.12.1, retry-request 9.1.0,
 * @grpc/grpc-js 1.14.6), proven by test/lfs-gate-firestore*.test.js:
 *   - Firestore._retry: MAX_REQUEST_RETRIES = 5 attempts, ExponentialBackoff
 *     (1000 ms, x1.5, jitter up to +50%) before attempts 2..5;
 *   - server-streaming reads (BatchGetDocuments, RunQuery) additionally go
 *     through retry-request (2 retries; delays 2^n s + <1 s jitter, n = 1,2);
 *   - unary RPCs (Commit, Rollback): no gax retry (retry codes "none");
 *   - transactions: maxAttempts (set by the db facade), backoff between
 *     attempts as Firestore._retry.
 * Every attempt is cut at the configured per-RPC deadline by gRPC.
 */
const FIRESTORE_LAYERS = Object.freeze({
  retryAttempts: 5,
  retryBackoffMaxMs: 1.5 * (1000 + 1500 + 2250 + 3375),
  streamCallsPerAttempt: 3,
  streamRetryDelayMaxMs: 2999 + 4999,
  txBackoffMaxMs: (attempt) => attempt <= 1 ? 0 :
    1.5 * 1000 * Math.pow(1.5, attempt - 2),
  /** Allowance per call for connection setup and scheduling. */
  callOverheadMs: 250,
});

/**
 * Upper envelope (ms) of one logical Firestore operation of the reconciler
 * path when every attempt hangs until its deadline.
 * @param {number} rpcMs per-RPC deadline
 * @return {{streamRead: number, unary: number, txAttempt: function}}
 */
function firestoreEnvelope(rpcMs) {
  const L = FIRESTORE_LAYERS;
  const call = rpcMs + L.callOverheadMs;
  const streamRead = L.retryAttempts * (L.streamCallsPerAttempt * call +
    L.streamRetryDelayMaxMs) + L.retryBackoffMaxMs;
  const unary = L.retryAttempts * call + L.retryBackoffMaxMs;
  return {streamRead, unary,
    /**
     * One transaction attempt: its reads, then its commit.
     * @param {number} reads number of transactional reads
     * @return {number}
     */
    txAttempt: (reads) => reads * streamRead + unary};
}

module.exports = {FIRESTORE_LAYERS, firestoreEnvelope, LFS_TRANSPORT_LIMITS,
  TransportError, boundedExchange,
  createTokenProvider, createBoundedStorage, createBoundedFirestore,
  firestoreClientConfig, FIRESTORE_METHODS, PROD_STORAGE_ENDPOINT,
  METADATA_TOKEN_URL};

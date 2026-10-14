"use strict";
/**
 * Coach Core AI gateway — request handling, independent of Firebase wiring.
 *
 * Every call goes through, in order:
 *   1. kill switch
 *   2. identity: signed in, not anonymous, verified email, LIVE beta claim,
 *      account enabled, session not revoked
 *   3. contract validation (envelope + task input)
 *   4. team ownership (owner-only tenancy, same as Firestore rules)
 *   5. quota reservation (per-user burst/daily, global daily)
 *   6. privacy redaction of free text
 *   7. provider call with server-owned instructions, output-token cap and
 *      timeout
 *   8. output validation (schema + server-side bounds)
 *
 * Clients only ever see HttpsError codes with a short reason and requestId.
 * Provider messages, prompts, and keys are never returned or logged.
 */
const crypto = require("node:crypto");
const {HttpsError} = require("firebase-functions/v2/https");
const {
  CONTRACT_VERSION, INPUT_SCHEMAS, OUTPUT_SCHEMAS, OUTPUT_LIMITS,
  MAX_OUTPUT_TOKENS, requestEnvelope,
} = require("./schemas");
const {instructionsFor} = require("./prompts");
const {redactDeep} = require("./privacy");
const {ProviderError} = require("./providers/provider");
const {QuotaError} = require("./quota");

const PROVIDER_TIMEOUT_MS = 45_000;

/**
 * @param {string} code HttpsError code
 * @param {string} reason stable machine-readable reason
 * @param {string} requestId
 * @param {object} [extra] client-safe extra details
 * @return {HttpsError}
 */
function fail(code, reason, requestId, extra = {}) {
  return new HttpsError(code, reason, {reason, requestId, ...extra});
}

/**
 * @param {string} uid
 * @return {string} stable non-reversible id for provider abuse tracking
 */
function safetyIdFor(uid) {
  return crypto.createHash("sha256").update(`coach-core:${uid}`)
      .digest("hex").slice(0, 32);
}

/**
 * Sum the scheduled minutes of a practice plan.
 * @param {object} plan
 * @return {number}
 */
function scheduledMinutes(plan) {
  const periods = plan.periods.reduce((s, p) => s + p.durationMinutes, 0);
  return plan.warmup.durationMinutes + periods + plan.cooldown.durationMinutes;
}

/**
 * Validate the caller's identity using the token AND the live user record,
 * so beta removal, disabling, or token revocation take effect immediately.
 * @param {object} auth CallableRequest.auth
 * @param {object} deps
 * @param {string} requestId
 */
async function assertBetaIdentity(auth, deps, requestId) {
  if (!auth || !auth.uid || !auth.token) {
    throw fail("unauthenticated", "sign-in-required", requestId);
  }
  const token = auth.token;
  const provider = token.firebase && token.firebase.sign_in_provider;
  if (!provider || provider === "anonymous") {
    throw fail("permission-denied", "anonymous-not-allowed", requestId);
  }
  if (token.email_verified !== true) {
    throw fail("permission-denied", "email-not-verified", requestId);
  }
  let user;
  try {
    user = await deps.getUser(auth.uid);
  } catch (_) {
    throw fail("unauthenticated", "account-not-found", requestId);
  }
  if (!user || user.disabled) {
    throw fail("unauthenticated", "account-disabled", requestId);
  }
  const validAfter = user.tokensValidAfterTime ?
    Date.parse(user.tokensValidAfterTime) : 0;
  const authTimeMs = Number(token.auth_time || 0) * 1000;
  if (validAfter && authTimeMs < validAfter) {
    throw fail("unauthenticated", "session-revoked", requestId);
  }
  if (!user.customClaims || user.customClaims.beta !== true) {
    throw fail("permission-denied", "beta-access-required", requestId);
  }
}

/**
 * Build the handler. `deps` makes every external effect injectable for tests.
 * @param {object} deps
 * @param {function(): boolean} deps.isEnabled kill switch
 * @param {function(string): Promise<object>} deps.getUser auth user record
 * @param {function(string): Promise<object|null>} deps.getTeam team doc data
 * @param {function(string): Promise<object>} deps.reserveQuota
 * @param {function(string, object): Promise<void>} deps.recordUsage
 * @param {function(): object} deps.getProvider active AI provider
 * @param {object} deps.logger structured logger (info/warn/error)
 * @param {function(): Date} [deps.now]
 * @param {function(): string} [deps.newRequestId]
 * @return {function(object): Promise<object>}
 */
function createCoachAIHandler(deps) {
  const now = deps.now || (() => new Date());
  const newRequestId = deps.newRequestId || (() => crypto.randomUUID());

  return async function coachAIHandler(request) {
    const requestId = newRequestId();
    const started = Date.now();
    const auth = request && request.auth;
    const logBase = {requestId, uid: auth && auth.uid};

    if (!deps.isEnabled()) {
      throw fail("unavailable", "ai-disabled", requestId);
    }

    await assertBetaIdentity(auth, deps, requestId);

    const envelope = requestEnvelope.safeParse(request.data);
    if (!envelope.success) {
      throw fail("invalid-argument", "invalid-request", requestId, {
        issues: envelope.error.issues.map((i) => i.path.join(".") || "(root)"),
      });
    }
    const {task, teamId} = envelope.data;
    const parsedInput = INPUT_SCHEMAS[task].safeParse(envelope.data.input);
    if (!parsedInput.success) {
      throw fail("invalid-argument", "invalid-input", requestId, {
        issues: parsedInput.error.issues.map((i) =>
          ["input", ...i.path].join(".")),
      });
    }

    const team = await deps.getTeam(teamId);
    if (!team || team.ownerId !== auth.uid) {
      // Same answer for "missing" and "not yours" to avoid team enumeration.
      throw fail("permission-denied", "team-access-denied", requestId);
    }

    let quota;
    try {
      quota = await deps.reserveQuota(auth.uid);
    } catch (err) {
      if (err instanceof QuotaError) {
        throw fail("resource-exhausted", `quota-${err.scope}`, requestId);
      }
      deps.logger.error("ai.quota_error", {...logBase, error: String(err)});
      throw fail("unavailable", "quota-unavailable", requestId);
    }

    const provider = deps.getProvider();
    let result;
    try {
      result = await provider.generate({
        task,
        instructions: instructionsFor(task),
        input: redactDeep(parsedInput.data),
        outputSchema: OUTPUT_SCHEMAS[task],
        maxOutputTokens: MAX_OUTPUT_TOKENS[task],
        timeoutMs: PROVIDER_TIMEOUT_MS,
        safetyId: safetyIdFor(auth.uid),
      });
    } catch (err) {
      const category = err instanceof ProviderError ?
        err.category : "unavailable";
      deps.logger.warn("ai.provider_error", {
        ...logBase, task, provider: provider.name, category,
        latencyMs: Date.now() - started,
      });
      const map = {
        timeout: ["deadline-exceeded", "ai-timeout"],
        rate_limited: ["resource-exhausted", "ai-busy"],
        refused: ["failed-precondition", "ai-declined"],
        incomplete: ["internal", "ai-invalid-output"],
        invalid_output: ["internal", "ai-invalid-output"],
        auth: ["internal", "ai-misconfigured"],
        unavailable: ["unavailable", "ai-unavailable"],
      };
      const [code, reason] = map[category] || map.unavailable;
      throw fail(code, reason, requestId);
    }

    await deps.recordUsage(auth.uid, result.usage);

    const shaped = OUTPUT_SCHEMAS[task].safeParse(result.data);
    const bounded = shaped.success &&
      OUTPUT_LIMITS[task].safeParse(shaped.data);
    if (!shaped.success || !bounded.success) {
      deps.logger.warn("ai.output_rejected", {...logBase, task});
      throw fail("internal", "ai-invalid-output", requestId);
    }

    const warnings = [];
    if (task === "practice_plan") {
      const requested = parsedInput.data.durationMinutes;
      const scheduled = scheduledMinutes(shaped.data);
      if (Math.abs(scheduled - requested) > Math.max(5, requested * 0.1)) {
        warnings.push(
            `schedule-mismatch: ${scheduled} of ${requested} minutes`);
      }
    }

    deps.logger.info("ai.success", {
      ...logBase, task, provider: provider.name, model: provider.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      latencyMs: Date.now() - started,
    });

    return {
      schemaVersion: CONTRACT_VERSION,
      task,
      requestId,
      result: shaped.data,
      meta: {
        aiGenerated: true,
        provider: provider.name,
        model: provider.model,
        generatedAt: now().toISOString(),
        quota,
        warnings,
      },
    };
  };
}

module.exports = {createCoachAIHandler, safetyIdFor, PROVIDER_TIMEOUT_MS};

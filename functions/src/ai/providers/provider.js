"use strict";
/**
 * Provider-neutral contract for AI backends.
 *
 * A provider is an object:
 *   {
 *     name: string,                       // e.g. "openai"
 *     model: string,                      // configured model id
 *     generate(req: GenerateRequest): Promise<GenerateResult>
 *   }
 *
 * GenerateRequest:
 *   task:            one of schemas.TASKS
 *   instructions:    server-owned system instructions
 *   input:           validated + redacted task input (plain JSON)
 *   outputSchema:    zod schema the result must match
 *   maxOutputTokens: hard cap for this call
 *   timeoutMs:       hard timeout for this call
 *   safetyId:        stable, non-reversible per-user id for abuse tracking
 *
 * GenerateResult:
 *   data:  object matching outputSchema
 *   usage: { inputTokens: number, outputTokens: number }
 *
 * Providers throw ProviderError with a category; the gateway maps categories
 * to client-safe errors. Provider messages are never returned to clients.
 *
 * Only OpenAI is implemented for the MVP. Adding a provider later means
 * adding one file here and registering it; the web app does not change.
 */

const CATEGORIES = [
  "timeout", // provider did not answer in time
  "rate_limited", // provider rate limit / quota
  "refused", // model refused or produced no usable output
  "incomplete", // truncated (e.g. max output tokens)
  "invalid_output", // output did not match the schema
  "auth", // provider credential rejected (server misconfiguration)
  "unavailable", // network / 5xx / anything else
];

/** Error raised by provider adapters. */
class ProviderError extends Error {
  /**
   * @param {string} category one of CATEGORIES
   * @param {string} message internal message (server logs only)
   */
  constructor(category, message) {
    super(message);
    this.name = "ProviderError";
    this.category = CATEGORIES.includes(category) ? category : "unavailable";
  }
}

module.exports = {ProviderError, CATEGORIES};

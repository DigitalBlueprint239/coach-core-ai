"use strict";
/**
 * OpenAI adapter (Responses API, structured outputs).
 *
 * The API key is injected by the caller from Secret Manager
 * (COACH_CORE_OPENAI_API_KEY). It is never logged, returned, or stored.
 */
const {zodTextFormat} = require("openai/helpers/zod");
const {ProviderError} = require("./provider");

/**
 * Map an SDK/HTTP error to a provider-neutral category.
 * Uses status/name rather than instanceof so mocks and SDK upgrades behave.
 * @param {*} err
 * @return {ProviderError}
 */
function classify(err) {
  const status = err && err.status;
  const name = (err && err.name) || "";
  if (name === "APIConnectionTimeoutError" || name === "TimeoutError" ||
      name === "AbortError" || name === "APIUserAbortError") {
    return new ProviderError("timeout", `openai timeout: ${name}`);
  }
  if (status === 429) return new ProviderError("rate_limited", "openai 429");
  if (status === 401 || status === 403) {
    return new ProviderError("auth", `openai auth ${status}`);
  }
  if (status === 400 || status === 422) {
    return new ProviderError("invalid_output", `openai ${status}`);
  }
  if (name === "ZodError" || name === "SyntaxError") {
    return new ProviderError("invalid_output", `openai parse: ${name}`);
  }
  return new ProviderError("unavailable", `openai error: ${status || name}`);
}

/**
 * Build the OpenAI provider. `client`/`createClient` are test seams;
 * production builds the SDK client lazily from the secret.
 * @param {object} opts {apiKey, model, client, createClient}
 * @return {{name: string, model: string, generate: function}}
 */
function createOpenAIProvider({apiKey, model, client, createClient}) {
  if (!model) throw new Error("OpenAI model is not configured");
  let sdk = client || null;
  const getClient = () => {
    if (sdk) return sdk;
    if (!apiKey) throw new ProviderError("auth", "OpenAI key not configured");
    const factory = createClient || ((key) => {
      const OpenAI = require("openai");
      // One retry at most; the gateway enforces its own overall deadline.
      return new OpenAI({apiKey: key, maxRetries: 1});
    });
    sdk = factory(apiKey);
    return sdk;
  };

  return {
    name: "openai",
    model,
    async generate({task, instructions, input, outputSchema, maxOutputTokens,
      timeoutMs, safetyId}) {
      let response;
      try {
        response = await getClient().responses.parse({
          model,
          instructions,
          input: JSON.stringify({task, input}),
          text: {format: zodTextFormat(outputSchema, `coach_core_${task}`)},
          max_output_tokens: maxOutputTokens,
          store: false,
          safety_identifier: safetyId,
        }, {timeout: timeoutMs});
      } catch (err) {
        if (err instanceof ProviderError) throw err;
        throw classify(err);
      }

      if (response.status === "incomplete") {
        const reason = response.incomplete_details &&
          response.incomplete_details.reason;
        throw new ProviderError("incomplete", `openai incomplete: ${reason}`);
      }
      const refused = (response.output || []).some((item) =>
        (item.content || []).some((c) => c.type === "refusal"));
      if (refused) throw new ProviderError("refused", "openai refusal");
      if (response.output_parsed == null) {
        throw new ProviderError("refused", "openai returned no parsed output");
      }

      const usage = response.usage || {};
      return {
        data: response.output_parsed,
        usage: {
          inputTokens: Number(usage.input_tokens) || 0,
          outputTokens: Number(usage.output_tokens) || 0,
        },
      };
    },
  };
}

module.exports = {createOpenAIProvider, classify};

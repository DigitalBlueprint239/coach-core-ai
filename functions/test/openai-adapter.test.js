"use strict";
// OpenAI adapter tests.
//  * Unit: fake client, checks request shape and error classification.
//  * Integration: the REAL openai SDK talking to a local mock of the
//    Responses API over HTTP (no internet, canary key). Verifies the wire
//    request (model, store=false, max_output_tokens, strict json_schema,
//    safety_identifier, auth header) and structured-output parsing.
const {describe, it, before, after} = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const OpenAI = require("openai");
const {createOpenAIProvider, classify} = require("../src/ai/providers/openai");
const {ProviderError} = require("../src/ai/providers/provider");
const {OUTPUT_SCHEMAS, MAX_OUTPUT_TOKENS} = require("../src/ai/schemas");
const {instructionsFor} = require("../src/ai/prompts");
const {CANARY_KEY, SAMPLE_OUTPUTS, VALID_INPUTS} = require("./fakes");

const baseReq = (task) => ({
  task,
  instructions: instructionsFor(task),
  input: VALID_INPUTS[task],
  outputSchema: OUTPUT_SCHEMAS[task],
  maxOutputTokens: MAX_OUTPUT_TOKENS[task],
  timeoutMs: 1000,
  safetyId: "a".repeat(32),
});

function fakeClient(respond) {
  const calls = [];
  return {
    calls,
    responses: {
      parse: async (body, opts) => {
        calls.push({body, opts});
        return respond(body);
      },
    },
  };
}

describe("OpenAI adapter (unit)", () => {
  it("sends a strict structured-output request with server-side limits", async () => {
    const client = fakeClient(() => ({
      status: "completed", output: [], output_parsed: SAMPLE_OUTPUTS.coach_assistant(),
      usage: {input_tokens: 10, output_tokens: 20},
    }));
    const p = createOpenAIProvider({apiKey: CANARY_KEY, model: "m-1", client});
    const res = await p.generate(baseReq("coach_assistant"));
    const {body, opts} = client.calls[0];
    assert.equal(body.model, "m-1");
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, MAX_OUTPUT_TOKENS.coach_assistant);
    assert.equal(body.safety_identifier, "a".repeat(32));
    assert.equal(body.text.format.type, "json_schema");
    assert.equal(body.text.format.strict, true);
    assert.equal(opts.timeout, 1000);
    assert.equal(JSON.parse(body.input).task, "coach_assistant");
    assert.deepEqual(res.usage, {inputTokens: 10, outputTokens: 20});
  });

  it("treats truncated output as incomplete", async () => {
    const client = fakeClient(() => ({status: "incomplete",
      incomplete_details: {reason: "max_output_tokens"}, output: [], output_parsed: null}));
    const p = createOpenAIProvider({apiKey: CANARY_KEY, model: "m", client});
    await assert.rejects(p.generate(baseReq("practice_plan")),
        (e) => e instanceof ProviderError && e.category === "incomplete");
  });

  it("treats a refusal as refused", async () => {
    const client = fakeClient(() => ({status: "completed", output_parsed: null,
      output: [{type: "message", content: [{type: "refusal", refusal: "no"}]}]}));
    const p = createOpenAIProvider({apiKey: CANARY_KEY, model: "m", client});
    await assert.rejects(p.generate(baseReq("coach_assistant")),
        (e) => e.category === "refused");
  });

  it("classifies SDK errors without exposing their messages", () => {
    const mk = (props) => Object.assign(new Error(`secret ${CANARY_KEY}`), props);
    assert.equal(classify(mk({status: 429})).category, "rate_limited");
    assert.equal(classify(mk({status: 401})).category, "auth");
    assert.equal(classify(mk({status: 403})).category, "auth");
    assert.equal(classify(mk({status: 400})).category, "invalid_output");
    assert.equal(classify(mk({status: 500})).category, "unavailable");
    assert.equal(classify(mk({name: "APIConnectionTimeoutError"})).category, "timeout");
    for (const s of [429, 401, 500]) {
      assert.ok(!classify(mk({status: s})).message.includes(CANARY_KEY));
    }
  });

  it("fails closed when no key is configured", async () => {
    const p = createOpenAIProvider({apiKey: "", model: "m"});
    await assert.rejects(p.generate(baseReq("coach_assistant")),
        (e) => e.category === "auth");
  });

  it("requires a configured model", () => {
    assert.throws(() => createOpenAIProvider({apiKey: CANARY_KEY, model: ""}));
  });
});

describe("OpenAI adapter (integration: real SDK, local mock server)", () => {
  let server;
  let baseURL;
  const seen = [];
  let reply = () => ({status: 500, body: {error: {message: "unset"}}});

  before(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => raw += c);
      req.on("end", () => {
        seen.push({method: req.method, url: req.url, headers: req.headers,
          body: raw ? JSON.parse(raw) : null});
        const {status, body} = reply(seen[seen.length - 1]);
        res.writeHead(status, {"content-type": "application/json"});
        res.end(JSON.stringify(body));
      });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    baseURL = `http://127.0.0.1:${server.address().port}/v1`;
  });
  after(() => new Promise((r) => server.close(r)));

  const provider = () => createOpenAIProvider({
    apiKey: CANARY_KEY, model: "test-model",
    createClient: (key) => new OpenAI({apiKey: key, baseURL, maxRetries: 0}),
  });

  const completed = (data) => ({status: 200, body: {
    id: "resp_1", object: "response", created_at: 1, status: "completed",
    model: "test-model", output: [{type: "message", id: "msg_1", role: "assistant",
      status: "completed", content: [{type: "output_text", text: JSON.stringify(data),
        annotations: []}]}],
    usage: {input_tokens: 111, output_tokens: 222, total_tokens: 333},
  }});

  for (const task of ["practice_plan", "drill_recommendations", "coach_assistant"]) {
    it(`round-trips ${task} through /v1/responses`, async () => {
      reply = () => completed(SAMPLE_OUTPUTS[task]());
      const res = await provider().generate(baseReq(task));
      assert.deepEqual(res.data, SAMPLE_OUTPUTS[task]());
      assert.deepEqual(res.usage, {inputTokens: 111, outputTokens: 222});
      const last = seen[seen.length - 1];
      assert.equal(last.method, "POST");
      assert.equal(last.url, "/v1/responses");
      assert.equal(last.headers.authorization, `Bearer ${CANARY_KEY}`);
      assert.equal(last.body.model, "test-model");
      assert.equal(last.body.store, false);
      assert.equal(last.body.max_output_tokens, MAX_OUTPUT_TOKENS[task]);
      assert.equal(last.body.text.format.type, "json_schema");
      assert.equal(last.body.text.format.strict, true);
      assert.equal(last.body.text.format.schema.additionalProperties, false);
      assert.equal(last.body.safety_identifier, "a".repeat(32));
    });
  }

  it("maps HTTP 429 to rate_limited", async () => {
    reply = () => ({status: 429, body: {error: {message: "slow down", type: "rate_limit"}}});
    await assert.rejects(provider().generate(baseReq("coach_assistant")),
        (e) => e.category === "rate_limited" && !e.message.includes(CANARY_KEY));
  });

  it("maps HTTP 401 to auth", async () => {
    reply = () => ({status: 401, body: {error: {message: "bad key"}}});
    await assert.rejects(provider().generate(baseReq("coach_assistant")),
        (e) => e.category === "auth");
  });

  it("rejects output that does not match the schema", async () => {
    reply = () => completed({unexpected: true});
    await assert.rejects(provider().generate(baseReq("coach_assistant")),
        (e) => e instanceof ProviderError);
  });
});

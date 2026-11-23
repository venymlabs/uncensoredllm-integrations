// Provider logic without the editor: request building, streaming, tool calls and errors, against a local fake server.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../../src/core");
const fake = require("../fake-server");

// Stand-ins shaped like VS Code's part classes.
class Text { constructor(value) { this.value = value; } }
class ToolCall { constructor(callId, name, input) { this.callId = callId; this.name = name; this.input = input; } }
class ToolResult { constructor(callId, content) { this.callId = callId; this.content = content; } }
class Data { constructor(data, mimeType) { this.data = data; this.mimeType = mimeType; } }
const deps = { makeText: (v) => new Text(v), makeToolCall: (i, n, a) => new ToolCall(i, n, a) };
const user = (...content) => ({ role: 1, content, name: undefined });
const assistant = (...content) => ({ role: 2, content, name: undefined });

let srv;
test.before(async () => { srv = await fake.start(); });
test.after(async () => { await srv.close(); });

async function run(messages, options = {}, extra = {}) {
  const parts = [];
  const body = core.buildRequest({ model: core.MODEL, messages, options, reasoningMode: extra.reasoningMode });
  const r = await core.streamChat({ baseUrl: srv.baseUrl, apiKey: extra.key || srv.key, body, signal: extra.signal, report: (p) => parts.push(p), deps });
  return { r, parts, body };
}

test("model information matches the product", () => {
  assert.equal(core.MODEL.id, "uncensoredllm-1");
  assert.equal(core.MODEL.name, "UncensoredLLM 1");
  assert.equal(core.MODEL.maxInputTokens + core.MODEL.maxOutputTokens, 262144);
  assert.equal(core.MODEL.capabilities.toolCalling, true);
});

test("message conversion: system, text, tool calls, tool results, data parts", () => {
  const msgs = core.toOpenAIMessages([
    { role: 3, content: [new Text("Be brief.")] },
    user(new Text("What time is it?")),
    assistant(new Text("Checking."), new ToolCall("c1", "get_time", { zone: "UTC" })),
    user(new ToolResult("c1", [new Text("12:00")]), new Text("thanks"), new Data(new Uint8Array([1, 2]), "image/png"), new Data(Buffer.from('{"a":1}'), "application/json")),
    assistant(new ToolCall("c2", "noop", {})),
  ]);
  assert.deepEqual(msgs, [
    { role: "system", content: "Be brief." },
    { role: "user", content: "What time is it?" },
    { role: "assistant", content: "Checking.", tool_calls: [{ id: "c1", type: "function", function: { name: "get_time", arguments: '{"zone":"UTC"}' } }] },
    { role: "tool", tool_call_id: "c1", content: "12:00" },
    { role: "user", content: 'thanks{"a":1}' },
    { role: "assistant", content: null, tool_calls: [{ id: "c2", type: "function", function: { name: "noop", arguments: "{}" } }] },
  ]);
});

test("request body: tools, tool mode, model options, reasoning mode, max_tokens floor", () => {
  const b = core.buildRequest({
    model: core.MODEL,
    messages: [user(new Text("hi"))],
    options: { tools: [{ name: "t", description: "d", inputSchema: { type: "object", properties: { x: { type: "string" } } } }, { name: "u" }], toolMode: 2, modelOptions: { temperature: 0.2, max_tokens: 100, junk: 1 } },
    reasoningMode: "fast",
  });
  assert.equal(b.model, "uncensoredllm-1");
  assert.equal(b.stream, true);
  assert.equal(b.tool_choice, "required");
  assert.equal(b.tools.length, 2);
  assert.deepEqual(b.tools[1].function.parameters, { type: "object", properties: {} });
  assert.equal(b.temperature, 0.2);
  assert.equal(b.max_tokens, 512);
  assert.equal(b.junk, undefined);
  assert.equal(b.reasoning_mode, "fast");
  const plain = core.buildRequest({ model: core.MODEL, messages: [user(new Text("hi"))] });
  assert.equal(plain.tools, undefined);
  assert.equal(plain.reasoning_mode, undefined);
  assert.equal(plain.max_tokens, undefined);
});

test("streams text in order, skips comments and reasoning, sends the key as a bearer token", async () => {
  const { r, parts } = await run([user(new Text("hello"))]);
  assert.deepEqual(parts.map((p) => p.value), ["Hello ", "from ", "fake"]);
  assert.equal(r.text, "Hello from fake");
  assert.equal(r.finishReason, "stop");
  assert.deepEqual(r.usage, { prompt_tokens: 5, completion_tokens: 3 });
  assert.equal(srv.requests.at(-1).auth, "ok");
});

test("tool call split across chunks becomes one ToolCallPart; the result round-trips", async () => {
  const tools = [{ name: "get_time", description: "time", inputSchema: { type: "object", properties: { zone: { type: "string" } } } }];
  const first = await run([user(new Text("use the tool"))], { tools, toolMode: 1 });
  assert.equal(first.parts.length, 1);
  assert.ok(first.parts[0] instanceof ToolCall);
  assert.deepEqual({ ...first.parts[0] }, { callId: "call_abc", name: "get_time", input: { zone: "UTC" } });
  assert.equal(first.r.finishReason, "tool_calls");
  const second = await run([user(new Text("use the tool")), assistant(first.parts[0]), user(new ToolResult("call_abc", [new Text("12:00 UTC")]))], { tools });
  assert.equal(second.r.text, "The tool said: 12:00 UTC");
});

test("errors: bad key, rate limit, mid-stream error, empty answer, unreachable host", async () => {
  await assert.rejects(run([user(new Text("hi"))], {}, { key: "vk-wrong-key-000000" }), (e) => e.status === 401 && /rejected the API key/.test(e.message) && !e.message.includes("vk-"));
  await assert.rejects(run([user(new Text("fail429"))]), (e) => e.status === 429 && /try again in 7 s/.test(e.message));
  await assert.rejects(run([user(new Text("midfail"))]), (e) => /upstream cut/.test(e.message));
  await assert.rejects(run([user(new Text("empty"))]), (e) => e.code === "empty_completion");
  const body = core.buildRequest({ model: core.MODEL, messages: [user(new Text("hi"))] });
  await assert.rejects(core.streamChat({ baseUrl: "http://127.0.0.1:1/v1", apiKey: srv.key, body, report: () => {}, deps }), (e) => /could not reach/.test(e.message) && !e.message.includes(srv.key));
});

test("502 empty_completion gets the max-tokens advice", () => {
  const e = core.describeHttpError(502, { error: { code: "empty_completion", message: "x" } });
  assert.match(e.message, /512 or more/);
});

test("cancellation stops the stream without an error", async () => {
  const ac = new AbortController();
  const parts = [];
  const body = core.buildRequest({ model: core.MODEL, messages: [user(new Text("slow"))] });
  const p = core.streamChat({ baseUrl: srv.baseUrl, apiKey: srv.key, body, signal: ac.signal, report: (x) => { parts.push(x); if (parts.length === 2) ac.abort(); }, deps });
  const r = await p;
  assert.equal(r.cancelled, true);
  assert.ok(parts.length >= 2 && parts.length < 50);
});

test("check connection reads models and balance; a bad key fails", async () => {
  const r = await core.checkConnection({ baseUrl: srv.baseUrl, apiKey: srv.key });
  assert.deepEqual(r.models, ["uncensoredllm-1"]);
  assert.equal(r.balance.balance_usd, 0.25);
  await assert.rejects(core.checkConnection({ baseUrl: srv.baseUrl, apiKey: "vk-wrong-key-000000" }), (e) => e.status === 401);
});

test("base URL and key validation", () => {
  assert.equal(core.normalizeBaseUrl("https://uncensoredllm.xyz/v1/"), "https://uncensoredllm.xyz/v1");
  assert.equal(core.normalizeBaseUrl("http://localhost:9/v1"), "http://localhost:9/v1");
  assert.equal(core.normalizeBaseUrl("http://evil.example/v1"), null);
  assert.equal(core.normalizeBaseUrl("not a url"), null);
  assert.equal(core.looksLikeKey("vk-abcdefgh12"), true);
  assert.equal(core.looksLikeKey("sk-abcdefgh12"), false);
});

test("token estimate", () => {
  assert.equal(core.estimateTokens("abcdefgh"), 2);
  assert.ok(core.estimateTokens(user(new Text("a".repeat(40)))) >= 10);
});

test("SSE parser handles CRLF and events split across chunks", async () => {
  async function* body() { yield Buffer.from("data: {\"a\""); yield Buffer.from(":1}\r\n\r\n: c\r\ndata: [DONE]\r\n\r\n"); }
  const got = [];
  for await (const e of core.sseEvents(body())) got.push(e);
  assert.deepEqual(got, ['{"a":1}', "[DONE]"]);
});
